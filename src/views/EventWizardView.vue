<!-- The new-event wizard (#36): six steps that end in one POST /events carrying the
     event, its stages in order and its map pool. -->
<template>
  <v-container>
    <v-card elevation="2">
      <v-card-title class="bg-primary d-flex align-center">
        <v-icon class="mr-2">mdi-calendar-plus</v-icon>
        New event
      </v-card-title>
      <v-card-text class="pa-0">
        <StatusAlert v-model="error" class="ma-4" />
        <StatusAlert v-model="notice" type="success" class="ma-4" />
        <v-stepper v-model="step" :items="STEPS" flat hide-actions>
          <!-- Basics -->
          <template #item.1>
            <v-row dense class="pa-2">
              <v-col cols="12" md="6">
                <v-select v-model="form.league_id" :items="leagues" item-title="name" item-value="id" label="League" variant="outlined" density="comfortable" />
              </v-col>
              <v-col cols="12" md="6">
                <v-select v-model="form.kind" :items="EVENT_KINDS" label="Kind" variant="outlined" density="comfortable" />
              </v-col>
              <v-col cols="12">
                <v-text-field v-model="form.name" label="Name" variant="outlined" density="comfortable" />
              </v-col>
              <v-col cols="12">
                <v-textarea v-model="form.description" label="Description" rows="2" variant="outlined" density="comfortable" />
              </v-col>
              <v-col cols="12" md="4">
                <v-text-field v-model="form.start_date" label="Start date" type="date" variant="outlined" density="comfortable" />
              </v-col>
              <v-col cols="12" md="4">
                <v-text-field v-model="form.start_time" label="Start time" type="time" variant="outlined" density="comfortable" :hint="zoneHint" persistent-hint />
              </v-col>
              <v-col cols="12" md="4">
                <v-text-field v-model="form.end_date" label="End date" type="date" variant="outlined" density="comfortable" />
              </v-col>
              <v-col cols="12" md="6">
                <v-text-field v-model="form.page_url" label="Page link" placeholder="https://" variant="outlined" density="comfortable" />
              </v-col>
              <v-col cols="12" md="6">
                <v-text-field v-model="form.stream_url" label="Stream link" placeholder="https://" variant="outlined" density="comfortable" />
              </v-col>
            </v-row>
          </template>

          <!-- Entrants -->
          <template #item.2>
            <v-row dense class="pa-2">
              <v-col cols="12" md="4">
                <v-text-field v-model="form.entrant_cap" label="Entrant cap" type="number" variant="outlined" density="comfortable" hint="Blank: no cap" persistent-hint />
              </v-col>
              <v-col cols="12" md="4">
                <v-text-field v-model="form.min_games" label="Minimum ladder games" type="number" variant="outlined" density="comfortable" hint="Warns on the entrant, never blocks" persistent-hint />
              </v-col>
              <v-col cols="12" md="4">
                <v-text-field v-model="form.mmr_max" label="MMR ceiling" type="number" variant="outlined" density="comfortable" hint="Warns on the entrant, never blocks" persistent-hint />
              </v-col>
              <v-col cols="12" md="6">
                <v-text-field v-model="form.checkin_opens_at" label="Check-in opens" type="datetime-local" variant="outlined" density="comfortable" :hint="zoneHint" persistent-hint />
              </v-col>
              <v-col cols="12" md="6">
                <v-text-field v-model="form.checkin_closes_at" label="Check-in closes" type="datetime-local" variant="outlined" density="comfortable" hint="Blank: no check-in" persistent-hint />
              </v-col>
              <v-col cols="12" md="6">
                <v-switch v-model="form.published" color="primary" label="Published" hide-details density="comfortable" />
              </v-col>
              <v-col cols="12" md="6">
                <v-switch v-model="form.signups_open" color="primary" label="Signups open" hide-details density="comfortable" />
              </v-col>
            </v-row>
          </template>

          <!-- Stages -->
          <template #item.3>
            <div class="pa-2">
              <v-card v-for="(stage, index) in form.stages" :key="index" variant="outlined" class="mb-4">
                <v-card-title class="d-flex align-center text-body-1">
                  Stage {{ index + 1 }}
                  <v-chip size="small" class="ml-2" variant="tonal">Bo{{ gamesOf(stage.map_rules) }}</v-chip>
                  <v-chip v-if="!isBuiltFormat(stage.format)" size="small" class="ml-2" color="warning" variant="tonal">Not generated yet</v-chip>
                  <v-spacer />
                  <v-btn v-if="form.stages.length > 1" icon="mdi-delete" variant="text" size="small" class="tap" aria-label="Remove stage" @click="form.stages.splice(index, 1)" />
                </v-card-title>
                <v-card-text>
                  <v-row dense>
                    <v-col cols="12" md="6">
                      <v-text-field v-model="stage.name" label="Name" variant="outlined" density="comfortable" />
                    </v-col>
                    <v-col cols="12" md="6">
                      <v-select v-model="stage.format" :items="FORMATS" label="Format" variant="outlined" density="comfortable" />
                    </v-col>
                    <v-col cols="12" md="6">
                      <v-select v-model="stage.map_rules" :items="MAP_RULE_PRESETS" label="Map rules" variant="outlined" density="comfortable" />
                    </v-col>
                    <v-col cols="12" md="6">
                      <v-select v-model="stage.scheduling_mode" :items="SCHEDULING_MODES" label="Scheduling" variant="outlined" density="comfortable" />
                    </v-col>
                    <v-col cols="6" md="3">
                      <v-text-field v-model="stage.points_series_won" label="Points per series won" type="number" variant="outlined" density="comfortable" />
                    </v-col>
                    <v-col cols="6" md="3">
                      <v-text-field v-model="stage.points_series_drawn" label="Points per draw" type="number" variant="outlined" density="comfortable" />
                    </v-col>
                    <v-col cols="6" md="3">
                      <v-text-field v-model="stage.points_game_won" label="Points per game won" type="number" variant="outlined" density="comfortable" />
                    </v-col>
                    <v-col cols="6" md="3">
                      <v-text-field v-model="stage.advance_count" label="Advance" type="number" variant="outlined" density="comfortable" hint="Blank: last stage" persistent-hint />
                    </v-col>
                  </v-row>
                </v-card-text>
              </v-card>
              <v-btn variant="tonal" color="primary" prepend-icon="mdi-plus" @click="form.stages.push(newStage(form.stages.length + 1))">Add stage</v-btn>
            </div>
          </template>

          <!-- Maps -->
          <template #item.4>
            <div class="pa-2">
              <div class="d-flex flex-wrap ga-2 mb-4">
                <v-btn variant="outlined" color="primary" :loading="importing" @click="importLadderPool">
                  <template #prepend><W3CIcon :size="20" /></template>
                  Import 1v1 ladder pool
                </v-btn>
                <v-btn v-if="form.map_ids.length" variant="text" @click="form.map_ids = []">Clear</v-btn>
              </div>
              <v-autocomplete
                v-model="form.map_ids"
                :items="maps"
                item-title="name"
                item-value="id"
                label="Map pool"
                multiple
                chips
                closable-chips
                variant="outlined"
                density="comfortable"
              />
              <p v-if="!form.map_ids.length" class="text-medium-emphasis">No maps yet. Import the ladder pool, then add or remove rows.</p>
            </div>
          </template>

          <!-- Channels -->
          <template #item.5>
            <div class="pa-2">
              <v-switch v-model="form.discord_post" color="primary" label="Announce on Discord" hide-details density="comfortable" />
              <p class="text-medium-emphasis mt-2">
                A Discord event carries the name, the start time and the page or stream link. It can also be posted later from the event page.
              </p>
            </div>
          </template>

          <!-- Review -->
          <template #item.6>
            <div class="pa-2">
              <v-table density="comfortable">
                <tbody>
                  <tr><td class="text-medium-emphasis">League</td><td>{{ leagueName }}</td></tr>
                  <tr><td class="text-medium-emphasis">Name</td><td>{{ form.name || '—' }}</td></tr>
                  <tr><td class="text-medium-emphasis">Kind</td><td>{{ kindTitle }}</td></tr>
                  <tr><td class="text-medium-emphasis">Dates</td><td>{{ dateText(form.start_date) }} – {{ dateText(form.end_date) }}</td></tr>
                  <tr><td class="text-medium-emphasis">Stages</td><td>{{ form.stages.map((stage) => `${stage.name} (${formatTitle(stage.format)}, Bo${gamesOf(stage.map_rules)})`).join(', ') }}</td></tr>
                  <tr><td class="text-medium-emphasis">Maps</td><td>{{ form.map_ids.length }}</td></tr>
                  <tr><td class="text-medium-emphasis">Discord</td><td>{{ form.discord_post ? 'Announced' : 'Not announced' }}</td></tr>
                </tbody>
              </v-table>
              <p v-if="problem" class="text-error mt-4">{{ problem }}</p>
            </div>
          </template>
        </v-stepper>
      </v-card-text>
      <v-card-actions class="px-4 py-3 flex-wrap ga-2">
        <v-btn variant="text" :disabled="step === 1" @click="step -= 1">Back</v-btn>
        <v-spacer />
        <v-btn v-if="step < STEPS.length" color="primary" variant="elevated" @click="step += 1">Next</v-btn>
        <v-btn v-else color="primary" variant="elevated" :disabled="!!problem || saving" :loading="saving" @click="create">Create event</v-btn>
      </v-card-actions>
    </v-card>
  </v-container>
</template>

<script setup>
import { computed, onMounted, ref } from 'vue';
import { useRoute, useRouter } from 'vue-router';

import StatusAlert from '@/components/StatusAlert.vue';
import W3CIcon from '@/components/W3CIcon.vue';
import { gamesOf } from '@/helpers/best-of.mjs';
import {
  dateText, EVENT_KINDS, eventPayload, FORMATS, formatTitle, isBuiltFormat,
  ladderPool, MAP_RULE_PRESETS, newStage, SCHEDULING_MODES, wizardProblem,
} from '@/helpers/events-admin.mjs';
import { viewerZone } from '@/helpers/timezone.mjs';
import { useEventStore, useMapStore } from '@/stores';

const STEPS = ['Basics', 'Entrants', 'Stages', 'Maps', 'Channels', 'Review'];

const route = useRoute();
const router = useRouter();
const store = useEventStore();
const mapStore = useMapStore();

const step = ref(1);
const leagues = ref([]);
const maps = ref([]);
const error = ref(null);
const notice = ref(null);
const saving = ref(false);
const importing = ref(false);
const zoneHint = `Times are ${viewerZone()}`;

const form = ref({
  league_id: Number(route.query.league) || null,
  name: '',
  description: '',
  kind: 'cup',
  start_date: '',
  start_time: '',
  end_date: '',
  page_url: '',
  stream_url: '',
  entrant_cap: '',
  min_games: '',
  mmr_max: '',
  checkin_opens_at: '',
  checkin_closes_at: '',
  published: true,
  signups_open: true,
  stages: [newStage(1)],
  map_ids: [],
  discord_post: false,
});

const problem = computed(() => wizardProblem(form.value));
const leagueName = computed(() => leagues.value.find((league) => league.id === form.value.league_id)?.name || '—');
const kindTitle = computed(() => EVENT_KINDS.find((kind) => kind.value === form.value.kind)?.title || form.value.kind);

// The ladder pool the maps table already holds; a map the app does not know is imported on /maps first
const importLadderPool = async () => {
  importing.value = true;
  notice.value = null;
  try {
    const rows = await mapStore.fetchLadderMapImport();
    const { ids, missing } = ladderPool(maps.value, rows);
    form.value.map_ids = [...new Set([...form.value.map_ids, ...ids])];
    notice.value = missing.length
      ? `${ids.length} maps imported, ${missing.length} not in the maps table yet — add them on /maps first: ${missing.join(', ')}`
      : `${ids.length} maps imported`;
  } catch (e) {
    error.value = `Failed to read the ladder pool: ${e.message}`;
  } finally {
    importing.value = false;
  }
};

const create = async () => {
  saving.value = true;
  error.value = null;
  try {
    const event = await store.createEvent(eventPayload(form.value));
    // The event is made either way; a failed announcement is carried to its page, which can retry
    let announced = true;
    if (form.value.discord_post) await store.postToDiscord(event.id).catch(() => { announced = false; });
    router.push({ path: `/events/${event.id}/admin`, query: announced ? {} : { discord: 'failed' } });
  } catch (e) {
    error.value = `Failed to create the event: ${e.message}`;
  } finally {
    saving.value = false;
  }
};

onMounted(async () => {
  try {
    leagues.value = (await store.fetchLeagues()) || [];
    await mapStore.fetchMaps();
    maps.value = mapStore.maps || [];
  } catch (e) {
    error.value = `Failed to load the leagues and maps: ${e.message}`;
  }
});
</script>

<style scoped>
/* A finger needs a bigger target than a mouse */
@media (max-width: 600px) {
  .tap {
    min-width: 48px;
    min-height: 48px;
  }
}
</style>
