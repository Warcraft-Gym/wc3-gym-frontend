<!-- Three ranked lists over the season's players: total, achievement and ladder points -->
<template>
  <v-row dense class="mb-4">
    <v-col v-for="board in boards" :key="board.key" cols="12" md="4">
      <v-card elevation="2" class="h-100">
        <v-card-title class="d-flex align-center text-body-1 pb-1">
          <v-icon size="small" class="mr-2">{{ board.icon }}</v-icon>
          <ColumnNote :title="board.title" :note="board.note" />
        </v-card-title>
        <v-card-text class="pt-0 pb-2">
          <ol class="board">
            <li v-for="(row, i) in board.rows" :key="row.id" class="board-row" @click="$emit('open-player', row)">
              <span class="rank text-medium-emphasis">{{ i + 1 }}</span>
              <span class="who"><PlayerName :player="row" :race="row.race" @click.stop="$emit('open-player', row)" /></span>
              <span class="bar" :title="row.caption">
                <span v-for="seg in row.segments" :key="seg.key" class="seg" :class="seg.key" :style="{ width: `${(100 * seg.value) / board.max}%` }" />
              </span>
              <span class="value font-weight-bold">{{ row.value }}</span>
              <span class="caption text-caption text-medium-emphasis">{{ row.caption }}</span>
            </li>
          </ol>
          <div v-if="board.legend" class="d-flex align-center text-caption text-medium-emphasis mt-2" style="gap: 12px">
            <span class="d-inline-flex align-center"><span class="swatch ladder mr-1" />ladder</span>
            <span class="d-inline-flex align-center"><span class="swatch badge mr-1" />achievements</span>
          </div>
          <div v-if="!board.rows.length" class="text-caption text-medium-emphasis">No games yet</div>
        </v-card-text>
      </v-card>
    </v-col>
  </v-row>
</template>

<script setup>
import { computed } from 'vue';
import ColumnNote from '@/components/ColumnNote.vue';
import PlayerName from '@/components/PlayerName.vue';
import { ACHIEVEMENTS_NOTE, LADDER_NOTE, SCORED_NOTE } from '@/helpers/achievements';

const props = defineProps({
  // The season's players, each with points, ladder_points and achievements
  players: { type: Array, default: () => [] },
  top: { type: Number, default: 8 },
});
defineEmits(['open-player']);

const badgePoints = (p) => p.points - p.ladder_points;
const rank = (value) =>
  props.players.filter(p => p.games > 0 && value(p) > 0).sort((a, b) => value(b) - value(a)).slice(0, props.top);

const boards = computed(() => {
  const grind = rank(p => p.points).map(p => ({
    ...p, value: p.points, caption: `${p.ladder_points} + ${badgePoints(p)}`,
    segments: [{ key: 'ladder', value: p.ladder_points }, { key: 'badge', value: badgePoints(p) }],
  }));
  const badges = rank(badgePoints).map(p => ({
    ...p, value: badgePoints(p), caption: `${p.achievements.length} badges`,
    segments: [{ key: 'badge', value: badgePoints(p) }],
  }));
  const ladder = rank(p => p.ladder_points).map(p => ({
    ...p, value: p.ladder_points, caption: `${p.wins}-${p.losses}`,
    segments: [{ key: 'ladder', value: p.ladder_points }],
  }));
  // One scale per list: its own leader fills the bar
  const max = rows => Math.max(1, ...rows.map(r => r.value));
  return [
    { key: 'grind', title: 'Grind', icon: 'mdi-fire', note: `Ladder points plus achievement points. ${SCORED_NOTE}`, rows: grind, max: max(grind), legend: true },
    { key: 'badges', title: 'Achievements', icon: 'mdi-trophy-variant-outline', note: ACHIEVEMENTS_NOTE, rows: badges, max: max(badges) },
    { key: 'ladder', title: 'Ladder', icon: 'mdi-sword-cross', note: LADDER_NOTE, rows: ladder, max: max(ladder) },
  ];
});
</script>

<style scoped>
.board {
  list-style: none;
  padding: 0;
  margin: 0;
}
/* rank | name | bar | value, with the caption under the bar */
.board-row {
  display: grid;
  grid-template-columns: 1.5em minmax(0, 9.5em) 1fr 3em;
  grid-template-areas: 'rank who bar value' 'rank who caption value';
  column-gap: 8px;
  align-items: center;
  padding: 4px 0;
  cursor: pointer;
  font-variant-numeric: tabular-nums;
}
.board-row:hover { background: rgba(var(--v-theme-on-surface), 0.04); }
.rank { grid-area: rank; text-align: right; }
.who { grid-area: who; overflow: hidden; }
.who :deep(.player-name) { max-width: 100%; overflow: hidden; text-overflow: ellipsis; }
.bar { grid-area: bar; display: flex; gap: 2px; height: 8px; }
.caption { grid-area: caption; line-height: 1; margin-top: 2px; }
.value { grid-area: value; text-align: right; }
/* The data end is rounded, the baseline end square */
.seg { display: block; border-radius: 0 4px 4px 0; min-width: 2px; }
.seg.ladder, .swatch.ladder { background: rgb(var(--v-theme-primary)); }
.seg.badge, .swatch.badge { background: #ff8f00; }
.swatch { display: inline-block; width: 10px; height: 10px; border-radius: 2px; }
</style>
