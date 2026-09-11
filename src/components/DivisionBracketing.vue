<!-- The MMR beeswarm: one dot per player, stacked into a column where players share an MMR,
     one cut per band boundary that drags or takes a typed MMR.
     Bands ascend (index 0 = lowest MMR); `cuts` is a v-model of ascending boundaries.
     A cut sitting off its stored value shows the ground it took, tinted with the band that grew.
     On a phone the chart is read-only and the row under it edits the cuts, because five cuts
     land closer together than a fingertip and a sideways swipe there already means other things.
     d3-scale maps MMR to pixels, d3-axis draws the ticks and d3-drag runs the cut gesture. -->
<template>
  <div>
    <svg ref="svg" :width="width" :height="height" class="division-strip" :class="{ 'read-only': compact }">
      <text
        v-for="(name, i) in cuts.length ? names : []"
        v-show="x(edges[i + 1]) - x(edges[i]) > 90"
        :key="name"
        :x="(x(edges[i]) + x(edges[i + 1])) / 2"
        y="16"
        text-anchor="middle"
        class="band-name"
      ><tspan :style="fill(colors[i])">●</tspan> {{ name }} · {{ counts[i] }}</text>
      <g v-for="(g, i) in ghosts" :key="`ghost-${i}`">
        <rect :x="g.left" :y="top - 2" :width="g.width" :height="axisY - top + 2" :style="fill(g.color)" fill-opacity="0.3" />
        <line :x1="g.at" :x2="g.at" :y1="top - 2" :y2="axisY" class="ghost-line" />
      </g>
      <g ref="axisEl" class="axis" :transform="`translate(0,${axisY})`" />
      <circle
        v-for="p in dots"
        :key="p.id"
        :cx="x(p.mmr)"
        :cy="p.cy"
        :r="R"
        :style="fill(colors[p.band])"
        :class="{ pinned: p.pinned }"
      >
        <title>{{ p.label }} · {{ p.mmr }}</title>
      </circle>
      <!-- The tinted span names the band that grew and shows by how much, so the label is the old MMR alone -->
      <text
        v-for="(g, i) in ghosts"
        :key="`was-${i}`"
        :x="g.at"
        :y="top - 7"
        text-anchor="middle"
        class="ghost-text"
      >was {{ g.was }}</text>
      <g v-for="(c, i) in cuts" :key="i" class="cut">
        <rect v-if="!compact" :x="x(c) - GRAB" :y="boxY(i) + 24" :width="2 * GRAB" :height="axisY + 12 - boxY(i) - 24" class="grab" />
        <line :x1="x(c)" :x2="x(c)" :y1="boxY(i) + 25" :y2="axisY + 12" class="cut-line" />
        <text v-if="compact" :x="x(c)" :y="boxY(i) + 19" text-anchor="middle" class="cut-value">{{ c }}</text>
        <foreignObject v-else :x="x(c) - BOX / 2" :y="boxY(i)" :width="BOX" height="28">
          <input
            type="number"
            :value="c"
            :data-cut="i"
            :aria-label="`${names[i]} to ${names[i + 1]} cut`"
            class="cut-handle"
            :disabled="disabled"
            @change="commit(i, $event.target)"
          >
        </foreignObject>
        <!-- The handle says there is a target here: taller than wide, marks across the travel, like a slider thumb -->
        <g v-if="!compact" class="grip" :transform="`translate(${x(c)},${boxY(i) + 36})`">
          <rect x="-5.5" y="-10" width="11" height="20" rx="5.5" />
          <line v-for="dx in [-2, 2]" :key="dx" :x1="dx" :x2="dx" y1="-4" y2="4" class="grip-mark" />
        </g>
      </g>
    </svg>
    <div v-if="compact" class="cut-rows">
      <div v-for="(c, i) in cuts" :key="i" class="cut-row">
        <span class="text-medium-emphasis">{{ names[i] }} to {{ names[i + 1] }}</span>
        <v-btn icon="mdi-minus" size="small" variant="outlined" :disabled="disabled" :aria-label="`Lower the ${names[i]} cut by 10`" @click="set(i, c - 10)" />
        <input
          type="number"
          :value="c"
          :aria-label="`${names[i]} to ${names[i + 1]} cut`"
          class="cut-field"
          :disabled="disabled"
          @change="commit(i, $event.target)"
        >
        <v-btn icon="mdi-plus" size="small" variant="outlined" :disabled="disabled" :aria-label="`Raise the ${names[i]} cut by 10`" @click="set(i, c + 10)" />
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watchEffect } from 'vue';
import { useDisplay } from 'vuetify';
import { axisBottom } from 'd3-axis';
import { drag } from 'd3-drag';
import { scaleLinear } from 'd3-scale';
import { select } from 'd3-selection';
import { dodge, moveCut } from '@/helpers/divisions.mjs';

const props = defineProps({
  players: { type: Array, required: true }, // [{ id, label, mmr, band, pinned }]
  cuts: { type: Array, required: true }, // ascending, one per boundary
  names: { type: Array, required: true }, // one per band, ascending
  colors: { type: Array, required: true }, // theme colour names, one per band, ascending
  domain: { type: Array, required: true }, // [low, high] MMR
  stored: { type: Array, default: () => [] }, // the cuts the last Apply wrote, to show what moved
  disabled: { type: Boolean, default: false }, // the cuts are shown but cannot move
});
const emit = defineEmits(['update:cuts']);
const fill = (name) => ({ fill: `rgb(var(--v-theme-${name}))` }); // svg fill takes no theme class

const PAD = 28; // keeps the first and last axis label inside the svg
const R = 4.4;
const BOX = 64; // the width of a cut's input box
const GRAB = 16; // how near the pointer must be to a cut to drag it
const svg = ref(null);
const axisEl = ref(null);
const { xs } = useDisplay();
const compact = computed(() => xs.value);

// The chart is drawn at its real pixel size, so nothing is stretched on a wider monitor:
// a wider card spreads the MMR axis and the columns get shorter.
const width = ref(1000);
let observer = null;
onMounted(() => {
  observer = new ResizeObserver(([entry]) => { width.value = Math.max(280, Math.round(entry.contentRect.width)); });
  observer.observe(svg.value.parentNode);
  select(svg.value).call(cutDrag);
  svg.value.addEventListener('pointerdown', startScrub);
  window.addEventListener('pointermove', moveScrub);
  window.addEventListener('pointerup', endScrub);
  window.addEventListener('pointercancel', endScrub);
});
onBeforeUnmount(() => {
  observer?.disconnect();
  window.removeEventListener('pointermove', moveScrub);
  window.removeEventListener('pointerup', endScrub);
  window.removeEventListener('pointercancel', endScrub);
});

const scale = computed(() => scaleLinear().domain(props.domain).range([PAD, width.value - PAD]));
const x = (mmr) => scale.value(mmr);
const edges = computed(() => [props.domain[0], ...props.cuts, props.domain[1]]);
// Neighbouring labels closer than a label width take turns on a second row, so each stays readable
const slot = computed(() => (compact.value ? 40 : BOX));
const boxRows = computed(() =>
  props.cuts.reduce((rows, c, i) => [...rows, i > 0 && x(c) - x(props.cuts[i - 1]) < slot.value + 4 ? 1 - rows[i - 1] : 0], []),
);
const boxY = (i) => 26 + boxRows.value[i] * 26;
// A cut off its stored value: the ground it took, and the band that took it. Bands ascend,
// so a cut moving down the scale feeds the band above it.
const ghosts = computed(() => {
  if (props.stored.length !== props.cuts.length) return []; // a different tier count moved every cut
  return props.cuts.flatMap((c, i) => {
    if (c === props.stored[i]) return [];
    const grew = c < props.stored[i] ? i + 1 : i;
    return [{
      was: props.stored[i],
      at: x(props.stored[i]),
      left: Math.min(x(c), x(props.stored[i])),
      width: Math.abs(x(c) - x(props.stored[i])),
      color: props.colors[grew],
    }];
  });
});
// Room above the swarm for the band names, the cut boxes and a row for the ghost labels
const top = computed(() => 60 + (boxRows.value.includes(1) ? 26 : 0) + (ghosts.value.length ? 17 : 0));
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
  .container(() => svg.value)  // event.x is then an svg coordinate for mouse and touch alike
  // A press inside a cut's box scrubs or edits it, so it never starts this drag
  .filter((event) => !props.disabled && !compact.value && !event.ctrlKey && !event.button && event.target.tagName !== 'INPUT')
  .subject((event) => {
    const px = event.x;
    let nearest = null;
    let best = event.sourceEvent.type.startsWith('touch') ? 2 * GRAB : GRAB;
    props.cuts.forEach((c, i) => {
      const distance = Math.abs(x(c) - px);
      if (distance < best) { best = distance; nearest = i; }
    });
    return nearest === null ? null : { i: nearest, x: x(props.cuts[nearest]) };
  })
  .on('drag', (event) => set(event.subject.i, scale.value.invert(event.x)));

// Press a cut's box and move, and the box drags the cut. Press and let go without moving,
// and the caret lands so it can be typed into.
let scrubbing = null;
let scrubFrom = 0;
let scrubStart = 0;
let scrubMoved = false;
const startScrub = (event) => {
  const input = event.target.closest?.('input.cut-handle');
  if (!input || props.disabled) return;
  scrubbing = Number(input.dataset.cut);
  scrubFrom = event.clientX;
  scrubStart = props.cuts[scrubbing];
  scrubMoved = false;
};
const moveScrub = (event) => {
  if (scrubbing === null) return;
  const dx = event.clientX - scrubFrom;
  if (!scrubMoved && Math.abs(dx) < 4) return;
  if (!scrubMoved) { scrubMoved = true; document.activeElement?.blur?.(); }
  set(scrubbing, scale.value.invert(x(scrubStart) + dx));
};
const endScrub = () => { scrubbing = null; };
</script>

<style scoped>
.division-strip {
  max-width: 100%;
  user-select: none;
  touch-action: pan-y;
  cursor: default;
}
/* The phone chart claims no sideways gesture, so nothing competes with the page */
.division-strip.read-only { touch-action: auto; }
.band-name { font-size: 18px; font-weight: 500; fill: rgb(var(--v-theme-on-surface)); }
.axis :deep(path),
.axis :deep(line) { stroke: rgba(var(--v-theme-on-surface), 0.3); }
.axis :deep(text) { font-size: 13px; fill: rgba(var(--v-theme-on-surface), 0.6); }
circle { stroke: rgb(var(--v-theme-surface)); stroke-width: 1.5; }
circle.pinned { stroke: rgb(var(--v-theme-on-surface)); }
.cut { cursor: ew-resize; }
.cut-line { stroke: rgb(var(--v-theme-on-surface)); stroke-width: 2; }
.cut-value { font-size: 15px; font-weight: 600; fill: rgb(var(--v-theme-on-surface)); }
.ghost-line { stroke: rgba(var(--v-theme-on-surface), 0.5); stroke-width: 1.5; stroke-dasharray: 3 4; }
.ghost-text { font-size: 12px; font-weight: 500; fill: rgba(var(--v-theme-on-surface), 0.7); }
.grab { fill: transparent; cursor: ew-resize; }
.grab:hover ~ .cut-line { stroke-width: 4; }
.grip { fill: rgb(var(--v-theme-on-surface)); }
.grip-mark { stroke: rgb(var(--v-theme-surface)); stroke-width: 1.4; stroke-linecap: round; }
.cut-handle {
  box-sizing: border-box;
  width: 100%;
  height: 26px;
  font-size: 14px;
  text-align: center;
  border: 1px solid rgb(var(--v-theme-on-surface));
  border-radius: 4px;
  padding: 2px 4px;
  color: inherit;
  background: rgb(var(--v-theme-surface));
  cursor: ew-resize;
  touch-action: none;
}
.cut-rows { display: flex; flex-direction: column; gap: 8px; margin-top: 12px; }
.cut-row { display: flex; align-items: center; gap: 8px; }
.cut-row span { flex: 1; min-width: 0; }
.cut-field {
  width: 84px;
  height: 40px;
  font-size: 15px;
  text-align: center;
  border: 1px solid rgba(var(--v-theme-on-surface), 0.3);
  border-radius: 4px;
  color: inherit;
  background: rgb(var(--v-theme-surface));
}
/* The spinner offers to step by one, and nobody moves an MMR cut by one */
input[type='number'] { appearance: textfield; -moz-appearance: textfield; }
input[type='number']::-webkit-outer-spin-button,
input[type='number']::-webkit-inner-spin-button { -webkit-appearance: none; margin: 0; }
</style>
