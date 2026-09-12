<!-- A side reports its own series: the veto above, then per game the winner, the map and the
     replay. Both the player dashboard and an event series page open this one dialog. -->
<template>
  <v-dialog :model-value="modelValue" :max-width="vetoMissing ? 960 : 600" @update:model-value="close">
    <v-card>
      <v-card-title class="bg-primary">
        <v-icon class="mr-2">mdi-trophy</v-icon>
        Report result
      </v-card-title>
      <v-card-text class="pt-4">
        <v-alert
          v-if="veto"
          :type="veto.complete ? 'success' : 'warning'"
          variant="tonal"
          density="compact"
          class="mb-2"
        >
          {{ veto.complete ? 'Map veto complete' : 'The map veto is not complete. Enter it below, or report without it.' }}
        </v-alert>
        <VetoBoard v-if="form.id" :key="form.id" :series-id="form.id" report class="mb-4" @change="board => veto = board" />
        <v-form v-model="formValid">
          <v-container>
            <v-row v-if="!form.raceOpen">
              <v-col cols="12" class="pt-0">
                <v-btn variant="text" size="small" density="comfortable" prepend-icon="mdi-account-switch" @click="form.raceOpen = true">
                  Played a different race
                </v-btn>
              </v-col>
            </v-row>
            <v-row v-else>
              <v-col cols="6">
                <RaceSelect v-model="form.races.player1" :label="form.player1_name || ''" density="comfortable" />
              </v-col>
              <v-col cols="6">
                <RaceSelect v-model="form.races.player2" :label="form.player2_name || ''" density="comfortable" />
              </v-col>
            </v-row>
            <v-row v-for="game in gameRows" :key="game">
              <v-col cols="12">
                <v-card variant="outlined">
                  <v-card-text class="py-3">
                    <div class="text-subtitle-2 mb-2">Game {{ game }}</div>
                    <v-btn-toggle
                      :model-value="form.winners[game - 1]"
                      color="primary"
                      divided
                      variant="outlined"
                      density="comfortable"
                      class="d-flex mb-3"
                      @update:model-value="setWinner(game, $event)"
                    >
                      <v-btn value="A" class="flex-grow-1">{{ form.player1_name }} won</v-btn>
                      <v-btn value="B" class="flex-grow-1">{{ form.player2_name }} won</v-btn>
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
                      v-model="form.replays[game]"
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
        <v-btn variant="text" :disabled="saving" @click="close">Cancel</v-btn>
        <v-btn :color="vetoMissing ? 'warning' : 'primary'" variant="elevated" prepend-icon="mdi-content-save" :disabled="!isValid || saving" :loading="saving" @click="saveResult">{{ vetoMissing ? 'Report without a veto' : 'Save result' }}</v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>

<script setup>
import { computed, ref, watch } from 'vue';

import RaceSelect from '@/components/RaceSelect.vue';
import VetoBoard from '@/components/VetoBoard.vue';
import { backendUrl, fetchWrapper } from '@/helpers';
import { isValidResult, replaysNeeded, winsOf } from '@/helpers/best-of';
import { authHeader } from '@/helpers/fetch-wrapper';
import { gameSlots, gamesReported, mapsByGame, picksOf, scoreOf } from '@/helpers/map-order.mjs';
import { isOtherSeries, matchMap, readReplay } from '@/helpers/w3g.mjs';
import { useMapStore } from '@/stores';

const props = defineProps({
  modelValue: Boolean,
  // the series to report: ids, the two players, their races and the score it already carries
  series: { type: Object, default: null },
});
const emit = defineEmits(['update:modelValue', 'update:saving', 'saved', 'error']);

const mapStore = useMapStore();

const blank = () => ({ replays: {}, races: {}, winners: [], maps: {}, reads: {}, tags: [], storedGames: '[]' });
const form = ref(blank());
const veto = ref(null);
const vetoMissing = computed(() => !veto.value?.complete);
const saving = ref(false);
const formValid = ref(true);

const rules = {
  required: (value) => !!value || 'This field is required',
  w3gFile: (value) => {
    if (!value || !(value instanceof File)) return true;
    return value.name.toLowerCase().endsWith('.w3g') || 'Only .w3g replay files are allowed';
  },
};

// The dialog opens on the series it was given, and the games it already recorded follow
watch(() => [props.modelValue, props.series?.id], ([open]) => {
  if (!open || !props.series) return;
  const item = props.series;
  form.value = {
    ...blank(),
    id: item.id,
    player1_name: item.player1?.name || `Player ${item.player1_id}`,
    player2_name: item.player2?.name || `Player ${item.player2_id}`,
    // the tags name the sides in a replay, which carries no player id of ours
    tags: [item.player1?.battleTag, item.player2?.battleTag],
    // an event series carries the map rules of its stage; a GNL series those of its season
    map_rules: item.map_rules ?? item.match?.season?.map_rules,
    // the race each side played; the panel opens by itself when one is an exception
    races: { player1: item.player1_race, player2: item.player2_race },
    raceOpen: !!(item.player1_off_race || item.player2_off_race),
    // games already reported: their stored replays stay unless a new file is picked
    reported: item.player1_score != null && item.player2_score != null ? item.player1_score + item.player2_score : 0,
  };
  veto.value = null;
  // the report names a map per game, so the pool must be loaded before the selects draw
  if (!mapStore.maps.length) mapStore.fetchMaps().catch(() => {});
  loadGames(item.id);
}, { immediate: true });

// A series reported before opens on the games it recorded, so a fix starts from them
const loadGames = async (id) => {
  let games = [];
  try {
    games = await fetchWrapper.get(`${backendUrl}/series/${id}/games`);
  } catch {
    return;  // a series with no games recorded answers nothing to start from
  }
  if (form.value.id !== id) return;  // the dialog moved on while the read was out
  for (const game of games) {
    form.value.winners[game.game_no - 1] = game.winner_side;
    if (game.map_id) form.value.maps[game.game_no] = game.map_id;
  }
  form.value.storedGames = JSON.stringify(gamesReported(form.value.winners, mapOf));
};

const close = () => {
  emit('update:modelValue', false);
  form.value = blank();
};

// A picked replay says which map was played. It never blocks a report: the file is the
// evidence, but a player who names something else may be right and the parse may be wrong.
const readGameReplay = async (game, file) => {
  delete form.value.reads[game];
  if (!(file instanceof File)) return;
  const series = form.value.id;
  const read = await readReplay(file).catch(() => null);
  if (!read || form.value.id !== series) return;  // the dialog moved on, or not a replay
  form.value.reads[game] = read;
  // the replay beats the season's rule, but never a map the reporter named himself
  const map = matchMap(read.mapPath, mapStore.maps);
  if (map && !form.value.maps[game]) form.value.maps[game] = map.id;
};

// Says where the map came from when the replay named it, so a changed field is not a surprise
const mapHint = (game) => {
  const read = form.value.reads?.[game];
  const played = read && matchMap(read.mapPath, mapStore.maps);
  return played && played.id === form.value.maps[game] ? 'Read from the replay' : undefined;
};

// What the replay disagrees with, or null
const replayNote = (game) => {
  const read = form.value.reads?.[game];
  if (!read) return null;
  if (isOtherSeries(read.tags, form.value.tags)) {
    return `This replay is ${read.tags.join(' against ')}. It is not this series.`;
  }
  const played = matchMap(read.mapPath, mapStore.maps);
  if (played && form.value.maps[game] && form.value.maps[game] !== played.id) {
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
    headers: { 'Content-Type': 'application/octet-stream', 'Content-Disposition': `attachment; filename="game${game}.w3g"` }
  });
  if (!put.ok) throw new Error(`Game ${game} replay upload failed`);
};

const busy = (on) => {
  saving.value = on;
  emit('update:saving', on ? form.value.id : null);
};

const saveResult = async () => {
  busy(true);
  try {
    const [p1, p2] = reportedScore.value;
    const games = gamesReported(form.value.winners, mapOf);

    const played = replaysNeeded(p1, p2);
    for (let game = 1; game <= played; game++) {
      if (needsFile(game) && !hasReplay(game)) {
        emit('error', `Game ${game} replay file is required for a ${p1}:${p2} result.`);
        return;
      }
    }

    const id = form.value.id;
    const uploaded = [];
    for (let game = 1; game <= played; game++) {
      if (!hasReplay(game)) continue;
      await uploadReplay(id, game, form.value.replays[game]);
      uploaded.push(game);
    }

    if (played === form.value.reported && uploaded.length && JSON.stringify(games) === form.value.storedGames) {
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
      if (form.value.raceOpen) {
        // the backend stores nothing when the race is the one he signed up on
        formData.append('player1_off_race', form.value.races.player1 || '');
        formData.append('player2_off_race', form.value.races.player2 || '');
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
    emit('error', error.message || 'Error reporting result.');
  } finally {
    busy(false);
  }
};

// The score the tapped winners add up to, the season's maps to win, and the file picked for a game
const reportedScore = computed(() => scoreOf(form.value.winners || []));
const seriesWins = computed(() => winsOf(form.value.map_rules));
const hasReplay = (game) => form.value.replays?.[game] instanceof File;
// A first report needs every game's file; a fix keeps the stored ones unless a new file is picked
const needsFile = (game) => game > (form.value.reported || 0);
const fileHint = (game) => (needsFile(game) ? undefined : 'Leave empty to keep the stored replay');

// One row per game played, plus the next while neither side has won the series
const gameRows = computed(() => gameSlots(form.value.map_rules, form.value.winners || []));

// The map the season's rules offer for each game, given the veto and who won the games before
const offeredMaps = computed(() => mapsByGame(
  form.value.map_rules,
  veto.value?.week_map_id,
  picksOf(veto.value?.steps),
  form.value.winners || []
));
const mapOf = (game) => form.value.maps?.[game] ?? offeredMaps.value[game - 1] ?? null;
const setMap = (game, mapId) => { form.value.maps[game] = mapId; };

// A changed winner reopens the games after it: they were played under a different map order
const setWinner = (game, side) => {
  const winners = form.value.winners;
  if (winners[game - 1] === side) return;
  winners[game - 1] = side || null;
  winners.length = game;
  for (const named of Object.keys(form.value.maps)) {
    if (Number(named) > game) delete form.value.maps[named];
  }
};

const scoreProblem = computed(() => {
  const [p1, p2] = reportedScore.value;
  return isValidResult(p1, p2, seriesWins.value) ? null : 'Tap the winner of each game played';
});
const resultLine = computed(() => {
  const [p1, p2] = reportedScore.value;
  return `${form.value.player1_name} ${p1} – ${p2} ${form.value.player2_name}`;
});

// Allowed score combinations and every required file picked
const isValid = computed(() => {
  if (!formValid.value) return false;
  const [p1, p2] = reportedScore.value;
  if (!isValidResult(p1, p2, seriesWins.value)) return false;
  const played = replaysNeeded(p1, p2);
  for (let game = 1; game <= played; game++) if (needsFile(game) && !hasReplay(game)) return false;
  return true;
});
</script>

<style scoped>
/* Truncate long filenames in the file input */
:deep(.v-file-input .v-field__input) {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
:deep(.v-file-input .v-field__input > input) {
  text-overflow: ellipsis;
}
</style>
