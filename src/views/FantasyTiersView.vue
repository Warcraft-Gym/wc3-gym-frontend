<template>
  <v-overlay v-model="isLoading" contained class="align-center justify-center">
    <v-progress-circular color="primary" indeterminate size="64"></v-progress-circular>
  </v-overlay>

  <v-container fluid class="pa-4">
    <v-row class="mb-2" align="center">
      <v-col>
        <h1><v-icon class="mr-2">mdi-trophy-variant</v-icon> Fantasy player tiers</h1>
        <p class="text-medium-emphasis">Cut the {{ seasonName }} roster into {{ tierCount }} tiers by <W3CMmr /></p>
      </v-col>
      <v-col cols="12" md="auto" class="d-flex flex-wrap ga-2 align-center">
        <SeasonSelect />
        <v-select
          v-model="tierCount"
          :items="TIER_COUNTS"
          label="Tiers"
          density="compact"
          variant="outlined"
          hide-details
          class="tier-count"
          :disabled="locked"
        />
        <v-btn v-if="phase !== 'open'" variant="outlined" :prepend-icon="locked ? 'mdi-lock-open-variant' : 'mdi-lock'" @click="locked = !locked">{{ locked ? 'Unlock' : 'Lock' }}</v-btn>
        <v-btn variant="outlined" prepend-icon="mdi-scale-balance" :disabled="locked || !rows.length" @click="evenSplit">Even split</v-btn>
        <v-btn color="primary" prepend-icon="mdi-content-save" :loading="isSaving" :disabled="locked || isSaving || !rows.length" @click="applyTiers">Apply tiers</v-btn>
      </v-col>
    </v-row>

    <!-- One alert carries both the season's lock state and the stored-tier state; the lock itself sits with the other controls -->
    <v-alert v-if="tierState || phase !== 'open'" :type="tierState?.type ?? 'info'" variant="tonal" density="compact" class="mb-4">
      <template v-if="phase !== 'open'">{{ seasonName }} has {{ phase === 'complete' ? 'ended' : 'commenced' }}, so its tiers are {{ locked ? 'locked' : 'unlocked' }}. </template>{{ tierState?.text }}
    </v-alert>
    <StatusAlert v-model="errorMessage" />
    <StatusAlert v-model="successMessage" type="success" />

    <v-card elevation="2" class="mb-4 pa-4">
      <DivisionBracketing v-model:cuts="cuts" :players="stripPlayers" :names="names" :colors="colors" :domain="domain" :stored="stored" :disabled="locked" />
    </v-card>

    <v-card elevation="2">
      <GroupedTable :columns="columns" :groups="groups" empty="No players on a team this season">
        <template #head.mmr><W3CMmr /></template>
        <template #group="{ group }">
          <td :colspan="columns.length">
            <v-chip size="small" :color="group.color" variant="flat" class="mr-2">{{ group.title }}</v-chip>
            <span class="text-medium-emphasis mr-2">{{ group.rows.length }} {{ group.rows.length === 1 ? 'player' : 'players' }}</span>
            <span class="text-disabled">{{ group.range }}</span>
          </td>
        </template>
        <template #rows="{ group }">
          <tr v-for="row in group.rows" :key="row.id" class="detail-row">
            <td></td>
            <td><PlayerName :player="row.player" :race="row.race" /></td>
            <td class="text-right">{{ row.mmr || '—' }}</td>
            <td>{{ row.team }}</td>
            <td>
              <v-chip v-if="row.player.fantasy_tier" size="x-small" :variant="row.player.fantasy_tier_pinned ? 'flat' : 'outlined'" :prepend-icon="row.player.fantasy_tier_pinned ? 'mdi-pin' : undefined">T{{ row.player.fantasy_tier }}</v-chip>
            </td>
            <td>
              <v-select
                :model-value="moves[row.id] ?? null"
                :items="moveItems"
                density="compact"
                variant="outlined"
                hide-details
                class="move-select"
                :disabled="locked"
                @update:model-value="move(row.id, $event)"
              />
            </td>
          </tr>
        </template>
      </GroupedTable>
    </v-card>
  </v-container>
</template>

<script setup>
import { computed, ref, watch } from 'vue';
import { storeToRefs } from 'pinia';
import { useLadderStore, usePlayerStore, useSeasonStore, useTeamStore } from '@/stores';
import DivisionBracketing from '@/components/DivisionBracketing.vue';
import GroupedTable from '@/components/GroupedTable.vue';
import PlayerName from '@/components/PlayerName.vue';
import SeasonSelect from '@/components/SeasonSelect.vue';
import StatusAlert from '@/components/StatusAlert.vue';
import W3CMmr from '@/components/W3CMmr.vue';
import { bandOf, domainOf, quantileCuts, rangeText } from '@/helpers/divisions.mjs';
import { resolveCurrentW3CSeason } from '@/helpers/current-season';
import { ALL_COLORS, ALL_NAMES, tierChanges } from '@/helpers/tiers.mjs';
import { getW3CStatsWithFallback } from '@/helpers/w3c-stats';

// Bands ascend by MMR; tier numbers descend, so the top band is always tier 1.
// A season cutting fewer tiers drops the lowest names, so tier 1 stays Diamond.
const TIER_COUNTS = [2, 3, 4, 5, 6];

const ladderStore = useLadderStore();
const playerStore = usePlayerStore();
const seasonStore = useSeasonStore();
const teamStore = useTeamStore();

const { selectedSeasonId: currentSeasonId } = storeToRefs(seasonStore);

const isLoading = ref(true);
const isSaving = ref(false);
const errorMessage = ref(null);
const successMessage = ref(null);
const currentSeason = ref(null);
// A commenced season's tiers are locked until the admin unlocks them: moving a cut moves drafted players
const locked = ref(false);
const seasonName = computed(() => currentSeason.value?.name ?? 'season');
const phase = computed(() => currentSeason.value?.phase ?? 'open');
const currentW3CSeason = ref(null);
const tierCount = ref(ALL_NAMES.length);
const signups = ref([]);
const cuts = ref([]);
const moves = ref({}); // player id -> band pinned by hand

const names = computed(() => ALL_NAMES.slice(-tierCount.value));
const colors = computed(() => ALL_COLORS.slice(-tierCount.value));
const tierOf = (band) => tierCount.value - band;

const columns = [
  { key: 'name', title: 'Player' },
  { key: 'mmr', title: 'W3C MMR', align: 'right' },
  { key: 'team', title: 'Team' },
  { key: 'tier', title: 'Tier' },
  { key: 'move', title: 'Move to' },
];
const moveItems = computed(() => [
  { title: 'By MMR', value: null },
  ...names.value.map((n, i) => ({ title: `Tier ${tierOf(i)} · ${n}`, value: i })).reverse(),
]);

// The pool: every signup on a team this season, with its team name
const rows = computed(() => {
  const teamOf = new Map();
  for (const team of teamStore.teams || []) {
    for (const p of team.player_by_season?.[currentSeasonId.value] || []) teamOf.set(p.id, team.name);
  }
  return signups.value
    .filter((p) => teamOf.has(p.id))
    .map((p) => ({
      id: p.id,
      player: p,
      race: p.signup_race,
      mmr: getW3CStatsWithFallback(p, p.signup_race, currentW3CSeason.value)?.mmr ?? 0,
      team: teamOf.get(p.id),
    }));
});
const domain = computed(() => domainOf(rows.value.map((r) => r.mmr)));
const bandFor = (row) => moves.value[row.id] ?? (row.mmr > 0 ? bandOf(row.mmr, cuts.value) : null);
const stripPlayers = computed(() =>
  rows.value.map((r) => ({ id: r.id, label: r.player.name, mmr: r.mmr, band: bandFor(r), pinned: r.id in moves.value })),
);
const groups = computed(() => {
  const banded = names.value.map((name, i) => ({
    key: i,
    title: `Tier ${tierOf(i)} · ${name}`,
    color: colors.value[i],
    range: rangeText(i, cuts.value),
    rows: rows.value.filter((r) => bandFor(r) === i).sort((a, b) => b.mmr - a.mmr),
  })).reverse();
  const none = rows.value.filter((r) => bandFor(r) === null);
  return none.length ? [...banded, { key: 'none', title: 'No W3C MMR', color: 'tag', range: 'not applied, move by hand', rows: none }] : banded;
});

// What the last Apply wrote, so the page can say whether the chart still matches it
const stored = computed(() => currentSeason.value?.fantasy_tier_cuts ?? []);
// A stored pin comes back on the signup as a tier number; a live pin is a band index
const storedPins = computed(() =>
  Object.fromEntries(signups.value.filter((p) => p.fantasy_tier_pinned).map((p) => [p.id, p.fantasy_tier])),
);
const livePins = computed(() => Object.fromEntries(Object.entries(moves.value).map(([id, band]) => [id, tierOf(band)])));
const changes = computed(() => tierChanges(cuts.value, stored.value, names.value, livePins.value, storedPins.value));
const tierState = computed(() => {
  if (isLoading.value || !currentSeason.value) return null;  // a half-loaded page would call the old cuts a change
  if (!stored.value.length) return { type: 'warning', text: `No tiers are stored for ${seasonName.value}. The chart proposes an even split of today's W3C MMR.` };
  if (changes.value.length) return { type: 'warning', text: `Changed since the last Apply: ${changes.value.join('; ')}.` };
  return { type: 'success', text: `These ${tierCount.value} tiers are the ones stored for ${seasonName.value}.` };
});

const evenSplit = () => {
  cuts.value = quantileCuts(rows.value.map((r) => r.mmr), tierCount.value);
};

// A pin is a band index, so it means something else after the count changes.
// Sync, so a load that sets the count and then the stored cuts keeps the cuts.
watch(tierCount, () => {
  moves.value = {};
  evenSplit();
}, { flush: 'sync' });
const move = (id, band) => {
  const next = { ...moves.value };
  if (band === null) delete next[id];
  else next[id] = band;
  moves.value = next;
};

const loadData = async () => {
  if (!currentSeasonId.value) return;  // the picker resolves one
  isLoading.value = true;
  errorMessage.value = null;
  successMessage.value = null;
  moves.value = {};
  try {
    const season = await seasonStore.fetchSeason(currentSeasonId.value);
    currentSeason.value = season;
    locked.value = phase.value !== 'open';
    currentW3CSeason.value = await resolveCurrentW3CSeason();
    signups.value = (await seasonStore.fetchSeasonSignups(currentSeasonId.value)) || [];
    await teamStore.fetchTeamsBySeason(currentSeasonId.value);
    // The page reopens on the cuts the last Apply wrote, once there are any
    if (season.fantasy_tier_cuts.length) {
      tierCount.value = season.fantasy_tier_cuts.length + 1;
      cuts.value = season.fantasy_tier_cuts;
      // A tier set by hand comes back as its pin; the rest follow the MMR
      moves.value = Object.fromEntries(
        signups.value.filter((p) => p.fantasy_tier_pinned).map((p) => [p.id, tierCount.value - p.fantasy_tier]),
      );
    } else evenSplit();
  } catch (error) {
    console.error('Error loading data:', error);
    errorMessage.value = 'Failed to load player data. Please try again.';
  } finally {
    isLoading.value = false;
  }
};

const applyTiers = async () => {
  // Only a pin is written; every other tier is read from the MMR on today's date
  const allocation = {};
  for (const row of rows.value) if (row.id in moves.value) allocation[row.id] = tierOf(moves.value[row.id]);
  const pinned = Object.keys(allocation).length;
  // A commenced season's drafted rosters follow the tiers, so the confirm says so
  const commenced = phase.value !== 'open' ? ' This season has started: tiers already drafted against will move.' : '';
  if (!confirm(`Write ${tierCount.value} tiers, ${pinned} set by hand? Every other player follows their W3C MMR as of today.${commenced}`)) return;

  isSaving.value = true;
  errorMessage.value = null;
  successMessage.value = null;
  try {
    // The cuts carry the count, so one request replaces the whole allocation
    await playerStore.updateFantasyTiers(currentSeasonId.value, cuts.value, allocation);
    // The tiers read from the stored ladder matches, so the pool is synced up to today
    const sync = await ladderStore.syncSeason(currentSeasonId.value);
    const synced = `${sync.synced.length} of ${sync.synced.length + sync.skipped.length + sync.failed.length} players synced`;
    successMessage.value = `${tierCount.value} tiers written, ${pinned} set by hand. ${synced}.`;
    // The page re-reads what it wrote, so the stored-tier alert stops warning
    currentSeason.value = await seasonStore.fetchSeason(currentSeasonId.value);
    signups.value = (await seasonStore.fetchSeasonSignups(currentSeasonId.value)) || [];
  } catch (error) {
    console.error('Error applying tier allocation:', error);
    errorMessage.value = 'Failed to apply tier allocation. Please try again.';
  } finally {
    isSaving.value = false;
  }
};

watch(currentSeasonId, loadData, { immediate: true });
</script>

<style scoped>
.move-select {
  max-width: 200px;
}
.tier-count {
  max-width: 110px;
}
</style>
