<!-- One event, open to everyone: what it is, how it plays, who is in it, and the one thing
     the reader can do about it. An event with no stage is a sign-up list, so it reads its
     entrants against the cap in place of the stage table. A GNL season keeps its own pages,
     so this one links to them rather than redrawing them. The spoiler switch is the reader's
     own, kept in this browser. -->
<template>
  <v-container fluid class="pa-4">
    <StatusAlert v-model="error" />
    <v-progress-linear v-if="loading" indeterminate />

    <template v-if="event">
      <EventHeader :event="event" :league="league" />
      <p v-if="event.description" class="mt-3 mb-0 description">{{ event.description }}</p>

      <div class="d-flex flex-wrap align-center ga-3 mt-4">
        <v-chip size="small" variant="tonal" prepend-icon="mdi-account-multiple">
          {{ entered }} entrants
        </v-chip>
        <v-chip v-if="fixtureSeries" size="small" variant="tonal" prepend-icon="mdi-sword-cross">
          {{ fixtureSeries }} series per fixture
        </v-chip>

        <!-- The one action the server picked for this caller; a chip once he is checked in -->
        <v-chip v-if="row?.action === 'checked_in'" size="small" color="success" variant="tonal"
          prepend-icon="mdi-check">
          Checked in
        </v-chip>
        <!-- A player on more than one race withdraws one race at a time -->
        <template v-else-if="button && row?.action === 'withdraw' && held.length > 1">
          <v-btn v-for="race in held" :key="race" :color="button.color" :variant="button.variant" size="small"
            :prepend-icon="button.icon" :loading="acting === race" @click="act(race)">
            Withdraw {{ raceName(race) }}
          </v-btn>
        </template>
        <v-btn v-else-if="button" :color="button.color" :variant="button.variant" size="small"
          :prepend-icon="button.icon" :loading="acting === true" @click="act()">
          {{ button.text }}
        </v-btn>
        <v-btn v-else-if="anonymous && event.signups_open && keepsEntrants" color="primary" variant="elevated" size="small"
          prepend-icon="mdi-login" @click="logIn">
          Log in to sign up
        </v-btn>
        <!-- An event that takes one entry per race lets a player in on another race beside his own row -->
        <v-btn v-if="event.multi_entry && event.signups_open && held.length && held.length < raceWrapper.races.length" color="primary" variant="outlined" size="small"
          prepend-icon="mdi-account-plus" @click="dialog.open()">
          Enter another race
        </v-btn>

        <!-- The caller's own blocks cover the next round; the answer is his, the blocks only inform -->
        <template v-if="hint">
          <v-chip size="small" color="info" variant="tonal" prepend-icon="mdi-calendar-remove">
            {{ hint.title }}
          </v-chip>
          <v-btn variant="outlined" color="error" size="small" prepend-icon="mdi-close"
            :loading="answering" @click="answerBlocked">
            {{ hint.text }}
          </v-btn>
        </template>

        <!-- Both targets sit behind a login, so a reader who is not logged in reads neither -->
        <v-btn v-if="!anonymous" variant="outlined" color="primary" size="small"
          prepend-icon="mdi-account-multiple" :to="`/events/${event.id}/entrants`">
          Entrants
        </v-btn>
        <v-btn v-if="!anonymous && event.kind === 'gnl'" variant="outlined" color="primary" size="small"
          prepend-icon="mdi-trophy-outline" :to="`/seasons/${seasonSlug(event)}`">
          Season page
        </v-btn>
      </div>

      <v-card v-if="!signupOnly" elevation="2" class="mt-4">
        <v-card-title>Stages</v-card-title>
        <v-table density="comfortable">
          <thead>
            <tr>
              <th style="width: 56px">#</th>
              <th>Stage</th>
              <th class="d-none d-md-table-cell">Format</th>
              <th class="text-right">Best of</th>
              <th class="text-right d-none d-md-table-cell">
                <ColumnNote title="Series per entrant" :note="SERIES_PER_ENTRANT_PER_ROUND" />
              </th>
              <th class="d-none d-md-table-cell">Scheduling</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="stage in stages" :key="stage.position">
              <td>{{ stage.position }}</td>
              <td class="py-3">
                {{ stage.name || `Stage ${stage.position}` }}
                <div class="d-md-none text-caption text-medium-emphasis">
                  {{ phoneLine(stage) }}
                </div>
              </td>
              <td class="d-none d-md-table-cell">{{ titleOf(FORMATS, stage.format) }}</td>
              <td class="text-right">{{ stage.best_of }}</td>
              <td class="text-right d-none d-md-table-cell">{{ seriesPerEntrant(stage) ?? '—' }}</td>
              <td class="d-none d-md-table-cell">{{ titleOf(SCHEDULING_MODES, stage.scheduling_mode) }}</td>
            </tr>
          </tbody>
        </v-table>
      </v-card>

      <!-- Who is in. A seed reads only once a stage locked its order, so it means something.
           A sign-up list counts its entrants against the cap and prints what each one wrote. -->
      <v-card elevation="2" class="mt-4">
        <v-card-title>{{ signupOnly ? 'Sign-ups' : 'Entrants' }}</v-card-title>
        <v-card-subtitle v-if="signupOnly" class="pb-2">{{ signupCount(event, entrants) }}</v-card-subtitle>
        <v-list v-if="entrants.length" density="compact" class="py-0">
          <v-list-item v-for="entrant in byPlayer(entrants)" :key="entrant.id"
            :class="{ 'text-medium-emphasis': entrant.withdrawn_at }">
            <div class="d-flex align-center ga-3">
              <span v-if="seedsLocked" class="seed text-caption text-medium-emphasis">
                {{ solo(entrant) ? entrant.seed ?? '—' : '' }}
              </span>
              <PlayerName v-if="entrant.user" :player="entrant.user" :race="solo(entrant) ? entrant.race : undefined" />
              <span v-else>{{ entrantName(entrant) }}</span>
              <v-chip v-if="places[entrant.id]" size="x-small" variant="outlined">
                <v-icon v-if="placeMedal(places[entrant.id].place)" start size="14"
                  :icon="placeIcon(places[entrant.id].place)"
                  :color="placeMedal(places[entrant.id].place)" />
                {{ places[entrant.id].title }}
              </v-chip>
              <v-icon v-if="entrant.checked_in_at" icon="mdi-check" size="small" color="success"
                title="Checked in" /><span v-if="entrant.checked_in_at" class="d-sr-only">checked in</span>
              <span v-if="entrant.withdrawn_at" class="text-caption">withdrawn</span>
            </div>
            <!-- A player on more than one race: one line a race, with its seed and its division -->
            <div v-for="race in raceRows(entrant)" :key="race.id" class="d-flex align-center ga-2 pl-6 text-body-2"
              :class="{ 'text-medium-emphasis': race.withdrawn_at }">
              <span v-if="seedsLocked" class="seed text-caption text-medium-emphasis">{{ race.seed ?? '—' }}</span>
              <RaceIcon :raceIdentifier="race.race" />
              <span>{{ raceName(race.race) }}</span>
              <span v-if="divisionName(race)" class="text-caption text-medium-emphasis">{{ divisionName(race) }}</span>
              <span v-if="race.withdrawn_at" class="text-caption">withdrawn</span>
            </div>
            <div v-if="entrant.note" class="text-body-2 text-medium-emphasis note">{{ entrant.note }}</div>
          </v-list-item>
        </v-list>
        <p v-else class="text-medium-emphasis px-4 pb-4 mb-0">No entrants yet</p>
      </v-card>

      <!-- The stages read the same drawing the run page shows, with no admin control on it -->
      <div v-if="drawn.length" ref="draw" class="d-flex align-center justify-space-between mt-6">
        <h2 class="text-h6 mb-0">The draw</h2>
        <v-switch v-model="hideResults" color="primary" density="compact" hide-details
          label="Hide results" />
      </div>
      <template v-for="stage in drawn" :key="stage.id">
        <h3 class="text-subtitle-1 font-weight-bold mt-4 mb-2">{{ stage.name || `Stage ${stage.position}` }}</h3>
        <StageView readonly :stage="stage" :series="stage.series" :rounds="stage.rounds"
          :divisions="event.divisions" :standings="stage.standings" :rosters="rosters"
          @open-series="row => router.push(`/series/${row.id}`)" />
      </template>

      <SignupDialog ref="dialog" :event="event" :held="held" @signed-up="reload" />
    </template>
  </v-container>
</template>

<script setup>
import { computed, onMounted, provide, ref, watch } from 'vue';
import { useRoute } from 'vue-router';

import ColumnNote from '@/components/ColumnNote.vue';
import EventHeader from '@/components/EventHeader.vue';
import PlayerName from '@/components/PlayerName.vue';
import RaceIcon from '@/components/RaceIcon.vue';
import SignupDialog from '@/components/SignupDialog.vue';
import StageView from '@/components/StageView.vue';
import StatusAlert from '@/components/StatusAlert.vue';
import { placeIcon, placeMedal, placings } from '@/helpers/awards.mjs';
import { byPlayer, bySeed, bySignup, entrantName, raceRows, rostersByEntrant, signupCount } from '@/helpers/entrants.mjs';
import {
  FORMATS, SCHEDULING_MODES, SERIES_PER_ENTRANT_PER_ROUND, seriesPerEntrant, seriesPerFixture,
  stateOf, titleOf,
} from '@/helpers/event-labels.mjs';
import {
  actOnEvent, blocksHint, eventActionButton, HIDE_RESULTS, hideResultsStored, storeHideResults,
} from '@/helpers/events.mjs';
import { myRaces } from '@/helpers/koth.mjs';
import { raceWrapper } from '@/helpers/races.js';
import { saveReturnUrl } from '@/helpers/return-url.mjs';
import { router } from '@/helpers/router.js';
import { seasonSlug } from '@/helpers/season-slug.mjs';
import { useAuthStore, useEventStore, useTeamStore } from '@/stores';

const route = useRoute();
const auth = useAuthStore();
const store = useEventStore();
const teamStore = useTeamStore();
const event = ref(null);
const leagues = ref([]);
const entrants = ref([]);
const rosters = ref({});  // the players each team entrant fields, so a series box names them
const row = ref(null);  // the caller's own row of /me/events; null for a reader who is not logged in
const loading = ref(true);
const acting = ref(false);  // true, or the race on its way out
const answering = ref(false);
const stageData = ref({});
const dialog = ref(null);
const draw = ref(null);
// the wizard lands here when the event was written but its divisions were not
const error = ref(route.query.divisions === 'unsaved'
  ? 'The event was created, but its divisions were not saved.' : null);

// The switch is per viewer and per browser, not per event, and every stage drawing reads it
const hideResults = ref(hideResultsStored());
provide(HIDE_RESULTS, hideResults);
watch(hideResults, (on) => storeHideResults(on));

const anonymous = computed(() => !auth.me);
// A GNL season signs up on its own page, so it offers no entrant action here
const keepsEntrants = computed(() => event.value?.kind !== 'gnl');
const button = computed(() => (keepsEntrants.value ? eventActionButton(row.value?.action) : null));
const league = computed(() => leagues.value.find((r) => r.id === event.value?.league_id) || null);
const stages = computed(() => [...(event.value?.stages || [])].sort((a, b) => a.position - b.position));
const seedsLocked = computed(() => stages.value.some((stage) => stage.seeds_locked_at));
// An event that plays no stage is a sign-up list: the entrants are the whole page
const signupOnly = computed(() => !!event.value && !stages.value.length);
const hint = computed(() => blocksHint(row.value));
const held = computed(() => myRaces(entrants.value, auth.me?.user?.id));
// The chip counts players: a player on two races holds two rows and is one entrant
const entered = computed(() => (entrants.value.length ? byPlayer(entrants.value).length : event.value?.entrant_count ?? 0));

const solo = (item) => !raceRows(item).length;
const raceName = (race) => raceWrapper.getRaceObject(race)?.name || race;
const divisionName = (row) => {
  const division = (event.value?.divisions || []).find((band) => band.id === row.division_id);
  return division ? division.name || `Division ${division.position}` : null;
};

// A fixture pairs two team entrants, so a solo event reads no fixture chip
const fixtureSeries = computed(() => seriesPerFixture(event.value));

// A phone drops the format, the series count and the scheduling columns, so they ride under the name
const phoneLine = (stage) => [
  titleOf(FORMATS, stage.format),
  seriesPerEntrant(stage) ? `${seriesPerEntrant(stage)} series each entrant a round` : null,
  titleOf(SCHEDULING_MODES, stage.scheduling_mode),
].filter(Boolean).join(' · ');

// Only the stages that hold series are drawn; the table above lists every stage
const drawn = computed(() => stages.value
  .map((stage) => ({ ...stage, ...(stageData.value[stage.id] || {}) }))
  .filter((stage) => stage.series?.length));

// Closing an event freezes the table of its last stage as the places it awards, so a
// finished event names its champion and every other place off that table.
const places = computed(() => (stateOf(event.value) !== 'finished'
  ? {} : placings(drawn.value.at(-1)?.standings || [])));

const logIn = () => {
  saveReturnUrl(route.fullPath);
  router.push('/login');
};

// One action word, one thing to do. The dialog and the draw are this page's own; every
// other word goes through the shared act.
const act = async (race = null) => {
  const action = row.value?.action;
  if (action === 'sign_up') return dialog.value.open();
  if (action === 'view') return draw.value?.scrollIntoView({ behavior: 'smooth' });
  acting.value = race ?? true;
  error.value = await actOnEvent(action, {
    store, eventId: event.value.id, row: row.value, reload, race, raceName: race && raceName(race),
  });
  acting.value = false;
};

// The caller answers the next round himself; the hint only said what his blocks cover
const answerBlocked = async () => {
  answering.value = true;
  try {
    await store.answerRound(row.value, false);
    await reload();
  } catch (e) {
    error.value = `That did not go through: ${e.message}`;
  } finally {
    answering.value = false;
  }
};

// The entrant list and the caller's own row move together: a signup changes both
const reload = async () => {
  const [rows, mine] = await Promise.all([
    store.fetchEntrants(event.value.id),
    // the caller's row lives behind a login; a read that fails says so instead of reading as closed
    auth.me ? store.myEvents().catch((e) => {
      error.value = `Your own entry did not load: ${e.message}`;
      return [];
    }) : Promise.resolve([]),
  ]);
  entrants.value = signupOnly.value ? bySignup(rows) : bySeed(rows);
  row.value = mine.find((r) => r.id === event.value.id) ?? null;
  // only a team event fields rosters, so nothing else pays for the read
  if (event.value.entrant_kind === 'team') {
    await teamStore.fetchTeamsBySeason(event.value.id).catch(() => {});
    rosters.value = rostersByEntrant(rows, teamStore.teams, event.value.id);
  }
};

onMounted(async () => {
  try {
    [event.value, leagues.value] = await Promise.all([
      store.fetchEvent(route.params.id),
      store.fetchLeagues(),
    ]);
    await reload();
    await Promise.all(stages.value.map(async (stage) => {
      // A stage nobody has generated answers nothing, and its drawing stays off the page
      const [rows, table] = await Promise.all([
        store.fetchStage(event.value.id, stage.id).catch(() => null),
        store.fetchStandings(event.value.id, stage.id).catch(() => []),
      ]);
      if (rows) stageData.value[stage.id] = { ...rows, standings: table };
    }));
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
.seed {
  min-width: 2ch;
  text-align: right;
  font-variant-numeric: tabular-nums;
}
.note {
  max-width: 70ch;
  white-space: pre-line;
}
</style>
