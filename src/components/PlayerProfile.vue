<!-- One player: who he is, what waits for him, every event he entered with the rounds
     of the ones running, and the lifetime head to head. The page at /player/:id and
     the panel that opens over any other page both render this; the owner reads his
     own page with the actions on it, and every visitor reads the same facts. -->
<template>
  <StatusAlert v-model="errorMessage" />
  <StatusAlert v-model="successMessage" type="success" />

  <template v-if="player">
    <v-card elevation="2" class="mb-6">
      <v-card-text class="pa-4">
        <PlayerHeader
          :player="player"
          :me="me"
          :owner="owner"
          :editable="owner || auth.isAdmin"
          :w3cSeason="currentW3CSeason"
          @edit="openEdit"
        />
      </v-card-text>
    </v-card>

    <v-card v-if="owner && waiting.length" elevation="2" class="mb-6">
      <v-card-text class="pa-4">
        <h2 class="text-h6 mb-3">Waiting for you</h2>
        <div v-for="row in waiting" :key="row.key" class="waiting d-flex flex-wrap align-center ga-3">
          <div class="flex-grow-1 min-w-0">{{ row.text }}</div>
          <div v-if="row.kind === 'series'" class="d-flex flex-wrap ga-2">
            <v-btn color="primary" variant="elevated" size="small" prepend-icon="mdi-trophy" @click="reportDialog.open(row.series)">
              Report result
            </v-btn>
            <v-btn variant="text" size="small" prepend-icon="mdi-calendar-edit" @click="scheduleDialog.open(row.series)">
              Schedule
            </v-btn>
          </div>
          <div v-else class="d-flex ga-2">
            <v-btn
              color="success"
              variant="outlined"
              size="small"
              :loading="savingWeek === weekKey(row.seasonId, row.playday)"
              :disabled="savingWeek !== null"
              @click="setWeek(row.seasonId, row.playday, true)"
            >
              Can play
            </v-btn>
            <v-btn
              color="error"
              variant="outlined"
              size="small"
              :loading="savingWeek === weekKey(row.seasonId, row.playday)"
              :disabled="savingWeek !== null"
              @click="setWeek(row.seasonId, row.playday, false)"
            >
              Can't play
            </v-btn>
          </div>
        </div>
      </v-card-text>
    </v-card>

    <v-card elevation="2">
      <v-card-title class="d-flex align-center">
        <v-icon class="mr-2">mdi-calendar-account</v-icon>
        Events
      </v-card-title>
      <!-- The event still running opens onto its rounds; the others onto their series -->
      <PlayerSeasons :player="player" :open="openSeasonId">
        <template #current="{ row }">
          <RoundCards
            :player="player"
            :season="row.season"
            :series="seriesOf(row)"
            :teamId="row.stat?.team_id"
            :answers="answersOf(row.season.id)"
          >
            <template v-if="owner" #series-actions="{ series: item }">
              <div class="d-flex flex-wrap ga-1 mt-2">
                <v-btn
                  v-if="isUnscored(item)"
                  color="primary"
                  variant="elevated"
                  size="small"
                  prepend-icon="mdi-calendar-edit"
                  @click="scheduleDialog.open(item)"
                >
                  Edit Schedule
                </v-btn>
                <v-btn color="success" variant="elevated" size="small" prepend-icon="mdi-trophy" @click="reportDialog.open(item)">
                  {{ isUnscored(item) ? 'Report Result' : 'Edit result' }}
                </v-btn>
                <v-btn
                  color="primary"
                  variant="outlined"
                  size="small"
                  prepend-icon="mdi-map-outline"
                  :to="`/player-series/${item.id}/veto`"
                >
                  Maps
                </v-btn>
              </div>
            </template>

            <template v-if="owner" #question="{ card }">
              <div class="d-flex ga-2 mt-2">
                <v-btn
                  color="success"
                  :variant="card.answer === true ? 'flat' : 'outlined'"
                  :loading="savingWeek === weekKey(row.season.id, card.playday)"
                  :disabled="savingWeek !== null"
                  @click="setWeek(row.season.id, card.playday, true)"
                >
                  Can play
                </v-btn>
                <v-btn
                  color="error"
                  :variant="card.answer === false ? 'flat' : 'outlined'"
                  :loading="savingWeek === weekKey(row.season.id, card.playday)"
                  :disabled="savingWeek !== null"
                  @click="setWeek(row.season.id, card.playday, false)"
                >
                  Cannot play
                </v-btn>
              </div>
              <div class="text-caption text-medium-emphasis mt-2">{{ setByLine(row.season.id, card.playday) }}</div>
            </template>
          </RoundCards>
        </template>
      </PlayerSeasons>
    </v-card>

    <HeadToHead :playerId="player.id" />

    <EditPlayerDialog ref="editDialog" :self="owner" :can-save="owner || auth.isAdmin" :refresh="reload" />
    <template v-if="owner">
      <ScheduleDialog ref="scheduleDialog" :playerId="player.id" @saved="afterWrite" />
      <ReportResultDialog ref="reportDialog" @saved="afterWrite" />
    </template>
  </template>
</template>

<script setup>
import { computed, inject, ref, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { storeToRefs } from 'pinia';
import { backendUrl, fetchWrapper } from '@/helpers';
import { useAuthStore, useAvailabilityStore, usePlayerStore, useSeasonStore } from '@/stores';
import { panelLinks } from '@/helpers/players';
import { resolveCurrentW3CSeason } from '@/helpers/current-season';
import { roundCards, waitingLines } from '@/helpers/rounds.mjs';
import { isUnscored } from '@/helpers/season-phase.mjs';
import EditPlayerDialog from '@/components/EditPlayerDialog.vue';
import HeadToHead from '@/components/HeadToHead.vue';
import PlayerHeader from '@/components/PlayerHeader.vue';
import PlayerSeasons from '@/components/PlayerSeasons.vue';
import ReportResultDialog from '@/components/ReportResultDialog.vue';
import RoundCards from '@/components/RoundCards.vue';
import ScheduleDialog from '@/components/ScheduleDialog.vue';
import StatusAlert from '@/components/StatusAlert.vue';

// a battle tag, or an id for a row that carries none
const props = defineProps({ playerKey: { type: String, required: true } });
const emit = defineEmits(['loaded']);

const route = useRoute();
const router = useRouter();
const auth = useAuthStore();
const availabilityStore = useAvailabilityStore();
const playerStore = usePlayerStore();
const seasonStore = useSeasonStore();
const { me } = storeToRefs(auth);

const player = ref(null);
// a stat from an older W3C season names its own season on the chip
const currentW3CSeason = ref(null);
resolveCurrentW3CSeason().then(season => { currentW3CSeason.value = season; });
const editDialog = ref(null);
const scheduleDialog = ref(null);
const reportDialog = ref(null);
const errorMessage = ref(null);
const successMessage = ref(null);

// The side panel reads a profile over another page, so it never carries the owner's
// actions: a click there would take his unsaved work with it.
const inPanel = inject(panelLinks, false);
const owner = computed(() => !inPanel && !!me.value?.user?.id && me.value.user.id === player.value?.id);

// One read for the whole profile; the ladder card reads its own record.
watch(() => props.playerKey, async (key) => {
  // the caller may rewrite the address to the tag, which lands here again
  if (player.value && [String(player.value.id), player.value.battleTag].includes(key)) return;
  player.value = null;
  errorMessage.value = null;
  try {
    player.value = await playerStore.getPlayer(key);
    emit('loaded', player.value);
  } catch (error) {
    errorMessage.value = error.message;
  }
}, { immediate: true });

// The owner's own seasons: /player-series answers the series, the rounds and his answers
const seasonData = ref({});
const openSeasons = computed(() => (me.value?.seasons ?? []).filter(season => season.signed_up));
const openSeasonId = computed(() => (owner.value ? Number(me.value?.season_id) || undefined : undefined));

const loadSeasons = async () => {
  const answers = await Promise.all(openSeasons.value.map(season =>
    fetchWrapper.get(`${backendUrl}/player-series?season_id=${season.id}`).catch(() => null)));
  seasonData.value = Object.fromEntries(
    openSeasons.value.map((season, i) => [season.id, answers[i]]).filter(([, answer]) => answer));
};
// a visitor's page must never read the last owner's series, so the cache drops first
watch(owner, (isOwner) => { seasonData.value = {}; if (isOwner) loadSeasons(); }, { immediate: true });

const seriesOf = (row) => seasonData.value[row.season.id]?.series ?? row.series;
const answersOf = (seasonId) => seasonData.value[seasonId]?.availability ?? [];

// What he still owes, over every season he is in
const waiting = computed(() => waitingLines(openSeasons.value.map((season) => {
  const answer = seasonData.value[season.id];
  if (!answer) return null;
  const full = seasonStore.seasons.find(row => row.id === season.id) ?? season;
  return {
    season,
    asks: full.scheduling_enabled !== false,
    cards: roundCards({ rounds: answer.rounds ?? [], series: answer.series ?? [], answers: answer.availability ?? [] }),
  };
}).filter(Boolean), player.value?.id));

// The availability question, from the waiting card and from the round cards alike
const savingWeek = ref(null);
const weekKey = (seasonId, week) => `${seasonId}-${week}`;
const rowOfWeek = (seasonId, week) => answersOf(seasonId).find(row => row.playday === week);

const setByLine = (seasonId, week) => {
  const row = rowOfWeek(seasonId, week);
  if (!row || row.available == null) return 'No answer';
  return `Set by ${row.set_by_user_id === player.value?.id ? 'You' : row.set_by_name} · tap again to clear`;
};

// a second click on the state already set clears the week back to no answer
const setWeek = async (seasonId, week, want) => {
  savingWeek.value = weekKey(seasonId, week);
  errorMessage.value = null;
  try {
    const available = rowOfWeek(seasonId, week)?.available ?? null;
    const rows = await availabilityStore.setPlayerAvailability({
      season_id: Number(seasonId),
      playday: week,
      available: available === want ? null : want,
    });
    seasonData.value = { ...seasonData.value, [seasonId]: { ...seasonData.value[seasonId], availability: rows } };
  } catch (error) {
    errorMessage.value = error.message || 'Error saving availability.';
  } finally {
    savingWeek.value = null;
  }
};

// after a save the battle tag may have changed, and the tag is the address
const reload = async () => {
  player.value = await playerStore.getPlayer(String(player.value.id));
  emit('loaded', player.value);
};

const afterWrite = async (message) => {
  successMessage.value = message;
  await loadSeasons();
  await reload();
};

const openEdit = () => editDialog.value.open(player.value);

// the account menu used to ask for the dialog with ?edit=1; old links still open it
watch([() => route.query.edit, player, editDialog], ([edit, row, dialog]) => {
  if (!edit || !row || !dialog || !(owner.value || auth.isAdmin)) return;
  router.replace({ query: { ...route.query, edit: undefined } });
  openEdit();
}, { immediate: true });
</script>

<style scoped>
/* One job still open: the bronze edge marks it as the player's own to do. */
.waiting {
  border-left: 3px solid rgb(var(--v-theme-primary));
  border-radius: 0 6px 6px 0;
  background: rgba(var(--v-theme-primary), 0.08);
  padding: 10px 14px;
}
.waiting + .waiting { margin-top: 8px; }
</style>
