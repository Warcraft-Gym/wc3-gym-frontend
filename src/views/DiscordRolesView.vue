<template>
  <v-overlay v-model="isLoading" persistent contained class="align-center justify-center">
    <v-progress-circular indeterminate size="64" width="8" color="primary"></v-progress-circular>
  </v-overlay>

  <v-container fluid class="pa-4">
    <v-row class="mb-4">
      <v-col>
        <h1>
          <v-icon class="mr-2">mdi-discord</v-icon>
          Discord Roles
        </h1>
      </v-col>
    </v-row>

    <v-alert v-if="errorMessage" type="error" variant="tonal" border="start" border-color="red" class="mb-4" closable @click:close="errorMessage = null">
      {{ errorMessage }}
    </v-alert>

    <v-alert v-if="successMessage" type="success" variant="tonal" border="start" border-color="green" class="mb-4" closable @click:close="successMessage = null">
      {{ successMessage }}
    </v-alert>

    <!-- What the guild has and the database says it should have -->
    <v-card elevation="2" class="mb-4">
      <v-card-title class="bg-primary d-flex align-center">
        <v-icon class="mr-2">mdi-account-sync</v-icon>
        <span>Accounts Out of Sync</span>
      </v-card-title>

      <v-card-text class="pa-0">
        <v-data-table :headers="reportHeader" :items="report" :loading="isLoading" fixed-header hover>
          <template #top>
            <v-toolbar flat height="auto">
              <v-row align="center" class="flex-wrap ma-0 pa-2">
                <v-spacer />
                <v-col cols="12" sm="auto">
                  <v-btn variant="elevated" color="primary" prepend-icon="mdi-sync" @click="syncAll" :loading="isSyncingAll" :disabled="isSyncing" block>
                    Sync All
                  </v-btn>
                </v-col>
              </v-row>
            </v-toolbar>
          </template>

          <template #[`item.missing`]="{ item }">
            <v-chip v-for="role in item.missing" :key="role" color="warning" variant="tonal" size="small" class="mr-1">{{ role }}</v-chip>
            <span v-if="!item.missing.length">&mdash;</span>
          </template>

          <template #[`item.extra`]="{ item }">
            <v-chip v-for="role in item.extra" :key="role" color="error" variant="tonal" size="small" class="mr-1">{{ role }}</v-chip>
            <span v-if="!item.extra.length">&mdash;</span>
          </template>

          <template #[`item.actions`]="{ item }">
            <v-btn variant="text" size="small" prepend-icon="mdi-sync" @click="syncOne(item)" :loading="syncingUserId === item.user_id" :disabled="isSyncing">
              Sync
            </v-btn>
          </template>

          <template #no-data>
            <div class="text-center pa-8">
              <v-icon size="64" color="grey-lighten-1">mdi-check-circle-outline</v-icon>
              <div class="text-h6 mt-4 text-grey">Every account matches the database</div>
            </div>
          </template>
        </v-data-table>
      </v-card-text>
    </v-card>

    <!-- The roles the app owns; sync leaves every other role alone -->
    <v-card elevation="2">
      <v-card-title class="bg-primary d-flex align-center">
        <v-icon class="mr-2">mdi-link-variant</v-icon>
        <span>Role Bindings</span>
      </v-card-title>

      <v-card-text class="pa-0">
        <v-data-table :headers="bindingHeader" :items="bindings" :loading="isLoading" fixed-header hover>
          <template #top>
            <v-toolbar flat height="auto">
              <v-row align="center" class="flex-wrap ma-0 pa-2">
                <v-spacer />
                <v-col cols="12" sm="auto">
                  <v-btn variant="elevated" color="success" prepend-icon="mdi-plus" @click="addBinding" block>
                    Add Binding
                  </v-btn>
                </v-col>
              </v-row>
            </v-toolbar>
          </template>

          <template #[`item.kind`]="{ item }">
            {{ kindLabel(item.kind) }}
          </template>

          <template #[`item.season_id`]="{ item }">
            {{ seasonName(item.season_id) }}
          </template>

          <template #[`item.team_id`]="{ item }">
            {{ teamName(item.team_id) }}
          </template>

          <template #[`item.actions`]="{ item }">
            <RowActions :actions="[
              { icon: 'mdi-pencil', label: 'Edit Binding', onClick: () => editBinding(item) },
              { icon: 'mdi-delete', label: 'Delete Binding', color: 'error', onClick: () => openDeleteDialog(item.id) },
            ]" />
          </template>

          <template #no-data>
            <div class="text-center pa-8">
              <v-icon size="64" color="grey-lighten-1">mdi-link-variant-off</v-icon>
              <div class="text-h6 mt-4 text-grey">No roles bound yet</div>
            </div>
          </template>
        </v-data-table>
      </v-card-text>
    </v-card>

    <!-- Add / Edit Binding Dialog -->
    <v-dialog v-model="bindingDialog" max-width="600" persistent>
      <v-card v-if="binding">
        <v-card-title class="bg-primary">
          <v-icon class="mr-2">{{ binding.id ? 'mdi-pencil' : 'mdi-plus-circle' }}</v-icon>
          {{ binding.id ? 'Edit Binding' : 'Add Binding' }}
        </v-card-title>

        <v-alert v-if="dialogError" type="error" variant="tonal" border="start" border-color="red" class="mx-4 my-2" closable @click:close="dialogError = null">
          {{ dialogError }}
        </v-alert>

        <v-card-text class="pt-4">
          <v-row dense>
            <v-col cols="12" md="6">
              <v-select
                v-model="binding.kind"
                :items="KINDS"
                label="Earned By"
                variant="outlined"
                density="comfortable"
                prepend-inner-icon="mdi-shape"
              />
            </v-col>
            <v-col cols="12" md="6">
              <v-text-field
                v-model="binding.discord_role"
                label="Discord Role ID"
                variant="outlined"
                density="comfortable"
                prepend-inner-icon="mdi-discord"
              />
            </v-col>
            <v-col cols="12" md="6">
              <v-select
                v-model="binding.season_id"
                :items="seasons"
                item-title="name"
                item-value="id"
                label="Season (optional)"
                hint="Blank binds the role in every season"
                persistent-hint
                variant="outlined"
                density="comfortable"
                prepend-inner-icon="mdi-calendar"
                clearable
              />
            </v-col>
            <v-col cols="12" md="6">
              <v-select
                v-model="binding.team_id"
                :items="teams"
                item-title="name"
                item-value="id"
                label="Team (optional)"
                hint="Blank binds the role in every team"
                persistent-hint
                variant="outlined"
                density="comfortable"
                prepend-inner-icon="mdi-shield-account"
                clearable
              />
            </v-col>
          </v-row>
        </v-card-text>

        <v-card-actions class="px-4 py-3">
          <v-spacer />
          <v-btn variant="text" @click="bindingDialog = false">Cancel</v-btn>
          <v-btn color="primary" variant="elevated" prepend-icon="mdi-check" @click="saveBinding" :loading="isSavingBinding">
            {{ binding.id ? 'Save Changes' : 'Add Binding' }}
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <ConfirmDeleteDialog
      v-model="showDeleteDialog"
      message="Unbind this role? The guild keeps it; sync stops touching it."
      @confirm="confirmDelete"
      @cancel="showDeleteDialog = false"
    />
  </v-container>
</template>

<script setup>
import RowActions from '@/components/RowActions.vue';
import ConfirmDeleteDialog from '@/components/ConfirmDeleteDialog.vue';
import { useConfigStore, useSeasonStore, useTeamStore } from '@/stores';
import { computed, onMounted, ref } from 'vue';
import { storeToRefs } from 'pinia';

const configStore = useConfigStore();
const seasonStore = useSeasonStore();
const teamStore = useTeamStore();
const { seasons } = storeToRefs(seasonStore);

// The RoleKind values the backend accepts
const KINDS = [
  { title: 'Captain', value: 'captain' },
  { title: 'Team', value: 'team' },
  { title: 'Fantasy Captain', value: 'fantasy' },
  { title: 'GNL Participant', value: 'gnl_participant' },
  { title: 'Champion', value: 'champion' }
];

const report = ref([]);
const bindings = ref([]);
const teams = ref([]);
const isLoading = ref(false);
const isSyncingAll = ref(false);
const syncingUserId = ref(null);
const isSavingBinding = ref(false);
const errorMessage = ref(null);
const successMessage = ref(null);
const dialogError = ref(null);
const bindingDialog = ref(false);
const binding = ref(null);
const showDeleteDialog = ref(false);
const deleteId = ref(null);

const isSyncing = computed(() => isSyncingAll.value || syncingUserId.value !== null);

const reportHeader = [
  { title: 'Name', value: 'name', sortable: true },
  { title: 'Discord ID', value: 'discord_id', sortable: true },
  { title: 'Missing', value: 'missing', sortable: false },
  { title: 'Extra', value: 'extra', sortable: false },
  { title: 'Actions', value: 'actions', align: 'end', sortable: false }
];

const bindingHeader = [
  { title: 'ID', value: 'id', align: 'start', sortable: true },
  { title: 'Earned By', value: 'kind', sortable: true },
  { title: 'Season', value: 'season_id', sortable: true },
  { title: 'Team', value: 'team_id', sortable: true },
  { title: 'Discord Role ID', value: 'discord_role', sortable: true },
  { title: 'Actions', value: 'actions', align: 'end', sortable: false }
];

const kindLabel = (kind) => KINDS.find(k => k.value === kind)?.title ?? kind;
const seasonName = (id) => seasons.value.find(s => s.id === id)?.name ?? 'Every season';
const teamName = (id) => teams.value.find(t => t.id === id)?.name ?? 'Every team';


const fetchAll = async () => {
  isLoading.value = true;
  errorMessage.value = null;
  try {
    [report.value, bindings.value, teams.value] = await Promise.all([
      configStore.fetchDiscordRoleReport(),
      configStore.fetchDiscordRoleBindings(),
      teamStore.getTeamsBasic(),
      seasonStore.fetchSeasons()
    ]);
  } catch (error) {
    errorMessage.value = 'Failed to load the Discord roles: ' + error.message;
  } finally {
    isLoading.value = false;
  }
};

const syncAll = async () => {
  isSyncingAll.value = true;
  errorMessage.value = null;
  successMessage.value = null;
  try {
    // The answer is the difference sync just applied, so the table is read again
    const applied = await configStore.syncDiscordRoles();
    report.value = await configStore.fetchDiscordRoleReport();
    successMessage.value = `Synced ${applied.length} account(s). ${report.value.length} still differ.`;
  } catch (error) {
    errorMessage.value = 'Failed to sync the roles: ' + error.message;
  } finally {
    isSyncingAll.value = false;
  }
};

const syncOne = async (row) => {
  syncingUserId.value = row.user_id;
  errorMessage.value = null;
  successMessage.value = null;
  try {
    // The answer is the difference sync just applied, so the table is read again
    await configStore.syncDiscordRoles([row.user_id]);
    report.value = await configStore.fetchDiscordRoleReport();
    successMessage.value = `Synced ${row.name}.`;
  } catch (error) {
    errorMessage.value = `Failed to sync ${row.name}: ` + error.message;
  } finally {
    syncingUserId.value = null;
  }
};

const addBinding = () => {
  binding.value = { kind: 'captain', season_id: null, team_id: null, discord_role: '' };
  dialogError.value = null;
  bindingDialog.value = true;
};

const editBinding = (row) => {
  binding.value = { ...row };
  dialogError.value = null;
  bindingDialog.value = true;
};

const saveBinding = async () => {
  dialogError.value = null;
  isSavingBinding.value = true;
  try {
    const { id, ...body } = binding.value;
    if (id) {
      await configStore.updateDiscordRoleBinding(id, body);
    } else {
      await configStore.createDiscordRoleBinding(body);
    }
    bindings.value = await configStore.fetchDiscordRoleBindings();
    bindingDialog.value = false;
    successMessage.value = 'Binding saved.';
  } catch (error) {
    dialogError.value = 'Failed to save the binding: ' + error.message;
  } finally {
    isSavingBinding.value = false;
  }
};

const openDeleteDialog = (id) => {
  deleteId.value = id;
  showDeleteDialog.value = true;
};

const confirmDelete = async () => {
  showDeleteDialog.value = false;
  errorMessage.value = null;
  try {
    await configStore.deleteDiscordRoleBinding(deleteId.value);
    bindings.value = await configStore.fetchDiscordRoleBindings();
    successMessage.value = 'Binding removed.';
  } catch (error) {
    errorMessage.value = 'Failed to remove the binding: ' + error.message;
  }
};

onMounted(fetchAll);
</script>
