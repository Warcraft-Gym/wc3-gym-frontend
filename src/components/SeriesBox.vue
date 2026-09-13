<!-- One series of a stage: a side per row with its race, the score, and the state as a
     word. The winning side wears the win token; a click opens the series. -->
<template>
  <component :is="readonly ? 'div' : 'button'" :type="readonly ? undefined : 'button'"
    class="series-box" :class="{ flat, readonly }" @click="readonly || $emit('open', series)">
    <div v-for="side in [1, 2]" :key="side" class="side" :class="sideClass(side)">
      <span class="mark" />
      <v-icon v-if="crown && side === 1" size="14" icon="mdi-crown" class="crown" aria-hidden="true" />
      <PlayerName v-if="player(side)" :player="player(side)" :race="race(side)" :plain="!readonly" />
      <span v-else class="text-medium-emphasis empty">{{ empty(side) }}</span>
      <span class="score">{{ score(side) }}</span>
    </div>
    <div class="foot text-caption text-medium-emphasis">
      <span>{{ STATE_WORD[state] }}</span>
      <span v-if="label">{{ label }}</span>
    </div>
  </component>
</template>

<script setup>
import { computed } from 'vue';

import PlayerName from '@/components/PlayerName.vue';
import { isByeSide, seriesState, winnerSide } from '@/helpers/stage-view.mjs';

const props = defineProps({
  series: { type: Object, required: true },
  label: { type: String, default: '' },  // the grand final and the third place name themselves
  crown: Boolean,                        // the standing king of a KOTH chain
  flat: Boolean,                         // inside a list, the card around it draws the border
  readonly: Boolean,                     // the series page opens nothing, so its names link
});
defineEmits(['open']);

const STATE_WORD = {
  pending: 'Waiting for both sides',
  open: 'To play',
  played: 'Played',
  walkover: 'Walkover',
  forfeit: 'Forfeit',
};

const state = computed(() => seriesState(props.series));
const winner = computed(() => winnerSide(props.series));

const player = (side) => props.series[`player${side}`] || null;
const race = (side) => props.series[`player${side}_race`] || undefined;
const score = (side) => props.series[`player${side}_score`] ?? '';
// A side with no feeder and no entrant can never fill: the other side passes through
const empty = (side) => (isByeSide(props.series, side) ? 'Bye' : 'To be decided');
const sideClass = (side) => ({
  won: winner.value === side,
  lost: winner.value !== null && winner.value !== side,
});
</script>

<style scoped>
.series-box {
  display: block;
  width: 100%;
  text-align: left;
  background: rgb(var(--v-theme-surface));
  border: 1px solid rgba(var(--v-border-color), var(--v-border-opacity));
  border-radius: 4px;
  overflow: hidden;
}
.series-box.flat { border: none; border-radius: 0; background: none; }
.series-box:hover:not(.readonly) { border-color: rgb(var(--v-theme-primary)); }
.series-box:focus-visible { outline: 2px solid rgb(var(--v-theme-primary)); outline-offset: 1px; }

.side {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 3px 8px;
  min-height: 26px;
}
.side + .side { border-top: 1px solid rgba(var(--v-border-color), var(--v-border-opacity)); }
/* The result is a mark beside the name, never coloured text */
.mark {
  flex: 0 0 auto;
  width: 3px;
  align-self: stretch;
  border-radius: 2px;
  background: rgb(var(--v-theme-draw));
}
.side.won .mark { background: rgb(var(--v-theme-win)); }
.side.lost .mark { background: rgb(var(--v-theme-loss)); }
.side.won { font-weight: 700; }
.crown { color: rgb(var(--v-theme-primary-text)); }
.empty { font-size: 0.8125rem; }
.score { margin-left: auto; font-variant-numeric: tabular-nums; font-weight: 700; }

.foot {
  display: flex;
  gap: 8px;
  justify-content: space-between;
  padding: 2px 8px 4px;
  line-height: 1.2;
}
</style>
