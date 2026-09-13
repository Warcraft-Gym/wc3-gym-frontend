<!-- One stage, drawn once per division. An elimination stage is bracket columns joined
     by their feeder lines, a round robin is its standings and its rounds, a KOTH night
     is the chain from the king down. A phone stacks the columns into one list per round. -->
<template>
  <div class="stage-view">
    <p v-if="!series.length" class="text-medium-emphasis my-4">
      No series yet. Generate the stage to draw it.
    </p>

    <section v-for="group in groups" :key="group.key" class="mb-6" style="order: 1">
      <h2 v-if="groups.length > 1" class="text-h6 mb-2">{{ group.name }}</h2>

      <!-- a bracket on a wide screen: the boxes sit on the feeder lines they follow, and
           the lower ladder of a double elimination is drawn under the upper one -->
      <div v-if="isBracket && !stacked" class="bracket-scroll">
        <div v-for="block in group.blocks" :key="block.key" class="bracket mb-5"
          :style="{ width: `${block.drawn.width}px`, height: `${block.drawn.height + 28}px` }">
          <div v-for="(column, index) in block.columns" :key="column.key" class="column-name text-caption text-medium-emphasis"
            :style="{ left: `${index * 244}px`, width: `${block.drawn.boxW}px` }">
            {{ column.name }}
          </div>
          <svg class="lines" :width="block.drawn.width" :height="block.drawn.height" aria-hidden="true">
            <path v-for="line in block.drawn.lines" :key="line.key" :d="line.d" fill="none" />
          </svg>
          <div v-for="box in block.drawn.boxes" :key="box.key" class="box"
            :style="{ left: `${box.x}px`, top: `${box.cy - block.drawn.boxH / 2 + 28}px`, width: `${block.drawn.boxW}px` }">
            <SeriesBox :series="box.row" :readonly="readonly"
              :label="thirdPlace(block.columns[box.column], box.row)" @open="open" />
          </div>
        </div>
      </div>

      <!-- a phone, a round robin and a KOTH chain all read as one list per round -->
      <template v-else>
        <v-card v-for="column in group.columns" :key="column.key" elevation="1" class="mb-3 round-card">
          <v-card-title class="text-subtitle-1">{{ column.name }}</v-card-title>
          <div class="rows">
            <SeriesBox v-for="(row, index) in column.series" :key="row.id" :series="row" flat
              :crown="isChain" :readonly="readonly" :label="thirdPlace(column, row)"
              class="list-row" :class="{ first: index === 0 }" @open="open" />
          </div>
        </v-card>
      </template>
    </section>

    <div v-if="series.length" class="legend text-caption text-medium-emphasis mb-4" style="order: 1">
      <span><i class="key win" />Won</span>
      <span><i class="key loss" />Lost</span>
      <span><i class="key draw" />No result</span>
    </div>

    <!-- A table stage is read from its standings down; a bracket is read first and ranked after -->
    <v-card v-if="tables.length" elevation="2" :style="{ order: isBracket ? 2 : 0 }">
      <v-card-title>Standings</v-card-title>
      <GroupedTable :columns="STANDING_COLUMNS" :groups="tables" default-open empty="No standings yet">
        <template #group="{ group }">
          <td colspan="7">{{ group.label }}</td>
        </template>
        <template #rows="{ group }">
          <tr v-for="row in group.rows" :key="row.entrant_id" class="detail-row">
            <td />
            <td class="text-right">{{ row.position }}</td>
            <td>
              <PlayerName v-if="row.user_id" :player="{ id: row.user_id, name: row.name }" />
              <span v-else>{{ row.name }}</span>
            </td>
            <td class="text-right d-none d-md-table-cell">{{ row.played }}</td>
            <td class="text-right">{{ row.won }}</td>
            <td class="text-right d-none d-md-table-cell">{{ row.lost }}</td>
            <td class="text-right">{{ signed(row.game_diff) }}</td>
            <td class="text-right">{{ row.points }}</td>
          </tr>
        </template>
      </GroupedTable>
    </v-card>
  </div>
</template>

<script setup>
import { computed } from 'vue';
import { useDisplay } from 'vuetify';

import GroupedTable from '@/components/GroupedTable.vue';
import PlayerName from '@/components/PlayerName.vue';
import SeriesBox from '@/components/SeriesBox.vue';
import { blocks, chainOrder, columns, inDivision, layout, standingsGroups } from '@/helpers/stage-view.mjs';

const props = defineProps({
  stage: { type: Object, required: true },
  series: { type: Array, default: () => [] },
  rounds: { type: Array, default: () => [] },
  divisions: { type: Array, default: () => [] },
  standings: { type: Array, default: () => [] },
  readonly: Boolean,  // the public page draws the same stage with nothing to click
});
const emit = defineEmits(['open-series']);

const STANDING_COLUMNS = [
  { key: 'position', title: 'Rank', align: 'right', width: '64px' },
  { key: 'name', title: 'Name' },
  { key: 'played', title: 'Played', align: 'right', phone: false },
  { key: 'won', title: 'Won', align: 'right' },
  { key: 'lost', title: 'Lost', align: 'right', phone: false },
  { key: 'game_diff', title: 'Game diff', align: 'right' },
  { key: 'points', title: 'Points', align: 'right' },
];

const { smAndDown } = useDisplay();
const stacked = computed(() => smAndDown.value);
const isBracket = computed(() => ['single_elimination', 'double_elimination'].includes(props.stage.format));
const isChain = computed(() => props.stage.format === 'koth');

// One drawing per division; a stage with no divisions draws its whole field once
const groups = computed(() => {
  const bands = props.divisions.length
    ? [...props.divisions].sort((a, b) => a.position - b.position)
    : [{ id: null, position: 1, name: null }];
  return bands.map((band) => {
    const rows = inDivision(props.series, band.id);
    const cols = isChain.value
      ? [{ key: 'chain', name: 'The chain', series: chainOrder(rows) }]
      : columns(rows, props.rounds);
    return {
      key: band.id ?? 'all',
      name: band.name || `Division ${band.position}`,
      columns: cols.map((column, index) => ({ ...column, index })),
      blocks: isBracket.value
        ? blocks(cols).map((block) => ({ ...block, drawn: layout(block.columns) }))
        : [],
    };
  }).filter((group) => group.columns.length);
});

const tables = computed(() => standingsGroups(props.standings, props.divisions));

// The beaten semi-finalists play last in the final column, so the second box names itself
const thirdPlace = (column, row) => (
  column?.name === 'Final' && column.series.length > 1 && column.series.indexOf(row) > 0
    ? 'Third place' : '');
const signed = (value) => (value > 0 ? `+${value}` : String(value ?? 0));
const open = (row) => emit('open-series', row);
</script>

<style scoped>
.stage-view { display: flex; flex-direction: column; }
.bracket-scroll { overflow-x: auto; }
.bracket { position: relative; }
.column-name { position: absolute; top: 0; }
.lines { position: absolute; left: 0; top: 28px; }
/* The feeder lines are a recessive mark: the boxes carry the reading */
.lines path { stroke: rgba(var(--v-theme-on-surface), 0.28); stroke-width: 2; }
.box { position: absolute; }

/* A round of a list reads as one narrow card, so the score stays beside the names */
.round-card { max-width: 560px; }
.rows > .list-row { border-top: 1px solid rgba(var(--v-border-color), var(--v-border-opacity)); }
.rows > .list-row.first { border-top: none; }

.legend { display: flex; gap: 16px; }
.legend span { display: inline-flex; align-items: center; gap: 6px; }
.key { width: 3px; height: 14px; border-radius: 2px; }
.key.win { background: rgb(var(--v-theme-win)); }
.key.loss { background: rgb(var(--v-theme-loss)); }
.key.draw { background: rgb(var(--v-theme-draw)); }
</style>
