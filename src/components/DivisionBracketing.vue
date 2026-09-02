<!-- The MMR beeswarm: one dot per player, stacked into a column where players share an MMR,
     one draggable cut per band boundary, a stepper row below.
     Bands ascend (index 0 = lowest MMR); `cuts` is a v-model of ascending boundaries.
     d3-scale maps MMR to pixels, d3-axis draws the ticks and d3-drag runs the cut gesture. -->
<template>
  <div>
    <svg ref="svg" :width="width" :height="height" class="division-strip">
      <text
        v-for="(name, i) in cuts.length ? names : []"
        v-show="x(edges[i + 1]) - x(edges[i]) > 90"
        :key="name"
        :x="(x(edges[i]) + x(edges[i + 1])) / 2"
        y="14"
        text-anchor="middle"
        class="band-name"
        :fill="colors[i]"
      >{{ name }} · {{ counts[i] }}</text>
      <g ref="axisEl" class="axis" :transform="`translate(0,${axisY})`" />
      <circle
        v-for="p in dots"
        :key="p.id"
        :cx="x(p.mmr)"
        :cy="p.cy"
        :r="R"
        :fill="colors[p.band]"
        :class="{ pinned: p.pinned }"
      >
        <title>{{ p.label }} · {{ p.mmr }}</title>
      </circle>
      <g v-for="(c, i) in cuts" :key="i" class="cut">
        <rect :x="x(c) - 24" y="24" width="48" height="16" rx="3" class="cut-box" />
        <text :x="x(c)" y="36" text-anchor="middle" class="cut-label">{{ c }}</text>
        <line :x1="x(c)" :x2="x(c)" y1="40" :y2="axisY + 10" class="cut-line" />
      </g>
    </svg>
    <div class="d-flex flex-wrap ga-4 mt-1">
      <div v-for="(c, i) in cuts" :key="i" class="d-flex align-center ga-1">
        <span class="text-caption text-medium-emphasis">{{ names[i] }} to {{ names[i + 1] }}</span>
        <v-btn icon="mdi-minus" size="x-small" variant="text" @click="set(i, c - 10)" />
        <input
          type="number"
          :value="c"
          :aria-label="`${names[i]} to ${names[i + 1]} cut`"
          class="cut-input"
          @change="set(i, Number($event.target.value))"
        >
        <v-btn icon="mdi-plus" size="x-small" variant="text" @click="set(i, c + 10)" />
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed, onBeforeUnmount, onMounted, ref, watchEffect } from 'vue';
import { axisBottom } from 'd3-axis';
import { drag } from 'd3-drag';
import { scaleLinear } from 'd3-scale';
import { pointer, select } from 'd3-selection';
import { dodge, moveCut } from '@/helpers/divisions.mjs';

const props = defineProps({
  players: { type: Array, required: true }, // [{ id, label, mmr, band, pinned }]
  cuts: { type: Array, required: true }, // ascending, one per boundary
  names: { type: Array, required: true }, // one per band, ascending
  colors: { type: Array, required: true }, // one per band, ascending
  domain: { type: Array, required: true }, // [low, high] MMR
});
const emit = defineEmits(['update:cuts']);

const PAD = 24; // keeps the first and last axis label inside the svg
const R = 4;
const TOP = 48; // room above the swarm for the band names and the cut boxes
const GRAB = 12; // how near the pointer must be to a cut line to drag it
const svg = ref(null);
const axisEl = ref(null);

// The chart is drawn at its real pixel size, so nothing is stretched on a wider monitor:
// a wider card spreads the MMR axis and the columns get shorter.
const width = ref(1000);
let observer = null;
onMounted(() => {
  observer = new ResizeObserver(([entry]) => { width.value = Math.max(320, Math.round(entry.contentRect.width)); });
  observer.observe(svg.value.parentNode);
  select(svg.value).call(cutDrag);
});
onBeforeUnmount(() => observer?.disconnect());

const scale = computed(() => scaleLinear().domain(props.domain).range([PAD, width.value - PAD]));
const x = (mmr) => scale.value(mmr);
const edges = computed(() => [props.domain[0], ...props.cuts, props.domain[1]]);
const counts = computed(() => props.names.map((_, i) => props.players.filter((p) => p.band === i).length));

// Dots stack up from the axis, so a tall column is a crowded MMR and the swarm sets the height.
const swarm = computed(() => {
  const withMmr = props.players.filter((p) => p.mmr > 0);
  const rows = dodge(withMmr.map((p) => x(p.mmr)), 2 * R);
  return { withMmr, rows, tall: rows.length ? Math.max(...rows) + 1 : 1 };
});
const axisY = computed(() => TOP + swarm.value.tall * 2 * R);
const height = computed(() => axisY.value + 30);
const dots = computed(() =>
  swarm.value.withMmr.map((p, i) => ({ ...p, cy: axisY.value - 4 - R - swarm.value.rows[i] * 2 * R })),
);

// One tick per ~90px, so the labels never collide however wide the card is.
watchEffect(() => {
  // MMR is written without a thousands separator here, as it is on the cut labels
  if (axisEl.value) select(axisEl.value).call(axisBottom(scale.value).ticks(Math.max(2, Math.round(width.value / 90))).tickFormat(String));
});

const set = (i, value) => emit('update:cuts', moveCut(props.cuts, i, value, props.domain));

// One gesture for the whole strip: the subject is the cut nearest the pointer, so this keeps
// working when the number of cuts changes and there is no per-line hit target to maintain.
const cutDrag = drag()
  .subject((event) => {
    const [px] = pointer(event, svg.value);
    let nearest = null;
    let best = GRAB;
    props.cuts.forEach((c, i) => {
      const distance = Math.abs(x(c) - px);
      if (distance < best) { best = distance; nearest = i; }
    });
    return nearest === null ? null : { i: nearest, x: x(props.cuts[nearest]) };
  })
  .on('drag', (event) => set(event.subject.i, scale.value.invert(event.x)));
</script>

<style scoped>
.division-strip {
  max-width: 100%;
  user-select: none;
  touch-action: none;
  cursor: default;
}
.band-name { font-size: 13px; font-weight: 500; }
.axis :deep(path),
.axis :deep(line) { stroke: rgba(var(--v-theme-on-surface), 0.3); }
.axis :deep(text) { font-size: 10px; fill: rgba(var(--v-theme-on-surface), 0.6); }
circle { stroke: rgb(var(--v-theme-surface)); stroke-width: 1.5; }
circle.pinned { stroke: rgb(var(--v-theme-on-surface)); }
.cut { cursor: ew-resize; }
.cut-box { fill: rgb(var(--v-theme-surface)); stroke: rgba(var(--v-theme-on-surface), 0.4); }
.cut-label { font-size: 11px; fill: rgb(var(--v-theme-on-surface)); }
.cut-line { stroke: rgb(var(--v-theme-on-surface)); stroke-width: 2; }
.cut-input {
  width: 64px;
  text-align: center;
  border: 1px solid rgba(var(--v-theme-on-surface), 0.3);
  border-radius: 4px;
  padding: 2px 4px;
  color: inherit;
  background: transparent;
}
</style>
