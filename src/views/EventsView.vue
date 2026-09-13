<!-- Every event of every league, the newest first. GET /events answers the published
     runs only, so a draft reaches nobody here; the league page lists an admin's drafts. -->
<template>
  <v-container fluid class="pa-4">
    <v-row class="mb-4">
      <v-col>
        <h1 class="text-h5 text-md-h3 font-weight-bold">
          <v-icon class="mr-2" size="large">mdi-calendar-star</v-icon>
          Events
        </h1>
      </v-col>
    </v-row>

    <StatusAlert v-model="error" />

    <v-row dense class="mb-2">
      <v-col cols="12" md="4">
        <v-select v-model="leagueId" :items="leagueItems" label="League" density="comfortable" clearable hide-details />
      </v-col>
      <v-col cols="12" md="4">
        <v-select v-model="state" :items="STATE_ITEMS" label="State" density="comfortable" clearable hide-details />
      </v-col>
    </v-row>

    <v-card elevation="2">
      <v-progress-linear v-if="loading" indeterminate />
      <v-table density="comfortable" hover>
        <thead>
          <tr>
            <th>Event</th>
            <th class="d-none d-md-table-cell">League</th>
            <th class="d-none d-md-table-cell">Kind</th>
            <th class="d-none d-md-table-cell">Dates</th>
            <th>State</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="event in rows" :key="event.id">
            <td class="py-3">
              <RouterLink :to="`/events/${event.id}`"><strong>{{ event.name }}</strong></RouterLink>
              <!-- a phone drops the three middle columns, so their words ride under the name -->
              <div class="d-md-none text-caption text-medium-emphasis">
                {{ [leagueName(event), titleOf(EVENT_KINDS, event.kind), dateRange(event)].filter(Boolean).join(' · ') }}
              </div>
            </td>
            <td class="d-none d-md-table-cell">{{ leagueName(event) || '—' }}</td>
            <td class="d-none d-md-table-cell">{{ titleOf(EVENT_KINDS, event.kind) }}</td>
            <td class="d-none d-md-table-cell text-no-wrap">{{ dateRange(event) || '—' }}</td>
            <td>
              <v-chip size="small" variant="tonal" :color="STATE_COLOR[stateOf(event)]">
                {{ STATE_LABEL[stateOf(event)] || '—' }}
              </v-chip>
            </td>
          </tr>
          <tr v-if="!rows.length && !loading">
            <td colspan="5" class="text-medium-emphasis py-6 text-center">No event matches these filters.</td>
          </tr>
        </tbody>
      </v-table>
    </v-card>
  </v-container>
</template>

<script setup>
import { computed, onMounted, ref } from 'vue';

import StatusAlert from '@/components/StatusAlert.vue';
import { dateRange, EVENT_KINDS, STATE_COLOR, STATE_ITEMS, STATE_LABEL, stateOf, titleOf } from '@/helpers/event-labels.mjs';
import { useEventStore } from '@/stores';

const store = useEventStore();
const leagues = ref([]);
const events = ref([]);
const loading = ref(true);
const error = ref(null);
const leagueId = ref(null);
const state = ref(null);

const leagueItems = computed(() => leagues.value.map((league) => ({ value: league.id, title: league.name })));
const leagueName = (event) => leagues.value.find((league) => league.id === event.league_id)?.name || '';

// The read is published-only; the guard holds if that ever changes. The newest run reads first
const rows = computed(() => events.value
  .filter((event) => event.published !== false)
  .filter((event) => !leagueId.value || event.league_id === leagueId.value)
  .filter((event) => !state.value || stateOf(event) === state.value)
  .slice()
  .sort((a, b) => b.id - a.id));

onMounted(async () => {
  try {
    [leagues.value, events.value] = await Promise.all([store.fetchLeagues(), store.fetchEvents()]);
  } catch (e) {
    error.value = `The events did not load: ${e.message}`;
  } finally {
    loading.value = false;
  }
});
</script>
