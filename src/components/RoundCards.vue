<!-- One card per round of a season: the window, the team faced, and the player's
     series of that round. The player's own page fills the slots with his actions,
     a visitor reads the same facts without them. -->
<template>
  <v-chip v-if="$slots.question && asking.length" size="small" variant="tonal" color="primary" class="mb-3">
    {{ answered }} of {{ asking.length }} answered
  </v-chip>
  <div v-if="cards.length" class="d-flex flex-wrap ga-3">
    <v-sheet
      v-for="card in cards"
      :key="card.playday"
      border
      rounded
      class="pa-3 flex-grow-1"
      :style="card.current ? 'min-width: 230px; border-color: rgb(var(--v-theme-primary)) !important' : 'min-width: 230px'"
    >
      <div class="text-subtitle-2">{{ card.label }}</div>
      <div class="text-caption text-medium-emphasis">
        Round {{ card.playday }}<template v-if="card.opponentTeam"> · vs {{ card.opponentTeam.name }}</template>
      </div>

      <!-- A series replaces the question: the round is already accounted for -->
      <template v-if="card.series">
        <div class="d-flex align-center ga-2 mt-2">
          <PlayerName
            :player="opponent(card.series)"
            :race="opponentRace(card.series)"
            :host="card.series.host_player_id === opponent(card.series).id"
          />
          <v-chip v-if="!isUnscored(card.series)" :color="scoreColor(card.series)" variant="outlined" size="small">
            {{ myScore(card.series) }} - {{ theirScore(card.series) }}
          </v-chip>
        </div>
        <!-- The host bans first and hosts game one, so the card names that side -->
        <div v-if="card.series.host_player_id === player.id" class="text-caption text-primary">
          You host and ban first
        </div>
        <div class="text-caption text-medium-emphasis">{{ formatDateTime(card.series.date_time) }}</div>
        <!-- The three maps of the series once the veto has decided them -->
        <div v-for="line in maps(card.series)" :key="line" class="text-caption text-medium-emphasis">
          {{ line }}
        </div>
        <CastChips :series="card.series" class="mt-1" />
        <slot v-if="isUnscored(card.series)" name="series-actions" :series="card.series" />
      </template>

      <!-- the question belongs to the player himself; a visitor reads the state -->
      <div v-else-if="card.over || !$slots.question" class="mt-2">
        <v-chip size="small" variant="tonal" :color="card.answer === false ? 'error' : undefined">
          {{ card.answer === false ? 'Out' : card.over ? 'Not paired' : 'Not paired yet' }}
        </v-chip>
      </div>

      <slot v-else name="question" :card="card" />
    </v-sheet>
  </div>
  <div v-else class="text-medium-emphasis">No rounds yet.</div>
</template>

<script setup>
import { computed, ref, watch } from 'vue';
import { useMatchStore } from '@/stores';
import { formatDateTime } from '@/helpers/datetime';
import { roundCards } from '@/helpers/rounds.mjs';
import { isUnscored } from '@/helpers/season-phase.mjs';
import CastChips from '@/components/CastChips.vue';
import PlayerName from '@/components/PlayerName.vue';

const props = defineProps({
  player: { type: Object, required: true },
  season: { type: Object, required: true },  // carries the rounds
  series: { type: Array, default: () => [] },  // the player's series of this season
  teamId: { type: Number, default: null },
  answers: { type: Array, default: () => [] },  // availability, the player's own page only
});

const matchStore = useMatchStore();
const matches = ref([]);

// the season's matches name the team the player's team meets each round
watch(() => props.season?.id, async (seasonId) => {
  matches.value = seasonId ? await matchStore.searchMatchesBySeason(seasonId).catch(() => []) : [];
}, { immediate: true });

const cards = computed(() => roundCards({
  rounds: props.season?.rounds ?? [],
  series: props.series,
  matches: matches.value,
  teamId: props.teamId,
  answers: props.answers,
}));

// The question is open on a round with no series that is not over
const asking = computed(() => cards.value.filter(card => !card.series && !card.over));
const answered = computed(() => asking.value.filter(card => card.answer !== null).length);

// the other side of a series; the id is the fallback when the payload carries no player row
const opponent = (series) => {
  const mine = series.player1_id === props.player.id;
  return (mine ? series.player2 : series.player1) || { name: `Player ${mine ? series.player2_id : series.player1_id}` };
};

// the race the opponent played in that series, not the one he signed the season up on
const opponentRace = (series) =>
  (series.player1_id === props.player.id ? series.player2_race : series.player1_race);

// The maps of the series, read from the player's side: game 1 is the season's
// fixed map, and each side picks the map it takes after a loss
const maps = (series) => {
  const mine = series.player1_id === props.player.id;
  const myPick = mine ? series.player1_pick_map : series.player2_pick_map;
  const theirPick = mine ? series.player2_pick_map : series.player1_pick_map;
  return [
    series.match?.fixed_map && `Game 1: ${series.match.fixed_map.name}`,
    myPick && `Your pick: ${myPick}`,
    theirPick && `${opponent(series).name}'s pick: ${theirPick}`,
  ].filter(Boolean);
};

// Scores read from the player's side: his first, the opponent's second
const myScore = (series) => (series.player1_id === props.player.id ? series.player1_score : series.player2_score) || 0;
const theirScore = (series) => (series.player1_id === props.player.id ? series.player2_score : series.player1_score) || 0;
const scoreColor = (series) => {
  if (myScore(series) > theirScore(series)) return 'success';
  if (myScore(series) < theirScore(series)) return 'error';
  return 'warning';
};
</script>
