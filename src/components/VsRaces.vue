<!-- A player's ladder record against one race, or against every race when no race is given -->
<template>
  <span v-if="race" class="d-inline-flex align-center ga-1 text-no-wrap">
    <RaceIcon :raceIdentifier="race" size="1.1em" /> {{ rec(race) }}
    <v-tooltip activator="parent" location="top">
      <div v-for="r in RACES" :key="r" class="d-flex align-center ga-1"><RaceIcon :raceIdentifier="r" size="1.1em" /> {{ rec(r) }}</div>
    </v-tooltip>
  </span>
  <span v-else class="d-inline-flex align-center ga-3 text-no-wrap">
    <span v-for="r in RACES" :key="r" class="d-inline-flex align-center ga-1"><RaceIcon :raceIdentifier="r" size="1.1em" /> {{ rec(r) }}</span>
  </span>
</template>

<script setup>
import RaceIcon from '@/components/RaceIcon.vue';
import { RACES, winRate } from '@/helpers/ladder-days.mjs';

const props = defineProps({
  player: Object, // a SeasonPlayer row, undefined when the season ladder has none
  race: String,
});

const rec = (race) => {
  const r = props.player?.vs_race?.[race];
  return r && r[0] + r[1] ? `${r[0]}–${r[1]} · ${winRate(r[0], r[1])}%` : '—';
};
</script>
