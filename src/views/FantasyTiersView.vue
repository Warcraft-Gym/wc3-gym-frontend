<template>
  <v-overlay v-model="isLoading" contained class="align-center justify-center">
    <v-progress-circular color="primary" indeterminate size="64"></v-progress-circular>
  </v-overlay>

  <v-container fluid class="pa-4">
    <v-row class="mb-2" align="center">
      <v-col>
        <h1><v-icon class="mr-2">mdi-trophy-variant</v-icon> Fantasy Player Tiers</h1>
        <p class="text-grey">Cut the season's roster into six tiers by <W3CMmr /></p>
      </v-col>
      <v-col cols="auto" class="d-flex ga-2">
        <v-btn variant="outlined" prepend-icon="mdi-scale-balance" :disabled="!rows.length" @click="evenSplit">Even split</v-btn>
        <v-btn color="primary" prepend-icon="mdi-content-save" :loading="isSaving" :disabled="isSaving || !rows.length" @click="applyTiers">Apply tiers</v-btn>
      </v-col>
    </v-row>

    <StatusAlert v-model="errorMessage" />
    <StatusAlert v-model="successMessage" type="success" />

    <v-card elevation="2" class="mb-4 pa-4">
      <DivisionBracketing v-model:cuts="cuts" :players="stripPlayers" :names="NAMES" :colors="COLORS" :domain="domain" />
    </v-card>

    <v-card elevation="2">
      <GroupedTable :columns="columns" :groups="groups" empty="No players on a team this season">
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
              <v-chip v-if="row.player.fantasy_tier" size="x-small" variant="outlined">T{{ row.player.fantasy_tier }}</v-chip>
            </td>
            <td>
              <v-select
                :model-value="moves[row.id] ?? null"
                :items="moveItems"
                density="compact"
                variant="outlined"
                hide-details
                class="move-select"
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
import { computed, onMounted, ref } from 'vue';
import { usePlayerStore, useSeasonStore, useTeamStore } from '@/stores';
import DivisionBracketing from '@/components/DivisionBracketing.vue';
import GroupedTable from '@/components/GroupedTable.vue';
import PlayerName from '@/components/PlayerName.vue';
import StatusAlert from '@/components/StatusAlert.vue';
import W3CMmr from '@/components/W3CMmr.vue';
import { bandOf, domainOf, quantileCuts, rangeText } from '@/helpers/divisions.mjs';
import { resolveCurrentSeasonId, resolveCurrentW3CSeason } from '@/helpers/current-season';
import { getW3CStatsWithFallback } from '@/helpers/w3c-stats';

// Bands ascend by MMR; tier numbers descend, so band 0 is tier 6
const NAMES = ['Grass', 'Bronze', 'Silver', 'Gold', 'Platinum', 'Diamond'];
const COLORS = ['#9E9E9E', '#795548', '#FF9800', '#4CAF50', '#2196F3', '#9C27B0'];
const tierOf = (band) => NAMES.length - band;

const playerStore = usePlayerStore();
const seasonStore = useSeasonStore();
const teamStore = useTeamStore();

const isLoading = ref(true);
const isSaving = ref(false);
const errorMessage = ref(null);
const successMessage = ref(null);
const currentSeasonId = ref(null);
const currentW3CSeason = ref(null);
const signups = ref([]);
const cuts = ref([]);
const moves = ref({}); // player id -> band pinned by hand

const columns = [
  { key: 'name', title: 'Player' },
  { key: 'mmr', title: 'W3C MMR', align: 'right' },
  { key: 'team', title: 'Team' },
  { key: 'stored', title: 'Stored tier' },
  { key: 'move', title: 'Move to' },
];
const moveItems = [{ title: 'By MMR', value: null }, ...NAMES.map((n, i) => ({ title: `Tier ${tierOf(i)} · ${n}`, value: i })).reverse()];

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
  const banded = NAMES.map((name, i) => ({
    key: i,
    title: `Tier ${tierOf(i)} · ${name}`,
    color: COLORS[i],
    range: rangeText(i, cuts.value),
    rows: rows.value.filter((r) => bandFor(r) === i).sort((a, b) => b.mmr - a.mmr),
  })).reverse();
  const none = rows.value.filter((r) => bandFor(r) === null);
  return none.length ? [...banded, { key: 'none', title: 'No W3C MMR', color: 'grey', range: 'not applied, move by hand', rows: none }] : banded;
});

const evenSplit = () => {
  cuts.value = quantileCuts(rows.value.map((r) => r.mmr), NAMES.length);
};
const move = (id, band) => {
  const next = { ...moves.value };
  if (band === null) delete next[id];
  else next[id] = band;
  moves.value = next;
};

const loadData = async () => {
  isLoading.value = true;
  errorMessage.value = null;
  try {
    currentSeasonId.value = await resolveCurrentSeasonId();
    currentW3CSeason.value = await resolveCurrentW3CSeason();
    if (currentSeasonId.value) {
      signups.value = (await seasonStore.fetchSeasonSignups(currentSeasonId.value)) || [];
      await teamStore.fetchTeamsBySeason(currentSeasonId.value);
    }
    evenSplit();
  } catch (error) {
    console.error('Error loading data:', error);
    errorMessage.value = 'Failed to load player data. Please try again.';
  } finally {
    isLoading.value = false;
  }
};

const applyTiers = async () => {
  const allocation = {};
  for (const row of rows.value) {
    const band = bandFor(row);
    if (band !== null) allocation[row.id] = tierOf(band);
  }
  const skipped = rows.value.length - Object.keys(allocation).length;
  const note = skipped ? ` ${skipped} without a W3C MMR keep no tier.` : '';
  if (!confirm(`Write tiers for ${Object.keys(allocation).length} players? Every other player loses their tier.${note}`)) return;

  isSaving.value = true;
  errorMessage.value = null;
  successMessage.value = null;
  try {
    await playerStore.updateFantasyTiers(allocation); // one request replaces the whole allocation
    successMessage.value = `Tiers written for ${Object.keys(allocation).length} players.`;
    signups.value = (await seasonStore.fetchSeasonSignups(currentSeasonId.value)) || [];
  } catch (error) {
    console.error('Error applying tier allocation:', error);
    errorMessage.value = 'Failed to apply tier allocation. Please try again.';
  } finally {
    isSaving.value = false;
  }
};

onMounted(loadData);
</script>

<style scoped>
.move-select {
  max-width: 200px;
}
</style>
