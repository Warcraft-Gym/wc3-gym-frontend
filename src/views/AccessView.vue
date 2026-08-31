<template>
  <v-overlay v-model="isLoading" persistent contained class="align-center justify-center">
    <v-progress-circular indeterminate size="64" width="8" color="primary"></v-progress-circular>
  </v-overlay>

  <v-container fluid class="pa-4">
    <v-row class="mb-4">
      <v-col>
        <h1>
          <v-icon class="mr-2">mdi-shield-account</v-icon>
          Access
        </h1>
      </v-col>
    </v-row>

    <StatusAlert v-model="errorMessage" />

    <StatusAlert v-model="successMessage" type="success" />

    <v-card elevation="2">
      <v-card-title class="bg-primary d-flex align-center">
        <v-icon class="mr-2">mdi-account-key</v-icon>
        <span>Gym Admins</span>
      </v-card-title>

      <v-card-text class="pa-0">
        <v-data-table :headers="headers" :items="admins" :loading="isLoading" fixed-header hover>
          <template #top>
            <v-toolbar flat height="auto">
              <v-row align="center" class="flex-wrap ma-0 pa-2">
                <v-spacer />
                <v-col cols="12" sm="auto">
                  <v-btn variant="elevated" color="success" prepend-icon="mdi-plus" @click="openAdd" block>
                    Add Admin
                  </v-btn>
                </v-col>
              </v-row>
            </v-toolbar>
          </template>

          <template #[`item.granted_at`]="{ item }">
            {{ item.granted_at ? new Date(item.granted_at).toLocaleDateString() : '' }}
          </template>

          <template #[`item.source`]="{ item }">
            <v-chip :color="item.source === 'env' ? 'grey' : 'primary'" variant="tonal" size="small">
              {{ item.source === 'env' ? 'Environment' : 'App' }}
            </v-chip>
          </template>

          <template #[`item.actions`]="{ item }">
            <RowActions v-if="canRemove(item)" :actions="[
              { icon: 'mdi-delete', label: 'Remove Admin', color: 'error', onClick: () => openDeleteDialog(item) },
            ]" />
          </template>

          <template #no-data>
            <div class="text-center pa-8">
              <v-icon size="64" color="grey-lighten-1">mdi-account-off-outline</v-icon>
              <div class="text-h6 mt-4 text-grey">No admins granted yet</div>
            </div>
          </template>
        </v-data-table>
      </v-card-text>
    </v-card>

    <v-dialog v-model="addDialog" max-width="600" persistent>
      <v-card>
        <v-card-title class="bg-primary">
          <v-icon class="mr-2">mdi-plus-circle</v-icon>
          Add Admin
        </v-card-title>

        <v-alert v-if="dialogError" type="error" variant="tonal" border="start" border-color="red" class="mx-4 my-2" closable @click:close="dialogError = null">
          {{ dialogError }}
        </v-alert>

        <v-card-text class="pt-4">
          <v-combobox
            v-model="picked"
            :items="players"
            item-title="name"
            item-value="discordId"
            :return-object="false"
            label="User"
            hint="Pick a user or type a Discord ID"
            persistent-hint
            variant="outlined"
            density="comfortable"
            prepend-inner-icon="mdi-account-search"
          >
            <template #item="{ props: itemProps, item }">
              <v-list-item v-bind="itemProps" :subtitle="item.raw.discordTag || item.raw.discordId" />
            </template>
          </v-combobox>
        </v-card-text>

        <v-card-actions class="px-4 py-3">
          <v-spacer />
          <v-btn variant="text" @click="addDialog = false">Cancel</v-btn>
          <v-btn color="primary" variant="elevated" prepend-icon="mdi-check" @click="saveAdmin" :loading="isSaving" :disabled="!picked">
            Add Admin
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <ConfirmDeleteDialog
      v-model="showDeleteDialog"
      message="Remove this admin?"
      @confirm="confirmDelete"
      @cancel="showDeleteDialog = false"
    />
  </v-container>
</template>

<script setup>
import RowActions from '@/components/RowActions.vue';
import ConfirmDeleteDialog from '@/components/ConfirmDeleteDialog.vue';
import { useAuthStore, useConfigStore, usePlayerStore } from '@/stores';
import { onMounted, ref } from 'vue';
import { storeToRefs } from 'pinia';
import StatusAlert from '@/components/StatusAlert.vue';

const authStore = useAuthStore();
const configStore = useConfigStore();
const playerStore = usePlayerStore();
const { players } = storeToRefs(playerStore);

const admins = ref([]);
const isLoading = ref(false);
const isSaving = ref(false);
const errorMessage = ref(null);
const successMessage = ref(null);
const dialogError = ref(null);
const addDialog = ref(false);
const picked = ref(null);  // a discordId from the list, or a raw one typed in
const showDeleteDialog = ref(false);
const deleteRow = ref(null);

const headers = [
  { title: 'Name', value: 'name', sortable: true },
  { title: 'Discord ID', value: 'discord_id', sortable: true },
  { title: 'Granted', value: 'granted_at', sortable: true },
  { title: 'Source', value: 'source', sortable: true },
  { title: '', value: 'actions', align: 'end', sortable: false }
];

// env rows are granted outside the app, and an admin cannot remove themself
const canRemove = (row) => row.source === 'app' && row.discord_id !== authStore.me?.discord_id;

const fetchAll = async () => {
  isLoading.value = true;
  errorMessage.value = null;
  try {
    [admins.value] = await Promise.all([configStore.fetchAdmins(), playerStore.fetchPlayers()]);
  } catch (error) {
    errorMessage.value = 'Failed to load the admins: ' + error.message;
  } finally {
    isLoading.value = false;
  }
};

const openAdd = () => {
  picked.value = null;
  dialogError.value = null;
  addDialog.value = true;
};

const saveAdmin = async () => {
  dialogError.value = null;
  isSaving.value = true;
  try {
    const discord_id = String(picked.value).trim();
    const name = players.value.find(p => String(p.discordId) === discord_id)?.name;
    await configStore.addAdmin({ discord_id, name });
    admins.value = await configStore.fetchAdmins();
    addDialog.value = false;
    successMessage.value = 'Admin added.';
  } catch (error) {
    dialogError.value = 'Failed to add the admin: ' + error.message;
  } finally {
    isSaving.value = false;
  }
};

const openDeleteDialog = (row) => {
  deleteRow.value = row;
  showDeleteDialog.value = true;
};

const confirmDelete = async () => {
  showDeleteDialog.value = false;
  errorMessage.value = null;
  try {
    await configStore.removeAdmin(deleteRow.value.discord_id);
    admins.value = await configStore.fetchAdmins();
    successMessage.value = 'Admin removed.';
  } catch (error) {
    errorMessage.value = 'Failed to remove the admin: ' + error.message;
  }
};

onMounted(fetchAll);
</script>
