<!-- Tonight's KOTH night, open to everyone and drawn from the event reads: one column per
     bracket with its standing king, everyone signed up for it, and the chain the throne is
     played on. `?mode=clean` drops the two buttons, so the page can sit in a stream. -->
<template>
  <div class="night">
    <v-container fluid class="pa-6">
      <StatusAlert v-model="error" />
      <v-progress-linear v-if="loading" indeterminate />

      <div v-if="!event && !loading" class="text-center py-12 text-medium-emphasis">
        <v-icon size="64" class="text-disabled" icon="mdi-crown-outline" />
        <p class="text-h6 mt-3 mb-0">No night open tonight</p>
      </div>

      <template v-if="event">
        <EventHeader :event="event" />

        <div v-if="!cleanMode" class="d-flex flex-wrap align-center ga-3 mt-4">
          <v-btn v-if="event.signups_open && (!mine || (event.multi_entry && held.length < raceWrapper.races.length))" color="primary" variant="elevated" size="small"
            prepend-icon="mdi-account-plus" @click="dialog.open()">
            {{ mine ? 'Enter another race' : 'Sign up' }}
          </v-btn>
          <!-- A player on more than one race withdraws one race at a time -->
          <v-btn v-for="race in held.length > 1 ? held : []" :key="race" color="error" variant="tonal" size="small"
            prepend-icon="mdi-account-minus" :loading="withdrawing === race" @click="withdraw(race)">
            Withdraw {{ raceName(race) }}
          </v-btn>
          <v-btn v-if="mine && held.length < 2" color="error" variant="tonal" size="small" prepend-icon="mdi-account-minus"
            :loading="withdrawing === true" @click="withdraw()">
            Withdraw
          </v-btn>
          <v-chip size="small" variant="tonal" prepend-icon="mdi-account-multiple">
            {{ players }} entrants
          </v-chip>
        </div>

        <v-row class="mt-2">
          <v-col v-for="bracket in brackets" :key="bracket.id" cols="12" md="4">
            <v-card elevation="2" class="h-100">
              <v-card-title class="bg-primary">{{ bracket.name }}</v-card-title>

              <div class="king pa-4">
                <template v-if="bracket.king">
                  <v-icon size="28" icon="mdi-crown" class="crown" aria-hidden="true" />
                  <div>
                    <PlayerName class="text-h6" :player="bracket.king.user" :race="bracket.king.race" />
                    <div class="text-caption text-medium-emphasis">
                      {{ bracket.king.mmr ? `${bracket.king.mmr} MMR` : 'Holds the throne' }}
                    </div>
                  </div>
                </template>
                <div v-else class="text-medium-emphasis">No king yet</div>
              </div>

              <v-divider />

              <v-list v-if="bracket.entrants.length" density="compact" class="py-0">
                <v-list-item v-for="entrant in bracket.entrants" :key="entrant.id">
                  <div class="d-flex align-center ga-3">
                    <PlayerName v-if="entrant.user" :player="entrant.user" :race="solo(entrant) ? entrant.race : undefined" />
                    <span v-else>{{ entrantName(entrant) }}</span>
                    <span v-if="solo(entrant) && entrant.mmr" class="text-caption text-medium-emphasis">{{ entrant.mmr }} MMR</span>
                  </div>
                  <!-- A player on two races of one bracket sits once in its chain and reads once here -->
                  <div v-for="race in raceRows(entrant)" :key="race.id" class="d-flex align-center ga-2 pl-6 text-caption text-medium-emphasis">
                    <RaceIcon :raceIdentifier="race.race" />
                    <span>{{ raceName(race.race) }}</span>
                    <span v-if="race.mmr">{{ race.mmr }} MMR</span>
                  </div>
                </v-list-item>
              </v-list>
              <p v-else class="text-medium-emphasis px-4 py-3 mb-0">Nobody signed up yet</p>

              <div v-if="stage && bracket.chain.length" class="px-4 pb-2">
                <StageView :stage="stage" :series="bracket.chain" :rounds="rounds" :divisions="[bracket]"
                  @open-series="row => router.push(`/series/${row.id}`)" />
              </div>
            </v-card>
          </v-col>
        </v-row>

        <SignupDialog ref="dialog" :event="event" :held="held" @signed-up="load" />
      </template>
    </v-container>
  </div>
</template>

<script setup>
import { computed, onMounted, onUnmounted, ref } from 'vue';
import { useRoute } from 'vue-router';

import EventHeader from '@/components/EventHeader.vue';
import PlayerName from '@/components/PlayerName.vue';
import RaceIcon from '@/components/RaceIcon.vue';
import SignupDialog from '@/components/SignupDialog.vue';
import StageView from '@/components/StageView.vue';
import StatusAlert from '@/components/StatusAlert.vue';
import { byPlayer, bySeed, entrantName, raceRows } from '@/helpers/entrants.mjs';
import { myRaces, openNight } from '@/helpers/koth.mjs';
import { raceWrapper } from '@/helpers/races.js';
import { router } from '@/helpers/router.js';
import { inDivision, isScored } from '@/helpers/stage-view.mjs';
import { useAuthStore, useEventStore } from '@/stores';

const route = useRoute();
const auth = useAuthStore();
const store = useEventStore();

// A stream reads the brackets alone, so the clean page offers nothing to click
const cleanMode = computed(() => route.query.mode === 'clean');

const event = ref(null);
const entrants = ref([]);
const series = ref([]);
const rounds = ref([]);
const standings = ref([]);
const loading = ref(true);
const withdrawing = ref(false);  // true, or the race on its way out
const error = ref(null);
const dialog = ref(null);
let timer = null;

// A night plays one koth stage; a night nobody drew yet has none of its series
const stage = computed(() => [...(event.value?.stages || [])].sort((a, b) => a.position - b.position)[0] || null);
const standing = computed(() => entrants.value.filter((row) => !row.withdrawn_at));
// A player on two races is one entrant
const players = computed(() => byPlayer(standing.value).length);
const mine = computed(() => standing.value.find((row) => row.user?.id && row.user.id === auth.me?.user?.id) || null);
const held = computed(() => myRaces(standing.value, auth.me?.user?.id));

// One column per bracket, strongest first. The king is the top of the bracket's table,
// which the engine sorts him to once the chain has scored a series.
const brackets = computed(() => [...(event.value?.divisions || [])]
  .sort((a, b) => a.position - b.position)
  .map((division) => {
    const chain = inDivision(series.value, division.id);
    const top = standings.value.find((group) => group.division_id === division.id)?.rows?.[0];
    return {
      ...division,
      entrants: byPlayer(bySeed(standing.value.filter((row) => row.division_id === division.id))),
      king: chain.some(isScored) ? entrants.value.find((row) => row.id === top?.entrant_id) || null : null,
      chain,
    };
  }));

const solo = (item) => !raceRows(item).length;
const raceName = (race) => raceWrapper.getRaceObject(race)?.name || race;

const load = async () => {
  const night = openNight(await store.fetchEvents(null, 'koth'));
  if (!night) {
    event.value = null;
    return;
  }
  const [full, rows] = await Promise.all([store.fetchEvent(night.id), store.fetchEntrants(night.id)]);
  event.value = full;
  entrants.value = rows;
  const first = [...(full.stages || [])].sort((a, b) => a.position - b.position)[0];
  // A stage nobody drew yet answers nothing, and the columns show the signups alone
  const [drawn, table] = first
    ? await Promise.all([
      store.fetchStage(full.id, first.id).catch(() => null),
      store.fetchStandings(full.id, first.id).catch(() => []),
    ])
    : [null, []];
  series.value = drawn?.series || [];
  rounds.value = drawn?.rounds || [];
  standings.value = table;
};

const reload = async () => {
  try {
    await load();
    error.value = null;
  } catch (e) {
    error.value = `The night did not load: ${e.message}`;
  }
};

const withdraw = async (race = null) => {
  if (!confirm(race ? `Withdraw ${raceName(race)} from tonight?` : 'Withdraw from tonight?')) return;
  withdrawing.value = race ?? true;
  try {
    await store.withdraw(event.value.id, race);
    await load();
  } catch (e) {
    error.value = `The withdraw did not go through: ${e.message}`;
  } finally {
    withdrawing.value = false;
  }
};

onMounted(async () => {
  await reload();
  loading.value = false;
  // The page hangs on a stream all night, so it reads itself again every 30 seconds
  timer = setInterval(reload, 30000);
});

onUnmounted(() => clearInterval(timer));
</script>

<style scoped>
.night { background: rgb(var(--v-theme-background)); min-height: 100vh; }
.king { display: flex; align-items: center; gap: 12px; min-height: 84px; }
.crown { color: rgb(var(--v-theme-primary-text)); }
</style>
