<!-- One chip per race the player has ladder games on: race icon + that race's MMR.
     A player is not one race, so every raced MMR shows; races without games stay hidden. -->
<template>
  <span class="d-inline-flex align-center ga-2 flex-wrap">
    <v-tooltip
      v-for="stat in raceStats"
      :key="stat.race"
      location="top"
      :text="`${raceName(stat.race)}: ${stat.wins || 0} wins, ${stat.losses || 0} losses in season ${stat.wc3_season}`"
    >
      <template #activator="{ props: tooltip }">
        <v-chip v-bind="tooltip" size="small" variant="tonal">
          <RaceIcon :raceIdentifier="stat.race" class="mr-1" />
          {{ stat.mmr }}
          <span v-if="w3cSeason && stat.wc3_season !== w3cSeason" class="text-caption text-medium-emphasis ml-1">S{{ stat.wc3_season }}</span>
        </v-chip>
      </template>
    </v-tooltip>
    <span v-if="!raceStats.length" class="text-caption text-medium-emphasis">no ladder games</span>
  </span>
</template>

<script setup>
import { computed } from 'vue';
import RaceIcon from '@/components/RaceIcon.vue';
import { raceWrapper } from '@/helpers/races.js';
import { getAllRaceStats } from '@/helpers/w3c-stats';

const props = defineProps({
  player: { type: Object, required: true }, // needs w3c_stats
  w3cSeason: Number, // current W3C season; a stat from an older season names its own
});

const raceStats = computed(() =>
  getAllRaceStats(props.player, props.w3cSeason)
    .filter((stat) => (stat.games || 0) > 0)
    .sort((a, b) => (b.mmr || 0) - (a.mmr || 0))
);
const raceName = (race) => raceWrapper.getRaceObject(race)?.name || race;
</script>
