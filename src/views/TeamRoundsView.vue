<template>
  <v-overlay v-model="isLoading" contained class="align-center justify-center">
    <v-progress-circular color="primary" indeterminate size="64"></v-progress-circular>
  </v-overlay>

  <v-container fluid class="pa-4">
    <v-row class="mb-4">
      <v-col>
        <h1>
          <v-icon class="mr-2">mdi-calendar-account</v-icon>
          Team Rounds
        </h1>
      </v-col>
    </v-row>

    <StatusAlert v-model="errorMessage" />

    <v-card elevation="2">
      <v-card-title class="bg-primary d-flex align-center">
        <v-icon class="mr-2">mdi-shield-account</v-icon>
        <span>{{ team?.name }}</span>
      </v-card-title>

      <v-select v-if="smAndDown && loaded" v-model="shownRound" :items="roundItems" label="Round" density="compact" hide-details class="ma-2" />
      <v-table v-if="loaded" density="compact">
        <thead>
          <tr>
            <th>Player</th>
            <th v-for="round in shownRounds" :key="round" class="text-center">
              {{ roundLabel(roundOf(round)) }}
              <div class="text-caption text-medium-emphasis font-weight-regular">
                Round {{ round }}<template v-if="opponentOfRound(round)"> · vs {{ opponentOfRound(round).name }}</template>
              </div>
            </th>
            <th v-if="!smAndDown"></th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="player in players" :key="player.id">
            <td>
              <PlayerName :player="player" :race="player.signup_race" />
              <v-btn v-if="smAndDown" size="small" variant="outlined" class="d-block mt-1" :disabled="!!saving || !rounds.length" @click="outToLastRound(player.id)">
                Out to round {{ rounds.length }}
              </v-btn>
            </td>
            <td v-for="round in shownRounds" :key="round" class="text-center">
              <div class="d-flex ga-2 justify-center">
                <v-btn
                  icon="mdi-check"
                  :size="smAndDown ? 'default' : 'x-small'"
                  color="success"
                  :aria-label="`${player.name} can play round ${round}`"
                  :aria-pressed="answerFor(player.id, round) === true"
                  :variant="answerFor(player.id, round) === true ? 'flat' : 'outlined'"
                  :loading="saving === `${player.id}|${round}`"
                  :disabled="!!saving"
                  @click="setRound(player.id, round, true)"
                ></v-btn>
                <v-btn
                  icon="mdi-close"
                  :size="smAndDown ? 'default' : 'x-small'"
                  color="error"
                  :aria-label="`${player.name} cannot play round ${round}`"
                  :aria-pressed="answerFor(player.id, round) === false"
                  :variant="answerFor(player.id, round) === false ? 'flat' : 'outlined'"
                  :loading="saving === `${player.id}|${round}`"
                  :disabled="!!saving"
                  @click="setRound(player.id, round, false)"
                ></v-btn>
              </div>
              <div class="text-caption text-medium-emphasis">{{ setByLine(player.id, round) }}</div>
            </td>
            <td v-if="!smAndDown">
              <v-btn
                size="small"
                variant="outlined"
                :disabled="!!saving || !rounds.length"
                @click="outToLastRound(player.id)"
              >
                Out to round {{ rounds.length }}
              </v-btn>
            </td>
          </tr>
        </tbody>
      </v-table>

      <v-card-text v-if="loaded && !players.length && !isLoading" class="text-center pa-8">
        <v-icon size="64" class="text-disabled">mdi-account-off</v-icon>
        <div class="text-h6 text-medium-emphasis mt-4">No players on this team this season</div>
      </v-card-text>
    </v-card>
  </v-container>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import { storeToRefs } from 'pinia';
import { useDisplay } from 'vuetify';

import { useAuthStore, useAvailabilityStore, useMatchStore, useSeasonStore, useTeamStore } from '@/stores';
import { roundLabel } from '@/helpers/rounds.mjs';
import StatusAlert from '@/components/StatusAlert.vue';

const router = useRouter();
const auth = useAuthStore();
const teamStore = useTeamStore();
const seasonStore = useSeasonStore();
const availabilityStore = useAvailabilityStore();
const matchStore = useMatchStore();

const { team } = storeToRefs(teamStore);
const { current_season: season } = storeToRefs(seasonStore);

const teamId = computed(() => Number(router.currentRoute.value.params.id));
const seasonId = computed(() => seasonStore.seasonIdOf(router.currentRoute.value.params.season_id));

const isLoading = ref(false);
const errorMessage = ref(null);
const rows = ref([]);
// The grid speaks for the answers it read: without them every cell would read 'No answer' and stay writable
const loaded = ref(false);
// The round labels: the season's round gives the dates, the team's match names the opponent (#33)
const roundOf = (round) => season.value?.rounds?.find(r => r.playday === round) || { playday: round };
const matches = ref([]);
const matchOfRound = (round) => matches.value.find(m => m.playday === round && [m.team1_id, m.team2_id].includes(teamId.value));
const opponentOfRound = (round) => { const m = matchOfRound(round); return m && (m.team1_id === teamId.value ? m.team2 : m.team1); };
const saving = ref(null);

const players = computed(() => team.value?.player_by_season?.[seasonId.value] || []);
const rounds = computed(() => Array.from({ length: season.value?.round_count || 0 }, (_, i) => i + 1));
// A phone shows one round at a time; wider screens show them all
const { smAndDown } = useDisplay();
const shownRound = ref(1);
const shownRounds = computed(() => smAndDown.value ? rounds.value.filter(w => w === shownRound.value) : rounds.value);
// the picker names each round the way the column header does
const roundItems = computed(() => rounds.value.map(round => ({ value: round, title: `Round ${round} · ${roundLabel(roundOf(round))}` })));

const rowFor = (userId, round) => rows.value.find(row => row.user_id === userId && row.playday === round);
const answerFor = (userId, round) => rowFor(userId, round)?.available ?? null;

const setByLine = (userId, round) => {
  const row = rowFor(userId, round);
  if (!row) return 'No answer';
  if (row.set_by_user_id === userId) return 'Player';
  return row.set_by_user_id === auth.me?.user?.id ? 'You' : row.set_by_name;
};

// the route answers every row of the player it wrote, so their old rows go
const applyRows = (userId, answered) => {
  rows.value = [...rows.value.filter(row => row.user_id !== userId), ...answered];
};

const write = async (userId, round, available) => {
  const answered = await availabilityStore.setTeamAvailability(teamId.value, seasonId.value, {
    user_id: userId,
    playday: round,
    available,
  });
  applyRows(userId, answered);
};

// a second click on the state already set clears the round back to no answer
const setRound = async (userId, round, want) => {
  saving.value = `${userId}|${round}`;
  errorMessage.value = null;
  try {
    await write(userId, round, answerFor(userId, round) === want ? null : want);
  } catch (error) {
    console.error('Error saving availability:', error);
    errorMessage.value = error.message || 'Error saving availability.';
  } finally {
    saving.value = null;
  }
};

const outToLastRound = async (userId) => {
  saving.value = `${userId}|all`;
  errorMessage.value = null;
  try {
    for (const round of rounds.value) {
      if (answerFor(userId, round) !== false) await write(userId, round, false);
    }
  } catch (error) {
    console.error('Error saving availability:', error);
    errorMessage.value = error.message || 'Error saving availability.';
  } finally {
    saving.value = null;
  }
};

onMounted(async () => {
  // same gate as the link that leads here: admins, or the captain of this team
  if (!auth.isAdmin && auth.captainTeamId !== teamId.value) {
    router.replace('/profile');
    return;
  }
  isLoading.value = true;
  try {
    const [answered, seasonMatches] = await Promise.all([
      availabilityStore.fetchTeamAvailability(teamId.value, seasonId.value),
      matchStore.searchMatchesBySeason(seasonId.value).catch(() => []),
      teamStore.fetchTeamBySeason(teamId.value, seasonId.value),
      seasonStore.fetchSeason(seasonId.value),
    ]);
    rows.value = answered;
    matches.value = seasonMatches;
    loaded.value = true;
  } catch (error) {
    console.error(error);
    errorMessage.value = error.message || 'Failed to load the team rounds.';
  } finally {
    isLoading.value = false;
  }
});
</script>
