<!-- One series on a phone: a title line, then one line per player with a value at the right -->
<template>
  <div class="series-card">
    <div class="d-flex align-center justify-space-between text-caption text-medium-emphasis">
      <span><slot name="title" /></span>
      <slot name="actions" />
    </div>
    <div v-for="(player, n) in [series.player1, series.player2]" :key="n" class="d-flex align-center ga-2" :class="{ 'font-weight-bold': winner === n }">
      <PlayerName :player="player" :race="player.signup_race" :host="series.host_player_id === player.id" class="flex-grow-1" />
      <slot name="side" :player="player" :n="n" :won="winner === n" />
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue';
import PlayerName from '@/components/PlayerName.vue';

const props = defineProps({
  series: { type: Object, required: true }, // player1, player2, host_player_id, scores
});

const winner = computed(() => {
  const { player1_score: a = 0, player2_score: b = 0 } = props.series;
  return a === b ? null : (a > b ? 0 : 1);
});
</script>

<style scoped>
.series-card {
  padding: 8px 12px;
  border-bottom: thin solid rgba(var(--v-border-color), var(--v-border-opacity));
}
.series-card :deep(.player-name) {
  white-space: normal;
}
</style>
