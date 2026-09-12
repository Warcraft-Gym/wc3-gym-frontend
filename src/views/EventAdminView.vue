<!-- The admin side of one event (#36): divisions and seeds over the entrants, then
     per stage the Generate button and the series it has produced. -->
<template>
  <v-container>
    <StatusAlert v-model="error" />
    <StatusAlert v-model="notice" type="success" />
    <v-progress-linear v-if="loading" indeterminate />

    <v-card v-if="event" elevation="2" class="mb-4">
      <v-card-title class="bg-primary d-flex align-center flex-wrap ga-2">
        <v-icon class="mr-2">mdi-calendar-star</v-icon>
        {{ event.name }}
        <v-chip size="small" variant="tonal" color="on-primary">{{ PHASE_LABEL[event.phase] || event.phase }}</v-chip>
        <v-spacer />
        <v-btn v-if="!event.discord_event_id" variant="tonal" color="on-primary" prepend-icon="$discord" :loading="posting" @click="postDiscord">Post to Discord</v-btn>
        <v-btn v-else variant="tonal" color="on-primary" prepend-icon="mdi-close" :loading="posting" @click="removeDiscord">Remove Discord post</v-btn>
      </v-card-title>
      <v-card-text class="pt-4 d-flex flex-wrap ga-4 align-center">
        <RouterLink v-if="event.league_id" :to="`/leagues/${event.league_id}`">League</RouterLink>
        <span>{{ dateText(event.start_date) }} – {{ dateText(event.end_date) }}</span>
        <span class="text-medium-emphasis">{{ entrants.length }} entrants</span>
      </v-card-text>
    </v-card>

    <!-- Entrants, their divisions and their seeds -->
    <v-card v-if="event" elevation="2" class="mb-4">
      <v-card-title class="bg-primary d-flex align-center flex-wrap ga-2">
        <v-icon class="mr-2">mdi-account-group</v-icon>
        Entrants
        <v-spacer />
        <v-btn variant="tonal" color="on-primary" prepend-icon="mdi-sort-numeric-descending" :disabled="unsavedDivisions" @click="assignDivisions">Assign from MMR</v-btn>
        <v-btn variant="tonal" color="on-primary" prepend-icon="mdi-content-save" :disabled="!dirty || unsavedDivisions" :loading="saving" @click="saveEntrants">Save seeds</v-btn>
      </v-card-title>
      <v-card-text class="pt-4">
        <!-- Boundaries: the lower MMR bound of every division, lowest first -->
        <div class="d-flex flex-wrap ga-2 align-center mb-2">
          <strong>Divisions</strong>
          <span v-if="unsavedDivisions" class="text-caption text-warning">Save the divisions before you seed the entrants</span>
          <v-spacer />
          <v-btn variant="text" prepend-icon="mdi-plus" @click="addDivision">Add division</v-btn>
          <v-btn variant="text" prepend-icon="mdi-content-save" :loading="savingDivisions" @click="saveDivisions">Save divisions</v-btn>
        </div>
        <v-row dense>
          <v-col v-for="(division, index) in divisions" :key="division.id ?? `new-${index}`" cols="12" md="6">
            <div class="d-flex ga-2 align-center">
              <v-text-field v-model="division.name" class="division-field" label="Name" variant="outlined" density="comfortable" hide-details />
              <v-text-field v-model="division.lower_bound" class="division-field" label="From MMR" type="number" variant="outlined" density="comfortable" hide-details />
              <v-btn icon="mdi-delete" variant="text" aria-label="Remove division" class="tap" @click="divisions.splice(index, 1)" />
            </div>
          </v-col>
        </v-row>

        <GroupedTable class="mt-4" :columns="entrantColumns" :groups="entrantGroups" default-open empty="Nobody has signed up yet. Open signups on the event.">
          <template #head.mmr><W3CMmr /></template>
          <template #group="{ group }">
            <td :colspan="entrantColumns.length">
              <strong>{{ group.title }}</strong>
              <span class="text-medium-emphasis ml-2">{{ group.rows.length }} {{ group.rows.length === 1 ? 'entrant' : 'entrants' }}</span>
            </td>
          </template>
          <template #rows="{ group }">
            <tr v-for="row in group.rows" :key="row.id" class="detail-row">
              <td></td>
              <td class="text-no-wrap">
                <v-btn icon="mdi-chevron-up" variant="text" size="small" class="tap" aria-label="Seed up" @click="move(row, -1)" />
                <v-btn icon="mdi-chevron-down" variant="text" size="small" class="tap" aria-label="Seed down" @click="move(row, 1)" />
                <span class="ml-1">{{ row.seed ?? '—' }}</span>
              </td>
              <td>
                <PlayerName :player="row.player || { name: row.name }" :race="row.race" />
                <div v-if="!mdAndUp"><EntrantChips :entrant="row" /></div>
              </td>
              <td class="text-right">{{ row.mmr ?? '—' }}</td>
              <td v-if="mdAndUp"><EntrantChips :entrant="row" /></td>
              <td v-if="mdAndUp">{{ CHANNEL_LABEL[row.channel] || row.channel || '—' }}</td>
            </tr>
          </template>
        </GroupedTable>
      </v-card-text>
    </v-card>

    <!-- One card per stage: what it plays, and the series it holds -->
    <v-card v-for="stage in event?.stages || []" :key="stage.id" elevation="2" class="mb-4">
      <v-card-title class="bg-primary d-flex align-center flex-wrap ga-2">
        <v-icon class="mr-2">mdi-tournament</v-icon>
        {{ stage.name }}
        <v-chip size="small" variant="tonal" color="on-primary">{{ formatTitle(stage.format) }}</v-chip>
        <v-chip size="small" variant="tonal" color="on-primary">Bo{{ gamesOf(stage.map_rules) }}</v-chip>
        <v-chip v-if="!isBuiltFormat(stage.format)" size="small" variant="outlined" color="on-primary">Not generated yet</v-chip>
        <v-spacer />
        <v-btn variant="tonal" color="on-primary" prepend-icon="mdi-cogs" :disabled="!isBuiltFormat(stage.format)" :loading="working === stage.id" @click="generate(stage)">Generate</v-btn>
        <v-btn v-if="stage.advance_count" variant="tonal" color="on-primary" prepend-icon="mdi-arrow-right-bold" :loading="working === stage.id" @click="advance(stage)">
          Advance {{ stage.advance_count }}
        </v-btn>
      </v-card-title>
      <v-card-text class="pa-0">
        <v-table v-if="(series[stage.id] || []).length" density="comfortable">
          <thead>
            <tr>
              <th class="d-none d-md-table-cell">Round</th>
              <th>Series</th>
              <th>Result</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="row in series[stage.id]" :key="row.id">
              <td class="d-none d-md-table-cell text-no-wrap">{{ roundName(row) }}</td>
              <td>
                <PlayerName :player="row.player1" :race="row.player1_race" />
                <span class="mx-2 text-medium-emphasis">vs</span>
                <PlayerName :player="row.player2" :race="row.player2_race" />
              </td>
              <td>
                <div class="d-flex ga-2 align-center">
                  <v-text-field v-model="row.player1_score" type="number" density="compact" variant="outlined" hide-details class="score-field" aria-label="Player 1 score" />
                  <v-text-field v-model="row.player2_score" type="number" density="compact" variant="outlined" hide-details class="score-field" aria-label="Player 2 score" />
                  <v-btn icon="mdi-content-save" variant="text" class="tap" aria-label="Save result" :disabled="!!scoreProblem(row, stage)" :loading="savingSeries === row.id" @click="saveSeries(row, stage)" />
                  <v-btn icon="mdi-backup-restore" variant="text" class="tap" aria-label="Reopen" @click="reopen(row, stage)" />
                </div>
                <div v-if="scoreProblem(row, stage)" class="text-error text-caption mt-1">{{ scoreProblem(row, stage) }}</div>
              </td>
            </tr>
          </tbody>
        </v-table>
        <div v-else class="text-center pa-8">
          <v-icon size="48" class="text-disabled">mdi-tournament</v-icon>
          <div class="text-medium-emphasis mt-3">
            No series yet. Seed the entrants, then generate this stage.
          </div>
        </div>
      </v-card-text>
    </v-card>
  </v-container>
</template>

<script setup>
import { computed, onMounted, ref } from 'vue';
import { useRoute } from 'vue-router';
import { useDisplay } from 'vuetify';

import EntrantChips from '@/components/EntrantChips.vue';
import GroupedTable from '@/components/GroupedTable.vue';
import PlayerName from '@/components/PlayerName.vue';
import StatusAlert from '@/components/StatusAlert.vue';
import W3CMmr from '@/components/W3CMmr.vue';
import { gamesOf, neverPlayed, resultProblem } from '@/helpers/best-of.mjs';
import { useColumns } from '@/helpers/columns';
import { assignFromMmr, CHANNEL_LABEL, dateText, formatTitle, isBuiltFormat, moveSeed, PHASE_LABEL } from '@/helpers/events-admin.mjs';
import { useEventStore, useSeriesStore } from '@/stores';

// A phone has no room for the last two columns; their chips ride under the player's name there
const entrantColumns = useColumns([
  { key: 'seed', title: 'Seed', width: '150px' },
  { key: 'player', title: 'Player' },
  { key: 'mmr', title: 'MMR', align: 'right' },
  { key: 'eligibility', title: 'Eligibility', mobile: false },
  { key: 'channel', title: 'Signed up by', mobile: false },
]);

const { mdAndUp } = useDisplay();
const route = useRoute();
const store = useEventStore();
const seriesStore = useSeriesStore();
const eventId = Number(route.params.id);

const event = ref(null);
const entrants = ref([]);
const divisions = ref([]);
const series = ref({});
const loading = ref(true);
const saving = ref(false);
const savingSeries = ref(null);
const savingDivisions = ref(false);
const posting = ref(false);
const working = ref(null);
const dirty = ref(false);
const error = ref(null);
const notice = ref(null);

// A division exists once it is saved and has an id; an unsaved one holds no entrant yet
const unsavedDivisions = computed(() => divisions.value.some((division) => division.id == null));

const seeded = (rows) => [...rows].sort((a, b) => (a.seed ?? 999) - (b.seed ?? 999));

// The entrants of one saved division, seeded order first; an event with no division has one
// group, and an entrant no saved division holds waits under "Unassigned"
const entrantGroups = computed(() => {
  if (!entrants.value.length) return [];  // GroupedTable draws its empty row only with no group
  const saved = divisions.value.filter((division) => division.id != null);
  if (!saved.length) return [{ key: 'division:all', title: 'All entrants', rows: seeded(entrants.value) }];
  const held = new Set(saved.map((division) => division.id));
  const groups = saved.map((division) => ({
    key: `division:${division.id}`,
    title: division.name || 'Division',
    rows: seeded(entrants.value.filter((row) => row.division_id === division.id)),
  }));
  const rest = seeded(entrants.value.filter((row) => !held.has(row.division_id)));
  if (rest.length) groups.push({ key: 'division:none', title: 'Unassigned', rows: rest });
  return groups;
});

const roundName = (row) => row.round?.name || (row.round?.number ? `Round ${row.round.number}` : '—');

// A blank field is no score at all, which Number() would read as a zero
const score = (value) => (value === null || value === undefined || value === '' ? NaN : Number(value));
const scoreProblem = (row, stage) => {
  const p1 = score(row.player1_score);
  const p2 = score(row.player2_score);
  if (Number.isNaN(p1) && Number.isNaN(p2)) return null;  // a series nobody has played yet
  return resultProblem(p1, p2, stage.map_rules);
};

const addDivision = () => {
  divisions.value.push({ id: null, position: divisions.value.length + 1, name: `Division ${divisions.value.length + 1}`, lower_bound: null });
};

const assignDivisions = () => {
  entrants.value = assignFromMmr(entrants.value, divisions.value);
  dirty.value = true;
};

const move = (row, delta) => {
  entrants.value = moveSeed(entrants.value, row.id, delta);
  dirty.value = true;
};

// Every write draws a busy state, clears the last error and reports what it did
const run = async (busy, work, done) => {
  busy(true);
  error.value = null;
  try {
    await work();
    if (done) notice.value = done;
  } catch (e) {
    error.value = e.message || String(e);
  } finally {
    busy(false);
  }
};
const busy = (flag) => (on) => { flag.value = on; };
const stageBusy = (stage) => (on) => { working.value = on ? stage.id : null; };
// One series saving leaves the seeds button alone
const seriesBusy = (row) => (on) => { savingSeries.value = on ? row.id : null; };

const saveEntrants = () => run(busy(saving), async () => {
  await store.saveEntrants(eventId, entrants.value);
  dirty.value = false;
}, 'Seeds saved');

const saveDivisions = () => run(busy(savingDivisions), async () => {
  const rows = divisions.value.map((division, index) => ({
    ...division,
    position: index + 1,
    lower_bound: division.lower_bound === '' || division.lower_bound === null ? null : Number(division.lower_bound),
  }));
  divisions.value = (await store.saveDivisions(eventId, rows))?.divisions || rows;
}, 'Divisions saved');

const postDiscord = () => run(busy(posting), async () => { event.value = await store.postToDiscord(eventId); }, 'Posted to Discord');
const removeDiscord = () => run(busy(posting), async () => {
  await store.removeDiscordPost(eventId);
  event.value = { ...event.value, discord_event_id: null };
}, 'Discord post removed');

// Stages load side by side, so each one writes its own key rather than a whole new map
const loadSeries = async (stage) => {
  series.value[stage.id] = (await store.fetchStageSeries(eventId, stage.id)) || [];
};

const generate = (stage) => run(stageBusy(stage), async () => {
  await store.generateStage(eventId, stage.id);
  await loadSeries(stage);
}, 'Series generated');

const advance = (stage) => run(stageBusy(stage), async () => {
  event.value = await store.advanceStage(eventId, stage.id);
  entrants.value = (await store.fetchEntrants(eventId)) || [];
  await Promise.all((event.value.stages || []).map(loadSeries));
}, 'Stage advanced');

const saveSeries = (row, stage) => run(seriesBusy(row), async () => {
  await seriesStore.updateSeries({ ...row, player1_score: score(row.player1_score), player2_score: score(row.player2_score) });
  await loadSeries(stage);
}, neverPlayed(score(row.player1_score), score(row.player2_score)) ? 'Series stored as never played' : 'Result saved');

// Reopen is the score cleared: the two sides report again
const reopen = (row, stage) => run(seriesBusy(row), async () => {
  await seriesStore.updateSeries({ ...row, player1_score: null, player2_score: null });
  await loadSeries(stage);
}, 'Series reopened');

onMounted(async () => {
  // The wizard sends this when the event was created but its Discord announcement failed
  if (route.query.discord === 'failed') error.value = 'The event was created, but the Discord announcement failed. Post to Discord tries again.';
  try {
    event.value = await store.fetchEvent(eventId);
    divisions.value = (event.value.divisions || []).map((division) => ({ ...division }));
    entrants.value = (await store.fetchEntrants(eventId)) || [];
    await Promise.all((event.value.stages || []).map(loadSeries));
  } catch (e) {
    error.value = `Failed to load the event: ${e.message}`;
  } finally {
    loading.value = false;
  }
});
</script>

<style scoped>
.division-field {
  flex: 1 1 0;
  min-width: 0;
}
.score-field {
  width: 68px;
  flex: none;
}
/* A finger needs a bigger target than a mouse */
@media (max-width: 600px) {
  .tap {
    min-width: 48px;
    min-height: 48px;
  }
}
</style>
