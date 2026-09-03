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
          Managed roles are granted and removed by Sync. Ignored roles are bound but left alone. Not bound roles are never touched.
        </div>
        <div class="text-body-2 text-medium-emphasis">
          Drag a card to a column, or double-click it to move it: Not bound to Managed, Managed to Ignored, Ignored to Managed. Hide a Not bound role the app must never touch.
        </div>
      </v-col>
    </v-row>

    <StatusAlert v-model="errorMessage" />

    <StatusAlert v-model="successMessage" type="success" />

    <v-alert v-if="!guildRoles.length" type="warning" variant="tonal" border="start" class="mb-4">
      The bot could not read the server's roles. Bindings are shown by id.
    </v-alert>

    <!-- One card per Discord role, in the column its binding puts it in -->
    <v-row>
      <v-col v-for="column in COLUMNS" :key="column.key" cols="12" md="4">
        <v-card elevation="2" class="role-column d-flex flex-column">
          <v-card-title class="d-flex align-center">
            <v-icon class="mr-2">{{ column.icon }}</v-icon>
            <span>{{ column.label }}</span>
            <v-spacer />
            <v-chip size="small" variant="tonal">{{ cards[column.key].length }}</v-chip>
          </v-card-title>

          <v-card-text
            class="drop-zone pa-2"
            :class="{ 'drop-over': dragOverColumn === column.key }"
            @dragover.prevent
            @dragenter.prevent="dragOverColumn = column.key"
            @dragleave="clearDragOver"
            @drop.prevent="dropOn(column.key)"
          >
            <div v-if="!cards[column.key].length" class="text-body-2 text-medium-emphasis text-center pa-4">
              {{ column.empty }}
            </div>

            <v-card
              v-for="card in cards[column.key]"
              :key="card.id"
              variant="outlined"
              class="mb-2 role-card"
              :class="{ 'role-locked': !card.manageable }"
              :draggable="card.manageable && !card.handManaged"
              @dragstart="dragRoleId = card.id"
              @dragend="dragRoleId = null; dragOverColumn = null"
              @dblclick="moveOnDoubleClick(card)"
            >
              <v-tooltip v-if="!card.manageable" activator="parent" location="top">
                Above the bot in Discord; it cannot be bound
              </v-tooltip>

              <v-card-text class="pa-3">
                <div class="d-flex align-center">
                  <span class="colour-dot mr-2" :style="{ backgroundColor: card.dot }"></span>
                  <span :class="{ 'text-medium-emphasis font-italic': !card.named }" :title="card.id">{{ card.name }}</span>
                  <v-spacer />
                  <v-chip v-if="card.named" size="x-small" variant="tonal">{{ card.members }} in Discord</v-chip>
                </div>

                <div v-if="card.binding" class="d-flex align-center text-body-2 text-medium-emphasis mt-1">
                  <v-icon v-if="card.handManaged" size="small" class="mr-1">mdi-lock</v-icon>
                  <v-avatar v-if="card.groupTeam" size="20" rounded="sm" class="mr-1" style="flex-shrink:0">
                    <img class="team-icon" :src="teamImageUrl(card.groupTeam)" @error="showDefaultTeamImage">
                  </v-avatar>
                  <span>{{ card.groupLabel }}</span>
                </div>

                <div v-if="card.binding && (card.grants || card.removes)" class="d-flex align-center mt-1">
                  <v-chip v-if="card.grants" size="x-small" color="success" variant="tonal" class="mr-1">+{{ card.grants }}</v-chip>
                  <v-chip v-if="card.removes" size="x-small" color="error" variant="tonal" class="mr-1">&minus;{{ card.removes }}</v-chip>
                  <span class="text-caption text-medium-emphasis">grant / remove on sync</span>
                </div>

                <RowActions :actions="cardActions(card)" inline />
              </v-card-text>
            </v-card>
          </v-card-text>

          <!-- The roles an admin hid, folded away under the Not bound column -->
          <v-expansion-panels v-if="column.key === 'notBound' && hiddenRoles.length" variant="accordion" flat>
            <v-expansion-panel :title="`Hidden roles (${hiddenRoles.length})`">
              <v-expansion-panel-text>
                <div v-for="role in hiddenRoles" :key="role.id" class="d-flex align-center mb-2">
                  <span class="colour-dot mr-2" :style="{ backgroundColor: roleDot(role) }"></span>
                  <span :title="role.id">{{ role.name }}</span>
                  <v-spacer />
                  <v-chip size="x-small" variant="tonal" class="mr-1">{{ role.members }} in Discord</v-chip>
                  <RowActions :actions="[{ icon: 'mdi-eye', label: 'Unhide', onClick: () => setHidden(role, false) }]" inline />
                </div>
              </v-expansion-panel-text>
            </v-expansion-panel>
          </v-expansion-panels>
        </v-card>
      </v-col>
    </v-row>

    <!-- What the guild has and the database says it should have -->
    <v-card elevation="2" class="mt-4">
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

    <!-- The group picker: which people in the database hold this role -->
    <v-dialog v-model="pickerDialog" max-width="640" persistent>
      <v-card v-if="picker">
        <v-card-title class="bg-primary">
          <v-icon class="mr-2">mdi-account-group</v-icon>
          Who holds {{ picker.roleName }}?
        </v-card-title>

        <v-alert v-if="dialogError" type="error" variant="tonal" border="start" border-color="red" class="mx-4 my-2" closable @click:close="dialogError = null">
          {{ dialogError }}
        </v-alert>

        <v-card-text class="pt-4">
          <v-list density="compact" :disabled="isLoadingGroups">
            <v-list-subheader>{{ listScopeLabel }}</v-list-subheader>
            <v-list-item
              v-for="group in seasonGroups"
              :key="groupKey(group)"
              :active="groupKey(group) === groupKey(picker)"
              @click="selectGroup(group)"
            >
              <v-list-item-title>{{ group.label }}</v-list-item-title>
              <template #append>
                <v-chip size="x-small" variant="tonal">{{ group.count }}</v-chip>
              </template>
            </v-list-item>

            <v-list-subheader>Teams</v-list-subheader>
            <v-list-item
              v-for="group in teamGroups"
              :key="groupKey(group)"
              :active="groupKey(group) === groupKey(picker)"
              @click="selectGroup(group)"
            >
              <template #prepend>
                <v-avatar size="24" rounded="sm" style="flex-shrink:0">
                  <img class="team-icon" :src="teamImageUrl(teamById(group.team_id) ?? group.team_id)" @error="showDefaultTeamImage">
                </v-avatar>
              </template>
              <v-list-item-title class="ml-2">{{ teamName(group.team_id) }}</v-list-item-title>
              <template #append>
                <v-chip size="x-small" variant="tonal">{{ group.count }}</v-chip>
              </template>
            </v-list-item>
          </v-list>

          <!-- One scope control under the list, in the shape the picked group's kind needs -->
          <template v-if="picker.kind">
            <v-radio-group v-if="scopeOptions.length > 1" v-model="picker.scope" density="compact" hide-details @update:model-value="loadGroups">
              <template v-for="option in scopeOptions" :key="option">
                <div v-if="option === 'season'" class="d-flex align-center ga-3">
                  <v-radio value="season" color="primary" label="One season"></v-radio>
                  <v-select
                    v-model="picker.seasonId"
                    :items="seasons"
                    item-title="name"
                    item-value="id"
                    variant="outlined"
                    density="compact"
                    hide-details
                    style="max-width:220px"
                    :disabled="picker.scope !== 'season'"
                    :loading="isLoadingGroups"
                    @update:model-value="loadGroups"
                  />
                </div>
                <v-radio
                  v-else
                  :value="option"
                  color="primary"
                  :label="option === 'all' ? 'All seasons' : `Current season (${seasonName(currentSeasonId)})`"
                ></v-radio>
              </template>
            </v-radio-group>
            <div v-else-if="picker.kind === 'champion'" class="d-flex align-center ga-3 mt-2">
              <span class="text-body-2">One season</span>
              <v-select
                v-model="picker.seasonId"
                :items="seasons"
                item-title="name"
                item-value="id"
                variant="outlined"
                density="compact"
                hide-details
                style="max-width:220px"
                :loading="isLoadingGroups"
                @update:model-value="loadGroups"
              />
            </div>
            <div class="text-caption text-medium-emphasis mt-2">{{ scopeCaption }}</div>
          </template>
        </v-card-text>

        <v-card-actions class="px-4 py-3">
          <v-spacer />
          <v-btn variant="text" @click="pickerDialog = false">Cancel</v-btn>
          <v-btn color="primary" variant="elevated" prepend-icon="mdi-check" @click="saveBinding" :loading="isSavingBinding" :disabled="!picker.kind">
            {{ picker.bindingId ? 'Save' : 'Bind' }}
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <ConfirmDeleteDialog
      v-model="showDeleteDialog"
      message="Unbind this role? Members keep it; the app stops managing it."
      @confirm="confirmDelete"
      @cancel="showDeleteDialog = false"
    />
  </v-container>
</template>

<script setup>
import RowActions from '@/components/RowActions.vue';
import ConfirmDeleteDialog from '@/components/ConfirmDeleteDialog.vue';
import StatusAlert from '@/components/StatusAlert.vue';
import { useConfigStore, useSeasonStore, useTeamStore } from '@/stores';
import { computed, onMounted, ref } from 'vue';
import { storeToRefs } from 'pinia';
import { teamImageUrl, showDefaultTeamImage } from '@/helpers/team-image';
import { resolveCurrentSeasonId } from '@/helpers/current-season';

const configStore = useConfigStore();
const seasonStore = useSeasonStore();
const teamStore = useTeamStore();
const { seasons } = storeToRefs(seasonStore);

const COLUMNS = [
  { key: 'managed', label: 'Managed', icon: 'mdi-sync', empty: 'Drag a role here to have Sync grant and remove it.' },
  { key: 'ignored', label: 'Ignored', icon: 'mdi-hand-back-right', empty: 'Bound roles Sync leaves alone.' },
  { key: 'notBound', label: 'Not bound', icon: 'mdi-link-variant-off', empty: 'Every server role is bound.' }
];
// The scopes each kind offers, the first one the default for a new binding
const SCOPES = {
  team: ['all', 'current', 'season'],
  captain: ['all', 'current', 'season'],
  gnl_participant: ['current', 'season', 'all'],
  fantasy: ['current', 'season', 'all'],
  champion: ['season'],
  admin: ['current']
};
const KIND_LABEL = { team: 'Team', captain: 'Captains', gnl_participant: 'Players', fantasy: 'Bettors', champion: 'Champions', admin: 'Gym Admin' };

const guildRoles = ref([]);
const bindings = ref([]);
const groups = ref([]);
const report = ref([]);
const teams = ref([]);
const isLoading = ref(false);
const isLoadingReport = ref(false);
const isLoadingGroups = ref(false);
const isSyncingAll = ref(false);
const syncingUserId = ref(null);
const applyingRoleId = ref(null);
const isSavingBinding = ref(false);
const errorMessage = ref(null);
const successMessage = ref(null);
const dialogError = ref(null);
const pickerDialog = ref(false);
const picker = ref(null);
const currentSeasonId = ref(null);
const showDeleteDialog = ref(false);
const deleteBinding = ref(null);
const dragRoleId = ref(null);
const dragOverColumn = ref(null);

const isSyncing = computed(() => isSyncingAll.value || syncingUserId.value !== null);

const reportHeader = [
  { title: 'Name', value: 'name', sortable: true },
  { title: 'Discord ID', value: 'discord_id', sortable: true },
  { title: 'Missing', value: 'missing', sortable: false },
  { title: 'Extra', value: 'extra', sortable: false },
  { title: '', value: 'actions', align: 'end', sortable: false }
];

const seasonName = (id) => seasons.value.find(s => s.id === id)?.name ?? `Season ${id}`;
const teamById = (id) => teams.value.find(t => t.id === id);
const teamName = (id) => {
  const team = teamById(id);
  return team ? team.long_name || team.name : `Team ${id}`;
};
const guildRole = (id) => guildRoles.value.find(r => r.id === id);
const bindingFor = (id) => bindings.value.find(b => b.discord_role === id);
const roleName = (id) => guildRole(id)?.name ?? id;
const roleDot = (role) => (role.color ? (role.color.startsWith('#') ? role.color : `#${role.color}`) : '#9e9e9e');
// Within one season a group is unique by kind and team, so a binding that follows the current season still matches
const groupKey = (group) => `${group.kind}:${group.team_id ?? ''}`;

const scopeOptions = computed(() => SCOPES[picker.value?.kind] ?? []);
// The scope and season the group counts follow: what the control under the list names, the current season before a kind is picked
const listScope = computed(() => picker.value?.scope ?? 'current');
const listSeasonId = computed(() => picker.value?.seasonId ?? currentSeasonId.value);
const listScopeLabel = computed(() => (listScope.value === 'season' ? seasonName(listSeasonId.value) : listScope.value === 'all' ? 'All seasons' : `Current season (${seasonName(currentSeasonId.value)})`));
// One sentence for the picked scope; an admin binding is hand-managed and names no season
const scopeCaption = computed(() => {
  if (picker.value?.kind === 'admin') return 'Follows the current season.';
  if (listScope.value === 'season') return `Holders keep the role after ${seasonName(listSeasonId.value)} ends.`;
  if (listScope.value === 'all') return 'Anyone who ever earned it keeps the role.';
  return 'The role moves to the new holders when the current season changes.';
});

const seasonGroups = computed(() => groups.value.filter(g => g.kind !== 'team'));
const teamGroups = computed(() => groups.value.filter(g => g.kind === 'team'));

const scopeWords = (row) => (row.scope === 'season' ? seasonName(row.season_id) : row.scope === 'all' ? 'all seasons' : 'current season');

// The line naming the people a binding covers
const groupLabel = (row) => {
  if (row.kind === 'admin') return 'Hand-managed in Discord';
  if (row.kind === 'team') return `${teamName(row.team_id)} · ${scopeWords(row)}`;
  if (row.kind === 'champion') {
    const winner = row.team_id ? ` (winner: ${teamName(row.team_id)})` : '';
    return `Champions · ${scopeWords(row)}${winner}`;
  }
  return `${KIND_LABEL[row.kind] ?? row.kind} · ${scopeWords(row)}`;
};

// One card per Discord role, plus a card for a binding whose role the guild no longer names
const allCards = computed(() => {
  const known = guildRoles.value.map(role => ({ ...role, named: true }));
  const unnamed = bindings.value
    .filter(b => !guildRole(b.discord_role))
    .map(b => ({ id: b.discord_role, name: b.discord_role, color: null, members: 0, manageable: true, named: false }));
  return [...known, ...unnamed].map(role => {
    const binding = bindingFor(role.id);
    return {
      ...role,
      binding,
      handManaged: binding?.kind === 'admin',
      dot: roleDot(role),
      groupLabel: binding ? groupLabel(binding) : null,
      groupTeam: binding?.kind === 'team' ? (teamById(binding.team_id) ?? binding.team_id) : null,
      grants: report.value.filter(r => r.missing.includes(role.id)).length,
      removes: report.value.filter(r => r.extra.includes(role.id)).length
    };
  });
});

const columnOf = (card) => (card.binding ? (card.binding.synced ? 'managed' : 'ignored') : 'notBound');

const cards = computed(() => ({
  managed: allCards.value.filter(c => columnOf(c) === 'managed'),
  ignored: allCards.value.filter(c => columnOf(c) === 'ignored'),
  notBound: allCards.value.filter(c => columnOf(c) === 'notBound' && !c.hidden)
}));

// The roles an admin hid, listed under the Not bound column
const hiddenRoles = computed(() => guildRoles.value.filter(r => r.hidden));

const cardActions = (card) => {
  if (!card.manageable) return [];
  // An admin binding never moves; sync does not read it
  if (card.handManaged) return [{ icon: 'mdi-link-off', label: 'Unbind', color: 'error', onClick: () => openDeleteDialog(card.binding) }];
  if (!card.binding) return [
    { icon: 'mdi-link-variant', label: 'Bind', onClick: () => openPicker(card, 'ignored') },
    { icon: 'mdi-eye-off', label: 'Hide: the app never shows or touches this role', onClick: () => setHidden(card, true) }
  ];

  const edit = { icon: 'mdi-pencil', label: 'Edit', onClick: () => openPicker(card, columnOf(card)) };
  const unbind = { icon: 'mdi-link-off', label: 'Unbind', color: 'error', onClick: () => openDeleteDialog(card.binding) };
  if (card.binding.synced) {
    return [
      { icon: 'mdi-sync', label: 'Apply', loading: applyingRoleId.value === card.id, onClick: () => applyRole(card) },
      { icon: 'mdi-hand-back-right', label: 'Ignore', onClick: () => setSynced(card.binding, false) },
      edit,
      unbind
    ];
  }
  return [{ icon: 'mdi-check-decagram', label: 'Manage', onClick: () => setSynced(card.binding, true) }, edit, unbind];
};

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
  // The report reads the guild, so the cards render before it lands
  const pending = fetchReport();
  try {
    [bindings.value, teams.value, guildRoles.value] = await Promise.all([
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
    await fetchReport();
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
    await configStore.syncDiscordRoles({ user_ids: [row.user_id] });
    await fetchReport();
    successMessage.value = `Synced ${row.name}.`;
  } catch (error) {
    errorMessage.value = `Failed to sync ${row.name}: ` + error.message;
  } finally {
    syncingUserId.value = null;
  }
};

// Apply grants and removes one role at a time
const applyRole = async (card) => {
  applyingRoleId.value = card.id;
  errorMessage.value = null;
  successMessage.value = null;
  try {
    const applied = await configStore.syncDiscordRoles({ role_ids: [card.id] });
    await fetchReport();
    successMessage.value = `Applied ${card.name} to ${applied.length} account(s).`;
  } catch (error) {
    errorMessage.value = `Failed to apply ${card.name}: ` + error.message;
  } finally {
    applyingRoleId.value = null;
  }
};

// The card moves at once; the report, which reads the guild, refreshes behind it
const setSynced = async (row, synced) => {
  errorMessage.value = null;
  successMessage.value = null;
  const before = row.synced;
  row.synced = synced;
  try {
    await configStore.updateDiscordRoleBinding(row.id, { synced });
    successMessage.value = synced ? 'Sync now manages this role.' : 'Sync now leaves this role alone.';
    fetchReport();
  } catch (error) {
    row.synced = before;
    errorMessage.value = 'Failed to move the role: ' + error.message;
  }
};

// The role leaves or rejoins the Not bound column at once; the call follows it
const setHidden = async (role, hidden) => {
  const row = guildRole(role.id);
  if (!row) return;
  errorMessage.value = null;
  successMessage.value = null;
  row.hidden = hidden;
  try {
    if (hidden) await configStore.hideDiscordRole(row.id);
    else await configStore.unhideDiscordRole(row.id);
    successMessage.value = hidden ? 'The app now leaves this role alone.' : 'Role unhidden.';
  } catch (error) {
    row.hidden = !hidden;
    errorMessage.value = `Failed to ${hidden ? 'hide' : 'unhide'} the role: ` + error.message;
  }
};

const loadGroups = async () => {
  isLoadingGroups.value = true;
  dialogError.value = null;
  try {
    groups.value = await configStore.fetchDiscordRoleGroups({ season_id: listSeasonId.value, scope: listScope.value });
  } catch (error) {
    dialogError.value = 'Failed to load the groups: ' + error.message;
  } finally {
    isLoadingGroups.value = false;
  }
};

const selectGroup = async (group) => {
  const before = `${listScope.value}:${listSeasonId.value}`;
  picker.value.kind = group.kind;
  picker.value.team_id = group.team_id ?? null;
  if (!scopeOptions.value.includes(picker.value.scope)) picker.value.scope = scopeOptions.value[0];
  if (`${listScope.value}:${listSeasonId.value}` !== before) await loadGroups();
};

// column is where the role lands: managed posts synced true, ignored posts synced false
const openPicker = async (card, column) => {
  const row = card.binding;
  dialogError.value = null;
  if (!currentSeasonId.value) currentSeasonId.value = await resolveCurrentSeasonId();
  picker.value = {
    roleName: card.name,
    discord_role: card.id,
    bindingId: row?.id ?? null,
    column,
    kind: row?.kind ?? null,
    team_id: row?.team_id ?? null,
    seasonId: row?.season_id ?? currentSeasonId.value,
    scope: row?.scope ?? null
  };
  pickerDialog.value = true;
  await loadGroups();
};

const saveBinding = async () => {
  dialogError.value = null;
  isSavingBinding.value = true;
  try {
    const { kind, team_id, scope, seasonId, discord_role, bindingId, column } = picker.value;
    const body = { kind, team_id, scope, season_id: scope === 'season' ? seasonId : null, discord_role };
    if (bindingId) {
      const saved = await configStore.updateDiscordRoleBinding(bindingId, body);
      bindings.value = bindings.value.map(b => (b.id === bindingId ? saved : b));
    } else {
      bindings.value = [...bindings.value, await configStore.createDiscordRoleBinding({ ...body, synced: column === 'managed' })];
    }
    pickerDialog.value = false;
    successMessage.value = 'Binding saved.';
    fetchReport();
  } catch (error) {
    dialogError.value = 'Failed to save the binding: ' + error.message;
  } finally {
    isSavingBinding.value = false;
  }
};

const openDeleteDialog = (row) => {
  deleteBinding.value = row;
  showDeleteDialog.value = true;
};

const confirmDelete = async () => {
  showDeleteDialog.value = false;
  errorMessage.value = null;
  successMessage.value = null;
  try {
    await configStore.deleteDiscordRoleBinding(deleteBinding.value.id);
    bindings.value = bindings.value.filter(b => b.id !== deleteBinding.value.id);
    successMessage.value = 'Role unbound.';
    fetchReport();
  } catch (error) {
    errorMessage.value = 'Failed to unbind the role: ' + error.message;
  }
};

// dragleave also fires when the pointer crosses a card inside the zone, so the highlight clears only when it leaves the zone itself
const clearDragOver = (event) => {
  if (!event.currentTarget.contains(event.relatedTarget)) dragOverColumn.value = null;
};

// Double-click moves a card one column: a bound role swaps between Managed and Ignored, an unbound one opens the picker for Managed
const moveOnDoubleClick = (card) => {
  if (!card.manageable || card.handManaged) return;
  if (!card.binding) return openPicker(card, 'managed');
  return setSynced(card.binding, !card.binding.synced);
};

// A drop does what the matching button does: bind, move between columns, or unbind
const dropOn = (column) => {
  const card = allCards.value.find(c => c.id === dragRoleId.value);
  dragOverColumn.value = null;
  dragRoleId.value = null;
  if (!card || !card.manageable || card.handManaged || columnOf(card) === column) return;
  if (column === 'notBound') return openDeleteDialog(card.binding);
  if (!card.binding) return openPicker(card, column);
  return setSynced(card.binding, column === 'managed');
};

onMounted(fetchAll);
</script>

<style scoped>
/* The three columns share one viewport-tied height, so their headers stay aligned and each list scrolls on its own */
.role-column {
  height: calc(100vh - 320px);
  min-height: 360px;
}
/* The zone fills the rest of the column card, so a drop below the last card still lands */
.drop-zone {
  flex: 1 1 auto;
  overflow-y: auto;
  border: 2px dashed transparent;
  border-radius: 4px;
}
.drop-over {
  border-color: rgb(var(--v-theme-primary));
  background: rgba(var(--v-theme-primary), 0.08);
}
/* The card is the only drag source: selecting its text or grabbing its team icon would start something else */
.role-card {
  cursor: grab;
  user-select: none;
}
.role-card img {
  pointer-events: none;
}
.role-locked {
  cursor: not-allowed;
  opacity: 0.5;
}
.team-icon {
  width: 100%;
  height: 100%;
  object-fit: contain;
}
.colour-dot {
  width: 12px;
  height: 12px;
  border-radius: 50%;
  display: inline-block;
  flex: none;
}
</style>
