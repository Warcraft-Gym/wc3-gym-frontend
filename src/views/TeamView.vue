<!-- One page per team, across every season it played. The tabs pick the season;
     the captains and the scores come from the team route, the roster, rank and
     round results from that season's team and series routes. -->
<template>
  <v-overlay v-model="isLoading" persistent contained class="align-center justify-center">
    <v-progress-circular indeterminate size="64" width="8" color="primary" />
  </v-overlay>

  <v-container fluid class="pa-4">
    <StatusAlert v-model="errorMessage" />

    <v-card v-if="team" elevation="2" class="mb-4">
      <v-card-title class="bg-primary d-flex align-center ga-3">
        <v-avatar size="40">
          <img class="team-icon" :src="teamImageUrl(team)" @error="showDefaultTeamImage">
        </v-avatar>
        <div>
          <div>{{ team.long_name || team.name }}</div>
          <div v-if="team.long_name" class="text-caption">{{ team.name }}</div>
        </div>
      </v-card-title>

      <v-tabs v-model="seasonId" bg-color="surface" show-arrows>
        <v-tab v-for="season in seasons" :key="season.id" :value="season.id">
          {{ season.name }}
          <v-icon v-if="season.id === currentSeasonId" size="small" class="ml-1" title="Current season">mdi-star</v-icon>
        </v-tab>
      </v-tabs>

      <v-card-text v-if="seasonInfo" class="season-stats">
        <div v-for="stat in stats" :key="stat.label" class="text-right">
          <div class="text-caption text-medium-emphasis">{{ stat.label }}</div>
          <div class="text-h6 stat-value">{{ stat.value }}</div>
        </div>
      </v-card-text>
    </v-card>

    <v-card v-if="team && rounds.length" elevation="2" class="mb-4">
      <v-card-title class="bg-secondary d-flex align-center">
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
                  <img class="team-icon" :src="teamImageUrl(row.opponent)" @error="showDefaultTeamImage">
                </v-avatar>
                {{ row.opponent?.long_name || row.opponent?.name }}
              </div>
            </td>
            <td class="text-right text-no-wrap stat-value">{{ row.wins }}–{{ row.losses }}</td>
            <td class="text-right text-no-wrap stat-value" :class="{ 'font-weight-bold': row.pointsFor > row.pointsAgainst }">{{ row.pointsFor }}–{{ row.pointsAgainst }}</td>
          </tr>
        </tbody>
      </v-table>
    </v-card>

    <v-card v-if="team" elevation="2" class="mb-4">
      <v-card-title class="bg-secondary d-flex align-center">
        <v-icon class="mr-2">mdi-shield-star</v-icon>
        Captains
      </v-card-title>
      <v-card-text>
        <div v-if="captains.length" class="d-flex flex-wrap ga-3">
          <PlayerName v-for="captain in captains" :key="captain.id" :player="captain" />
        </div>
        <div v-else class="text-medium-emphasis">No captains recorded for this season.</div>
      </v-card-text>
    </v-card>

    <v-card v-if="team" elevation="2">
      <v-card-title class="bg-primary d-flex align-center">
        <v-icon class="mr-2">mdi-account-group</v-icon>
        Members
      </v-card-title>
      <v-card-text>
        <div v-if="members.length" class="d-flex flex-wrap ga-3">
          <PlayerName v-for="member in members" :key="member.id" :player="member" :race="member.signup_race" />
        </div>
        <div v-else class="text-medium-emphasis">No members recorded for this season.</div>
      </v-card-text>
    </v-card>
  </v-container>
</template>

<script setup>
import { computed, ref, watch } from 'vue';
import { useRoute } from 'vue-router';
import { useSeasonStore, useSeriesStore, useTeamStore } from '@/stores';
import { resolveCurrentSeasonId, loadSeasons } from '@/helpers/current-season';
import { teamImageUrl, showDefaultTeamImage } from '@/helpers/team-image';
import { seasonRank, roundResults, seriesRecord } from '@/helpers/team-record.mjs';
import PlayerName from '@/components/PlayerName.vue';
import StatusAlert from '@/components/StatusAlert.vue';

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

// The team route carries one row per season the team played, newest first
const seasons = computed(() => {
  const played = new Set((team.value?.seasons_info || []).map((info) => info.season_id));
  return (seasonStore.seasons || [])
    .filter((season) => played.has(season.id))
    .slice()
    .sort((a, b) => b.id - a.id);
});

const seasonInfo = computed(() =>
  (team.value?.seasons_info || []).find((info) => info.season_id === seasonId.value) || null
);
const captains = computed(() => team.value?.captains_by_season?.[seasonId.value] || []);
const members = computed(() => seasonTeam.value?.player_by_season?.[seasonId.value] || []);

const rank = computed(() => seasonRank(standings.value, teamId, seasonId.value));
const rounds = computed(() => roundResults(seasonSeries.value, teamId));
const stats = computed(() => {
  const { wins, losses } = seriesRecord(rounds.value);
  return [
    { label: 'Rank', value: rank.value ? `${rank.value.rank} of ${rank.value.of}` : '—' },
    { label: 'Series', value: `${wins}–${losses}` },
    { label: 'Final score', value: seasonInfo.value?.final_score ?? '—' },
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
    const ids = seasons.value.map((season) => season.id);
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
