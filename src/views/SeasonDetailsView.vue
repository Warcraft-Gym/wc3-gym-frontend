<template>
  <v-overlay v-model="isLoading" persistent class="align-center justify-center">
    <v-progress-circular
          indeterminate
          size="64" 
          width="8"
          color="primary"
    ></v-progress-circular>
  </v-overlay>

  <!-- Enhanced Hero Section -->
  <div id="seasonHeader">
    <div class="banner-band">
      <v-container class="fill-height">
        <v-row align="center" justify="center">
          <v-col cols="12" md="8" class="text-center">
            <h1 class="text-h5 text-md-h2 font-weight-bold mb-4 season-title">{{ season.name }}</h1>
            <v-row class="justify-center mt-6 d-none d-sm-flex">
              <v-col cols="auto">
                <v-card class="stat-card" elevation="8">
                  <v-card-text class="pa-4">
                    <div class="text-h4 font-weight-bold text-primary-text">{{ season.round_count }}</div>
                    <div class="text-subtitle-2">Rounds</div>
                  </v-card-text>
                </v-card>
              </v-col>
              <v-col cols="auto">
                <v-card class="stat-card" elevation="8">
                  <v-card-text class="pa-4">
                    <div class="text-h4 font-weight-bold text-primary-text">{{ teams.length }}</div>
                    <div class="text-subtitle-2">Teams</div>
                  </v-card-text>
                </v-card>
              </v-col>
            </v-row>
          </v-col>
        </v-row>
      </v-container>
    </div>
  </div>

  <v-container fluid class="pa-4">
    <!-- Series with no result, reached from the unscored count on the Seasons page -->
    <v-card v-if="unscoredOnly" class="mb-4" elevation="2">
      <v-card-title class="bg-primary d-flex align-center">
        <v-icon class="mr-2">mdi-clipboard-alert</v-icon>
        Series
        <v-chip class="ml-3" size="small" color="on-primary" variant="outlined" closable @click:close="unscoredOnly = false">No result</v-chip>
      </v-card-title>
      <v-card-text class="pa-0">
        <GroupedTable :columns="unscoredColumns" :groups="unscoredGroups" default-open empty="Every series of this season has a result">
          <template #group="{ group }">
            <td :colspan="unscoredColumns.length">
              <strong>Round {{ group.key }}</strong>
              <span class="text-medium-emphasis ml-2">{{ group.rows.length }} with no result</span>
            </td>
          </template>
          <template #rows="{ group }">
            <tr
              v-for="row in group.rows"
              :key="row.id"
              class="detail-row unscored-row"
              tabindex="0"
              @click="router.push(`/match/${row.match_id}`)"
              @keyup.enter="router.push(`/match/${row.match_id}`)"
            >
              <td></td>
              <td class="text-no-wrap">{{ row.match?.team1?.name }} vs {{ row.match?.team2?.name }}</td>
              <td><PlayerName :player="row.player1" :race="row.player1_race" /></td>
              <td><PlayerName :player="row.player2" :race="row.player2_race" /></td>
              <td class="text-no-wrap">{{ row.date_time ? formatDateTime(row.date_time) : 'Not scheduled' }}</td>
              <td><CastChips :series="row" /></td>
            </tr>
          </template>
        </GroupedTable>
      </v-card-text>
    </v-card>

    <!-- Round navigation tabs -->
    <v-card class="mb-4" elevation="2">
      <v-tabs
        v-model="selectedWeek"
        bg-color="primary"
        slider-color="on-primary"
        show-arrows
        @update:modelValue="fetchMatches"
      >
        <v-tab
          v-for="week in season.round_count"
          :key="week"
          :value="week"
        >
          <v-icon start>mdi-calendar-week</v-icon>
          Round {{ week }}
        </v-tab>
      </v-tabs>
    </v-card>

    <!-- Action Bar -->
    <v-card class="mb-4" elevation="1">
      <v-card-title class="bg-primary d-flex align-center">
        <v-icon class="mr-2">mdi-trophy</v-icon>
        Round {{ selectedWeek }} Matches
      </v-card-title>
      <v-card-text class="pa-0">
        <v-toolbar flat height="auto">
          <v-row align="center" class="flex-wrap ma-0 pa-2">
            <v-spacer />
            <v-col cols="12" sm="auto">
              <v-btn
                v-if="auth.isAdmin"
                :to="`/seasons/${route.params.id}/maps`"
                color="primary"
                prepend-icon="mdi-map-outline"
                variant="outlined"
                block
              >
                Series Maps
              </v-btn>
            </v-col>
            <v-col cols="12" sm="auto">
              <v-btn
                v-if="auth.isAdmin"
                :to="`/seasons/${route.params.id}/achievements`"
                color="primary"
                prepend-icon="mdi-trophy-variant-outline"
                variant="outlined"
                block
              >
                Achievements
              </v-btn>
            </v-col>
            <v-col cols="12" sm="auto">
              <v-btn
                v-if="auth.isAdmin"
                @click="openMatchCreationModal"
                color="primary"
                prepend-icon="mdi-plus"
                variant="elevated"
                block
              >
                Add Match
              </v-btn>
            </v-col>
          </v-row>
        </v-toolbar>
      </v-card-text>
    </v-card>

    <!-- Matches for the selected round -->
    <v-row v-if="matches && matches.length > 0">
      <v-col
        v-for="(match, index) in matches"
        :key="index"
        cols="12"
        lg="6"
      >
        <v-card 
          class="match-card-enhanced" 
          elevation="2"
          hover
          @click="$router.push(`/match/${match.id}`)"
        >
          <v-card-text class="pa-4">
            <v-row align="center" class="match-row">
              <!-- Team 1 -->
              <v-col cols="5" class="text-center">
                <div class="team-section">
                  <v-avatar size="80" class="mb-3 team-avatar">
                    <img class="team-icon" :src="teamImageUrl(match.team1)" @error="showDefaultTeamImage">
                  </v-avatar>
                  <div class="team-name-enhanced">{{ match.team1.name }}</div>
                  <v-chip 
                    :color="getScoreColor(match.team1_score, match.team2_score)" 
                    size="large" 
                    class="mt-2 score-chip"
                  >
                    {{ match.team1_score }}
                  </v-chip>
                </div>
              </v-col>

              <!-- VS Divider -->
              <v-col cols="2" class="text-center">
                <div class="vs-section">
                  <v-icon size="40" color="primary">mdi-sword-cross</v-icon>
                  <div class="text-caption mt-2 text-medium-emphasis">{{ roundLabel(roundOf(match.playday)) }}</div>
                </div>
              </v-col>

              <!-- Team 2 -->
              <v-col cols="5" class="text-center">
                <div class="team-section">
                  <v-avatar size="80" class="mb-3 team-avatar">
                    <img class="team-icon" :src="teamImageUrl(match.team2)" @error="showDefaultTeamImage">
                  </v-avatar>
                  <div class="team-name-enhanced">{{ match.team2.name }}</div>
                  <v-chip 
                    :color="getScoreColor(match.team2_score, match.team1_score)" 
                    size="large" 
                    class="mt-2 score-chip"
                  >
                    {{ match.team2_score }}
                  </v-chip>
                </div>
              </v-col>
            </v-row>

            <!-- Match Info Footer -->
            <v-divider class="my-3"></v-divider>
            <v-row align="center" dense>
              <v-col>
                <v-chip v-if="roundMapId(match.playday)" size="small" prepend-icon="mdi-map" variant="text">
                  {{ getMapName(roundMapId(match.playday)) }}
                </v-chip>
                <v-chip v-else-if="usesFixedMap" size="small" prepend-icon="mdi-map-marker-alert" variant="text" color="warning">
                  Round {{ match.playday }} has no fixed map
                </v-chip>
              </v-col>
              <v-col cols="auto">
                <RowActions :actions="[
                  { icon: 'mdi-pencil', label: 'Edit Match', onClick: () => editMatch(match) },
                  { icon: 'mdi-delete', label: 'Delete Match', color: 'error', onClick: () => openDeleteDialog(match.id, removeMatch) },
                ]" />
              </v-col>
            </v-row>
          </v-card-text>
        </v-card>
      </v-col>
    </v-row>

    <!-- Empty State -->
    <v-card v-else elevation="0" class="text-center pa-8">
      <v-icon size="64" class="text-disabled">mdi-calendar-blank</v-icon>
      <div class="text-h6 mt-4 text-medium-emphasis">No matches scheduled for Round {{ selectedWeek }}</div>
      <v-btn 
        color="primary" 
        variant="tonal" 
        class="mt-4"
        prepend-icon="mdi-plus"
        v-if="auth.isAdmin"
        @click="openMatchCreationModal"
      >
        Schedule First Match
      </v-btn>
    </v-card>

    <!-- Teams Expansion Panel -->
    <v-expansion-panels class="mt-6" v-model="teamsPanel">
      <v-expansion-panel>
        <v-expansion-panel-title class="text-h6">
          <v-icon class="mr-2">mdi-shield-account</v-icon>
          Season Teams ({{ teams.length }})
          <template v-slot:actions="{ expanded }">
            <v-icon :icon="expanded ? 'mdi-chevron-up' : 'mdi-chevron-down'"></v-icon>
          </template>
        </v-expansion-panel-title>
        <v-expansion-panel-text>
          <!-- Team Management Actions -->
          <v-card-actions v-if="auth.isCaptain" class="pa-3">
            <v-btn
              v-if="auth.isAdmin"
              @click="openTeamSelectionModal"
              variant="tonal"
              color="primary"
              prepend-icon="mdi-plus">
              Add Teams
            </v-btn>
            <v-btn
              @click="router.push(`/seasons/${route.params.id}/assign`)"
              variant="tonal"
              color="secondary"
              prepend-icon="mdi-account-multiple-plus">
              Assign Signups
            </v-btn>
          </v-card-actions>

          <!-- Teams Grid -->
          <v-row v-if="teams && teams.length > 0" class="mt-2">
            <v-col v-for="(team, index) in teams" :key="index" cols="12" sm="6" md="4" lg="3">
              <v-card 
                class="team-card-enhanced" 
                elevation="2"
                hover
                @click="$router.push(`/team/${team.id}/season/${route.params.id}`)"
              >
                <v-card-text class="text-center pa-4">
                  <v-avatar size="64" class="mb-3">
                    <img class="team-icon" :src="teamImageUrl(team)" @error="showDefaultTeamImage">
                  </v-avatar>
                  <div class="text-h6 mb-2">{{ team.name }}</div>
                  <v-divider class="my-2"></v-divider>
                  <v-row dense class="text-caption">
                    <v-col cols="12">
                      <v-chip size="small" color="success" variant="flat" class="mb-1">
                        <v-icon start size="small">mdi-trophy</v-icon>
                        {{ team.seasons_info[0].final_score }} pts
                      </v-chip>
                    </v-col>
                    <v-col cols="6" class="text-left">
                      <div class="text-medium-emphasis">Against:</div>
                      <div class="font-weight-bold">{{ team.seasons_info[0].points_against }}</div>
                    </v-col>
                    <v-col cols="6" class="text-right">
                      <div class="text-medium-emphasis">Available:</div>
                      <div class="font-weight-bold">{{ team.seasons_info[0].points_available }}</div>
                    </v-col>
                  </v-row>
                </v-card-text>
              </v-card>
            </v-col>
          </v-row>
          <v-alert v-else type="info" variant="tonal" class="mt-2">
            No teams have been added to this season yet.
          </v-alert>
        </v-expansion-panel-text>
      </v-expansion-panel>
    </v-expansion-panels>
  </v-container>

  <!-- Team Selection Dialog -->
  <v-dialog v-model="isTeamDialogOpen" max-width="700px">
    <v-card>
      <v-card-title class="bg-primary">
        <v-icon class="mr-2">mdi-shield-plus</v-icon>
        Add Teams to Season
      </v-card-title>
      <v-card-text class="pa-0">
        <v-data-table v-if="availableTeams"
            :headers="addTeamsTableHeader"
            :items="availableTeams"
            select-strategy="all"
            density="compact"
            item-value="id"
            v-model="selectedTeams"
            multi-sort
            fixed-header
            hover
            show-select
          ></v-data-table>
      </v-card-text>
      <v-card-actions>
        <v-spacer></v-spacer>
        <v-btn variant="text" @click="closeTeamSelectionModal">Cancel</v-btn>
        <v-btn v-if="auth.isAdmin" color="primary" @click="addTeamsToSeason" :disabled="!selectedTeams || selectedTeams.length === 0">
          Add {{ selectedTeams?.length || 0 }} Team(s)
        </v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>

  <!-- Create Match Dialog -->
  <v-dialog v-if="newMatch" v-model="isModalOpen" max-width="600px">
    <v-card>
      <v-card-title class="bg-primary">
        <v-icon class="mr-2">mdi-calendar-plus</v-icon>
        Create Match - Round {{ selectedWeek }}
      </v-card-title>
      <v-alert v-if="matchError" type="error" variant="tonal" class="mx-4 mt-4" border="start" closable @click:close="matchError = null">
        {{ matchError }}
      </v-alert>
      <v-card-text class="pt-4">
        <v-row>
          <v-col v-if="usesFixedMap" cols="12">
            <div class="d-flex align-center flex-wrap ga-2">
              <v-icon size="small" :color="roundMapId(selectedWeek) ? undefined : 'warning'">mdi-map</v-icon>
              <span class="text-body-2">Fixed map: {{ roundMapId(selectedWeek) ? getMapName(roundMapId(selectedWeek)) : 'not set for this round' }}</span>
              <v-btn size="small" variant="text" color="primary" :to="`/seasons/${route.params.id}/maps`">Set on Series maps</v-btn>
            </div>
          </v-col>
          <v-col cols="12" md="6">
            <v-select
              :items="teams"
              item-title="name"
              item-value="id"
              label="Team 1"
              variant="outlined"
              density="comfortable"
              prepend-inner-icon="mdi-shield"
              v-model="newMatch.team1_id"
            ></v-select>
          </v-col>
          <v-col cols="12" md="6">
            <v-select
              :items="teams"
              item-title="name"
              item-value="id"
              label="Team 2"
              variant="outlined"
              density="comfortable"
              prepend-inner-icon="mdi-shield"
              v-model="newMatch.team2_id"
            ></v-select>
          </v-col>
        </v-row>      
      </v-card-text>   
      <v-card-actions>
        <v-spacer></v-spacer>
        <v-btn variant="text" @click="closeMatchCreationModal">Cancel</v-btn>
        <v-btn v-if="auth.isAdmin" color="primary" @click="confirmSelection">Create Match</v-btn>
      </v-card-actions>        
    </v-card>
  </v-dialog>

  <!-- Edit Match Dialog -->
  <v-dialog
    v-if="selectedMatch"
    v-model="editMatchDialogOpen"
    max-width="600px">
    <v-card>
      <v-card-title class="bg-primary">
        <v-icon class="mr-2">mdi-pencil</v-icon>
        Edit Match
      </v-card-title>
      <v-alert v-if="matchError" type="error" variant="tonal" class="mx-4 mt-4" border="start" closable @click:close="matchError = null">
        {{ matchError }}
      </v-alert>
      <v-card-text class="pt-4">
        <v-row>
          <v-col v-if="usesFixedMap" cols="12">
            <div class="d-flex align-center flex-wrap ga-2">
              <v-icon size="small" :color="roundMapId(selectedMatch.playday) ? undefined : 'warning'">mdi-map</v-icon>
              <span class="text-body-2">Fixed map: {{ roundMapId(selectedMatch.playday) ? getMapName(roundMapId(selectedMatch.playday)) : 'not set for this round' }}</span>
              <v-btn size="small" variant="text" color="primary" :to="`/seasons/${route.params.id}/maps`">Set on Series maps</v-btn>
            </div>
          </v-col>
          <v-col cols="12" md="6">
            <v-select
              :items="teams"
              item-title="name"
              item-value="id"
              label="Team 1"
              variant="outlined"
              density="comfortable"
              prepend-inner-icon="mdi-shield"
              v-model="selectedMatch.team1_id"
            ></v-select>
          </v-col>
          <v-col cols="12" md="6">
            <v-select
              :items="teams"
              item-title="name"
              item-value="id"
              label="Team 2"
              variant="outlined"
              density="comfortable"
              prepend-inner-icon="mdi-shield"
              v-model="selectedMatch.team2_id"
            ></v-select>
          </v-col>
        </v-row>      
      </v-card-text>       
      <v-card-actions>
        <v-spacer></v-spacer>
        <v-btn variant="text" @click="cancelEdit">Cancel</v-btn>
        <v-btn v-if="auth.isAdmin" color="primary" @click="updateMatch">Save Changes</v-btn>
      </v-card-actions>        
    </v-card>
  </v-dialog>
  <ConfirmDeleteDialog
    v-model="showDeleteDialog"
    message="Are you sure you want to delete this item? This action cannot be undone."
    @confirm="confirmDelete"
    @cancel="cancelDeleteDialog"
  />
  <!-- Success/Error Snackbar -->
  <v-snackbar
    v-model="showFeedback"
    :color="feedbackType"
    :timeout="5000"
    location="top"
  >
    <div class="d-flex align-center">
      <v-icon class="mr-2">{{ feedbackType === 'success' ? 'mdi-check-circle' : 'mdi-alert-circle' }}</v-icon>
      {{ feedbackMessage }}
    </div>
    <template v-slot:actions>
      <v-btn variant="text" @click="showFeedback = false">Close</v-btn>
    </template>
  </v-snackbar>
</template>
  
  <script setup>
import RowActions from '@/components/RowActions.vue';
import ConfirmDeleteDialog from '@/components/ConfirmDeleteDialog.vue';
import GroupedTable from '@/components/GroupedTable.vue';
import PlayerName from '@/components/PlayerName.vue';
import CastChips from '@/components/CastChips.vue';
import { useRouter, useRoute } from 'vue-router';
import { ref, onMounted, computed, watch } from 'vue';
import { useAuthStore, useSeasonStore, useMatchStore, useTeamStore, useMapStore, useSeriesStore } from '@/stores';
import { storeToRefs } from 'pinia';
  import { teamImageUrl, showDefaultTeamImage } from '@/helpers/team-image';
import { useDeleteDialog } from '@/helpers/delete-dialog';
import { isUnscored } from '@/helpers/season-phase.mjs';
import { currentRound, roundLabel } from '@/helpers/rounds.mjs';
import { fixedMapOf, rulesOf } from '@/helpers/map-order.mjs';
import { formatDateTime } from '@/helpers/datetime';


// Store initialization
const router = useRouter();
const route = useRoute();
const seasonStore = useSeasonStore();
const matchStore = useMatchStore();
const teamStore = useTeamStore();
const mapStore = useMapStore();
const auth = useAuthStore();

// Store refs
const { current_season: season } = storeToRefs(seasonStore);
const { matches } = storeToRefs(matchStore);
const { teams } = storeToRefs(teamStore);
const { maps } = storeToRefs(mapStore);

// Route params
const seasonId = seasonStore.seasonIdOf(route.params.id);
// The round of a week gives the match card its dates
const roundOf = (playday) => season.value?.rounds?.find(r => r.playday === playday) || { playday };

// Series with no result: on from ?unscored=1, held here because the week hash push drops the query
const seriesStore = useSeriesStore();
const unscoredOnly = ref(route.query.unscored === '1');
const unscoredSeries = ref([]);
const unscoredColumns = [
  { key: 'match', title: 'Match' },
  { key: 'player1', title: 'Player 1' },
  { key: 'player2', title: 'Player 2' },
  { key: 'date_time', title: 'Scheduled' },
  { key: 'cast', title: 'Cast' },
];
const unscoredGroups = computed(() => {
  const weeks = new Map();
  for (const series of unscoredSeries.value) {
    const week = series.match?.playday ?? 0;
    if (!weeks.has(week)) weeks.set(week, { key: week, rows: [] });
    weeks.get(week).rows.push(series);
  }
  return [...weeks.values()].sort((a, b) => a.key - b.key);
});

const fetchUnscoredSeries = async () => {
  try {
    const all = await seriesStore.searchSeriesBySeason(seasonId, null);
    unscoredSeries.value = (all || []).filter(isUnscored);
  } catch (error) {
    console.error('Failed to fetch the series of the season:', error);
  }
};

// Table configuration
const addTeamsTableHeader = [
  { title: 'ID', value: 'id', sortable: true },
  { title: 'Name', value: 'name', sortable: true },
  { title: 'Long Name', value: 'long_name', sortable: true },
];
    // Component state
const isLoading = ref(true);
const isInitLoading = ref(false);

// Week selection state
const selectedWeek = ref(null);

// Modal state
const isModalOpen = ref(false);
const isTeamDialogOpen = ref(false);
const editMatchDialogOpen = ref(false);

// Match state
const selectedMatch = ref(null);
const newMatch = ref(null);
const matchError = ref(null);

// Why a match cannot be created, or null
const matchProblem = (match) => {
  if (!match?.team1_id || !match?.team2_id) return 'Pick both teams.';
  if (match.team1_id === match.team2_id) return 'A team cannot play itself.';
  return null;
};

// Team state
const allTeams = ref(null);
const selectedTeams = ref(null);
const selectedTeam1 = ref(null);
const selectedTeam2 = ref(null);

// Delete dialog state
const { showDeleteDialog, openDeleteDialog, confirmDelete, cancelDeleteDialog } = useDeleteDialog();

// Feedback snackbar state
const showFeedback = ref(false);
const feedbackMessage = ref('');
const feedbackType = ref('success'); // 'success' or 'error'

// UI state
const teamsPanel = ref(null);

// Compute teams that are not part of the season
const availableTeams = computed(() => {
  if (!allTeams.value || allTeams.value.length == 0) {
    return [];
  }
  return allTeams.value.filter(team => !teamStore.teams.some(seasonTeam => seasonTeam.id === team.id));
});

// Helper to get score color
const getScoreColor = (score, opponentScore) => {
  if (score > opponentScore) return 'win';
  if (score < opponentScore) return 'loss';
  return 'draw';
};

// The fixed map of a round: season_rounds.map_id, the column the veto and the game offers read
const usesFixedMap = computed(() => rulesOf(season.value?.map_rules).includes('fixed'));
const roundMapId = (playday) => fixedMapOf(season.value?.map_rules, roundOf(playday));

// Helper to get map name
const getMapName = (mapId) => {
  const map = maps.value.find(m => m.id === mapId);
  return map?.name || 'Random';
};

// Team selection methods
const openTeamSelectionModal = async () => {
  // Load basic team info only when the modal is opened
  if (!allTeams.value) {
    allTeams.value = await teamStore.getTeamsBasic();
  }
  isTeamDialogOpen.value = true;
  selectedTeams.value = [];
};

const closeTeamSelectionModal = () => {
  isTeamDialogOpen.value = false;
  selectedTeams.value = null;
};

    const openMatchCreationModal = () => {
      newMatch.value = {
        team1_id:null,
        team2_id:null,
        season_id:seasonId,
        playday: selectedWeek.value
      }
      matchError.value = null;
      isModalOpen.value = true;
    };

    const closeMatchCreationModal = () => {
      isModalOpen.value = false;
      matchError.value = null;
      selectedTeam1.value = null;
      selectedTeam2.value = null;
    };

    const addTeamsToSeason = async () => {
      isLoading.value = true;
      try{
        await seasonStore.addTeamsToSeason(seasonId, selectedTeams.value);
        await fetchTeams();
      } catch (error) {
        console.error("Failed to add teams to season:", error);
      } finally {
        isLoading.value = false;
        closeTeamSelectionModal();
      }
    };

    const editMatch = (match) => {
      selectedMatch.value = { ...match }; // Clone the user object to avoid modifying the original object directly
      matchError.value = null;
      editMatchDialogOpen.value = true;
    };

    const updateMatch = async () => {
      matchError.value = matchProblem(selectedMatch.value);
      if (matchError.value) return;
      try {
        await matchStore.updateMatch(selectedMatch.value);
        // Update the local state after a successful PUT request
        await fetchMatches(selectedWeek.value);
        cancelEdit(); // Reset the form
      } catch (error) {
        console.error('Error updating match:', error);
        matchError.value = error.message || 'Failed to save the match.';
      }
    };

    const removeMatch = async (matchId) => {
      try {
        await matchStore.deleteMatch(matchId);
        await fetchMatches(selectedWeek.value); // Refresh the list after deletion
      } catch (error) {
        console.error('Error deleting match:', error);
      }
    };

    const cancelEdit = () => {
      editMatchDialogOpen.value = false;
      matchError.value = null;
      selectedMatch.value = null; // Clear the selected user
    };

    
    const confirmSelection = async () => {
      matchError.value = matchProblem(newMatch.value);
      if (matchError.value) return;
      isLoading.value = true;
      try {
        await matchStore.createMatch(newMatch.value);
        await fetchMatches(selectedWeek.value); // Refresh matches for the week
        closeMatchCreationModal();
      } catch (error) {
        console.error("Failed to add match:", error);
        matchError.value = error.message || 'Failed to add the match.';
      } finally {
        isLoading.value = false;
      }
    };

    const fetchMatches = async (week) => {
  selectedWeek.value = week;
  isLoading.value = true;
  router.push({ hash: `#round-${week}` });
  try {
    await matchStore.searchMatchesBySeasonAndPlayday(seasonId, week);
  } catch (error) {
    console.error(`Failed to fetch matches for week ${week}:`, error);
  } finally {
    if (!isInitLoading.value) {
      isLoading.value = false;
    }
  }
};

    const fetchMaps = async () => {
      try {
        await mapStore.fetchMaps();
      } catch (error) {
        console.error('Failed to fetch maps:', error);
      }
    };

    // Fetch teams for the season
    const fetchTeams = async () => {
  isLoading.value = true;
  try {
    await teamStore.fetchTeamsBySeasonBasic(seasonId);
  } catch (error) {
    console.error('Failed to fetch teams for the season:', error);
  } finally {
    if (!isInitLoading.value) {
      isLoading.value = false;
    }
  }
};

    const fetchSeasonDetails = async () => {
  isLoading.value = true;
  try {
    await seasonStore.fetchSeason(seasonId);
  } catch (error) {
    console.error('Failed to fetch season details:', error);
  } finally {
    if (!isInitLoading.value) {
      isLoading.value = false;
    }
  }
};

    watch(() => route.hash, (newHash) => {
      if (newHash) {
        const roundFromHash = route.hash && route.hash.includes('#round-') 
            ? parseInt(route.hash.replace('#round-', ''), 10) 
            : 1;
          if(selectedWeek.value && roundFromHash!=selectedWeek.value){
            selectedWeek.value = roundFromHash;
            fetchMatches(roundFromHash);
          }
      }
    });

  
    // Lifecycle hooks
onMounted(async () => {
  isInitLoading.value = true;
  isLoading.value = true;
  try {
    const roundFromHash = route.hash && route.hash.includes('#round-')
      ? parseInt(route.hash.replace('#round-', ''), 10)
      : null;

    // The rounds decide which tab opens, so the season is read before the matches
    await fetchSeasonDetails();
    const round = roundFromHash ?? currentRound(season.value?.rounds)?.playday ?? 1;
    selectedWeek.value = round;

    await Promise.all([
      fetchTeams(),
      fetchMatches(round),
      fetchMaps(),
      unscoredOnly.value && fetchUnscoredSeries()
    ]);
  } finally {
    isLoading.value = false;
    isInitLoading.value = false;
  }
});

  </script>

  <style scoped>

  .unscored-row {
    cursor: pointer;
  }

  .team-icon {
    width: 100%;
    height: 100%;
    object-fit: cover;
  }

  /* Header Styles */
  #seasonHeader {
    position: relative;
    color: rgb(var(--v-theme-on-band));
  }
  
  .banner-band {
    height: 250px;
    background: rgb(var(--v-theme-band));
  }

  .season-title {
    letter-spacing: 1px;
  }

  /* Stat Cards */
  .stat-card {
    background: rgba(var(--v-theme-surface), 0.95) !important;
    backdrop-filter: blur(10px);
    transition: transform 0.2s, box-shadow 0.2s;
  }

  .stat-card:hover {
    transform: translateY(-4px);
    box-shadow: 0 8px 24px rgba(0, 0, 0, 0.15) !important;
  }

  /* Match Cards */
  .match-card-enhanced {
    transition: all 0.3s ease;
    cursor: pointer;
    border: 2px solid transparent;
  }

  .match-card-enhanced:hover {
    transform: translateY(-4px);
    box-shadow: 0 8px 24px rgba(0, 0, 0, 0.15) !important;
    border-color: rgb(var(--v-theme-primary));
  }

  .match-row {
    min-height: 200px;
  }

  .team-section {
    transition: transform 0.2s;
  }

  .match-card-enhanced:hover .team-section {
    transform: scale(1.05);
  }

  .team-avatar {
    border: 3px solid rgba(var(--v-theme-primary), 0.2);
    transition: border-color 0.2s;
  }

  .match-card-enhanced:hover .team-avatar {
    border-color: rgb(var(--v-theme-primary));
  }

  .team-name-enhanced {
    font-size: 1.1rem;
    font-weight: 600;
    color: rgb(var(--v-theme-on-surface));
  }

  .score-chip {
    font-size: 1.5rem !important;
    font-weight: bold;
    min-width: 60px;
  }

  .vs-section {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
  }

  /* Team Cards in Expansion Panel */
  .team-card-enhanced {
    transition: all 0.3s ease;
    cursor: pointer;
    border: 2px solid transparent;
  }

  .team-card-enhanced:hover {
    transform: translateY(-4px);
    box-shadow: 0 8px 24px rgba(0, 0, 0, 0.15) !important;
    border-color: rgb(var(--v-theme-primary));
  }

  /* Loading Overlay */
  .loading-overlay {
    z-index: 9999;
  }

  /* Responsive adjustments */
  /* On a phone the hero is a title alone, so it does not need 250px */
  @media (max-width: 599px) {
    .banner-band {
      height: 120px;
    }
  }

  @media (max-width: 960px) {
    .season-title {
      font-size: 2rem !important;
    }

    .stat-card .text-h4 {
      font-size: 1.5rem !important;
    }

    .match-row {
      min-height: auto;
    }

    .team-avatar {
      width: 60px !important;
      height: 60px !important;
    }

    .score-chip {
      font-size: 1.2rem !important;
    }
  }
  </style>