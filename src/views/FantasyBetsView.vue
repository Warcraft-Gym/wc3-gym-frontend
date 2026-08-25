<template>
  <v-overlay v-model="isLoading" persistent absolute>
    <v-progress-circular indeterminate size="64" width="8" color="primary"></v-progress-circular>
  </v-overlay>

  <v-container fluid class="pa-4">
    <!-- Page Header -->
    <v-row class="mb-4">
      <v-col>
        <h1>
          <v-icon class="mr-2">mdi-casino</v-icon>
          Fantasy Bets
        </h1>
      </v-col>
    </v-row>

    <v-alert v-if="errorMessage" type="error" variant="tonal" border="start" border-color="red" class="mb-4" closable @click:close="errorMessage = null">
      {{ errorMessage }}
    </v-alert>

    <v-card elevation="2">
      <v-card-title class="bg-primary d-flex align-center">
        <v-icon class="mr-2">mdi-casino</v-icon>
        <span>Bets Management</span>
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
              <v-btn variant="elevated" color="primary" prepend-icon="mdi-plus" @click="openAddBetDialog" block>
                Add Bet
              </v-btn>
            </v-col>
          </v-row>
        </v-toolbar>
      </v-card-text>
          <v-card-text>
            <v-alert v-if="enrichedBets.length === 0 && !isLoading" type="info" variant="tonal" class="mb-4">
              No fantasy bets found. Bets will appear here once team captains place them.
            </v-alert>
            <v-data-table-server
              :headers="headers"
              :items="enrichedBets"
              :items-length="totalBets"
              v-model:page="page"
              v-model:items-per-page="itemsPerPage"
              :items-per-page-options="[10, 25, 50, 100, { value: -1, title: 'All' }]"
              v-model:sort-by="sortBy"
              must-sort
              :loading="isLoading"
              class="elevation-1"
              density="comfortable"
            >
              <template v-slot:[`item.captain`]="{ item }">
                {{ item.user?.name || 'N/A' }}
              </template>

              <template v-slot:[`item.series`]="{ item }">
                <div v-if="item.series">
                  {{ item.series.player1?.name || 'Player 1' }} vs {{ item.series.player2?.name || 'Player 2' }}
                </div>
                <div v-else>N/A</div>
              </template>

              <template v-slot:[`item.bet_on`]="{ item }">
                <strong>{{ getWinnerName(item) }}</strong>
              </template>

              <template v-slot:[`item.score`]="{ item }">
                <div v-if="item.series">
                  {{ item.series.player1_score || 0 }} : {{ item.series.player2_score || 0 }}
                </div>
                <div v-else>-</div>
              </template>

              <template v-slot:[`item.bet_result`]="{ item }">
                <v-chip
                  :color="getBetResultColor(item.bet_result)"
                  size="small"
                  variant="flat"
                >
                  {{ item.bet_result || 'PENDING' }}
                </v-chip>
              </template>

              <template v-slot:[`item.bet_points`]="{ item }">
                {{ item.bet_points || 0 }}
              </template>

              <template v-slot:[`item.is_locked`]="{ item }">
                <v-icon v-if="isSeriesPlayed(item.series)" color="error">mdi-lock</v-icon>
                <v-icon v-else color="success">mdi-lock-open</v-icon>
              </template>

              <template v-slot:[`item.actions`]="{ item }">
                <RowActions :actions="[
                  { icon: 'mdi-pencil', label: 'Edit', disabled: isSeriesPlayed(item.series), onClick: () => editBet(item) },
                  { icon: 'mdi-delete', label: 'Delete', color: 'error', onClick: () => confirmDeleteBet(item) },
                ]" />
              </template>
            </v-data-table-server>
          </v-card-text>
        </v-card>

  <!-- Add Bet Dialog -->
  <v-dialog v-model="addBetDialog" max-width="600px" persistent>
    <v-card>
      <v-card-title class="bg-primary">
        <v-icon class="mr-2">mdi-plus</v-icon>
        Add New Fantasy Bet
      </v-card-title>
      <v-card-text class="pt-4">
        <v-form ref="addBetForm">
          <v-autocomplete
            v-model="newBet.captain_id"
            :items="fantasyTeams"
            item-value="captain_id"
            label="Select Team Captain"
            variant="outlined"
            density="comfortable"
            class="mb-4"
            required
          >
            <template v-slot:item="{ props, item }">
              <v-list-item
                :value="props.value"
                @click="props.onClick"
              >
                <v-list-item-title>{{ item.raw.captain?.name || 'N/A' }}</v-list-item-title>
                <v-list-item-subtitle>Team: {{ item.raw.drafted_team?.name || 'N/A' }}</v-list-item-subtitle>
              </v-list-item>
            </template>
            <template v-slot:selection="{ item }">
              {{ item.raw.captain?.name || 'N/A' }}
            </template>
          </v-autocomplete>

          <v-autocomplete
            v-model="newBet.series_id"
            :items="availableSeries"
            item-value="id"
            label="Select Series"
            variant="outlined"
            density="comfortable"
            class="mb-4"
            required
            :disabled="!newBet.captain_id"
            :hint="!newBet.captain_id ? 'Please select a captain first' : ''"
            persistent-hint
            @update:modelValue="onSeriesSelected"
          >
            <template v-slot:item="{ props, item }">
              <v-list-item
                :value="props.value"
                @click="props.onClick"
              >
                <v-list-item-title>
                  {{ item.raw.player1?.name || 'Player 1' }} vs {{ item.raw.player2?.name || 'Player 2' }}
                </v-list-item-title>
              </v-list-item>
            </template>
            <template v-slot:selection="{ item }">
              {{ item.raw.player1?.name || 'Player 1' }} vs {{ item.raw.player2?.name || 'Player 2' }}
            </template>
          </v-autocomplete>

          <v-radio-group v-model="newBet.winner_id" label="Select Winner:" v-if="selectedSeriesForNew">
            <v-radio
              :label="selectedSeriesForNew.player1?.name || 'Player 1'"
              :value="selectedSeriesForNew.player1_id"
            ></v-radio>
            <v-radio
              :label="selectedSeriesForNew.player2?.name || 'Player 2'"
              :value="selectedSeriesForNew.player2_id"
            ></v-radio>
          </v-radio-group>

          <v-text-field
            v-if="!useFixedBetPoints"
            v-model.number="newBet.bet_points"
            label="Bet Points"
            type="number"
            :min="minBetPoints || 1"
            :max="maxBetPoints"
            :hint="minBetPoints && maxBetPoints ? `Enter between ${minBetPoints} and ${maxBetPoints} points` : minBetPoints ? `Minimum ${minBetPoints} points` : maxBetPoints ? `Maximum ${maxBetPoints} points` : 'Enter the number of points for this bet'"
            :error-messages="betPointsError"
            variant="outlined"
            density="comfortable"
            class="mt-4"
            @input="betPointsError = validateBetPoints(newBet.bet_points)"
            @blur="betPointsError = validateBetPoints(newBet.bet_points)"
          ></v-text-field>
          <v-alert v-else type="info" variant="tonal" class="mt-4">
            This bet will be worth {{ fixedBetPointsValue }} points
          </v-alert>
        </v-form>
      </v-card-text>
      <v-card-actions>
        <v-spacer></v-spacer>
        <v-btn @click="closeAddBetDialog" :disabled="isBetSaving">Cancel</v-btn>
        <v-btn 
          color="primary" 
          variant="elevated" 
          prepend-icon="mdi-plus"
          @click="createNewBet" 
          :loading="isBetSaving"
          :disabled="!newBet.captain_id || !newBet.series_id || !newBet.winner_id || (!useFixedBetPoints && (betPointsError || !newBet.bet_points))"
        >
          Create Bet
        </v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>

  <!-- Edit Bet Dialog -->
  <v-dialog v-model="betDialog" max-width="500px" persistent>
    <v-card>
      <v-card-title class="bg-primary">
        <v-icon class="mr-2">mdi-pencil</v-icon>
        Edit Fantasy Bet
      </v-card-title>
      <v-card-text class="pt-4">
        <div v-if="editingBet && editingBet.series" class="mb-4">
          <div class="text-subtitle-1 mb-2">
            <strong>Series:</strong> {{ editingBet.series.player1?.name || 'Player 1' }} vs {{ editingBet.series.player2?.name || 'Player 2' }}
          </div>
          <div class="text-subtitle-2 mb-2">
            <strong>Captain:</strong> {{ editingBet.user?.name || 'N/A' }}
          </div>
          <div class="text-subtitle-2 mb-4">
            <strong>Current Score:</strong> {{ editingBet.series.player1_score || 0 }} : {{ editingBet.series.player2_score || 0 }}
          </div>

          <v-radio-group v-model="selectedWinnerId" label="Select Winner:">
            <v-radio
              :label="editingBet.series.player1?.name || 'Player 1'"
              :value="editingBet.series.player1_id"
            ></v-radio>
            <v-radio
              :label="editingBet.series.player2?.name || 'Player 2'"
              :value="editingBet.series.player2_id"
            ></v-radio>
          </v-radio-group>

          <v-text-field
            v-if="!useFixedBetPoints"
            v-model.number="selectedBetPoints"
            label="Bet Points"
            type="number"
            :min="minBetPoints || 1"
            :max="maxBetPoints"
            :hint="minBetPoints && maxBetPoints ? `Enter between ${minBetPoints} and ${maxBetPoints} points` : minBetPoints ? `Minimum ${minBetPoints} points` : maxBetPoints ? `Maximum ${maxBetPoints} points` : 'Enter the number of points for this bet'"
            :error-messages="editBetPointsError"
            variant="outlined"
            density="comfortable"
            class="mt-4"
            @input="editBetPointsError = validateBetPoints(selectedBetPoints)"
            @blur="editBetPointsError = validateBetPoints(selectedBetPoints)"
          ></v-text-field>
          <v-alert v-else type="info" variant="tonal" class="mt-4">
            This bet will be worth {{ fixedBetPointsValue }} points
          </v-alert>
        </div>
      </v-card-text>
      <v-card-actions>
        <v-spacer></v-spacer>
        <v-btn @click="closeBetDialog" :disabled="isBetSaving">Cancel</v-btn>
        <v-btn 
          color="primary" 
          variant="elevated" 
          prepend-icon="mdi-content-save"
          @click="saveBet" 
          :loading="isBetSaving"
          :disabled="!selectedWinnerId || (!useFixedBetPoints && (editBetPointsError || !selectedBetPoints))"
        >
          Save Changes
        </v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>

  <!-- Delete Confirmation Dialog -->
  <v-dialog v-model="deleteDialog" max-width="400px">
    <v-card>
      <v-card-title class="bg-error text-white">
        <v-icon class="mr-2">mdi-alert</v-icon>
        Confirm Delete
      </v-card-title>
      <v-card-text class="pt-4">
        Are you sure you want to delete this bet?
        <div v-if="deletingBet" class="mt-2">
          <strong>Captain:</strong> {{ deletingBet.user?.name }}<br>
          <strong>Bet:</strong> {{ getWinnerName(deletingBet) }}
        </div>
      </v-card-text>
      <v-card-actions>
        <v-spacer></v-spacer>
        <v-btn @click="deleteDialog = false" variant="text">Cancel</v-btn>
        <v-btn color="error" variant="elevated" prepend-icon="mdi-delete" @click="deleteBet" :loading="isDeleting">Delete</v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>
  </v-container>
</template>

<script setup>
import RowActions from '@/components/RowActions.vue';
import '@/assets/base.css';
import { ref, computed, onMounted, watch } from 'vue';
import { useFantasyStore, useSeriesStore, usePlayerStore, useConfigStore, useSeasonStore } from '@/stores';
import { storeToRefs } from 'pinia';
import { resolveCurrentSeasonId } from '@/helpers/current-season';

defineOptions({ name: 'FantasyBetsView' });

const fantasyStore = useFantasyStore();
const seriesStore = useSeriesStore();
const playerStore = usePlayerStore();
const configStore = useConfigStore();
const seasonStore = useSeasonStore();

const { bets, totalBets } = storeToRefs(fantasyStore);

const isLoading = ref(false);
const isBetSaving = ref(false);
const isDeleting = ref(false);
const errorMessage = ref(null);
const betDialog = ref(false);
const addBetDialog = ref(false);
const deleteDialog = ref(false);
const editingBet = ref(null);
const deletingBet = ref(null);
const selectedWinnerId = ref(null);
const selectedBetPoints = ref(null);
const allSeries = ref([]);
const fantasyTeams = ref([]);
const seasons = ref([]);
const selectedSeasonId = ref(null);
const page = ref(1);
const itemsPerPage = ref(25);
const sortBy = ref([{ key: 'id', order: 'asc' }]);  // the order the server pages by
const captainBetSeriesIds = ref([]);
const useFixedBetPoints = ref(false);
const fixedBetPointsValue = ref(0);
const minBetPoints = ref(null);
const maxBetPoints = ref(null);
const betPointsError = ref(null);
const editBetPointsError = ref(null);
const newBet = ref({
  captain_id: null,
  series_id: null,
  winner_id: null,
  bet_points: null
});
const selectedSeriesForNew = ref(null);

// The server sorts the columns it stores; the columns joined in the browser stay unsorted
const headers = [
  { title: 'ID', value: 'id', width: '70px', sortable: true },
  { title: 'Captain', value: 'captain', sortable: true },
  { title: 'Series', value: 'series', sortable: false },
  { title: 'Bet On', value: 'bet_on', sortable: false },
  { title: 'Score', value: 'score', sortable: false, align: 'center' },
  { title: 'Result', value: 'bet_result', sortable: false, align: 'center' },
  { title: 'Points', value: 'bet_points', sortable: true, align: 'end' },
  { title: 'Locked', value: 'is_locked', sortable: false, align: 'center' },
  { title: 'Actions', value: 'actions', sortable: false, align: 'center' }
];

// Enrich bets with series data
const enrichedBets = computed(() => {
  return bets.value.map(bet => {
    const series = allSeries.value.find(s => s.id === bet.series_id);
    return {
      ...bet,
      series: series || bet.series
    };
  });
});

// Filter only fantasy series for adding bets
const availableSeries = computed(() => {
  if (!newBet.value.captain_id) {
    // No captain selected, return empty array
    return [];
  }

  // Filter series that are:
  // 1. Fantasy matches
  // 2. Not yet played (both scores are 0 or null)
  // 3. Captain doesn't have a bet on them yet
  return allSeries.value.filter(s => {
    const isFantasy = s.is_fantasy_match === true;
    const notPlayed = !isSeriesPlayed(s);
    const noBetYet = !captainBetSeriesIds.value.includes(s.id);
    
    return isFantasy && notPlayed && noBetYet;
  });
});

// The table holds one page, so the duplicate check asks the server
watch(() => newBet.value.captain_id, async (captainId) => {
  if (!captainId || !selectedSeasonId.value) {
    captainBetSeriesIds.value = [];
    return;
  }
  try {
    const captainBets = await fantasyStore.queryBets(
      `user_id == ${captainId} and season_id == ${selectedSeasonId.value}`
    );
    captainBetSeriesIds.value = captainBets.map(bet => bet.series_id);
  } catch (error) {
    console.error('Failed to load the captain bets:', error);
    captainBetSeriesIds.value = [];
  }
});

// Validate bet points
const validateBetPoints = (points) => {
  if (!points || points <= 0) {
    return 'Bet points must be greater than 0';
  }
  if (minBetPoints.value && points < minBetPoints.value) {
    return `Bet points must be at least ${minBetPoints.value}`;
  }
  if (maxBetPoints.value && points > maxBetPoints.value) {
    return `Bet points must not exceed ${maxBetPoints.value}`;
  }
  return null;
};

const isSeriesPlayed = (series) => {
  if (!series) return false;
  const p1 = series.player1_score || 0;
  const p2 = series.player2_score || 0;
  return p1 > 0 || p2 > 0;
};

const getWinnerName = (bet) => {
  if (!bet.series) return 'N/A';
  
  if (bet.winner_id === bet.series.player1_id) {
    return bet.series.player1?.name || 'Player 1';
  } else if (bet.winner_id === bet.series.player2_id) {
    return bet.series.player2?.name || 'Player 2';
  }
  return 'Unknown';
};

const getBetResultColor = (result) => {
  if (!result || result === 'PENDING') return 'grey';
  if (result === 'WIN') return 'success';
  if (result === 'LOSS') return 'error';
  return 'grey';
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
    
    // Fetch one page of bets for the selected season
    const betsQuery = `season_id == ${selectedSeasonId.value}`;
    const sort = sortBy.value[0];
    await fantasyStore.searchBetsPage(betsQuery, {
      limit: itemsPerPage.value,
      offset: itemsPerPage.value === -1 ? 0 : (page.value - 1) * itemsPerPage.value,
      sort: sort ? sort.key : undefined,
      order: sort ? sort.order : undefined
    });

    // A delete can empty the last page; step back onto the table
    if (bets.value.length === 0 && page.value > 1 && totalBets.value > 0 && itemsPerPage.value !== -1) {
      page.value = Math.max(1, Math.ceil(totalBets.value / itemsPerPage.value));
      return fetchData();
    }
    
    // Fetch series for selected season
    const seriesResponse = await seriesStore.searchSeriesBySeason(selectedSeasonId.value, 'is_fantasy_match==True');
    allSeries.value = seriesResponse || [];
    
    // Fetch fantasy teams for selected season
    const teamsQuery = `season_id == ${selectedSeasonId.value}`;
    const teamsResponse = await fantasyStore.searchTeams(teamsQuery);
    fantasyTeams.value = teamsResponse || [];
    
  } catch (error) {
    console.error('Failed to fetch data:', error);
    errorMessage.value = 'Failed to load data. Please try again later.';
  } finally {
    isLoading.value = false;
  }
};

const onSeasonChange = async () => {
  if (page.value !== 1) {
    page.value = 1; // The watcher fetches
    return;
  }
  await fetchData();
};

// The table controls drive the page state
watch([page, itemsPerPage], () => {
  if (selectedSeasonId.value) fetchData();
});

// A header click reloads from the first page in the new order
watch(sortBy, () => {
  if (page.value === 1) {
    fetchData();
  } else {
    page.value = 1;
  }
});

const loadSeasons = async () => {
  try {
    await seasonStore.fetchSeasons();
    seasons.value = seasonStore.seasons || [];
  } catch (error) {
    console.error('Failed to load seasons:', error);
    seasons.value = [];
  }
};

const openAddBetDialog = () => {
  newBet.value = {
    captain_id: null,
    series_id: null,
    winner_id: null,
    bet_points: null
  };
  selectedSeriesForNew.value = null;
  betPointsError.value = null;
  addBetDialog.value = true;
};

const closeAddBetDialog = () => {
  addBetDialog.value = false;
  newBet.value = {
    captain_id: null,
    series_id: null,
    winner_id: null,
    bet_points: null
  };
  selectedSeriesForNew.value = null;
  betPointsError.value = null;
};

const onSeriesSelected = () => {
  if (newBet.value.series_id) {
    selectedSeriesForNew.value = allSeries.value.find(s => s.id === newBet.value.series_id);
  } else {
    selectedSeriesForNew.value = null;
  }
  newBet.value.winner_id = null;
};

const createNewBet = async () => {
  if (!newBet.value.captain_id || !newBet.value.series_id || !newBet.value.winner_id) {
    errorMessage.value = 'Please fill in all fields.';
    return;
  }

  isBetSaving.value = true;
  errorMessage.value = null;

  try {
    const betData = {
      user_id: newBet.value.captain_id,
      series_id: newBet.value.series_id,
      season_id: selectedSeasonId.value,
      winner_id: newBet.value.winner_id,
      bet_points: newBet.value.bet_points // Send as-is, backend will apply fixed points if configured
    };

    await fantasyStore.createBet(betData);
    await fetchData(); // Refresh data
    closeAddBetDialog();
  } catch (error) {
    console.error('Failed to create bet:', error);
    errorMessage.value = 'Failed to create bet. Please try again.';
  } finally {
    isBetSaving.value = false;
  }
};

const editBet = (bet) => {
  editingBet.value = { ...bet };
  selectedWinnerId.value = bet.winner_id;
  selectedBetPoints.value = bet.bet_points;
  editBetPointsError.value = validateBetPoints(bet.bet_points);
  betDialog.value = true;
};

const closeBetDialog = () => {
  betDialog.value = false;
  editingBet.value = null;
  selectedWinnerId.value = null;
  selectedBetPoints.value = null;
  editBetPointsError.value = null;
};

const saveBet = async () => {
  if (!editingBet.value || !selectedWinnerId.value) {
    errorMessage.value = 'Please select a winner.';
    return;
  }

  isBetSaving.value = true;
  errorMessage.value = null;

  try {
    const updatedBet = {
      ...editingBet.value,
      winner_id: selectedWinnerId.value,
      bet_points: selectedBetPoints.value // Send as-is, backend will apply fixed points if configured
    };

    await fantasyStore.updateBet(editingBet.value.id, updatedBet);
    await fetchData(); // Refresh data
    closeBetDialog();
  } catch (error) {
    console.error('Failed to update bet:', error);
    errorMessage.value = 'Failed to update bet. Please try again.';
  } finally {
    isBetSaving.value = false;
  }
};

const confirmDeleteBet = (bet) => {
  deletingBet.value = bet;
  deleteDialog.value = true;
};

const deleteBet = async () => {
  if (!deletingBet.value) return;

  isDeleting.value = true;
  errorMessage.value = null;

  try {
    await fantasyStore.deleteBet(deletingBet.value.id);
    await fetchData(); // Refresh data
    deleteDialog.value = false;
    deletingBet.value = null;
  } catch (error) {
    console.error('Failed to delete bet:', error);
    errorMessage.value = 'Failed to delete bet. Please try again.';
  } finally {
    isDeleting.value = false;
  }
};

const loadBetPointsSettings = async () => {
  try {
    await configStore.fetchSettings();
    const settings = configStore.settings;
    
    // Get fixed bet points setting
    const fixedBetPointsSetting = settings.find(s => s.key === 'fantasy_fixed_bet_points');
    if (fixedBetPointsSetting) {
      useFixedBetPoints.value = fixedBetPointsSetting.value === 'true';
    }

    // Get fixed bet points value
    const betPointsValueSetting = settings.find(s => s.key === 'fantasy_bet_points_value');
    if (betPointsValueSetting) {
      fixedBetPointsValue.value = parseInt(betPointsValueSetting.value) || 0;
    }
    
    // Get min bet points
    const minBetPointsSetting = settings.find(s => s.key === 'fantasy_min_bet_points');
    if (minBetPointsSetting && minBetPointsSetting.value) {
      minBetPoints.value = parseInt(minBetPointsSetting.value);
    }
    
    // Get max bet points
    const maxBetPointsSetting = settings.find(s => s.key === 'fantasy_max_bet_points');
    if (maxBetPointsSetting && maxBetPointsSetting.value) {
      maxBetPoints.value = parseInt(maxBetPointsSetting.value);
    }
  } catch (error) {
    console.error('Error loading bet points settings:', error);
  }
};

onMounted(() => {
  loadSeasons();
  loadBetPointsSettings();
  fetchData();
});
</script>

<style scoped>
.v-chip {
  font-weight: 500;
}
</style>
