<!-- One league and the events it has run (#36): the phase of each, and the way to a new one. -->
<template>
  <v-container>
    <v-card elevation="2">
      <v-card-title class="bg-primary d-flex align-center flex-wrap ga-2">
        <v-icon class="mr-2">mdi-shield-star</v-icon>
        {{ league?.name || 'League' }}
        <v-chip v-if="league?.short_name" size="small" color="on-primary" variant="outlined">{{ league.short_name }}</v-chip>
        <v-spacer />
        <v-btn variant="tonal" color="on-primary" prepend-icon="mdi-plus" :to="`/events/new?league=${leagueId}`">New event</v-btn>
      </v-card-title>
      <v-card-text class="pa-0">
        <v-progress-linear v-if="loading" indeterminate />
        <StatusAlert v-model="error" class="ma-4" />
        <div v-if="league" class="px-4 pt-4 d-flex flex-wrap ga-4 align-center">
          <span class="text-medium-emphasis">{{ entrantKind }}</span>
          <a v-if="league.page_url" :href="league.page_url" target="_blank" rel="noopener">Page</a>
          <span v-if="next">Next: <RouterLink :to="`/events/${next.id}/admin`">{{ next.name }}</RouterLink> · {{ dateText(next.start_date) }}</span>
        </div>
        <v-table v-if="events.length" density="comfortable" class="mt-2">
          <thead>
            <tr>
              <th>Event</th>
              <th class="d-none d-md-table-cell">Kind</th>
              <th class="d-none d-md-table-cell">Starts</th>
              <th class="d-none d-md-table-cell">Ends</th>
              <th>Phase</th>
              <th class="d-none d-md-table-cell text-right">Entrants</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="event in events" :key="event.id" class="event-row" @click="$router.push(`/events/${event.id}/admin`)">
              <td class="py-3">
                <!-- the link carries the keyboard path the row click has not -->
                <RouterLink :to="`/events/${event.id}/admin`" class="text-high-emphasis" @click.stop><strong>{{ event.name }}</strong></RouterLink>
                <!-- a phone drops the date columns, so the start date rides under the name -->
                <div v-if="!mdAndUp" class="text-caption text-medium-emphasis">{{ kindTitle(event.kind) }} · {{ dateText(event.start_date) }}</div>
              </td>
              <td class="d-none d-md-table-cell">{{ kindTitle(event.kind) }}</td>
              <td class="d-none d-md-table-cell text-no-wrap">{{ dateText(event.start_date) }}</td>
              <td class="d-none d-md-table-cell text-no-wrap">{{ dateText(event.end_date) }}</td>
              <td>
                <v-chip size="small" variant="tonal" :color="PHASE_COLOR[event.phase]">{{ PHASE_LABEL[event.phase] || event.phase }}</v-chip>
              </td>
              <td class="d-none d-md-table-cell text-right">{{ event.entrant_count ?? '—' }}</td>
            </tr>
          </tbody>
        </v-table>
        <div v-else-if="!loading" class="text-center pa-8">
          <v-icon size="64" class="text-disabled">mdi-calendar-blank-outline</v-icon>
          <div class="text-h6 text-medium-emphasis mt-4 mb-2">No events yet</div>
          <p class="text-medium-emphasis mb-4">An event is one run of this league that players sign up for.</p>
          <v-btn color="primary" variant="elevated" prepend-icon="mdi-plus" :to="`/events/new?league=${leagueId}`">Create the first event</v-btn>
        </div>
      </v-card-text>
    </v-card>
  </v-container>
</template>

<script setup>
import { computed, onMounted, ref } from 'vue';
import { useRoute } from 'vue-router';
import { useDisplay } from 'vuetify';

import StatusAlert from '@/components/StatusAlert.vue';
import { dateText, ENTRANT_KINDS, EVENT_KINDS, PHASE_COLOR, PHASE_LABEL } from '@/helpers/events-admin.mjs';
import { useEventStore } from '@/stores';

const { mdAndUp } = useDisplay();
const route = useRoute();
const store = useEventStore();
const leagueId = Number(route.params.id);
const league = ref(null);
const events = ref([]);
const loading = ref(true);
const error = ref(null);

const entrantKind = computed(() => ENTRANT_KINDS.find((kind) => kind.value === league.value?.entrant_kind)?.title || '');
const kindTitle = (value) => EVENT_KINDS.find((kind) => kind.value === value)?.title || value;
// The soonest event that has not finished is the one an admin is working on
const next = computed(() => [...events.value]
  .filter((event) => event.phase !== 'finished')
  .sort((a, b) => (a.start_date || '9999').localeCompare(b.start_date || '9999'))[0] || null);

onMounted(async () => {
  try {
    const [leagues, rows] = await Promise.all([store.fetchLeagues(), store.fetchEvents(leagueId)]);
    league.value = (leagues || []).find((row) => row.id === leagueId) || null;
    events.value = rows || [];
  } catch (e) {
    error.value = `Failed to load the league: ${e.message}`;
  } finally {
    loading.value = false;
  }
});
</script>

<style scoped>
.event-row {
  cursor: pointer;
}
</style>
