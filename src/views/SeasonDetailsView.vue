<template>
  <v-overlay v-model="isLoading" persistent class="loading-overlay">
    <v-progress-circular
          indeterminate
          size="64" 
          width="8"
          color="primary"
    ></v-progress-circular>
  </v-overlay>

  <!-- Enhanced Hero Section -->
  <div id="seasonHeader">
    <v-parallax class="banner-image" :src="bannerImg" height="250">
      <div class="banner-overlay"></div>
      <v-container class="fill-height">
        <v-row align="center" justify="center">
          <v-col cols="12" md="8" class="text-center">
            <h1 class="text-h2 font-weight-bold mb-4 season-title">{{ season.name }}</h1>
            <v-row class="justify-center mt-6">
              <v-col cols="auto">
                <v-card class="stat-card" elevation="8">
                  <v-card-text class="pa-4">
                    <div class="text-h4 font-weight-bold primary--text">{{ season.number_weeks }}</div>
                    <div class="text-subtitle-2 text-uppercase">Weeks</div>
                  </v-card-text>
                </v-card>
              </v-col>
              <v-col cols="auto">
                <v-card class="stat-card" elevation="8">
                  <v-card-text class="pa-4">
                    <div class="text-h4 font-weight-bold primary--text">{{ teams.length }}</div>
                    <div class="text-subtitle-2 text-uppercase">Teams</div>
                  </v-card-text>
                </v-card>
              </v-col>
            </v-row>
          </v-col>
        </v-row>
      </v-container>
    </v-parallax>
  </div>

  <v-container fluid class="pa-4">
    <!-- Week Navigation Tabs -->
    <v-card class="mb-4" elevation="2">
      <v-tabs
        v-model="selectedWeek"
        bg-color="primary"
        slider-color="white"
        show-arrows
        @update:modelValue="fetchMatches"
      >
        <v-tab
          v-for="week in season.number_weeks"
          :key="week"
          :value="week"
        >
          <v-icon start>mdi-calendar-week</v-icon>
          Week {{ week }}
        </v-tab>
      </v-tabs>
    </v-card>

    <!-- Action Bar -->
    <v-card class="mb-4" elevation="1">
      <v-card-title class="bg-primary d-flex align-center">
        <v-icon class="mr-2">mdi-trophy</v-icon>
        Week {{ selectedWeek }} Matches
      </v-card-title>
      <v-card-text class="pa-0">
        <v-toolbar flat height="auto">
          <v-row align="center" class="flex-wrap ma-0 pa-2">
            <v-spacer />
            <v-col cols="12" sm="auto">
              <v-alert
                type="info"
                variant="tonal"
                density="compact"
                icon="mdi-information-outline"
                class="text-caption mb-0"
              >
                All scores are computed automatically and don't need to be recalculated manually.
              </v-alert>
            </v-col>
            <v-col cols="12" sm="auto">
              <v-btn
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

    <!-- Matches for Selected Week -->
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
                    <img class="team-icon" :src="teamImageUrl(match.team1.id)" @error="showDefaultTeamImage">
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
                  <div class="text-caption mt-2 text-grey">{{ match.date_frame || 'TBD' }}</div>
                </div>
              </v-col>

              <!-- Team 2 -->
              <v-col cols="5" class="text-center">
                <div class="team-section">
                  <v-avatar size="80" class="mb-3 team-avatar">
                    <img class="team-icon" :src="teamImageUrl(match.team2.id)" @error="showDefaultTeamImage">
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
                <v-chip size="small" prepend-icon="mdi-map" variant="text" v-if="match.fixed_map">
                  {{ getMapName(match.fixed_map_id) }}
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
      <v-icon size="64" color="grey-lighten-1">mdi-calendar-blank</v-icon>
      <div class="text-h6 mt-4 text-grey">No matches scheduled for Week {{ selectedWeek }}</div>
      <v-btn 
        color="primary" 
        variant="tonal" 
        class="mt-4"
        prepend-icon="mdi-plus"
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
          <v-card-actions class="pa-3">
            <v-btn
              @click="openTeamSelectionModal"
              variant="tonal"
              color="primary"
              prepend-icon="mdi-plus">
              Add Teams
            </v-btn>
            <v-btn
              @click="router.push(`/seasons/${season.id}/assign`)"
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
                @click="$router.push(`/team/${team.id}/season/${season.id}`)"
              >
                <v-card-text class="text-center pa-4">
                  <v-avatar size="64" class="mb-3">
                    <img class="team-icon" :src="teamImageUrl(team.id)" @error="showDefaultTeamImage">
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
                      <div class="text-grey">Against:</div>
                      <div class="font-weight-bold">{{ team.seasons_info[0].points_against }}</div>
                    </v-col>
                    <v-col cols="6" class="text-right">
                      <div class="text-grey">Available:</div>
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
        <v-btn color="primary" @click="addTeamsToSeason" :disabled="!selectedTeams || selectedTeams.length === 0">
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
        Create Match - Week {{ selectedWeek }}
      </v-card-title>
      <v-card-text class="pt-4">
        <v-row>
          <v-col cols="12">
            <v-text-field
              v-model="newMatch.date_frame" 
              label="Date/Time Frame"
              variant="outlined"
              density="comfortable"
              prepend-inner-icon="mdi-calendar-clock"
            ></v-text-field>
          </v-col>
          <v-col cols="12">
            <v-select
              :items="maps"
              item-title="name"
              item-value="id"
              label="Fixed Map (Optional)"
              variant="outlined"
              density="comfortable"
              prepend-inner-icon="mdi-map"
              clearable
              v-model="newMatch.fixed_map_id"
            ></v-select>
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
        <v-btn color="primary" @click="confirmSelection">Create Match</v-btn>
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
      <v-card-text class="pt-4">
        <v-row>
          <v-col cols="12">
            <v-text-field
              v-model="selectedMatch.date_frame" 
              label="Date/Time Frame"
              variant="outlined"
              density="comfortable"
              prepend-inner-icon="mdi-calendar-clock"
            ></v-text-field>
          </v-col>
          <v-col cols="12">
            <v-select
              :items="maps"
              item-title="name"
              item-value="id"
              label="Fixed Map (Optional)"
              variant="outlined"
              density="comfortable"
              prepend-inner-icon="mdi-map"
              clearable
              v-model="selectedMatch.fixed_map_id"
            ></v-select>
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
        <v-btn color="primary" @click="updateMatch">Save Changes</v-btn>
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
import { useRouter, useRoute } from 'vue-router';
import { ref, onMounted, computed, watch } from 'vue';
import { useSeasonStore, useMatchStore, useTeamStore, useMapStore } from '@/stores';
import { storeToRefs } from 'pinia';
import bannerImg from '@/assets/media/GNL_Banner.png';
  import { teamImageUrl, showDefaultTeamImage } from '@/helpers/team-image';


// Store initialization
const router = useRouter();
const route = useRoute();
const seasonStore = useSeasonStore();
const matchStore = useMatchStore();
const teamStore = useTeamStore();
const mapStore = useMapStore();

// Store refs
const { current_season: season } = storeToRefs(seasonStore);
const { matches } = storeToRefs(matchStore);
const { teams } = storeToRefs(teamStore);
const { maps } = storeToRefs(mapStore);

// Route params
const seasonId = router.currentRoute.value.params.id;

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

// Team state
const allTeams = ref(null);
const selectedTeams = ref(null);
const selectedTeam1 = ref(null);
const selectedTeam2 = ref(null);

// Delete dialog state
const showDeleteDialog = ref(false);
const selectedDeleteItemId = ref(null);
const deleteAction = ref(null);

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
  if (score > opponentScore) return 'success';
  if (score < opponentScore) return 'error';
  return 'grey';
};

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
        date_frame:'',
        fixed_map_id:null,
        team1_id:null,
        team2_id:null,
        season_id:seasonId,
        playday: selectedWeek.value
      }
      isModalOpen.value = true;
    };

    const closeMatchCreationModal = () => {
      isModalOpen.value = false;
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
      editMatchDialogOpen.value = true;
    };

    const updateMatch = async () => {
      try {
        await matchStore.updateMatch(selectedMatch.value);
        // Update the local state after a successful PUT request
        await fetchMatches(selectedWeek.value);
        cancelEdit(); // Reset the form
      } catch (error) {
        console.error('Error updating match:', error);
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
      selectedMatch.value = null; // Clear the selected user
    };

    
    const openDeleteDialog = (id, action) => {
      selectedDeleteItemId.value = id;
      deleteAction.value = action; // Store the function dynamically
      showDeleteDialog.value = true;
    };

    const confirmDelete = () => {
      if (selectedDeleteItemId.value && deleteAction.value) {
        deleteAction.value(selectedDeleteItemId.value); // Call the dynamically stored function
        showDeleteDialog.value = false;
      } else if (deleteAction.value) {
         deleteAction.value(); // Call the dynamically stored function
        showDeleteDialog.value = false;
      }
    };

    const cancelDeleteDialog = () => {
      showDeleteDialog.value = false;
      selectedDeleteItemId.value = null;
      deleteAction.value = null; // Store the function dynamically
    };

    const confirmSelection = async () => {
      isLoading.value = true;
      try {
        await matchStore.createMatch(newMatch.value); // Assuming a createMatch method exists
        await fetchMatches(selectedWeek.value); // Refresh matches for the week
        closeMatchCreationModal();
      } catch (error) {
        console.error("Failed to add match:", error);
      } finally {
        isLoading.value = false;
      }
    };

    const fetchMatches = async (week) => {
  selectedWeek.value = week;
  isLoading.value = true;
  router.push({ hash: `#week-${week}` });
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
        const weekFromHash = route.hash && route.hash.includes('#week-') 
            ? parseInt(route.hash.replace('#week-', ''), 10) 
            : 1;
          if(selectedWeek.value && weekFromHash!=selectedWeek.value){
            selectedWeek.value = weekFromHash;
            fetchMatches(weekFromHash);
          }
      }
    });

  
    // Lifecycle hooks
onMounted(async () => {
  isInitLoading.value = true;
  isLoading.value = true;
  try {
    const weekFromHash = route.hash && route.hash.includes('#week-') 
      ? parseInt(route.hash.replace('#week-', ''), 10) 
      : 1;

    // Set the selected week before fetching
    selectedWeek.value = weekFromHash;

    await Promise.all([
      fetchSeasonDetails(),
      fetchTeams(),
      fetchMatches(weekFromHash),
      fetchMaps()
    ]);
  } finally {
    isLoading.value = false;
    isInitLoading.value = false;
  }
});

  </script>

  <style scoped>

  .team-icon {
    width: 100%;
    height: 100%;
    object-fit: cover;
  }

  /* Header Styles */
  #seasonHeader {
    position: relative;
    color: white;
  }
  
  .banner-image {
    position: relative;
  }
  
  .banner-overlay {
    position: absolute;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    background: linear-gradient(to bottom, rgba(0,0,0,0.3), rgba(0,0,0,0.6));
    z-index: 1;
  }

  .season-title {
    text-shadow: 2px 2px 8px rgba(0, 0, 0, 0.8);
    letter-spacing: 1px;
  }

  /* Stat Cards */
  .stat-card {
    background: rgba(255, 255, 255, 0.95) !important;
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