<!-- One series of a stage: a side per row with its race, the score, and the state as a
     word. A team side reads as the team name over the roster it fields. A free for all
     lobby reads one row a seat with its place. The winning side wears the win token;
     a click opens the series. -->
<template>
  <component :is="readonly ? 'div' : 'button'" :type="readonly ? undefined : 'button'"
    :role="readonly ? 'group' : undefined" :aria-label="name"
    class="series-box" :class="{ flat, readonly }" @click="readonly || $emit('open', series)">
    <!-- a free for all lobby: one row a seat, the winner first, the place as the number -->
    <div v-for="seat in seats" :key="seat.key" class="side" :class="seat.result">
      <span class="mark" />
      <PlayerName v-if="seat.user" :player="seat.user" :plain="!readonly" />
      <span v-else class="text-medium-emphasis empty">{{ fed ? 'To be decided' : 'Empty seat' }}</span>
      <span class="score">{{ seat.place ?? '' }}</span>
    </div>
    <div v-for="side in seats.length ? [] : [1, 2]" :key="side" class="side" :class="sideClass(side)">
      <span class="mark" />
      <v-icon v-if="crown && side === 1" size="14" icon="mdi-crown" class="crown" aria-hidden="true" />
      <div v-if="team(side)" class="who">
        <span class="team-name">{{ team(side).name }}</span>
        <span v-if="roster(side).length" class="roster">
          <PlayerName v-for="seat in roster(side)" :key="seat.player.id" :player="seat.player"
            :race="seat.race || undefined" :plain="!readonly" />
        </span>
        <span v-else-if="series.pick_rule" class="roster text-medium-emphasis">Roster not named</span>
      </div>
      <PlayerName v-else-if="player(side)" :player="player(side)" :race="race(side)" :plain="!readonly" />
      <span v-else class="text-medium-emphasis empty">{{ empty(side) }}</span>
      <span class="score">{{ score(side) }}</span>
    </div>
    <div class="foot text-caption text-medium-emphasis">
      <span>{{ stateWord }}</span>
      <span v-if="label">{{ label }}</span>
    </div>
  </component>
</template>

<script setup>
import { computed, inject, ref } from 'vue';

import { HIDE_RESULTS } from '@/helpers/events.mjs';
import PlayerName from '@/components/PlayerName.vue';
import { sideRoster } from '@/helpers/fixture.mjs';
import { isByeSide, isLobby, lobbySeats, seriesState, shownPlayer, shownTeam, winnerSide } from '@/helpers/stage-view.mjs';

const props = defineProps({
  series: { type: Object, required: true },
  label: { type: String, default: '' },  // the grand final and the third place name themselves
  round: { type: String, default: '' },  // the column the box sits in, so a screen reader hears it per box
  crown: Boolean,                        // the standing king of a KOTH chain
  flat: Boolean,                         // inside a list, the card around it draws the border
  readonly: Boolean,                     // the series page opens nothing, so its names link
  rosters: { type: Object, default: () => ({}) },  // the players of each team entrant, by entrant id
  fed: Boolean,                          // a lobby seated by the round before it, not by the seeds
});
defineEmits(['open']);

const STATE_WORD = {
  pending: 'Waiting for both sides',
  open: 'To play',
  played: 'Played',
  walkover: 'Walkover',
  forfeit: 'Forfeit',
};

// The spoiler switch of the page around this box; a page with no switch shows every result
const hidden = inject(HIDE_RESULTS, ref(false));

const state = computed(() => seriesState(props.series));
// A lobby seats more than two, so its seats replace the two side rows. A fixture series
// writes the same rows for its side rosters, and those read under the team name instead.
const seats = computed(() => (isLobby(props.series)
  ? lobbySeats(props.series, hidden.value, props.fed) : []));
// A lobby fills from the round before it, so it never waits for "both sides"
const stateWord = computed(() => (seats.value.length && state.value === 'pending'
  ? 'Waiting for the round before' : STATE_WORD[state.value]));
const winner = computed(() => (hidden.value ? null : winnerSide(props.series)));

const player = (side) => shownPlayer(props.series, side, hidden.value);
const team = (side) => shownTeam(props.series, side, hidden.value);
// Who a team side fields: the players the series names, else the one player it drafted,
// else every member the team is rostered with. A series that names its own pick rule
// fields the players it names alone, so a side nobody has named yet reads empty.
const roster = (side) => {
  if (!team(side)) return [];
  const named = sideRoster(props.series, side);
  if (named.length) return named.map((one) => ({ player: one, race: one.signup_race }));
  const drafted = player(side);
  if (drafted) return [{ player: drafted, race: race(side) }];
  if (props.series.pick_rule) return [];
  return props.rosters[props.series[`entrant${side}_id`]] || [];
};
const race = (side) => props.series[`player${side}_race`] || undefined;
const score = (side) => (hidden.value ? '' : props.series[`player${side}_score`] ?? '');
// A side with no feeder and no entrant can never fill: the other side passes through
const empty = (side) => (isByeSide(props.series, side) ? 'Bye' : 'To be decided');
// What a screen reader hears for the box: where it sits, who plays, and the state
const sideName = (side) => team(side)?.name || player(side)?.name || empty(side);
const name = computed(() => {
  const where = [props.round, props.label].filter(Boolean).join(', ');
  const who = seats.value.length ? `${seats.value.length} seats` : `${sideName(1)} vs ${sideName(2)}`;
  return `${where ? `${where}: ` : ''}${who}, ${stateWord.value}`;
});
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
/* A team side stacks its name over its roster and keeps the score on the right */
.who { display: flex; flex-direction: column; gap: 1px; min-width: 0; }
.roster { display: flex; flex-wrap: wrap; gap: 2px 10px; font-size: 0.8125rem; font-weight: 400; }
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
