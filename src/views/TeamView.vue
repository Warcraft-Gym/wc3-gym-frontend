<!-- One page per team, across every season it played. The tabs pick the season;
     the roster comes from the season route, the captains and the scores from
     the team route, which carries every season at once. -->
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

      <v-card-text v-if="seasonInfo" class="d-flex flex-wrap ga-2">
        <v-chip variant="outlined" size="small">Final score {{ seasonInfo.final_score ?? '—' }}</v-chip>
        <v-chip variant="outlined" size="small">Points against {{ seasonInfo.points_against ?? '—' }}</v-chip>
        <v-chip variant="outlined" size="small">Points available {{ seasonInfo.points_available ?? '—' }}</v-chip>
      </v-card-text>
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
import { useSeasonStore, useTeamStore } from '@/stores';
import { resolveCurrentSeasonId, loadSeasons } from '@/helpers/current-season';
import { teamImageUrl, showDefaultTeamImage } from '@/helpers/team-image';
import PlayerName from '@/components/PlayerName.vue';
import StatusAlert from '@/components/StatusAlert.vue';

const route = useRoute();
const teamStore = useTeamStore();
const seasonStore = useSeasonStore();

const teamId = Number(route.params.id);
const team = ref(null);
const seasonTeam = ref(null);
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

// The roster is the one part the team route leaves out, so each tab reads it
watch(seasonId, async (id) => {
  if (!id) return;
  seasonTeam.value = await teamStore.getTeamDetailsSeason(teamId, id).catch(() => null);
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
</style>
