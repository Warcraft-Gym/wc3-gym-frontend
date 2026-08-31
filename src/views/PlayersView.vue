<template>
  <v-container fluid class="pa-4">
    <!-- Page Header -->
    <v-row class="mb-4">
      <v-col>
        <h1>
          <v-icon class="mr-2">mdi-account-group</v-icon>
          Players
        </h1>
      </v-col>
    </v-row>

    <!-- Filters (extracted to reusable component) -->
    <FilterPanel
      v-model:searchName="searchName"
      v-model:searchRace="searchRace"
      v-model:selectedSeasonFilter="selectedSeasonFilter"
      v-model:rangeValues="rangeValues"
      :seasons="seasons"
      :showName="true"
      :showRace="true"
      :showSeason="true"
      :showMMR="true"
      :showReset="true"
      @reset="fetchPlayers"
    >
      <template #after>
        <v-col cols="12" md="6">
          <v-select
            v-model="selectedW3CFilter"
            :items="w3cFilterOptions"
            label="W3C Stats Filter"
            multiple
            chips
            clearable
            variant="outlined"
            density="comfortable"
            prepend-inner-icon="mdi-filter"
            hint="Filter players by W3Champions stats"
            persistent-hint
          ></v-select>
        </v-col>
      </template>
    </FilterPanel>
    <!-- Main Card -->
    <v-card elevation="2">
      <v-card-title class="bg-primary d-flex align-center">
        <v-icon class="mr-2">mdi-account-group</v-icon>
        <span>Players Overview</span>
      </v-card-title>

      <v-card-text v-if="!errorMessage" class="pa-0">
        <v-data-table
          :headers="tableHeader"
          :loading="isLoading"
          :items="filteredPlayers"
          :row-props="getRowClass"
          fixed-header
          hover
        >
          <template v-slot:loading>
            <v-skeleton-loader type="table-row@10"></v-skeleton-loader>
          </template>

          <template #top>
            <v-toolbar flat height="auto">
              <v-row align="center" class="flex-wrap ma-0 pa-2">
                <v-spacer />
                <v-col cols="12" sm="auto">
                  <v-btn v-if="auth.isAdmin" variant="elevated" color="primary" prepend-icon="mdi-plus" @click="openCreateNew" block>
                    Add New Player
                  </v-btn>
                </v-col>
              </v-row>
            </v-toolbar>
          </template>
              <template v-slot:item="{ item }">
                <tr class="text-no-wrap">
                  <td>{{ item.id }}</td>
                  <td>
                    <PlayerName :player="item" @click.stop="openPlayerDetails(item)">
                      <template v-if="!hasW3CStats(item)">
                        <v-tooltip>
                          <template #activator="{ props }">
                            <v-icon v-bind="props" small color="red">mdi-alert</v-icon>
                          </template>
                          <span>No W3C stats found for {{ item.race }}</span>
                        </v-tooltip>
                      </template>
                      <template v-else-if="hasLowGames(item)">
                        <v-tooltip>
                          <template #activator="{ props }">
                            <v-icon v-bind="props" small color="orange">mdi-alert</v-icon>
                          </template>
                          <span>Less than 20 games ({{ getW3CGamesCount(item, currentW3CSeason) }} games) for {{ item.race }}</span>
                        </v-tooltip>
                      </template>
                    </PlayerName>
                  </td>
                  <td>{{ item.battleTag }}</td>
                  <td>{{ item.discordTag }}</td>
                  <td>
                    {{ getW3CMMR(item, currentW3CSeason) }}
                    <span v-if="mmrSeasonLabel(item)" class="text-caption text-medium-emphasis ml-1">{{ mmrSeasonLabel(item) }}</span>
                  </td>
                  <td>
                    <div v-if="item.race">
                      <RaceIcon :raceIdentifier="item.race" />                                          
                    </div>
                  </td>     
                  <!-- Have a button with click | opens a pannel | with each race's mmr / WR / Wins + losses AND Link to w3c -->           
                  <td>
                    <div v-if="item.signup_seasons && item.signup_seasons.length > 0">
                      <template v-for="s in item.signup_seasons.slice().sort((a,b) => b.id - a.id).slice(0,2)" :key="s.id">
                        <v-chip small class="ma-1">{{ s.name }}</v-chip>
                      </template>
                      <v-menu v-if="item.signup_seasons.length > 2" offset-y>
                        <template #activator="{ props }">
                          <v-chip v-bind="props" class="ma-1" small>+{{ item.signup_seasons.length - 2 }}</v-chip>
                        </template>
                        <v-list>
                          <v-list-item v-for="s in item.signup_seasons.slice().sort((a,b) => b.id - a.id)" :key="s.id">
                            <v-list-item-title>{{ s.name }}</v-list-item-title>
                          </v-list-item>
                        </v-list>
                      </v-menu>
                    </div>
                    <div v-else>—</div>
                  </td>
                  <td v-if="auth.isAdmin">
                    <RowActions :actions="[
                      { icon: 'mdi-pencil', label: 'Edit', onClick: () => editPlayer(item) },
                      { icon: syncIcon(item.id), label: syncLabel(item.id), color: syncColor(item.id), loading: syncState(item.id) === 'loading', onClick: () => syncW3CPlayer(item.id) },
                      { icon: 'mdi-delete', label: 'Delete', color: 'error', onClick: () => openDeleteDialog(item.id, removePlayer) },
                    ]" />
                  </td>
                </tr>
              </template>
        </v-data-table>
      </v-card-text>

      <!-- Enhanced Empty State -->
      <v-card-text v-else class="text-center pa-8">
        <v-icon size="64" color="grey-lighten-1">mdi-account-off</v-icon>
        <div class="text-h6 text-grey mt-4 mb-2">No players found</div>
        <p class="text-grey-darken-1 mb-4">Get started by adding your first player</p>
        <v-btn v-if="auth.isAdmin" variant="elevated" color="primary" prepend-icon="mdi-plus" @click="openCreateNew">
          Add First Player
        </v-btn>
      </v-card-text>
    </v-card>
    <!-- Add New Player Dialog -->
    <v-dialog v-model="showNewPlayerModal" max-width="800">
      <v-card>
        <v-card-title class="bg-primary">
          <v-icon class="mr-2">mdi-account-plus</v-icon>
          Add New Player
        </v-card-title>

        <v-alert
          v-if="creationError"
          type="error"
          variant="tonal"
          border="start"
          border-color="red"
          class="mx-4 my-2"
          closable
          @click:close="creationError = null"
        >
          {{ creationError }}
        </v-alert>

        <v-card-text class="pt-4">
          <v-row>
            <v-col cols="12" md="6">
              <v-text-field
                v-model="newPlayer.name"
                label="Player Name"
                variant="outlined"
                prepend-inner-icon="mdi-account"
                density="comfortable"
              ></v-text-field>
            </v-col>
            <v-col cols="12" md="6">
              <v-text-field
                v-model="newPlayer.battleTag"
                label="BattleTag"
                variant="outlined"
                prepend-inner-icon="mdi-shield-account"
                density="comfortable"
              ></v-text-field>
            </v-col>
          </v-row>
          <v-row>
            <v-col cols="12" md="6">
              <CountrySelect v-model="newPlayer.country" />
            </v-col>
            <v-col cols="12" md="6">
              <v-text-field
                v-model="newPlayer.discordTag"
                label="Discord Tag"
                variant="outlined"
                prepend-inner-icon="mdi-discord"
                density="comfortable"
              ></v-text-field>
            </v-col>
          </v-row>
          <v-row>
            <v-col cols="12" md="6">
              <v-text-field
                v-model="newPlayer.discordId"
                label="Discord ID"
                hint="Numeric Discord user ID (required)"
                variant="outlined"
                prepend-inner-icon="mdi-identifier"
                density="comfortable"
              ></v-text-field>
            </v-col>
          </v-row>
          <v-row>
            <v-col cols="12" md="6">
              <RaceSelect v-model="newPlayer.race" />
            </v-col>
            <v-col cols="12" md="6">
              <v-text-field
                v-model="newPlayer.fantasy_tier"
                label="Fantasy Tier"
                variant="outlined"
                prepend-inner-icon="mdi-trophy"
                density="comfortable"
              ></v-text-field>
            </v-col>
          </v-row>
          <v-row>
            <v-col cols="12">
              <v-select
                v-model="selectedSignupSeasonIdsNew"
                :items="seasons"
                item-title="name"
                item-value="id"
                multiple
                chips
                label="Signed-up Seasons"
                clearable
                variant="outlined"
                prepend-inner-icon="mdi-calendar-check"
                density="comfortable"
              ></v-select>
            </v-col>
          </v-row>
        </v-card-text>

        <v-card-actions>
          <v-spacer />
          <v-btn @click="cancelAddNewPlayer">Cancel</v-btn>
          <v-btn
            v-if="auth.isAdmin"
            @click="createNewPlayer"
            color="primary"
            variant="elevated"
            prepend-icon="mdi-plus"
            :loading="isCreating"
            :disabled="isCreating"
          >
            Add Player
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <!-- Edit Player Dialog -->
    <v-dialog v-model="showEditPlayerModal" max-width="800">
      <v-card v-if="selectedPlayer">
        <v-card-title class="bg-primary">
          <v-icon class="mr-2">mdi-pencil</v-icon>
          Edit Player: {{ selectedPlayer.name }}
        </v-card-title>

        <v-alert
          v-if="updateError"
          type="error"
          variant="tonal"
          border="start"
          border-color="red"
          class="mx-4 my-2"
          closable
          @click:close="updateError = null"
        >
          {{ updateError }}
        </v-alert>

        <v-card-text class="pt-4">
          <v-row>
            <v-col cols="12" md="6">
              <v-text-field
                v-model="selectedPlayer.name"
                label="Player Name"
                variant="outlined"
                prepend-inner-icon="mdi-account"
                density="comfortable"
              ></v-text-field>
            </v-col>
            <v-col cols="12" md="6">
              <v-text-field
                v-model="selectedPlayer.battleTag"
                label="BattleTag"
                variant="outlined"
                prepend-inner-icon="mdi-shield-account"
                density="comfortable"
              ></v-text-field>
            </v-col>
          </v-row>
          <v-row>
            <v-col cols="12" md="6">
              <CountrySelect v-model="selectedPlayer.country" />
            </v-col>
            <v-col cols="12" md="6">
              <v-text-field
                v-model="selectedPlayer.discordTag"
                label="Discord Tag"
                variant="outlined"
                prepend-inner-icon="mdi-discord"
                density="comfortable"
              ></v-text-field>
            </v-col>
          </v-row>
          <v-row>
            <v-col cols="12" md="6">
              <v-text-field
                v-model="selectedPlayer.discordId"
                label="Discord ID"
                hint="Numeric Discord user ID (required)"
                variant="outlined"
                prepend-inner-icon="mdi-identifier"
                density="comfortable"
              ></v-text-field>
            </v-col>
          </v-row>
          <v-row>
            <v-col cols="12" md="6">
              <RaceSelect v-model="selectedPlayer.race" />
            </v-col>
            <v-col cols="12" md="6">
              <v-text-field
                v-model="selectedPlayer.fantasy_tier"
                label="Fantasy Tier"
                variant="outlined"
                prepend-inner-icon="mdi-trophy"
                density="comfortable"
              ></v-text-field>
            </v-col>
          </v-row>
          <v-row>
            <v-col cols="12">
              <v-select
                v-model="selectedSignupSeasonIds"
                :items="seasons"
                item-title="name"
                item-value="id"
                multiple
                chips
                label="Signed-up Seasons"
                variant="outlined"
                prepend-inner-icon="mdi-calendar-check"
                density="comfortable"
              ></v-select>
            </v-col>
          </v-row>
        </v-card-text>

        <v-card-actions>
          <v-spacer />
          <v-btn @click="cancelEdit">Cancel</v-btn>
          <v-btn v-if="auth.isAdmin" @click="updatePlayer" color="primary" variant="elevated" prepend-icon="mdi-content-save">
            Save Changes
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>
    <!-- Delete Confirmation Dialog -->
    <v-dialog v-model="showDeleteDialog" max-width="400">
      <v-card>
        <v-card-title class="bg-error text-white">
          <v-icon class="mr-2">mdi-alert</v-icon>
          Confirm Deletion
        </v-card-title>
        <v-card-text class="pt-4">
          Are you sure you want to delete this player? This action cannot be undone.
        </v-card-text>
        <v-card-actions>
          <v-spacer />
          <v-btn @click="cancelDeleteDialog" variant="text">Cancel</v-btn>
          <v-btn v-if="auth.isAdmin" @click="confirmDelete" color="error" variant="elevated" prepend-icon="mdi-delete">
            Delete
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>
    
    <!-- Player Details Dialog -->
    <PlayerDetailsDialog 
      v-model="showPlayerDetails"
      :player="playerDetails"
      :seasonId="currentSeasonId"
      :seasonName="currentSeasonName"
      :w3cSeason="currentW3CSeason"
    />
  </v-container>
</template>
<script setup>
import RowActions from '@/components/RowActions.vue';
import { useAuthStore, usePlayerStore, useSeasonStore } from '@/stores';
import { storeToRefs } from 'pinia';
import { onMounted, ref, computed } from 'vue';
import PlayerDetailsDialog from '@/components/PlayerDetailsDialog.vue';
import FilterPanel from '@/components/FilterPanel.vue';
import { resolveCurrentSeasonId, resolveCurrentW3CSeason } from '@/helpers/current-season';
import { 
  getW3CMMR,
  getW3CMMRSeason,
  getW3CGamesCount,
  hasW3CStatsTwoSeasons,
  hasLowGamesTwoSeasons
} from '@/helpers/w3c-stats';
import { matchesPlayerSearch, filterByMmrRange } from '@/helpers/players';


// State for editing
const selectedPlayer = ref(null);
const isLoading  = ref(false); // State for selected user
const isCreating = ref(false); // State for creating new player
const errorMessage = ref(null);
const creationError = ref(null);
const updateError = ref(null);
const showNewPlayerModal = ref(false);
const showEditPlayerModal = ref(false);
const newPlayer = ref({
  name: '',
  battleTag: '',
  country: '',
  discordTag: '',
  discordId: '',
  race: '',
  fantasy_tier: null,
});
// seasons selected when creating a new player
const selectedSignupSeasonIdsNew = ref([]);
const playerStore = usePlayerStore();
const seasonStore = useSeasonStore();
const auth = useAuthStore();
const { players } = storeToRefs(playerStore);
const { seasons } = storeToRefs(seasonStore);
// filter for season in the grid
const selectedSeasonFilter = ref(null);

const filteredPlayers = computed(() => {
  let list = players.value || [];

  // filter by name / battletag / discord
  if (searchName.value && searchName.value.trim().length > 0) {
    list = list.filter(p => matchesPlayerSearch(p, searchName.value));
  }

  // filter by race
  if (searchRace.value) {
    list = list.filter(p => p.race === searchRace.value);
  }

  // filter by season signup
  if (selectedSeasonFilter.value) {
    list = list.filter(p => (p.signup_seasons || []).some(s => s.id === selectedSeasonFilter.value));
  }

  // filter by mmr range — only apply if user changed from defaults
  list = filterByMmrRange(list, rangeValues.value, p => Number(getW3CMMR(p, currentW3CSeason.value) ?? 0));

  // filter by W3C stats
  if (selectedW3CFilter.value && selectedW3CFilter.value.length > 0) {
    list = list.filter(p => {
      const includeNoStats = selectedW3CFilter.value.includes('no_stats');
      const includeLowGames = selectedW3CFilter.value.includes('low_games');
      
      if (includeNoStats && !hasW3CStats(p)) return true;
      if (includeLowGames && hasLowGames(p)) return true;
      
      return false;
    });
  }

  return list;
});
// seasons for signup selection
const selectedSignupSeasonIds = ref([]);
let originalSignupSeasonIds = [];
// Fetch data when the page is loaded
const showDeleteDialog = ref(false);
const selectedDeleteItemId = ref(null);
const deleteAction = ref(null);
//research models
const searchRace = ref(null);
const searchName = ref(null);
const rangeValues = ref([0, 3000]);
const selectedW3CFilter = ref([]);
const w3cFilterOptions = [
  { title: 'No W3C Stats', value: 'no_stats' },
  { title: 'Less than 20 games', value: 'low_games' }
];

//table header
/*
ID
Name
BattleTag
Country
Discord Tag
W3C MMR
Main Race
W3C Stats
Fantasy Tier
Actions
*/
// the Actions column carries admin operations (edit, W3C sync, delete)
const tableHeader = computed(() => [
  { title: 'ID', value: 'id', align: 'start', sortable: true },
  { title: 'Name', value: 'name', sortable: true },
  { title: 'Battletag', value: 'battleTag', sortable: true },
  { title: 'Discord Name', value: 'discordTag', sortable: true },
  { title: currentW3CSeason.value ? `W3C MMR (S${currentW3CSeason.value})` : 'W3C MMR', value: 'mmr', sortable: false },
  { title: 'Main Race', value: 'race', sortable: true },
  { title: 'Signups', value: 'signups', sortable: false },
  ...(auth.isAdmin ? [{ title: '', key: 'actions', align: 'end', sortable: false }] : []),
]);

// Fetch users when the component is mounted
const fetchPlayers = async () => {
  
  isLoading.value = true;
  errorMessage.value = null; // Reset error message
  try {
    await playerStore.fetchPlayers(); // Fetch user data


    if (playerStore.players.length === 0) {
      errorMessage.value = 'No users found.';
    }
  } catch (error) {
    errorMessage.value = 'Failed to load users. Please try again later.';
    } finally {
    isLoading.value = false;

    //reset placeholders
    searchName.value = ''
    searchRace.value = ''
    // reset season filter as well
    selectedSeasonFilter.value = null;
    // reset W3C filter
    selectedW3CFilter.value = [];
    // keep numeric defaults
    rangeValues.value = [0, 3000];
  }
};

// Refresh data without resetting filters (for sync operations)
onMounted( async () => {
  // Ensure seasons are loaded first for the filter dropdown
  try {
    await seasonStore.fetchSeasons();
  } catch (err) {
    console.error('Failed to fetch seasons:', err);
  }
  
  await fetchPlayers();
  // ensure seasons are loaded and resolve the current season id
  currentSeasonId.value = await resolveCurrentSeasonId();
  currentW3CSeason.value = await resolveCurrentW3CSeason();
});

// Open player details dialog and ensure we have the player's data
const openPlayerDetails = async (player) => {
  // ensure currentSeasonId is resolved
  if (!currentSeasonId.value) currentSeasonId.value = await resolveCurrentSeasonId();

  // if player object doesn't include stats, we rely on the players list
  playerDetails.value = player;
  showPlayerDetails.value = true;
};

// per-player sync status map: { [playerId]: { state: 'loading'|'success'|'error', message?: string } }
const perPlayerSyncStatus = ref({});

// Player details dialog state
const showPlayerDetails = ref(false);
const playerDetails = ref(null);

// current season id preference (resolved from settings or fallback)
const currentSeasonId = ref(null);
const currentSeasonName = computed(() => (seasons.value || []).find(s => s.id === currentSeasonId.value)?.name || '');
// Current W3C season number (for stats fallback logic)
const currentW3CSeason = ref(null);

// Names the season an MMR came from when it is not the one in the column header
const mmrSeasonLabel = (player) => {
  const season = getW3CMMRSeason(player, currentW3CSeason.value);
  return season && season !== currentW3CSeason.value ? `S${season}` : '';
};

const hasW3CStats = (player) => {
  // Check current season OR previous season for warning display
  return hasW3CStatsTwoSeasons(player, currentW3CSeason.value);
};

const hasLowGames = (player) => {
  // Use combined games count from current + previous season
  return hasLowGamesTwoSeasons(player, currentW3CSeason.value);
};

const openDeleteDialog = (id, action) => {
  selectedDeleteItemId.value = id;
  deleteAction.value = action; // Store the function dynamically
  showDeleteDialog.value = true;
};

const openCreateNew = async () => {
  try {
    if (seasonStore && seasonStore.fetchSeasons) await seasonStore.fetchSeasons();
  } catch (err) {
    console.error('Failed to fetch seasons before opening create player dialog:', err);
  }
  newPlayer.value = {
    name: '',
    battleTag: '',
    country: '',
    discordTag: '',
    discordId: '',
    mmr: 0,
    race: '',
    fantasy_tier: null,
  };
  creationError.value = '';
  showNewPlayerModal.value = true;
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

// Methods
const getRowClass = () => ({
  class: 'player-row'
});


const editPlayer = async (player) => {
  try {
    if (seasonStore && seasonStore.fetchSeasons) await seasonStore.fetchSeasons();
  } catch (err) {
    console.error('Failed to fetch seasons before opening edit player dialog:', err);
  }
  selectedPlayer.value = { ...player }; // Clone the user object to avoid modifying the original object directly
  updateError.value = '';
  // prepare signup seasons selection
  const signup = selectedPlayer.value.signup_seasons || [];
  originalSignupSeasonIds = signup.map(s => s.id);
  selectedSignupSeasonIds.value = [...originalSignupSeasonIds];
  showEditPlayerModal.value = true;
};

const updatePlayer = async () => {
  updateError.value = '';
  try {
    // send selectedPlayer directly — fields match backend schema
    await playerStore.updatePlayer(selectedPlayer.value);
    // Update the local state after a successful PUT request
    const playerId = selectedPlayer.value.id;
    const newSignupIds = selectedSignupSeasonIds.value || [];
    const toAdd = newSignupIds.filter(id => !originalSignupSeasonIds.includes(id));
    const toRemove = originalSignupSeasonIds.filter(id => !newSignupIds.includes(id));

    // perform API calls per season via season store actions
    try {
      // additions
      await Promise.all(toAdd.map(sid => seasonStore.addUserSignup(sid, [playerId])));
      // removals
      await Promise.all(toRemove.map(sid => seasonStore.removeUserSignup(sid, [playerId])));
    } catch (err) {
      console.error('Failed to sync signup seasons:', err);
    }

    await fetchPlayers(); // Re-fetch the users
    cancelEdit(); // Reset the form
  } catch (error) {
    console.error('Error updating user:', error);
    updateError.value = 'Error updating user: ' + error.message;
  }
};

const cancelEdit = () => {
  showEditPlayerModal.value = false;
  selectedPlayer.value = {}; // Clear the selected user
  
};

const createNewPlayer = async () => {
  creationError.value = '';
  isCreating.value = true;
  try {
    // send newPlayer directly — fields use backend schema names
    const created = await playerStore.createPlayer(newPlayer.value);

    // determine created player id: prefer API return, otherwise refetch and find by unique battletag
    let createdId = created && created.id ? created.id : null;
    if (!createdId) {
      await fetchPlayers();
      // try to find by battletag and name as fallback
      const found = (players.value || []).find(p => p.battleTag === newPlayer.value.battleTag && p.name === newPlayer.value.name);
      createdId = found ? found.id : null;
    }


    // If seasons were selected, register the user for those seasons
    if (createdId && Array.isArray(selectedSignupSeasonIdsNew.value) && selectedSignupSeasonIdsNew.value.length > 0) {
      try {
        await Promise.all(selectedSignupSeasonIdsNew.value.map(async sid => {
          const result = await seasonStore.addUserSignup(sid, [createdId]);
          return result;
        }));
      } catch (err) {
        console.error('Failed to add user signup for new player:', err);
        creationError.value = 'Player created but failed to add to seasons: ' + err.message;
      }
    }

    // refresh players list and close modal
    await fetchPlayers();
    cancelAddNewPlayer();
  } catch (error) {
    console.error('Error creating user:', error);
    creationError.value = 'Error creating user: ' + error.message;
  } finally {
    isCreating.value = false;
  }
};

const removePlayer = async (playerId) => {
  try {
    await playerStore.deletePlayer(playerId);
    await fetchPlayers(); // Refresh the list after deletion
  } catch (error) {
    console.error('Error deleting player:', error);
  }
};

const syncState = (playerId) => perPlayerSyncStatus.value[playerId]?.state;
const syncIcon = (playerId) => ({ success: 'mdi-check-circle', error: 'mdi-alert-circle' }[syncState(playerId)] ?? 'mdi-sync');
const syncLabel = (playerId) => ({ success: 'Synced', error: 'Retry Sync' }[syncState(playerId)] ?? 'Sync W3C');
const syncColor = (playerId) => ({ success: 'success', error: 'error' }[syncState(playerId)]);

const syncW3CPlayer = async (playerId) => {
  if (!playerId) return;
  perPlayerSyncStatus.value = { ...perPlayerSyncStatus.value, [playerId]: { state: 'loading' } };
  try {
    await playerStore.syncW3CPlayer(playerId);
    perPlayerSyncStatus.value = { ...perPlayerSyncStatus.value, [playerId]: { state: 'success' } };
  } catch (error) {
    console.error('Error syncing player:', playerId, error);
    perPlayerSyncStatus.value = { ...perPlayerSyncStatus.value, [playerId]: { state: 'error', message: error.message } };
  }
};

const cancelAddNewPlayer = () => {
  showNewPlayerModal.value = false;
  newPlayer.value = {
    name: '',
    battleTag: '',
    country: '',
    discordTag: '',
    discordId: '',
    race: '',
    fantasy_tier: null,
  };
  selectedSignupSeasonIdsNew.value = [];
};
</script>

<style scoped>
.player-row {
  cursor: pointer;
  transition: all 0.2s ease;
}

.player-row:hover {
  background-color: rgba(var(--v-theme-primary), 0.05) !important;
}
</style>
