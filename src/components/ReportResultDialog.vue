<!-- The player reports one series: the map veto, the winner and map of each game, and
     the replay file per game. The veto warns when it is not complete; it never blocks. -->
<template>
  <v-dialog v-model="show" :max-width="vetoMissing ? 960 : 600">
    <v-card>
      <v-card-title class="bg-primary">
        <v-icon class="mr-2">mdi-trophy</v-icon>
        Report Result
      </v-card-title>
      <v-card-text class="pt-4">
        <StatusAlert v-model="errorMessage" />
        <v-alert
          v-if="scoreVeto"
          :type="scoreVeto.complete ? 'success' : 'warning'"
          variant="tonal"
          density="compact"
          class="mb-2"
        >
          {{ scoreVeto.complete ? 'Map veto complete' : 'The map veto is not complete. Enter it below, or report without it. Each step is saved when you tap it.' }}
        </v-alert>
        <VetoBoard v-if="series.id" :key="series.id" :series-id="series.id" report class="mb-4" @change="board => scoreVeto = board" />
        <v-form ref="scoreForm" v-model="scoreFormValid">
          <v-container>
            <v-row v-if="!series.raceOpen">
              <v-col cols="12" class="pt-0">
                <v-btn variant="text" size="small" density="comfortable" prepend-icon="mdi-account-switch" @click="series.raceOpen = true">
                  Played a different race
                </v-btn>
              </v-col>
            </v-row>
            <v-row v-else>
              <v-col cols="6">
                <RaceSelect v-model="series.races.player1" :label="series.player1_name || ''" density="comfortable" />
              </v-col>
              <v-col cols="6">
                <RaceSelect v-model="series.races.player2" :label="series.player2_name || ''" density="comfortable" />
              </v-col>
            </v-row>
            <v-row v-for="game in gameRows" :key="game">
              <v-col cols="12">
                <v-card variant="outlined">
                  <v-card-text class="py-3">
                    <div class="text-subtitle-2 mb-2">Game {{ game }}</div>
                    <v-btn-toggle
                      :model-value="series.winners[game - 1]"
                      color="primary"
                      divided
                      variant="outlined"
                      density="comfortable"
                      class="d-flex mb-3"
                      @update:model-value="setWinner(game, $event)"
                    >
                      <v-btn value="A" class="flex-grow-1">{{ series.player1_name }} won</v-btn>
                      <v-btn value="B" class="flex-grow-1">{{ series.player2_name }} won</v-btn>
                    </v-btn-toggle>
                    <v-select
                      :model-value="mapOf(game)"
                      :items="mapStore.maps"
                      item-title="name"
                      item-value="id"
                      label="Map played"
                      variant="outlined"
                      density="comfortable"
                      :hint="mapHint(game)"
                      :hide-details="!mapHint(game)"
                      persistent-hint
                      clearable
                      class="mb-3"
                      @update:model-value="setMap(game, $event)"
                    />
                    <v-file-input
                      v-model="series.replays[game]"
                      :label="`Game ${game} replay`"
                      variant="outlined"
                      density="comfortable"
                      accept=".w3g"
                      prepend-icon="mdi-file-upload"
                      :rules="needsFile(game) ? [rules.required, rules.w3gFile] : [rules.w3gFile]"
                      :required="needsFile(game)"
                      :hint="fileHint(game)"
                      @update:model-value="readGameReplay(game, $event)"
                    />
                    <v-alert
                      v-if="replayNote(game)"
                      type="warning"
                      variant="tonal"
                      density="compact"
                      class="mt-2"
                    >
                      {{ replayNote(game) }}
                    </v-alert>
                  </v-card-text>
                </v-card>
              </v-col>
            </v-row>
            <v-row>
              <v-col cols="12" class="pt-0 text-center">
                <span v-if="scoreProblem" class="text-caption text-medium-emphasis">{{ scoreProblem }}</span>
                <span v-else class="text-subtitle-1 font-weight-medium">{{ resultLine }}</span>
              </v-col>
            </v-row>
          </v-container>
        </v-form>
      </v-card-text>
      <v-card-actions>
        <v-spacer />
        <v-btn variant="text" :disabled="saving" @click="close">Close</v-btn>
        <v-btn :color="vetoMissing ? 'warning' : 'primary'" variant="elevated" prepend-icon="mdi-content-save" :disabled="!isValid || saving" :loading="saving" @click="save">{{ vetoMissing ? 'Report without a veto' : 'Save Result' }}</v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>

<script setup>
import { computed, ref } from 'vue';
import { backendUrl, fetchWrapper } from '@/helpers';
import { authHeader } from '@/helpers/fetch-wrapper';
import { useMapStore } from '@/stores';
import { winsOf, isValidResult, replaysNeeded } from '@/helpers/best-of';
import { mapsByGame, picksOf, scoreOf, gameSlots, gamesReported } from '@/helpers/map-order.mjs';
import { readReplay, matchMap, isOtherSeries } from '@/helpers/w3g.mjs';
import RaceSelect from '@/components/RaceSelect.vue';
import StatusAlert from '@/components/StatusAlert.vue';
import VetoBoard from '@/components/VetoBoard.vue';

const emit = defineEmits(['saved']);

const mapStore = useMapStore();

const show = ref(false);
const saving = ref(false);
const errorMessage = ref(null);
const scoreFormValid = ref(true);
const scoreForm = ref(null);
const series = ref({ replays: {}, races: {}, winners: [], maps: {}, reads: {} });
// a result carries its veto, so the dialog holds the board above the scores
const scoreVeto = ref(null);
const vetoMissing = computed(() => scoreVeto.value !== null && !scoreVeto.value.complete);

// Validation rules
const rules = {
  required: (value) => !!value || 'This field is required',
  w3gFile: (value) => {
    if (!value || !(value instanceof File)) return true;
    return value.name.toLowerCase().endsWith('.w3g') || 'Only .w3g replay files are allowed';
  },
};

const open = (item) => {
  errorMessage.value = null;
  series.value = {
    id: item.id,
    player1_name: item.player1?.name || `Player ${item.player1_id}`,
    player2_name: item.player2?.name || `Player ${item.player2_id}`,
    // the tags name the sides in a replay, which carries no player id of ours
    tags: [item.player1?.battleTag, item.player2?.battleTag],
    map_rules: item.match?.season?.map_rules,
    // the race each side played; the panel opens by itself when one is an exception
    races: { player1: item.player1_race, player2: item.player2_race },
    raceOpen: !!(item.player1_off_race || item.player2_off_race),
    // games already reported: their stored replays stay unless a new file is picked
    reported: item.player1_score != null && item.player2_score != null ? item.player1_score + item.player2_score : 0,
    replays: {},
    // the side that won each game, in play order, and the map named for a game
    winners: [],
    maps: {},
    // what each game's replay says, by game number
    reads: {},
    storedGames: '[]',
  };
  scoreVeto.value = null;
  show.value = true;
  if (!mapStore.maps.length) mapStore.fetchMaps().catch(() => {});  // names the maps each game offers
  loadGames(item.id);
};

// A series reported before opens on the games it recorded, so a fix starts from them
const loadGames = async (id) => {
  let games = [];
  try {
    games = await fetchWrapper.get(`${backendUrl}/series/${id}/games`);
  } catch {
    return;  // a series with no games recorded answers nothing to start from
  }
  if (series.value.id !== id) return;  // the dialog moved on while the read was out
  for (const game of games) {
    series.value.winners[game.game_no - 1] = game.winner_side;
    if (game.map_id) series.value.maps[game.game_no] = game.map_id;
  }
  series.value.storedGames = JSON.stringify(gamesReported(series.value.winners, mapOf));
};

const close = () => {
  show.value = false;
  series.value = { replays: {}, races: {}, winners: [], maps: {}, reads: {}, tags: [] };
};

// A picked replay says which map was played. It never blocks a report: the file is the
// evidence, but a player who names something else may be right and the parse may be wrong.
const readGameReplay = async (game, file) => {
  delete series.value.reads[game];
  if (!(file instanceof File)) return;
  const id = series.value.id;
  const read = await readReplay(file).catch(() => null);
  if (!read || series.value.id !== id) return;  // the dialog moved on, or not a replay
  series.value.reads[game] = read;
  // the replay beats the season's rule, but never a map the reporter named himself
  const map = matchMap(read.mapPath, mapStore.maps);
  if (map && !series.value.maps[game]) series.value.maps[game] = map.id;
};

// Says where the map came from when the replay named it, so a changed field is not a surprise
const mapHint = (game) => {
  const read = series.value.reads?.[game];
  const played = read && matchMap(read.mapPath, mapStore.maps);
  return played && played.id === series.value.maps[game] ? 'Read from the replay' : undefined;
};

// What the replay disagrees with, or null
const replayNote = (game) => {
  const read = series.value.reads?.[game];
  if (!read) return null;
  if (isOtherSeries(read.tags, series.value.tags)) {
    return `This replay is ${read.tags.join(' against ')}. It is not this series.`;
  }
  const played = matchMap(read.mapPath, mapStore.maps);
  if (played && series.value.maps[game] && series.value.maps[game] !== played.id) {
    return `The replay was played on ${played.name}.`;
  }
  return null;
};

const REPLAY_MAGIC = 'Warcraft III recorded game';

// The file goes from the browser straight to the bucket, at a link the backend signs per game
const uploadReplay = async (seriesId, game, file) => {
  const head = new TextDecoder().decode(await file.slice(0, REPLAY_MAGIC.length).arrayBuffer());
  if (head !== REPLAY_MAGIC) throw new Error(`Game ${game} is not a Warcraft III replay`);
  const { url } = await fetchWrapper.post(`${backendUrl}/player-series/${seriesId}/replays/${game}/upload-url`);
  const put = await fetch(url, {
    method: 'PUT',
    body: file,
    headers: { 'Content-Type': 'application/octet-stream', 'Content-Disposition': `attachment; filename="game${game}.w3g"` },
  });
  if (!put.ok) throw new Error(`Game ${game} replay upload failed`);
};

const save = async () => {
  saving.value = true;
  errorMessage.value = null;
  try {
    const [p1, p2] = reportedScore.value;
    const games = gamesReported(series.value.winners, mapOf);

    const played = replaysNeeded(p1, p2);
    for (let game = 1; game <= played; game++) {
      if (needsFile(game) && !hasReplay(game)) {
        errorMessage.value = `Game ${game} replay file is required for a ${p1}:${p2} result.`;
        return;
      }
    }

    const id = series.value.id;
    const uploaded = [];
    for (let game = 1; game <= played; game++) {
      if (!hasReplay(game)) continue;
      await uploadReplay(id, game, series.value.replays[game]);
      uploaded.push(game);
    }

    if (played === series.value.reported && uploaded.length && JSON.stringify(games) === series.value.storedGames) {
      // the result stands; each new file replaces one stored replay
      for (const game of uploaded) await fetchWrapper.put(`${backendUrl}/player-series/${id}/replays/${game}`);
    } else {
      // the report confirms every game's file in the bucket before it writes the score
      const formData = new FormData();
      formData.append('player1_score', p1);
      formData.append('player2_score', p2);
      formData.append('action', 'score_updated');
      // one entry per game played, which the backend checks against the score
      formData.append('games', JSON.stringify(games));
      if (series.value.raceOpen) {
        // the backend stores nothing when the race is the one he signed up on
        formData.append('player1_off_race', series.value.races.player1 || '');
        formData.append('player2_off_race', series.value.races.player2 || '');
      }
      const url = `${backendUrl}/player-series/${id}`;
      const response = await fetch(url, { method: 'PUT', headers: await authHeader('PUT', url), body: formData });
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Update failed');
      }
    }

    close();
    emit('saved', 'Result reported successfully!');
  } catch (error) {
    errorMessage.value = error.message || 'Error reporting result.';
  } finally {
    saving.value = false;
  }
};

// The score the tapped winners add up to, the season's maps to win, and the file picked for a game
const reportedScore = computed(() => scoreOf(series.value.winners || []));
const seriesWins = computed(() => winsOf(series.value.map_rules));
const hasReplay = (game) => series.value.replays?.[game] instanceof File;
// A first report needs every game's file; a fix keeps the stored ones unless a new file is picked
const needsFile = (game) => game > (series.value.reported || 0);
const fileHint = (game) => (needsFile(game) ? undefined : 'Leave empty to keep the stored replay');

// One row per game played, plus the next while neither side has won the series
const gameRows = computed(() => gameSlots(series.value.map_rules, series.value.winners || []));

// The map the season's rules offer for each game, given the veto and who won the games before
const offeredMaps = computed(() => mapsByGame(
  series.value.map_rules,
  scoreVeto.value?.week_map_id,
  picksOf(scoreVeto.value?.steps),
  series.value.winners || [],
));
const mapOf = (game) => series.value.maps?.[game] ?? offeredMaps.value[game - 1] ?? null;
const setMap = (game, mapId) => { series.value.maps[game] = mapId; };

// A changed winner reopens the games after it: they were played under a different map order
const setWinner = (game, side) => {
  const winners = series.value.winners;
  if (winners[game - 1] === side) return;
  winners[game - 1] = side || null;
  winners.length = game;
  for (const named of Object.keys(series.value.maps)) {
    if (Number(named) > game) delete series.value.maps[named];
  }
};

const scoreProblem = computed(() => {
  const [p1, p2] = reportedScore.value;
  return isValidResult(p1, p2, seriesWins.value) ? null : 'Tap the winner of each game played';
});
const resultLine = computed(() => {
  const [p1, p2] = reportedScore.value;
  return `${series.value.player1_name} ${p1} – ${p2} ${series.value.player2_name}`;
});

// Allowed score combinations and every required file present
const isValid = computed(() => {
  if (!scoreFormValid.value) return false;
  const [p1, p2] = reportedScore.value;
  if (!isValidResult(p1, p2, seriesWins.value)) return false;
  const played = replaysNeeded(p1, p2);
  for (let game = 1; game <= played; game++) if (needsFile(game) && !hasReplay(game)) return false;
  return true;
});

defineExpose({ open });
</script>

<style scoped>
/* Truncate long filenames in file input */
:deep(.v-file-input .v-field__input) {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

:deep(.v-file-input .v-field__input > input) {
  text-overflow: ellipsis;
}
</style>
