<!-- The MMR beeswarm: one dot per player, stacked into a column where players share an MMR,
     one cut per band boundary that drags or takes a typed MMR.
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
        y="16"
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
        <foreignObject :x="x(c) - BOX / 2" :y="boxY(i)" :width="BOX" height="28">
          <input
            type="number"
            :value="c"
            :aria-label="`${names[i]} to ${names[i + 1]} cut`"
            class="cut-handle"
            :disabled="disabled"
            @change="commit(i, $event.target)"
          >
        </foreignObject>
        <line :x1="x(c)" :x2="x(c)" :y1="boxY(i) + 24" :y2="axisY + 12" class="cut-line" />
      </g>
    </svg>
  </div>
</template>

<script setup>
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watchEffect } from 'vue';
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
  disabled: { type: Boolean, default: false }, // the cuts are shown but cannot move
});
const emit = defineEmits(['update:cuts']);

const PAD = 28; // keeps the first and last axis label inside the svg
const R = 4.4;
const BOX = 64; // the width of a cut's input box
const GRAB = 14; // how near the pointer must be to a cut line to drag it
const svg = ref(null);
const axisEl = ref(null);

// The chart is drawn at its real pixel size, so nothing is stretched on a wider monitor:
// a wider card spreads the MMR axis and the columns get shorter.
const width = ref(1000);
let observer = null;
onMounted(() => {
  observer = new ResizeObserver(([entry]) => { width.value = Math.max(280, Math.round(entry.contentRect.width)); });
  observer.observe(svg.value.parentNode);
  select(svg.value).call(cutDrag);
});
onBeforeUnmount(() => observer?.disconnect());

const scale = computed(() => scaleLinear().domain(props.domain).range([PAD, width.value - PAD]));
const x = (mmr) => scale.value(mmr);
const edges = computed(() => [props.domain[0], ...props.cuts, props.domain[1]]);
// Neighbouring boxes closer than a box width take turns on a second row, so each stays clickable
const boxRows = computed(() =>
  props.cuts.reduce((rows, c, i) => [...rows, i > 0 && x(c) - x(props.cuts[i - 1]) < BOX + 4 ? 1 - rows[i - 1] : 0], []),
);
const boxY = (i) => 26 + boxRows.value[i] * 26;
// Room above the swarm for the band names and the cut boxes
const top = computed(() => 60 + (boxRows.value.includes(1) ? 26 : 0));
const counts = computed(() => props.names.map((_, i) => props.players.filter((p) => p.band === i).length));

// Dots stack up from the axis, so a tall column is a crowded MMR and the swarm sets the height.
const swarm = computed(() => {
  const withMmr = props.players.filter((p) => p.mmr > 0);
  const rows = dodge(withMmr.map((p) => x(p.mmr)), 2 * R);
  return { withMmr, rows, tall: rows.length ? Math.max(...rows) + 1 : 1 };
});
const axisY = computed(() => top.value + swarm.value.tall * 2 * R);
const height = computed(() => axisY.value + 36);
const dots = computed(() =>
  swarm.value.withMmr.map((p, i) => ({ ...p, cy: axisY.value - 4 - R - swarm.value.rows[i] * 2 * R })),
);

// One tick per ~90px, so the labels never collide however wide the card is.
watchEffect(() => {
  // MMR is written without a thousands separator here, as it is on the cut labels
  if (axisEl.value) select(axisEl.value).call(axisBottom(scale.value).ticks(Math.max(2, Math.round(width.value / 90))).tickFormat(String));
});

const set = (i, value) => emit('update:cuts', moveCut(props.cuts, i, value, props.domain));
// A typed value lands clamped, and the box shows the clamped one even when the cut did not move
const commit = async (i, input) => {
  set(i, Number(input.value));
  await nextTick();
  input.value = props.cuts[i];
};

// One gesture for the whole strip: the subject is the cut nearest the pointer, so this keeps
// working when the number of cuts changes and there is no per-line hit target to maintain.
const cutDrag = drag()
  // A press inside a cut's box edits it, so it never starts a drag
  .filter((event) => !props.disabled && !event.ctrlKey && !event.button && event.target.tagName !== 'INPUT')
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
.band-name { font-size: 18px; font-weight: 500; }
.axis :deep(path),
.axis :deep(line) { stroke: rgba(var(--v-theme-on-surface), 0.3); }
.axis :deep(text) { font-size: 13px; fill: rgba(var(--v-theme-on-surface), 0.6); }
circle { stroke: rgb(var(--v-theme-surface)); stroke-width: 1.5; }
circle.pinned { stroke: rgb(var(--v-theme-on-surface)); }
.cut { cursor: ew-resize; }
.cut-line { stroke: rgb(var(--v-theme-on-surface)); stroke-width: 2; }
.cut-handle {
  box-sizing: border-box;
  width: 100%;
  height: 26px;
  font-size: 14px;
  text-align: center;
  border: 1px solid rgba(var(--v-theme-on-surface), 0.3);
  border-radius: 4px;
  padding: 2px 4px;
  color: inherit;
  background: rgb(var(--v-theme-surface));
  cursor: text;
}
</style>
