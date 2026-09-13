<!-- One event, open to everyone: what it is, how it plays, who is in it, and the one thing
     the reader can do about it. A GNL season keeps its own pages, so this one links to them
     rather than redrawing them. The spoiler switch is the reader's own, kept in this browser. -->
<template>
  <v-container fluid class="pa-4">
    <StatusAlert v-model="error" />
    <v-progress-linear v-if="loading" indeterminate />

    <template v-if="event">
      <EventHeader :event="event" :league="league" />
      <p v-if="event.description" class="mt-3 mb-0 description">{{ event.description }}</p>

      <div class="d-flex flex-wrap align-center ga-3 mt-4">
        <v-chip size="small" variant="tonal" prepend-icon="mdi-account-multiple">
          {{ event.entrant_count ?? entrants.length }} entrants
        </v-chip>

        <!-- The one action the server picked for this caller; a chip once he is checked in -->
        <v-chip v-if="row?.action === 'checked_in'" size="small" color="success" variant="tonal"
          prepend-icon="mdi-check">
          Checked in
        </v-chip>
        <v-btn v-else-if="button" :color="button.color" :variant="button.variant" size="small"
          :prepend-icon="button.icon" :loading="acting" @click="act">
          {{ button.text }}
        </v-btn>
        <v-btn v-else-if="anonymous && event.signups_open" color="primary" variant="elevated" size="small"
          prepend-icon="mdi-login" @click="logIn">
          Log in to sign up
        </v-btn>

        <v-btn variant="outlined" color="primary" size="small"
          prepend-icon="mdi-account-multiple" :to="`/events/${event.id}/entrants`">
          Entrants
        </v-btn>
        <v-btn v-if="event.kind === 'gnl'" variant="outlined" color="primary" size="small"
          prepend-icon="mdi-trophy-outline" :to="`/seasons/${seasonSlug(event)}`">
          Season page
        </v-btn>
      </div>

      <v-card elevation="2" class="mt-4">
        <v-card-title>Stages</v-card-title>
        <v-table density="comfortable">
          <thead>
            <tr>
              <th style="width: 56px">#</th>
              <th>Stage</th>
              <th class="d-none d-md-table-cell">Format</th>
              <th class="text-right">Best of</th>
              <th class="text-right d-none d-md-table-cell">Series each round</th>
              <th class="d-none d-md-table-cell">Scheduling</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="stage in stages" :key="stage.position">
              <td>{{ stage.position }}</td>
              <td class="py-3">
                {{ stage.name || `Stage ${stage.position}` }}
                <div class="d-md-none text-caption text-medium-emphasis">
                  {{ phoneLine(stage) }}
                </div>
              </td>
              <td class="d-none d-md-table-cell">{{ titleOf(FORMATS, stage.format) }}</td>
              <td class="text-right">{{ stage.best_of }}</td>
              <td class="text-right d-none d-md-table-cell">{{ seriesEachRound(stage) ?? '—' }}</td>
              <td class="d-none d-md-table-cell">{{ titleOf(SCHEDULING_MODES, stage.scheduling_mode) }}</td>
            </tr>
            <tr v-if="!stages.length">
              <td colspan="6" class="text-medium-emphasis py-6 text-center">No stage is set yet.</td>
            </tr>
          </tbody>
        </v-table>
      </v-card>

      <!-- Who is in. A seed reads only once a stage locked its order, so it means something -->
      <v-card elevation="2" class="mt-4">
        <v-card-title>Entrants</v-card-title>
        <v-list v-if="entrants.length" density="compact" class="py-0">
          <v-list-item v-for="entrant in entrants" :key="entrant.id"
            :class="{ 'text-medium-emphasis': entrant.withdrawn_at }">
            <div class="d-flex align-center ga-3">
              <span v-if="seedsLocked" class="seed text-caption text-medium-emphasis">
                {{ entrant.seed ?? '—' }}
              </span>
              <PlayerName v-if="entrant.user" :player="entrant.user" :race="entrant.race" />
              <span v-else>{{ entrantName(entrant) }}</span>
              <span v-if="entrant.withdrawn_at" class="text-caption">withdrawn</span>
            </div>
          </v-list-item>
        </v-list>
        <p v-else class="text-medium-emphasis px-4 pb-4 mb-0">No entrants yet</p>
      </v-card>

      <!-- The stages read the same drawing the run page shows, with no admin control on it -->
      <div v-if="drawn.length" ref="draw" class="d-flex align-center justify-space-between mt-6">
        <h2 class="text-h6 mb-0">The draw</h2>
        <v-switch v-model="hideResults" color="primary" density="compact" hide-details
          label="Hide results" />
      </div>
      <template v-for="stage in drawn" :key="stage.id">
        <h3 class="text-subtitle-1 font-weight-bold mt-4 mb-2">{{ stage.name || `Stage ${stage.position}` }}</h3>
        <StageView readonly :stage="stage" :series="stage.series" :rounds="stage.rounds"
          :divisions="event.divisions" :standings="stage.standings" />
      </template>

      <SignupDialog ref="dialog" :event="event" @signed-up="reload" />
    </template>
  </v-container>
</template>

<script setup>
import { computed, onMounted, provide, ref, watch } from 'vue';
import { useRoute } from 'vue-router';

import EventHeader from '@/components/EventHeader.vue';
import PlayerName from '@/components/PlayerName.vue';
import SignupDialog from '@/components/SignupDialog.vue';
import StageView from '@/components/StageView.vue';
import StatusAlert from '@/components/StatusAlert.vue';
import { bySeed, entrantName } from '@/helpers/entrants.mjs';
import { FORMATS, SCHEDULING_MODES, titleOf } from '@/helpers/event-labels.mjs';
import { eventActionButton, HIDE_RESULTS, hideResultsStored, storeHideResults } from '@/helpers/events.mjs';
import { saveReturnUrl } from '@/helpers/return-url.mjs';
import { router } from '@/helpers/router.js';
import { seasonSlug } from '@/helpers/season-slug.mjs';
import { useAuthStore, useEventStore } from '@/stores';

const route = useRoute();
const auth = useAuthStore();
const store = useEventStore();
const event = ref(null);
const leagues = ref([]);
const entrants = ref([]);
const row = ref(null);  // the caller's own row of /me/events; null for a reader who is not logged in
const loading = ref(true);
const acting = ref(false);
const stageData = ref({});
const dialog = ref(null);
const draw = ref(null);
// the wizard lands here when the event was written but its divisions were not
const error = ref(route.query.divisions === 'unsaved'
  ? 'The event was created, but its divisions were not saved.' : null);

// The switch is per viewer and per browser, not per event, and every stage drawing reads it
const hideResults = ref(hideResultsStored());
provide(HIDE_RESULTS, hideResults);
watch(hideResults, (on) => storeHideResults(on));

const anonymous = computed(() => !auth.me);
const button = computed(() => eventActionButton(row.value?.action));
const league = computed(() => leagues.value.find((r) => r.id === event.value?.league_id) || null);
const stages = computed(() => [...(event.value?.stages || [])].sort((a, b) => a.position - b.position));
const seedsLocked = computed(() => stages.value.some((stage) => stage.seeds_locked_at));

// Only a round robin plays more than one series an entrant a round
const seriesEachRound = (stage) => (stage.format === 'round_robin' ? stage.series_per_entrant_per_round ?? 1 : null);

// A phone drops the format, the series count and the scheduling columns, so they ride under the name
const phoneLine = (stage) => [
  titleOf(FORMATS, stage.format),
  seriesEachRound(stage) ? `${seriesEachRound(stage)} series each round` : null,
  titleOf(SCHEDULING_MODES, stage.scheduling_mode),
].filter(Boolean).join(' · ');

// Only the stages that hold series are drawn; the table above lists every stage
const drawn = computed(() => stages.value
  .map((stage) => ({ ...stage, ...(stageData.value[stage.id] || {}) }))
  .filter((stage) => stage.series?.length));

const logIn = () => {
  saveReturnUrl(route.fullPath);
  router.push('/login');
};

// One action word, one thing to do. A withdraw asks once; the rest go straight through.
const act = async () => {
  const action = row.value?.action;
  if (action === 'sign_up') return dialog.value.open();
  if (action === 'view') return draw.value?.scrollIntoView({ behavior: 'smooth' });
  if (action === 'withdraw' && !confirm('Withdraw from this event?')) return;
  acting.value = true;
  try {
    if (action === 'withdraw') await store.withdraw(event.value.id);
    if (action === 'check_in') await store.checkIn(event.value.id, row.value.entrant_id);
    await reload();
  } catch (e) {
    error.value = `That did not go through: ${e.message}`;
  } finally {
    acting.value = false;
  }
};

// The entrant list and the caller's own row move together: a signup changes both
const reload = async () => {
  const [rows, mine] = await Promise.all([
    store.fetchEntrants(event.value.id),
    // the caller's row lives behind a login, and an older backend answers nothing at all
    auth.me ? store.myEvents().catch(() => []) : Promise.resolve([]),
  ]);
  entrants.value = bySeed(rows);
  row.value = mine.find((r) => r.id === event.value.id) ?? null;
};

onMounted(async () => {
  try {
    [event.value, leagues.value] = await Promise.all([
      store.fetchEvent(route.params.id),
      store.fetchLeagues(),
    ]);
    await reload();
    await Promise.all(stages.value.map(async (stage) => {
      // A stage nobody has generated answers nothing, and its drawing stays off the page
      const [rows, table] = await Promise.all([
        store.fetchStage(event.value.id, stage.id).catch(() => null),
        store.fetchStandings(event.value.id, stage.id).catch(() => []),
      ]);
      if (rows) stageData.value[stage.id] = { ...rows, standings: table };
    }));
  } catch (e) {
    error.value = `The event did not load: ${e.message}`;
  } finally {
    loading.value = false;
  }
});
</script>

<style scoped>
.description {
  max-width: 70ch;
  white-space: pre-line;
}
.seed {
  min-width: 2ch;
  text-align: right;
  font-variant-numeric: tabular-nums;
}
</style>
