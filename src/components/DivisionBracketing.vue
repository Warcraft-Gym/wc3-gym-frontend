<!-- The MMR strip: one dot per player, one draggable cut per band boundary, a stepper row below.
     Bands ascend (index 0 = lowest MMR); `cuts` is a v-model of ascending boundaries. -->
<template>
  <div>
    <svg
      ref="svg"
      :viewBox="`0 0 ${W} ${H}`"
      class="division-strip"
      @pointermove="drag"
      @pointerup="dragging = null"
      @pointerleave="dragging = null"
    >
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
      <line :x1="x(domain[0])" :x2="x(domain[1])" y1="66" y2="66" class="axis" />
      <template v-for="t in ticks" :key="t">
        <line :x1="x(t)" :x2="x(t)" y1="66" :y2="t % 100 === 0 ? 74 : 70" class="axis" />
        <text v-if="t % 100 === 0" :x="x(t)" y="88" text-anchor="middle" class="tick">{{ t }}</text>
      </template>
      <circle
        v-for="p in dots"
        :key="p.id"
        :cx="x(p.mmr)"
        cy="60"
        r="6"
        :fill="colors[p.band]"
        :class="{ pinned: p.pinned }"
      >
        <title>{{ p.label }} · {{ p.mmr }}</title>
      </circle>
      <g v-for="(c, i) in cuts" :key="i" class="cut" @pointerdown.prevent="dragging = i">
        <rect :x="x(c) - 24" y="24" width="48" height="16" rx="3" class="cut-box" />
        <text :x="x(c)" y="36" text-anchor="middle" class="cut-label">{{ c }}</text>
        <line :x1="x(c)" :x2="x(c)" y1="40" y2="76" class="cut-line" />
      </g>
    </svg>
    <div class="d-flex flex-wrap ga-4 mt-1">
      <div v-for="(c, i) in cuts" :key="i" class="d-flex align-center ga-1">
        <span class="text-caption text-medium-emphasis">{{ names[i] }} to {{ names[i + 1] }}</span>
        <v-btn icon="mdi-minus" size="x-small" variant="text" @click="set(i, c - 10)" />
        <input
          type="number"
          :value="c"
          class="cut-input"
          @change="set(i, Number($event.target.value))"
        >
        <v-btn icon="mdi-plus" size="x-small" variant="text" @click="set(i, c + 10)" />
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed, ref } from 'vue';
import { moveCut } from '@/helpers/divisions.mjs';

const props = defineProps({
  players: { type: Array, required: true }, // [{ id, label, mmr, band, pinned }]
  cuts: { type: Array, required: true }, // ascending, one per boundary
  names: { type: Array, required: true }, // one per band, ascending
  colors: { type: Array, required: true }, // one per band, ascending
  domain: { type: Array, required: true }, // [low, high] MMR
});
const emit = defineEmits(['update:cuts']);

const W = 1000;
const H = 96;
const PAD = 12;
const svg = ref(null);
const dragging = ref(null);

const x = (mmr) => PAD + ((mmr - props.domain[0]) / (props.domain[1] - props.domain[0])) * (W - 2 * PAD);
const edges = computed(() => [props.domain[0], ...props.cuts, props.domain[1]]);
const dots = computed(() => props.players.filter((p) => p.mmr > 0));
const counts = computed(() => props.names.map((_, i) => props.players.filter((p) => p.band === i).length));
const ticks = computed(() => {
  const out = [];
  for (let t = props.domain[0]; t <= props.domain[1]; t += 50) out.push(t);
  return out;
});

const set = (i, value) => emit('update:cuts', moveCut(props.cuts, i, value, props.domain));
const drag = (event) => {
  if (dragging.value === null) return;
  const box = svg.value.getBoundingClientRect();
  const px = ((event.clientX - box.left) / box.width) * W;
  const mmr = props.domain[0] + ((px - PAD) / (W - 2 * PAD)) * (props.domain[1] - props.domain[0]);
  set(dragging.value, mmr);
};
</script>

<style scoped>
.division-strip {
  width: 100%;
  height: auto;
  user-select: none;
  touch-action: none;
}
.band-name { font-size: 13px; font-weight: 500; }
.axis { stroke: rgba(var(--v-theme-on-surface), 0.3); stroke-width: 1.5; }
.tick { font-size: 10px; fill: rgba(var(--v-theme-on-surface), 0.5); }
circle { stroke: rgb(var(--v-theme-surface)); stroke-width: 2; }
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
