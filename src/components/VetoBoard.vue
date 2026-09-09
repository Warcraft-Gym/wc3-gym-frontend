<template>
  <div>
    <v-row class="mb-4">
      <v-col class="d-flex align-center flex-wrap ga-3">
        <slot />
        <span v-if="board" class="d-flex align-center ga-2 text-medium-emphasis">
          <PlayerName :player="board.player1" />
          <span>vs</span>
          <PlayerName :player="board.player2" />
        </span>
        <v-spacer />
        <v-chip v-if="board && !collapsed" :color="statusColor" variant="tonal">{{ statusLine }}</v-chip>
        <v-chip v-if="report && !board?.complete" color="warning" variant="flat" size="small" prepend-icon="mdi-chat-processing-outline">
          Entering a veto done elsewhere
        </v-chip>
        <v-btn
          v-if="canRecord && !report"
          :variant="recording ? 'flat' : 'outlined'"
          color="warning"
          size="small"
          :prepend-icon="auth.isAdmin ? 'mdi-shield-account-outline' : 'mdi-chat-processing-outline'"
          @click="recording = !recording"
        >
          {{ auth.isAdmin ? 'Admin mode' : 'Enter a veto from chat' }}
        </v-btn>
        <v-btn
          v-if="canUndo"
          variant="outlined"
          size="small"
          prepend-icon="mdi-undo"
          @click="send({ action: 'undo' })"
        >
          Undo
        </v-btn>
      </v-col>
    </v-row>

    <StatusAlert v-model="errorMessage" />

    <div v-if="board && !collapsed" ref="stripRef" class="order-strip mb-6">
      <div v-for="lane in lanes" :key="lane.side" class="lane">
        <div class="lane-name text-caption text-truncate" :class="lane.onTurn ? 'font-weight-bold' : 'text-medium-emphasis'">{{ lane.who }}</div>
        <div class="lane-steps">
        <div
          v-for="row in orderRows"
          :key="row.n"
          class="step"
          :class="{
            'step--mine': row.side === lane.side,
            'step--ban': row.action === 'Ban',
            'step--current': row.current,
            'step--todo': !row.done && !row.current,
          }"
          :title="row.side === lane.side ? [row.action, row.map, row.note].filter(Boolean).join(' — ') : undefined"
        >
          <template v-if="row.side === lane.side">
            <img v-if="row.done && mapImage(row.mapId)" :src="mapImage(row.mapId)" :alt="row.map" @error="hideMissingImage">
            <span v-if="row.done" class="step-tag">{{ row.shortname }}</span>
            <span v-else-if="row.current" class="step-now">{{ row.action }}</span>
          </template>
        </div>
        </div>
      </div>
    </div>

    <div v-if="!board && !errorMessage" class="d-flex justify-center pa-8">
      <v-progress-circular color="primary" indeterminate size="64" />
    </div>

    <v-row v-if="board">
      <v-col v-if="!collapsed" cols="12" md="8">
        <v-card elevation="2">
          <v-card-title class="bg-primary">
            <v-icon class="mr-2">mdi-map</v-icon>
            Map Pool
          </v-card-title>
          <v-card-text class="d-flex flex-wrap ga-3 pt-4">
            <v-sheet
              v-for="tile in tiles"
              :key="tile.id"
              border
              rounded
              class="pa-3 map-tile"
              :class="{ 'banned-map': tile.banned, 'week-map': tile.week }"
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
              <div v-if="tile.step || tile.sub || tile.week || tile.canAct" class="d-flex align-center justify-space-between ga-2 mt-2 tile-foot">
                <span v-if="tile.step" class="d-flex align-center ga-2 text-caption">
                  <v-chip size="x-small" variant="tonal" :color="tile.banned ? 'error' : 'success'">
                    {{ tile.banned ? 'Ban' : 'Pick' }}
                  </v-chip>
                  {{ sideName(tile.step.side) }}
                </span>
                <span v-else class="text-caption text-medium-emphasis">{{ tile.sub }}</span>
                <v-chip v-if="tile.week" size="x-small" variant="tonal" color="primary">Game 1</v-chip>
                <v-btn
                  v-else-if="tile.canAct"
                  variant="outlined"
                  :color="nextAction === 'Pick' ? 'success' : 'error'"
                  @click="send({ action: recording ? 'record' : 'step', map_id: tile.id })"
                >
                  {{ nextAction }}
                </v-btn>
              </div>
              <div v-if="tile.note" class="text-caption text-medium-emphasis">{{ tile.note }}</div>
            </v-sheet>
          </v-card-text>
        </v-card>
      </v-col>

      <v-col cols="12" :md="collapsed ? 12 : 4">
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
                <td :class="{ 'text-medium-emphasis': !pick.mapId }">
                  <span class="d-flex align-center py-1">
                    <img
                      v-if="mapImage(pick.mapId)"
                      class="mini rounded mr-3"
                      :src="mapImage(pick.mapId)"
                      :alt="pick.map"
                      @error="hideMissingImage"
                    >
                    {{ pick.map || 'Not picked' }}
                  </span>
                </td>
              </tr>
            </tbody>
          </v-table>
        </v-card>
      </v-col>
    </v-row>
  </div>
</template>

<script setup>
import { ref, computed, watch, nextTick, onMounted, onUnmounted } from 'vue';
import { backendUrl, fetchWrapper } from '@/helpers';
import { DEFAULT_RULES } from '@/helpers/best-of.mjs';
import { hideMissingImage } from '@/helpers/team-image';
import { useAuthStore, useMapStore } from '@/stores';
import PlayerName from '@/components/PlayerName.vue';
import StatusAlert from '@/components/StatusAlert.vue';

// report: the board sits inside Report Result; the reporter enters both sides, then only the series shows
const props = defineProps({
  seriesId: { type: [Number, String], required: true },
  report: Boolean,
});
const emit = defineEmits(['change']);

const mapStore = useMapStore();
const auth = useAuthStore();

const board = ref(null);
const errorMessage = ref(null);
const pending = ref(0);  // writes not yet answered
// a veto done in a chat is typed in by one player for both sides, in the season's order
const recording = ref(props.report);
// an admin records either side from the match page, but only behind the same toggle as a player
const admin = computed(() => auth.isAdmin && recording.value);
const collapsed = computed(() => props.report && !!board.value?.complete);

const vetoUrl = `${backendUrl}/player-series/${props.seriesId}/veto`;
// the board payload names maps only on the steps taken, so the pool is labelled from /maps
const mapsById = computed(() => new Map(mapStore.maps.map(map => [map.id, map])));
const mapName = (id) => mapsById.value.get(id)?.name || `Map ${id}`;
const mapImage = (id) => mapsById.value.get(id)?.image;

const order = computed(() => board.value?.order || []);
const taken = computed(() => board.value?.steps || []);
const stepByMap = computed(() => new Map(taken.value.map(step => [step.map_id, step])));
const rules = computed(() => (board.value?.map_rules || DEFAULT_RULES).split(',').map(rule => rule.trim()).filter(Boolean));

const entrySide = (entry) => (entry || '').split('_').pop().toUpperCase();
const sideName = (side) => (side === 'A' ? board.value?.player1 : board.value?.player2)?.name || `Player ${side}`;
const nextAction = computed(() => (order.value[taken.value.length] || '').split('_')[0]);

const viewerId = computed(() => (board.value?.viewer_side === 'A' ? board.value?.player1 : board.value?.player2)?.id);
const playerId = (side) => (side === 'A' ? board.value?.player1 : board.value?.player2)?.id;
const canRecord = computed(() => (auth.isAdmin || !!board.value?.viewer_side) && !board.value?.complete);

const statusLine = computed(() => {
  if (board.value?.complete) return 'Veto complete';
  if (recording.value) return `${admin.value ? 'Admin: ' : ''}${nextAction.value} for ${sideName(entrySide(order.value[taken.value.length]))}`;
  if (board.value?.on_turn) return `Your turn: ${nextAction.value} a map`;
  return `Waiting for ${sideName(entrySide(order.value[taken.value.length]))}`;
});
const statusColor = computed(() => (board.value?.complete ? 'success' : recording.value ? 'warning' : board.value?.on_turn ? 'primary' : undefined));

// the last step takes itself when the order uses up the board: its map was the only one left
const forcedLast = computed(() => order.value.length >= 2 && taken.value.length === order.value.length
  && order.value.length === (board.value?.pool || []).length - (board.value?.week_map_id ? 1 : 0));

// the last step can be taken back by the side it belongs to or by whoever entered it;
// a forced last step goes with the step that forced it
const canUndo = computed(() => {
  const last = taken.value[taken.value.length - (forcedLast.value ? 2 : 1)];
  return !!last && (admin.value || last.side === board.value?.viewer_side || last.entered_by === viewerId.value);
});

// a step typed in for the other side names who entered it; an admin who plays neither side is "an admin"
const enteredBy = (step) => {
  if (!step?.entered_by || step.entered_by === playerId(step.side)) return null;
  const side = ['A', 'B'].find(s => playerId(s) === step.entered_by);
  return side ? sideName(side) : 'an admin';
};


// the fixed map of the week stays on the board as game 1; every other used map is dimmed or tagged
const tiles = computed(() => (board.value?.pool || []).map((id) => {
  const step = stepByMap.value.get(id);
  const week = id === board.value?.week_map_id;
  return {
    id,
    week,
    step,
    banned: step?.action === 'ban',
    note: step && (forcedLast.value && step === taken.value[taken.value.length - 1]
      ? 'Only map left'
      : enteredBy(step) && `Entered by ${enteredBy(step)}`),
    name: mapName(id),
    shortname: mapsById.value.get(id)?.shortname || '',
    sub: week ? 'Fixed map' : board.value?.complete ? 'Unused' : '',
    // no action once every entry of the order is taken, even before the server confirms the last one
    canAct: !week && !step && !!order.value[taken.value.length] && (recording.value ? canRecord.value : !!board.value?.on_turn)
  };
}));

const stripRef = ref(null);
// season.pick_ban sets the order, so its length varies; a long one scrolls and the live step leads
watch(() => taken.value.length, () => nextTick(() => {
  const current = stripRef.value?.querySelector('.step--current');
  if (!current) return;
  const left = current.offsetLeft - current.offsetWidth;
  stripRef.value.querySelectorAll('.lane-steps').forEach((lane) => { lane.scrollLeft = left; });
}), { immediate: true });

const lanes = computed(() => ['A', 'B'].map(side => ({
  side,
  who: sideName(side),
  onTurn: entrySide(order.value[taken.value.length] || '') === side,
})));

const orderRows = computed(() => order.value.map((entry, index) => {
  const step = taken.value[index];
  const action = entry.split('_')[0];
  const current = index === taken.value.length;
  return {
    n: index + 1,
    action,
    done: !!step,
    current,
    side: entrySide(entry),
    who: sideName(entrySide(entry)),
    mapId: step?.map_id,
    shortname: step ? mapsById.value.get(step.map_id)?.shortname || '' : '',
    map: step ? mapName(step.map_id) : current ? `To ${action.toLowerCase()}` : '',
    // the forced last step names nobody: its map was the only one left
    note: forcedLast.value && index === order.value.length - 1 ? 'Only map left' : enteredBy(step) && `Entered by ${enteredBy(step)}`
  };
}));

// one row per map rule: a week rule names its map, a veto rule takes the picks then, once the veto
// is complete, what is left; a loser rule is only decided at play time
const games = computed(() => {
  const picksMade = taken.value.filter(step => step.action === 'pick');
  const leftOver = board.value?.complete
    ? board.value.pool.filter(id => !stepByMap.value.has(id) && id !== board.value.week_map_id)
    : [];
  let nextPick = 0;
  let nextLeft = 0;

  return rules.value.map((rule, index) => {
    let mapId = null;
    let source = 'Host picks';

    if (rule === 'week') {
      mapId = board.value?.week_map_id;
      source = 'Fixed map';
    } else if (rule === 'loser') {
      source = index ? `Loser of game ${index} picks` : 'Loser picks';
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
  return { side, who: sideName(side), mapId: step?.map_id, map: step ? mapName(step.map_id) : null };
}));

const load = async () => {
  try {
    board.value = await fetchWrapper.get(vetoUrl);
    errorMessage.value = null;
    emit('change', board.value);
  } catch (error) {
    errorMessage.value = error.message || 'Error loading the map veto.';
  }
};

// the board shows a step the moment it is clicked; writes go out one after the other, each
// answer replaces the guess, and a refused write reloads the board from the server
let chain = Promise.resolve();
const send = (body) => {
  const entry = order.value[taken.value.length];
  if (body.map_id && entry) {
    const step = { side: entrySide(entry), action: entry.split('_')[0].toLowerCase(), map_id: body.map_id, entered_by: viewerId.value };
    board.value = { ...board.value, steps: [...taken.value, step], on_turn: recording.value && board.value.on_turn };
  } else if (body.action === 'undo') {
    board.value = { ...board.value, steps: taken.value.slice(0, -1) };
  }
  pending.value += 1;
  chain = chain.then(async () => {
    try {
      board.value = await fetchWrapper.put(vetoUrl, body);
      errorMessage.value = null;
      emit('change', board.value);
    } catch (error) {
      errorMessage.value = error.message || 'Error saving the step.';
      await load();
    } finally {
      pending.value -= 1;
    }
  });
  return chain;
};

// the other player's steps arrive by poll; a step of the viewer's own comes back on the PUT;
// a recorder polls on their own turn too, since the other side may be entering the same veto
let timer = null;
const poll = () => {
  if (document.hidden || pending.value || !board.value || board.value.complete) return;
  if (board.value.on_turn && !recording.value) return;
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
/* the veto order, one lane per player: a step sits in its own lane and the columns keep the order */
.order-strip {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.lane {
  display: flex;
  align-items: center;
  gap: 6px;
}

.lane-steps {
  display: flex;
  gap: 6px;
  overflow-x: auto;
  scrollbar-width: none;
  padding-bottom: 2px;
}

.lane-steps::-webkit-scrollbar {
  display: none;
}

.lane-name {
  width: 104px;
  flex: none;
  text-align: right;
  padding-right: 4px;
}

.step {
  position: relative;
  width: 44px;
  height: 44px;
  flex: none;
  border-radius: 4px;
}

.step--mine {
  border: 1px solid rgba(var(--v-border-color), 0.35);
  overflow: hidden;
}

.step--mine.step--todo {
  border-style: dashed;
}

.step--mine.step--current {
  border-width: 2px;
  border-color: rgb(var(--v-theme-error));
}

.step--mine.step--current:not(.step--ban) {
  border-color: rgb(var(--v-theme-success));
}

.step img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  display: block;
}

.step--ban img {
  filter: grayscale(0.9);  /* a ban spends the map, so it reads as muted, still readable */
  opacity: 0.75;
}

/* a phone has no room for a name column beside eight slots, so the name goes above its lane */
@media (max-width: 600px) {
  .lane {
    flex-direction: column;
    align-items: flex-start;
    gap: 2px;
  }

  .lane-name {
    width: auto;
    text-align: left;
    padding-right: 0;
  }

  .step {
    width: 38px;
    height: 38px;
  }

  .lane-steps {
    gap: 4px;
  }
}

.step-tag {
  position: absolute;
  left: 2px;
  bottom: 2px;
  padding: 0 3px;
  border-radius: 2px;
  background: rgba(0, 0, 0, 0.65);
  color: #fff;
  font-size: 9px;
  line-height: 13px;
}

.step-now {
  position: absolute;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 11px;
  font-weight: 500;
  color: rgb(var(--v-theme-error));
}

.step--current:not(.step--ban) .step-now {
  color: rgb(var(--v-theme-success));
}

.map-tile {
  width: calc(50% - 6px);
  max-width: 190px;
}

.week-map {
  border-color: rgb(var(--v-theme-primary)) !important;
}

.thumb {
  position: relative;
  aspect-ratio: 1;  /* the map pictures are square; a fixed height cropped the minimap */
  overflow: hidden;
}

.thumb img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  display: block;
}

.thumb img.dim {
  filter: grayscale(0.9);
  opacity: 0.75;
}

.banned-map {
  opacity: 0.7;  /* theme-aware: a fixed grey turned the tile white on the dark theme */
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
