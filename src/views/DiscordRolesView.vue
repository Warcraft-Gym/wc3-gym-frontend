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
        <div class="text-body-2 text-medium-emphasis">
          The app grants bound roles from the database; unbound roles are never touched. Sync runs only when pressed.
        </div>
      </v-col>
    </v-row>

    <StatusAlert v-model="errorMessage" />

    <StatusAlert v-model="successMessage" type="success" />

    <!-- What the guild has and the database says it should have -->
    <v-card elevation="2" class="mb-4">
      <v-card-title class="bg-primary d-flex align-center">
        <v-icon class="mr-2">mdi-account-sync</v-icon>
        <span>Accounts Out of Sync</span>
      </v-card-title>

      <v-card-text class="pa-0">
        <v-data-table :headers="reportHeader" :items="report" :loading="isLoadingReport" fixed-header hover>
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
            <v-chip v-for="role in item.missing" :key="role" color="warning" variant="tonal" size="small" class="mr-1" :title="role">{{ roleName(role) }}</v-chip>
            <span v-if="!item.missing.length">&mdash;</span>
          </template>

          <template #[`item.extra`]="{ item }">
            <v-chip v-for="role in item.extra" :key="role" color="error" variant="tonal" size="small" class="mr-1" :title="role">{{ roleName(role) }}</v-chip>
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

    <!-- The roles the app owns, grouped by what earns them -->
    <v-card elevation="2">
      <v-card-title class="bg-primary d-flex align-center">
        <v-icon class="mr-2">mdi-link-variant</v-icon>
        <span>Role Bindings</span>
        <v-spacer />
        <v-btn variant="elevated" color="success" prepend-icon="mdi-plus" @click="addBinding">
          Add Binding
        </v-btn>
      </v-card-title>

      <v-card-text v-if="!syncedBindings.length" class="text-center pa-8">
        <v-icon size="64" color="grey-lighten-1">mdi-link-variant-off</v-icon>
        <div class="text-h6 mt-4 text-grey">No roles bound yet</div>
      </v-card-text>

      <v-card-text v-else class="pa-0">
        <template v-for="group in bindingGroups" :key="group.kind">
          <div class="px-4 pt-4">
            <div class="text-subtitle-1 font-weight-bold">{{ group.label }}</div>
            <div class="text-body-2 text-medium-emphasis">{{ group.description }}</div>
          </div>
          <v-list density="compact">
            <v-list-item v-for="row in group.rows" :key="row.id">
              <v-list-item-title>
                <span :class="{ 'text-medium-emphasis font-italic': !roleNames[row.discord_role] }" :title="row.discord_role">
                  {{ roleName(row.discord_role) }}
                </span>
              </v-list-item-title>
              <v-list-item-subtitle v-if="bindingDetail(row)">{{ bindingDetail(row) }}</v-list-item-subtitle>
              <template #append>
                <RowActions :actions="[
                  { icon: 'mdi-pencil', label: 'Edit Binding', onClick: () => editBinding(row) },
                  { icon: 'mdi-delete', label: 'Delete Binding', color: 'error', onClick: () => openDeleteDialog(row.id) },
                ]" />
              </template>
            </v-list-item>
          </v-list>
          <v-divider />
        </template>
      </v-card-text>
    </v-card>

    <!-- Admin roles come from the API but sync never touches them -->
    <v-card v-if="adminBindings.length" elevation="2" class="mt-4">
      <v-card-title class="d-flex align-center">
        <v-icon class="mr-2">mdi-hand-back-right</v-icon>
        <span>Not Synced (hand-managed)</span>
      </v-card-title>

      <v-card-text class="pa-0">
        <div class="px-4">
          <div class="text-body-2 text-medium-emphasis">{{ KIND_META.admin.description }}</div>
        </div>
        <v-list density="compact">
          <v-list-item v-for="row in adminBindings" :key="row.id">
            <v-list-item-title>
              <span :class="{ 'text-medium-emphasis font-italic': !roleNames[row.discord_role] }" :title="row.discord_role">
                {{ roleName(row.discord_role) }}
              </span>
            </v-list-item-title>
            <template #append>
              <RowActions :actions="[
                { icon: 'mdi-delete', label: 'Delete Binding', color: 'error', onClick: () => openDeleteDialog(row.id) },
              ]" />
            </template>
          </v-list-item>
        </v-list>
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
          <!-- The kind is picked once; changing it later is delete-and-add -->
          <v-radio-group v-if="!binding.id" v-model="binding.kind" @update:model-value="binding.season_id = null; binding.team_id = null">
            <v-radio v-for="kind in addableKinds" :key="kind" :value="kind">
              <template #label>
                <div class="py-1">
                  <div class="font-weight-medium">{{ KIND_META[kind].label }}</div>
                  <div class="text-body-2 text-medium-emphasis">{{ KIND_META[kind].description }}</div>
                </div>
              </template>
            </v-radio>
          </v-radio-group>

          <div v-else class="mb-4">
            <div class="font-weight-medium">{{ KIND_META[binding.kind]?.label ?? binding.kind }}</div>
            <div class="text-body-2 text-medium-emphasis">{{ KIND_META[binding.kind]?.description }}</div>
          </div>

          <v-row dense>
            <v-col v-if="binding.kind === 'team'" cols="12">
              <v-select
                v-model="binding.team_id"
                :items="teams"
                item-title="name"
                item-value="id"
                label="Team (required)"
                variant="outlined"
                density="comfortable"
                prepend-inner-icon="mdi-shield-account"
              />
            </v-col>
            <v-col v-if="binding.kind === 'champion'" cols="12">
              <v-select
                v-model="binding.season_id"
                :items="seasons"
                item-title="name"
                item-value="id"
                label="Season (required)"
                variant="outlined"
                density="comfortable"
                prepend-inner-icon="mdi-calendar"
              />
              <div v-if="binding.id && binding.team_id" class="text-body-2 text-medium-emphasis mt-1">
                Winner: {{ teamName(binding.team_id) }} &mdash; derived from standings
              </div>
            </v-col>
            <v-col v-if="binding.kind === 'gnl_participant' || binding.kind === 'fantasy'" cols="12">
              <v-select
                v-model="binding.season_id"
                :items="seasons"
                item-title="name"
                item-value="id"
                label="Season (optional)"
                hint="Blank always follows the current season; a specific season keeps its holders after it ends"
                persistent-hint
                variant="outlined"
                density="comfortable"
                prepend-inner-icon="mdi-calendar"
                clearable
              />
            </v-col>
            <v-col cols="12">
              <v-combobox
                v-model="binding.discord_role"
                :items="roleItems"
                item-title="title"
                item-value="value"
                :return-object="false"
                label="Discord Role"
                variant="outlined"
                density="comfortable"
                prepend-inner-icon="mdi-discord"
              />
            </v-col>
          </v-row>
        </v-card-text>

        <v-card-actions class="px-4 py-3">
          <v-spacer />
          <v-btn variant="text" @click="bindingDialog = false">Cancel</v-btn>
          <v-btn color="primary" variant="elevated" prepend-icon="mdi-check" @click="saveBinding" :loading="isSavingBinding" :disabled="!canSave">
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
import StatusAlert from '@/components/StatusAlert.vue';

const configStore = useConfigStore();
const seasonStore = useSeasonStore();
const teamStore = useTeamStore();
const { seasons } = storeToRefs(seasonStore);

// The RoleKind values the backend accepts, in display order; admin is never synced
const KIND_META = {
  team: { label: 'Team', description: "The team's current-season roster and captains hold the role." },
  captain: { label: 'GNL Captain', description: 'Captains of the current season hold the role.' },
  gnl_participant: { label: 'GNL Player', description: 'Players rostered or signed up in the season hold the role.' },
  fantasy: { label: 'GNL Fantasy', description: 'Fantasy team captains of the season hold the role.' },
  champion: { label: 'Champion', description: 'The roster of the team that won the season holds the role; the winner is derived from standings.' },
  admin: { label: 'Gym Admin', description: 'Hand-managed in Discord; sync never grants or removes these roles.' }
};
const addableKinds = Object.keys(KIND_META).filter(kind => kind !== 'admin');

const report = ref([]);
const bindings = ref([]);
const roleNames = ref({});
const isLoadingReport = ref(false);
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
  { title: '', value: 'actions', align: 'end', sortable: false }
];

const syncedBindings = computed(() => bindings.value.filter(b => b.kind !== 'admin'));
const adminBindings = computed(() => bindings.value.filter(b => b.kind === 'admin'));
const bindingGroups = computed(() =>
  addableKinds
    .map(kind => ({ kind, ...KIND_META[kind], rows: bindings.value.filter(b => b.kind === kind) }))
    .filter(group => group.rows.length)
);

const kindLabel = (kind) => KIND_META[kind]?.label ?? kind;
const seasonName = (id) => seasons.value.find(s => s.id === id)?.name ?? `Season ${id}`;
const teamName = (id) => teams.value.find(t => t.id === id)?.name ?? `Team ${id}`;
// A role the guild no longer names still has its binding to describe it
const roleName = (id) => {
  if (roleNames.value[id]) return roleNames.value[id];
  const bound = bindings.value.find(b => b.discord_role === id);
  if (!bound) return id;
  if (bound.kind === 'team') return teamName(bound.team_id);
  if (bound.kind === 'champion') return `${teamName(bound.team_id)} Champion`;
  return kindLabel(bound.kind);
};
const roleItems = computed(() => Object.entries(roleNames.value).map(([value, title]) => ({ title, value })));

// The scope line under each binding; champion team_id arrives derived from standings
const bindingDetail = (row) => {
  if (row.kind === 'team') return teamName(row.team_id);
  if (row.kind === 'champion') {
    const winner = row.team_id ? ` — Winner: ${teamName(row.team_id)} — derived from standings` : '';
    return seasonName(row.season_id) + winner;
  }
  if (row.kind === 'gnl_participant' || row.kind === 'fantasy') {
    return row.season_id ? `${seasonName(row.season_id)} (kept after the season ends)` : 'Always the current season';
  }
  return null;
};

const canSave = computed(() => {
  const b = binding.value;
  if (!b?.kind || !b.discord_role) return false;
  if (b.kind === 'team') return b.team_id !== null;
  if (b.kind === 'champion') return b.season_id !== null;
  return true;
});

const fetchReport = async () => {
  isLoadingReport.value = true;
  try {
    report.value = await configStore.fetchDiscordRoleReport();
  } catch (error) {
    errorMessage.value = 'Failed to load the out-of-sync accounts: ' + error.message;
  } finally {
    isLoadingReport.value = false;
  }
};

const fetchAll = async () => {
  isLoading.value = true;
  errorMessage.value = null;
  // The report reads the guild, so the bindings render before it lands
  const pending = fetchReport();
  try {
    [bindings.value, teams.value, roleNames.value] = await Promise.all([
      configStore.fetchDiscordRoleBindings(),
      teamStore.getTeamsBasic(),
      configStore.fetchDiscordGuildRoles(),
      seasonStore.fetchSeasons()
    ]);
  } catch (error) {
    errorMessage.value = 'Failed to load the Discord roles: ' + error.message;
  } finally {
    isLoading.value = false;
  }
  await pending;
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
  binding.value = { kind: 'team', season_id: null, team_id: null, discord_role: '' };
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
    const { id, kind, season_id, team_id, discord_role } = binding.value;
    // Only the fields the kind uses go out; champion's team is derived, never stored
    const body = {
      kind,
      discord_role,
      season_id: ['gnl_participant', 'fantasy', 'champion'].includes(kind) ? season_id : null,
      team_id: kind === 'team' ? team_id : null
    };
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
