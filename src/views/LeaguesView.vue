<!-- Every league the app runs. A league is what repeats; its events are the runs
     players sign up for, and they live on the league's own page. -->
<template>
  <v-container fluid class="pa-4">
    <v-row class="mb-4">
      <v-col>
        <h1 class="text-h5 text-md-h3 font-weight-bold">
          <v-icon class="mr-2" size="large">mdi-shield-star</v-icon>
          Leagues
        </h1>
      </v-col>
    </v-row>

    <StatusAlert v-model="error" />

    <div v-if="auth.isAdmin" class="d-flex justify-end mb-4">
      <v-btn variant="elevated" color="primary" prepend-icon="mdi-plus" @click="openDialog">New league</v-btn>
    </div>

    <v-card elevation="2">
      <v-progress-linear v-if="loading" indeterminate />
      <v-table density="comfortable" hover>
        <thead>
          <tr>
            <th>League</th>
            <th class="d-none d-md-table-cell">Kind</th>
            <th class="d-none d-md-table-cell">Entrants</th>
            <th class="text-right">Events</th>
            <th class="d-none d-md-table-cell">Next event</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="row in rows" :key="row.league.id">
            <td class="py-3">
              <RouterLink :to="`/leagues/${row.league.id}`"><strong>{{ row.league.name }}</strong></RouterLink>
              <!-- a phone drops three columns, so their words ride under the name -->
              <div class="d-md-none text-caption text-medium-emphasis">
                {{ [titleOf(LEAGUE_KINDS, row.league.kind), titleOf(ENTRANT_KINDS, row.league.entrant_kind), row.next && `Next: ${row.next.name}`].filter(Boolean).join(' · ') }}
              </div>
            </td>
            <td class="d-none d-md-table-cell">{{ titleOf(LEAGUE_KINDS, row.league.kind) }}</td>
            <td class="d-none d-md-table-cell">{{ titleOf(ENTRANT_KINDS, row.league.entrant_kind) }}</td>
            <td class="text-right">{{ row.count }}</td>
            <td class="d-none d-md-table-cell">
              <RouterLink v-if="row.next" :to="`/events/${row.next.id}`">{{ row.next.name }}</RouterLink>
              <span v-else class="text-medium-emphasis">—</span>
            </td>
          </tr>
          <tr v-if="!rows.length && !loading">
            <td colspan="5" class="text-medium-emphasis py-6 text-center">
              No leagues yet. A league holds the events that repeat, like the GNL or KOTH.
            </td>
          </tr>
        </tbody>
      </v-table>
    </v-card>

    <v-dialog v-model="dialog" max-width="600">
      <v-card title="New league">
        <v-card-text>
          <StatusAlert v-model="formError" />
          <v-row dense>
            <v-col cols="12" md="8">
              <v-text-field v-model="form.name" label="Name" autofocus />
            </v-col>
            <v-col cols="12" md="4">
              <v-text-field v-model="form.short_name" label="Short name" />
            </v-col>
            <v-col cols="12" md="6">
              <v-select v-model="form.kind" :items="LEAGUE_KINDS" label="Kind" />
            </v-col>
            <v-col cols="12" md="6">
              <v-select v-model="form.entrant_kind" :items="ENTRANT_KINDS" label="Entrants" />
            </v-col>
            <v-col cols="12" md="4">
              <v-text-field v-model="form.page_url" label="Page link" placeholder="https://" />
            </v-col>
            <v-col cols="12" md="4">
              <v-text-field v-model="form.rules_url" label="Rules link" placeholder="https://" />
            </v-col>
            <v-col cols="12" md="4">
              <v-text-field v-model="form.stream_url" label="Stream link" placeholder="https://" />
            </v-col>
          </v-row>
        </v-card-text>
        <v-card-actions>
          <v-spacer />
          <v-btn variant="text" @click="dialog = false">Cancel</v-btn>
          <v-btn color="primary" variant="elevated" :loading="saving" :disabled="!form.name.trim()" @click="save">Create league</v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>
  </v-container>
</template>

<script setup>
import { computed, onMounted, ref } from 'vue';

import StatusAlert from '@/components/StatusAlert.vue';
import { ENTRANT_KINDS, LEAGUE_KINDS, leaguePayload, stateOf, titleOf } from '@/helpers/event-labels.mjs';
import { useAuthStore, useEventStore } from '@/stores';

const auth = useAuthStore();
const store = useEventStore();
const leagues = ref([]);
const events = ref([]);
const loading = ref(true);
const error = ref(null);
const dialog = ref(false);
const saving = ref(false);
const formError = ref(null);
const blank = () => ({ name: '', short_name: '', kind: 'custom', entrant_kind: 'solo', page_url: '', rules_url: '', stream_url: '' });
const form = ref(blank());

// The list read leaves a league's events empty, so the count and the next run come
// off the events list. The soonest run that has not finished is the next one.
const rows = computed(() => leagues.value.map((league) => {
  const mine = events.value.filter((event) => event.league_id === league.id);
  const next = [...mine]
    .filter((event) => stateOf(event) !== 'finished')
    .sort((a, b) => (a.start_date || '9999').localeCompare(b.start_date || '9999'))[0] || null;
  return { league, count: mine.length, next };
}));

const load = async () => {
  loading.value = true;
  try {
    [leagues.value, events.value] = await Promise.all([store.fetchLeagues(), store.fetchEvents()]);
  } catch (e) {
    error.value = `The leagues did not load: ${e.message}`;
  } finally {
    loading.value = false;
  }
};

const openDialog = () => {
  form.value = blank();
  formError.value = null;
  dialog.value = true;
};

const save = async () => {
  saving.value = true;
  formError.value = null;
  try {
    await store.createLeague(leaguePayload(form.value));
    dialog.value = false;
    await load();
  } catch (e) {
    formError.value = `The league was not created: ${e.message}`;
  } finally {
    saving.value = false;
  }
};

onMounted(load);
</script>
