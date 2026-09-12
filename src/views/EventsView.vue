<!-- Every event a member can follow (#36), grouped by the phase it is in, with what the
     caller may do about each: sign up, or read that he already has. -->
<template>
  <v-container>
    <h1 class="text-h5 mb-4">Events</h1>
    <StatusAlert v-model="error" />
    <v-progress-linear v-if="loading" indeterminate />

    <v-card v-if="!loading" elevation="2">
      <GroupedTable :columns="columns" :groups="groups" default-open empty="No events yet. An admin opens the next one.">
        <template #group="{ group }">
          <td :colspan="columns.length">
            <strong>{{ group.title }}</strong>
            <span class="text-medium-emphasis ml-2">{{ group.rows.length }} {{ group.rows.length === 1 ? 'event' : 'events' }}</span>
          </td>
        </template>
        <template #rows="{ group }">
          <tr v-for="row in group.rows" :key="row.id" class="detail-row event-row" tabindex="0" @click="open(row)" @keydown.enter="open(row)" @keydown.space.prevent="open(row)">
            <td></td>
            <td class="py-2">
              <RouterLink :to="`/events/${row.id}`" class="text-high-emphasis" @click.stop><strong>{{ row.name }}</strong></RouterLink>
              <div v-if="!mdAndUp" class="text-caption text-medium-emphasis">{{ kindTitle(row.kind) }} · {{ dateText(row.start_date) }}</div>
            </td>
            <td v-if="mdAndUp">{{ kindTitle(row.kind) }}</td>
            <td v-if="mdAndUp" class="text-no-wrap">{{ dateText(row.start_date) }}</td>
            <td>
              <v-chip v-if="row.joined" size="small" color="success" variant="tonal" prepend-icon="mdi-check">Signed up</v-chip>
              <v-btn v-else-if="callerAction(row, null) === 'signup'" size="small" color="primary" variant="tonal" :to="`/events/${row.id}`" @click.stop>Sign up</v-btn>
              <span v-else class="text-medium-emphasis">—</span>
            </td>
          </tr>
        </template>
      </GroupedTable>
    </v-card>
  </v-container>
</template>

<script setup>
import { computed, onMounted, ref } from 'vue';
import { useRouter } from 'vue-router';
import { useDisplay } from 'vuetify';

import GroupedTable from '@/components/GroupedTable.vue';
import StatusAlert from '@/components/StatusAlert.vue';
import { useColumns } from '@/helpers/columns';
import { dateText, EVENT_KINDS, PHASE_LABEL } from '@/helpers/events-admin.mjs';
import { callerAction } from '@/helpers/events-public.mjs';
import { useEventStore } from '@/stores';

// An event a member reads about: what it is, when it starts, and his own signup state
const columns = useColumns([
  { key: 'name', title: 'Event' },
  { key: 'kind', title: 'Kind', mobile: false },
  { key: 'start', title: 'Starts', mobile: false },
  { key: 'signup', title: 'You', width: '140px' },
]);

// Draft events belong to the admin pages; a member reads the rest, soonest phase first
const ORDER = ['signups', 'checkin', 'seeded', 'running', 'finished'];

const { mdAndUp } = useDisplay();
const router = useRouter();
const store = useEventStore();
const events = ref([]);
const loading = ref(true);
const error = ref(null);

const kindTitle = (value) => EVENT_KINDS.find((kind) => kind.value === value)?.title || value;
const open = (row) => router.push(`/events/${row.id}`);

const groups = computed(() => ORDER
  .map((phase) => ({
    key: `phase:${phase}`,
    title: PHASE_LABEL[phase],
    rows: events.value
      .filter((row) => row.phase === phase)
      .sort((a, b) => (a.start_date || '9999').localeCompare(b.start_date || '9999')),
  }))
  .filter((group) => group.rows.length));

onMounted(async () => {
  try {
    events.value = (await store.fetchEvents()) || [];
  } catch (e) {
    error.value = `Failed to load the events: ${e.message}`;
  } finally {
    loading.value = false;
  }
});
</script>

<style scoped>
.event-row {
  cursor: pointer;
}
.event-row:focus-visible {
  outline: 2px solid rgb(var(--v-theme-primary));
  outline-offset: -2px;
}
</style>
