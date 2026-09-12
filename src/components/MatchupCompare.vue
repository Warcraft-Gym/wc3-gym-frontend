<!-- The two players of a series side by side: MMR, ladder record, the record against the other's race, the GNL record, the games per day -->
<template>
  <div class="compare">
    <div class="text-right"><PlayerName :player="a" :race="raceA" class="font-weight-medium" /></div>
    <div class="label">vs</div>
    <div><PlayerName :player="b" :race="raceB" class="font-weight-medium" /></div>

    <div class="text-right">{{ la?.mmr?.current ?? '—' }}</div>
    <div class="label">MMR</div>
    <div>{{ lb?.mmr?.current ?? '—' }}</div>

    <div class="text-right">{{ record(la) }}</div>
    <div class="label">record</div>
    <div>{{ record(lb) }}</div>

    <div class="text-right d-inline-flex justify-end align-center ga-1">{{ vs(la, raceB) }} <RaceIcon v-if="raceB" :raceIdentifier="raceB" size="1.1em" /></div>
    <div class="label">vs race</div>
    <div class="d-inline-flex align-center ga-1"><RaceIcon v-if="raceA" :raceIdentifier="raceA" size="1.1em" /> {{ vs(lb, raceA) }}</div>

    <div class="text-right">{{ gnl(ga) }}</div>
    <div class="label">GNL</div>
    <div>{{ gnl(gb) }}</div>

    <div class="d-flex justify-end"><LadderDayBars v-if="daysA" :days="daysA" :ymax="ymax" /><span v-else class="text-disabled">—</span></div>
    <div class="label">ladder</div>
    <div><LadderDayBars v-if="daysB" :days="daysB" :ymax="ymax" /><span v-else class="text-disabled">—</span></div>

    <div class="foot">
      <span class="d-inline-flex align-center ga-1"><span class="swatch" :style="{ background: WIN }" />wins</span>
      <span class="d-inline-flex align-center ga-1"><span class="swatch" :style="{ background: LOSS }" />losses</span>
      <span>both columns scale to {{ ymax }} games a day</span>
    </div>
  </div>
</template>

<script setup>
import LadderDayBars from '@/components/LadderDayBars.vue';
import { LOSS, WIN, winRate } from '@/helpers/ladder-days.mjs';

defineProps({
  a: { type: Object, required: true }, // series.player1
  b: { type: Object, required: true }, // series.player2
  raceA: String, // the race each side plays in this series
  raceB: String,
  la: Object, // their SeasonPlayer rows, null while unsynced
  lb: Object,
  ga: Object, // their GNL stats of the season
  gb: Object,
  daysA: Array, // from fillDays
  daysB: Array,
  ymax: { type: Number, required: true },
});

const record = (p) => {
  if (!p || !p.games) return '—';
  return `${p.wins}–${p.losses} · ${winRate(p.wins, p.losses)}%`;
};
const vs = (p, race) => {
  const r = p?.vs_race?.[race];
  return r && r[0] + r[1] ? `${r[0]}–${r[1]}` : '—';
};
const gnl = (g) => (g && g.games ? `${g.wins ?? 0}–${g.losses ?? 0}` : '—');
</script>

<style scoped>
.compare {
  display: grid;
  grid-template-columns: 236px 70px 236px;
  row-gap: 4px;
  align-items: center;
  font-size: 0.875rem;
  font-variant-numeric: tabular-nums;
}
.foot {
  grid-column: 1 / -1;
  display: flex;
  flex-wrap: wrap;
  justify-content: center;
  gap: 12px;
  font-size: 0.75rem;
  color: rgba(var(--v-theme-on-surface), var(--v-medium-emphasis-opacity));
}
.swatch { width: 10px; height: 10px; display: inline-block; }
.label { text-align: center; font-size: 0.75rem; color: rgba(var(--v-theme-on-surface), 0.38); }
</style>
