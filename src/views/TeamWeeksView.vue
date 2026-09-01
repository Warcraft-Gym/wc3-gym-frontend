<template>
  <v-overlay v-model="isLoading" contained class="align-center justify-center">
    <v-progress-circular color="primary" indeterminate size="64"></v-progress-circular>
  </v-overlay>

  <v-container fluid class="pa-4">
    <v-row class="mb-4">
      <v-col>
        <h1>
          <v-icon class="mr-2">mdi-calendar-account</v-icon>
          Team Weeks
        </h1>
      </v-col>
    </v-row>

    <StatusAlert v-model="errorMessage" />

    <v-card elevation="2">
      <v-card-title class="bg-primary d-flex align-center">
        <v-icon class="mr-2">mdi-shield-account</v-icon>
        <span>{{ team?.name }}</span>
      </v-card-title>

      <v-table density="compact">
        <thead>
          <tr>
            <th>Player</th>
            <th v-for="week in weeks" :key="week" class="text-center">Week {{ week }}</th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="player in players" :key="player.id">
            <td><PlayerName :player="player" :race="player.signup_race" /></td>
            <td v-for="week in weeks" :key="week" class="text-center">
              <div class="d-flex ga-1 justify-center">
                <v-btn
                  icon="mdi-check"
                  size="x-small"
                  color="success"
                  :variant="answerFor(player.id, week) === true ? 'flat' : 'outlined'"
                  :loading="saving === `${player.id}|${week}`"
                  :disabled="!!saving"
                  @click="setWeek(player.id, week, true)"
                ></v-btn>
                <v-btn
                  icon="mdi-close"
                  size="x-small"
                  color="error"
                  :variant="answerFor(player.id, week) === false ? 'flat' : 'outlined'"
                  :loading="saving === `${player.id}|${week}`"
                  :disabled="!!saving"
                  @click="setWeek(player.id, week, false)"
                ></v-btn>
              </div>
              <div class="text-caption text-medium-emphasis">{{ setByLine(player.id, week) }}</div>
            </td>
            <td>
              <v-btn
                size="small"
                variant="outlined"
                :disabled="!!saving || !weeks.length"
                @click="outToLastWeek(player.id)"
              >
                Out to week {{ weeks.length }}
              </v-btn>
            </td>
          </tr>
        </tbody>
      </v-table>

      <v-card-text v-if="!players.length && !isLoading" class="text-center pa-8">
        <v-icon size="64" color="grey-lighten-1">mdi-account-off</v-icon>
        <div class="text-h6 text-grey mt-4">No players on this team this season</div>
      </v-card-text>
    </v-card>
  </v-container>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import { storeToRefs } from 'pinia';

import { useAuthStore, useAvailabilityStore, useSeasonStore, useTeamStore } from '@/stores';
import StatusAlert from '@/components/StatusAlert.vue';

const router = useRouter();
const auth = useAuthStore();
const teamStore = useTeamStore();
const seasonStore = useSeasonStore();
const availabilityStore = useAvailabilityStore();

const { team } = storeToRefs(teamStore);
const { current_season: season } = storeToRefs(seasonStore);

const teamId = computed(() => Number(router.currentRoute.value.params.id));
const seasonId = computed(() => Number(router.currentRoute.value.params.season_id));

const isLoading = ref(false);
const errorMessage = ref(null);
const rows = ref([]);
const saving = ref(null);

const players = computed(() => team.value?.player_by_season?.[seasonId.value] || []);
const weeks = computed(() => Array.from({ length: season.value?.number_weeks || 0 }, (_, i) => i + 1));

const rowFor = (userId, week) => rows.value.find(row => row.user_id === userId && row.playday === week);
const answerFor = (userId, week) => rowFor(userId, week)?.available ?? null;

const setByLine = (userId, week) => {
  const row = rowFor(userId, week);
  if (!row) return 'No answer';
  if (row.set_by_user_id === userId) return 'Player';
  return row.set_by_user_id === auth.me?.user?.id ? 'You' : row.set_by_name;
};

// the route answers every row of the player it wrote, so their old rows go
const applyRows = (userId, answered) => {
  rows.value = [...rows.value.filter(row => row.user_id !== userId), ...answered];
};

const write = async (userId, week, available) => {
  const answered = await availabilityStore.setTeamAvailability(teamId.value, seasonId.value, {
    user_id: userId,
    playday: week,
    available,
  });
  applyRows(userId, answered);
};

// a second click on the state already set clears the week back to no answer
const setWeek = async (userId, week, want) => {
  saving.value = `${userId}|${week}`;
  errorMessage.value = null;
  try {
    await write(userId, week, answerFor(userId, week) === want ? null : want);
  } catch (error) {
    console.error('Error saving availability:', error);
    errorMessage.value = error.message || 'Error saving availability.';
  } finally {
    saving.value = null;
  }
};

const outToLastWeek = async (userId) => {
  saving.value = `${userId}|all`;
  errorMessage.value = null;
  try {
    for (const week of weeks.value) {
      if (answerFor(userId, week) !== false) await write(userId, week, false);
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
  if (!auth.isAdmin && auth.me?.team?.id !== teamId.value) {
    router.replace('/profile');
    return;
  }
  isLoading.value = true;
  try {
    const [answered] = await Promise.all([
      availabilityStore.fetchTeamAvailability(teamId.value, seasonId.value),
      teamStore.fetchTeamBySeason(teamId.value, seasonId.value),
      seasonStore.fetchSeason(seasonId.value),
    ]);
    rows.value = answered;
  } catch (error) {
    console.error(error);
    errorMessage.value = error.message || 'Failed to load the team weeks.';
  } finally {
    isLoading.value = false;
  }
});
</script>
