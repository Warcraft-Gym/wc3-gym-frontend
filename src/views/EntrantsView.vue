<!-- Who is in one event: the list an admin runs the signups from, and the read a member
     gets without any of the controls. The MMR strip cuts the divisions, the table seeds
     them, and a phone reads the same rows as cards. -->
<template>
  <v-container fluid class="pa-4">
    <div class="d-flex flex-wrap align-center ga-3">
      <h1 class="text-h5 text-md-h3 font-weight-bold">Entrants</h1>
      <v-chip size="small" variant="tonal" prepend-icon="mdi-account-multiple">{{ live.length }} entered</v-chip>
      <v-chip v-if="seedsLocked" size="small" variant="tonal" color="secondary" prepend-icon="mdi-lock">seeds locked</v-chip>
      <v-spacer />
      <v-btn v-if="isAdmin" color="primary" prepend-icon="mdi-account-plus" :disabled="loading" @click="openAdd">Add entrant</v-btn>
    </div>
    <RouterLink v-if="event" class="text-medium-emphasis" :to="`/events/${eventId}`">{{ eventName }}</RouterLink>

    <StatusAlert v-model="error" class="mt-4" />
    <StatusAlert v-model="saved" type="success" class="mt-4" />
    <v-progress-linear v-if="loading" indeterminate class="mt-4" />

    <template v-if="event">
      <v-card v-if="isAdmin" elevation="2" class="mt-4 pa-4">
        <div class="d-flex flex-wrap align-center ga-2 mb-2">
          <span class="text-medium-emphasis">Cut the entrants into divisions by <W3CMmr /></span>
          <v-spacer />
          <v-select
            v-model="divisionCount"
            :items="DIVISION_COUNTS"
            label="Divisions"
            density="compact"
            variant="outlined"
            hide-details
            class="count-field"
          />
          <v-btn variant="outlined" prepend-icon="mdi-scale-balance" :disabled="!rated.length" @click="evenSplit">Even split</v-btn>
          <v-btn variant="outlined" prepend-icon="mdi-content-save" :loading="busy === 'divisions'" @click="saveDivisions">Save divisions</v-btn>
          <v-btn color="primary" prepend-icon="mdi-arrow-split-vertical" :loading="busy === 'assign'" :disabled="!event.divisions.length" @click="assign">Assign from MMR</v-btn>
        </div>
        <DivisionBracketing
          v-model:cuts="cuts"
          :players="stripPlayers"
          :names="names"
          :colors="colors"
          :domain="domain"
          :stored="storedCuts"
        />
      </v-card>

      <div v-if="isAdmin" class="d-flex flex-wrap align-center ga-2 mt-4">
        <v-select
          v-if="stages.length > 1"
          v-model="stageId"
          :items="stages"
          item-title="label"
          item-value="id"
          label="Stage"
          density="compact"
          variant="outlined"
          hide-details
          class="stage-field"
        />
        <span v-if="seedsLocked" class="text-medium-emphasis">The seeds of this stage are locked.</span>
        <v-spacer />
        <v-btn variant="outlined" prepend-icon="mdi-sort-numeric-ascending" :loading="busy === 'mmr'" :disabled="seedsLocked || !stageId" @click="seedBy('mmr')">Seed by MMR</v-btn>
        <v-btn variant="outlined" prepend-icon="mdi-shuffle-variant" :loading="busy === 'random'" :disabled="seedsLocked || !stageId" @click="seedBy('random')">Shuffle</v-btn>
        <v-btn v-if="hasPreviousStage" variant="outlined" prepend-icon="mdi-arrow-right-bold-outline" :loading="busy === 'previous_stage'" :disabled="seedsLocked || !stageId" @click="seedBy('previous_stage')">Seed from the previous stage</v-btn>
        <v-btn variant="outlined" prepend-icon="mdi-lock" :loading="busy === 'lock'" :disabled="seedsLocked || !stageId" @click="lock">Lock seeds</v-btn>
      </div>

      <!-- The table carries the identities and the seed handles; a phone reads the cards below -->
      <v-card elevation="2" class="mt-4 d-none d-md-block">
        <GroupedTable :columns="columns" :groups="groups" default-open empty="Nobody has entered yet." >
          <template #head.mmr><W3CMmr /></template>
          <template #group="{ group }">
            <td :colspan="columns.length">
              <v-icon size="12" :color="colorOf(group)" class="mr-2">mdi-circle</v-icon>
              <span class="font-weight-bold mr-2">{{ group.title }}</span>
              <span class="text-medium-emphasis">{{ group.rows.length }} {{ group.rows.length === 1 ? 'entrant' : 'entrants' }}</span>
            </td>
          </template>
          <template #rows="{ group }">
            <tr
              v-for="row in group.rows"
              :key="row.id"
              class="detail-row"
              :class="{ withdrawn: row.withdrawn_at, dragging: dragged === row.id }"
              :draggable="canReorder"
              @dragstart="dragged = row.id"
              @dragover.prevent
              @drop.prevent="drop(group, row)"
              @dragend="dragged = null"
            >
              <td>
                <v-icon v-if="canReorder" size="18" class="grip" aria-hidden="true">mdi-drag-horizontal-variant</v-icon>
              </td>
              <td>
                <PlayerName v-if="row.user" :player="row.user" :race="row.race" />
                <template v-else-if="row.team">
                  <span class="font-weight-medium">{{ row.team.name }}</span>
                  <div class="roster text-caption">
                    <PlayerName v-for="seat in rosterFor(row)" :key="seat.player.id" :player="seat.player" :race="seat.race">
                      <v-icon v-if="seat.captain" size="14" color="primary-text" title="Captain">mdi-star</v-icon>
                    </PlayerName>
                    <span v-if="!rosterFor(row).length" class="text-medium-emphasis">No roster for this event</span>
                  </div>
                </template>
              </td>
              <td class="text-right">
                <span v-if="entrantMmr(row)">
                  {{ entrantMmr(row) }}
                  <v-tooltip activator="parent" location="top">{{ mmrText(row) }}</v-tooltip>
                </span>
                <span v-else class="text-medium-emphasis">—</span>
              </td>
              <!-- A team has no identity of its own; the three columns belong to a player -->
              <td :class="{ 'text-medium-emphasis': !row.user?.battleTag }">
                {{ row.user ? row.user.battleTag || 'Not linked' : '—' }}
              </td>
              <td :class="{ 'text-medium-emphasis': !row.user?.discordTag }">
                {{ row.user ? row.user.discordTag || 'Not linked' : '—' }}
              </td>
              <!-- The W3C name is the battle tag, so this column answers whether w3champions
                   knows it rather than printing the same string twice -->
              <td>
                <a v-if="w3cName(row)" :href="w3cPlayerUrl(w3cName(row))" target="_blank" rel="noopener noreferrer">
                  Linked
                  <v-tooltip activator="parent" location="top">{{ w3cName(row) }}</v-tooltip>
                </a>
                <span v-else class="text-medium-emphasis">{{ row.user ? 'Not linked' : '—' }}</span>
              </td>
              <td>
                <v-chip
                  v-for="code in row.warnings"
                  :key="code"
                  size="x-small"
                  color="warning"
                  variant="tonal"
                  prepend-icon="mdi-alert"
                  class="mr-1"
                >{{ warningLabel(code, event) }}</v-chip>
              </td>
              <td class="text-right">
                <span v-if="row.seed">{{ row.seed }}</span>
                <span v-else class="text-medium-emphasis">—</span>
                <div v-if="seedsLocked && row.seed_source" class="text-caption text-medium-emphasis">{{ row.seed_source }}</div>
              </td>
              <td class="text-no-wrap">
                <v-chip v-if="row.withdrawn_at" size="x-small" variant="tonal" color="draw" prepend-icon="mdi-close">withdrawn</v-chip>
                <v-chip v-else-if="row.checked_in_at" size="x-small" variant="tonal" color="success" prepend-icon="mdi-check">checked in</v-chip>
                <v-chip v-else size="x-small" variant="tonal" prepend-icon="mdi-account-clock">signed up</v-chip>
                <v-icon v-if="row.manual_placement" size="16" class="ml-1" aria-label="placed by hand">mdi-pin</v-icon>
              </td>
              <td v-if="isAdmin">
                <RowActions :actions="actionsFor(row)" />
              </td>
            </tr>
          </template>
        </GroupedTable>
      </v-card>

      <!-- A phone reads one card per entrant: who, the race, the MMR and what to look at -->
      <div class="d-md-none mt-4">
        <div v-for="group in groups" :key="group.key" class="mb-4">
          <div class="d-flex align-center ga-2 mb-2">
            <v-icon size="12" :color="colorOf(group)">mdi-circle</v-icon>
            <span class="font-weight-bold">{{ group.title }}</span>
            <span class="text-medium-emphasis">{{ group.rows.length }}</span>
          </div>
          <v-card v-for="row in group.rows" :key="row.id" variant="outlined" class="mb-2 pa-3" :class="{ withdrawn: row.withdrawn_at }">
            <div class="d-flex align-center ga-2">
              <span v-if="row.seed" class="text-medium-emphasis">{{ row.seed }}</span>
              <PlayerName v-if="row.user" :player="row.user" :race="row.race" />
              <span v-else-if="row.team" class="font-weight-medium">{{ row.team.name }}</span>
              <v-spacer />
              <span>{{ entrantMmr(row) || '—' }}</span>
            </div>
            <div v-if="row.team" class="roster text-caption mt-1">
              <PlayerName v-for="seat in rosterFor(row)" :key="seat.player.id" :player="seat.player" :race="seat.race">
                <v-icon v-if="seat.captain" size="14" color="primary-text" title="Captain">mdi-star</v-icon>
              </PlayerName>
              <span v-if="!rosterFor(row).length" class="text-medium-emphasis">No roster for this event</span>
            </div>
            <div class="d-flex flex-wrap ga-1 mt-2">
              <v-chip v-if="row.withdrawn_at" size="x-small" variant="tonal" color="draw" prepend-icon="mdi-close">withdrawn</v-chip>
              <v-chip v-else-if="row.checked_in_at" size="x-small" variant="tonal" color="success" prepend-icon="mdi-check">checked in</v-chip>
              <v-chip
                v-for="code in row.warnings"
                :key="code"
                size="x-small"
                color="warning"
                variant="tonal"
                prepend-icon="mdi-alert"
              >{{ warningLabel(code, event) }}</v-chip>
            </div>
          </v-card>
          <p v-if="!group.rows.length" class="text-medium-emphasis">Nobody is in this division.</p>
        </div>
        <p v-if="!groups.length" class="text-medium-emphasis">Nobody has entered yet.</p>
      </div>
    </template>

    <v-dialog v-model="adding" max-width="600">
      <v-card>
        <v-card-title class="bg-primary"><v-icon class="mr-2">mdi-account-plus</v-icon>Add entrant</v-card-title>
        <v-card-text class="pt-4">
          <v-autocomplete
            v-if="takesTeams"
            v-model="addTeamId"
            :items="teams"
            item-title="name"
            item-value="id"
            label="Team"
            variant="outlined"
            density="comfortable"
          >
            <template #item="{ props: itemProps, item }">
              <v-list-item v-bind="itemProps" :subtitle="rosterText(item.raw.id)" />
            </template>
          </v-autocomplete>
          <v-autocomplete
            v-else
            v-model="addPlayerId"
            :items="players"
            item-title="name"
            item-value="id"
            label="Player"
            variant="outlined"
            density="comfortable"
          >
            <template #selection="{ item }">
              <PlayerName :player="item.raw" plain />
            </template>
            <template #item="{ props: itemProps, item }">
              <v-list-item v-bind="itemProps" :title="null">
                <PlayerName :player="item.raw" plain />
              </v-list-item>
            </template>
          </v-autocomplete>
          <RaceSelect v-model="addRace" variant="outlined" density="comfortable" />
        </v-card-text>
        <v-card-actions>
          <v-spacer />
          <v-btn @click="adding = false">Cancel</v-btn>
          <v-btn
            color="primary"
            variant="elevated"
            prepend-icon="mdi-plus"
            :loading="busy === 'add'"
            :disabled="!addRace || !(takesTeams ? addTeamId : addPlayerId)"
            @click="addEntrant"
          >Add entrant</v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <v-dialog v-model="banning" max-width="420">
      <v-card>
        <v-card-title class="bg-error"><v-icon class="mr-2">mdi-gavel</v-icon>Ban this player</v-card-title>
        <v-card-text class="pt-4">
          {{ banTarget?.user?.name }} keeps this entry, and every entrant row of every event warns that the player is banned.
        </v-card-text>
        <v-card-actions>
          <v-spacer />
          <v-btn @click="banning = false">Cancel</v-btn>
          <v-btn color="error" variant="elevated" prepend-icon="mdi-gavel" :loading="busy === 'ban'" @click="ban">Ban player</v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>
  </v-container>
</template>

<script setup>
import { computed, onMounted, ref, watch } from 'vue';
import { RouterLink, useRoute } from 'vue-router';

import DivisionBracketing from '@/components/DivisionBracketing.vue';
import GroupedTable from '@/components/GroupedTable.vue';
import PlayerName from '@/components/PlayerName.vue';
import RaceSelect from '@/components/RaceSelect.vue';
import RowActions from '@/components/RowActions.vue';
import StatusAlert from '@/components/StatusAlert.vue';
import W3CMmr from '@/components/W3CMmr.vue';
import { bandOf, domainOf, quantileCuts } from '@/helpers/divisions.mjs';
import { bandNames, bandsPayload, cutsOf, entrantMmr, entrantName, groupByDivision, mergeSeeds, seedPayload, teamRoster, warningLabel } from '@/helpers/entrants.mjs';
import { eventLabel, timeText, titleOf, FORMATS } from '@/helpers/event-labels.mjs';
import { w3cPlayerUrl } from '@/helpers/w3c-stats';
import { useAuthStore, useEventStore, usePlayerStore, useTeamStore } from '@/stores';

// Five divisions is what the bronze scale has steps for, and more than that nobody runs
const DIVISION_COUNTS = [2, 3, 4, 5];
const RAMP = ['heat-1', 'heat-2', 'heat-3', 'heat-4', 'heat-5'];

const route = useRoute();
const auth = useAuthStore();
const store = useEventStore();
const playerStore = usePlayerStore();
const teamStore = useTeamStore();

const eventId = route.params.id;
const isAdmin = computed(() => auth.isAdmin);
const event = ref(null);
const entrants = ref([]);
const leagues = ref([]);
const players = ref([]);
// The pick list of the Add dialog; `rosters` holds the teams rostered for this event
const teams = ref([]);
const rosters = ref([]);
const loading = ref(true);
const error = ref(null);
const saved = ref(null);
const busy = ref(null);
const cuts = ref([]);
const divisionCount = ref(2);
const stageId = ref(null);
const dragged = ref(null);
const adding = ref(false);
const addPlayerId = ref(null);
const addTeamId = ref(null);
const addRace = ref(null);
const banning = ref(false);
const banTarget = ref(null);

const eventName = computed(() => {
  const league = leagues.value.find((row) => row.id === event.value?.league_id);
  return eventLabel(event.value, league);
});
const live = computed(() => entrants.value.filter((row) => !row.withdrawn_at));
const rated = computed(() => live.value.filter((row) => entrantMmr(row) > 0));
const groups = computed(() => groupByDivision(entrants.value, event.value?.divisions || []));
const stages = computed(() => [...(event.value?.stages || [])]
  .sort((a, b) => a.position - b.position)
  .map((stage) => ({ ...stage, label: stage.name || titleOf(FORMATS, stage.format) })));
const stage = computed(() => stages.value.find((row) => row.id === stageId.value) || null);
const seedsLocked = computed(() => !!stage.value?.seeds_locked_at);
// The standings of the stage before order these seeds, so the first stage is offered no button
const hasPreviousStage = computed(() => (stage.value?.position ?? 1) > 1);
const canReorder = computed(() => isAdmin.value && !seedsLocked.value);
const takesTeams = computed(() => event.value?.entrant_kind === 'team');

const columns = computed(() => [
  { key: 'player', title: 'Entrant' },
  { key: 'mmr', title: 'MMR', align: 'right' },
  { key: 'battle_tag', title: 'Battle tag', phone: false },
  { key: 'discord', title: 'Discord', phone: false },
  { key: 'w3c', title: 'W3C', phone: false },
  { key: 'eligibility', title: 'Eligibility' },
  { key: 'seed', title: 'Seed', align: 'right' },
  { key: 'status', title: 'Status' },
  ...(isAdmin.value ? [{ key: 'actions', title: '' }] : []),
]);

// The strip runs lowest MMR first, so the stored divisions read back in reverse
const names = computed(() => {
  const stored = bandNames(event.value?.divisions || []);
  if (stored.length === divisionCount.value) return stored;
  return Array.from({ length: divisionCount.value }, (unused, index) => `Division ${divisionCount.value - index}`);
});
// One bronze step per band, light to dark: a division is a band of amounts, not a category
const colors = computed(() => Array.from({ length: divisionCount.value },
  (unused, index) => RAMP[Math.round((index * (RAMP.length - 1)) / Math.max(1, divisionCount.value - 1))]));
const domain = computed(() => domainOf(live.value.map((row) => entrantMmr(row) || 0)));
const storedCuts = computed(() => cutsOf(event.value?.divisions || []));
const stripPlayers = computed(() => live.value.map((row) => ({
  id: row.id,
  label: entrantName(row),
  mmr: entrantMmr(row) || 0,
  band: entrantMmr(row) > 0 ? bandOf(entrantMmr(row), cuts.value) : null,
  pinned: row.manual_placement,
})));

const colorOf = (group) => {
  const at = (event.value?.divisions || []).findIndex((division) => division.id === group.id);
  return at === -1 ? 'draw' : colors.value[colors.value.length - 1 - at] || 'draw';
};
const rosterOfTeam = (teamId) => teamRoster(rosters.value.find((team) => team.id === teamId), eventId);
const rosterFor = (row) => rosterOfTeam(row.team?.id);
const rosterText = (teamId) => {
  const size = rosterOfTeam(teamId).length;
  return size ? `${size} ${size === 1 ? 'player' : 'players'}` : 'no roster for this event';
};
const w3cName = (row) => (row.user?.w3c_synced_at ? row.user.battleTag : null);
// A team is rated from its roster, so no one player's sync time answers for it
const mmrText = (row) => {
  if (row.mmr == null) return 'The rating the seed was cut from';
  if (row.team) return 'The mean of the ratings of its roster';
  return row.mmr_synced_at ? `Read from w3champions ${timeText(row.mmr_synced_at)}` : 'Never read from w3champions';
};

const evenSplit = () => {
  cuts.value = quantileCuts(live.value.map((row) => entrantMmr(row) || 0), divisionCount.value);
};
watch(divisionCount, (count) => {
  if (cuts.value.length !== count - 1) evenSplit();
});

const run = async (key, work, message) => {
  busy.value = key;
  error.value = null;
  saved.value = null;
  try {
    await work();
    if (message) saved.value = message;
  } catch (e) {
    error.value = e.message;
  } finally {
    busy.value = null;
  }
};

const readEntrants = async () => { entrants.value = await store.fetchEntrants(eventId); };

const saveDivisions = () => run('divisions', async () => {
  event.value = await store.setDivisions(eventId, bandsPayload(cuts.value, names.value));
  await readEntrants();  // the write clears every division a hand had placed
}, `${divisionCount.value} divisions saved. Assign the entrants to fill them.`);

const assign = () => run('assign', async () => {
  event.value = await store.assignDivisions(eventId);
  await readEntrants();
}, 'The entrants are cut into their divisions.');

const SEEDED = {
  mmr: 'Seeded by MMR.',
  random: 'The seeds are shuffled.',
  previous_stage: 'Seeded from the standings of the previous stage.',
};

const seedBy = (source) => run(source, async () => {
  entrants.value = mergeSeeds(entrants.value, await store.setSeeds(eventId, stageId.value, { source }));
}, SEEDED[source]);

const lock = () => run('lock', async () => {
  const locked = await store.lockSeeds(eventId, stageId.value);
  event.value.stages = event.value.stages.map((row) => (row.id === locked.id ? locked : row));
}, 'The seeds of this stage are locked.');

// A row dropped on another of the same division takes its place, and the whole order posts
const drop = (group, target) => {
  const ids = group.rows.map((row) => row.id);
  const from = ids.indexOf(dragged.value);
  const to = ids.indexOf(target.id);
  dragged.value = null;
  if (from === -1 || to === -1 || from === to) return;
  ids.splice(to, 0, ...ids.splice(from, 1));
  const byId = new Map(entrants.value.map((row) => [row.id, row]));
  ids.forEach((id, index) => { byId.get(id).seed = index + 1; });
  run('order', async () => {
    entrants.value = mergeSeeds(entrants.value, await store.setSeeds(eventId, stageId.value, seedPayload(groups.value)));
  }, 'The seed order is saved.');
};

const openAdd = async () => {
  adding.value = true;
  addPlayerId.value = null;
  addTeamId.value = null;
  addRace.value = null;
  try {
    if (takesTeams.value) { if (!teams.value.length) teams.value = await teamStore.getTeamsBasic(); }
    else if (!players.value.length) {
      if (!playerStore.players.length) await playerStore.fetchPlayers();
      players.value = playerStore.players;
    }
  } catch (e) {
    error.value = e.message;
  }
};
// The signup opens on the race the player's profile names
watch(addPlayerId, (id) => { addRace.value = players.value.find((row) => row.id === id)?.race ?? addRace.value; });

const addEntrant = () => run('add', async () => {
  const body = takesTeams.value ? { team_id: addTeamId.value, race: addRace.value } : { user_id: addPlayerId.value, race: addRace.value };
  await store.addEntrant(eventId, body);
  adding.value = false;
  await readEntrants();
}, 'The entrant is added.');

const askBan = (row) => { banTarget.value = row; banning.value = true; };
const ban = () => run('ban', async () => {
  await playerStore.banPlayer(banTarget.value.user.id);
  banning.value = false;
  await readEntrants();
}, 'The player is banned. Every entrant row of the event warns.');

const actionsFor = (row) => [
  !row.checked_in_at && !row.withdrawn_at && {
    icon: 'mdi-check', label: 'Check in', onClick: () => run('checkin', async () => {
      const updated = await store.checkIn(eventId, row.id);
      entrants.value = entrants.value.map((old) => (old.id === updated.id ? updated : old));
    }),
  },
  ...(event.value?.divisions || [])
    .filter((division) => division.id !== row.division_id)
    .map((division) => ({
      icon: 'mdi-arrow-right-bold-box-outline',
      label: `Move to ${division.name || `Division ${division.position}`}`,
      onClick: () => run('move', async () => {
        const updated = await store.placeEntrant(eventId, row.id, { division_id: division.id, manual_placement: true });
        entrants.value = entrants.value.map((old) => (old.id === updated.id ? updated : old));
      }),
    })),
  {
    icon: row.manual_placement ? 'mdi-pin-off' : 'mdi-pin',
    label: row.manual_placement ? 'Let the MMR place this entrant' : 'Keep this entrant where it is',
    onClick: () => run('pin', async () => {
      const updated = await store.placeEntrant(eventId, row.id, { division_id: row.division_id, manual_placement: !row.manual_placement });
      entrants.value = entrants.value.map((old) => (old.id === updated.id ? updated : old));
    }),
  },
  row.user && { icon: 'mdi-gavel', label: 'Ban player', color: 'error', onClick: () => askBan(row) },
  { icon: 'mdi-close', label: 'Remove', color: 'error', onClick: () => run('remove', async () => {
    await store.removeEntrant(eventId, row.id);
    entrants.value = entrants.value.filter((old) => old.id !== row.id);
  }) },
].filter(Boolean);

onMounted(async () => {
  try {
    [event.value, entrants.value, leagues.value] = await Promise.all([
      store.fetchEvent(eventId),
      store.fetchEntrants(eventId),
      store.fetchLeagues(),
    ]);
    stageId.value = stages.value[0]?.id ?? null;
    divisionCount.value = event.value.divisions.length || 2;
    cuts.value = storedCuts.value.length === divisionCount.value - 1 ? storedCuts.value : quantileCuts(live.value.map((row) => entrantMmr(row) || 0), divisionCount.value);
    if (takesTeams.value || entrants.value.some((row) => row.team)) {
      await teamStore.fetchTeamsBySeason(eventId);
      rosters.value = teamStore.teams;
    }
  } catch (e) {
    error.value = `The entrants did not load: ${e.message}`;
  } finally {
    loading.value = false;
  }
});
</script>

<style scoped>
.count-field { max-width: 130px; }
.stage-field { max-width: 240px; }
/* The roster sits under the team name, one line per screen width */
.roster { display: flex; flex-wrap: wrap; column-gap: 12px; row-gap: 2px; }
/* A withdrawn entrant keeps its row and reads back one step */
.withdrawn { opacity: var(--v-medium-emphasis-opacity); }
.grip { cursor: grab; }
.dragging { opacity: 0.4; }
</style>
