<!-- The ordered series one fixture holds, the first played first: what each one plays, who
     each side fields, and how it ended. The fixture page and the series page both draw it,
     so a reader sees the whole fixture from either. -->
<template>
  <v-card elevation="2">
    <v-card-title class="d-flex align-center ga-3">
      <span>Series</span>
      <v-spacer />
      <span class="score text-body-1">{{ score[0] }} – {{ score[1] }}</span>
    </v-card-title>
    <div class="pa-3 d-flex flex-column ga-3">
      <div v-for="row in rows" :key="row.id" class="entry" :class="{ here: row.id === currentId }">
        <div class="head">
          <span class="text-body-2 font-weight-bold">Series {{ row.number }}</span>
          <v-chip size="x-small" variant="tonal">{{ row.mode }}</v-chip>
          <v-chip size="x-small" variant="outlined">{{ row.pick }}</v-chip>
          <v-spacer />
          <v-btn v-if="row.id !== currentId" variant="text" size="x-small" color="primary"
            :to="`/series/${row.id}`">Open series</v-btn>
        </div>
        <SeriesBox flat readonly :series="row.series" :rosters="rosters" />
      </div>
      <p v-if="!rows.length" class="text-medium-emphasis mb-0">This fixture holds no series yet.</p>
      <!-- The marks beside the two sides are the only colour here, so they read a legend -->
      <div v-if="rows.length" class="legend text-caption text-medium-emphasis">
        <span><i class="key win" />Won</span>
        <span><i class="key loss" />Lost</span>
        <span><i class="key draw" />No result</span>
      </div>
    </div>
  </v-card>
</template>

<script setup>
import { computed } from 'vue';

import SeriesBox from '@/components/SeriesBox.vue';
import { fixtureRows, fixtureScore } from '@/helpers/fixture.mjs';

const props = defineProps({
  series: { type: Array, default: () => [] },
  rosters: { type: Object, default: () => ({}) },  // the team roster of each entrant, by entrant id
  currentId: { type: Number, default: null },      // the series the page is already showing
});

const rows = computed(() => fixtureRows(props.series));
const score = computed(() => fixtureScore(props.series));
</script>

<style scoped>
/* One series a block: its line of settings over the box that names the two sides */
.entry {
  border: 1px solid rgba(var(--v-border-color), var(--v-border-opacity));
  border-radius: 4px;
  overflow: hidden;
}
.entry.here { border-color: rgb(var(--v-theme-primary)); }
.head {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 4px 8px;
  background: rgb(var(--v-theme-surface-light));
}
.score { font-variant-numeric: tabular-nums; font-weight: 700; }

.legend { display: flex; gap: 16px; }
.legend span { display: inline-flex; align-items: center; gap: 6px; }
.key { width: 3px; height: 14px; border-radius: 2px; }
.key.win { background: rgb(var(--v-theme-win)); }
.key.loss { background: rgb(var(--v-theme-loss)); }
.key.draw { background: rgb(var(--v-theme-draw)); }
</style>
