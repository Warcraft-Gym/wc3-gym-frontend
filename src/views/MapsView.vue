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
                  <v-btn variant="elevated" color="primary" prepend-icon="mdi-plus" @click="showNewMapModal = true" block>
                    Add New Map
                  </v-btn>
                </v-col>
              </v-row>
            </v-toolbar>
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
        <v-btn variant="elevated" color="primary" prepend-icon="mdi-plus" @click="showNewMapModal = true">
          Add First Map
        </v-btn>
      </v-card-text>
    </v-card>

    <!-- Add New Map Dialog -->
    <v-dialog v-model="showNewMapModal" max-width="600">
      <v-card>
        <v-card-title class="bg-primary">
          <v-icon class="mr-2">mdi-map-plus</v-icon>
          Add New Map
        </v-card-title>

        <v-alert v-if="creationError" type="error" variant="tonal" border="start" border-color="red" class="mx-4 my-2" closable @click:close="creationError = null">
          {{ creationError }}
        </v-alert>

        <v-card-text class="pt-4">
          <v-row>
            <v-col cols="12" md="6">
              <v-text-field
                v-model="newMap.name"
                label="Map Name"
                variant="outlined"
                prepend-inner-icon="mdi-map"
                density="comfortable"
              ></v-text-field>
            </v-col>
            <v-col cols="12" md="6">
              <v-text-field
                v-model="newMap.shortname"
                label="Short Name"
                variant="outlined"
                prepend-inner-icon="mdi-text-short"
                density="comfortable"
              ></v-text-field>
            </v-col>
          </v-row>
        </v-card-text>

        <v-card-actions>
          <v-spacer />
          <v-btn @click="cancelAddNewMap">Cancel</v-btn>
          <v-btn @click="createNewMap" color="primary" variant="elevated" prepend-icon="mdi-plus">
            Add Map
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <!-- Edit Map Dialog -->
    <v-dialog v-model="editDialogOpen" max-width="600">
      <v-card v-if="selectedMap">
        <v-card-title class="bg-primary">
          <v-icon class="mr-2">mdi-pencil</v-icon>
          Edit Map: {{ selectedMap.name }}
        </v-card-title>

        <v-alert v-if="updateError" type="error" variant="tonal" border="start" border-color="red" class="mx-4 my-2" closable @click:close="updateError = null">
          {{ updateError }}
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
          </v-row>
        </v-card-text>

        <v-card-actions>
          <v-spacer />
          <v-btn @click="cancelEdit">Cancel</v-btn>
          <v-btn @click="updateMap" color="primary" variant="elevated" prepend-icon="mdi-content-save">
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
          Are you sure you want to delete this map? This action cannot be undone.
        </v-card-text>
        <v-card-actions>
          <v-spacer />
          <v-btn @click="cancelDeleteDialog" variant="text">Cancel</v-btn>
          <v-btn @click="confirmDelete" color="error" variant="elevated" prepend-icon="mdi-delete">
            Delete
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>
  </v-container>
</template>
<script setup>
import RowActions from '@/components/RowActions.vue';
import { useMapStore } from '@/stores';
import { onMounted, ref } from 'vue';
import { storeToRefs } from 'pinia';


// Store
const mapStore = useMapStore();
const { maps } = storeToRefs(mapStore);

// State
const selectedMap = ref(null);
const isLoading = ref(false);
const errorMessage = ref(null);
const showNewMapModal = ref(false);
const editDialogOpen = ref(false);
const creationError = ref(null);
const updateError = ref(null);

// Form state
const newMap = ref({
  name: '',
  shortname: ''
});

// Delete dialog state
const showDeleteDialog = ref(false);
const selectedDeleteItemId = ref(null);
const deleteAction = ref(null);

// Table configuration
const tableHeader = [
  { title: 'ID', value: 'id', align: 'start', sortable: true },
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

const editMap = (map) => {
  selectedMap.value = { ...map };
  updateError.value = null;
  editDialogOpen.value = true;
};

const updateMap = async () => {
  updateError.value = null;
  try {
    await mapStore.updateMap(selectedMap.value);
    await fetchMaps();
    cancelEdit();
  } catch (error) {
    console.error('Error updating map:', error);
    updateError.value = 'Failed to update map. Please try again.';
  }
};

const cancelEdit = () => {
  selectedMap.value = null;
  updateError.value = null;
  editDialogOpen.value = false;
};

const createNewMap = async () => {
  creationError.value = null;
  try {
    await mapStore.createMap(newMap.value);
    await fetchMaps();
    cancelAddNewMap();
  } catch (error) {
    console.error('Error creating map:', error);
    creationError.value = 'Failed to create map. Please try again.';
  }
};

const removeMap = async (mapId) => {
  try {
    await mapStore.deleteMap(mapId);
    await fetchMaps();
  } catch (error) {
    console.error('Error deleting map:', error);
  }
};

const cancelAddNewMap = () => {
  showNewMapModal.value = false;
  creationError.value = null;
  newMap.value = {
    name: '',
    shortname: ''
  };
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

// Lifecycle hooks
onMounted(() => {
  fetchMaps();
});
</script>

<style scoped>
.map-row {
  cursor: pointer;
  transition: all 0.2s ease;
}

.map-row:hover {
  background-color: rgba(var(--v-theme-primary), 0.05) !important;
}
</style>
