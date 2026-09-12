<!-- One series of an event (#36): the two sides and the score, the games, the veto that
     chose their maps, who casts it, and Report result for the side the caller plays. -->
<template>
  <v-container>
    <StatusAlert v-model="error" />
    <StatusAlert v-model="notice" type="success" />
    <v-progress-linear v-if="loading" indeterminate />

    <v-card v-if="series" elevation="2" class="mb-4">
      <v-card-title class="bg-primary d-flex align-center flex-wrap ga-2">
        <v-icon class="mr-2">mdi-sword-cross</v-icon>
        {{ roundLabel(series.round) }}
        <v-spacer />
        <v-btn v-if="series.viewer_side" class="tap" color="on-primary" variant="tonal" prepend-icon="mdi-trophy" @click="reporting = true">Report result</v-btn>
      </v-card-title>
      <v-card-text class="pt-4">
        <div class="text-medium-emphasis mb-3">
          <RouterLink :to="`/events/${eventId}`">{{ series.event_name || 'Event' }}</RouterLink>
          <template v-if="series.stage"> · {{ series.stage.name }} · Bo{{ gamesOf(series.stage.map_rules) }}</template>
          <template v-if="series.date_time"> · {{ timeText }}</template>
        </div>
        <div v-for="side in [0, 1]" :key="side" class="side" :class="{ won: winner === side }">
          <PlayerName :player="player(side)" :race="race(side)" />
          <span class="score">{{ scored ? (side ? series.player2_score : series.player1_score) : '—' }}</span>
        </div>
        <div class="d-flex align-center ga-2 mt-3">
          <span class="text-medium-emphasis">Casts</span>
          <CastChips :series="series" />
        </div>
      </v-card-text>
    </v-card>

    <v-row v-if="series">
      <v-col cols="12" md="6">
        <v-card elevation="2" class="mb-4">
          <v-card-title class="bg-primary d-flex align-center">
            <v-icon class="mr-2">mdi-gamepad-variant</v-icon>
            Games
          </v-card-title>
          <v-card-text class="pa-0">
            <v-table v-if="(series.games || []).length" density="comfortable">
              <tbody>
                <tr v-for="game in series.games" :key="game.game_no">
                  <td>Game {{ game.game_no }}</td>
                  <td>{{ game.map_name || '—' }}</td>
                  <td>{{ game.winner_side ? `${player(game.winner_side === 'A' ? 0 : 1).name} won` : 'Not reported' }}</td>
                  <td class="text-right">
                    <a v-if="game.replay_url" :href="game.replay_url" target="_blank" rel="noopener">Replay</a>
                  </td>
                </tr>
              </tbody>
            </v-table>
            <div v-else class="text-medium-emphasis pa-4">No game has been reported yet.</div>
          </v-card-text>
        </v-card>
      </v-col>

      <v-col cols="12" md="6">
        <v-card elevation="2" class="mb-4">
          <v-card-title class="bg-primary d-flex align-center">
            <v-icon class="mr-2">mdi-map-marker-path</v-icon>
            Veto
          </v-card-title>
          <v-card-text class="pa-0">
            <v-table v-if="vetoSteps.length" density="comfortable">
              <tbody>
                <tr v-for="step in vetoSteps" :key="step.step_no">
                  <td class="text-capitalize">{{ step.action }}</td>
                  <td>{{ player(step.side === 'A' ? 0 : 1).name }}</td>
                  <td>{{ step.map_name || `Map ${step.map_id}` }}</td>
                </tr>
              </tbody>
            </v-table>
            <div v-else class="text-medium-emphasis pa-4">No veto was recorded.</div>
          </v-card-text>
        </v-card>
      </v-col>
    </v-row>

    <ReportResultDialog
      v-model="reporting"
      :series="reportSeries"
      @saved="message => { notice = message; load(); }"
      @error="message => error = message"
    />
  </v-container>
</template>

<script setup>
import { computed, onMounted, ref } from 'vue';
import { useRoute } from 'vue-router';

import CastChips from '@/components/CastChips.vue';
import PlayerName from '@/components/PlayerName.vue';
import ReportResultDialog from '@/components/ReportResultDialog.vue';
import StatusAlert from '@/components/StatusAlert.vue';
import { gamesOf } from '@/helpers/best-of.mjs';
import { roundLabel, seriesState } from '@/helpers/events-public.mjs';
import { local } from '@/helpers/schedule.mjs';
import { gmt } from '@/helpers/timezone.mjs';
import { useEventStore } from '@/stores';

const route = useRoute();
const store = useEventStore();
const eventId = Number(route.params.id);
const seriesId = Number(route.params.sid);

const series = ref(null);
const loading = ref(true);
const reporting = ref(false);
const error = ref(null);
const notice = ref(null);

const player = (side) => (side ? series.value?.player2 : series.value?.player1) || { name: '—' };
const race = (side) => (side ? series.value?.player2_race : series.value?.player1_race);
const scored = computed(() => seriesState(series.value) === 'complete');
const winner = computed(() => {
  if (!scored.value) return null;
  return series.value.player1_score > series.value.player2_score ? 0 : series.value.player2_score > series.value.player1_score ? 1 : null;
});
// A stored series time is UTC; a reader wants it on his own clock, with the zone named
const timeText = computed(() => {
  if (!series.value?.date_time) return '';
  const at = local(series.value.date_time);
  return `${at.toFormat('ccc d LLL, HH:mm')} ${gmt(at.offset)}`;
});
const vetoSteps = computed(() => [...(series.value?.veto?.steps || [])].sort((a, b) => a.step_no - b.step_no));
// The report dialog reads the best-of off the map rules, which a series takes from its stage
const reportSeries = computed(() => (series.value ? { ...series.value, map_rules: series.value.stage?.map_rules } : null));

const load = async () => {
  series.value = await store.fetchSeries(eventId, seriesId);
};

onMounted(async () => {
  try {
    await load();
  } catch (e) {
    error.value = `Failed to load the series: ${e.message}`;
  } finally {
    loading.value = false;
  }
});
</script>

<style scoped>
.side {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 8px 0;
  border-bottom: thin solid rgba(var(--v-border-color), var(--v-border-opacity));
}
.side.won {
  font-weight: 700;
}
.score {
  margin-left: auto;
  font-size: 1.5rem;
  font-variant-numeric: tabular-nums;
}

/* A finger needs a bigger target than a mouse */
@media (max-width: 600px) {
  .tap {
    min-height: 48px;
  }
}
</style>
