<template>
  <v-overlay v-model="isLoading" persistent absolute>
    <v-progress-circular indeterminate size="64" width="8" color="primary"></v-progress-circular>
  </v-overlay>

  <v-container fluid class="pa-4">
    <v-row class="mb-4">
      <v-col>
        <h1><v-icon class="mr-2">mdi-trophy</v-icon> Fantasy Teams Leaderboard</h1>
      </v-col>
    </v-row>

    <v-alert v-if="errorMessage" type="error" variant="tonal" border="start" border-color="red" class="mb-4" closable>
      {{ errorMessage }}
    </v-alert>

    <v-row>
      <v-col cols="12">
        <v-card elevation="2">
          <v-card-title class="bg-primary d-flex align-center">
            <v-icon class="mr-2">mdi-chart-bar</v-icon>
            <span>Season Leaderboard</span>
          </v-card-title>
          <v-card-text class="pa-0">
            <v-toolbar flat height="auto">
              <v-row align="center" class="flex-wrap ma-0 pa-2">
                <v-col cols="12" sm="auto">
                  <v-select
                    v-model="selectedSeasonId"
                    :items="seasons"
                    item-title="name"
                    item-value="id"
                    label="Season"
                    variant="outlined"
                    density="compact"
                    hide-details
                    style="min-width: 200px;"
                    @update:modelValue="onSeasonChange"
                  ></v-select>
                </v-col>
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
                  <v-btn v-if="auth.isAdmin" variant="elevated" color="primary" prepend-icon="mdi-plus" @click="openCreateDialog" block>
                    Create Team
                  </v-btn>
                </v-col>
              </v-row>
            </v-toolbar>
            <v-data-table
              v-model:expanded="expanded"
              :headers="headers"
              :items="sortedTeams"
              :items-per-page="25"
              item-value="id"
              show-expand
              expand-on-click
              class="elevation-1"
              density="comfortable"
            >
              <template v-slot:[`item.rank`]="{ index }">
                <v-chip :color="getRankColor(index + 1)" size="small">
                  {{ index + 1 }}
                </v-chip>
              </template>

              <template v-slot:[`item.name`]="{ item }">
                {{ item.name || 'N/A' }}
              </template>

              <template v-slot:[`item.captain`]="{ item }">
                <!-- no race: the captain bets, they don't play -->
                <PlayerName v-if="item.captain" :player="item.captain" @click.stop="openPlayer(item.captain)" />
                <template v-else>N/A</template>
              </template>

              <template v-slot:[`item.player_points`]="{ item }">
                {{ item.player_points || 0 }}
              </template>

              <template v-slot:[`item.bench_points`]="{ item }">
                {{ item.bench_points || 0 }}
              </template>

              <template v-slot:[`item.team_points`]="{ item }">
                {{ item.team_points || 0 }}
              </template>

              <template v-slot:[`item.race_points`]="{ item }">
                {{ item.race_points || 0 }}
              </template>

              <template v-slot:[`item.bet_points`]="{ item }">
                {{ item.bet_points || 0 }}
              </template>

              <template v-slot:[`item.total_points`]="{ item }">
                <strong>{{ item.total_points || 0 }}</strong>
              </template>

              <template v-slot:[`item.actions`]="{ item }">
                <RowActions :actions="[
                  { icon: 'mdi-pencil', label: 'Edit', public: !!myUserId && item.captain_id === myUserId, onClick: () => openEditDialog(item) },
                  { icon: 'mdi-delete', label: 'Delete', color: 'error', onClick: () => openDeleteDialog(item) },
                ]" />
              </template>

              <template v-slot:expanded-row="{ columns, item }">
                <tr>
                  <td :colspan="columns.length" class="pa-0">
                    <!-- sticky: stays in view when the summary row scrolls sideways on a narrow window -->
                    <div class="pa-4 expanded-breakdown">
                      <div class="text-h6 mb-2">Score Breakdown</div>
                      <div v-if="!breakdowns[item.id]" class="text-center pa-4">
                        <v-progress-circular indeterminate color="primary" />
                      </div>
                      <FantasyScoreBreakdown
                        v-else
                        :breakdown="breakdowns[item.id]"
                        :players="seasonSignups"
                        :drafted-players="item.drafted_players || []"
                        :season-id="selectedSeasonId"
                        :w3c-season="currentW3CSeason"
                        @open-player="openPlayer"
                      />
                    </div>
                  </td>
                </tr>
              </template>
            </v-data-table>
          </v-card-text>
        </v-card>
      </v-col>
    </v-row>
  </v-container>

  <!-- Player Details Dialog -->
  <PlayerDetailsDialog
    ref="playerDetailsDialog"
    :seasonId="selectedSeasonId"
    :w3cSeason="currentW3CSeason"
  />

  <!-- Create/Edit Team Dialog -->
  <v-dialog v-model="editDialog" max-width="900px" persistent>
    <v-card>
      <v-card-title class="text-h5 bg-primary">
        <v-icon class="mr-2">{{ isEditing ? 'mdi-pencil' : 'mdi-plus' }}</v-icon>
        {{ isEditing ? 'Edit Fantasy Team' : 'Create Fantasy Team' }}
      </v-card-title>
      <v-card-text class="pt-4">
        <StatusAlert v-model="dialogErrorMessage" />
        <v-form ref="teamForm">
          <v-row>
            <v-col cols="12" md="6">
              <v-text-field
                v-model="editedTeam.name"
                label="Team Name *"
                variant="outlined"
                prepend-inner-icon="mdi-account-group"
                density="comfortable"
                :rules="[v => !!v || 'Team name is required']"
              ></v-text-field>
            </v-col>
            <v-col cols="12" md="6">
              <v-select
                v-model="editedTeam.season_id"
                :items="seasons"
                item-title="name"
                item-value="id"
                label="Season *"
                variant="outlined"
                prepend-inner-icon="mdi-calendar"
                density="comfortable"
                :disabled="!auth.isAdmin"
                :rules="[v => !!v || 'Season is required']"
              ></v-select>
            </v-col>
            <v-col cols="12" md="6">
              <v-autocomplete
                v-model="editedTeam.captain_id"
                :items="players"
                item-title="name"
                item-value="id"
                label="Bettor *"
                variant="outlined"
                prepend-inner-icon="mdi-account-star"
                density="comfortable"
                :disabled="!auth.isAdmin"
                :rules="[v => !!v || 'Bettor is required']"
              ></v-autocomplete>
            </v-col>
            <v-col cols="12" md="6">
              <v-autocomplete
                v-model="editedTeam.drafted_team_id"
                :items="gnlTeams"
                item-title="name"
                item-value="id"
                label="Drafted Team *"
                variant="outlined"
                prepend-inner-icon="mdi-shield"
                density="comfortable"
                :rules="[v => !!v || 'Drafted team is required']"
              ></v-autocomplete>
            </v-col>
            <v-col cols="12" md="6">
              <v-select
                v-model="editedTeam.drafted_race"
                :items="races"
                label="Drafted Race *"
                variant="outlined"
                prepend-inner-icon="mdi-sword"
                density="comfortable"
                :rules="[v => !!v || 'Drafted race is required']"
              ></v-select>
            </v-col>
          </v-row>

          <v-row>
            <v-col cols="12">
              <v-divider class="my-2"></v-divider>
              <h3 class="text-h6 mb-3">Drafted Players (Select 1 per Tier) *</h3>
              <v-alert type="info" variant="tonal" density="compact" class="mb-3">
                You must select exactly one player from each tier (1-6)
              </v-alert>
            </v-col>
            <v-col cols="12" md="6" v-for="tier in [1, 2, 3, 4, 5, 6]" :key="tier">
              <v-autocomplete
                v-model="selectedTierPlayers[tier]"
                :items="tierPlayers[tier]"
                item-title="name"
                item-value="id"
                :label="`Tier ${tier} Player *`"
                variant="outlined"
                density="comfortable"
                :rules="[v => !!v || `Tier ${tier} player is required`]"
                clearable
              >
                <template v-slot:prepend-inner>
                  <v-chip size="small" :color="getTierColor(tier)">T{{ tier }}</v-chip>
                </template>
              </v-autocomplete>
            </v-col>
          </v-row>
        </v-form>
      </v-card-text>
      <v-card-actions>
        <v-spacer />
        <v-btn variant="text" @click="closeEditDialog" :disabled="isSaving">Cancel</v-btn>
        <v-btn v-if="auth.isAdmin || (isEditing && editedTeam.captain_id === myUserId)" color="primary" variant="elevated" @click="saveTeam" :loading="isSaving">{{ isEditing ? 'Update' : 'Create' }}</v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>

  <!-- Delete Confirmation Dialog -->
  <v-dialog v-model="deleteDialog" max-width="500px">
    <v-card>
      <v-card-title class="bg-error text-white">
        <v-icon class="mr-2" color="white">mdi-alert</v-icon>
        Confirm Delete
      </v-card-title>
      <v-card-text class="pt-4">
        <p>Are you sure you want to delete the fantasy team "{{ teamToDelete?.name }}"?</p>
        <p class="text-error font-weight-bold mt-2">This action cannot be undone.</p>
      </v-card-text>
      <v-card-actions>
        <v-spacer />
        <v-btn variant="text" @click="closeDeleteDialog" :disabled="isDeleting">Cancel</v-btn>
        <v-btn v-if="auth.isAdmin" color="error" variant="elevated" prepend-icon="mdi-delete" @click="confirmDelete" :loading="isDeleting">Delete</v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>

<script setup>
import RowActions from '@/components/RowActions.vue';
import PlayerDetailsDialog from '@/components/PlayerDetailsDialog.vue';
import FantasyScoreBreakdown from '@/components/FantasyScoreBreakdown.vue';
import { ref, computed, onMounted, watch } from 'vue';
import { useAuthStore, useFantasyStore, usePlayerStore, useSeasonStore, useTeamStore } from '@/stores';
import { storeToRefs } from 'pinia';
import { loadSeasons, resolveCurrentSeasonId, resolveCurrentW3CSeason } from '@/helpers/current-season';
import StatusAlert from '@/components/StatusAlert.vue';


const fantasyStore = useFantasyStore();
const playerStore = usePlayerStore();
const seasonStore = useSeasonStore();
const teamStore = useTeamStore();
const auth = useAuthStore();

const { teams } = storeToRefs(fantasyStore);

const isLoading = ref(false);
const isSaving = ref(false);
const isDeleting = ref(false);
const errorMessage = ref(null);
const seasons = ref([]);
const selectedSeasonId = ref(null);
const currentW3CSeason = ref(null);
const editDialog = ref(false);
const deleteDialog = ref(false);
const teamToDelete = ref(null);
const isEditing = ref(false);
const expanded = ref([]);
const breakdowns = ref({});  // by team id, filled when a row expands
const playerDetailsDialog = ref(null);
const players = ref([]);
// The breakdown's opponent/bet resolve() pool: season signups, carrying signup_race
const seasonSignups = ref([]);
const gnlTeams = ref([]);
const races = ref([
  { title: 'Human', value: 'HU' },
  { title: 'Orc', value: 'OC' },
  { title: 'Night Elf', value: 'NE' },
  { title: 'Undead', value: 'UD' },
  { title: 'Random', value: 'RANDOM' }
]);
const emptyTeam = (seasonId = null) => ({
  id: null,
  name: '',
  season_id: seasonId,
  captain_id: null,
  drafted_team_id: null,
  drafted_race: null,
  player_ids: []
});
const emptyTierSelection = () => ({ 1: null, 2: null, 3: null, 4: null, 5: null, 6: null });

const editedTeam = ref(emptyTeam());
const teamForm = ref(null);
const dialogErrorMessage = ref(null);
const tierPlayers = ref({
  1: [],
  2: [],
  3: [],
  4: [],
  5: [],
  6: []
});
const selectedTierPlayers = ref(emptyTierSelection());

const headers = computed(() => [
  { title: '', key: 'data-table-expand', sortable: false, width: '48px' },
  { title: 'Rank', value: 'rank', sortable: false, width: '80px' },
  { title: 'Fantasy Team', value: 'name', sortable: false },
  { title: 'Bettor', value: 'captain', sortable: false },
  { title: 'Player Points', value: 'player_points', align: 'end' },
  { title: 'Bench Points', value: 'bench_points', align: 'end' },
  { title: 'Team Points', value: 'team_points', align: 'end' },
  { title: 'Race Points', value: 'race_points', align: 'end' },
  { title: 'Bet Points', value: 'bet_points', align: 'end' },
  { title: 'Total', value: 'total_points', align: 'end' },
  // the column exists only for viewers with at least one visible row action: admin, or captain of a listed team
  ...(auth.isAdmin || teams.value.some((t) => t.captain_id === myUserId.value)
    ? [{ title: '', value: 'actions', sortable: false, align: 'center' }] : []),
]);

const myUserId = computed(() => auth.me?.user?.id ?? null);

const openPlayer = (player) => {
  playerDetailsDialog.value.open(player);
};

// An expanded row shows the breakdown, fetched once per team and season
watch(expanded, async (ids) => {
  for (const id of ids) {
    if (breakdowns.value[id] || !selectedSeasonId.value) continue;
    try {
      breakdowns.value[id] = await fantasyStore.getTeamScoreBreakdown(id, selectedSeasonId.value);
    } catch (error) {
      console.error('Failed to fetch score breakdown:', error);
      errorMessage.value = `Failed to fetch score breakdown: ${error.message || 'Unknown error'}`;
    }
  }
});

const sortedTeams = computed(() => {
  return [...teams.value].sort((a, b) => {
    const aTotal = a.total_points || 0;
    const bTotal = b.total_points || 0;
    return bTotal - aTotal;
  });
});

const getRankColor = (rank) => {
  if (rank === 1) return 'gold';
  if (rank === 2) return 'silver';
  if (rank === 3) return '#CD7F32'; // bronze
  return 'grey';
};

const getTierColor = (tier) => {
  const colors = {
    1: 'purple',
    2: 'blue',
    3: 'green',
    4: 'orange',
    5: 'brown',
    6: 'grey'
  };
  return colors[tier] || 'grey';
};

const fetchData = async () => {
  isLoading.value = true;
  errorMessage.value = null;
  try {
    // If no season selected, get current season
    if (!selectedSeasonId.value) {
      selectedSeasonId.value = await resolveCurrentSeasonId();
    }

    if (!selectedSeasonId.value) {
      errorMessage.value = 'No season is available. Please contact an administrator.';
      isLoading.value = false;
      return;
    }
    
    // Fetch teams for selected season
    expanded.value = [];
    breakdowns.value = {};
    const teamsQuery = `season_id == ${selectedSeasonId.value}`;
    await fantasyStore.searchTeams(teamsQuery);
    seasonSignups.value = await seasonStore.fetchSeasonSignups(selectedSeasonId.value) || [];
  } catch (error) {
    console.error('Failed to fetch fantasy teams:', error);
    errorMessage.value = 'Failed to load fantasy teams. Please try again later.';
  } finally {
    isLoading.value = false;
  }
};

const onSeasonChange = async () => {
  await fetchData();
};

const openCreateDialog = async () => {
  isEditing.value = false;
  dialogErrorMessage.value = null;
  editedTeam.value = emptyTeam(selectedSeasonId.value);
  selectedTierPlayers.value = emptyTierSelection();
  await loadPlayersAndTeams();
  editDialog.value = true;
};

const openEditDialog = async (team) => {
  isEditing.value = true;
  dialogErrorMessage.value = null;
  
  editedTeam.value = {
    id: team.id,
    name: team.name,
    season_id: team.season_id,
    captain_id: team.captain_id,
    drafted_team_id: team.drafted_team_id,
    drafted_race: team.drafted_race,
    player_ids: team.drafted_players?.map(p => p.user_id) || []
  };
  
  // Load players and teams first to ensure tier dropdowns are populated
  await loadPlayersAndTeams();
  
  // Reset tier selections
  selectedTierPlayers.value = emptyTierSelection();
  
  // Populate tier selections from existing players AFTER players are loaded
  if (team.drafted_players && team.drafted_players.length > 0) {
    team.drafted_players.forEach(dp => {
      // Try different possible property names
      const playerId = dp.user_id || dp.id || dp.player_id;
      const player = players.value.find(p => p.id === playerId);
      if (player && player.fantasy_tier) {
        selectedTierPlayers.value[player.fantasy_tier] = player.id;
      }
    });
  }
  
  editDialog.value = true;
};

const closeEditDialog = () => {
  editDialog.value = false;
  dialogErrorMessage.value = null;
  editedTeam.value = emptyTeam();
  selectedTierPlayers.value = emptyTierSelection();
};

const saveTeam = async () => {
  // Validate form
  const { valid } = await teamForm.value.validate();
  if (!valid) return;

  // Validate all 6 tiers are selected
  const missingTiers = [];
  for (let tier = 1; tier <= 6; tier++) {
    if (!selectedTierPlayers.value[tier]) {
      missingTiers.push(tier);
    }
  }
  
  if (missingTiers.length > 0) {
    dialogErrorMessage.value = `Please select players for tier(s): ${missingTiers.join(', ')}`;
    return;
  }

  // Build player_ids array from tier selections
  const playerIds = Object.values(selectedTierPlayers.value).filter(id => id !== null);
  
  if (playerIds.length !== 6) {
    dialogErrorMessage.value = 'You must select exactly 6 players (one from each tier)';
    return;
  }

  isSaving.value = true;
  dialogErrorMessage.value = null;
  try {
    const teamData = {
      name: editedTeam.value.name,
      season_id: editedTeam.value.season_id,
      captain_id: editedTeam.value.captain_id,
      drafted_team_id: editedTeam.value.drafted_team_id,
      drafted_race: editedTeam.value.drafted_race
    };

    if (isEditing.value) {
      // Update existing team
      await fantasyStore.updateTeam(editedTeam.value.id, teamData);
      
      // Update players if changed
      const team = teams.value.find(t => t.id === editedTeam.value.id);
      // Get current player IDs - use the same property lookup as in openEditDialog
      const currentPlayerIds = team.drafted_players?.map(p => p.user_id || p.id || p.player_id).filter(id => id) || [];
      
      const playersToAdd = playerIds.filter(id => !currentPlayerIds.includes(id));
      const playersToRemove = currentPlayerIds.filter(id => !playerIds.includes(id));
      
      if (playersToRemove.length > 0) {
        await fantasyStore.removePlayers(editedTeam.value.id, playersToRemove);
      }
      if (playersToAdd.length > 0) {
        await fantasyStore.addPlayers(editedTeam.value.id, playersToAdd);
      }
    } else {
      // Create new team
      const newTeam = await fantasyStore.createTeam(teamData);
      
      // Add players
      if (playerIds.length > 0) {
        await fantasyStore.addPlayers(newTeam.id, playerIds);
      }
    }

    closeEditDialog();
    await fetchData(); // Refresh the list
  } catch (error) {
    console.error('Failed to save team:', error);
    dialogErrorMessage.value = `Failed to ${isEditing.value ? 'update' : 'create'} team: ${error.message || 'Unknown error'}`;
  } finally {
    isSaving.value = false;
  }
};

const loadPlayersAndTeams = async () => {
  try {
    await playerStore.fetchPlayers();
    players.value = playerStore.players || [];
    
    // Organize players by tier
    tierPlayers.value = {
      1: [],
      2: [],
      3: [],
      4: [],
      5: [],
      6: []
    };
    
    players.value.forEach(player => {
      if (player.fantasy_tier >= 1 && player.fantasy_tier <= 6) {
        tierPlayers.value[player.fantasy_tier].push(player);
      }
    });
    
    if (selectedSeasonId.value) {
      await teamStore.fetchTeamsBySeasonBasic(selectedSeasonId.value);
      gnlTeams.value = teamStore.teams || [];
    }
  } catch (error) {
    console.error('Failed to load players and teams:', error);
  }
};

const openDeleteDialog = (team) => {
  teamToDelete.value = team;
  deleteDialog.value = true;
};

const closeDeleteDialog = () => {
  deleteDialog.value = false;
  teamToDelete.value = null;
};

const confirmDelete = async () => {
  if (!teamToDelete.value) return;
  
  isDeleting.value = true;
  errorMessage.value = null;
  try {
    await fantasyStore.deleteTeam(teamToDelete.value.id);
    closeDeleteDialog();
    await fetchData(); // Refresh the list
  } catch (error) {
    console.error('Failed to delete team:', error);
    errorMessage.value = `Failed to delete team: ${error.message || 'Unknown error'}`;
    closeDeleteDialog();
  } finally {
    isDeleting.value = false;
  }
};

onMounted(async () => {
  loadSeasons().then(list => { seasons.value = list; });
  fetchData();
  loadPlayersAndTeams();
  currentW3CSeason.value = await resolveCurrentW3CSeason();
});
</script>

<style scoped>
.expanded-breakdown {
  position: sticky;
  left: 0;
  max-width: calc(100vw - 48px);
}
</style>
