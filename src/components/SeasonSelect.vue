<template>
  <v-select
    v-model="selectedSeasonId"
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
import { onMounted, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { storeToRefs } from 'pinia';
import { useSeasonStore } from '@/stores';
import { loadSeasons, resolveCurrentSeasonId } from '@/helpers/current-season';

// One pick for every page that shows a season: the store carries it between routes, ?season= across a reload
const route = useRoute();
const router = useRouter();
const seasonStore = useSeasonStore();
const { selectedSeasonId } = storeToRefs(seasonStore);

const syncUrl = (id) => {
  if (id && Number(route.query.season) !== id) router.replace({ query: { ...route.query, season: id } });
};

onMounted(async () => {
  const seasons = await loadSeasons();
  const known = (id) => seasons.some((season) => season.id === id);
  const fromUrl = Number(route.query.season);
  if (known(fromUrl)) selectedSeasonId.value = fromUrl;
  else if (!known(selectedSeasonId.value)) selectedSeasonId.value = await resolveCurrentSeasonId();
  syncUrl(selectedSeasonId.value);
});

watch(selectedSeasonId, syncUrl);
</script>
