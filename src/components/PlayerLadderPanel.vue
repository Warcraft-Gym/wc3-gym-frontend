<!-- The open row under a draft pick: his record against each race, then his games and MMR per day -->
<template>
  <div class="d-flex ga-7 align-start">
    <div class="d-flex flex-column ga-2 flex-shrink-0 panel-left">
      <span class="cap">Against each race</span>
      <div v-if="raceRows.length" class="d-flex flex-column">
        <div v-for="r in raceRows" :key="r.race" class="d-flex align-center ga-2 race-row">
          <RaceIcon :raceIdentifier="r.race" />
          <div class="d-flex ga-0 bar">
            <div v-if="r.wPx" :style="{ width: `${r.wPx}px`, background: WIN }" class="seg" />
            <div v-if="r.lPx" :style="{ width: `${r.lPx}px`, background: LOSS, marginLeft: r.wPx ? '2px' : 0 }" class="seg" />
          </div>
          <span class="record">{{ r.w }}–{{ r.l }}</span>
        </div>
      </div>
      <span v-else class="text-disabled">—</span>
      <span class="text-medium-emphasis text-body-2 mt-1">{{ player.games }} games<template v-if="last"> · last {{ last }}</template></span>
      <div class="d-flex ga-4 text-body-2">
        <router-link :to="ladderTo">Ladder</router-link>
        <a v-if="player.battleTag" :href="w3cPlayerUrl(player.battleTag)" target="_blank" rel="noopener" class="d-inline-flex align-center ga-1">W3Champions <v-icon size="14">mdi-open-in-new</v-icon></a>
      </div>
    </div>
    <div ref="plotBox" class="flex-grow-1 d-flex flex-column plot-box">
      <div class="d-flex justify-end ga-4 text-caption text-medium-emphasis">
        <span class="d-inline-flex align-center ga-1"><span class="swatch" :style="{ background: WIN }" />wins</span>
        <span class="d-inline-flex align-center ga-1"><span class="swatch" :style="{ background: LOSS }" />losses</span>
      </div>
      <LadderPlots v-if="plotWidth" :days="days" :ymax="ymax" :width="plotWidth" />
    </div>
  </div>
</template>

<script setup>
import { computed, onBeforeUnmount, onMounted, ref } from 'vue';
import { timeFormat } from 'd3-time-format';
import LadderPlots from '@/components/LadderPlots.vue';
import { LOSS, RACES, WIN, lastPlayed } from '@/helpers/ladder-days.mjs';
import { w3cPlayerUrl } from '@/helpers/w3c-stats';

const props = defineProps({
  player: { type: Object, required: true }, // a SeasonPlayer of the ladder players answer
  days: { type: Array, required: true }, // from fillDays
  ymax: { type: Number, required: true },
  ladderTo: { type: Object, required: true }, // the router target of the season's ladder page
});

// The plots fill whatever width the row leaves beside the race panel
const plotBox = ref(null);
const plotWidth = ref(0);
const observer = new ResizeObserver(([entry]) => { plotWidth.value = Math.floor(entry.contentRect.width); });
onMounted(() => observer.observe(plotBox.value));
onBeforeUnmount(() => observer.disconnect());

const BAR = 150;
const raceRows = computed(() => {
  const vs = props.player.vs_race || {};
  const played = RACES.filter((race) => vs[race] && vs[race][0] + vs[race][1] > 0);
  const max = Math.max(1, ...played.map((race) => vs[race][0] + vs[race][1]));
  return played.map((race) => {
    const [w, l] = vs[race];
    return { race, w, l, wPx: Math.round((BAR * w) / max), lPx: Math.round((BAR * l) / max) };
  });
});
const fmt = timeFormat('%-d %b');
const last = computed(() => {
  const d = lastPlayed(props.player.per_day);
  return d ? fmt(new Date(`${d}T00:00:00`)) : null;
});
</script>

<style scoped>
.panel-left { width: 250px; }
.plot-box { min-width: 0; }
.cap { font-size: 11px; line-height: 14px; font-weight: 500; color: rgba(0, 0, 0, 0.6); }
.race-row { height: 22px; }
.bar { width: 150px; }
.seg { height: 10px; }
.record { font-size: 0.8125rem; font-variant-numeric: tabular-nums; min-width: 30px; }
.swatch { width: 10px; height: 10px; display: inline-block; }
</style>
