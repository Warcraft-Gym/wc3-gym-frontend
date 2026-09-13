<!-- One event: what it is, how it plays and who is in it. A GNL season keeps its own
     pages, so this one links to them rather than redrawing them. -->
<template>
  <v-container fluid class="pa-4">
    <StatusAlert v-model="error" />
    <v-progress-linear v-if="loading" indeterminate />

    <template v-if="event">
      <EventHeader :event="event" :league="league" />
      <p v-if="event.description" class="mt-3 mb-0 description">{{ event.description }}</p>

      <div class="d-flex flex-wrap align-center ga-3 mt-4">
        <v-chip size="small" variant="tonal" prepend-icon="mdi-account-multiple">
          {{ event.entrant_count ?? 0 }} entrants
        </v-chip>
        <v-btn variant="outlined" color="primary" size="small"
          prepend-icon="mdi-account-multiple" :to="`/events/${event.id}/entrants`">
          Entrants
        </v-btn>
        <v-btn v-if="event.kind === 'gnl'" variant="outlined" color="primary" size="small"
          prepend-icon="mdi-trophy-outline" :to="`/seasons/${seasonSlug(event)}`">
          Season page
        </v-btn>
      </div>

      <v-card elevation="2" class="mt-4">
        <v-card-title>Stages</v-card-title>
        <v-table density="comfortable">
          <thead>
            <tr>
              <th style="width: 56px">#</th>
              <th>Stage</th>
              <th class="d-none d-md-table-cell">Format</th>
              <th class="text-right">Best of</th>
              <th class="d-none d-md-table-cell">Scheduling</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="stage in stages" :key="stage.position">
              <td>{{ stage.position }}</td>
              <td class="py-3">
                {{ stage.name || `Stage ${stage.position}` }}
                <!-- a phone drops the format and the scheduling columns, so they ride under the name -->
                <div class="d-md-none text-caption text-medium-emphasis">
                  {{ [titleOf(FORMATS, stage.format), titleOf(SCHEDULING_MODES, stage.scheduling_mode)].join(' · ') }}
                </div>
              </td>
              <td class="d-none d-md-table-cell">{{ titleOf(FORMATS, stage.format) }}</td>
              <td class="text-right">{{ stage.best_of }}</td>
              <td class="d-none d-md-table-cell">{{ titleOf(SCHEDULING_MODES, stage.scheduling_mode) }}</td>
            </tr>
            <tr v-if="!stages.length">
              <td colspan="5" class="text-medium-emphasis py-6 text-center">No stage is set yet.</td>
            </tr>
          </tbody>
        </v-table>
      </v-card>
    </template>
  </v-container>
</template>

<script setup>
import { computed, onMounted, ref } from 'vue';
import { useRoute } from 'vue-router';

import EventHeader from '@/components/EventHeader.vue';
import StatusAlert from '@/components/StatusAlert.vue';
import { FORMATS, SCHEDULING_MODES, titleOf } from '@/helpers/event-labels.mjs';
import { seasonSlug } from '@/helpers/season-slug.mjs';
import { useEventStore } from '@/stores';

const route = useRoute();
const store = useEventStore();
const event = ref(null);
const leagues = ref([]);
const loading = ref(true);
// the wizard lands here when the event was written but its divisions were not
const error = ref(route.query.divisions === 'unsaved'
  ? 'The event was created, but its divisions were not saved.' : null);

const league = computed(() => leagues.value.find((row) => row.id === event.value?.league_id) || null);
const stages = computed(() => [...(event.value?.stages || [])].sort((a, b) => a.position - b.position));

onMounted(async () => {
  try {
    [event.value, leagues.value] = await Promise.all([
      store.fetchEvent(route.params.id),
      store.fetchLeagues(),
    ]);
  } catch (e) {
    error.value = `The event did not load: ${e.message}`;
  } finally {
    loading.value = false;
  }
});
</script>

<style scoped>
.description {
  max-width: 70ch;
  white-space: pre-line;
}
</style>
