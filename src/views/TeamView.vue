<!-- One page per team, across every event it played. The tabs name the event and
     its league from the team route, which also carries the scores; the roster, the
     rank and the round results come from that event's team and series routes. -->
<template>
  <v-overlay v-model="isLoading" persistent contained class="align-center justify-center">
    <v-progress-circular indeterminate size="64" width="8" color="primary" />
  </v-overlay>

  <v-container fluid class="pa-4">
    <StatusAlert v-model="errorMessage" />

    <v-card v-if="team" elevation="2" class="mb-4">
      <v-card-title class="bg-primary d-flex align-center ga-3">
        <v-avatar size="40">
          <img class="team-icon" alt="" :src="teamImageUrl(team)" @error="showDefaultTeamImage">
        </v-avatar>
        <div>
          <div>{{ team.long_name || team.name }}</div>
          <div v-if="team.long_name" class="text-caption">{{ team.name }}</div>
        </div>
      </v-card-title>

      <v-tabs v-model="seasonId" bg-color="surface" show-arrows>
        <v-tab v-for="tab in seasonTabs" :key="tab.id" :value="tab.id">
          {{ tab.label }}
          <v-icon v-if="tab.id === currentSeasonId" size="small" class="ml-1" title="Current season">mdi-star</v-icon>
        </v-tab>
      </v-tabs>

      <!-- The event page holds the stages; the season team page holds the roster and
           the captain's Team rounds button -->
      <v-card-text v-if="seasonId" class="pb-0 d-flex flex-wrap ga-2">
        <v-btn size="small" variant="outlined" prepend-icon="mdi-trophy-variant" :to="`/events/${seasonId}`">
          {{ seasonLabel }}
        </v-btn>
        <v-btn v-if="seasonSlug" size="small" variant="outlined" prepend-icon="mdi-shield-account" :to="`/team/${teamId}/season/${seasonSlug}`">
          Season team page
        </v-btn>
      </v-card-text>

      <v-card-text v-if="seasonInfo" class="season-stats">
        <div v-for="stat in stats" :key="stat.label" class="text-right">
          <div class="text-caption text-medium-emphasis">
            <ColumnNote v-if="POINTS_NOTES[stat.label]" :title="stat.label" :note="POINTS_NOTES[stat.label]" />
            <template v-else>{{ stat.label }}</template>
          </div>
          <div class="text-h6 stat-value">{{ stat.value }}</div>
        </div>
      </v-card-text>
    </v-card>

    <v-card v-if="team && rounds.length" elevation="2" class="mb-4">
      <v-card-title class="bg-primary d-flex align-center">
        <v-icon class="mr-2">mdi-sword-cross</v-icon>
        Rounds
      </v-card-title>
      <v-table density="compact">
        <thead>
          <tr>
            <th class="text-right round-col">Round</th>
            <th>Opponent</th>
            <th class="text-right">Series</th>
            <th class="text-right">Points</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="row in rounds" :key="row.matchId">
            <td class="text-right stat-value">{{ row.playday }}</td>
            <td>
              <div class="d-flex align-center ga-2">
                <v-avatar size="24" rounded="sm">
                  <img class="team-icon" alt="" :src="teamImageUrl(row.opponent)" @error="showDefaultTeamImage">
                </v-avatar>
                {{ row.opponent?.long_name || row.opponent?.name }}
              </div>
            </td>
            <td class="text-right text-no-wrap stat-value">{{ row.wins }}–{{ row.losses }}<span v-if="row.toPlay" class="text-medium-emphasis"> of {{ row.wins + row.losses + row.toPlay }}</span></td>
            <td class="text-right text-no-wrap stat-value" :class="{ 'font-weight-bold': row.pointsFor > row.pointsAgainst }">{{ row.pointsFor }}–{{ row.pointsAgainst }}</td>
          </tr>
        </tbody>
      </v-table>
    </v-card>

    <TeamRoster v-if="team" :captains="captains" :members="members" />
  </v-container>
</template>

<script setup>
import { computed, ref, watch } from 'vue';
import { useRoute } from 'vue-router';
import { useSeasonStore, useSeriesStore, useTeamStore } from '@/stores';
import { resolveCurrentSeasonId, loadSeasons } from '@/helpers/current-season';
import { teamImageUrl, showDefaultTeamImage } from '@/helpers/team-image';
import { seasonRank, roundResults, seriesRecord } from '@/helpers/team-record.mjs';
import { POINTS_NOTES } from '@/helpers/achievements';
import { eventLabel } from '@/helpers/event-labels.mjs';
import { rosterOf } from '@/helpers/team-roster.mjs';
import ColumnNote from '@/components/ColumnNote.vue';
import StatusAlert from '@/components/StatusAlert.vue';
import TeamRoster from '@/components/TeamRoster.vue';

const route = useRoute();
const teamStore = useTeamStore();
const seasonStore = useSeasonStore();
const seriesStore = useSeriesStore();

const teamId = Number(route.params.id);
const team = ref(null);
const seasonTeam = ref(null);
const standings = ref([]);
const seasonSeries = ref([]);
const seasonId = ref(null);
const currentSeasonId = ref(null);
const isLoading = ref(true);
const errorMessage = ref(null);

// The team route carries one row per event the team played, with its league; newest first
const seasonTabs = computed(() => (team.value?.seasons_info || [])
  .filter((info) => info.season_id != null)
  .slice()
  .sort((a, b) => b.season_id - a.season_id)
  .map((info) => ({ id: info.season_id, label: eventLabel(info) })));

const seasonInfo = computed(() =>
  (team.value?.seasons_info || []).find((info) => info.season_id === seasonId.value) || null
);
const seasonLabel = computed(() => seasonTabs.value.find((tab) => tab.id === seasonId.value)?.label || '');
// The roster of the tab comes from the per-event read, captains and members alike
const captains = computed(() => rosterOf(seasonTeam.value, seasonId.value).captains);
const members = computed(() => rosterOf(seasonTeam.value, seasonId.value).members);

const rank = computed(() => seasonRank(standings.value, teamId, seasonId.value));
const rounds = computed(() => roundResults(seasonSeries.value, teamId));
const seasonSlug = computed(() => (seasonId.value ? seasonStore.slugOf(seasonId.value) : null));
const stats = computed(() => {
  const { wins, losses } = seriesRecord(rounds.value);
  return [
    { label: 'Rank', value: rank.value ? `${rank.value.rank} of ${rank.value.of}` : '—' },
    { label: 'Series', value: `${wins}–${losses}` },
    { label: 'Points', value: seasonInfo.value?.final_score ?? '—' },
    { label: 'Points against', value: seasonInfo.value?.points_against ?? '—' },
    { label: 'Points available', value: seasonInfo.value?.points_available ?? '—' },
  ];
});

// Each tab reads the roster, the season's standings and its series
watch(seasonId, async (id) => {
  if (!id) return;
  standings.value = [];
  seasonSeries.value = [];
  const [roster, teams, series] = await Promise.all([
    teamStore.getTeamDetailsSeason(teamId, id).catch(() => null),
    teamStore.getTeamsSeasonBasic(id).catch(() => []),
    seriesStore.searchSeriesBySeason(id).catch(() => []),
  ]);
  if (seasonId.value !== id) return; // a later tab won
  seasonTeam.value = roster;
  standings.value = teams;
  seasonSeries.value = series;
});

const load = async () => {
  try {
    const [loaded] = await Promise.all([teamStore.getTeam(teamId), loadSeasons()]);
    team.value = loaded;
    currentSeasonId.value = await resolveCurrentSeasonId();
    const ids = seasonTabs.value.map((tab) => tab.id);
    seasonId.value = ids.includes(currentSeasonId.value) ? currentSeasonId.value : ids[0] ?? null;
  } catch (error) {
    errorMessage.value = error.message || 'Failed to load the team.';
  } finally {
    isLoading.value = false;
  }
};

load();
</script>

<style scoped>
.team-icon {
  width: 100%;
  height: 100%;
  object-fit: contain;
}
.season-stats {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(104px, 1fr));
  gap: 12px 16px;
}
.stat-value {
  font-variant-numeric: tabular-nums;
}
.round-col {
  width: 72px;
}
</style>
