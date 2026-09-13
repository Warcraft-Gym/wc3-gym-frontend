<!-- One league and the events it has run, newest first. An admin adds the next run
     here; the stages and the map pool are set on the event's own page. -->
<template>
  <v-container fluid class="pa-4">
    <v-row class="mb-4">
      <v-col>
        <h1 class="text-h5 text-md-h3 font-weight-bold">
          <v-icon class="mr-2" size="large">mdi-shield-star</v-icon>
          {{ league?.name || 'League' }}
        </h1>
        <div class="text-medium-emphasis mt-1">
          {{ titleOf(ENTRANT_KINDS, league?.entrant_kind) }}
          <a v-if="league?.page_url" class="ml-3" :href="league.page_url" target="_blank" rel="noopener noreferrer">Page</a>
          <a v-if="league?.rules_url" class="ml-3" :href="league.rules_url" target="_blank" rel="noopener noreferrer">Rules</a>
        </div>
      </v-col>
    </v-row>

    <StatusAlert v-model="error" />

    <div v-if="auth.isAdmin" class="d-flex justify-end mb-4">
      <v-btn variant="elevated" color="primary" prepend-icon="mdi-plus" @click="openDialog">New event</v-btn>
    </div>

    <v-card elevation="2">
      <v-progress-linear v-if="loading" indeterminate />
      <v-table density="comfortable" hover>
        <thead>
          <tr>
            <th>Event</th>
            <th class="d-none d-md-table-cell">Kind</th>
            <th class="d-none d-md-table-cell">Dates</th>
            <th>State</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="event in events" :key="event.id">
            <td class="py-3">
              <RouterLink :to="`/events/${event.id}`"><strong>{{ event.name }}</strong></RouterLink>
              <!-- a phone drops the two middle columns, so their words ride under the name -->
              <div class="d-md-none text-caption text-medium-emphasis">
                {{ [titleOf(EVENT_KINDS, event.kind), dateRange(event)].filter(Boolean).join(' · ') }}
              </div>
            </td>
            <td class="d-none d-md-table-cell">{{ titleOf(EVENT_KINDS, event.kind) }}</td>
            <td class="d-none d-md-table-cell text-no-wrap">{{ dateRange(event) || '—' }}</td>
            <td>
              <v-chip size="small" variant="tonal" :color="STATE_COLOR[stateOf(event)]">
                {{ STATE_LABEL[stateOf(event)] || '—' }}
              </v-chip>
            </td>
          </tr>
          <tr v-if="!events.length && !loading">
            <td colspan="4" class="text-medium-emphasis py-6 text-center">
              No events yet. An event is one run of this league that players sign up for.
            </td>
          </tr>
        </tbody>
      </v-table>
    </v-card>

    <v-dialog v-model="dialog" max-width="700">
      <v-card title="New event">
        <v-card-text>
          <StatusAlert v-model="formError" />
          <v-row dense>
            <v-col cols="12" md="8">
              <v-text-field v-model="form.name" label="Name" autofocus />
            </v-col>
            <v-col cols="12" md="4">
              <v-select v-model="form.kind" :items="EVENT_KINDS" label="Kind" />
            </v-col>
            <v-col cols="12" md="4">
              <SimpleDatePicker v-model="form.start_date" label="Start date" />
            </v-col>
            <v-col cols="12" md="4">
              <SimpleDatePicker v-model="form.end_date" label="End date" />
            </v-col>
            <v-col cols="12" md="4">
              <SimpleTimePicker v-model="form.start_time" label="Start time" />
            </v-col>
            <v-col cols="12">
              <v-textarea v-model="form.description" label="Description" rows="2" auto-grow />
            </v-col>
            <v-col cols="12" md="6">
              <v-text-field v-model="form.page_url" label="Page link" placeholder="https://" />
            </v-col>
            <v-col cols="12" md="6">
              <v-text-field v-model="form.stream_url" label="Stream link" placeholder="https://" />
            </v-col>
            <v-col cols="12">
              <v-switch v-model="form.checkin_enabled" color="primary" hide-details
                label="Ask entrants to check in before each round" />
            </v-col>
          </v-row>
        </v-card-text>
        <v-card-actions>
          <v-spacer />
          <v-btn variant="text" @click="dialog = false">Cancel</v-btn>
          <v-btn color="primary" variant="elevated" :loading="saving" :disabled="!form.name.trim()" @click="save">Create event</v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>
  </v-container>
</template>

<script setup>
import { computed, onMounted, ref } from 'vue';
import { useRoute } from 'vue-router';

import SimpleDatePicker from '@/components/SimpleDatePicker.vue';
import SimpleTimePicker from '@/components/SimpleTimePicker.vue';
import StatusAlert from '@/components/StatusAlert.vue';
import { dateRange, ENTRANT_KINDS, EVENT_KINDS, eventPayload, STATE_COLOR, STATE_LABEL, stateOf, titleOf } from '@/helpers/event-labels.mjs';
import { useAuthStore, useEventStore } from '@/stores';

const route = useRoute();
const auth = useAuthStore();
const store = useEventStore();
const leagueId = Number(route.params.id);
const league = ref(null);
const loading = ref(true);
const error = ref(null);
const dialog = ref(false);
const saving = ref(false);
const formError = ref(null);
const blank = () => ({
  league_id: leagueId,
  name: '',
  kind: 'cup',
  start_date: null,
  end_date: null,
  start_time: '',
  description: '',
  page_url: '',
  stream_url: '',
  checkin_enabled: true,
});
const form = ref(blank());

// The read answers the league's events newest first
const events = computed(() => league.value?.events || []);

const load = async () => {
  loading.value = true;
  try {
    league.value = await store.fetchLeague(leagueId);
  } catch (e) {
    error.value = `The league did not load: ${e.message}`;
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
    await store.createEvent(eventPayload(form.value));
    dialog.value = false;
    await load();
  } catch (e) {
    formError.value = `The event was not created: ${e.message}`;
  } finally {
    saving.value = false;
  }
};

onMounted(load);
</script>
