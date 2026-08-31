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
    <v-card v-if="auth.isAdmin" class="mb-4" elevation="2">
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
                    :disabled="!canUpload || isLoading"
                    v-if="auth.isAdmin"
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
                  <v-btn v-if="auth.isAdmin" variant="elevated" color="primary" prepend-icon="mdi-plus" @click.stop="addNewSeason" block>
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
              <td v-if="auth.isAdmin" class="text-end">
                <RowActions :actions="[
                  { icon: 'mdi-pencil', label: 'Edit Season', onClick: () => editSeason(item) },
                  { icon: 'mdi-download', label: 'Export Season', onClick: () => exportSeason(item.id, item.name) },
                  { icon: 'mdi-delete', label: 'Delete Season', color: 'error', onClick: () => openDeleteDialog(item.id, removeSeason) },
                ]" />
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
                v-if="auth.isAdmin"
                @click="addNewSeason"
              >
                Create First Season
              </v-btn>
            </div>
          </template>
        </v-data-table>
      </v-card-text>
    </v-card>

    <!-- Add / Edit Season Dialog -->
    <v-dialog v-model="seasonDialogOpen" max-width="800px" persistent>
      <v-card v-if="selectedSeason">
        <v-card-title class="bg-primary">
          <v-icon class="mr-2">{{ isEditing ? 'mdi-pencil' : 'mdi-plus-circle' }}</v-icon>
          {{ isEditing ? `Edit Season: ${selectedSeason.name}` : 'Add New Season' }}
        </v-card-title>

        <v-alert v-if="formError" type="error" variant="tonal" class="mx-4 mt-4 mb-2" border="start" border-color="red" closable @click:close="formError = null">
          {{ formError }}
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
          <v-btn variant="text" @click="closeSeasonDialog">Cancel</v-btn>
          <v-btn v-if="auth.isAdmin" color="primary" prepend-icon="mdi-check" @click="isEditing ? updateSeason() : createNewSeason()">{{ isEditing ? 'Save Changes' : 'Create Season' }}</v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <ConfirmDeleteDialog
      v-model="showDeleteDialog"
      message="Are you sure you want to delete this season? This action cannot be undone."
      @confirm="confirmDelete"
      @cancel="cancelDeleteDialog"
    />
  </v-container>
</template>

<script setup>
import RowActions from '@/components/RowActions.vue';
import ConfirmDeleteDialog from '@/components/ConfirmDeleteDialog.vue';
import { ref, computed, onMounted } from 'vue';
import { useAuthStore, useSeasonStore, useMapStore } from '@/stores';
import { useDeleteDialog } from '@/helpers/delete-dialog';


const seasonStore = useSeasonStore();
const mapStore = useMapStore();
const auth = useAuthStore();

const seasons = ref([]);
const maps = ref([]);
const isLoading = ref(false);
const errorMessage = ref(null);
const uploadMessage = ref(null);
const seasonName = ref(null);
const seasonId = ref(null);
const file = ref(null);
const canUpload = computed(() => !!file.value && (!!seasonId.value || !!seasonName.value));

const seasonDialogOpen = ref(false);
const isEditing = ref(false);
const selectedSeason = ref(null);
const selectedSeasonMapIds = ref([]);
const formError = ref(null);

const { showDeleteDialog, openDeleteDialog, confirmDelete, cancelDeleteDialog } = useDeleteDialog();

const tableHeader = computed(() => [
  { title: 'ID', value: 'id', align: 'start', sortable: true },
  { title: 'Name', value: 'name', sortable: true },
  { title: 'Weeks', value: 'number_weeks', sortable: true },
  { title: 'Pick Ban', value: 'pick_ban', sortable: false },
  { title: 'Series/Week', value: 'series_per_week', sortable: true },
  ...(auth.isAdmin ? [{ title: '', key: 'actions', align: 'end', sortable: false }] : []),
]);

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
  selectedSeason.value = { name: '', number_weeks: 0, pick_ban: '', series_per_week: 0, discordRole: '', start_date: null, end_date: null };
  selectedSeasonMapIds.value = [];
  formError.value = '';
  isEditing.value = false;
  seasonDialogOpen.value = true;
};

const createNewSeason = async () => {
  formError.value = '';
  try {
    const createdSeason = await seasonStore.createSeason(selectedSeason.value);

    // Add maps to the season if any were selected
    if (selectedSeasonMapIds.value && selectedSeasonMapIds.value.length > 0) {
      await seasonStore.addMapsToSeason(createdSeason.id, selectedSeasonMapIds.value);
    }

    await fetchSeasons();
    closeSeasonDialog();
  } catch (err) {
    console.error('Error creating season:', err);
    formError.value = 'Error creating season: ' + err.message;
  }
};

const editSeason = (season) => {
  selectedSeason.value = { ...season };
  selectedSeasonMapIds.value = season.maps ? season.maps.map(m => m.id) : [];
  formError.value = '';
  isEditing.value = true;
  seasonDialogOpen.value = true;
};

const updateSeason = async () => {
  formError.value = '';
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
    closeSeasonDialog();
  } catch (err) {
    console.error('Error updating season:', err);
    formError.value = 'Error updating season: ' + err.message;
  }
};

const closeSeasonDialog = () => {
  seasonDialogOpen.value = false;
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
    errorMessage.value = 'Error deleting season: ' + err.message;
  }
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
    errorMessage.value = 'Error exporting season: ' + err.message;
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