<!-- The badges a player earned, as a row of icons with the points they paid -->
<template>
  <div v-if="badges.length" class="d-flex align-center flex-wrap" style="gap: 2px">
    <span v-for="badge in badges" :key="badge.id" class="badge-icon">
      <v-icon size="small" color="amber-darken-2">{{ badge.icon }}</v-icon>
      <v-tooltip activator="parent" location="top">{{ badge.name }} +{{ badge.points }}</v-tooltip>
    </span>
    <span v-if="showPoints" class="text-caption text-medium-emphasis ml-1">{{ points }} pts</span>
  </div>
  <span v-else class="text-medium-emphasis">&mdash;</span>
</template>

<script setup>
import { computed } from 'vue';
import { achievementPoints } from '@/helpers/achievements';

const props = defineProps({
  badges: { type: Array, default: () => [] },
  // Off where a Points column already shows the number
  showPoints: { type: Boolean, default: true },
});

const points = computed(() => achievementPoints(props.badges));
</script>

<style scoped>
.badge-icon {
  cursor: help;
  line-height: 1;
}
</style>
