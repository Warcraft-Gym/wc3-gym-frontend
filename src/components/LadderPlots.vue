<!-- Two plots on one date scale: games per day (wins under losses), then the MMR the player ended each day on -->
<template>
  <svg :width="width" :height="height" class="ladder-plots d-block">
    <g :transform="`translate(${M.left},${M.top})`">
      <text x="0" y="-6" class="cap">Games per day</text>
      <g v-for="t in gTicks" :key="`g${t.v}`">
        <line :x2="innerW" :y1="t.y" :y2="t.y" class="grid" />
        <text x="-8" :y="t.y" dy="0.32em" text-anchor="end" class="tick">{{ t.v }}</text>
      </g>
      <template v-for="(d, i) in days" :key="d.d">
        <rect v-if="d.w" :x="x(i)" :y="yG(d.w)" :width="x.bandwidth()" :height="yG(0) - yG(d.w)" :fill="WIN" />
        <rect v-if="d.l" :x="x(i)" :y="yG(d.w + d.l)" :width="x.bandwidth()" :height="Math.max(1, yG(d.w) - yG(d.w + d.l) - (d.w ? 2 : 0))" :fill="LOSS" />
      </template>
      <line :x2="innerW" :y1="gH" :y2="gH" class="axis" />
    </g>
    <g :transform="`translate(${M.left},${mTop})`">
      <text x="0" y="-6" class="cap">MMR</text>
      <g v-for="t in mTicks" :key="`m${t.v}`">
        <line :x2="innerW" :y1="t.y" :y2="t.y" class="grid" />
        <text x="-8" :y="t.y" dy="0.32em" text-anchor="end" class="tick">{{ t.v }}</text>
      </g>
      <path :d="areaPath" class="area" />
      <path :d="linePath" class="line" />
      <circle v-for="p in points" :key="p.d" :cx="cx(p.i)" :cy="yM(p.mmr)" r="4" class="dot" />
      <text v-if="last" :x="cx(last.i) + 10" :y="yM(last.mmr)" dy="0.32em" class="end">{{ last.mmr }}</text>
      <line :x2="innerW" :y1="mH" :y2="mH" class="axis" />
      <g v-for="t in xTicks" :key="t.i">
        <line :x1="t.x" :x2="t.x" :y1="mH" :y2="mH + 4" class="axis" />
        <text :x="t.x" :y="mH + 16" text-anchor="middle" class="tick">{{ t.label }}</text>
      </g>
    </g>
    <g :transform="`translate(${M.left},${M.top})`">
      <rect v-for="(d, i) in days" :key="`hit${d.d}`" :x="x(i) - x.step() * 0.2" y="0" :width="x.step()" :height="plotsH" fill="transparent">
        <title>{{ tip(d) }}</title>
      </rect>
    </g>
  </svg>
</template>

<script setup>
import { computed } from 'vue';
import { extent, range } from 'd3-array';
import { scaleBand, scaleLinear } from 'd3-scale';
import { area, curveMonotoneX, line } from 'd3-shape';
import { timeFormat } from 'd3-time-format';
import { LOSS, WIN } from '@/helpers/ladder-days.mjs';

const props = defineProps({
  days: { type: Array, required: true }, // from fillDays
  ymax: { type: Number, required: true },
  width: { type: Number, default: 760 },
});

const M = { top: 18, right: 44, bottom: 22, left: 44 };
const gH = 56; // games plot height
const between = 26;
const mH = 72; // MMR plot height
const mTop = M.top + gH + between;
const plotsH = gH + between + mH;
const height = M.top + plotsH + M.bottom;
const innerW = computed(() => props.width - M.left - M.right);

const x = computed(() => scaleBand().domain(range(props.days.length)).range([0, innerW.value]).paddingInner(0.4));
const cx = (i) => x.value(i) + x.value.bandwidth() / 2;
const yG = computed(() => scaleLinear().domain([0, props.ymax]).range([gH, 0]));
const points = computed(() => props.days.map((d, i) => ({ ...d, i })).filter((d) => d.mmr != null));
const yM = computed(() => scaleLinear().domain(points.value.length ? extent(points.value, (d) => d.mmr) : [0, 1]).nice(3).range([mH, 0]));
const last = computed(() => points.value[points.value.length - 1] || null);

const linePath = computed(() => line().x((d) => cx(d.i)).y((d) => yM.value(d.mmr)).curve(curveMonotoneX)(points.value) || '');
const areaPath = computed(() => area().x((d) => cx(d.i)).y0(mH).y1((d) => yM.value(d.mmr)).curve(curveMonotoneX)(points.value) || '');
const gTicks = computed(() => yG.value.ticks(2).map((v) => ({ v, y: yG.value(v) })));
const mTicks = computed(() => yM.value.ticks(3).map((v) => ({ v, y: yM.value(v) })));
const fmt = timeFormat('%-d %b');
const dateOf = (d) => new Date(`${d.d}T00:00:00`);
const xTicks = computed(() => range(0, props.days.length, 7).map((i) => ({ i, x: cx(i), label: fmt(dateOf(props.days[i])) })));
const tip = (d) => `${fmt(dateOf(d))} · ${d.w}–${d.l}${d.mmr != null ? ` · ${d.mmr} MMR` : ''}`;
</script>

<style scoped>
.ladder-plots { font-family: inherit; }
.cap { font-size: 11px; font-weight: 500; fill: rgba(0, 0, 0, 0.6); }
.tick { font-size: 11px; fill: rgba(0, 0, 0, 0.6); }
.end { font-size: 11px; font-weight: 500; fill: rgba(0, 0, 0, 0.87); }
.grid { stroke: rgba(0, 0, 0, 0.08); }
.axis { stroke: rgba(0, 0, 0, 0.2); }
.area { fill: #424242; fill-opacity: 0.1; }
.line { fill: none; stroke: #424242; stroke-width: 2; stroke-linejoin: round; stroke-linecap: round; }
.dot { fill: #424242; stroke: rgb(var(--v-theme-surface)); stroke-width: 2; }
</style>
