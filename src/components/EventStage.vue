<!-- One stage of an event (#36): a single-elimination bracket drawn from its series, or the
     standings with the rounds below them. A held-back result shows a Reveal button instead. -->
<template>
  <v-card elevation="2" class="mb-4">
    <v-card-title class="bg-primary d-flex align-center flex-wrap ga-2">
      <v-icon class="mr-2">mdi-tournament</v-icon>
      {{ stage.name }}
      <v-chip size="small" variant="tonal" color="on-primary">{{ formatTitle(stage.format) }}</v-chip>
      <v-chip size="small" variant="tonal" color="on-primary">Bo{{ bestOf }}</v-chip>
      <v-chip v-if="stage.advance_count" size="small" variant="outlined" color="on-primary">Top {{ stage.advance_count }} advance</v-chip>
    </v-card-title>
    <v-card-text class="pa-4">
      <v-progress-linear v-if="loading" indeterminate />
      <StatusAlert v-model="error" />

      <!-- A tree: one column per round, the box of a series that does not exist yet naming its feeders -->
      <div v-if="isBracket && columns.length" class="bracket">
        <div v-for="column in columns" :key="column.round.id ?? column.round.number" class="bracket-column">
          <div class="text-overline text-medium-emphasis">{{ column.label }}</div>
          <div
            v-for="box in column.boxes"
            :key="box.key"
            class="box"
            :class="{ clickable: !!box.series }"
            :role="box.series ? 'button' : undefined"
            :aria-label="boxLabel(box)"
            :tabindex="box.series ? 0 : undefined"
            @click="openSeries(box.series)"
            @keydown.enter="openSeries(box.series)"
            @keydown.space.prevent="openSeries(box.series)"
          >
            <div v-for="side in [0, 1]" :key="side" class="side" :class="{ won: winner(box.series) === side }">
              <PlayerName v-if="box.series && !box.blind[side]" :player="player(box.series, side)" :race="race(box.series, side)" plain />
              <span v-else class="text-medium-emphasis">{{ box.feeders[side] }}</span>
              <span class="score">{{ scoreText(box.series, side) }}</span>
            </div>
            <div class="box-foot">
              <v-btn v-if="box.series && hidden(box.series)" size="x-small" variant="text" prepend-icon="mdi-eye" @click.stop="emit('reveal', box.series.id)">Reveal</v-btn>
              <v-chip v-else-if="box.series" size="x-small" variant="tonal" :color="STATE_COLOR[seriesState(box.series)]">{{ STATE_LABEL[seriesState(box.series)] }}</v-chip>
              <v-spacer />
              <CastChips v-if="box.series" :series="box.series" />
            </div>
          </div>
        </div>
      </div>

      <!-- Every other built format ranks its entrants and plays rounds -->
      <template v-else>
        <div v-if="standings.length" class="mb-4">
          <div class="d-flex align-center ga-2 mb-2">
            <strong>Standings</strong>
            <v-chip v-for="rule in rankingRules" :key="rule" size="x-small" variant="tonal">{{ rule }}</v-chip>
          </div>
          <v-btn v-if="spoiler.hide && !showStandings" variant="tonal" prepend-icon="mdi-eye" @click="showStandings = true">Show the standings</v-btn>
          <v-table v-else density="compact">
            <thead>
              <tr>
                <th>Rank</th>
                <th>Name</th>
                <th class="text-right">Played</th>
                <th class="text-right d-none d-sm-table-cell">Won</th>
                <th class="text-right d-none d-sm-table-cell">Lost</th>
                <th class="text-right d-none d-md-table-cell">Game diff</th>
                <th class="text-right">Points</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="(row, index) in standings" :key="row.entrant_id ?? index">
                <td>{{ row.rank ?? index + 1 }}</td>
                <td><PlayerName :player="row.player || { name: row.name }" :race="row.race" /></td>
                <td class="text-right">{{ row.played ?? '—' }}</td>
                <td class="text-right d-none d-sm-table-cell">{{ row.won ?? '—' }}</td>
                <td class="text-right d-none d-sm-table-cell">{{ row.lost ?? '—' }}</td>
                <td class="text-right d-none d-md-table-cell">{{ row.game_diff ?? '—' }}</td>
                <td class="text-right font-weight-medium">{{ row.points ?? '—' }}</td>
              </tr>
            </tbody>
          </v-table>
        </div>

        <div v-for="group in groups" :key="group.key" class="mb-3">
          <div class="d-flex align-center ga-2">
            <strong>{{ group.label }}</strong>
            <v-chip size="x-small" variant="tonal" :color="STATE_COLOR[group.state]">{{ STATE_LABEL[group.state] }}</v-chip>
            <span class="text-medium-emphasis text-caption">{{ group.rows.length }} series</span>
          </div>
          <div v-for="row in group.rows" :key="row.id" class="series-row" tabindex="0" @click="openSeries(row)" @keydown.enter="openSeries(row)">
            <PlayerName :player="player(row, 0)" :race="race(row, 0)" plain :class="{ 'font-weight-bold': winner(row) === 0 }" />
            <span class="mx-2 text-medium-emphasis">v</span>
            <PlayerName :player="player(row, 1)" :race="race(row, 1)" plain :class="{ 'font-weight-bold': winner(row) === 1 }" />
            <v-spacer />
            <v-btn v-if="hidden(row)" size="x-small" variant="text" prepend-icon="mdi-eye" @click.stop="emit('reveal', row.id)">Reveal</v-btn>
            <span v-else-if="seriesState(row) === 'complete'" class="font-weight-medium score">{{ row.player1_score }} – {{ row.player2_score }}</span>
            <span v-else class="text-medium-emphasis">{{ STATE_LABEL[seriesState(row)].toLowerCase() }}</span>
            <CastChips :series="row" class="ml-2" />
          </div>
          <div v-if="!group.rows.length" class="text-medium-emphasis text-caption">Not drawn yet</div>
        </div>

        <div v-if="!groups.length && !loading" class="text-center pa-6">
          <v-icon size="48" class="text-disabled">mdi-tournament</v-icon>
          <div class="text-medium-emphasis mt-3">This stage has not been drawn yet.</div>
        </div>
      </template>
    </v-card-text>
  </v-card>
</template>

<script setup>
import { computed, onMounted, ref } from 'vue';
import { useRouter } from 'vue-router';

import CastChips from '@/components/CastChips.vue';
import PlayerName from '@/components/PlayerName.vue';
import StatusAlert from '@/components/StatusAlert.vue';
import { gamesOf } from '@/helpers/best-of.mjs';
import { formatTitle } from '@/helpers/events-admin.mjs';
import { bracketColumns, isHidden, roundGroups, seriesState, STATE_COLOR, STATE_LABEL } from '@/helpers/events-public.mjs';
import { useEventStore } from '@/stores';

const props = defineProps({
  eventId: { type: Number, required: true },
  stage: { type: Object, required: true },  // id, name, format, map_rules, rounds
  spoiler: { type: Object, required: true },  // { hide, revealed }
});
const emit = defineEmits(['reveal']);

const router = useRouter();
const store = useEventStore();

const series = ref([]);
const standings = ref([]);
const loading = ref(true);
const error = ref(null);
const showStandings = ref(false);

// A stage names its own best-of; the rule list only counts the maps when it does not
const bestOf = computed(() => props.stage.best_of ?? gamesOf(props.stage.map_rules));
const isBracket = computed(() => props.stage.format === 'single_elimination');
const rounds = computed(() => props.stage.rounds || []);
const hidden = (row) => isHidden(props.spoiler, props.eventId, row);
const columns = computed(() => bracketColumns(rounds.value, series.value, hidden));
const groups = computed(() => roundGroups(rounds.value, series.value));
const rankingRules = computed(() => (props.stage.ranking_rule || '').split(',').map((rule) => rule.trim().replace(/_/g, ' ')).filter(Boolean));

const player = (row, side) => (side ? row?.player2 : row?.player1) || { name: '—' };
const race = (row, side) => (side ? row?.player2_race : row?.player1_race);
const winner = (row) => {
  if (!row || hidden(row) || seriesState(row) !== 'complete') return null;
  return row.player1_score > row.player2_score ? 0 : row.player2_score > row.player1_score ? 1 : null;
};
const scoreText = (row, side) => {
  if (!row || hidden(row) || seriesState(row) !== 'complete') return '';
  return side ? row.player2_score : row.player1_score;
};
// A bracket box is a button for a reader who tabs to it, so it says which pairing it opens
const boxLabel = (box) => (box.series
  ? `${player(box.series, 0).name} v ${player(box.series, 1).name}`
  : box.feeders.join(' v '));
const openSeries = (row) => row && router.push(`/events/${props.eventId}/series/${row.id}`);

onMounted(async () => {
  try {
    series.value = (await store.fetchStageSeries(props.eventId, props.stage.id)) || [];
    // only a ranked format has standings; a bracket says everything in its tree
    if (!isBracket.value) standings.value = (await store.fetchStageStandings(props.eventId, props.stage.id)) || [];
  } catch (e) {
    error.value = `Failed to load the stage: ${e.message}`;
  } finally {
    loading.value = false;
  }
});
</script>

<style scoped>
/* The tree scrolls sideways on a phone rather than squeezing every round into the width */
.bracket {
  display: flex;
  gap: 16px;
  overflow-x: auto;
  padding-bottom: 8px;
}
.bracket-column {
  display: flex;
  flex-direction: column;
  justify-content: space-around;
  gap: 12px;
  min-width: 220px;
}
.box {
  border: thin solid rgba(var(--v-border-color), var(--v-border-opacity));
  border-radius: 4px;
  padding: 6px 8px;
}
.box.clickable {
  cursor: pointer;
}
.box:focus-visible,
.series-row:focus-visible {
  outline: 2px solid rgb(var(--v-theme-primary));
  outline-offset: 2px;
}
.side {
  display: flex;
  align-items: center;
  gap: 8px;
}
.side.won {
  font-weight: 700;
}
.score {
  margin-left: auto;
  font-variant-numeric: tabular-nums;
  white-space: nowrap;
}
.box-foot {
  display: flex;
  align-items: center;
  min-height: 28px;
}
.series-row {
  display: flex;
  align-items: center;
  padding: 8px 0;
  border-bottom: thin solid rgba(var(--v-border-color), var(--v-border-opacity));
  cursor: pointer;
}
</style>
