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
    </v-row>

    <v-alert v-if="errorMessage" type="error" variant="tonal" border="start" border-color="red" class="mb-4" closable @click:close="errorMessage = null">
      {{ errorMessage }}
    </v-alert>

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
      </v-card-title>
      <v-card-text class="pt-4">
                  
                  <!-- Team Creation Disabled Message -->
                  <v-alert v-if="!isCreationEnabled && !existingTeam" type="warning" variant="tonal" class="mb-4">
                    <v-alert-title>Team Creation Currently Closed</v-alert-title>
                    Fantasy team creation is not currently enabled. Please check back later or contact an administrator.
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
                            <v-chip v-for="player in existingTeam.drafted_players" :key="player.id" size="small" @click="showPlayerDetails(player)" style="cursor: pointer;">
                              {{ player.name }}
                            </v-chip>
                            <v-chip v-if="!existingTeam.drafted_players || existingTeam.drafted_players.length === 0" size="small" color="grey">
                              No players selected
                            </v-chip>
                          </v-chip-group>
                        </div>
                      </v-card-text>
                      <v-card-actions v-if="isCreationEnabled">
                        <v-spacer></v-spacer>
                        <v-btn color="primary" @click="startEditing">
                          <v-icon start>mdi-pencil</v-icon>
                          Edit Team
                        </v-btn>
                      </v-card-actions>
                      <v-card-actions v-else>
                        <v-spacer></v-spacer>
                        <v-chip size="small" color="grey" variant="outlined">
                          Team editing is currently disabled
                        </v-chip>
                      </v-card-actions>
                    </v-card>
                  </div>

                  <!-- Registration/Edit Form -->
                  <v-form v-if="isCreationEnabled && (!existingTeam || isEditing)" ref="registrationForm" @submit.prevent="submitTeam">
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
                              item-title="name"
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
                                      <img class="team-icon" :src="teamImageUrl(item.raw.id)" @error="showDefaultTeamImage">
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
                          Select players for your fantasy team from different tiers. Each tier is based on player MMR.
                        </v-alert>

                        <v-row>
                          <!-- Tier 1: Diamond -->
                          <v-col cols="12" md="6">
                            <v-autocomplete
                              v-model="tierSelections.tier1"
                              :items="playersByTier.tier1"
                              item-title="name"
                              item-value="id"
                              label="Tier 1 - Diamond"
                              variant="outlined"
                              density="comfortable"
                              clearable
                            >
                              <template v-slot:item="{ item }">
                                <v-list-item
                                  :value="item.value"
                                  @click="tierSelections.tier1 = item.value"
                                >
                                                                    <v-list-item-title><PlayerName :player="item.raw" :race="item.raw.race" /></v-list-item-title>
                                  <v-list-item-subtitle><W3CMmr /> {{ displayMMR(item.raw) }}</v-list-item-subtitle>
                                  <template v-slot:append>
                                    <v-btn
                                      v-if="item.raw.battleTag"
                                      icon="mdi-open-in-new"
                                      size="x-small"
                                      variant="text"
                                      @click.stop="openW3CStats(item.raw.battleTag)"
                                    ></v-btn>
                                  </template>
                                </v-list-item>
                              </template>
                            </v-autocomplete>
                          </v-col>

                          <!-- Tier 2: Platinum -->
                          <v-col cols="12" md="6">
                            <v-autocomplete
                              v-model="tierSelections.tier2"
                              :items="playersByTier.tier2"
                              item-title="name"
                              item-value="id"
                              label="Tier 2 - Platinum"
                              variant="outlined"
                              density="comfortable"
                              clearable
                            >
                              <template v-slot:item="{ item }">
                                <v-list-item
                                  :value="item.value"
                                  @click="tierSelections.tier2 = item.value"
                                >
                                                                    <v-list-item-title><PlayerName :player="item.raw" :race="item.raw.race" /></v-list-item-title>
                                  <v-list-item-subtitle><W3CMmr /> {{ displayMMR(item.raw) }}</v-list-item-subtitle>
                                  <template v-slot:append>
                                    <v-btn
                                      v-if="item.raw.battleTag"
                                      icon="mdi-open-in-new"
                                      size="x-small"
                                      variant="text"
                                      @click.stop="openW3CStats(item.raw.battleTag)"
                                    ></v-btn>
                                  </template>
                                </v-list-item>
                              </template>
                            </v-autocomplete>
                          </v-col>

                          <!-- Tier 3: Gold -->
                          <v-col cols="12" md="6">
                            <v-autocomplete
                              v-model="tierSelections.tier3"
                              :items="playersByTier.tier3"
                              item-title="name"
                              item-value="id"
                              label="Tier 3 - Gold"
                              variant="outlined"
                              density="comfortable"
                              clearable
                            >
                              <template v-slot:item="{ item }">
                                <v-list-item
                                  :value="item.value"
                                  @click="tierSelections.tier3 = item.value"
                                >
                                                                    <v-list-item-title><PlayerName :player="item.raw" :race="item.raw.race" /></v-list-item-title>
                                  <v-list-item-subtitle><W3CMmr /> {{ displayMMR(item.raw) }}</v-list-item-subtitle>
                                  <template v-slot:append>
                                    <v-btn
                                      v-if="item.raw.battleTag"
                                      icon="mdi-open-in-new"
                                      size="x-small"
                                      variant="text"
                                      @click.stop="openW3CStats(item.raw.battleTag)"
                                    ></v-btn>
                                  </template>
                                </v-list-item>
                              </template>
                            </v-autocomplete>
                          </v-col>

                          <!-- Tier 4: Silver -->
                          <v-col cols="12" md="6">
                            <v-autocomplete
                              v-model="tierSelections.tier4"
                              :items="playersByTier.tier4"
                              item-title="name"
                              item-value="id"
                              label="Tier 4 - Silver"
                              variant="outlined"
                              density="comfortable"
                              clearable
                            >
                              <template v-slot:item="{ item }">
                                <v-list-item
                                  :value="item.value"
                                  @click="tierSelections.tier4 = item.value"
                                >
                                                                    <v-list-item-title><PlayerName :player="item.raw" :race="item.raw.race" /></v-list-item-title>
                                  <v-list-item-subtitle><W3CMmr /> {{ displayMMR(item.raw) }}</v-list-item-subtitle>
                                  <template v-slot:append>
                                    <v-btn
                                      v-if="item.raw.battleTag"
                                      icon="mdi-open-in-new"
                                      size="x-small"
                                      variant="text"
                                      @click.stop="openW3CStats(item.raw.battleTag)"
                                    ></v-btn>
                                  </template>
                                </v-list-item>
                              </template>
                            </v-autocomplete>
                          </v-col>

                          <!-- Tier 5: Bronze -->
                          <v-col cols="12" md="6">
                            <v-autocomplete
                              v-model="tierSelections.tier5"
                              :items="playersByTier.tier5"
                              item-title="name"
                              item-value="id"
                              label="Tier 5 - Bronze"
                              variant="outlined"
                              density="comfortable"
                              clearable
                            >
                              <template v-slot:item="{ item }">
                                <v-list-item
                                  :value="item.value"
                                  @click="tierSelections.tier5 = item.value"
                                >
                                                                    <v-list-item-title><PlayerName :player="item.raw" :race="item.raw.race" /></v-list-item-title>
                                  <v-list-item-subtitle><W3CMmr /> {{ displayMMR(item.raw) }}</v-list-item-subtitle>
                                  <template v-slot:append>
                                    <v-btn
                                      v-if="item.raw.battleTag"
                                      icon="mdi-open-in-new"
                                      size="x-small"
                                      variant="text"
                                      @click.stop="openW3CStats(item.raw.battleTag)"
                                    ></v-btn>
                                  </template>
                                </v-list-item>
                              </template>
                            </v-autocomplete>
                          </v-col>

                          <!-- Tier 6: Grass -->
                          <v-col cols="12" md="6">
                            <v-autocomplete
                              v-model="tierSelections.tier6"
                              :items="playersByTier.tier6"
                              item-title="name"
                              item-value="id"
                              label="Tier 6 - Grass"
                              variant="outlined"
                              density="comfortable"
                              clearable
                            >
                              <template v-slot:item="{ item }">
                                <v-list-item
                                  :value="item.value"
                                  @click="tierSelections.tier6 = item.value"
                                >
                                                                    <v-list-item-title><PlayerName :player="item.raw" :race="item.raw.race" /></v-list-item-title>
                                  <v-list-item-subtitle><W3CMmr /> {{ displayMMR(item.raw) }}</v-list-item-subtitle>
                                  <template v-slot:append>
                                    <v-btn
                                      v-if="item.raw.battleTag"
                                      icon="mdi-open-in-new"
                                      size="x-small"
                                      variant="text"
                                      @click.stop="openW3CStats(item.raw.battleTag)"
                                    ></v-btn>
                                  </template>
                                </v-list-item>
                              </template>
                            </v-autocomplete>
                          </v-col>
                        </v-row>

                        <div v-if="selectedPlayers.length > 0" class="mt-4">
                          <strong>Selected Players ({{ selectedPlayers.length }}):</strong>
                          <v-chip-group class="mt-2">
                            <v-chip v-for="player in selectedPlayers" :key="player.id" size="small" color="primary" @click="showPlayerDetails(player)" style="cursor: pointer;">
                              <PlayerName :player="player" :race="player.race" />
                            </v-chip>
                          </v-chip-group>
                        </div>
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
                  <v-alert v-if="!existingTeam" type="info" variant="tonal">
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
                        <div>
                          <PlayerName v-if="item.player1" :player="item.player1" :race="item.player1.race" @click="showPlayerDetails(item.player1)" />
                          vs
                          <PlayerName v-if="item.player2" :player="item.player2" :race="item.player2.race" @click="showPlayerDetails(item.player2)" />
                        </div>
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
                          v-if="!isSeriesPlayed(item)"
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
          <PlayerName v-if="betSeries.player1" :player="betSeries.player1" :race="betSeries.player1.race" @click="showPlayerDetails(betSeries.player1)" />
          vs
          <PlayerName v-if="betSeries.player2" :player="betSeries.player2" :race="betSeries.player2.race" @click="showPlayerDetails(betSeries.player2)" />
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

  <!-- Player Details Dialog -->
  <PlayerDetailsDialog
    v-model="showPlayerDetailsDialog"
    :player="selectedPlayerForDetails"
    :seasonId="existingTeam?.season?.id"
  />
</template>

<script setup>
import { ref, computed, onMounted, watch } from 'vue';
import { useRoute } from 'vue-router';
import { useFantasyStore, useTeamStore, usePlayerStore, useConfigStore, useSeriesStore, useAuthStore } from '@/stores';
import PlayerDetailsDialog from '@/components/PlayerDetailsDialog.vue';
import W3CMmr from '@/components/W3CMmr.vue';
import { formatDateTime } from '@/helpers/datetime';
import { validateBetPoints as checkBetPoints } from '@/helpers/bets';
import { getW3CMMR, w3cPlayerUrl } from '@/helpers/w3c-stats';
import { resolveCurrentSeasonId, resolveCurrentW3CSeason } from '@/helpers/current-season';
import { teamImageUrl, showDefaultTeamImage } from '@/helpers/team-image';


const route = useRoute();
const authStore = useAuthStore();
const fantasyStore = useFantasyStore();
const teamStore = useTeamStore();
const playerStore = usePlayerStore();
const configStore = useConfigStore();
const seriesStore = useSeriesStore();

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
const availablePlayers = ref([]);

// Current W3C season for MMR display
const currentW3CSeason = ref(null);

const displayMMR = (player) => {
  const mmr = getW3CMMR(player, currentW3CSeason.value);
  return mmr > 0 ? mmr : 'N/A';
};

// Tier selections
const tierSelections = ref({
  tier1: null, // Diamond
  tier2: null, // Platinum
  tier3: null, // Gold
  tier4: null, // Silver
  tier5: null, // Bronze
  tier6: null  // Grass
});

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
const fantasyHeaders = [
  { title: 'Players', key: 'players', sortable: false },
  { title: 'Date & Time', key: 'date_time', sortable: true },
  { title: 'My Bet', key: 'my_bet', sortable: false },
  { title: 'Score', key: 'score', sortable: false },
  { title: 'Result', key: 'result', sortable: false },
  { title: '', key: 'actions', sortable: false }
];

// Computed: Organize players by tier based on fantasy_tier attribute
const playersByTier = computed(() => {
  const tiers = {
    tier1: [], // Diamond
    tier2: [], // Platinum
    tier3: [], // Gold
    tier4: [], // Silver
    tier5: [], // Bronze
    tier6: []  // Grass
  };

  availablePlayers.value.forEach(player => {
    // Only include players that have an explicit fantasy_tier set
    if (player.fantasy_tier >= 1 && player.fantasy_tier <= 6) {
      tiers[`tier${player.fantasy_tier}`].push(player);
    }
  });

  return tiers;
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
  tierSelections.value = {
    tier1: null,
    tier2: null,
    tier3: null,
    tier4: null,
    tier5: null,
    tier6: null
  };

  if (!playerIds || playerIds.length === 0) return;

  // Assign each player to their tier based on fantasy_tier attribute
  playerIds.forEach(playerId => {
    const player = availablePlayers.value.find(p => p.id === playerId);
    if (player) {
      const tier = player.fantasy_tier || 6; // Default to tier 6 if not set
      if (tier >= 1 && tier <= 6) {
        tierSelections.value[`tier${tier}`] = playerId;
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

    // Get current season from config
    const currentSeasonId = await resolveCurrentSeasonId();
    if (!currentSeasonId) {
      errorMessage.value = 'No season is available. Please contact an administrator.';
      isLoading.value = false;
      return;
    }
    teamForm.value.season_id = currentSeasonId;

    // Fetch teams for the current season
    await teamStore.fetchTeamsBySeasonBasic(teamForm.value.season_id);
    teams.value = teamStore.teams || [];

    // Fetch players
    await playerStore.fetchPlayers();
    availablePlayers.value = playerStore.players || [];

    // Check if player already has a fantasy team for current season
    if (teamForm.value.season_id) {
      await checkExistingTeam();
    }

  } catch (error) {
    console.error('Failed to load data:', error);
    errorMessage.value = 'Failed to load registration data. Please try again later.';
  } finally {
    isLoading.value = false;
  }
};

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

  // Validate all 6 tiers have a player selected
  const missingTiers = [];
  if (!tierSelections.value.tier1) missingTiers.push('Tier 1 - Diamond');
  if (!tierSelections.value.tier2) missingTiers.push('Tier 2 - Platinum');
  if (!tierSelections.value.tier3) missingTiers.push('Tier 3 - Gold');
  if (!tierSelections.value.tier4) missingTiers.push('Tier 4 - Silver');
  if (!tierSelections.value.tier5) missingTiers.push('Tier 5 - Bronze');
  if (!tierSelections.value.tier6) missingTiers.push('Tier 6 - Grass');

  if (missingTiers.length > 0) {
    errorMessage.value = `Please select a player for all tiers. Missing: ${missingTiers.join(', ')}`;
    return;
  }

  // Validate we have exactly 6 players
  if (teamForm.value.player_ids.length !== 6) {
    errorMessage.value = 'You must select exactly 6 players (one for each tier).';
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

const openW3CStats = (battleTag) => {
  window.open(w3cPlayerUrl(battleTag), '_blank');
};

onMounted(async () => {
  currentW3CSeason.value = await resolveCurrentW3CSeason();
  fetchInitialData();
});

// Player Details Dialog
const showPlayerDetailsDialog = ref(false);
const selectedPlayerForDetails = ref(null);

const showPlayerDetails = (player) => {
  if (!player) return;
  selectedPlayerForDetails.value = player;
  showPlayerDetailsDialog.value = true;
};
</script>

<style scoped>

.team-icon {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.v-card-title {
  word-break: break-word;
}
</style>
