<template>
  <v-overlay v-model="isLoading" persistent contained class="align-center justify-center">
    <v-progress-circular indeterminate size="64" width="8" color="primary"></v-progress-circular>
  </v-overlay>

  <v-container fluid class="pa-4">
    <!-- Page Header -->
    <v-row class="mb-4">
      <v-col>
        <h1>
          <v-icon class="mr-2">mdi-map</v-icon>
          Maps
        </h1>
      </v-col>
    </v-row>

    <!-- Main Card -->
    <v-card elevation="2">
      <v-card-title class="bg-primary d-flex align-center">
        <v-icon class="mr-2">mdi-map</v-icon>
        <span>Maps Overview</span>
      </v-card-title>

      <v-card-text v-if="!errorMessage" class="pa-0">
        <v-data-table
          :headers="tableHeader"
          :items="maps"
          :loading="isLoading"
          :row-props="getRowClass"
          fixed-header
          hover
        >
          <template v-slot:loading>
            <v-skeleton-loader type="table-row@5"></v-skeleton-loader>
          </template>

          <template #top>
            <v-toolbar flat height="auto">
              <v-row align="center" class="flex-wrap ma-0 pa-2">
                <v-spacer />
                <v-col cols="12" sm="auto">
                  <v-btn variant="elevated" color="primary" prepend-icon="mdi-plus" @click="openCreateMap" block>
                    Add New Map
                  </v-btn>
                </v-col>
              </v-row>
            </v-toolbar>
          </template>

          <template v-slot:[`item.image`]="{ item }">
            <span class="map-thumb"><img v-if="item.image" :src="item.image" :alt="item.name" @error="hideMissingImage"></span>
          </template>

          <template v-slot:[`item.actions`]="{ item }">
            <RowActions :actions="[
              { icon: 'mdi-pencil', label: 'Edit', onClick: () => editMap(item) },
              { icon: 'mdi-delete', label: 'Delete', color: 'error', onClick: () => openDeleteDialog(item.id, removeMap) },
            ]" />
          </template>
        </v-data-table>
      </v-card-text>

      <!-- Enhanced Empty State -->
      <v-card-text v-else class="text-center pa-8">
        <v-icon size="64" color="grey-lighten-1">mdi-map-outline</v-icon>
        <div class="text-h6 text-grey mt-4 mb-2">No maps found</div>
        <p class="text-grey-darken-1 mb-4">Get started by adding your first map</p>
        <v-btn variant="elevated" color="primary" prepend-icon="mdi-plus" @click="openCreateMap">
          Add First Map
        </v-btn>
      </v-card-text>
    </v-card>

    <!-- Add / Edit Map Dialog -->
    <v-dialog v-model="mapDialogOpen" max-width="600">
      <v-card v-if="selectedMap">
        <v-card-title class="bg-primary">
          <v-icon class="mr-2">{{ isEditing ? 'mdi-pencil' : 'mdi-map-plus' }}</v-icon>
          {{ isEditing ? `Edit Map: ${selectedMap.name}` : 'Add New Map' }}
        </v-card-title>

        <v-alert v-if="formError" type="error" variant="tonal" border="start" border-color="red" class="mx-4 my-2" closable @click:close="formError = null">
          {{ formError }}
        </v-alert>

        <v-card-text class="pt-4">
          <v-row>
            <v-col cols="12" md="6">
              <v-text-field
                v-model="selectedMap.name"
                label="Map Name"
                variant="outlined"
                prepend-inner-icon="mdi-map"
                density="comfortable"
              ></v-text-field>
            </v-col>
            <v-col cols="12" md="6">
              <v-text-field
                v-model="selectedMap.shortname"
                label="Short Name"
                variant="outlined"
                prepend-inner-icon="mdi-text-short"
                density="comfortable"
              ></v-text-field>
            </v-col>
            <v-col cols="12" class="d-flex align-center ga-4">
              <span class="map-thumb thumb-lg"><img v-if="picturePreview" :src="picturePreview" :alt="selectedMap.name" @error="hideMissingImage"></span>
              <v-file-input
                v-model="pictureFile"
                label="Picture"
                accept="image/png,image/jpeg"
                variant="outlined"
                density="comfortable"
                prepend-icon=""
                prepend-inner-icon="mdi-image"
                hide-details
                clearable
              />
            </v-col>
          </v-row>
        </v-card-text>

        <v-card-actions>
          <v-spacer />
          <v-btn @click="closeMapDialog">Cancel</v-btn>
          <v-btn @click="isEditing ? updateMap() : createNewMap()" color="primary" variant="elevated" :prepend-icon="isEditing ? 'mdi-content-save' : 'mdi-plus'">
            {{ isEditing ? 'Save Changes' : 'Add Map' }}
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <ConfirmDeleteDialog
      v-model="showDeleteDialog"
      message="Are you sure you want to delete this map? This action cannot be undone."
      delete-icon="mdi-delete"
      @confirm="confirmDelete"
      @cancel="cancelDeleteDialog"
    />
  </v-container>
</template>
<script setup>
import RowActions from '@/components/RowActions.vue';
import ConfirmDeleteDialog from '@/components/ConfirmDeleteDialog.vue';
import { useMapStore } from '@/stores';
import { hideMissingImage } from '@/helpers/team-image';
import { computed, onMounted, ref } from 'vue';
import { storeToRefs } from 'pinia';
import { useDeleteDialog } from '@/helpers/delete-dialog';


// Store
const mapStore = useMapStore();
const { maps } = storeToRefs(mapStore);

// State
const selectedMap = ref(null);
const isLoading = ref(false);
const errorMessage = ref(null);
const mapDialogOpen = ref(false);
const isEditing = ref(false);
const formError = ref(null);
const pictureFile = ref(null);
// the picked file while one is picked, else the picture the map already has
const picturePreview = computed(() => (pictureFile.value ? URL.createObjectURL(pictureFile.value) : selectedMap.value?.image));

// Delete dialog state
const { showDeleteDialog, openDeleteDialog, confirmDelete, cancelDeleteDialog } = useDeleteDialog();

// Table configuration
const tableHeader = [
  { title: 'ID', value: 'id', align: 'start', sortable: true },
  { title: '', value: 'image', sortable: false },
  { title: 'Name', value: 'name', sortable: true },
  { title: 'Short Name', value: 'shortname', sortable: true },
  { title: '', value: 'actions', align: 'end', sortable: false }
];

// Methods
const getRowClass = () => ({
  class: 'map-row'
});

const fetchMaps = async () => {
  isLoading.value = true;
  errorMessage.value = null;
  try {
    await mapStore.fetchMaps();
    if (maps.value.length === 0) {
      errorMessage.value = 'No maps found.';
    }
  } catch (error) {
    errorMessage.value = 'Failed to load maps. Please try again later.';
  } finally {
    isLoading.value = false;
  }
};

const openCreateMap = () => {
  selectedMap.value = {
    name: '',
    shortname: ''
  };
  pictureFile.value = null;
  formError.value = null;
  isEditing.value = false;
  mapDialogOpen.value = true;
};

const editMap = (map) => {
  selectedMap.value = { ...map };
  pictureFile.value = null;
  formError.value = null;
  isEditing.value = true;
  mapDialogOpen.value = true;
};

const updateMap = async () => {
  formError.value = null;
  try {
    await mapStore.updateMap(selectedMap.value);
    await uploadPicture(selectedMap.value.id);
    await fetchMaps();
    closeMapDialog();
  } catch (error) {
    console.error('Error updating map:', error);
    formError.value = 'Failed to update map. Please try again.';
  }
};

const createNewMap = async () => {
  formError.value = null;
  try {
    const created = await mapStore.createMap(selectedMap.value);
    await uploadPicture(created.id);
    await fetchMaps();
    closeMapDialog();
  } catch (error) {
    console.error('Error creating map:', error);
    formError.value = 'Failed to create map. Please try again.';
  }
};

const uploadPicture = async (mapId) => {
  if (pictureFile.value) await mapStore.uploadMapImage(mapId, pictureFile.value);
};

const removeMap = async (mapId) => {
  try {
    await mapStore.deleteMap(mapId);
    await fetchMaps();
  } catch (error) {
    console.error('Error deleting map:', error);
  }
};

const closeMapDialog = () => {
  mapDialogOpen.value = false;
  formError.value = null;
  selectedMap.value = null;
  pictureFile.value = null;
};

// Lifecycle hooks
onMounted(() => {
  fetchMaps();
});
</script>

<style scoped>
.map-thumb {
  display: block;
  width: 40px;
  height: 27px;
  background: #263238;
  border-radius: 3px;
  overflow: hidden;
}

.map-thumb img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  display: block;
}

.thumb-lg {
  width: 100px;
  height: 64px;
}

.map-row {
  cursor: pointer;
  transition: all 0.2s ease;
}

.map-row:hover {
  background-color: rgba(var(--v-theme-primary), 0.05) !important;
}
</style>
