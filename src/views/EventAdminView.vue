<!-- The run page: an admin generates a stage, enters every result, reopens one and
     advances the stage. It draws each stage with the same StageView the public page shows. -->
<template>
  <v-container fluid class="pa-4">
    <StatusAlert v-model="error" />
    <v-progress-linear v-if="loading" indeterminate />

    <template v-if="event">
      <EventHeader :event="event" :league="league" />
      <v-btn class="mt-3" variant="outlined" color="primary" size="small"
        prepend-icon="mdi-eye-outline" :to="`/events/${event.id}`">Public page</v-btn>

      <v-tabs v-if="stages.length > 1" v-model="tab" class="mt-4" bg-color="surface-light">
        <v-tab v-for="(stage, index) in stages" :key="stage.id" :value="index">
          {{ stage.name || `Stage ${stage.position}` }}
        </v-tab>
      </v-tabs>

      <template v-if="stage">
        <div class="d-flex flex-wrap align-center ga-3 mt-4">
          <v-chip size="small" variant="tonal">{{ titleOf(FORMATS, stage.format) }}</v-chip>
          <v-chip size="small" variant="tonal">Best of {{ stage.best_of }}</v-chip>
          <v-chip v-if="stage.auto_advance" size="small" variant="tonal" color="info"
            prepend-icon="mdi-fast-forward">Advance is automatic</v-chip>
          <v-spacer />
          <v-btn v-if="!series.length" color="primary" prepend-icon="mdi-tournament"
            :disabled="saving" @click="confirmGenerate = true">Generate</v-btn>
          <v-btn v-else-if="complete" color="primary" prepend-icon="mdi-arrow-right-bold"
            :disabled="saving" @click="confirmAdvance = true">Advance</v-btn>
        </div>

        <StageView class="mt-4" :stage="stage" :series="series" :rounds="rounds"
          :divisions="event.divisions" :standings="standings" @open-series="openSeries" />
      </template>
    </template>

    <!-- Generating writes every series of the stage, so it says what it is about to make -->
    <v-dialog v-model="confirmGenerate" max-width="520">
      <v-card>
        <v-card-title class="bg-primary">Generate this stage</v-card-title>
        <v-card-text class="pt-4">
          <p class="mb-3">Seeds come from {{ seedSource }}.</p>
          <v-table density="compact">
            <thead>
              <tr><th>Division</th><th class="text-right">Entrants</th><th class="text-right">Byes</th></tr>
            </thead>
            <tbody>
              <tr v-for="row in fields" :key="row.key">
                <td>{{ row.name }}</td>
                <td class="text-right">{{ row.entrants }}</td>
                <td class="text-right">{{ row.byes }}</td>
              </tr>
            </tbody>
          </v-table>
        </v-card-text>
        <v-card-actions>
          <v-spacer />
          <v-btn variant="text" @click="confirmGenerate = false">Cancel</v-btn>
          <v-btn color="primary" variant="elevated" :loading="saving" @click="generate">Generate</v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <!-- Advancing carries the top entrants into the next stage -->
    <v-dialog v-model="confirmAdvance" max-width="520">
      <v-card>
        <v-card-title class="bg-primary">Advance this stage</v-card-title>
        <v-card-text class="pt-4">
          <p v-if="!advancing.length" class="mb-0">Nobody moves on: the next stage takes no entrants.</p>
          <template v-else>
            <p class="mb-2">These entrants move into the next stage.</p>
            <ul class="ml-4">
              <li v-for="row in advancing" :key="row.entrant_id">{{ row.name }}</li>
            </ul>
          </template>
        </v-card-text>
        <v-card-actions>
          <v-spacer />
          <v-btn variant="text" @click="confirmAdvance = false">Cancel</v-btn>
          <v-btn color="primary" variant="elevated" :loading="saving" @click="advance">Advance</v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <!-- One series: the winner of each game, or a result no game was played for -->
    <v-dialog v-model="resultOpen" max-width="560">
      <v-card v-if="picked">
        <v-card-title class="bg-primary">Enter a result</v-card-title>
        <v-card-text class="pt-4">
          <StatusAlert v-model="dialogError" />
          <p class="text-subtitle-1 mb-4">{{ sideName(1) }} {{ score[0] }} – {{ score[1] }} {{ sideName(2) }}</p>

          <v-alert v-if="scored" type="info" variant="tonal" density="compact" class="mb-4">
            This series carries a result. Reopening it clears every side it feeds.
          </v-alert>

          <template v-if="bothSides">
            <div v-for="game in gameRows" :key="game" class="mb-3">
              <div class="text-subtitle-2 mb-1">Game {{ game }}</div>
              <v-btn-toggle :model-value="winners[game - 1]" color="primary" divided variant="outlined"
                density="comfortable" class="d-flex" @update:model-value="setWinner(game, $event)">
                <v-btn value="A" class="flex-grow-1">{{ sideName(1) }} won</v-btn>
                <v-btn value="B" class="flex-grow-1">{{ sideName(2) }} won</v-btn>
              </v-btn-toggle>
            </div>
            <p class="text-caption text-medium-emphasis mb-4">
              The map and the replay of each game are entered by the players.
            </p>
          </template>
          <p v-else class="text-medium-emphasis mb-4">Both sides fill when the series above are played.</p>

          <v-divider class="mb-4" />
          <div class="text-subtitle-2 mb-2">No game played</div>
          <v-btn-toggle v-model="awardSide" color="primary" divided variant="outlined"
            density="comfortable" class="d-flex mb-2">
            <v-btn :value="1" class="flex-grow-1">{{ sideName(1) }}</v-btn>
            <v-btn :value="2" class="flex-grow-1">{{ sideName(2) }}</v-btn>
          </v-btn-toggle>
          <div class="d-flex ga-2">
            <v-btn variant="outlined" size="small" :disabled="!awardSide || scored || saving"
              @click="award('walkover')">Walkover</v-btn>
            <v-btn variant="outlined" size="small" :disabled="!awardSide || scored || saving"
              @click="award('forfeit')">Forfeit</v-btn>
          </div>
        </v-card-text>
        <v-card-actions>
          <v-btn v-if="scored" color="error" variant="text" :loading="saving" @click="reopen(false)">Reopen</v-btn>
          <v-spacer />
          <v-btn variant="text" :disabled="saving" @click="resultOpen = false">Close</v-btn>
          <v-btn color="primary" variant="elevated" prepend-icon="mdi-content-save"
            :disabled="!validScore || saving" :loading="saving" @click="saveScore">Save result</v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <!-- A reopen the engine refused: a series below already carries a result -->
    <v-dialog v-model="confirmForce" max-width="480">
      <v-card>
        <v-card-title class="bg-error">Reopen past a played series</v-card-title>
        <v-card-text class="pt-4">
          A series below this one already carries a result. Reopening clears it, and the
          bracket refills when this series is scored again.
        </v-card-text>
        <v-card-actions>
          <v-spacer />
          <v-btn variant="text" @click="confirmForce = false">Cancel</v-btn>
          <v-btn color="error" variant="elevated" :loading="saving" @click="reopen(true)">Reopen anyway</v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>
  </v-container>
</template>

<script setup>
import { computed, onMounted, ref, watch } from 'vue';
import { useRoute } from 'vue-router';

import EventHeader from '@/components/EventHeader.vue';
import StageView from '@/components/StageView.vue';
import StatusAlert from '@/components/StatusAlert.vue';
import { FORMATS, titleOf } from '@/helpers/event-labels.mjs';
import { scoreOf } from '@/helpers/map-order.mjs';
import { isScored, winsFor } from '@/helpers/stage-view.mjs';
import { useEventStore } from '@/stores';

const route = useRoute();
const store = useEventStore();

const event = ref(null);
const league = ref(null);
const entrants = ref([]);
const series = ref([]);
const rounds = ref([]);
const standings = ref([]);
const loading = ref(true);
const saving = ref(false);
const error = ref(null);
const dialogError = ref(null);
const tab = ref(0);

const confirmGenerate = ref(false);
const confirmAdvance = ref(false);
const confirmForce = ref(false);
const resultOpen = ref(false);
const picked = ref(null);
const winners = ref([]);
const awardSide = ref(null);

const stages = computed(() => [...(event.value?.stages || [])].sort((a, b) => a.position - b.position));
const stage = computed(() => stages.value[tab.value] || null);
const complete = computed(() => series.value.length > 0 && series.value.every(isScored));

// What the generate dialog promises: where the seeds come from, and the field per division
const seedSource = computed(() => entrants.value.find((row) => row.seed_source)?.seed_source || 'MMR');
const fields = computed(() => {
  const bands = event.value?.divisions?.length
    ? [...event.value.divisions].sort((a, b) => a.position - b.position)
    : [{ id: null, position: 1, name: null }];
  return bands.map((band) => {
    const count = entrants.value.filter((row) => (band.id == null ? true : row.division_id === band.id)).length;
    let size = 1;
    while (size < count) size *= 2;
    return { key: band.id ?? 'all', name: band.name || `Division ${band.position}`, entrants: count, byes: size - count };
  });
});

// Who the next stage takes: the top of each division's table, as the stage's count says
const advancing = computed(() => {
  const take = stage.value?.advance_count || 0;
  return standings.value.flatMap((group) => (group.rows || []).slice(0, take));
});

const load = async () => {
  loading.value = true;
  try {
    const [row, leagues] = await Promise.all([store.fetchEvent(route.params.id), store.fetchLeagues()]);
    event.value = row;
    league.value = leagues.find((one) => one.id === row.league_id) || null;
    entrants.value = await store.fetchEntrants(row.id).catch(() => []);
    await loadStage();
  } catch (e) {
    error.value = `The event did not load: ${e.message}`;
  } finally {
    loading.value = false;
  }
};

const loadStage = async () => {
  series.value = [];
  rounds.value = [];
  standings.value = [];
  if (!stage.value) return;
  try {
    const [drawn, table] = await Promise.all([
      store.fetchStage(event.value.id, stage.value.id),
      store.fetchStandings(event.value.id, stage.value.id).catch(() => []),
    ]);
    series.value = drawn.series || [];
    rounds.value = drawn.rounds || [];
    standings.value = table;
  } catch (e) {
    error.value = `The stage did not load: ${e.message}`;
  }
};

watch(tab, loadStage);
onMounted(load);

const run = async (work) => {
  saving.value = true;
  dialogError.value = null;
  try {
    await work();
    await loadStage();
    return true;
  } catch (e) {
    dialogError.value = e.message;
    error.value = e.message;
    return false;
  } finally {
    saving.value = false;
  }
};

const generate = async () => {
  if (await run(() => store.generateStage(event.value.id, stage.value.id))) confirmGenerate.value = false;
};
const advance = async () => {
  if (await run(() => store.advanceStage(event.value.id, stage.value.id))) {
    confirmAdvance.value = false;
    event.value = await store.fetchEvent(route.params.id);
  }
};

// One series in the dialog: its games open on the score it already carries
const openSeries = (row) => {
  picked.value = row;
  dialogError.value = null;
  awardSide.value = null;
  const [a, b] = [row.player1_score ?? 0, row.player2_score ?? 0];
  winners.value = [...Array(a).fill('A'), ...Array(b).fill('B')];
  resultOpen.value = true;
};

const scored = computed(() => isScored(picked.value));
const bothSides = computed(() => !!(picked.value?.player1_id && picked.value?.player2_id));
const wins = computed(() => winsFor(stage.value?.best_of));
const score = computed(() => scoreOf(winners.value));
const gameRows = computed(() => {
  const [a, b] = score.value;
  return a >= wins.value || b >= wins.value ? a + b : Math.min(stage.value?.best_of || 3, a + b + 1);
});
const validScore = computed(() => {
  const [a, b] = score.value;
  return bothSides.value && (a === wins.value) !== (b === wins.value) && Math.max(a, b) === wins.value;
});

const sideName = (side) => picked.value?.[`player${side}`]?.name || `Side ${side}`;
// A changed winner drops the games after it: they were played from a different score
const setWinner = (game, side) => {
  winners.value[game - 1] = side || null;
  winners.value.length = side ? game : game - 1;
  winners.value = [...winners.value];
};

const saveScore = async () => {
  const [a, b] = score.value;
  await run(() => store.scoreSeries(picked.value.id, { player1_score: a, player2_score: b }));
  if (!dialogError.value) resultOpen.value = false;
};

const award = async (kind) => {
  await run(() => store.awardSeries(picked.value.id, kind, awardSide.value));
  if (!dialogError.value) resultOpen.value = false;
};

const reopen = async (force) => {
  const cleared = { player1_score: null, player2_score: null };
  const ok = await run(() => store.scoreSeries(picked.value.id, cleared, force));
  if (ok) {
    confirmForce.value = false;
    resultOpen.value = false;
  } else if (!force) {
    confirmForce.value = true;
  }
};

// A reload swaps every series row, so the open dialog follows the one it was showing
watch(series, () => { if (picked.value) picked.value = series.value.find((row) => row.id === picked.value.id) || null; });
</script>
