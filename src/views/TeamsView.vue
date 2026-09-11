<template>
  <v-container fluid class="pa-4">
    <v-row class="mb-4">
      <v-col>
        <h1 class="text-h5 text-md-h3 font-weight-bold">
          <v-icon class="mr-2" size="large">mdi-shield-account</v-icon>
          Teams Information
        </h1>
      </v-col>
    </v-row>

    <v-overlay v-model="isLoading" persistent class="align-center justify-center">
      <v-progress-circular indeterminate size="64" width="8" color="primary" />
    </v-overlay>

    <!-- Error Message -->
    <v-alert v-if="errorMessage" type="error" variant="tonal" class="mb-4" closable @click:close="errorMessage = null">
      {{ errorMessage }}
    </v-alert>

    <div v-if="auth.isAdmin" class="d-flex justify-end mb-4">
      <v-btn variant="elevated" color="primary" prepend-icon="mdi-plus" @click="createTeam()">
        Add New Team
      </v-btn>
    </div>

    <!-- The season's own teams first, so the historical ones do not bury them -->
    <v-card v-for="group in groups" v-show="!errorMessage" :key="group.title" elevation="2" class="mb-4">
      <v-card-title class="bg-primary d-flex align-center">
        <v-icon class="mr-2">mdi-format-list-bulleted</v-icon>
        {{ group.title }}
      </v-card-title>

      <v-card-text class="pa-0">
        <v-data-table
          :headers="tableHeader"
          :items="group.items"
          :loading="isLoading"
          hover
          density="comfortable"
          @click:row="openTeam"
        >
          <template #loading>
            <v-skeleton-loader type="table-row@10" />
          </template>

          <template #[`item.icon`]="{ item }">
            <v-avatar size="40">
              <img class="team-icon" :src="teamImageUrl(item)" @error="showDefaultTeamImage">
            </v-avatar>
          </template>

          <template #[`item.long_name`]="{ item }">
            <strong>{{ item.long_name || item.name }}</strong>
          </template>

          <template #[`item.seasons`]="{ item }">
            <template v-if="playedSeasons(item).length">
              <v-chip
                v-for="season in playedSeasons(item)"
                :key="season.id"
                size="small"
                class="ma-1"
                :color="season.id === currentSeasonId ? 'primary' : undefined"
                :variant="season.id === currentSeasonId ? 'flat' : 'tonal'"
              >
                {{ season.name }}
              </v-chip>
            </template>
            <span v-else>—</span>
          </template>

          <template #[`item.actions`]="{ item }">
            <div @click.stop>
              <RowActions :actions="[
                { icon: 'mdi-pencil', label: 'Edit Team', onClick: () => editTeam(item) },
                { icon: 'mdi-delete', label: 'Delete Team', color: 'error', onClick: () => openDeleteDialog(item.id, removeTeam) },
              ]" />
            </div>
          </template>

          <template #no-data>
            <div class="text-center pa-8">
              <v-icon size="64" class="text-disabled">mdi-shield-off</v-icon>
              <div class="text-h6 mt-4 text-medium-emphasis">No teams found</div>
              <v-btn
                color="primary"
                variant="tonal"
                class="mt-4"
                prepend-icon="mdi-plus"
                v-if="auth.isAdmin"
                @click="createTeam"
              >
                Create First Team
              </v-btn>
            </div>
          </template>
        </v-data-table>
      </v-card-text>
    </v-card>

    <!-- Add / Edit Team Dialog -->
    <v-dialog v-model="showTeamModal" max-width="600px" persistent>
      <v-card>
        <v-card-title class="bg-primary">
          <v-icon class="mr-2">{{ isEditing ? 'mdi-pencil' : 'mdi-plus-circle' }}</v-icon>
          {{ isEditing ? `Edit Team: ${selectedTeam?.name ?? ''}` : 'Add Team' }}
        </v-card-title>

        <v-alert v-if="formError" type="error" variant="tonal" class="mx-4 mt-4 mb-2" border="start" border-color="error" closable @click:close="formError = ''">
          {{ formError }}
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
          <v-btn variant="text" @click="closeTeamDialog">Cancel</v-btn>
          <v-btn v-if="auth.isAdmin" color="primary" prepend-icon="mdi-check" @click="isEditing ? updateTeam() : createNewTeam()">{{ isEditing ? 'Save Changes' : 'Create Team' }}</v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <ConfirmDeleteDialog
      v-model="showDeleteDialog"
      message="Are you sure you want to delete this team? This action cannot be undone."
      @confirm="confirmDelete"
      @cancel="cancelDeleteDialog"
    />
  </v-container>
</template>
<script setup>
import RowActions from '@/components/RowActions.vue';
import ConfirmDeleteDialog from '@/components/ConfirmDeleteDialog.vue';
import { useAuthStore, useSeasonStore, useTeamStore } from '@/stores';
import { computed, onMounted, ref } from 'vue';
import { useRouter } from 'vue-router';
import { storeToRefs } from 'pinia';
import { loadSeasons, resolveCurrentSeasonId } from '@/helpers/current-season';
import { teamImageUrl, showDefaultTeamImage } from '@/helpers/team-image';
import { useDeleteDialog } from '@/helpers/delete-dialog';
import { useColumns } from '@/helpers/columns';

const extractErrorMessage = (error) => {
  if (!error) return 'Unknown error';
  if (typeof error === 'string') return error;
  if (error.error) return error.error;
  if (error.message) return error.message;
  return JSON.stringify(error);
};


// Store initialization and refs
const teamStore = useTeamStore();
const auth = useAuthStore();
const { teams } = storeToRefs(teamStore);

// State for editing
const selectedTeam = ref(null);
const isLoading  = ref(false); // State for selected user
const errorMessage = ref(null);
const showTeamModal = ref(false);
const isEditing = ref(false);
const formError = ref('');


const file = ref(null);

const allTableHeader = computed(() => [
  { title:'', value: 'icon'},
  { title: 'Long Name', value: 'long_name', sortable: true },
  { title: 'Handle', value: 'name', sortable: true },
  { mobile: false, title: 'Seasons', value: 'seasons', sortable: false },
  ...(auth.isAdmin ? [{ title: '', value: 'actions', align: 'end', sortable: false }] : []),
])
const tableHeader = useColumns(allTableHeader);

// The seasons a team played, newest first; the team list carries one row per season
const currentSeasonId = ref(null);
const seasonStore = useSeasonStore();
const playedSeasons = (team) => (team.seasons_info || [])
  .map((info) => seasonStore.seasons.find((season) => season.id === info.season_id))
  .filter(Boolean)
  .sort((a, b) => b.id - a.id);

const currentSeasonName = computed(() =>
  seasonStore.seasons.find((season) => season.id === currentSeasonId.value)?.name
);
const playsCurrentSeason = (team) =>
  (team.seasons_info || []).some((info) => info.season_id === currentSeasonId.value);

const groups = computed(() => {
  if (!currentSeasonId.value) return [{ title: 'All Teams', items: teams.value }];
  return [
    { title: currentSeasonName.value || 'Current season', items: teams.value.filter(playsCurrentSeason) },
    { title: 'Past Teams', items: teams.value.filter((team) => !playsCurrentSeason(team)) },
  ];
});

const router = useRouter();
const openTeam = (event, { item }) => router.push(`/team/${item.id}`);
// Fetch data when the page is loaded
const { showDeleteDialog, openDeleteDialog, confirmDelete, cancelDeleteDialog } = useDeleteDialog();

// Fetch users when the component is mounted
const fetchTeams = async () => {
  
  isLoading.value = true;
  errorMessage.value = null; // Reset error message
  try {
    await teamStore.fetchTeams(); // Fetch user data


    if (teamStore.teams.length === 0) {
      errorMessage.value = 'No Teams found.';
    }
  } catch (error) {
    errorMessage.value = 'Failed to load Teams. Please try again later.';
  } finally {
    isLoading.value = false;
  }
};

onMounted(async () => {
  await loadSeasons();  // the season chips need the names
  currentSeasonId.value = await resolveCurrentSeasonId();
  fetchTeams();
});

const createTeam = () => {
  selectedTeam.value = {
    name: '',
    long_name: ''
  }
  formError.value = '';
  isEditing.value = false;
  showTeamModal.value = true;
};

const editTeam = (team) => {
  selectedTeam.value = {
    id: team.id,
    name: team.name,
    long_name: team.long_name
  };
  formError.value = '';
  isEditing.value = true;
  showTeamModal.value = true;
};

const updateTeam = async () => {
  formError.value = '';
  try {
    await teamStore.updateTeam(selectedTeam.value);
    if(file.value){
      await teamStore.uploadTeamImage(selectedTeam.value.id, file.value);
    }
    // Update the local state after a successful PUT request
    await fetchTeams(); // Re-fetch the Teams
    closeTeamDialog(); // Reset the form
  } catch (error) {
    console.error('Error updating Team:', error);
    formError.value = 'Error updating Team: ' + extractErrorMessage(error);
  }
};

const createNewTeam = async () => {
  formError.value = ''; // Reset error
  let createdTeam = null;
  try {
    const nameExists = teamStore.teams.some(
      team => team.name.toLowerCase() === selectedTeam.value.name.toLowerCase()
    );

    if (nameExists) {
      throw Error(`Team with name ${selectedTeam.value.name} already exists`);
    }

    createdTeam = await teamStore.createTeam(selectedTeam.value);
  } catch (error) {
    console.error('Error creating Team:', error);
    formError.value = 'Error creating Team: ' + extractErrorMessage(error);
    return;
  }

  // Team created successfully — now try the image upload separately
  if (file.value) {
    try {
      await teamStore.uploadTeamImage(createdTeam.id, file.value);
    } catch (imgError) {
      console.error('Error uploading team icon:', imgError);
      // Switch to edit mode so retrying the icon doesn't create a duplicate team
      await fetchTeams();
      file.value = null;
      selectedTeam.value = {
        id: createdTeam.id,
        name: createdTeam.name,
        long_name: createdTeam.long_name
      };
      formError.value = 'Team created, but icon upload failed: ' + extractErrorMessage(imgError);
      isEditing.value = true;
      return;
    }
  }

  await fetchTeams();
  closeTeamDialog();
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


const closeTeamDialog = () => {
  showTeamModal.value = false;
  file.value = null;
  selectedTeam.value = {
    name: '',
    long_name: ''
  };
};

</script>

<style scoped>

.team-icon {
  width: 100%;
  height: 100%;
  object-fit: cover;
}
</style>
