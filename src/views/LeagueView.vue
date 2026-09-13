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
        </div>
      </v-col>
    </v-row>

    <StatusAlert v-model="error" />

    <div v-if="auth.isAdmin" class="d-flex justify-end mb-4">
      <v-btn variant="elevated" color="primary" prepend-icon="mdi-plus" :to="`/events/new?league=${leagueId}`">New event</v-btn>
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
  </v-container>
</template>

<script setup>
import { computed, onMounted, ref } from 'vue';
import { useRoute } from 'vue-router';

import StatusAlert from '@/components/StatusAlert.vue';
import { dateRange, ENTRANT_KINDS, EVENT_KINDS, STATE_COLOR, STATE_LABEL, stateOf, titleOf } from '@/helpers/event-labels.mjs';
import { useAuthStore, useEventStore } from '@/stores';

const route = useRoute();
const auth = useAuthStore();
const store = useEventStore();
const leagueId = Number(route.params.id);
const league = ref(null);
const loading = ref(true);
const error = ref(null);

// The read answers every event of the league, drafts included, so a member is filtered out
const events = computed(() => (league.value?.events || []).filter((e) => auth.isAdmin || e.published !== false));

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

onMounted(load);
</script>
