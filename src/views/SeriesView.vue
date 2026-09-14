<!-- One series, whatever event it belongs to: the event it is played in, the two sides
     and the score, the rule and the map of every game, who casts it, and for a side or
     an admin the report action. A bracket box and the fixture page both open it. -->
<template>
  <v-container fluid class="pa-4">
    <StatusAlert v-model="error" />
    <v-progress-linear v-if="loading" indeterminate />

    <template v-if="series">
      <h1 class="text-h5 text-md-h3 font-weight-bold">{{ title }}</h1>
      <div class="d-flex flex-wrap align-center id-links mt-2">
        <span v-for="part in place" :key="part.text" class="id-link text-medium-emphasis">
          <v-icon size="18" :icon="part.icon" /><span>{{ part.text }}</span>
        </span>
      </div>

      <v-row class="mt-2">
        <v-col cols="12" md="7">
          <v-card elevation="2">
            <v-card-title class="d-flex align-center ga-3 flex-wrap">
              <span>{{ bestOfLine }}</span>
              <v-chip v-if="stageRow" size="x-small" variant="tonal">{{ mode }}</v-chip>
              <v-chip v-if="stageRow" size="x-small" variant="outlined">{{ pick }}</v-chip>
            </v-card-title>
            <div class="pa-3">
              <SeriesBox readonly :series="box" :rosters="rosters" />
            </div>
            <v-card-actions class="flex-wrap ga-2 px-3 pb-3">
              <CastChips :series="series" />
              <v-spacer />
              <v-btn v-if="hasVeto && canReport" variant="outlined" color="primary" size="small"
                prepend-icon="mdi-map-outline" :to="`/player-series/${series.id}/veto`">
                Map veto
              </v-btn>
              <v-btn v-if="canReport" variant="elevated" color="primary" size="small"
                prepend-icon="mdi-trophy" @click="reportDialog.open(series)">
                {{ scored ? 'Edit result' : 'Report result' }}
              </v-btn>
              <v-btn v-for="side in rosterSides" :key="side" variant="outlined" color="primary"
                size="small" prepend-icon="mdi-account-group" @click="openRoster(side)">
                {{ rosterVerb(side) }} {{ teamName(side) }}
              </v-btn>
              <v-btn v-if="auth.isAdmin && !scored" variant="outlined" size="small"
                prepend-icon="mdi-account-cancel" @click="awardOpen = true">
                No game played
              </v-btn>
            </v-card-actions>
          </v-card>
        </v-col>

        <v-col cols="12" md="5">
          <v-card elevation="2">
            <v-card-title>Games</v-card-title>
            <v-table density="comfortable">
              <thead>
                <tr>
                  <th style="width: 56px">Game</th>
                  <th class="d-none d-sm-table-cell">Rule</th>
                  <th>Map</th>
                  <th>Winner</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="row in gameRows" :key="row.game_no">
                  <td>
                    {{ row.game_no }}
                    <div class="d-sm-none text-caption text-medium-emphasis text-no-wrap">{{ row.rule }}</div>
                  </td>
                  <td class="d-none d-sm-table-cell">{{ row.rule }}</td>
                  <td>{{ row.map }}</td>
                  <td>
                    <span v-if="row.winner" class="winner">
                      <i class="mark" />{{ row.winner }}
                    </span>
                    <span v-else class="text-medium-emphasis">—</span>
                  </td>
                </tr>
              </tbody>
            </v-table>
          </v-card>
        </v-col>
      </v-row>

      <!-- The whole fixture, so a reader reads the five series from any one of them -->
      <FixtureSeries v-if="fixture.length > 1" class="mt-4" :series="fixture" :rosters="rosters"
        :current-id="series.id" />

      <!-- A captain names the players his side fields, out of the roster his team holds -->
      <v-dialog v-model="rosterOpen" max-width="520">
        <v-card>
          <v-card-title class="bg-primary">Name the roster</v-card-title>
          <v-card-text class="pt-4">
            <StatusAlert v-model="rosterError" />
            <v-select v-model="picked" :items="rosterItems" item-value="id" item-title="name"
              :label="teamName(rosterSide)" variant="outlined" density="comfortable" multiple
              :hint="`Pick ${sideSize} ${sideSize === 1 ? 'player' : 'players'}.`" persistent-hint>
              <template #item="{ props: itemProps, item }">
                <v-list-item v-bind="itemProps" :title="null" :active="picked.includes(item.raw.id)">
                  <template #prepend>
                    <v-checkbox-btn :model-value="picked.includes(item.raw.id)" tabindex="-1" />
                  </template>
                  <PlayerName :player="item.raw.player" :race="item.raw.race || undefined" plain />
                </v-list-item>
              </template>
            </v-select>
          </v-card-text>
          <v-card-actions>
            <v-spacer />
            <v-btn variant="text" :disabled="savingRoster" @click="rosterOpen = false">Cancel</v-btn>
            <v-btn color="primary" variant="elevated" prepend-icon="mdi-content-save"
              :disabled="picked.length !== sideSize || savingRoster" :loading="savingRoster"
              @click="saveRoster">Save roster</v-btn>
          </v-card-actions>
        </v-card>
      </v-dialog>

      <!-- An admin scores a series nobody played: the side that takes it, then the kind -->
      <v-dialog v-model="awardOpen" max-width="480">
        <v-card>
          <v-card-title class="bg-primary">No game played</v-card-title>
          <v-card-text class="pt-4">
            <StatusAlert v-model="awardError" />
            <p class="mb-3">Pick the side that takes the series.</p>
            <v-btn-toggle v-model="awardSide" color="primary" divided variant="outlined"
              density="comfortable" class="d-flex">
              <v-btn :value="1" class="flex-grow-1">{{ sideName(1) }}</v-btn>
              <v-btn :value="2" class="flex-grow-1">{{ sideName(2) }}</v-btn>
            </v-btn-toggle>
          </v-card-text>
          <v-card-actions>
            <v-spacer />
            <v-btn variant="text" :disabled="awarding" @click="awardOpen = false">Close</v-btn>
            <v-btn variant="outlined" :disabled="!awardSide || awarding" :loading="awarding"
              @click="award('walkover')">Walkover</v-btn>
            <v-btn variant="outlined" :disabled="!awardSide || awarding" :loading="awarding"
              @click="award('forfeit')">Forfeit</v-btn>
          </v-card-actions>
        </v-card>
      </v-dialog>

      <ReportResultDialog v-if="canReport" ref="reportDialog" @saved="load" />
    </template>
  </v-container>
</template>

<script setup>
import { computed, onMounted, ref } from 'vue';
import { useRoute } from 'vue-router';

import CastChips from '@/components/CastChips.vue';
import FixtureSeries from '@/components/FixtureSeries.vue';
import PlayerName from '@/components/PlayerName.vue';
import ReportResultDialog from '@/components/ReportResultDialog.vue';
import SeriesBox from '@/components/SeriesBox.vue';
import StatusAlert from '@/components/StatusAlert.vue';
import { backendUrl, fetchWrapper } from '@/helpers';
import { eventLabel, MAP_RULES, timeText, titleOf } from '@/helpers/event-labels.mjs';
import {
  fixtureRosters, modeLabel, pickLabel, rosterSides as sidesFor, sideRoster,
} from '@/helpers/fixture.mjs';
import { rulesOf } from '@/helpers/map-order.mjs';
import { isScored, sideName as nameOfSide } from '@/helpers/stage-view.mjs';
import { useAuthStore, useEventStore, useMapStore, useTeamStore } from '@/stores';

const route = useRoute();
const auth = useAuthStore();
const eventStore = useEventStore();
const mapStore = useMapStore();
const teamStore = useTeamStore();

const series = ref(null);
const games = ref([]);
const fixture = ref([]);   // every series the fixture holds, in play order
const rosters = ref({});   // the roster each team entrant fields for the event, by entrant id
const rosterOpen = ref(false);
const rosterSide = ref(1);
const picked = ref([]);
const rosterError = ref(null);
const savingRoster = ref(false);
const loading = ref(true);
const error = ref(null);
const reportDialog = ref(null);
const awardOpen = ref(false);
const awardSide = ref(null);
const awardError = ref(null);
const awarding = ref(false);

// The event of a series inside a fixture is its season; a bracket series names none yet
const event = computed(() => series.value?.match?.season || null);
const title = computed(() => (event.value ? eventLabel(event.value) : 'Series'));
const scored = computed(() => isScored(series.value));

// The line under the title: where the series is played and when
const place = computed(() => [
  series.value?.match?.playday ? { icon: 'mdi-tournament', text: `Round ${series.value.match.playday}` } : null,
  series.value?.date_time ? { icon: 'mdi-calendar-clock', text: timeText(series.value.date_time) } : null,
].filter(Boolean));

// One rule per game, so their count is the best-of
const rules = computed(() => rulesOf(series.value?.rules?.map_rules));
const bestOfLine = computed(() => `Best of ${series.value?.rules?.best_of || rules.value.length}`);
const hasVeto = computed(() => rules.value.includes('veto'));

const sideName = (side) => nameOfSide(box.value, side) || `Side ${side}`;

// The stage row of this series carries what it plays and who fields it; GET /series/{id}
// answers neither, so a series inside a fixture reads them off the fixture.
const stageRow = computed(() => fixture.value.find((row) => row.id === series.value?.id) || null);
const box = computed(() => stageRow.value || series.value);
const mode = computed(() => modeLabel(stageRow.value?.side_size));
const pick = computed(() => pickLabel(stageRow.value?.pick_rule));
const sideSize = computed(() => stageRow.value?.side_size || 1);
const teamName = (side) => stageRow.value?.[`team${side}`]?.name || `side ${side}`;

// A captain names his own side, an admin either; a side already named is changed, not written
const rosterSides = computed(() => sidesFor(
  stageRow.value, rosters.value, auth.me?.user?.id, auth.isAdmin,
));
const rosterVerb = (side) => (sideRoster(stageRow.value, side).length ? 'Change' : 'Name');
const rosterItems = computed(() => (rosters.value[stageRow.value?.[`entrant${rosterSide.value}_id`]] || [])
  .map((seat) => ({ id: seat.player.id, name: seat.player.name, player: seat.player, race: seat.race })));

const openRoster = (side) => {
  rosterSide.value = side;
  rosterError.value = null;
  picked.value = sideRoster(stageRow.value, side).map((player) => player.id);
  rosterOpen.value = true;
};

const saveRoster = async () => {
  savingRoster.value = true;
  rosterError.value = null;
  try {
    await eventStore.setSideRoster(series.value.id, rosterSide.value, picked.value);
    rosterOpen.value = false;
    await load();
  } catch (e) {
    rosterError.value = e.message;
  } finally {
    savingRoster.value = false;
  }
};

const mapName = (id) => mapStore.maps.find((row) => row.id === id)?.name;

// One row per game of the best-of: its rule, the map it was played on or the one the
// rule offers, and the side that won it
const gameRows = computed(() => rules.value.map((rule, index) => {
  const game = games.value.find((row) => row.game_no === index + 1);
  return {
    game_no: index + 1,
    rule: titleOf(MAP_RULES, rule),
    map: mapName(game?.map_id ?? game?.offered_map_id) || '—',
    winner: game ? sideName(game.winner_side === 'B' ? 2 : 1) : null,
  };
}));

// A team side names no player of its own, so any logged-in member may open the report
// and the API answers whether he acts for the side; the 403 reads as the dialog's alert.
const teamSided = computed(() => !!series.value
  && ((!series.value.match && !series.value.player1_id && !series.value.player2_id)
    || !!stageRow.value?.entrant1_id));
// A side of the series reports it, and so does an admin
const canReport = computed(() => auth.isAdmin
  || [series.value?.player1_id, series.value?.player2_id].includes(auth.me?.user?.id)
  || (!!auth.me && teamSided.value));

const award = async (kind) => {
  awarding.value = true;
  awardError.value = null;
  try {
    await eventStore.awardSeries(series.value.id, kind, awardSide.value);
    awardOpen.value = false;
    await load();
  } catch (e) {
    awardError.value = e.message;
  } finally {
    awarding.value = false;
  }
};

// The fixture this series plays, once the event runs it through the events module: its
// ordered series with their mode, their pick rule and the roster each side fields.
const loadFixture = async () => {
  const eventId = series.value?.match?.season_id ?? series.value?.match?.season?.id;
  if (!series.value?.match_id || !eventId) return;
  const answer = await eventStore.fetchFixture(eventId, series.value.match_id).catch(() => null);
  if (!answer?.series?.length) return;
  fixture.value = answer.series;
  await teamStore.fetchTeamsBySeason(eventId).catch(() => {});
  rosters.value = fixtureRosters(answer.series, teamStore.teams, eventId);
};

const load = async () => {
  const id = route.params.id;
  try {
    series.value = await fetchWrapper.get(`${backendUrl}/series/${id}`);
    // A series nobody reported records no game, and the table shows its rules alone
    games.value = await fetchWrapper.get(`${backendUrl}/series/${id}/games`).catch(() => []);
    await loadFixture();
  } catch (e) {
    error.value = `The series did not load: ${e.message}`;
  } finally {
    loading.value = false;
  }
};

onMounted(() => {
  if (!mapStore.maps.length) mapStore.fetchMaps().catch(() => {});  // names the map of each game
  load();
});
</script>

<style scoped>
/* One gap for every icon-and-text pair, as the event header sets them */
.id-links { gap: 4px 20px; }
.id-link {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  white-space: nowrap;
}
/* The winner wears the win mark, never coloured text */
.winner { display: inline-flex; align-items: center; gap: 6px; }
.mark {
  width: 3px;
  height: 1em;
  border-radius: 2px;
  background: rgb(var(--v-theme-win));
}
</style>
