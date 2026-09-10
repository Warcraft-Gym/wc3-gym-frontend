<!-- A trophy is a league or tournament win, not a seasonal or lifetime badge -->
<template>
  <v-card v-if="trophies?.length" elevation="2" class="mb-6">
    <v-card-title class="bg-primary d-flex align-center">
      <v-icon class="mr-2">mdi-trophy</v-icon>
      Trophies
    </v-card-title>
    <v-card-text class="pt-2 d-flex flex-wrap ga-6">
      <div v-for="trophy in trophies" :key="trophy.season_id" class="text-center">
        <TrophyIcon :trophy="trophy" :size="56" />
        <!-- the plate names the season and the crown says champion, so the caption names the team -->
        <div class="text-caption mt-1">{{ trophy.team_name }}</div>
      </div>
    </v-card-text>
  </v-card>
</template>

<script setup>
import TrophyIcon from '@/components/TrophyIcon.vue';

defineProps({ trophies: { type: Array, default: null } });
</script>
