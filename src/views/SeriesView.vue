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
            <v-card-title>{{ bestOfLine }}</v-card-title>
            <div class="pa-3">
              <SeriesBox readonly :series="series" />
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
import ReportResultDialog from '@/components/ReportResultDialog.vue';
import SeriesBox from '@/components/SeriesBox.vue';
import StatusAlert from '@/components/StatusAlert.vue';
import { backendUrl, fetchWrapper } from '@/helpers';
import { eventLabel, MAP_RULES, timeText, titleOf } from '@/helpers/event-labels.mjs';
import { rulesOf } from '@/helpers/map-order.mjs';
import { isScored } from '@/helpers/stage-view.mjs';
import { useAuthStore, useEventStore, useMapStore } from '@/stores';

const route = useRoute();
const auth = useAuthStore();
const eventStore = useEventStore();
const mapStore = useMapStore();

const series = ref(null);
const games = ref([]);
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

const sideName = (side) => series.value?.[`player${side}`]?.name || `Side ${side}`;
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

// A side of the series reports it, and so does an admin
const canReport = computed(() => auth.isAdmin
  || [series.value?.player1_id, series.value?.player2_id].includes(auth.me?.user?.id));

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

const load = async () => {
  const id = route.params.id;
  try {
    series.value = await fetchWrapper.get(`${backendUrl}/series/${id}`);
    // A series nobody reported records no game, and the table shows its rules alone
    games.value = await fetchWrapper.get(`${backendUrl}/series/${id}/games`).catch(() => []);
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
