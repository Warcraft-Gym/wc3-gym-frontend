<script setup>
import '@/assets/base.css';
import { ref, onMounted, computed, watch } from 'vue';
import { storeToRefs } from 'pinia';
import { usePlayerCareerStatsStore } from '@/stores/player_career_stats.store';
import { usePlayerStore } from '@/stores/player.store';

defineOptions({ name: 'PlayerCareerStatsView' })

const store = usePlayerCareerStatsStore();
const { stats, totalStats } = storeToRefs(store);
const playerStore = usePlayerStore();
const { players } = storeToRefs(playerStore);

const isLoading = ref(true);
const errorMessage = ref(null);
const successMessage = ref(null);
const editDialog = ref(false);
const deleteDialog = ref(false);
const importDialog = ref(false);
const selectedStat = ref(null);
const selectedFile = ref(null);
const search = ref('');
const showUnmappedOnly = ref(false);
const page = ref(1);
const itemsPerPage = ref(25);
const sortBy = ref([]);  // Vuetify single sort: [] or [{ key, order }]

const headers = [
  { title: 'Display Name', key: 'display_name', sortable: true },
  { title: 'Status', key: 'status', sortable: true },
  { title: 'Rating', key: 'rating', sortable: true },
  { title: 'Series W-L', key: 'series_record', sortable: true },
  { title: 'Series %', key: 'series_winrate', sortable: true },
  { title: 'Games W-L', key: 'games_record', sortable: true },
  { title: 'Games %', key: 'games_winrate', sortable: true },
  { title: 'Seasons', key: 'seasons_played', sortable: true },
  { title: 'Actions', key: 'actions', sortable: false }
];

// Header keys the server names differently
const sortNames = {
  display_name: 'name',
  status: 'mapped',
  series_record: 'series_won',
  games_record: 'games_won'
};

// The server answers the search; only the unmapped toggle narrows the loaded page
const hasPageFilter = computed(() => showUnmappedOnly.value);

const statsWithRecords = computed(() => {
  let filteredStats = stats.value;

  // Filter unmapped if toggle is active
  if (showUnmappedOnly.value) {
    filteredStats = filteredStats.filter(stat => !stat.user_id);
  }

  return filteredStats.map(stat => ({
    ...stat,
    display_name: stat.user ? stat.user.name : stat.player_name,
    status: stat.user ? 'Mapped' : 'Unmapped',
    series_record: `${stat.series_won}-${stat.series_lost}`,
    games_record: `${stat.games_won}-${stat.games_lost}`
  }));
});

const itemsLength = computed(() =>
  hasPageFilter.value ? statsWithRecords.value.length : totalStats.value
);

const fetchStats = async () => {
  isLoading.value = true;
  errorMessage.value = null;
  try {
    const sort = sortBy.value[0];
    await store.fetchPage({
      limit: itemsPerPage.value,
      offset: itemsPerPage.value === -1 ? 0 : (page.value - 1) * itemsPerPage.value,
      search: search.value?.trim() || undefined,
      sort: sort ? (sortNames[sort.key] ?? sort.key) : undefined,
      order: sort ? sort.order : undefined
    });

    // A delete can empty the last page; step back onto the table
    if (stats.value.length === 0 && page.value > 1 && totalStats.value > 0 && itemsPerPage.value !== -1) {
      page.value = Math.max(1, Math.ceil(totalStats.value / itemsPerPage.value));
    }
  } catch (error) {
    errorMessage.value = error.message || 'Failed to load player career stats';
  } finally {
    isLoading.value = false;
  }
};

// The table controls drive the page state
watch([page, itemsPerPage], () => {
  fetchStats();
});

// A search edit waits for the typing pause, then reloads from the first page
let searchTimer = null;
watch(search, () => {
  clearTimeout(searchTimer);
  searchTimer = setTimeout(() => {
    if (page.value === 1) {
      fetchStats();
    } else {
      page.value = 1;
    }
  }, 300);
});

// A header click reloads from the first page in the new order
watch(sortBy, () => {
  if (page.value === 1) {
    fetchStats();
  } else {
    page.value = 1;
  }
});

// A toggle change restarts at the first page
watch(showUnmappedOnly, () => {
  page.value = 1;
});

const openEditDialog = (stat) => {
  selectedStat.value = {
    id: stat.id,
    player_name: stat.player_name,
    user_id: stat.user?.id || null,
    user: stat.user || null,
    // Historical baseline fields
    historical_rating: stat.historical_rating ?? 0,
    historical_series_won: stat.historical_series_won ?? 0,
    historical_series_lost: stat.historical_series_lost ?? 0,
    historical_games_won: stat.historical_games_won ?? 0,
    historical_games_lost: stat.historical_games_lost ?? 0,
    historical_seasons_played: stat.historical_seasons_played ?? 0,
    // Combined totals (read-only display)
    rating: stat.rating,
    series_won: stat.series_won,
    series_lost: stat.series_lost,
    series_winrate: stat.series_winrate,
    games_won: stat.games_won,
    games_lost: stat.games_lost,
    games_winrate: stat.games_winrate,
    seasons_played: stat.seasons_played
  };
  editDialog.value = true;
};

const closeEditDialog = () => {
  editDialog.value = false;
  selectedStat.value = null;
  errorMessage.value = null;
};

const saveEdit = async () => {
  errorMessage.value = null;
  successMessage.value = null;
  try {
    await store.update(selectedStat.value.id, selectedStat.value);
    successMessage.value = 'Player stats updated successfully';
    closeEditDialog();
    await fetchStats();
  } catch (error) {
    errorMessage.value = error.message || 'Failed to update player stats';
  }
};

const openDeleteDialog = (stat) => {
  selectedStat.value = stat;
  deleteDialog.value = true;
};

const closeDeleteDialog = () => {
  deleteDialog.value = false;
  selectedStat.value = null;
};

const confirmDelete = async () => {
  errorMessage.value = null;
  successMessage.value = null;
  try {
    await store.delete(selectedStat.value.id);
    successMessage.value = 'Player stats deleted successfully';
    closeDeleteDialog();
    await fetchStats();
  } catch (error) {
    errorMessage.value = error.message || 'Failed to delete player stats';
  }
};

const openImportDialog = () => {
  importDialog.value = true;
  selectedFile.value = null;
};

const closeImportDialog = () => {
  importDialog.value = false;
  selectedFile.value = null;
  errorMessage.value = null;
};

const handleFileUpload = async () => {
  if (!selectedFile.value) {
    errorMessage.value = 'Please select a CSV file';
    return;
  }

  errorMessage.value = null;
  successMessage.value = null;
  isLoading.value = true;
  try {
    await store.importCsv(selectedFile.value);
    successMessage.value = 'CSV imported successfully';
    closeImportDialog();
    await fetchStats();
  } catch (error) {
    errorMessage.value = error.message || 'Failed to import CSV';
  } finally {
    isLoading.value = false;
  }
};

onMounted(async () => {
  await playerStore.fetchPlayers();
  await fetchStats();
});
</script>

<template>
  <v-container fluid>
    <v-row>
      <v-col cols="12">
        <h1 class="text-h4 mb-4">Player Career Statistics</h1>
        
        <!-- Success Message -->
        <v-alert
          v-if="successMessage"
          type="success"
          variant="tonal"
          border="start"
          border-color="green"
          class="mb-4"
          closable
          @click:close="successMessage = null"
        >
          {{ successMessage }}
        </v-alert>

        <!-- Error Message -->
        <v-alert
          v-if="errorMessage"
          type="error"
          variant="tonal"
          border="start"
          border-color="red"
          class="mb-4"
          closable
          @click:close="errorMessage = null"
        >
          {{ errorMessage }}
        </v-alert>

        <!-- Actions Bar -->
        <v-card class="mb-4">
          <v-card-text>
            <v-row align="center">
              <v-col cols="12" md="4">
                <v-text-field
                  v-model="search"
                  prepend-inner-icon="mdi-magnify"
                  label="Search all players..."
                  variant="outlined"
                  density="compact"
                  hide-details
                  clearable
                />
              </v-col>
              <v-col cols="12" md="2">
                <v-checkbox
                  v-model="showUnmappedOnly"
                  label="Unmapped only (this page)"
                  color="primary"
                  hide-details
                />
              </v-col>
              <v-col cols="12" md="6" class="text-right">
                <v-btn
                  color="primary"
                  prepend-icon="mdi-upload"
                  @click="openImportDialog"
                >
                  Import CSV
                </v-btn>
              </v-col>
            </v-row>
            <v-row>
              <v-col cols="12">
                <v-alert
                  type="info"
                  variant="tonal"
                  density="compact"
                  icon="mdi-information-outline"
                  class="text-caption mb-0"
                >
                  All statistics are computed automatically and don't need to be recalculated manually.
                </v-alert>
              </v-col>
            </v-row>
          </v-card-text>
        </v-card>

        <!-- Data Table -->
        <v-card>
          <v-data-table-server
            :headers="headers"
            :items="statsWithRecords"
            :items-length="itemsLength"
            v-model:page="page"
            v-model:items-per-page="itemsPerPage"
            :items-per-page-options="[10, 25, 50, 100, { value: -1, title: 'All' }]"
            v-model:sort-by="sortBy"
            :loading="isLoading"
            item-value="id"
            class="elevation-1"
          >
            <template v-slot:item.status="{ item }">
              <v-chip
                :color="item.user ? 'success' : 'warning'"
                size="small"
                variant="flat"
              >
                {{ item.status }}
              </v-chip>
            </template>

            <template v-slot:item.series_winrate="{ item }">
              {{ item.series_winrate }}%
            </template>

            <template v-slot:item.games_winrate="{ item }">
              {{ item.games_winrate }}%
            </template>

            <template v-slot:item.actions="{ item }">
              <template v-if="item.id !== null">
                <v-btn
                  icon="mdi-pencil"
                  size="small"
                  variant="text"
                  color="primary"
                  @click="openEditDialog(item)"
                />
                <v-btn
                  icon="mdi-delete"
                  size="small"
                  variant="text"
                  color="error"
                  @click="openDeleteDialog(item)"
                />
              </template>
            </template>
          </v-data-table-server>
        </v-card>
      </v-col>
    </v-row>

    <!-- Edit Dialog -->
    <v-dialog v-model="editDialog" max-width="800px">
      <v-card v-if="selectedStat">
        <v-card-title class="text-h5">Edit Player Career Stats</v-card-title>
        <v-card-text>
          <v-container>
            <v-row>
              <v-col cols="12" md="6">
                <v-text-field
                  v-model="selectedStat.player_name"
                  label="Historical Player Name"
                  variant="outlined"
                  disabled
                />
              </v-col>
              <v-col cols="12" md="6">
                <v-autocomplete
                  v-model="selectedStat.user_id"
                  :items="players"
                  item-title="name"
                  item-value="id"
                  label="Link to User"
                  variant="outlined"
                  clearable
                  hint="Select a user to link this historical player"
                  persistent-hint
                >
                  <template v-slot:item="{ props, item }">
                    <v-list-item v-bind="props" :subtitle="item.raw.w3c_name" />
                  </template>
                </v-autocomplete>
              </v-col>
              
              <v-col cols="12">
                <v-divider class="mb-2" />
                <h3 class="text-h6 mb-4">Historical Baseline (Imported from CSV)</h3>
              </v-col>
              
              <v-col cols="12" md="6">
                <v-text-field
                  v-model.number="selectedStat.historical_rating"
                  label="Historical Rating"
                  type="number"
                  variant="outlined"
                />
              </v-col>
              <v-col cols="12" md="6">
                <v-text-field
                  v-model.number="selectedStat.historical_seasons_played"
                  label="Historical Seasons"
                  type="number"
                  variant="outlined"
                />
              </v-col>
              <v-col cols="12" md="6">
                <v-text-field
                  v-model.number="selectedStat.historical_series_won"
                  label="Historical Series Won"
                  type="number"
                  variant="outlined"
                />
              </v-col>
              <v-col cols="12" md="6">
                <v-text-field
                  v-model.number="selectedStat.historical_series_lost"
                  label="Historical Series Lost"
                  type="number"
                  variant="outlined"
                />
              </v-col>
              <v-col cols="12" md="6">
                <v-text-field
                  v-model.number="selectedStat.historical_games_won"
                  label="Historical Games Won"
                  type="number"
                  variant="outlined"
                />
              </v-col>
              <v-col cols="12" md="6">
                <v-text-field
                  v-model.number="selectedStat.historical_games_lost"
                  label="Historical Games Lost"
                  type="number"
                  variant="outlined"
                />
              </v-col>

              <v-col cols="12">
                <v-divider class="mb-2" />
                <h3 class="text-h6 mb-4">Combined Totals (Read-only - Recalculated)</h3>
              </v-col>

              <v-col cols="12" md="4">
                <v-text-field
                  :model-value="selectedStat.rating"
                  label="Total Rating"
                  variant="outlined"
                  disabled
                />
              </v-col>
              <v-col cols="12" md="4">
                <v-text-field
                  :model-value="`${selectedStat.series_won}-${selectedStat.series_lost}`"
                  label="Series Record"
                  variant="outlined"
                  disabled
                />
              </v-col>
              <v-col cols="12" md="4">
                <v-text-field
                  :model-value="`${selectedStat.series_winrate}%`"
                  label="Series Winrate"
                  variant="outlined"
                  disabled
                />
              </v-col>
              <v-col cols="12" md="4">
                <v-text-field
                  :model-value="`${selectedStat.games_won}-${selectedStat.games_lost}`"
                  label="Games Record"
                  variant="outlined"
                  disabled
                />
              </v-col>
              <v-col cols="12" md="4">
                <v-text-field
                  :model-value="`${selectedStat.games_winrate}%`"
                  label="Games Winrate"
                  variant="outlined"
                  disabled
                />
              </v-col>
              <v-col cols="12" md="4">
                <v-text-field
                  :model-value="selectedStat.seasons_played"
                  label="Total Seasons"
                  variant="outlined"
                  disabled
                />
              </v-col>
            </v-row>
          </v-container>
        </v-card-text>
        <v-card-actions>
          <v-spacer />
          <v-btn color="grey" variant="text" @click="closeEditDialog">Cancel</v-btn>
          <v-btn color="primary" variant="flat" @click="saveEdit">Save</v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <!-- Delete Confirmation Dialog -->
    <v-dialog v-model="deleteDialog" max-width="500px">
      <v-card v-if="selectedStat">
        <v-card-title class="text-h5">Confirm Delete</v-card-title>
        <v-card-text>
          Are you sure you want to delete career stats for <strong>{{ selectedStat.player_name }}</strong>?
          This action cannot be undone.
        </v-card-text>
        <v-card-actions>
          <v-spacer />
          <v-btn color="grey" variant="text" @click="closeDeleteDialog">Cancel</v-btn>
          <v-btn color="error" variant="flat" @click="confirmDelete">Delete</v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <!-- Import CSV Dialog -->
    <v-dialog v-model="importDialog" max-width="600px">
      <v-card>
        <v-card-title class="text-h5">Import Historical Stats CSV</v-card-title>
        <v-card-text>
          <v-container>
            <v-row>
              <v-col cols="12">
                <p class="text-body-2 mb-4">
                  Upload a CSV file with columns: NAME, RATING, WON Series, LOST Series, WINRATE, WON Games, LOST Games, Seasons PLAYED, AVG NUM Series
                </p>
                <v-file-input
                  v-model="selectedFile"
                  label="Select CSV file"
                  accept=".csv"
                  variant="outlined"
                  prepend-icon="mdi-file-delimited"
                  show-size
                />
              </v-col>
            </v-row>
          </v-container>
        </v-card-text>
        <v-card-actions>
          <v-spacer />
          <v-btn color="grey" variant="text" @click="closeImportDialog">Cancel</v-btn>
          <v-btn color="primary" variant="flat" @click="handleFileUpload">Upload</v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <!-- Loading Overlay -->
    <v-overlay v-model="isLoading" class="align-center justify-center" contained persistent>
      <v-progress-circular indeterminate size="64" />
    </v-overlay>
  </v-container>
</template>

<style scoped>
.v-card {
  margin-bottom: 1rem;
}
</style>
