<!-- The badges a player earned, as a row of icons over the points they paid -->
<template>
  <div v-if="badges.length">
    <div class="d-flex align-center flex-wrap" style="gap: 2px">
      <span v-for="badge in badges" :key="badge.id" class="badge-icon">
        <v-icon size="small" color="amber-darken-2">{{ badge.icon }}</v-icon>
        <v-tooltip activator="parent" location="top">{{ badge.name }} (+{{ badge.points }})</v-tooltip>
      </span>
    </div>
    <div v-if="showPoints" class="text-caption text-medium-emphasis badge-points">{{ points }}</div>
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
/* The number sits right under the badges, so the cell keeps its height */
.badge-points {
  line-height: 1;
  margin-top: 2px;
}
</style>
