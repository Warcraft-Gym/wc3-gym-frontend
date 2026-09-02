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
import { findSeason } from '@/helpers/season-slug.mjs';

// One pick for every page that shows a season: the store carries it between routes, ?season= across a reload
const route = useRoute();
const router = useRouter();
const seasonStore = useSeasonStore();
const { selectedSeasonId } = storeToRefs(seasonStore);

const syncUrl = (id) => {
  if (!id) return;
  const slug = seasonStore.slugOf(id);
  if (route.query.season !== slug) router.replace({ query: { ...route.query, season: slug } });
};

onMounted(async () => {
  const seasons = await loadSeasons();
  const fromUrl = findSeason(seasons, route.query.season);
  if (fromUrl) selectedSeasonId.value = fromUrl.id;
  else if (!seasons.some((season) => season.id === selectedSeasonId.value)) selectedSeasonId.value = await resolveCurrentSeasonId();
  syncUrl(selectedSeasonId.value);
});

watch(selectedSeasonId, syncUrl);
</script>
