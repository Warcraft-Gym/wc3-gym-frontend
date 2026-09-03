<!-- The two players of a series side by side: MMR, ladder record, the record against the other's race, the GNL record, the games per day -->
<template>
  <div class="compare">
    <div class="text-right"><PlayerName :player="a" :race="a.signup_race" class="font-weight-medium" /></div>
    <div class="label">vs</div>
    <div><PlayerName :player="b" :race="b.signup_race" class="font-weight-medium" /></div>

    <div class="text-right">{{ la?.mmr?.current ?? '—' }}</div>
    <div class="label">MMR</div>
    <div>{{ lb?.mmr?.current ?? '—' }}</div>

    <div class="text-right">{{ record(la) }}</div>
    <div class="label">record</div>
    <div>{{ record(lb) }}</div>

    <div class="text-right d-inline-flex justify-end align-center ga-1">{{ vs(la, b.signup_race) }} <RaceIcon v-if="b.signup_race" :raceIdentifier="b.signup_race" size="1.1em" /></div>
    <div class="label">vs race</div>
    <div class="d-inline-flex align-center ga-1"><RaceIcon v-if="a.signup_race" :raceIdentifier="a.signup_race" size="1.1em" /> {{ vs(lb, a.signup_race) }}</div>

    <div class="text-right">{{ gnl(ga) }}</div>
    <div class="label">GNL</div>
    <div>{{ gnl(gb) }}</div>

    <div class="d-flex justify-end"><LadderDayBars v-if="daysA" :days="daysA" :ymax="ymax" /><span v-else class="text-disabled">—</span></div>
    <div class="label">ladder</div>
    <div><LadderDayBars v-if="daysB" :days="daysB" :ymax="ymax" /><span v-else class="text-disabled">—</span></div>
  </div>
</template>

<script setup>
import LadderDayBars from '@/components/LadderDayBars.vue';
import { winRate } from '@/helpers/ladder-days.mjs';

defineProps({
  a: { type: Object, required: true }, // series.player1
  b: { type: Object, required: true }, // series.player2
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
.label { text-align: center; font-size: 0.75rem; color: rgba(0, 0, 0, 0.38); }
</style>
