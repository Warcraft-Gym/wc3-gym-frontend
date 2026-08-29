<!-- One badge glyph from game-icons.net, tinted by the surrounding text color -->
<template>
  <span v-if="svg" class="achievement-icon" :style="{ width: `${size}px`, height: `${size}px` }" v-html="svg" />
  <v-icon v-else :size="size">mdi-trophy-variant-outline</v-icon>
</template>

<script setup>
import { computed } from 'vue';

// The 24 rule glyphs, inlined at build time and keyed by rule id
const files = import.meta.glob('@/assets/achievementIcons/*.svg', { query: '?raw', import: 'default', eager: true });
const byId = Object.fromEntries(
  Object.entries(files).map(([path, svg]) => [path.split('/').pop().replace('.svg', ''), svg]),
);

const props = defineProps({
  id: { type: String, required: true },
  size: { type: Number, default: 20 },
});

const svg = computed(() => byId[props.id]);
</script>

<style scoped>
.achievement-icon {
  display: inline-flex;
  flex-shrink: 0;
}
.achievement-icon :deep(svg) {
  width: 100%;
  height: 100%;
}
</style>
