<template>
  <v-container fluid class="pa-4">
    <v-row class="mb-4">
      <v-col>
        <h1 class="text-h3 font-weight-bold">
          <v-icon class="mr-2" size="large">mdi-shield-account</v-icon>
          Teams Information
        </h1>
      </v-col>
    </v-row>

    <v-overlay v-model="isLoading" persistent class="loading-overlay">
      <v-progress-circular indeterminate size="64" width="8" color="primary" />
    </v-overlay>

    <!-- Error Message -->
    <v-alert v-if="errorMessage" type="error" variant="tonal" class="mb-4" closable @click:close="errorMessage = null">
      {{ errorMessage }}
    </v-alert>

    <!-- Teams Table -->
    <v-card v-if="!errorMessage" elevation="2">
      <v-card-title class="bg-primary d-flex align-center">
        <v-icon class="mr-2">mdi-format-list-bulleted</v-icon>
        All Teams
      </v-card-title>
      
      <v-card-text class="pa-0">
        <v-data-table
          :headers="tableHeader"
          :items="teams"
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
                  <v-btn variant="elevated" color="primary" prepend-icon="mdi-plus" @click="createTeam()" block>
                    Add New Team
                  </v-btn>
                </v-col>
              </v-row>
            </v-toolbar>
          </template>

          <template #[`item.icon`]="{ item }">
            <v-avatar size="40">
              <v-img :src="item.image_url" cover />
            </v-avatar>
          </template>

          <template #[`item.name`]="{ item }">
            <strong>{{ item.name }}</strong>
          </template>

          <template #[`item.actions`]="{ item }">
            <v-menu location="bottom end">
              <template v-slot:activator="{ props }">
                <v-btn
                  icon="mdi-dots-vertical"
                  variant="text"
                  size="small"
                  v-bind="props"
                ></v-btn>
              </template>
              <v-list density="compact">
                <v-list-item @click="editTeam(item)" prepend-icon="mdi-pencil">
                  <v-list-item-title>Edit Team</v-list-item-title>
                </v-list-item>
                <v-list-item @click="openDeleteDialog(item.id, removeTeam)" prepend-icon="mdi-delete" class="text-error">
                  <v-list-item-title>Delete Team</v-list-item-title>
                </v-list-item>
              </v-list>
            </v-menu>
          </template>

          <template #no-data>
            <div class="text-center pa-8">
              <v-icon size="64" color="grey-lighten-1">mdi-shield-off</v-icon>
              <div class="text-h6 mt-4 text-grey">No teams found</div>
              <v-btn 
                color="primary" 
                variant="tonal" 
                class="mt-4"
                prepend-icon="mdi-plus"
                @click="createTeam"
              >
                Create First Team
              </v-btn>
            </div>
          </template>
        </v-data-table>
      </v-card-text>
    </v-card>

    <!-- Add New Team Dialog -->
    <v-dialog v-model="showNewTeamModal" max-width="600px" persistent>
      <v-card>
        <v-card-title class="bg-primary">
          <v-icon class="mr-2">mdi-plus-circle</v-icon>
          Add Team
        </v-card-title>
        
        <v-alert v-if="creationError" type="error" variant="tonal" class="mx-4 mt-4 mb-2" border="start" border-color="red" closable @click:close="creationError = ''">
          {{ creationError }}
        </v-alert>
        
        <v-card-text class="pt-4">
          <v-row dense>
            <v-col cols="12" md="6">
              <v-text-field
                v-model="newTeam.name" 
                label="Team Name"
                variant="outlined"
                density="comfortable"
                prepend-inner-icon="mdi-shield"
              />
            </v-col>
            <v-col cols="12" md="6">
              <v-text-field
                v-model="newTeam.long_name" 
                label="Team Long Name"
                variant="outlined"
                density="comfortable"
                prepend-inner-icon="mdi-text"
              />
            </v-col>
            <v-col cols="12" md="6">
              <v-text-field
                v-model="newTeam.discord_role" 
                label="Team Discord Role"
                variant="outlined"
                density="comfortable"
                prepend-inner-icon="mdi-discord"
              />
            </v-col>
            <v-col cols="12" md="6">
              <v-file-input
                v-model="file"
                label="Team Icon"
                accept=".png,.jpg"
                variant="outlined"
                density="comfortable"
                prepend-icon=""
                prepend-inner-icon="mdi-image"
                hint="Max 64 KB · PNG or JPG (MySQL BLOB limit)"
                persistent-hint
              />
            </v-col>
          </v-row>
        </v-card-text>
        
        <v-card-actions class="px-4 py-3">
          <v-spacer></v-spacer>
          <v-btn variant="text" @click="cancelAddNewTeam">Cancel</v-btn>
          <v-btn color="primary" prepend-icon="mdi-check" @click="createNewTeam">Create Team</v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <!-- Edit Team Dialog -->
    <v-dialog v-model="showEditTeamModal" max-width="600px" persistent>
      <v-card>
        <v-card-title class="bg-primary">
          <v-icon class="mr-2">mdi-pencil</v-icon>
          Edit Team: {{ selectedTeam?.name }}
        </v-card-title>
        
        <v-alert v-if="updateError" type="error" variant="tonal" class="mx-4 mt-4 mb-2" border="start" border-color="red" closable @click:close="updateError = ''">
          {{ updateError }}
        </v-alert>
        
        <v-card-text class="pt-4">
          <v-row dense>
            <v-col cols="12" md="6">
              <v-text-field
                v-model="selectedTeam.name" 
                label="Team Name"
                variant="outlined"
                density="comfortable"
                prepend-inner-icon="mdi-shield"
              />
            </v-col>
            <v-col cols="12" md="6">
              <v-text-field
                v-model="selectedTeam.long_name" 
                label="Team Long Name"
                variant="outlined"
                density="comfortable"
                prepend-inner-icon="mdi-text"
              />
            </v-col>
            <v-col cols="12" md="6">
              <v-text-field
                v-model="selectedTeam.discord_role" 
                label="Team Discord Role"
                variant="outlined"
                density="comfortable"
                prepend-inner-icon="mdi-discord"
              />
            </v-col>
            <v-col cols="12" md="6">
              <v-file-input
                v-model="file"
                label="Team Icon"
                accept=".png,.jpg"
                variant="outlined"
                density="comfortable"
                prepend-icon=""
                prepend-inner-icon="mdi-image"
                hint="Max 64 KB · PNG or JPG (MySQL BLOB limit)"
                persistent-hint
              />
            </v-col>
          </v-row>
        </v-card-text>
        
        <v-card-actions class="px-4 py-3">
          <v-spacer></v-spacer>
          <v-btn variant="text" @click="cancelEdit">Cancel</v-btn>
          <v-btn color="primary" prepend-icon="mdi-check" @click="updateTeam">Save Changes</v-btn>
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
          Are you sure you want to delete this team? This action cannot be undone.
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
import '@/assets/base.css';
import { useTeamStore } from '@/stores';
import { computed, onMounted, ref } from 'vue';
import { storeToRefs } from 'pinia';
import  teamDefaultImg from '@/assets/media/GNL_Team_Default.png';

const extractErrorMessage = (error) => {
  if (!error) return 'Unknown error';
  if (typeof error === 'string') return error;
  if (error.error) return error.error;
  if (error.message) return error.message;
  return JSON.stringify(error);
};

defineOptions({
  name: 'TeamsView'
})

// Store initialization and refs
const teamStore = useTeamStore();
const { teams } = storeToRefs(teamStore);

// State for editing
const selectedTeam = ref(null);
const isLoading  = ref(false); // State for selected user
const errorMessage = ref(null);
const showNewTeamModal = ref(false);
const showEditTeamModal = ref(false);
const creationError = ref('');
const updateError = ref('');


const file = ref(null);
const newTeam = ref(null);

const tableHeader = [
  { title:'', value: 'icon'},
  { title: 'ID', value: 'id', align: 'start', sortable: true },
  { title: 'Name', value: 'name', sortable: true },  
  { title: 'Long Name', value: 'long_name', sortable: true }, 
  { title: 'Discord Role', value: 'discord_role', sortable: true }, 
  { title: 'Actions', value: 'actions' }, 
]
// Fetch data when the page is loaded
const showDeleteDialog = ref(false);
const selectedDeleteItemId = ref(null);
const deleteAction = ref(null);

// Fetch users when the component is mounted
const fetchTeams = async () => {
  
  isLoading.value = true;
  errorMessage.value = null; // Reset error message
  try {
    await teamStore.fetchTeams(); // Fetch user data


    if (teamStore.teams.length === 0) {
      errorMessage.value = 'No Teams found.';
    }
    const teamPromises = teamStore.teams.map(async (team) => {
      try {
        const imgResponse = await teamStore.getTeamImage(team.id);
        if (!imgResponse.ok) throw new Error("Image not found");
        const imgBlob = await imgResponse.blob();
        team.image_url = URL.createObjectURL(imgBlob);
      } catch (error) {
        team.image_url = teamDefaultImg; // Assign default image if fetch fails
      }
      return team;
    });
    // Wait for all images to be fetched before storing updated teams
    await Promise.all(teamPromises);
  } catch (error) {
    errorMessage.value = 'Failed to load Teams. Please try again later.';
  } finally {
    isLoading.value = false;
  }
};

onMounted( () => {
  fetchTeams(); 
});

const createTeam = () => {
  newTeam.value = {
    name: '',
    long_name: '',
    discord_role:''
  }
  creationError.value = '';
  showNewTeamModal.value = true;
};

const editTeam = (team) => {
  selectedTeam.value = { 
    id: team.id,
    name: team.name,
    long_name: team.long_name,
    discord_role: team.discord_role
  };
  updateError.value = '';
  showEditTeamModal.value = true;
};

const updateTeam = async () => {
  updateError.value = '';
  try {
    await teamStore.updateTeam(selectedTeam.value);
    if(file.value){
      await teamStore.uploadTeamImage(selectedTeam.value.id, file.value);
    }
    // Update the local state after a successful PUT request
    await fetchTeams(); // Re-fetch the Teams
    cancelEdit(); // Reset the form
  } catch (error) {
    console.error('Error updating Team:', error);
    updateError.value = 'Error updating Team: ' + extractErrorMessage(error);
  }
};

const cancelEdit = () => {
  showEditTeamModal.value = false;
  file.value = null;
  selectedTeam.value = { 
    id: null,
    name: '',
    long_name: '',
    discord_role: ''
    };// Clear the selected user
};

const createNewTeam = async () => {
  creationError.value = ''; // Reset error
  let createdTeam = null;
  try {
    const nameExists = teamStore.teams.some(
      team => team.name.toLowerCase() === newTeam.value.name.toLowerCase()
    );

    if (nameExists) {
      throw Error(`Team with name ${newTeam.value.name} already exists`);
    }

    createdTeam = await teamStore.createTeam(newTeam.value);
  } catch (error) {
    console.error('Error creating Team:', error);
    creationError.value = 'Error creating Team: ' + extractErrorMessage(error);
    return;
  }

  // Team created successfully — now try the image upload separately
  if (file.value) {
    try {
      await teamStore.uploadTeamImage(createdTeam.id, file.value);
    } catch (imgError) {
      console.error('Error uploading team icon:', imgError);
      // Switch to edit dialog so retrying the icon doesn't create a duplicate team
      await fetchTeams();
      cancelAddNewTeam();
      selectedTeam.value = {
        id: createdTeam.id,
        name: createdTeam.name,
        long_name: createdTeam.long_name,
        discord_role: createdTeam.discord_role
      };
      updateError.value = 'Team created, but icon upload failed: ' + extractErrorMessage(imgError);
      showEditTeamModal.value = true;
      return;
    }
  }

  await fetchTeams();
  cancelAddNewTeam();
};

const removeTeam = async (teamId) => {
  errorMessage.value = '';
  try {
    await teamStore.deleteTeam(teamId);
    await fetchTeams(); // Refresh the list after deletion
  } catch (error) {
    console.error('Error deleting Team:', error);
    errorMessage.value = 'Error deleting Team:' + error.message;
  }
};


const cancelAddNewTeam = () => {
  showNewTeamModal.value = false;
  file.value = null;
  newTeam.value = {
    name: '',
    long_name: '',
    discord_role: ''
  };
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

</script>

<style scoped>
/* No custom styles needed - using Vuetify defaults */
</style>
