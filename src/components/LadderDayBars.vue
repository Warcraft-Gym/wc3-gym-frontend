<!-- One stacked bar per day of the window: wins under losses, on the shared games scale -->
<template>
  <svg :width="width" :height="height" class="d-block">
    <template v-for="(d, i) in days" :key="d.d">
      <rect v-if="d.w" :x="x(i)" :y="y(d.w)" :width="x.bandwidth()" :height="y(0) - y(d.w)" :fill="WIN" />
      <rect v-if="d.l" :x="x(i)" :y="y(d.w + d.l)" :width="x.bandwidth()" :height="Math.max(1, y(d.w) - y(d.w + d.l) - (d.w ? gap : 0))" :fill="LOSS" />
    </template>
    <line x1="0" :x2="width" :y1="height - 0.5" :y2="height - 0.5" stroke="rgba(0, 0, 0, 0.12)" />
  </svg>
</template>

<script setup>
import { computed } from 'vue';
import { range } from 'd3-array';
import { scaleBand, scaleLinear } from 'd3-scale';
import { LOSS, WIN } from '@/helpers/ladder-days.mjs';

const props = defineProps({
  days: { type: Array, required: true }, // from fillDays
  ymax: { type: Number, required: true },
  width: { type: Number, default: 224 },
  height: { type: Number, default: 28 },
  gap: { type: Number, default: 1 }, // surface gap between the two segments
});

const x = computed(() => scaleBand().domain(range(props.days.length)).range([0, props.width]).paddingInner(0.3));
const y = computed(() => scaleLinear().domain([0, props.ymax]).range([props.height - 1, 0]));
</script>
