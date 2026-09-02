<template>
  <v-container fluid class="pa-4">
    <v-row class="mb-4">
      <v-col class="d-flex align-center flex-wrap ga-3">
        <h1 class="d-flex align-center ga-2">
          <v-icon>mdi-map-outline</v-icon>
          Map Veto
        </h1>
        <span v-if="board" class="d-flex align-center ga-2 text-medium-emphasis">
          <PlayerName :player="board.player1" />
          <span>vs</span>
          <PlayerName :player="board.player2" />
        </span>
        <v-spacer />
        <v-chip v-if="board" :color="statusColor" variant="tonal">{{ statusLine }}</v-chip>
        <v-btn
          v-if="canRecord"
          :variant="recording ? 'flat' : 'outlined'"
          color="warning"
          size="small"
          prepend-icon="mdi-chat-processing-outline"
          @click="recording = !recording"
        >
          {{ recording ? 'Entering a veto done elsewhere' : 'Enter a veto done elsewhere' }}
        </v-btn>
        <v-btn
          v-if="board?.complete && route.query.report"
          color="primary"
          size="small"
          prepend-icon="mdi-scoreboard-outline"
          :to="{ path: '/player-dashboard', query: token ? { token, report: route.params.id } : { report: route.params.id } }"
        >
          Report result
        </v-btn>
        <v-btn
          v-if="canUndo"
          variant="outlined"
          size="small"
          prepend-icon="mdi-undo"
          :loading="saving"
          :disabled="saving"
          @click="send({ action: 'undo' })"
        >
          Undo
        </v-btn>
      </v-col>
    </v-row>

    <StatusAlert v-model="errorMessage" />

    <div v-if="!board && !errorMessage" class="d-flex justify-center pa-8">
      <v-progress-circular color="primary" indeterminate size="64" />
    </div>

    <v-row v-if="board">
      <v-col cols="12" md="8">
        <v-card elevation="2">
          <v-card-title class="bg-primary d-flex justify-space-between align-center">
            <div class="d-flex align-center">
              <v-icon class="mr-2">mdi-map</v-icon>
              <span>Map Pool</span>
            </div>
            <v-chip color="white" variant="outlined">{{ poolChip }}</v-chip>
          </v-card-title>
          <v-card-text class="d-flex flex-wrap ga-3 pt-4">
            <v-sheet
              v-for="tile in tiles"
              :key="tile.id"
              border
              rounded
              class="pa-3 map-tile"
              :class="{ 'bg-grey-lighten-4': tile.banned, 'week-map': tile.week }"
            >
              <div class="thumb rounded bg-grey-darken-4">
                <img v-if="mapImage(tile.id)" :src="mapImage(tile.id)" :alt="tile.name" :class="{ dim: tile.banned }" @error="hideMissingImage">
                <v-chip class="shortname" size="x-small" label>{{ tile.shortname }}</v-chip>
              </div>
              <div
                class="text-subtitle-2 mt-2"
                :class="{ 'text-decoration-line-through text-medium-emphasis': tile.banned }"
              >
                {{ tile.name }}
              </div>
              <div class="d-flex align-center justify-space-between ga-2 mt-2 tile-foot">
                <span class="text-caption text-medium-emphasis">{{ tile.sub }}</span>
                <v-chip v-if="tile.tag" size="x-small" variant="tonal" :color="tile.week ? 'primary' : 'success'">
                  {{ tile.tag }}
                </v-chip>
                <v-btn
                  v-else-if="tile.canAct"
                  size="small"
                  variant="outlined"
                  :color="nextAction === 'Pick' ? 'success' : 'error'"
                  :loading="saving"
                  :disabled="saving"
                  @click="send({ action: recording ? 'record' : 'step', map_id: tile.id })"
                >
                  {{ nextAction }}
                </v-btn>
              </div>
            </v-sheet>
          </v-card-text>
        </v-card>
      </v-col>

      <v-col cols="12" md="4">
        <v-card elevation="2" class="mb-6">
          <v-card-title class="bg-primary">
            <v-icon class="mr-2">mdi-format-list-numbered</v-icon>
            Order
          </v-card-title>
          <v-list density="compact">
            <v-list-item
              v-for="row in orderRows"
              :key="row.n"
              :class="{ 'bg-blue-lighten-5': row.current }"
            >
              <template #prepend>
                <v-icon size="small" class="mr-3" :color="row.done ? 'success' : undefined">
                  {{ row.done ? 'mdi-check-circle' : 'mdi-circle-outline' }}
                </v-icon>
              </template>
              <v-list-item-title class="d-flex align-center ga-2">
                <v-chip size="x-small" variant="tonal" :color="row.action === 'Ban' ? 'error' : 'success'">
                  {{ row.action }}
                </v-chip>
                <span>{{ row.who }}</span>
                <v-spacer />
                <span class="text-caption" :class="{ 'text-medium-emphasis': !row.done }">{{ row.map }}</span>
              </v-list-item-title>
              <v-list-item-subtitle v-if="row.enteredBy">Entered by {{ row.enteredBy }}</v-list-item-subtitle>
            </v-list-item>
          </v-list>
        </v-card>

        <v-card elevation="2">
          <v-card-title class="bg-primary">
            <v-icon class="mr-2">mdi-tournament</v-icon>
            Series
          </v-card-title>
          <v-list density="compact">
            <v-list-item v-for="game in games" :key="game.label">
              <template #prepend>
                <span class="text-caption text-medium-emphasis mr-3 game-label">{{ game.label }}</span>
                <img
                  v-if="mapImage(game.mapId)"
                  class="mini rounded mr-3"
                  :src="mapImage(game.mapId)"
                  :alt="game.name"
                  @error="hideMissingImage"
                >
              </template>
              <v-list-item-title :class="{ 'text-medium-emphasis': !game.mapId }">{{ game.name }}</v-list-item-title>
              <v-list-item-subtitle v-if="game.source">{{ game.source }}</v-list-item-subtitle>
            </v-list-item>
          </v-list>

          <v-table v-if="showPicks" density="compact">
            <thead>
              <tr>
                <th>Player</th>
                <th>Map if they lose</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="pick in picks" :key="pick.side">
                <td>{{ pick.who }}</td>
                <td :class="{ 'text-medium-emphasis': !pick.map }">{{ pick.map || 'Not picked' }}</td>
              </tr>
            </tbody>
          </v-table>
        </v-card>
      </v-col>
    </v-row>
  </v-container>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted } from 'vue';
import { useRoute } from 'vue-router';
import { fetchWrapper } from '@/helpers';
import { hideMissingImage } from '@/helpers/team-image';
import { useMapStore } from '@/stores';
import PlayerName from '@/components/PlayerName.vue';
import StatusAlert from '@/components/StatusAlert.vue';

const route = useRoute();
const backendUrl = import.meta.env.VITE_BACKEND_URL;
const mapStore = useMapStore();

const board = ref(null);
const errorMessage = ref(null);
const saving = ref(false);
// a veto done in a chat is typed in by one player for both sides, in the season's order
const recording = ref(!!route.query.report);  // the Report Result dialog sends the player here to enter it

// the dashboard link carries its token; a session reads the board without one
const token = route.query.token;
const vetoUrl = `${backendUrl}/player-series/${route.params.id}/veto`;
// the board payload names maps only on the steps taken, so the pool is labelled from /maps
const mapsById = computed(() => new Map(mapStore.maps.map(map => [map.id, map])));
const mapName = (id) => mapsById.value.get(id)?.name || `Map ${id}`;
const mapImage = (id) => mapsById.value.get(id)?.image;

const order = computed(() => board.value?.order || []);
const taken = computed(() => board.value?.steps || []);
const stepByMap = computed(() => new Map(taken.value.map(step => [step.map_id, step])));
const rules = computed(() => (board.value?.map_rules || '').split(',').map(rule => rule.trim()).filter(Boolean));

const entrySide = (entry) => (entry || '').split('_').pop().toUpperCase();
const sideName = (side) => (side === 'A' ? board.value?.player1 : board.value?.player2)?.name || `Player ${side}`;
const nextAction = computed(() => (order.value[taken.value.length] || '').split('_')[0]);

const viewerId = computed(() => (board.value?.viewer_side === 'A' ? board.value?.player1 : board.value?.player2)?.id);
const playerId = (side) => (side === 'A' ? board.value?.player1 : board.value?.player2)?.id;
const canRecord = computed(() => !!board.value?.viewer_side && !board.value?.complete);

const statusLine = computed(() => {
  if (board.value?.complete) return 'Veto complete';
  if (recording.value) return `${nextAction.value} for ${sideName(entrySide(order.value[taken.value.length]))}`;
  if (board.value?.on_turn) return `Your turn: ${nextAction.value} a map`;
  return `Waiting for ${sideName(entrySide(order.value[taken.value.length]))}`;
});
const statusColor = computed(() => (board.value?.complete ? 'success' : recording.value ? 'warning' : board.value?.on_turn ? 'primary' : undefined));

// the last step can be taken back by the side it belongs to or by whoever entered it
const canUndo = computed(() => {
  const last = taken.value[taken.value.length - 1];
  return !!last && (last.side === board.value?.viewer_side || last.entered_by === viewerId.value);
});

const poolChip = computed(() => {
  const inVeto = (board.value?.pool || []).length - (board.value?.week_map_id ? 1 : 0);
  const banTotal = order.value.filter(entry => /^ban/i.test(entry)).length;
  const bansDone = taken.value.filter(step => step.action === 'ban').length;
  return `${inVeto} in the veto, ${bansDone} of ${banTotal} banned`;
});

// the week map stays on the board as game 1; every other used map is dimmed or tagged
const tiles = computed(() => (board.value?.pool || []).map((id) => {
  const step = stepByMap.value.get(id);
  const week = id === board.value?.week_map_id;
  const banned = step?.action === 'ban';
  const picked = step?.action === 'pick';
  return {
    id,
    week,
    banned,
    name: mapName(id),
    shortname: mapsById.value.get(id)?.shortname || '',
    sub: week ? 'Week map'
      : banned ? `Banned by ${sideName(step.side)}`
        : picked ? 'Picked'
          : board.value?.complete ? 'Unused' : 'Available',
    tag: week ? 'Game 1' : picked ? sideName(step.side) : null,
    canAct: !week && !step && (recording.value ? canRecord.value : !!board.value?.on_turn)
  };
}));

const orderRows = computed(() => order.value.map((entry, index) => {
  const step = taken.value[index];
  const action = entry.split('_')[0];
  const current = index === taken.value.length;
  return {
    n: index + 1,
    action,
    done: !!step,
    current,
    who: sideName(entrySide(entry)),
    map: step ? mapName(step.map_id) : current ? `To ${action.toLowerCase()}` : '',
    // a step typed in for the other side names who entered it
    enteredBy: step?.entered_by && step.entered_by !== playerId(step.side) ? sideName(step.entered_by === board.value?.player1?.id ? 'A' : 'B') : null
  };
}));

// one row per map rule: a week rule names its map, a veto rule takes the picks then what is left,
// and a loser rule is only decided at play time
const games = computed(() => {
  const picksMade = taken.value.filter(step => step.action === 'pick');
  const leftOver = (board.value?.pool || []).filter(id => !stepByMap.value.has(id) && id !== board.value?.week_map_id);
  let nextPick = 0;
  let nextLeft = 0;

  return rules.value.map((rule, index) => {
    let mapId = null;
    let source = 'Host picks';

    if (rule === 'week') {
      mapId = board.value?.week_map_id;
      source = 'Week map';
    } else if (rule === 'loser') {
      source = 'Loser picks';
    } else if (rule === 'veto') {
      if (nextPick < picksMade.length) {
        const step = picksMade[nextPick++];
        mapId = step.map_id;
        source = `Pick, ${sideName(step.side)}`;
      } else if (nextLeft < leftOver.length) {
        mapId = leftOver[nextLeft++];
        source = 'Left over';
      } else {
        source = 'Not decided';
      }
    }

    return { label: `Game ${index + 1}`, mapId, name: mapId ? mapName(mapId) : source, source: mapId ? source : '' };
  });
});

const showPicks = computed(() => rules.value.includes('loser') && order.value.some(entry => /^pick/i.test(entry)));
const picks = computed(() => ['A', 'B'].map((side) => {
  const step = taken.value.find(row => row.action === 'pick' && row.side === side);
  return { side, who: sideName(side), map: step ? mapName(step.map_id) : null };
}));

const load = async () => {
  try {
    board.value = await fetchWrapper.get(token ? `${vetoUrl}?token=${encodeURIComponent(token)}` : vetoUrl);
    errorMessage.value = null;
  } catch (error) {
    errorMessage.value = error.message || 'Error loading the map veto.';
  }
};

const send = async (body) => {
  saving.value = true;
  try {
    board.value = await fetchWrapper.put(vetoUrl, token ? { ...body, token } : body);
    errorMessage.value = null;
  } catch (error) {
    errorMessage.value = error.message || 'Error saving the step.';
  } finally {
    saving.value = false;
  }
};

// the other player's steps arrive by poll; a step of the viewer's own comes back on the PUT
let timer = null;
const poll = () => {
  if (document.hidden || saving.value || recording.value || !board.value || board.value.complete || board.value.on_turn) return;
  load();
};

onMounted(async () => {
  mapStore.fetchMaps().catch(() => {});  // names and shortnames for the pool
  await load();
  timer = setInterval(poll, 5000);
});

onUnmounted(() => clearInterval(timer));
</script>

<style scoped>
.map-tile {
  width: 190px;
}

.week-map {
  border-color: rgb(var(--v-theme-primary)) !important;
}

.thumb {
  position: relative;
  height: 66px;
  overflow: hidden;
}

.thumb img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  display: block;
}

.thumb img.dim {
  filter: grayscale(1);
  opacity: 0.4;
}

.shortname {
  position: absolute;
  left: 4px;
  bottom: 4px;
}

.tile-foot {
  min-height: 32px;
}

.game-label {
  width: 52px;
}

.mini {
  width: 62px;
  height: 40px;
  object-fit: cover;
}
</style>
