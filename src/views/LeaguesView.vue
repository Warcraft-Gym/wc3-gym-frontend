<!-- Every league the app runs (#36). A league is what repeats; its events are the runs
     people sign up for, and they live on the league's own page. -->
<template>
  <v-container>
    <v-card elevation="2">
      <v-card-title class="bg-primary d-flex align-center">
        <v-icon class="mr-2">mdi-shield-star</v-icon>
        Leagues
        <v-spacer />
        <v-btn variant="tonal" color="on-primary" prepend-icon="mdi-plus" @click="openDialog">New league</v-btn>
      </v-card-title>
      <v-card-text class="pa-0">
        <v-progress-linear v-if="loading" indeterminate />
        <StatusAlert v-model="error" class="ma-4" />
        <v-table v-if="leagues.length" density="comfortable">
          <thead>
            <tr>
              <th>Name</th>
              <th class="d-none d-md-table-cell">Short name</th>
              <th class="d-none d-md-table-cell">Entrants</th>
              <th class="d-none d-md-table-cell">Page</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="league in leagues" :key="league.id" class="league-row" @click="$router.push(`/leagues/${league.id}`)">
              <td class="py-3">
                <!-- the link carries the keyboard path the row click has not -->
                <RouterLink :to="`/leagues/${league.id}`" class="text-high-emphasis" @click.stop><strong>{{ league.name }}</strong></RouterLink>
                <!-- a phone drops the last three columns, so their words ride under the name -->
                <div v-if="!mdAndUp" class="text-caption text-medium-emphasis">{{ [league.short_name, entrantKind(league.entrant_kind)].filter(Boolean).join(' · ') }}</div>
              </td>
              <td class="d-none d-md-table-cell">
                <v-chip v-if="league.short_name" size="small" label>{{ league.short_name }}</v-chip>
              </td>
              <td class="d-none d-md-table-cell">{{ entrantKind(league.entrant_kind) }}</td>
              <td class="d-none d-md-table-cell">
                <a v-if="league.page_url" :href="league.page_url" target="_blank" rel="noopener" @click.stop>Page</a>
                <span v-else class="text-medium-emphasis">—</span>
              </td>
            </tr>
          </tbody>
        </v-table>
        <div v-else-if="!loading" class="text-center pa-8">
          <v-icon size="64" class="text-disabled">mdi-shield-star-outline</v-icon>
          <div class="text-h6 text-medium-emphasis mt-4 mb-2">No leagues yet</div>
          <p class="text-medium-emphasis mb-4">A league holds the events that repeat, like the GNL or KOTH.</p>
          <v-btn color="primary" variant="elevated" prepend-icon="mdi-plus" @click="openDialog">Create the first league</v-btn>
        </div>
      </v-card-text>
    </v-card>

    <v-dialog v-model="dialog" max-width="600">
      <v-card>
        <v-card-title class="bg-primary">
          <v-icon class="mr-2">mdi-plus-circle</v-icon>
          New league
        </v-card-title>
        <v-card-text class="pt-4">
          <StatusAlert v-model="formError" />
          <v-row dense>
            <v-col cols="12" md="8">
              <v-text-field v-model="form.name" label="Name" variant="outlined" density="comfortable" autofocus />
            </v-col>
            <v-col cols="12" md="4">
              <v-text-field v-model="form.short_name" label="Short name" variant="outlined" density="comfortable" />
            </v-col>
            <v-col cols="12" md="6">
              <v-select v-model="form.entrant_kind" :items="ENTRANT_KINDS" label="Entrants" variant="outlined" density="comfortable" />
            </v-col>
            <v-col cols="12" md="6">
              <v-text-field v-model="form.page_url" label="Page link" placeholder="https://" variant="outlined" density="comfortable" />
            </v-col>
          </v-row>
        </v-card-text>
        <v-card-actions class="px-4 py-3">
          <v-spacer />
          <v-btn variant="text" @click="dialog = false">Cancel</v-btn>
          <v-btn color="primary" variant="elevated" :disabled="!form.name.trim() || saving" @click="save">Create league</v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>
  </v-container>
</template>

<script setup>
import { onMounted, ref } from 'vue';
import { useDisplay } from 'vuetify';

import StatusAlert from '@/components/StatusAlert.vue';
import { ENTRANT_KINDS } from '@/helpers/events-admin.mjs';
import { useEventStore } from '@/stores';

const { mdAndUp } = useDisplay();
const store = useEventStore();
const leagues = ref([]);
const loading = ref(true);
const error = ref(null);
const dialog = ref(false);
const saving = ref(false);
const formError = ref(null);
const form = ref({ name: '', short_name: '', entrant_kind: 'solo', page_url: '' });

const entrantKind = (value) => ENTRANT_KINDS.find((kind) => kind.value === value)?.title || value;

const load = async () => {
  loading.value = true;
  try {
    leagues.value = (await store.fetchLeagues()) || [];
  } catch (e) {
    error.value = `Failed to load the leagues: ${e.message}`;
  } finally {
    loading.value = false;
  }
};

const openDialog = () => {
  form.value = { name: '', short_name: '', entrant_kind: 'solo', page_url: '' };
  formError.value = null;
  dialog.value = true;
};

const save = async () => {
  saving.value = true;
  formError.value = null;
  try {
    await store.createLeague({ ...form.value, page_url: form.value.page_url.trim() || null });
    dialog.value = false;
    await load();
  } catch (e) {
    formError.value = `Failed to create the league: ${e.message}`;
  } finally {
    saving.value = false;
  }
};

onMounted(load);
</script>

<style scoped>
.league-row {
  cursor: pointer;
}
</style>
