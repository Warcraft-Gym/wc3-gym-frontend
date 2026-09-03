<!-- A player's ladder record against one race; hover shows every race -->
<template>
  <span class="d-inline-flex align-center ga-1 text-no-wrap">
    <RaceIcon v-if="race" :raceIdentifier="race" size="1.1em" /> {{ race ? rec(race) : '—' }}
    <v-tooltip activator="parent" location="top">
      <div v-for="r in RACES" :key="r" class="d-flex align-center ga-1"><RaceIcon :raceIdentifier="r" size="1.1em" /> {{ rec(r) }}</div>
    </v-tooltip>
  </span>
</template>

<script setup>
import RaceIcon from '@/components/RaceIcon.vue';
import { RACES, winRate } from '@/helpers/ladder-days.mjs';

const props = defineProps({
  player: Object, // a SeasonPlayer row, undefined when the season ladder has none
  race: String, // the opponent's race, undefined when the opponent has no signup race
});

const rec = (race) => {
  const r = props.player?.vs_race?.[race];
  return r && r[0] + r[1] ? `${r[0]}–${r[1]} · ${winRate(r[0], r[1])}%` : '—';
};
</script>
