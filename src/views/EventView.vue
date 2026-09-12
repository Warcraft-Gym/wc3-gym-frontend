<!-- The public page of one event (#36): what it is and what the caller may do about it,
     who is entered, the maps it plays, and every stage as a bracket or as standings. -->
<template>
  <v-container>
    <StatusAlert v-model="error" />
    <StatusAlert v-model="notice" type="success" />
    <v-progress-linear v-if="loading" indeterminate />

    <v-card v-if="event" elevation="2" class="mb-4">
      <v-card-title class="bg-primary d-flex align-center flex-wrap ga-2">
        <v-icon class="mr-2">mdi-calendar-star</v-icon>
        {{ event.name }}
        <v-chip size="small" variant="tonal" color="on-primary">{{ PHASE_LABEL[event.phase] || event.phase }}</v-chip>
        <v-spacer />
        <v-btn v-if="action" class="tap" color="on-primary" variant="tonal" :prepend-icon="ACTION_ICON[action]" :loading="acting" @click="act">
          {{ ACTION_LABEL[action] }}
        </v-btn>
        <v-chip v-else-if="entrant" size="small" variant="tonal" color="on-primary" prepend-icon="mdi-check">You are entered</v-chip>
      </v-card-title>
      <v-card-text class="pt-4">
        <div class="d-flex flex-wrap ga-4 align-center">
          <span>{{ dateText(event.start_date) }} – {{ dateText(event.end_date) }}</span>
          <span class="text-medium-emphasis">{{ entrants.length }} {{ entrants.length === 1 ? 'entrant' : 'entrants' }}</span>
          <a v-if="event.page_url" :href="event.page_url" target="_blank" rel="noopener">Page</a>
          <a v-if="event.stream_url" :href="event.stream_url" target="_blank" rel="noopener">Stream</a>
          <v-spacer />
          <v-switch
            v-model="spoiler.hide"
            label="Spoiler-free"
            color="primary"
            density="compact"
            hide-details
            @update:model-value="saveSpoiler(spoiler)"
          />
        </div>
        <p v-if="event.description" class="mt-2">{{ event.description }}</p>
      </v-card-text>
    </v-card>

    <v-row v-if="event">
      <v-col cols="12" md="7">
        <v-card elevation="2" class="mb-4">
          <v-card-title class="bg-primary d-flex align-center">
            <v-icon class="mr-2">mdi-account-group</v-icon>
            Entrants
          </v-card-title>
          <v-card-text class="pa-0">
            <GroupedTable :columns="entrantColumns" :groups="entrantGroups" default-open empty="Nobody has signed up yet.">
              <template #group="{ group }">
                <td :colspan="entrantColumns.length">
                  <strong>{{ group.title }}</strong>
                  <span class="text-medium-emphasis ml-2">{{ group.rows.length }}</span>
                </td>
              </template>
              <template #rows="{ group }">
                <tr v-for="row in group.rows" :key="row.id" class="detail-row">
                  <td></td>
                  <td class="py-2">
                    <PlayerName :player="row.player || { name: row.name }" :race="row.race" />
                    <div v-if="!mdAndUp"><EntrantChips :entrant="row" /></div>
                  </td>
                  <td v-if="mdAndUp"><EntrantChips :entrant="row" /></td>
                </tr>
              </template>
            </GroupedTable>
          </v-card-text>
        </v-card>
      </v-col>

      <v-col cols="12" md="5">
        <v-card elevation="2" class="mb-4">
          <v-card-title class="bg-primary d-flex align-center">
            <v-icon class="mr-2">mdi-map</v-icon>
            Map pool
          </v-card-title>
          <v-card-text class="d-flex flex-wrap ga-2 pt-4">
            <v-chip v-for="map in event.maps || []" :key="map.id" size="small" variant="tonal">{{ map.name }}</v-chip>
            <span v-if="!(event.maps || []).length" class="text-medium-emphasis">No maps yet.</span>
          </v-card-text>
        </v-card>
      </v-col>
    </v-row>

    <EventStage
      v-for="stage in event?.stages || []"
      :key="stage.id"
      :event-id="eventId"
      :stage="stage"
      :spoiler="spoiler"
      @reveal="onReveal"
    />
  </v-container>
</template>

<script setup>
import { computed, onMounted, ref } from 'vue';
import { useRoute } from 'vue-router';
import { useDisplay } from 'vuetify';

import EntrantChips from '@/components/EntrantChips.vue';
import EventStage from '@/components/EventStage.vue';
import GroupedTable from '@/components/GroupedTable.vue';
import PlayerName from '@/components/PlayerName.vue';
import StatusAlert from '@/components/StatusAlert.vue';
import { useColumns } from '@/helpers/columns';
import { dateText, PHASE_LABEL } from '@/helpers/events-admin.mjs';
import { ACTION_LABEL, callerAction, loadSpoiler, reveal, saveSpoiler } from '@/helpers/events-public.mjs';
import { useAuthStore, useEventStore } from '@/stores';

const ACTION_ICON = { signup: 'mdi-account-plus', withdraw: 'mdi-account-minus', checkin: 'mdi-check-circle-outline' };

// A phone has no room for the chips column; the chips ride under the player's name there
const entrantColumns = useColumns([
  { key: 'player', title: 'Player' },
  { key: 'eligibility', title: 'Eligibility', mobile: false },
]);

const { mdAndUp } = useDisplay();
const route = useRoute();
const auth = useAuthStore();
const store = useEventStore();
const eventId = Number(route.params.id);

const event = ref(null);
const entrants = ref([]);
const loading = ref(true);
const acting = ref(false);
const error = ref(null);
const notice = ref(null);
const spoiler = ref(loadSpoiler());

// The caller's own row, which carries what he may still do with the event
const entrant = computed(() => entrants.value.find((row) => row.user_id === auth.me?.user?.id) || null);
const action = computed(() => callerAction(event.value, entrant.value));

const entrantGroups = computed(() => {
  if (!entrants.value.length) return [];  // GroupedTable draws its empty row only with no group
  const divisions = event.value?.divisions || [];
  if (!divisions.length) return [{ key: 'division:all', title: 'All entrants', rows: seeded(entrants.value) }];
  const groups = divisions.map((division) => ({
    key: `division:${division.id}`,
    title: division.name || 'Division',
    rows: seeded(entrants.value.filter((row) => row.division_id === division.id)),
  }));
  const rest = seeded(entrants.value.filter((row) => !divisions.some((division) => division.id === row.division_id)));
  if (rest.length) groups.push({ key: 'division:none', title: 'Unassigned', rows: rest });
  return groups.filter((group) => group.rows.length);
});

const seeded = (rows) => [...rows].sort((a, b) => (a.seed ?? 999) - (b.seed ?? 999));

const onReveal = (seriesId) => {
  spoiler.value = reveal(spoiler.value, eventId, seriesId);
  saveSpoiler(spoiler.value);
};

const load = async () => {
  event.value = await store.fetchEvent(eventId);
  entrants.value = (await store.fetchEntrants(eventId)) || [];
};

// Sign up, withdraw and check in all act on the caller's own entrant row
const act = async () => {
  acting.value = true;
  error.value = null;
  try {
    const done = action.value;
    if (done === 'signup') await store.signUp(eventId);
    else if (done === 'withdraw') await store.withdraw(eventId);
    else await store.checkIn(eventId);
    await load();
    notice.value = { signup: 'You are signed up', withdraw: 'You have withdrawn', checkin: 'You are checked in' }[done];
  } catch (e) {
    error.value = e.message || String(e);
  } finally {
    acting.value = false;
  }
};

onMounted(async () => {
  try {
    await load();
  } catch (e) {
    error.value = `Failed to load the event: ${e.message}`;
  } finally {
    loading.value = false;
  }
});
</script>

<style scoped>
/* A finger needs a bigger target than a mouse */
@media (max-width: 600px) {
  .tap {
    min-height: 48px;
  }
}
</style>
