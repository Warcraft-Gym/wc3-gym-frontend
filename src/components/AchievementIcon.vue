<!-- One badge glyph from game-icons.net, tinted by the surrounding text color; a map badge draws its map's picture -->
<template>
  <img
    v-if="picture"
    :src="picture"
    :alt="id"
    class="achievement-icon map-picture"
    :style="{ width: `${size}px`, height: `${size}px` }"
    @error="broken = true"
  >
  <span v-else-if="svg" class="achievement-icon" :style="{ width: `${size}px`, height: `${size}px` }" v-html="svg" />
  <v-icon v-else :size="size">mdi-trophy-variant-outline</v-icon>
</template>

<script setup>
import { computed, ref } from 'vue';
import { useSeasonStore } from '@/stores';

// The rule glyphs, inlined at build time and keyed by rule id
const files = import.meta.glob('@/assets/achievementIcons/*.svg', { query: '?raw', import: 'default', eager: true });
const byId = Object.fromEntries(
  Object.entries(files).map(([path, svg]) => [path.split('/').pop().replace('.svg', ''), svg]),
);

const props = defineProps({
  id: { type: String, required: true },
  size: { type: Number, default: 20 },
});

const seasonStore = useSeasonStore();
// Map pictures by map name, from the season list every page loads
const pictures = computed(() => new Map(
  seasonStore.seasons.flatMap(season => season.maps ?? []).map(map => [map.name, map.image]),
));

// A per-map badge (`map_win:<map>`) draws its map's picture; the rule glyph when the picture is missing
const broken = ref(false);
const picture = computed(() => {
  const [rule, ...rest] = props.id.split(':');
  return rule === 'map_win' && !broken.value ? pictures.value.get(rest.join(':')) : null;
});
const svg = computed(() => byId[props.id] ?? byId[props.id.split(':')[0]]);
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
.map-picture {
  object-fit: cover;
  border-radius: 3px;
}
</style>
