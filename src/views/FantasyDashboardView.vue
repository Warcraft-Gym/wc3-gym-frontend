<template>
  <v-overlay v-model="isLoading" persistent absolute>
    <v-progress-circular indeterminate size="64" width="8" color="primary"></v-progress-circular>
  </v-overlay>

  <v-container fluid class="pa-4">
    <v-row class="mb-4">
      <v-col>
        <h1>
          <v-icon class="mr-2">mdi-trophy-variant</v-icon>
          Fantasy Dashboard
        </h1>
      </v-col>
      <v-col cols="12" sm="auto">
        <SeasonSelect />
      </v-col>
    </v-row>

    <StatusAlert v-model="errorMessage" />

    <v-alert v-if="successMessage" type="success" variant="tonal" border="start" border-color="success" class="mb-4" closable @click:close="successMessage = null">
      {{ successMessage }}
    </v-alert>

    <!-- Fantasy Team Card -->
    <v-card elevation="2" class="mb-6">
      <v-card-title class="bg-primary">
        <v-icon class="mr-2">mdi-account-group</v-icon>
        Fantasy Team
        <v-chip v-if="existingTeam" class="ml-3" size="small" color="white" variant="outlined">
          Registered
        </v-chip>
        <v-chip v-if="phase !== 'open'" class="ml-3" size="small" color="white" variant="outlined">
          {{ seasonName }} has {{ ended ? 'ended' : 'commenced' }}
        </v-chip>
      </v-card-title>
      <v-card-text class="pt-4">
                  
                  <!-- No team, and why the form is not here -->
                  <v-alert v-if="ended && !existingTeam" type="info" variant="tonal" class="mb-4">
                    You had no fantasy team in {{ seasonName }}.
                  </v-alert>
                  <v-alert v-else-if="phase !== 'open' && !existingTeam" type="info" variant="tonal" class="mb-4">
                    {{ seasonName }} has commenced. Fantasy team creation closed when its first series started.
                  </v-alert>
                  <v-alert v-else-if="!isCreationEnabled && !existingTeam" type="warning" variant="tonal" class="mb-4">
                    <v-alert-title>Team Creation Currently Closed</v-alert-title>
                    Fantasy team creation is not currently enabled. Please check back later or contact an administrator.
                  </v-alert>
                  <v-alert v-else-if="!tierCount && !existingTeam" type="info" variant="tonal" class="mb-4">
                    The player tiers for {{ seasonName }} are not cut yet. Registration opens once they are.
                  </v-alert>

                  <!-- Existing Team Display -->
                  <div v-if="existingTeam && !isEditing">
                    <v-card variant="outlined" class="mb-4">
                      <v-card-text>
                        <v-row>
                          <v-col cols="12" md="6">
                            <div class="mb-2">
                              <strong>Captain:</strong>
                              <!-- no race: the captain bets, they don't play -->
                              <PlayerName v-if="existingTeam.captain" :player="existingTeam.captain" />
                              <template v-else>{{ playerData?.discord_tag || 'N/A' }}</template>
                            </div>
                            <div class="mb-2">
                              <strong>Season:</strong> {{ existingTeam.season?.name || 'N/A' }}
                            </div>
                            <div class="mb-2">
                              <strong>Drafted Team:</strong> {{ existingTeam.drafted_team?.name || 'N/A' }}
                            </div>
                            <div class="mb-2">
                              <strong>Drafted Race:</strong>
                              <RaceIcon v-if="existingTeam.drafted_race" :raceIdentifier="existingTeam.drafted_race" />
                            </div>
                          </v-col>
                          <v-col cols="12" md="6">
                            <div class="mb-2">
                              <strong>Total Points:</strong> {{ existingTeam.total_points || 0 }}
                            </div>
                            <div class="text-caption">
                              Player Points: {{ existingTeam.player_points || 0 }}<br>
                              Bench Points: {{ existingTeam.bench_points || 0 }}<br>
                              Team Points: {{ existingTeam.team_points || 0 }}<br>
                              Race Points: {{ existingTeam.race_points || 0 }}<br>
                              Bet Points: {{ existingTeam.bet_points || 0 }}
                            </div>
                          </v-col>
                        </v-row>

                        <v-divider class="my-4"></v-divider>

                        <div>
                          <strong class="mb-2 d-block">Drafted Players:</strong>
                          <v-chip-group>
                            <v-chip v-for="player in existingTeam.drafted_players" :key="player.id" size="small">
                              {{ player.name }}
                            </v-chip>
                            <v-chip v-if="!existingTeam.drafted_players || existingTeam.drafted_players.length === 0" size="small" color="grey">
                              No players selected
                            </v-chip>
                          </v-chip-group>
                        </div>
                      </v-card-text>
                      <v-card-actions v-if="canDraft">
                        <v-spacer></v-spacer>
                        <v-btn color="primary" @click="startEditing">
                          <v-icon start>mdi-pencil</v-icon>
                          Edit Team
                        </v-btn>
                      </v-card-actions>
                      <v-card-actions v-else-if="!ended">
                        <v-spacer></v-spacer>
                        <v-chip size="small" color="grey" variant="outlined">
                          Team editing is currently disabled
                        </v-chip>
                      </v-card-actions>
                    </v-card>
                  </div>

                  <!-- Registration/Edit Form -->
                  <v-form v-if="canDraft && (!existingTeam || isEditing)" ref="registrationForm" @submit.prevent="submitTeam">
                    <v-card variant="outlined" class="mb-4">
                      <v-card-title class="bg-primary text-white">
                        <v-icon start>mdi-account-group</v-icon>
                        Team Details
                      </v-card-title>
                      <v-card-text class="pt-4">
                        <v-row>
                          <v-col cols="12">
                            <v-text-field
                              v-model="teamForm.name"
                              label="Fantasy Team Name *"
                              variant="outlined"
                              density="comfortable"
                              required
                              placeholder="Enter your fantasy team name"
                            ></v-text-field>
                          </v-col>
                          <v-col cols="12" md="6">
                            <v-autocomplete
                              v-model="teamForm.drafted_team_id"
                              :items="teams"
                              :item-title="teamTitle"
                              item-value="id"
                              label="Draft a Team *"
                              variant="outlined"
                              density="comfortable"
                              required
                            >
                              <template v-slot:item="{ props, item }">
                                <v-list-item v-bind="props">
                                  <template v-slot:prepend>
                                    <v-avatar size="32" class="mr-2">
                                      <img class="team-icon" :src="teamImageUrl(item.raw)" @error="showDefaultTeamImage">
                                    </v-avatar>
                                  </template>
                                </v-list-item>
                              </template>
                            </v-autocomplete>
                          </v-col>
                          <v-col cols="12" md="6">
                            <RaceSelect
                              v-model="teamForm.drafted_race"
                              label="Draft a Race *"
                              variant="outlined"
                              density="comfortable"
                              required
                            />
                          </v-col>
                        </v-row>
                      </v-card-text>
                    </v-card>

                    <v-card variant="outlined" class="mb-4">
                      <v-card-title class="bg-secondary text-white">
                        <v-icon start>mdi-account-multiple</v-icon>
                        Draft Players
                      </v-card-title>
                      <v-card-text class="pt-4">
                        <v-alert type="info" variant="tonal" class="mb-4">
                          Pick one player from each tier. Records and games are W3C ladder, {{ windowLabel }}.
                        </v-alert>

                        <GroupedTable :columns="draftColumns" :groups="draftGroups" default-open empty="No players tiered this season">
                          <template #head.mmr><W3CMmr /></template>
                          <template #group="{ group }">
                            <td :colspan="draftColumns.length">
                              <v-chip size="small" :color="group.color" variant="flat" class="mr-2">{{ group.title }}</v-chip>
                              <span class="text-medium-emphasis">{{ group.rows.length }} {{ group.rows.length === 1 ? 'player' : 'players' }}</span>
                            </td>
                          </template>
                          <template #rows="{ group }">
                            <template v-for="row in group.rows" :key="row.id">
                              <tr class="detail-row" :class="{ picked: tierSelections[group.tier] === row.id }">
                                <td><input v-model="tierSelections[group.tier]" type="radio" class="pick" :name="`tier-${group.tier}`" :value="row.id" :disabled="!canDraft"></td>
                                <td><PlayerName :player="row" :race="row.signup_race" /></td>
                                <td class="d-none d-md-table-cell text-medium-emphasis">{{ row.ladder?.team ?? '' }}</td>
                                <td class="text-right">{{ row.ladder?.mmr?.current ?? '—' }}</td>
                                <td class="d-none d-md-table-cell text-right">{{ row.ladder ? `${row.ladder.wins}–${row.ladder.losses}` : '—' }}</td>
                                <td class="text-right">{{ row.rate == null ? '—' : `${row.rate}%` }}</td>
                                <td class="d-none d-md-table-cell"><LadderDayBars v-if="row.days" :days="row.days" :ymax="ymax" /><span v-else class="text-disabled">—</span></td>
                                <td class="text-right"><v-btn v-if="row.ladder" :icon="openRows.has(row.id) ? 'mdi-chevron-up' : 'mdi-chevron-down'" size="small" variant="text" @click="toggleRow(row.id)"></v-btn></td>
                              </tr>
                              <tr v-if="openRows.has(row.id) && row.ladder" class="detail-row">
                                <td></td>
                                <td :colspan="draftColumns.length" class="open-row">
                                  <PlayerLadderPanel :player="row.ladder" :days="row.days" :ymax="ymax" :ladder-to="ladderTo" />
                                </td>
                              </tr>
                            </template>
                          </template>
                        </GroupedTable>

                      </v-card-text>
                    </v-card>

                    <v-row>
                      <v-col cols="12" class="text-center">
                        <v-btn v-if="isEditing" color="grey" variant="outlined" @click="cancelEditing" class="mr-2" :disabled="isSaving">
                          Cancel
                        </v-btn>
                        <v-btn color="success" type="submit" size="large" :loading="isSaving">
                          <v-icon start>{{ isEditing ? 'mdi-content-save' : 'mdi-check-circle' }}</v-icon>
                        {{ isEditing ? 'Update Team' : 'Register Team' }}
                      </v-btn>
                    </v-col>
                  </v-row>
                </v-form>
      </v-card-text>
    </v-card>

    <!-- Fantasy Bets Card -->
    <v-card elevation="2">
      <v-card-title class="bg-primary d-flex justify-space-between align-center">
        <div class="d-flex align-center">
          <v-icon class="mr-2">mdi-crystal-ball</v-icon>
          <span>Fantasy Bets</span>
        </div>
        <v-chip v-if="existingTeam" color="white" variant="outlined">
          {{ fantasyBets.length }} bets
        </v-chip>
      </v-card-title>
      <v-card-text class="pt-4">                  <!-- No Team Message -->
                  <v-alert v-if="!existingTeam && ended" type="info" variant="tonal">
                    No team in {{ seasonName }}, so no bets.
                  </v-alert>
                  <v-alert v-else-if="!existingTeam" type="info" variant="tonal">
                    <v-alert-title>Register a Team First</v-alert-title>
                    You need to register a fantasy team before you can place bets on matches.
                  </v-alert>

                  <!-- Bets Table -->
                  <div v-else>
                    <!-- No Fantasy Series Message -->
                    <v-alert v-if="fantasySeries.length === 0" type="info" variant="tonal" class="mb-4">
                      <v-alert-title>No Fantasy Matches Available</v-alert-title>
                      There are currently no fantasy matches scheduled for betting. Check back later!
                    </v-alert>

                    <v-data-table
                      v-else
                      :headers="fantasyHeaders"
                      :items="fantasySeriesWithBets"
                      :loading="isLoading"
                      class="elevation-1"
                      item-key="id"
                    >
                      <template #item.players="{ item }">
                        <MatchupCompare
                          v-if="item.player1 && item.player2"
                          :a="item.player1"
                          :b="item.player2"
                          :la="ladderById.get(item.player1.id)"
                          :lb="ladderById.get(item.player2.id)"
                          :ga="gnlOf(item.player1)"
                          :gb="gnlOf(item.player2)"
                          :days-a="daysById.get(item.player1.id)"
                          :days-b="daysById.get(item.player2.id)"
                          :ymax="ymax"
                          class="my-2"
                        />
                      </template>

                      <template #item.date_time="{ item }">
                        {{ formatDateTime(item.date_time) }}
                      </template>

                      <template #item.my_bet="{ item }">
                        <v-chip
                          v-if="item.myBet"
                          :color="getBetResultColor(item.myBet)"
                          size="small"
                        >
                          {{ getBetPlayerName(item, item.myBet) }}
                        </v-chip>
                        <span v-else class="text-grey">No bet</span>
                      </template>

                      <template #item.score="{ item }">
                        <v-chip
                          v-if="isSeriesPlayed(item)"
                          :color="getScoreColorForBet(item)"
                          variant="outlined"
                          size="small"
                        >
                          {{ item.player1_score || 0 }} - {{ item.player2_score || 0 }}
                        </v-chip>
                        <span v-else class="text-grey">Not played</span>
                      </template>

                      <template #item.result="{ item }">
                        <v-chip
                          v-if="item.myBet && isSeriesPlayed(item)"
                          :color="item.myBet.bet_result === 'WIN' ? 'success' : item.myBet.bet_result === 'LOSS' ? 'error' : 'grey'"
                          size="small"
                        >
                          {{ item.myBet.bet_result || 'PENDING' }}
                        </v-chip>
                        <span v-else-if="!isSeriesPlayed(item)" class="text-grey">-</span>
                        <span v-else class="text-grey">No bet</span>
                      </template>

                      <template #item.actions="{ item }">
                        <v-btn
                          v-if="!isSeriesPlayed(item) && !ended"
                          color="purple"
                          variant="outlined"
                          size="small"
                          @click="placeBet(item)"
                          :disabled="isBetSaving"
                        >
                          {{ item.myBet ? 'Change Bet' : 'Place Bet' }}
                        </v-btn>
                        <v-chip v-else size="small" color="grey">Locked</v-chip>
                      </template>
                    </v-data-table>
                  </div>
      </v-card-text>
    </v-card>
  </v-container>

  <!-- Place Bet Dialog -->
  <v-dialog v-model="betDialog" max-width="500px">
    <v-card>
      <v-card-title class="text-h5">Place Fantasy Bet</v-card-title>
      <v-card-text>
        <div class="mb-4">
          <PlayerName v-if="betSeries.player1" :player="betSeries.player1" :race="betSeries.player1.signup_race" />
          vs
          <PlayerName v-if="betSeries.player2" :player="betSeries.player2" :race="betSeries.player2.signup_race" />
        </div>
        <v-radio-group v-model="selectedBetWinnerId">
          <v-radio
            :label="betSeries.player1?.name"
            :value="betSeries.player1_id"
            color="primary"
          ></v-radio>
          <v-radio
            :label="betSeries.player2?.name"
            :value="betSeries.player2_id"
            color="primary"
          ></v-radio>
        </v-radio-group>

        <v-text-field
          v-if="!useFixedBetPoints"
          v-model.number="betPoints"
          label="Bet Points"
          type="number"
          :min="minBetPoints || 1"
          :max="maxBetPoints"
          :hint="minBetPoints && maxBetPoints ? `Enter between ${minBetPoints} and ${maxBetPoints} points` : minBetPoints ? `Minimum ${minBetPoints} points` : maxBetPoints ? `Maximum ${maxBetPoints} points` : 'Enter the number of points you want to bet'"
          :error-messages="betPointsError"
          class="mt-4"
          @input="betPointsError = validateBetPoints(betPoints)"
          @blur="betPointsError = validateBetPoints(betPoints)"
        ></v-text-field>
        <v-alert v-else type="info" variant="tonal" class="mt-4">
          This bet will be worth {{ fixedBetPointsValue }} points
        </v-alert>
      </v-card-text>
      <v-card-actions>
        <v-btn 
          v-if="betSeries.myBet"
          color="error" 
          variant="text" 
          @click="deleteBet" 
          :disabled="isBetSaving"
        >
          Delete Bet
        </v-btn>
        <v-spacer />
        <v-btn color="grey" variant="text" @click="closeBet" :disabled="isBetSaving">Cancel</v-btn>
        <v-btn 
          color="purple" 
          :disabled="!selectedBetWinnerId || isBetSaving || (!useFixedBetPoints && (!!betPointsError || !betPoints))" 
          :loading="isBetSaving" 
          @click="saveBet"
        >
          Save Bet
        </v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>

<script setup>
import { ref, computed, onMounted, watch } from 'vue';
import { storeToRefs } from 'pinia';
import { useRoute } from 'vue-router';
import { useFantasyStore, useTeamStore, useSeasonStore, useConfigStore, useSeriesStore, useAuthStore } from '@/stores';
import GroupedTable from '@/components/GroupedTable.vue';
import LadderDayBars from '@/components/LadderDayBars.vue';
import MatchupCompare from '@/components/MatchupCompare.vue';
import PlayerLadderPanel from '@/components/PlayerLadderPanel.vue';
import SeasonSelect from '@/components/SeasonSelect.vue';
import W3CMmr from '@/components/W3CMmr.vue';
import { formatDateTime } from '@/helpers/datetime';
import { validateBetPoints as checkBetPoints } from '@/helpers/bets';
import { ALL_COLORS, ALL_NAMES } from '@/helpers/tiers.mjs';
import { fillDays, maxGamesPerDay, winRate } from '@/helpers/ladder-days.mjs';
import { DateTime } from 'luxon';
import { teamImageUrl, showDefaultTeamImage } from '@/helpers/team-image';
import StatusAlert from '@/components/StatusAlert.vue';
import { useColumns } from '@/helpers/columns';


const route = useRoute();
const authStore = useAuthStore();
const fantasyStore = useFantasyStore();
const teamStore = useTeamStore();
const seasonStore = useSeasonStore();
const configStore = useConfigStore();
const seriesStore = useSeriesStore();

const { selectedSeasonId } = storeToRefs(seasonStore);

const isLoading = ref(false);
const isSaving = ref(false);
const isEditing = ref(false);
const isBetSaving = ref(false);
const isCreationEnabled = ref(true);
const errorMessage = ref(null);
const successMessage = ref(null);
const playerToken = ref(null);
const playerData = ref(null);
const existingTeam = ref(null);
const teams = ref([]);
// "Saul's Angels (SA)"; a team without a long name shows its tag alone
const teamTitle = (team) => (team.long_name ? `${team.long_name} (${team.name})` : team.name);
const availablePlayers = ref([]);

// The picked season; a team is drafted while it is open, a complete one is read-only
const season = ref(null);
const seasonName = computed(() => season.value?.name ?? 'this season');
const phase = computed(() => season.value?.phase ?? 'open');
const ended = computed(() => phase.value === 'complete');
const canDraft = computed(() => isCreationEnabled.value && phase.value === 'open' && tierCount.value > 0);

// Tier selections. The season says how many tiers it cuts; tier 1 is always Diamond,
// so a shorter season drops the names off the bottom.
const tierNames = [...ALL_NAMES].reverse();
const tierColors = [...ALL_COLORS].reverse();
const tierCount = ref(tierNames.length);
const tiers = computed(() => Array.from({ length: tierCount.value }, (_, i) => i + 1));
const emptyTierSelections = () => Object.fromEntries(tiers.value.map((tier) => [tier, null]));
const tierSelections = ref(emptyTierSelections());

// The ladder record of every signup, for the draft rows and the bet rows
const ladderPlayers = ref([]);
const ladderById = computed(() => new Map(ladderPlayers.value.map((p) => [p.id, p])));
const ladderWindow = computed(() =>
  season.value?.start_date ? { start: season.value.start_date, end: season.value.end_date || DateTime.now().toISODate() } : null,
);
const fmtDay = (iso) => DateTime.fromISO(iso).toFormat('d MMM');
const windowLabel = computed(() => (ladderWindow.value ? `${fmtDay(ladderWindow.value.start)} – ${fmtDay(ladderWindow.value.end)}` : ''));
const ymax = computed(() => maxGamesPerDay(ladderPlayers.value));
const daysById = computed(() =>
  new Map(ladderPlayers.value.map((p) => [p.id, ladderWindow.value ? fillDays(p.per_day, ladderWindow.value.start, ladderWindow.value.end) : null])),
);
const gnlOf = (player) => player.gnl_stats?.find((s) => s.season_id === selectedSeasonId.value) ?? player.gnl_stats?.[0] ?? null;
const ladderTo = computed(() => ({ path: '/ladder', query: route.query.season ? { season: route.query.season } : {} }));
const openRows = ref(new Set());
const toggleRow = (id) => {
  openRows.value.has(id) ? openRows.value.delete(id) : openRows.value.add(id);
  openRows.value = new Set(openRows.value);
};

const allDraftColumns = computed(() => [
  { key: 'name', title: 'Player' },
  { mobile: false, key: 'team', title: 'Team' },
  { key: 'mmr', title: 'W3C MMR', align: 'right' },
  { mobile: false, key: 'record', title: 'Record', align: 'right' },
  { key: 'rate', title: 'Win %', align: 'right' },
  { mobile: false, key: 'ladder', title: `Ladder · ${windowLabel.value}` },
  { key: 'open', title: '' },
]);
const draftColumns = useColumns(allDraftColumns);
const draftGroups = computed(() =>
  tiers.value.map((tier) => ({
    key: tier,
    tier,
    title: `Tier ${tier} · ${tierNames[tier - 1]}`,
    color: tierColors[tier - 1],
    rows: playersByTier.value[tier].map((p) => {
      const ladder = ladderById.value.get(p.id) || null;
      return { ...p, ladder, days: daysById.value.get(p.id) || null, rate: ladder && ladder.games ? winRate(ladder.wins, ladder.losses) : null };
    }),
  })),
);

// Betting state
const fantasySeries = ref([]);
const fantasyBets = ref([]);
const betDialog = ref(false);
const betSeries = ref({});
const selectedBetWinnerId = ref(null);
const betPoints = ref(null);
const useFixedBetPoints = ref(false);
const fixedBetPointsValue = ref(0);
const minBetPoints = ref(null);
const maxBetPoints = ref(null);
const betPointsError = ref(null);

const teamForm = ref({
  name: '',
  season_id: null,
  drafted_team_id: null,
  drafted_race: null,
  player_ids: []
});

// Table headers for betting
const allFantasyHeaders = [
  { title: 'Match', key: 'players', sortable: false },
  { title: 'Date & Time', key: 'date_time', sortable: true },
  { title: 'My Bet', key: 'my_bet', sortable: false },
  { mobile: false, title: 'Score', key: 'score', sortable: false },
  { title: 'Result', key: 'result', sortable: false },
  { title: '', key: 'actions', sortable: false }
];
const fantasyHeaders = useColumns(allFantasyHeaders);

// Computed: Organize players by tier based on fantasy_tier attribute
const playersByTier = computed(() => {
  const byTier = Object.fromEntries(tiers.value.map((tier) => [tier, []]));

  availablePlayers.value.forEach(player => {
    // Only include players that have an explicit fantasy_tier set
    if (player.fantasy_tier >= 1 && player.fantasy_tier <= tierCount.value) {
      byTier[player.fantasy_tier].push(player);
    }
  });

  return byTier;
});

// Computed: Get all selected players
const selectedPlayers = computed(() => {
  const players = [];
  Object.values(tierSelections.value).forEach(playerId => {
    if (playerId) {
      const player = availablePlayers.value.find(p => p.id === playerId);
      if (player) players.push(player);
    }
  });
  return players;
});

// Computed: Merge fantasy series with user's bets
const fantasySeriesWithBets = computed(() => {
  return fantasySeries.value.map(series => {
    const myBet = fantasyBets.value.find(bet => bet.series_id === series.id);
    return {
      ...series,
      myBet: myBet || null
    };
  });
});

// Watch tier selections and update player_ids
watch(tierSelections, () => {
  teamForm.value.player_ids = selectedPlayers.value.map(p => p.id);
}, { deep: true });

// Helper function to populate tier selections from player IDs
const populateTierSelectionsFromPlayerIds = (playerIds) => {
  // Reset all tiers
  tierSelections.value = emptyTierSelections();

  if (!playerIds || playerIds.length === 0) return;

  // Assign each player to their tier based on fantasy_tier attribute
  playerIds.forEach(playerId => {
    const player = availablePlayers.value.find(p => p.id === playerId);
    if (player) {
      const tier = player.fantasy_tier;
      if (tier >= 1 && tier <= tierCount.value) {
        tierSelections.value[tier] = playerId;
      }
    }
  });
};

const fetchInitialData = async () => {
  isLoading.value = true;
  errorMessage.value = null;

  try {
    // Check if fantasy team creation is enabled
    try {
      const setting = await configStore.fetchSetting('fantasy_team_creation_enabled');
      isCreationEnabled.value = setting && setting.value && setting.value.toLowerCase() === 'true';
    } catch {
      isCreationEnabled.value = false;
    }

    // Load bet points settings
    try {
      const fixedBetPointsSetting = await configStore.fetchSetting('fantasy_fixed_bet_points');
      useFixedBetPoints.value = fixedBetPointsSetting && fixedBetPointsSetting.value && fixedBetPointsSetting.value.toLowerCase() === 'true';
      
      const betPointsValueSetting = await configStore.fetchSetting('fantasy_bet_points_value');
      fixedBetPointsValue.value = betPointsValueSetting && betPointsValueSetting.value ? parseInt(betPointsValueSetting.value) : 0;
      
      const minBetPointsSetting = await configStore.fetchSetting('fantasy_min_bet_points');
      minBetPoints.value = minBetPointsSetting && minBetPointsSetting.value ? parseInt(minBetPointsSetting.value) : null;
      
      const maxBetPointsSetting = await configStore.fetchSetting('fantasy_max_bet_points');
      maxBetPoints.value = maxBetPointsSetting && maxBetPointsSetting.value ? parseInt(maxBetPointsSetting.value) : null;
    } catch {
      useFixedBetPoints.value = false;
      fixedBetPointsValue.value = 0;
      minBetPoints.value = null;
      maxBetPoints.value = null;
    }

    // the session drives the routes when there is no ?token=; the backend reads the id from the bearer
    playerToken.value = route.query.token;
    if (!playerToken.value && !authStore.me) {
      errorMessage.value = 'No access token provided. Please use the link from Discord.';
      return;
    }

    // Fetch user info using the public endpoint
    try {
      playerData.value = await fantasyStore.public_getUserInfo(playerToken.value);
      
      if (!playerData.value) {
        errorMessage.value = 'Invalid token data.';
        return;
      }
    } catch (error) {
      errorMessage.value = 'Invalid or expired token. Please request a new link from Discord.';
      return;
    }

    // A Discord link opens on the season it was made for; the watcher loads a changed pick
    const tokenSeason = playerData.value.season_id;
    if (tokenSeason && tokenSeason !== selectedSeasonId.value) selectedSeasonId.value = tokenSeason;
    else await loadSeason();
  } catch (error) {
    console.error('Failed to load data:', error);
    errorMessage.value = 'Failed to load registration data. Please try again later.';
  } finally {
    isLoading.value = false;
  }
};

// The picked season's team, pool and bets; nothing before the member is known
const loadSeason = async () => {
  const seasonId = selectedSeasonId.value;
  if (!seasonId || !playerData.value) return;
  isLoading.value = true;
  existingTeam.value = null;
  isEditing.value = false;
  fantasySeries.value = [];
  fantasyBets.value = [];
  try {
    season.value = await seasonStore.fetchSeason(seasonId);
    tierCount.value = season.value.fantasy_tiers;
    teamForm.value = { name: '', season_id: seasonId, drafted_team_id: null, drafted_race: null, player_ids: [] };
    tierSelections.value = emptyTierSelections();

    await teamStore.fetchTeamsBySeasonBasic(seasonId);
    teams.value = teamStore.teams || [];

    // The draft pool: the season's signups, carrying signup_race and w3c_stats
    availablePlayers.value = await seasonStore.fetchSeasonSignups(seasonId) || [];
    ladderPlayers.value = await seasonStore.fetchSeasonLadderPlayers(seasonId).catch(() => []);
    await checkExistingTeam();
  } catch (error) {
    console.error('Failed to load the season:', error);
    errorMessage.value = 'Failed to load registration data. Please try again later.';
  } finally {
    isLoading.value = false;
  }
};

watch(selectedSeasonId, loadSeason);

const checkExistingTeam = async () => {
  if (!teamForm.value.season_id) return;
  
  try {
    // Only check if we have a player ID
    if (playerData.value?.user?.id) {
      // Search for existing team by captain and season
      const query = `captain_id == ${playerData.value.user.id} and season_id == ${teamForm.value.season_id}`;
      const teams = await fantasyStore.searchTeams(query);
      
      if (teams && teams.length > 0) {
        existingTeam.value = teams[0];
        // Populate form with existing data
        teamForm.value = {
          name: existingTeam.value.name || '',
          season_id: existingTeam.value.season_id,
          drafted_team_id: existingTeam.value.drafted_team_id,
          drafted_race: existingTeam.value.drafted_race,
          player_ids: existingTeam.value.drafted_players?.map(p => p.id) || []
        };

        // A drafted player removed from signups since the draft still keeps his roster spot
        const knownIds = new Set(availablePlayers.value.map(p => p.id));
        const missingDrafted = (existingTeam.value.drafted_players || []).filter(p => p && !knownIds.has(p.id));
        if (missingDrafted.length > 0) availablePlayers.value = [...availablePlayers.value, ...missingDrafted];

        // Populate tier selections from player IDs
        populateTierSelectionsFromPlayerIds(teamForm.value.player_ids);

        // Fetch fantasy betting data
        await fetchFantasyData();
      } else {
        existingTeam.value = null;
      }
    } else {
      // No player found yet
      existingTeam.value = null;
    }
  } catch (error) {
    console.error('Failed to check existing team:', error);
    existingTeam.value = null;
  }
};

const startEditing = () => {
  isEditing.value = true;
};

const cancelEditing = () => {
  isEditing.value = false;
  // Reset form to existing team data
  if (existingTeam.value) {
    teamForm.value = {
      name: existingTeam.value.name || '',
      season_id: existingTeam.value.season_id,
      drafted_team_id: existingTeam.value.drafted_team_id,
      drafted_race: existingTeam.value.drafted_race,
      player_ids: existingTeam.value.drafted_players?.map(p => p.id) || []
    };
    
    // Populate tier selections from player IDs
    populateTierSelectionsFromPlayerIds(teamForm.value.player_ids);
  }
};

const submitTeam = async () => {
  // Validate all required fields
  if (!teamForm.value.name || !teamForm.value.season_id || !teamForm.value.drafted_team_id || !teamForm.value.drafted_race) {
    errorMessage.value = 'Please fill in all required fields (Team Name, Draft a Team, Draft a Race).';
    return;
  }

  // Validate every tier the season cuts has a player selected
  const missingTiers = tierNames
    .slice(0, tierCount.value)
    .map((name, i) => (tierSelections.value[i + 1] ? null : `Tier ${i + 1} - ${name}`))
    .filter(Boolean);

  if (missingTiers.length > 0) {
    errorMessage.value = `Please select a player for all tiers. Missing: ${missingTiers.join(', ')}`;
    return;
  }

  // Validate we have one player per tier
  if (teamForm.value.player_ids.length !== tierCount.value) {
    errorMessage.value = `You must select exactly ${tierCount.value} players (one for each tier).`;
    return;
  }

  isSaving.value = true;
  errorMessage.value = null;
  successMessage.value = null;

  try {
    // Use the public fantasy-team endpoint
    const payload = {
      token: playerToken.value,
      name: teamForm.value.name,
      season_id: teamForm.value.season_id,
      drafted_team_id: teamForm.value.drafted_team_id,
      drafted_race: teamForm.value.drafted_race,
      player_ids: teamForm.value.player_ids || [],
      user_name: playerData.value?.user?.name || playerData.value?.discord_tag,
      battle_tag: playerData.value?.user?.battleTag || playerData.value?.discord_tag
    };

    const team = await fantasyStore.public_createFantasyTeam(payload);

    successMessage.value = existingTeam.value 
      ? 'Fantasy team updated successfully!' 
      : 'Fantasy team registered successfully!';
    
    // Refresh existing team data
    existingTeam.value = team;
    
    // Update playerData if user was created
    if (!playerData.value.user && team.captain) {
      playerData.value.user = team.captain;
    }
    
    isEditing.value = false;

    // Reload fantasy data including bets
    await fetchFantasyData();

  } catch (error) {
    console.error('Failed to save team:', error);
    
    if (error.error === 'fantasy_team_creation_closed') {
      errorMessage.value = error.message || 'Fantasy team creation is currently closed.';
    } else {
      errorMessage.value = error.message || 'Failed to save fantasy team. Please try again.';
    }
  } finally {
    isSaving.value = false;
  }
};

// Fantasy betting functions
const fetchFantasyData = async () => {
  if (!existingTeam.value || !teamForm.value.season_id) {
    return;
  }

  try {
    // Fetch fantasy series (where is_fantasy_match = true)
    await seriesStore.searchSeriesBySeason(teamForm.value.season_id, 'is_fantasy_match==True');
    fantasySeries.value = seriesStore.series ?? [];

    // Fetch user's fantasy bets (if we have a user id)
    if (playerData.value?.user?.id) {
      const betsQuery = `season_id == ${teamForm.value.season_id} AND user_id == ${playerData.value.user.id}`;
      fantasyBets.value = await fantasyStore.searchBets(betsQuery);
    }
  } catch (error) {
    console.error('Error fetching fantasy data:', error);
    // Don't show error to user, fantasy is optional
  }
};

const placeBet = (series) => {
  betSeries.value = series;
  selectedBetWinnerId.value = series.myBet?.winner_id || null;
  betPoints.value = series.myBet?.bet_points || null;
  betPointsError.value = null;
  betDialog.value = true;
};

const closeBet = () => {
  betDialog.value = false;
  betSeries.value = {};
  selectedBetWinnerId.value = null;
  betPoints.value = null;
  betPointsError.value = null;
};

const validateBetPoints = (points) => checkBetPoints(points, minBetPoints.value, maxBetPoints.value);

const saveBet = async () => {
  isBetSaving.value = true;
  try {
    const betData = {
      token: playerToken.value,
      series_id: betSeries.value.id,
      season_id: teamForm.value.season_id,
      winner_id: selectedBetWinnerId.value,
      bet_points: betPoints.value // Send as-is, backend will apply fixed points if configured
    };

    if (betSeries.value.myBet) {
      // Update existing bet using public endpoint
      await fantasyStore.public_updateBet(betSeries.value.myBet.id, betData);
      successMessage.value = 'Bet updated successfully!';
    } else {
      // Create new bet using public endpoint
      await fantasyStore.public_createBet(betData);
      successMessage.value = 'Bet placed successfully!';
    }

    closeBet();
    await fetchFantasyData(); // Refresh fantasy data
  } catch (error) {
    console.error('Error saving bet:', error);
    errorMessage.value = error.message || 'Error saving bet. Please try again.';
  } finally {
    isBetSaving.value = false;
  }
};

const deleteBet = async () => {
  if (!betSeries.value.myBet) return;
  
  isBetSaving.value = true;
  try {
    await fantasyStore.public_deleteBet(betSeries.value.myBet.id, playerToken.value);
    successMessage.value = 'Bet deleted successfully!';
    closeBet();
    await fetchFantasyData(); // Refresh fantasy data
  } catch (error) {
    console.error('Error deleting bet:', error);
    errorMessage.value = error.message || 'Error deleting bet. Please try again.';
  } finally {
    isBetSaving.value = false;
  }
};

// Helper functions for betting display

const isSeriesPlayed = (series) => {
  // A series is considered played if:
  // 1. Either player has a non-zero score, OR
  // 2. Both scores are set and at least one is non-zero
  // This prevents treating 0:0 (unplayed) as a completed match
  const score1 = series.player1_score;
  const score2 = series.player2_score;
  
  // If either score is null/undefined, not played yet
  if (score1 === null || score1 === undefined || score2 === null || score2 === undefined) {
    return false;
  }
  
  // If both scores are 0, consider it not played (default/initial state)
  if (score1 === 0 && score2 === 0) {
    return false;
  }
  
  // Otherwise, at least one score is non-zero, so it's been played
  return true;
};

const getBetResultColor = (bet) => {
  if (!bet || !bet.bet_result) return 'grey';
  if (bet.bet_result === 'WIN') return 'success';
  if (bet.bet_result === 'LOSS') return 'error';
  return 'grey';
};

const getBetPlayerName = (series, bet) => {
  if (!bet) return '';
  if (bet.winner_id === series.player1_id) return series.player1?.name || 'Player 1';
  if (bet.winner_id === series.player2_id) return series.player2?.name || 'Player 2';
  return 'Unknown';
};

const getScoreColorForBet = (series) => {
  // For betting view, we don't care about the captain's score, just showing the result
  if (series.player1_score > series.player2_score) return 'success';
  if (series.player2_score > series.player1_score) return 'error';
  return 'warning';
};

onMounted(async () => {
  fetchInitialData();
});
</script>

<style scoped>
.pick { accent-color: rgb(var(--v-theme-primary)); width: 18px; height: 18px; cursor: pointer; vertical-align: middle; }
.picked > td { background: rgba(24, 103, 192, 0.06); }
.open-row { padding: 10px 12px 12px; background: rgba(0, 0, 0, 0.02); }

.team-icon {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.v-card-title {
  word-break: break-word;
}
</style>
