<template>
  <v-container fluid class="pa-4">
    <v-row class="mb-4">
      <v-col>
        <h1 class="text-h3 font-weight-bold">
          <v-icon class="mr-2" size="large">mdi-trophy</v-icon>
          Seasons
        </h1>
      </v-col>
    </v-row>

    <v-overlay v-model="isLoading" persistent class="loading-overlay">
      <v-progress-circular indeterminate size="64" width="8" color="primary" />
    </v-overlay>

    <!-- Import Excel Panel -->
    <v-card class="mb-4" elevation="2">
      <v-expansion-panels>
        <v-expansion-panel>
          <v-expansion-panel-title class="bg-grey-lighten-4">
            <v-icon class="mr-2">mdi-file-upload</v-icon>
            Import Excel File
          </v-expansion-panel-title>
          <v-expansion-panel-text>
            <v-form class="pa-4">
              <v-row dense>
                <v-col cols="12" md="3">
                  <v-text-field 
                    v-model="seasonName" 
                    label="Season Name" 
                    placeholder="Enter season name"
                    variant="outlined"
                    density="comfortable"
                  />
                </v-col>
                <v-col cols="12" md="1" class="d-flex align-center justify-center">
                  <span class="text-grey">OR</span>
                </v-col>
                <v-col cols="12" md="2">
                  <v-text-field 
                    v-model="seasonId" 
                    label="Season ID" 
                    type="number" 
                    placeholder="Enter season ID"
                    variant="outlined"
                    density="comfortable"
                  />
                </v-col>
                <v-col cols="12" md="6">
                  <v-file-input 
                    v-model="file" 
                    label="Upload Excel File" 
                    accept=".xlsx"
                    variant="outlined"
                    density="comfortable"
                    prepend-icon=""
                    prepend-inner-icon="mdi-paperclip"
                  />
                </v-col>
              </v-row>

              <v-row>
                <v-col cols="auto">
                  <v-btn
                    :disabled="!isFileFormValid || isLoading"
                    @click="uploadFile"
                    color="primary"
                    variant="elevated"
                    prepend-icon="mdi-upload"
                  >
                    Upload File
                  </v-btn>
                </v-col>
              </v-row>

              <v-alert v-if="uploadMessage" type="success" variant="tonal" class="mt-4" closable>
                {{ uploadMessage }}
              </v-alert>
            </v-form>
          </v-expansion-panel-text>
        </v-expansion-panel>
      </v-expansion-panels>
    </v-card>

    <!-- Error Message -->
    <v-alert v-if="errorMessage" type="error" variant="tonal" class="mb-4" closable @click:close="errorMessage = null">
      {{ errorMessage }}
    </v-alert>

    <!-- Seasons Table -->
    <v-card v-if="!errorMessage" elevation="2">
      <v-card-title class="bg-primary d-flex align-center">
        <v-icon class="mr-2">mdi-format-list-bulleted</v-icon>
        All Seasons
      </v-card-title>
      
      <v-card-text class="pa-0">
        <v-data-table 
          :headers="tableHeader" 
          :items="seasons" 
          :loading="isLoading" 
          fixed-header 
          hover
          density="comfortable"
        >
          <template #loading>
            <v-skeleton-loader type="table-row@10" />
          </template>

          <template #top>
            <v-toolbar flat height="auto">
              <v-row align="center" class="flex-wrap ma-0 pa-2">
                <v-spacer />
                <v-col cols="12" sm="auto">
                  <v-btn variant="elevated" color="primary" prepend-icon="mdi-plus" @click.stop="addNewSeason" block>
                    Add New Season
                  </v-btn>
                </v-col>
              </v-row>
            </v-toolbar>
          </template>

          <template #item="{ item }">
            <tr @click="$router.push(`/seasons/${item.id}`)" class="season-row">
              <td>{{ item.id }}</td>
              <td><strong>{{ item.name }}</strong></td>
              <td>{{ item.number_weeks }}</td>
              <td>{{ item.pick_ban }}</td>
              <td>{{ item.series_per_week }}</td>
              <td class="text-end">
                <v-menu location="bottom end">
                  <template v-slot:activator="{ props }">
                    <v-btn
                      icon="mdi-dots-vertical"
                      variant="text"
                      size="small"
                      v-bind="props"
                      @click.stop
                    ></v-btn>
                  </template>
                  <v-list density="compact">
                    <v-list-item @click.stop="editSeason(item)" prepend-icon="mdi-pencil">
                      <v-list-item-title>Edit Season</v-list-item-title>
                    </v-list-item>
                    <v-list-item @click.stop="exportSeason(item.id, item.name)" prepend-icon="mdi-download">
                      <v-list-item-title>Export Season</v-list-item-title>
                    </v-list-item>
                    <v-list-item @click.stop="openDeleteDialog(item.id, removeSeason)" prepend-icon="mdi-delete" class="text-error">
                      <v-list-item-title>Delete Season</v-list-item-title>
                    </v-list-item>
                  </v-list>
                </v-menu>
              </td>
            </tr>
          </template>

          <template #no-data>
            <div class="text-center pa-8">
              <v-icon size="64" color="grey-lighten-1">mdi-trophy-broken</v-icon>
              <div class="text-h6 mt-4 text-grey">No seasons found</div>
              <v-btn 
                color="primary" 
                variant="tonal" 
                class="mt-4"
                prepend-icon="mdi-plus"
                @click="addNewSeason"
              >
                Create First Season
              </v-btn>
            </div>
          </template>
        </v-data-table>
      </v-card-text>
    </v-card>

    <!-- Add New Season Dialog -->
    <v-dialog v-model="addNewDialogOpen" max-width="800px" persistent>
      <v-card v-if="newSeason">
        <v-card-title class="bg-primary">
          <v-icon class="mr-2">mdi-plus-circle</v-icon>
          Add New Season
        </v-card-title>
        
        <v-alert v-if="creationError" type="error" variant="tonal" class="mx-4 mt-4 mb-2" border="start" border-color="red" closable @click:close="creationError = null">
          {{ creationError }}
        </v-alert>
        
        <v-card-text class="pt-4">
          <v-form>
            <v-row dense>
              <v-col cols="12" md="6">
                <v-text-field 
                  v-model="newSeason.name" 
                  label="Season Name"
                  variant="outlined"
                  density="comfortable"
                  prepend-inner-icon="mdi-trophy"
                />
              </v-col>
              <v-col cols="12" md="6">
                <v-text-field 
                  v-model="newSeason.number_weeks" 
                  label="Number of Weeks" 
                  type="number"
                  variant="outlined"
                  density="comfortable"
                  prepend-inner-icon="mdi-calendar-range"
                />
              </v-col>
              <v-col cols="12" md="6">
                <v-text-field 
                  v-model="newSeason.pick_ban" 
                  label="Pick Ban Order"
                  variant="outlined"
                  density="comfortable"
                  prepend-inner-icon="mdi-format-list-numbered"
                />
              </v-col>
              <v-col cols="12" md="6">
                <v-text-field 
                  v-model="newSeason.series_per_week" 
                  label="Series per Week" 
                  type="number"
                  variant="outlined"
                  density="comfortable"
                  prepend-inner-icon="mdi-trophy-variant"
                />
              </v-col>
              <v-col cols="12" md="6">
                <v-text-field 
                  v-model="newSeason.discordRole" 
                  label="Discord Role ID"
                  variant="outlined"
                  density="comfortable"
                  prepend-inner-icon="mdi-discord"
                />
              </v-col>
              <v-col cols="12" md="6">
                <v-text-field 
                  v-model="newSeason.start_date" 
                  label="Start Date"
                  type="date"
                  variant="outlined"
                  density="comfortable"
                  prepend-inner-icon="mdi-calendar-start"
                />
              </v-col>
              <v-col cols="12" md="6">
                <v-text-field 
                  v-model="newSeason.end_date" 
                  label="End Date"
                  type="date"
                  variant="outlined"
                  density="comfortable"
                  prepend-inner-icon="mdi-calendar-end"
                />
              </v-col>
              <v-col cols="12" md="6">
                <v-autocomplete
                  v-model="newSeasonMapIds"
                  :items="maps"
                  item-title="name"
                  item-value="id"
                  label="Map Pool"
                  multiple
                  chips
                  closable-chips
                  variant="outlined"
                  density="comfortable"
                  prepend-inner-icon="mdi-map"
                />
              </v-col>
            </v-row>
          </v-form>
        </v-card-text>
        
        <v-card-actions class="px-4 py-3">
          <v-spacer></v-spacer>
          <v-btn variant="text" @click="cancelAddNewSeason">Cancel</v-btn>
          <v-btn color="primary" prepend-icon="mdi-check" @click="createNewSeason">Create Season</v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <!-- Edit Season Dialog -->
    <v-dialog v-model="editDialogOpen" max-width="800px" persistent>
      <v-card v-if="selectedSeason">
        <v-card-title class="bg-primary">
          <v-icon class="mr-2">mdi-pencil</v-icon>
          Edit Season: {{ selectedSeason.name }}
        </v-card-title>
        
        <v-alert v-if="updateError" type="error" variant="tonal" class="mx-4 mt-4 mb-2" border="start" border-color="red" closable @click:close="updateError = null">
          {{ updateError }}
        </v-alert>
        
        <v-card-text class="pt-4">
          <v-form>
            <v-row dense>
              <v-col cols="12" md="6">
                <v-text-field 
                  v-model="selectedSeason.name" 
                  label="Season Name"
                  variant="outlined"
                  density="comfortable"
                  prepend-inner-icon="mdi-trophy"
                />
              </v-col>
              <v-col cols="12" md="6">
                <v-text-field 
                  v-model="selectedSeason.number_weeks" 
                  label="Number of Weeks" 
                  type="number"
                  variant="outlined"
                  density="comfortable"
                  prepend-inner-icon="mdi-calendar-range"
                />
              </v-col>
              <v-col cols="12" md="6">
                <v-text-field 
                  v-model="selectedSeason.pick_ban" 
                  label="Pick Ban Order"
                  variant="outlined"
                  density="comfortable"
                  prepend-inner-icon="mdi-format-list-numbered"
                />
              </v-col>
              <v-col cols="12" md="6">
                <v-text-field 
                  v-model="selectedSeason.series_per_week" 
                  label="Series per Week" 
                  type="number"
                  variant="outlined"
                  density="comfortable"
                  prepend-inner-icon="mdi-trophy-variant"
                />
              </v-col>
              <v-col cols="12" md="6">
                <v-text-field 
                  v-model="selectedSeason.discordRole" 
                  label="Discord Role ID"
                  variant="outlined"
                  density="comfortable"
                  prepend-inner-icon="mdi-discord"
                />
              </v-col>
              <v-col cols="12" md="6">
                <v-text-field 
                  v-model="selectedSeason.start_date" 
                  label="Start Date"
                  type="date"
                  variant="outlined"
                  density="comfortable"
                  prepend-inner-icon="mdi-calendar-start"
                />
              </v-col>
              <v-col cols="12" md="6">
                <v-text-field 
                  v-model="selectedSeason.end_date" 
                  label="End Date"
                  type="date"
                  variant="outlined"
                  density="comfortable"
                  prepend-inner-icon="mdi-calendar-end"
                />
              </v-col>
              <v-col cols="12" md="6">
                <v-autocomplete
                  v-model="selectedSeasonMapIds"
                  :items="maps"
                  item-title="name"
                  item-value="id"
                  label="Map Pool"
                  multiple
                  chips
                  closable-chips
                  variant="outlined"
                  density="comfortable"
                  prepend-inner-icon="mdi-map"
                />
              </v-col>
            </v-row>
          </v-form>
        </v-card-text>
        
        <v-card-actions class="px-4 py-3">
          <v-spacer></v-spacer>
          <v-btn variant="text" @click="cancelEdit">Cancel</v-btn>
          <v-btn color="primary" prepend-icon="mdi-check" @click="updateSeason">Save Changes</v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <!-- Delete Confirmation Dialog -->
    <v-dialog v-model="showDeleteDialog" max-width="400">
      <v-card>
        <v-card-title class="bg-error">
          <v-icon class="mr-2">mdi-alert</v-icon>
          Confirm Deletion
        </v-card-title>
        <v-card-text class="pt-4">
          Are you sure you want to delete this season? This action cannot be undone.
        </v-card-text>
        <v-card-actions>
          <v-spacer></v-spacer>
          <v-btn variant="text" @click="cancelDeleteDialog">Cancel</v-btn>
          <v-btn color="error" @click="confirmDelete">Delete</v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>
  </v-container>
</template>

<script setup>
import { ref, onMounted } from 'vue';
import { useSeasonStore, useMapStore } from '@/stores';

defineOptions({ name: 'SeasonsView' });

const seasonStore = useSeasonStore();
const mapStore = useMapStore();

const seasons = ref([]);
const maps = ref([]);
const isLoading = ref(false);
const errorMessage = ref(null);
const uploadMessage = ref(null);
const seasonName = ref(null);
const seasonId = ref(null);
const file = ref(null);

const newSeason = ref(null);
const newSeasonMapIds = ref([]);
const addNewDialogOpen = ref(false);
const editDialogOpen = ref(false);
const selectedSeason = ref(null);
const selectedSeasonMapIds = ref([]);
const creationError = ref(null);
const updateError = ref(null);

const showDeleteDialog = ref(false);
const selectedDeleteItemId = ref(null);
const deleteAction = ref(null);

const tableHeader = [
  { title: 'ID', value: 'id', align: 'start', sortable: true },
  { title: 'Name', value: 'name', sortable: true },
  { title: 'Weeks', value: 'number_weeks', sortable: true },
  { title: 'Pick Ban', value: 'pick_ban', sortable: false },
  { title: 'Series/Week', value: 'series_per_week', sortable: true },
  { title: 'Actions', key: 'actions', align: 'end', sortable: false },
];

const isFileFormValid = ref(() => !!file.value && (seasonId.value || (seasonName.value && seasonName.value.length > 0)));

const fetchSeasons = async () => {
  isLoading.value = true;
  errorMessage.value = null;
  try {
    await seasonStore.fetchSeasons();
    seasons.value = seasonStore.seasons || [];
    if (!seasons.value || seasons.value.length === 0) {
      errorMessage.value = 'No seasons found.';
    }
  } catch (err) {
    console.error('Failed to fetch seasons', err);
    errorMessage.value = 'Failed to load seasons. Please try again later.';
  } finally {
    isLoading.value = false;
  }
};

const fetchMaps = async () => {
  try {
    await mapStore.fetchMaps();
    maps.value = mapStore.maps || [];
  } catch (err) {
    console.error('Failed to fetch maps', err);
  }
};

onMounted(async () => {
  await Promise.all([fetchSeasons(), fetchMaps()]);
});

const addNewSeason = () => {
  newSeason.value = { name: '', number_weeks: 0, pick_ban: '', series_per_week: 0, discordRole: '', start_date: null, end_date: null };
  newSeasonMapIds.value = [];
  creationError.value = '';
  addNewDialogOpen.value = true;
};

const createNewSeason = async () => {
  creationError.value = '';
  try {
    const createdSeason = await seasonStore.createSeason(newSeason.value);
    
    // Add maps to the season if any were selected
    if (newSeasonMapIds.value && newSeasonMapIds.value.length > 0) {
      await seasonStore.addMapsToSeason(createdSeason.id, newSeasonMapIds.value);
    }
    
    await fetchSeasons();
    cancelAddNewSeason();
  } catch (err) {
    console.error('Error creating season:', err);
    creationError.value = 'Error creating season: ' + (err?.message || err);
  }
};

const cancelAddNewSeason = () => {
  addNewDialogOpen.value = false;
  newSeason.value = null;
  newSeasonMapIds.value = [];
};

const editSeason = (season) => {
  selectedSeason.value = { ...season };
  selectedSeasonMapIds.value = season.maps ? season.maps.map(m => m.id) : [];
  updateError.value = '';
  editDialogOpen.value = true;
};

const updateSeason = async () => {
  updateError.value = '';
  try {
    await seasonStore.updateSeason(selectedSeason.value);
    
    // Update map pool - first get current maps, then determine what to add/remove
    const currentMapIds = selectedSeason.value.maps ? selectedSeason.value.maps.map(m => m.id) : [];
    const mapsToAdd = selectedSeasonMapIds.value.filter(id => !currentMapIds.includes(id));
    const mapsToRemove = currentMapIds.filter(id => !selectedSeasonMapIds.value.includes(id));
    
    if (mapsToAdd.length > 0) {
      await seasonStore.addMapsToSeason(selectedSeason.value.id, mapsToAdd);
    }
    if (mapsToRemove.length > 0) {
      await seasonStore.removeMapsFromSeason(selectedSeason.value.id, mapsToRemove);
    }
    
    await fetchSeasons();
    cancelEdit();
  } catch (err) {
    console.error('Error updating season:', err);
    updateError.value = 'Error updating season: ' + (err?.message || err);
  }
};

const cancelEdit = () => {
  editDialogOpen.value = false;
  selectedSeason.value = null;
  selectedSeasonMapIds.value = [];
};

const removeSeason = async (seasonIdVal) => {
  errorMessage.value = '';
  try {
    await seasonStore.deleteSeason(seasonIdVal);
    await fetchSeasons();
  } catch (err) {
    console.error('Error deleting season:', err);
    errorMessage.value = 'Error deleting season: ' + (err?.message || err);
  }
};

const openDeleteDialog = (id, action) => {
  selectedDeleteItemId.value = id;
  deleteAction.value = action;
  showDeleteDialog.value = true;
};

const confirmDelete = () => {
  if (selectedDeleteItemId.value && deleteAction.value) {
    deleteAction.value(selectedDeleteItemId.value);
  } else if (deleteAction.value) {
    deleteAction.value();
  }
  showDeleteDialog.value = false;
};

const cancelDeleteDialog = () => {
  showDeleteDialog.value = false;
  selectedDeleteItemId.value = null;
  deleteAction.value = null;
};

const uploadFile = async () => {
  if (!file.value || (!seasonId.value && (!seasonName.value || seasonName.value.length === 0))) {
    uploadMessage.value = 'Please select a file and provide a Season Name or ID before uploading!';
    return;
  }
  try {
    isLoading.value = true;
    uploadMessage.value = null;
    const success = await seasonStore.uploadSeasonFile(seasonId.value, seasonName.value, file.value);
    uploadMessage.value = success ? 'File uploaded successfully!' : 'Upload failed!';
    await fetchSeasons();
  } catch (err) {
    console.error('Error uploading file:', err);
    uploadMessage.value = 'An error occurred during file upload.';
  } finally {
    isLoading.value = false;
    seasonId.value = null;
    seasonName.value = null;
    file.value = null;
  }
};

const exportSeason = async (seasonId, seasonName) => {
  try {
    isLoading.value = true;
    errorMessage.value = null;
    
    const { blob, filename } = await seasonStore.exportSeason(seasonId);
    
    // Create a download link and trigger it
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(url);
    
    uploadMessage.value = `Successfully exported ${seasonName}!`;
  } catch (err) {
    console.error('Error exporting season:', err);
    errorMessage.value = 'Error exporting season: ' + (err?.message || err);
  } finally {
    isLoading.value = false;
  }
};
</script>

<style scoped>
.season-row {
  cursor: pointer;
  transition: all 0.2s ease;
}

.season-row:hover {
  background-color: rgba(var(--v-theme-primary), 0.05) !important;
}
</style>