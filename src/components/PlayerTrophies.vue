<!-- The trophy shelf at the foot of Player Information: a league or tournament win, not a seasonal or lifetime badge -->
<template>
  <div v-if="trophies?.length" class="d-flex flex-wrap ga-4 mt-3">
    <TrophyIcon v-for="trophy in trophies" :key="trophy.season_id ?? trophy.title" :trophy="trophy" :size="48" />
  </div>
</template>

<script setup>
import TrophyIcon from '@/components/TrophyIcon.vue';

defineProps({ trophies: { type: Array, default: null } });
</script>
