<!-- The run page: an admin generates a stage or draws a Swiss round, enters every result,
     reopens one and advances the stage. It draws each stage with the same StageView the
     public page shows. -->
<template>
  <v-container fluid class="pa-4">
    <StatusAlert v-model="error" />
    <v-progress-linear v-if="loading" indeterminate />

    <template v-if="event">
      <EventHeader :event="event" :league="league" />
      <v-btn class="mt-3" variant="outlined" color="primary" size="small"
        prepend-icon="mdi-eye-outline" :to="`/events/${event.id}`">Public page</v-btn>

      <v-tabs v-if="stages.length > 1" v-model="tab" class="mt-4" bg-color="surface-light">
        <v-tab v-for="(stage, index) in stages" :key="stage.id" :value="index">
          {{ stage.name || `Stage ${stage.position}` }}
        </v-tab>
      </v-tabs>

      <template v-if="stage">
        <div class="d-flex flex-wrap align-center ga-3 mt-4">
          <v-chip size="small" variant="tonal">{{ titleOf(FORMATS, stage.format) }}</v-chip>
          <v-chip size="small" variant="tonal">Best of {{ stage.best_of }}</v-chip>
          <v-chip v-if="entrantSeries" size="small" variant="tonal">
            {{ entrantSeries }} series each entrant a round
          </v-chip>
          <v-chip v-if="fixtureSeries" size="small" variant="tonal">
            {{ fixtureSeries }} series per fixture
          </v-chip>
          <v-chip v-if="stage.auto_advance" size="small" variant="tonal" color="info"
            prepend-icon="mdi-fast-forward">Advance is automatic</v-chip>
          <v-spacer />
          <!-- a KOTH night grows one challenger at a time and ends when the admin closes it -->
          <template v-if="isChain">
            <v-btn v-if="series.length" variant="outlined" color="primary" prepend-icon="mdi-account-plus"
              :disabled="saving" @click="openChallenger">Add challenger</v-btn>
            <v-btn variant="outlined" color="error" prepend-icon="mdi-crown-outline"
              :disabled="saving" @click="confirmClose = true">Close the night</v-btn>
          </template>
          <!-- a Swiss stage pairs one round at a time, so it is drawn round by round and
               never generated whole -->
          <v-btn v-if="drawsRounds" color="primary" prepend-icon="mdi-cards-playing-outline"
            :disabled="saving || draw.done || !!draw.blocked" @click="confirmDraw = true">
            Draw the next round
          </v-btn>
          <v-btn v-else-if="!series.length" color="primary" prepend-icon="mdi-tournament"
            :disabled="saving" @click="confirmGenerate = true">Generate</v-btn>
          <v-btn v-if="complete" color="primary" prepend-icon="mdi-arrow-right-bold"
            :disabled="saving" @click="confirmAdvance = true">Advance</v-btn>
          <!-- The event ends on its last stage, so only that stage's table pays the places -->
          <v-btn v-if="lastStage" color="primary" variant="outlined" prepend-icon="mdi-trophy"
            :disabled="saving" @click="confirmFinish = true">Finish</v-btn>
        </div>
        <p v-if="drawNote" class="text-caption text-medium-emphasis mt-1 mb-0">{{ drawNote }}</p>

        <StageView class="mt-4" :stage="stage" :series="series" :rounds="rounds"
          :divisions="event.divisions" :standings="standings" :rosters="rosters"
          @open-series="openSeries" />
      </template>
    </template>

    <!-- Generating writes every series of the stage, so it says what it is about to make -->
    <v-dialog v-model="confirmGenerate" max-width="520">
      <v-card>
        <v-card-title class="bg-primary">Generate this stage</v-card-title>
        <v-card-text class="pt-4">
          <p class="mb-3">Seeds come from {{ seedSource }}.</p>
          <v-table density="compact">
            <thead>
              <tr><th>Division</th><th class="text-right">Entrants</th><th v-if="showByes" class="text-right">Byes</th></tr>
            </thead>
            <tbody>
              <tr v-for="row in fields" :key="row.key">
                <td>{{ row.name }}</td>
                <td class="text-right">{{ row.entrants }}</td>
                <td v-if="showByes" class="text-right">{{ row.byes }}</td>
              </tr>
            </tbody>
          </v-table>
        </v-card-text>
        <v-card-actions>
          <v-spacer />
          <v-btn variant="text" @click="confirmGenerate = false">Cancel</v-btn>
          <v-btn color="primary" variant="elevated" :loading="saving" @click="generate">Generate</v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <!-- The draw pairs the round from the table as it stands, so it names the round first -->
    <v-dialog v-model="confirmDraw" max-width="520">
      <v-card>
        <v-card-title class="bg-primary">Draw round {{ draw.number }}</v-card-title>
        <v-card-text class="pt-4">
          <p class="mb-0">
            Round {{ draw.number }} pairs each entrant with the closest opponent he has not met
            yet, from the table as it stands. An odd field gives the bye to the lowest entrant
            without one.
          </p>
        </v-card-text>
        <v-card-actions>
          <v-spacer />
          <v-btn variant="text" @click="confirmDraw = false">Cancel</v-btn>
          <v-btn color="primary" variant="elevated" :loading="saving" @click="drawRound">
            Draw round {{ draw.number }}
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <!-- One more challenger at the end of his own chain -->
    <v-dialog v-model="challengerOpen" max-width="480">
      <v-card>
        <v-card-title class="bg-primary">Add challenger</v-card-title>
        <v-card-text class="pt-4">
          <StatusAlert v-model="dialogError" />
          <v-select v-model="challenger" :items="challengerItems" item-value="id" :item-title="challengerTitle"
            label="Entrant" variant="outlined" density="comfortable" hide-details>
            <template #selection="{ item }">
              <PlayerName v-if="item.raw.user" :player="item.raw.user" :race="item.raw.race" plain />
              <span v-else>{{ entrantName(item.raw) }}</span>
            </template>
            <template #item="{ props: itemProps, item }">
              <v-list-item v-bind="itemProps" :title="null">
                <PlayerName v-if="item.raw.user" :player="item.raw.user" :race="item.raw.race" plain />
                <span v-else>{{ entrantName(item.raw) }}</span>
                <div class="text-caption text-medium-emphasis">{{ entrantLine(item.raw) }}</div>
              </v-list-item>
            </template>
          </v-select>
          <p v-if="!challengerItems.length" class="text-medium-emphasis mt-3 mb-0">
            Every entrant already plays in a chain. Enter the player on the entrants page first.
          </p>
        </v-card-text>
        <v-card-actions>
          <v-btn variant="text" :to="`/events/${event.id}/entrants`">Entrants</v-btn>
          <v-spacer />
          <v-btn variant="text" @click="challengerOpen = false">Cancel</v-btn>
          <v-btn color="primary" variant="elevated" :disabled="!challenger || saving"
            :loading="saving" @click="addChallenger">Add challenger</v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <!-- Closing deletes the series nobody played, so it counts them first -->
    <v-dialog v-model="confirmClose" max-width="520">
      <v-card>
        <v-card-title class="bg-error">Close the night</v-card-title>
        <v-card-text class="pt-4">
          <p class="mb-0">
            {{ pendingCount }} {{ pendingCount === 1 ? 'series goes' : 'series go' }}: nobody played
            {{ pendingCount === 1 ? 'it' : 'them' }}. Every series left carries a result and the night reads finished.
          </p>
        </v-card-text>
        <v-card-actions>
          <v-spacer />
          <v-btn variant="text" @click="confirmClose = false">Cancel</v-btn>
          <v-btn color="error" variant="elevated" :loading="saving" @click="closeNight">Close the night</v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <!-- Advancing carries the top entrants into the next stage -->
    <v-dialog v-model="confirmAdvance" max-width="520">
      <v-card>
        <v-card-title class="bg-primary">Advance this stage</v-card-title>
        <v-card-text class="pt-4">
          <p v-if="!advancing.length" class="mb-0">Nobody moves on: the standings are empty.</p>
          <template v-else>
            <p class="mb-2">These entrants move into the next stage.</p>
            <ul class="ml-4">
              <li v-for="row in advancing" :key="row.entrant_id">{{ row.name }}</li>
            </ul>
          </template>
        </v-card-text>
        <v-card-actions>
          <v-spacer />
          <v-btn variant="text" @click="confirmAdvance = false">Cancel</v-btn>
          <v-btn color="primary" variant="elevated" :loading="saving" @click="advance">Advance</v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <!-- Finishing writes the places, so it names who takes each one first -->
    <v-dialog v-model="confirmFinish" max-width="520">
      <v-card>
        <v-card-title class="bg-primary">Finish this event</v-card-title>
        <v-card-text class="pt-4">
          <StatusAlert v-model="dialogError" />
          <p v-if="!awards.length" class="mb-0">
            Nobody is awarded: this stage's table is empty. Enter the results first.
          </p>
          <template v-else>
            <p class="mb-2">These entrants are awarded their place.</p>
            <v-table density="compact">
              <thead>
                <tr>
                  <th v-if="awards.some((one) => one.division)">Division</th>
                  <th>Entrant</th>
                  <th>Place</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="one in awards" :key="one.key">
                  <td v-if="awards.some((row) => row.division)">{{ one.division || '—' }}</td>
                  <td>{{ one.name }}</td>
                  <td>
                    <v-icon v-if="placeMedal(one.place)" size="16" :icon="placeIcon(one.place)"
                      :color="placeMedal(one.place)" class="mr-1" />{{ one.title }}
                  </td>
                </tr>
              </tbody>
            </v-table>
            <p class="text-caption text-medium-emphasis mt-3 mb-0">
              Finishing again rewrites the places from the table as it stands.
            </p>
          </template>
        </v-card-text>
        <v-card-actions>
          <v-spacer />
          <v-btn variant="text" :disabled="saving" @click="confirmFinish = false">Cancel</v-btn>
          <v-btn color="primary" variant="elevated" :disabled="!awards.length || saving"
            :loading="saving" @click="finish">Finish</v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <!-- One free for all lobby: where every seat finished, and who sits in it -->
    <v-dialog v-model="lobbyOpen" max-width="560">
      <v-card v-if="picked">
        <v-card-title class="bg-primary">Enter the places</v-card-title>
        <v-card-text class="pt-4">
          <StatusAlert v-model="dialogError" />
          <p class="text-medium-emphasis mb-4">
            The order is the result: drag a seat, or type its place. The winner is 1.
          </p>
          <div class="seats">
            <div v-for="(seat, index) in order" :key="seat.side_no" class="seat"
              :class="{ dragging: dragFrom === index }" draggable="true"
              @dragstart="dragFrom = index" @dragend="dragFrom = null"
              @dragover.prevent @drop="moveSeat(dragFrom, index)">
              <v-icon class="handle" size="18" icon="mdi-drag-horizontal-variant" aria-hidden="true" />
              <v-text-field :model-value="index + 1" type="number" min="1" :max="order.length"
                density="compact" variant="outlined" hide-details class="place"
                :aria-label="`Place of ${seatName(seat)}`"
                @update:model-value="moveSeat(index, Number($event) - 1)" />
              <PlayerName v-if="seat.user" :player="seat.user" plain />
              <span v-else class="text-medium-emphasis">Empty seat</span>
              <v-spacer />
              <v-btn v-if="!lobbyScored && seat.entrant_id && canMove" variant="text" size="small"
                :disabled="saving" @click="openMove(seat)">Move</v-btn>
            </div>
          </div>
          <p v-if="emptySeats" class="text-medium-emphasis text-caption mt-3 mb-0">
            This lobby seats nobody yet in {{ emptySeats }} of its places. It fills when the
            round before it is played.
          </p>
          <p v-else-if="!lobbyScored && !canMove" class="text-medium-emphasis text-caption mt-3 mb-0">
            A lobby seats two entrants or more, so nobody leaves this one.
          </p>
        </v-card-text>
        <v-card-actions>
          <v-spacer />
          <v-btn variant="text" :disabled="saving" @click="lobbyOpen = false">Close</v-btn>
          <v-btn color="primary" variant="elevated" prepend-icon="mdi-content-save"
            :disabled="!!emptySeats || saving" :loading="saving" @click="savePlaces">Save places</v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <!-- An entrant leaves one lobby for another, before either of them is played -->
    <v-dialog v-model="moveOpen" max-width="480">
      <v-card>
        <v-card-title class="bg-primary">Move to another lobby</v-card-title>
        <v-card-text class="pt-4">
          <StatusAlert v-model="dialogError" />
          <v-select v-model="moveTo" :items="moveTargets" item-value="id" item-title="label"
            label="Lobby" variant="outlined" density="comfortable" hide-details />
          <p v-if="!moveTargets.length" class="text-medium-emphasis mt-3 mb-0">
            This round holds no other lobby that is still to play.
          </p>
        </v-card-text>
        <v-card-actions>
          <v-spacer />
          <v-btn variant="text" :disabled="saving" @click="moveOpen = false">Cancel</v-btn>
          <v-btn color="primary" variant="elevated" :disabled="!moveTo || saving"
            :loading="saving" @click="moveEntrant">Move</v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <!-- One series: the winner of each game, or a result no game was played for -->
    <v-dialog v-model="resultOpen" max-width="560">
      <v-card v-if="picked">
        <v-card-title class="bg-primary">Enter a result</v-card-title>
        <v-card-text class="pt-4">
          <StatusAlert v-model="dialogError" />
          <p class="text-subtitle-1 mb-4">{{ nameOf(1) }} {{ score[0] }} – {{ score[1] }} {{ nameOf(2) }}</p>

          <v-alert v-if="scored" type="info" variant="tonal" density="compact" class="mb-4">
            This series carries a result. Reopening it clears every side it feeds.
          </v-alert>

          <template v-if="bothSides">
            <div v-for="game in gameRows" :key="game" class="mb-3">
              <div class="text-subtitle-2 mb-1">Game {{ game }}</div>
              <v-btn-toggle :model-value="winners[game - 1]" color="primary" divided variant="outlined"
                density="comfortable" class="d-flex" @update:model-value="setWinner(game, $event)">
                <v-btn value="A" class="flex-grow-1">{{ nameOf(1) }} won</v-btn>
                <v-btn value="B" class="flex-grow-1">{{ nameOf(2) }} won</v-btn>
              </v-btn-toggle>
            </div>
            <p class="text-caption text-medium-emphasis mb-4">
              The map and the replay of each game are entered by the players.
            </p>
          </template>
          <p v-else class="text-medium-emphasis mb-4">Both sides fill when the series above are played.</p>

          <v-divider class="mb-4" />
          <div class="text-subtitle-2 mb-2">No game played</div>
          <v-btn-toggle v-model="awardSide" color="primary" divided variant="outlined"
            density="comfortable" class="d-flex mb-2">
            <v-btn :value="1" class="flex-grow-1">{{ nameOf(1) }}</v-btn>
            <v-btn :value="2" class="flex-grow-1">{{ nameOf(2) }}</v-btn>
          </v-btn-toggle>
          <div class="d-flex ga-2">
            <v-btn variant="outlined" size="small" :disabled="!awardSide || scored || saving"
              @click="award('walkover')">Walkover</v-btn>
            <v-btn variant="outlined" size="small" :disabled="!awardSide || scored || saving"
              @click="award('forfeit')">Forfeit</v-btn>
          </div>
        </v-card-text>
        <v-card-actions>
          <v-btn v-if="scored" color="error" variant="text" :loading="saving" @click="reopen(false)">Reopen</v-btn>
          <v-spacer />
          <v-btn variant="text" :disabled="saving" @click="resultOpen = false">Close</v-btn>
          <v-btn color="primary" variant="elevated" prepend-icon="mdi-content-save"
            :disabled="!validScore || saving" :loading="saving" @click="saveScore">Save result</v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <!-- A reopen the engine refused: a series below already carries a result -->
    <v-dialog v-model="confirmForce" max-width="480">
      <v-card>
        <v-card-title class="bg-error">Reopen past a played series</v-card-title>
        <v-card-text class="pt-4">
          A series below this one already carries a result. Reopening clears it, and the
          bracket refills when this series is scored again.
        </v-card-text>
        <v-card-actions>
          <v-spacer />
          <v-btn variant="text" @click="confirmForce = false">Cancel</v-btn>
          <v-btn color="error" variant="elevated" :loading="saving" @click="reopen(true)">Reopen anyway</v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>
  </v-container>
</template>

<script setup>
import { computed, onMounted, ref, watch } from 'vue';
import { useRoute } from 'vue-router';

import EventHeader from '@/components/EventHeader.vue';
import StageView from '@/components/StageView.vue';
import StatusAlert from '@/components/StatusAlert.vue';
import { FORMATS, SEED_SOURCES, seriesPerEntrant, seriesPerFixture, titleOf } from '@/helpers/event-labels.mjs';
import { winsFor } from '@/helpers/best-of';
import { gameSlots, scoreOf } from '@/helpers/map-order.mjs';
import {
  advancingRows, chainChallengers, drawsByRound, generateFields, isLobby, isScored,
  lobbySeats, lobbyTargets, nextRound, pendingChainSeries, sideName, standsOn,
} from '@/helpers/stage-view.mjs';
import { awardList, placeIcon, placeMedal } from '@/helpers/awards.mjs';
import { entrantName, rostersByEntrant } from '@/helpers/entrants.mjs';
import { useEventStore, useTeamStore } from '@/stores';

const route = useRoute();
const store = useEventStore();
const teamStore = useTeamStore();

const event = ref(null);
const league = ref(null);
const entrants = ref([]);
const series = ref([]);
const rounds = ref([]);
const standings = ref([]);
const rosters = ref({});  // the players each team entrant fields, so a series box names them
const loading = ref(true);
const saving = ref(false);
const error = ref(null);
const dialogError = ref(null);
const tab = ref(0);

const confirmGenerate = ref(false);
const confirmDraw = ref(false);
const confirmAdvance = ref(false);
const confirmFinish = ref(false);
const confirmClose = ref(false);
const challengerOpen = ref(false);
const challenger = ref(null);
const confirmForce = ref(false);
const resultOpen = ref(false);
const lobbyOpen = ref(false);
const moveOpen = ref(false);
const order = ref([]);      // the seats of the open lobby, best place first
const dragFrom = ref(null);
const moving = ref(null);   // the seat the move dialog carries
const moveTo = ref(null);
const picked = ref(null);
const winners = ref([]);
const awardSide = ref(null);

const stages = computed(() => [...(event.value?.stages || [])].sort((a, b) => a.position - b.position));
const stage = computed(() => stages.value[tab.value] || null);
const complete = computed(() => series.value.length > 0 && series.value.every(isScored));

// The two series settings, each where it applies: the round robin's own, and the fixture's
const entrantSeries = computed(() => seriesPerEntrant(stage.value));
const fixtureSeries = computed(() => seriesPerFixture(event.value));

// What the generate dialog promises: where the seeds come from, and the field per division
const seedSource = computed(() => titleOf(SEED_SOURCES, entrants.value.find((row) => row.seed_source)?.seed_source || 'mmr'));
const fields = computed(() => generateFields(entrants.value, event.value?.divisions, stage.value?.format));
const showByes = computed(() => fields.value.some((row) => row.byes != null));

// Who the next stage takes: the top of each division's table, or the whole table
const advancing = computed(() => advancingRows(standings.value, stage.value?.advance_count));

// Closing the event freezes the table of its last stage, so the finish sits on that tab
const lastStage = computed(() => !!stage.value && tab.value === stages.value.length - 1);
const awards = computed(() => awardList(standings.value));

// A Swiss stage draws one round at a time; the engine refuses while a drawn series has no
// result, and once the stage has drawn every round it plays
const drawsRounds = computed(() => drawsByRound(stage.value));
const draw = computed(() => nextRound(stage.value, series.value, event.value?.divisions));
const drawNote = computed(() => {
  if (!drawsRounds.value) return '';
  return draw.value.done ? 'This stage has drawn every round it plays.' : draw.value.blocked || '';
});

// A chain stage is a KOTH night: it takes one challenger at a time and an admin closes it
const isChain = computed(() => stage.value?.format === 'koth');
const pendingCount = computed(() => pendingChainSeries(series.value, event.value?.divisions).length);
const divisionName = (id) => event.value?.divisions?.find((band) => band.id === id)?.name || '';
const challengerItems = computed(() => chainChallengers(entrants.value, series.value));
// The picker needs a plain string for a row that PlayerName draws itself; a row with no
// name at all still reads as something
const challengerTitle = (row) => entrantName(row) || 'Unnamed';
const entrantLine = (row) => [divisionName(row.division_id), row.mmr ? `${row.mmr} MMR` : ''].filter(Boolean).join(' · ');

const load = async () => {
  loading.value = true;
  try {
    const [row, leagues] = await Promise.all([store.fetchEvent(route.params.id), store.fetchLeagues()]);
    event.value = row;
    league.value = leagues.find((one) => one.id === row.league_id) || null;
    entrants.value = await store.fetchEntrants(row.id).catch(() => []);
    // only a team event fields rosters, so nothing else pays for the read
    if (row.entrant_kind === 'team') {
      await teamStore.fetchTeamsBySeason(row.id).catch(() => {});
      rosters.value = rostersByEntrant(entrants.value, teamStore.teams, row.id);
    }
    await loadStage();
  } catch (e) {
    error.value = `The event did not load: ${e.message}`;
  } finally {
    loading.value = false;
  }
};

const loadStage = async () => {
  series.value = [];
  rounds.value = [];
  standings.value = [];
  if (!stage.value) return;
  try {
    const [drawn, table] = await Promise.all([
      store.fetchStage(event.value.id, stage.value.id),
      store.fetchStandings(event.value.id, stage.value.id).catch(() => []),
    ]);
    series.value = drawn.series || [];
    rounds.value = drawn.rounds || [];
    standings.value = table;
  } catch (e) {
    error.value = `The stage did not load: ${e.message}`;
  }
};

watch(tab, loadStage);
onMounted(load);

const run = async (work) => {
  saving.value = true;
  dialogError.value = null;
  try {
    await work();
    await loadStage();
    return true;
  } catch (e) {
    dialogError.value = e.message;
    error.value = e.message;
    return false;
  } finally {
    saving.value = false;
  }
};

const generate = async () => {
  if (await run(() => store.generateStage(event.value.id, stage.value.id))) confirmGenerate.value = false;
};
const drawRound = async () => {
  if (await run(() => store.drawNextRound(event.value.id, stage.value.id))) confirmDraw.value = false;
};
const advance = async () => {
  if (await run(() => store.advanceStage(event.value.id, stage.value.id))) {
    confirmAdvance.value = false;
    event.value = await store.fetchEvent(route.params.id);
  }
};

const finish = async () => {
  if (await run(() => store.finishEvent(event.value.id))) {
    confirmFinish.value = false;
    event.value = await store.fetchEvent(route.params.id);
  }
};

const openChallenger = () => {
  challenger.value = null;
  dialogError.value = null;
  challengerOpen.value = true;
};

const addChallenger = async () => {
  if (await run(() => store.addChallenger(event.value.id, stage.value.id, challenger.value))) {
    challengerOpen.value = false;
  }
};

const closeNight = async () => {
  if (await run(() => store.closeNight(event.value.id))) {
    confirmClose.value = false;
    event.value = await store.fetchEvent(route.params.id);
  }
};

// One series in the dialog: its games open on the score it already carries. A free for
// all lobby carries places instead of a score, so it opens the placement dialog.
const openSeries = (row) => {
  picked.value = row;
  dialogError.value = null;
  awardSide.value = null;
  if (isLobby(row)) {
    order.value = lobbySeats(row);
    lobbyOpen.value = true;
    return;
  }
  const [a, b] = [row.player1_score ?? 0, row.player2_score ?? 0];
  winners.value = [...Array(a).fill('A'), ...Array(b).fill('B')];
  resultOpen.value = true;
};

// The places are the order of the rows, so a drag and a typed place do the same move
const moveSeat = (from, to) => {
  if (from == null || to == null || to < 0 || to >= order.value.length || from === to) return;
  const rows = [...order.value];
  rows.splice(to, 0, ...rows.splice(from, 1));
  order.value = rows;
};

const lobbyScored = computed(() => isScored(picked.value));
const emptySeats = computed(() => order.value.filter((seat) => !seat.entrant_id).length);
// A lobby seats two entrants or more, so the third seat is the first one free to leave
const canMove = computed(() => order.value.filter((seat) => seat.entrant_id).length > 2);
const seatName = (seat) => seat.user?.name || `seat ${seat.side_no}`;

const savePlaces = async () => {
  const places = order.value.map((seat, index) => ({ side_no: seat.side_no, place: index + 1 }));
  if (await run(() => store.setPlaces(picked.value.id, places))) lobbyOpen.value = false;
};

const moveTargets = computed(() => lobbyTargets(series.value, picked.value));

const openMove = (seat) => {
  moving.value = seat;
  moveTo.value = null;
  dialogError.value = null;
  moveOpen.value = true;
};

// A move is two writes: the target seats the entrant and the lobby he leaves drops him
const moveEntrant = async () => {
  const target = series.value.find((row) => row.id === moveTo.value);
  const taken = (target?.sides || []).map((seat) => seat.entrant_id).filter(Boolean);
  const left = order.value.map((seat) => seat.entrant_id)
    .filter((id) => id && id !== moving.value.entrant_id);
  const ok = await run(async () => {
    await store.setLobbySides(target.id, [...taken, moving.value.entrant_id]);
    await store.setLobbySides(picked.value.id, left);
  });
  if (ok) {
    moveOpen.value = false;
    lobbyOpen.value = false;
  }
};

const scored = computed(() => isScored(picked.value));
const bothSides = computed(() => !!(standsOn(picked.value, 1) && standsOn(picked.value, 2)));
const wins = computed(() => winsFor(stage.value?.best_of));
const score = computed(() => scoreOf(winners.value));
const gameRows = computed(() => gameSlots(stage.value?.best_of || 3, winners.value));
const validScore = computed(() => {
  const [a, b] = score.value;
  return bothSides.value && (a === wins.value) !== (b === wins.value) && Math.max(a, b) === wins.value;
});

const nameOf = (side) => sideName(picked.value, side) || `Side ${side}`;
// A changed winner drops the games after it: they were played from a different score
const setWinner = (game, side) => {
  winners.value[game - 1] = side || null;
  winners.value.length = side ? game : game - 1;
  winners.value = [...winners.value];
};

const saveScore = async () => {
  const [a, b] = score.value;
  await run(() => store.scoreSeries(picked.value.id, { player1_score: a, player2_score: b }));
  if (!dialogError.value) resultOpen.value = false;
};

const award = async (kind) => {
  await run(() => store.awardSeries(picked.value.id, kind, awardSide.value));
  if (!dialogError.value) resultOpen.value = false;
};

// The one refusal a force answers, as app/services/stage_engine.py on_reopened words it
const NEEDS_FORCE = 'A later series already carries a result';

const reopen = async (force) => {
  const cleared = { player1_score: null, player2_score: null };
  const ok = await run(() => store.scoreSeries(picked.value.id, cleared, force));
  if (ok) {
    confirmForce.value = false;
    resultOpen.value = false;
  } else if (!force && (dialogError.value || '').includes(NEEDS_FORCE)) {
    // every other failure is an error, not a question, so it stays in the alert
    confirmForce.value = true;
  }
};

// A reload swaps every series row, so the open dialog follows the one it was showing
watch(series, () => {
  if (!picked.value) return;
  picked.value = series.value.find((row) => row.id === picked.value.id) || null;
  if (picked.value && lobbyOpen.value) order.value = lobbySeats(picked.value);
});
</script>

<style scoped>
/* One seat a row: the place first, then who sits in it, then the move out of the lobby */
.seat {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 4px 0;
  border-top: 1px solid rgba(var(--v-border-color), var(--v-border-opacity));
}
.seats > .seat:first-child { border-top: none; }
.seat.dragging { opacity: 0.5; }
.handle { cursor: grab; color: rgba(var(--v-theme-on-surface), 0.5); }
.place { max-width: 76px; }
</style>
