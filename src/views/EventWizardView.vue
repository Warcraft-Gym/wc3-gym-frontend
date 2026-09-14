<!-- Creating one event: the steps an admin answers, then the write that makes the event
     with its stages, and the second write that adds its divisions. A signup-only event plays
     no stage, so the wizard leaves that step out and writes an empty stage list. The stepper
     numbers the steps it asks for, so one slot picks the block each number carries. -->
<template>
  <v-container fluid class="pa-4">
    <h1 class="text-h5 text-md-h3 font-weight-bold mb-4">
      <v-icon class="mr-2" size="large">mdi-trophy-outline</v-icon>New Event
    </h1>

    <StatusAlert v-model="error" />

    <div class="d-sm-none text-medium-emphasis mb-2">
      Step {{ step }} of {{ steps.length }} · {{ steps[step - 1].title }}
    </div>

    <v-stepper v-model="step" :items="stepTitles" hide-actions flat class="wizard">
      <template #item="{ value }">
        <!-- Basics -->
        <v-card-text v-if="keyAt(value) === 'basics'">
          <v-row dense>
            <v-col cols="12" md="4">
              <v-select v-model="form.league_id" :items="leagues" item-title="name" item-value="id" label="League" />
            </v-col>
            <v-col cols="12" md="5">
              <v-text-field v-model="form.name" label="Name" autofocus />
            </v-col>
            <v-col cols="12" md="3">
              <v-select v-model="form.kind" :items="WIZARD_KINDS" label="Kind" />
            </v-col>
            <v-col cols="12" md="6">
              <v-select v-model="form.parent_id" :items="parentEvents" item-title="name" item-value="id"
                label="Part of" clearable hint="A qualifier names the event it feeds" persistent-hint />
            </v-col>
            <v-col cols="12" md="6">
              <v-text-field v-model="form.region" label="Region" placeholder="Europe" />
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
          </v-row>
        </v-card-text>

        <!-- Entrants -->
        <v-card-text v-else-if="keyAt(value) === 'entrants'">
          <v-row dense>
            <v-col cols="12" md="6">
              <v-select v-model="form.signup_policy" :items="SIGNUP_POLICIES" label="Who may sign up" />
            </v-col>
            <v-col cols="12" md="6">
              <v-select v-model="form.entrant_kind" :items="WIZARD_ENTRANT_KINDS" label="An entrant is" />
            </v-col>
            <v-col v-if="form.entrant_kind === 'team'" cols="12" md="4">
              <v-text-field v-model="form.series_per_round" type="number" min="1" :label="SERIES_PER_FIXTURE" />
            </v-col>
            <v-col cols="12" md="4">
              <v-text-field v-model="form.entrant_cap" type="number" label="Entrant cap" placeholder="No cap" />
            </v-col>
            <v-col cols="12" md="4">
              <v-text-field v-model="form.mmr_max" type="number" label="MMR maximum" placeholder="No maximum" />
            </v-col>
            <v-col cols="12" md="4">
              <v-text-field v-model="form.min_games" type="number" label="Recent games at least" placeholder="No floor" />
            </v-col>
            <v-col cols="12">
              <v-switch v-model="form.checkin_enabled" color="primary" hide-details
                label="Ask entrants to check in before each round" />
            </v-col>
            <v-col v-if="form.checkin_enabled" cols="12" md="4">
              <v-text-field v-model="form.checkin_days" type="number" label="Check-in opens how many days before" />
            </v-col>
          </v-row>
        </v-card-text>

        <!-- Stages -->
        <v-card-text v-else-if="keyAt(value) === 'stages'">
          <v-card v-for="(stage, index) in form.stages" :key="index" variant="outlined" class="mb-3">
            <v-card-text>
              <div class="d-flex align-center mb-2">
                <span class="text-subtitle-2">Stage {{ index + 1 }}</span>
                <v-spacer />
                <v-btn icon="mdi-arrow-up" variant="text" size="small" :disabled="index === 0"
                  aria-label="Move up" @click="moveStage(index, -1)" />
                <v-btn icon="mdi-arrow-down" variant="text" size="small" :disabled="index === form.stages.length - 1"
                  aria-label="Move down" @click="moveStage(index, 1)" />
                <v-btn icon="mdi-delete-outline" variant="text" size="small" :disabled="form.stages.length < 2"
                  aria-label="Remove stage" @click="form.stages.splice(index, 1)" />
              </div>
              <v-row dense>
                <v-col cols="12" md="4">
                  <v-text-field v-model="stage.name" label="Name" :placeholder="`Stage ${index + 1}`" />
                </v-col>
                <v-col cols="12" md="4">
                  <v-select v-model="stage.format" :items="FORMATS" label="Format" />
                </v-col>
                <v-col cols="6" md="4">
                  <v-select v-model="stage.best_of" :items="BEST_OF" label="Best of" />
                </v-col>
                <v-col cols="6" md="4">
                  <v-select v-model="stage.map_rule" :items="MAP_RULES" label="Map rule" />
                </v-col>
                <v-col v-if="stage.format === 'ffa'" cols="6" md="4">
                  <v-text-field v-model="stage.lobby_size" type="number" min="2" label="Players per lobby"
                    placeholder="The whole field" />
                </v-col>
                <v-col v-if="stage.format === 'ffa'" cols="6" md="4">
                  <v-text-field v-model="stage.points_by_place" label="Points each place pays"
                    placeholder="4,3,2,1" hint="Best place first" persistent-hint />
                </v-col>
                <v-col v-if="stage.format === 'round_robin'" cols="12" md="4">
                  <v-text-field v-model="stage.series_per_entrant_per_round" type="number" min="1"
                    :label="SERIES_PER_ENTRANT_PER_ROUND" />
                </v-col>
                <v-col cols="12" md="4">
                  <v-select v-model="stage.scheduling_mode" :items="SCHEDULING_MODES" label="Scheduling" />
                </v-col>
                <v-col cols="12" md="4">
                  <v-text-field v-model="stage.advance_count" type="number" label="Entrants who advance"
                    placeholder="None" />
                </v-col>
                <v-col cols="12">
                  <v-switch v-model="stage.auto_advance" color="primary" hide-details density="compact"
                    label="Advance them as soon as the stage finishes" />
                </v-col>
              </v-row>
            </v-card-text>
          </v-card>
          <v-btn variant="outlined" color="primary" prepend-icon="mdi-plus"
            @click="form.stages.push(blankStage())">Add stage</v-btn>
        </v-card-text>

        <!-- Divisions -->
        <v-card-text v-else-if="keyAt(value) === 'divisions'">
          <p class="text-medium-emphasis mb-4">
            A division runs the whole event beside the others and never merges. The MMR bounds are
            cut on the entrants page once the signups are in.
          </p>
          <v-row dense>
            <v-col cols="12" md="4">
              <v-select v-model="form.division_count" :items="DIVISION_COUNTS" label="Divisions" />
            </v-col>
          </v-row>
          <v-row dense>
            <v-col v-for="index in form.division_count" :key="index" cols="12" md="4">
              <v-text-field v-model="form.division_names[index - 1]" :label="`Division ${index} name`"
                :placeholder="`Division ${index}`" />
            </v-col>
          </v-row>
        </v-card-text>

        <!-- Review -->
        <v-card-text v-else>
          <div v-for="group in review" :key="group.title" class="mb-5">
            <div class="d-flex align-center mb-1">
              <h2 class="text-subtitle-1 font-weight-bold">{{ group.title }}</h2>
              <v-btn v-if="group.step" variant="text" size="small" class="ml-2"
                @click="step = group.step">Edit</v-btn>
            </div>
            <div v-for="row in group.rows" :key="row.k" class="review-row">
              <div class="text-medium-emphasis">{{ row.k }}</div>
              <div>{{ row.v }}</div>
            </div>
          </div>
        </v-card-text>
      </template>

      <template #actions>
        <div />
      </template>
    </v-stepper>

    <div class="d-flex flex-wrap align-center ga-3 mt-4">
      <v-btn variant="text" :disabled="step === 1" @click="step -= 1">Back</v-btn>
      <span v-if="problem" class="text-medium-emphasis text-body-2">{{ problem }}</span>
      <v-spacer />
      <v-btn v-if="step < steps.length" variant="elevated" color="primary" :disabled="!!problem"
        @click="step += 1">Next</v-btn>
      <v-btn v-else variant="elevated" color="primary" :loading="saving" :disabled="!!problem"
        @click="create">Create event</v-btn>
    </div>
  </v-container>
</template>

<script setup>
import { computed, onMounted, ref, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';

import SimpleDatePicker from '@/components/SimpleDatePicker.vue';
import SimpleTimePicker from '@/components/SimpleTimePicker.vue';
import StatusAlert from '@/components/StatusAlert.vue';
import {
  dateRange, dateText, FORMATS, MAP_RULES, SCHEDULING_MODES, SERIES_PER_ENTRANT_PER_ROUND,
  SERIES_PER_FIXTURE, SIGNUP_POLICIES, titleOf,
} from '@/helpers/event-labels.mjs';
import {
  BEST_OF, blankForm, blankStage, createPayload, divisionsPayload, eventPayload, seriesPerRound,
  stepProblem, stepsFor, WIZARD_ENTRANT_KINDS, WIZARD_KINDS,
} from '@/helpers/event-wizard.mjs';
import { useEventStore } from '@/stores';

const route = useRoute();
const router = useRouter();
const store = useEventStore();
const step = ref(1);
const saving = ref(false);
const error = ref(null);
const leagues = ref([]);
const form = ref(blankForm());

const DIVISION_COUNTS = [
  { value: 0, title: 'None' },
  ...[2, 3, 4, 5, 6].map((value) => ({ value, title: `${value} divisions` })),
];
// The steps this kind asks for. The stepper numbers them 1..n, so a step it leaves out
// shifts every later number, and one lookup says what each number carries.
const steps = computed(() => stepsFor(form.value));
const stepTitles = computed(() => steps.value.map((item) => item.title));
const keyAt = (number) => steps.value[number - 1]?.key;
// The number of one step, or nothing when this kind does not ask for it
const stepNumber = (key) => steps.value.findIndex((item) => item.key === key) + 1 || null;
const league = computed(() => leagues.value.find((row) => row.id === form.value.league_id) || null);
// A qualifier feeds an event of the same league; a run cannot be part of itself
const parentEvents = computed(() => league.value?.events || []);
const problem = computed(() => stepProblem(form.value, keyAt(step.value)));

// A kind with fewer steps must not leave the wizard past its last one
watch(steps, (list) => { step.value = Math.min(step.value, list.length); });

const moveStage = (index, delta) => {
  const [stage] = form.value.stages.splice(index, 1);
  form.value.stages.splice(index + delta, 0, stage);
};

// The events of a league are read off the league itself, so a changed league reloads them
watch(() => form.value.league_id, async (id) => {
  form.value.parent_id = null;
  if (!id) return;
  const full = await store.fetchLeague(id).catch(() => null);
  if (full) leagues.value = leagues.value.map((row) => (row.id === id ? full : row));
});

const orNone = (value) => (value === '' || value === null || value === undefined ? 'None' : String(value));

const review = computed(() => {
  const it = form.value;
  const body = eventPayload(it);
  return [
    {
      title: 'Basics',
      step: stepNumber('basics'),
      rows: [
        { k: 'League', v: league.value?.name || '—' },
        { k: 'Name', v: it.name || '—' },
        { k: 'Kind', v: titleOf(WIZARD_KINDS, it.kind) },
        { k: 'Part of', v: parentEvents.value.find((e) => e.id === it.parent_id)?.name || 'Nothing' },
        { k: 'Starts', v: dateRange({ starts_at: body.starts_at, start_date: body.start_date }) || 'No date' },
        { k: 'Ends', v: body.end_date ? dateText(body.end_date) : 'No end date' },
        { k: 'Region', v: orNone(it.region) },
        { k: 'Description', v: orNone(it.description) },
        { k: 'Page link', v: orNone(it.page_url) },
        { k: 'Stream link', v: orNone(it.stream_url) },
      ],
    },
    {
      title: 'Entrants',
      step: stepNumber('entrants'),
      rows: [
        { k: 'Who may sign up', v: titleOf(SIGNUP_POLICIES, it.signup_policy) },
        { k: 'An entrant is', v: titleOf(WIZARD_ENTRANT_KINDS, it.entrant_kind) },
        ...(it.entrant_kind === 'team' ? [{ k: SERIES_PER_FIXTURE, v: String(body.series_per_round) }] : []),
        { k: 'Entrant cap', v: orNone(it.entrant_cap) },
        { k: 'MMR maximum', v: orNone(it.mmr_max) },
        { k: 'Recent games at least', v: orNone(it.min_games) },
        { k: 'Check-in', v: it.checkin_enabled ? `${it.checkin_days} days before a round` : 'Off' },
      ],
    },
    {
      title: 'Stages',
      // A signup-only event answers no stages step, so the group names the shape and offers no edit
      step: stepNumber('stages'),
      rows: it.kind === 'signup'
        ? [{ k: titleOf(WIZARD_KINDS, it.kind), v: 'No stages: a sign-up list' }]
        : it.stages.map((stage, index) => ({
          k: stage.name || `Stage ${index + 1}`,
          v: [
            titleOf(FORMATS, stage.format),
            `best of ${stage.best_of}`,
            ...(stage.format === 'round_robin' ? [`${seriesPerRound(stage)} series each entrant a round`] : []),
            ...(stage.format === 'ffa' && stage.lobby_size ? [`lobbies of ${stage.lobby_size}`] : []),
            ...(stage.format === 'ffa' && stage.points_by_place ? [`places pay ${stage.points_by_place}`] : []),
            titleOf(MAP_RULES, stage.map_rule).toLowerCase(),
            titleOf(SCHEDULING_MODES, stage.scheduling_mode).toLowerCase(),
            stage.advance_count ? `${stage.advance_count} advance` : 'nobody advances',
            stage.auto_advance ? 'advance is automatic' : 'advance by hand',
          ].join(' · '),
        })),
    },
    {
      title: 'Divisions',
      step: stepNumber('divisions'),
      rows: it.division_count
        ? divisionsPayload(it).map((division) => ({ k: `Division ${division.position}`, v: division.name }))
        : [{ k: 'Divisions', v: 'None' }],
    },
  ];
});

const create = async () => {
  saving.value = true;
  error.value = null;
  let id = null;
  let divisions = null;
  try {
    id = (await store.createEvent(createPayload(form.value))).id;
    if (form.value.division_count) await store.setDivisions(id, divisionsPayload(form.value));
  } catch (e) {
    // an event that is already written is read, not created again
    if (id) divisions = 'unsaved';
    else error.value = `The event was not created: ${e.message}`;
  } finally {
    saving.value = false;
  }
  if (id) await router.push({ path: `/events/${id}`, query: divisions ? { divisions } : {} });
};

onMounted(async () => {
  try {
    leagues.value = await store.fetchLeagues();
  } catch (e) {
    error.value = `The leagues did not load: ${e.message}`;
  }
  const preset = Number(route.query.league);
  form.value = blankForm(leagues.value.find((row) => row.id === preset) || null);
});
</script>

<style scoped>
/* the stepper draws its own card; the page already sits on one surface */
.wizard :deep(.v-stepper-window) { margin: 0; }
.review-row {
  display: grid;
  grid-template-columns: 240px minmax(0, 1fr);
  gap: 2px 16px;
  padding: 6px 0;
  border-bottom: 1px solid rgba(var(--v-border-color), var(--v-border-opacity));
  white-space: pre-line;
}
/* five step names do not fit a phone, and neither does a two-column row */
@media (max-width: 599px) {
  .wizard :deep(.v-stepper-header) { display: none; }
  .review-row { grid-template-columns: minmax(0, 1fr); }
}
</style>
