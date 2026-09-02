<template>
  <v-select
    v-model="seasonStore.selectedSeasonId"
    :items="seasonStore.seasons"
    item-title="name"
    item-value="id"
    label="Season"
    variant="outlined"
    density="compact"
    hide-details
    style="min-width: 200px;"
  />
</template>

<script setup>
import { onMounted } from 'vue';
import { useSeasonStore } from '@/stores';
import { loadSeasons, resolveCurrentSeasonId } from '@/helpers/current-season';

// One pick for every Fantasy page: the store keeps it between routes
const seasonStore = useSeasonStore();

onMounted(async () => {
  const seasons = await loadSeasons();
  if (!seasons.some((season) => season.id === seasonStore.selectedSeasonId)) {
    seasonStore.selectedSeasonId = await resolveCurrentSeasonId();
  }
});
</script>
