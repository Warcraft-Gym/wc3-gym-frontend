<template>
  <v-container fluid class="pa-4">
    <!-- Page Header -->
    <v-row class="mb-4">
      <v-col>
        <h1>
          <v-icon class="mr-2">mdi-account-multiple-check</v-icon>
          Draft Players for Season
        </h1>
      </v-col>
    </v-row>

    <!-- Top: Filters + Draft players for season -->
    <v-card elevation="2" class="mb-4">
      <v-card-title class="bg-primary d-flex align-center">
        <v-icon class="mr-2">mdi-account-multiple</v-icon>
        <span>{{ seasonName }}</span>
      </v-card-title>
      <v-card-text class="pa-0">
        <v-toolbar flat height="auto">
          <v-row align="center" class="flex-wrap ma-0 pa-2">
            <v-spacer />
            <v-col cols="12" sm="auto" style="min-width: 240px">
              <SyncProgress />
            </v-col>
            <v-col cols="12" sm="auto">
              <v-btn variant="elevated" color="primary" @click="syncAllDraftPlayers" :loading="syncAllLoading" prepend-icon="mdi-sync" block>
                Sync W3C
                <v-tooltip activator="parent" location="top">MMR and ladder matches</v-tooltip>
              </v-btn>
            </v-col>
          </v-row>
        </v-toolbar>
      </v-card-text>
      <v-card-text class="pt-4">
        <FilterPanel
          v-model:searchName="searchName"
          v-model:searchRace="searchRace"
          v-model:rangeValues="rangeValues"
          :seasons="null"
          :showName="true"
          :showRace="true"
          :showSeason="false"
          :showMMR="true"
          :showReset="true"
          @reset="onResetFilters"
        >
          <template #after>
            <v-col cols="12" md="6">
              <v-checkbox
                v-model="hideNoW3CStats"
                label="Hide players without W3C stats"
                color="primary"
                density="comfortable"
                hide-details
              ></v-checkbox>
            </v-col>
          </template>
        </FilterPanel>
      </v-card-text>
      <v-data-table
              :headers="playerTableHeaders"
              :items="availablePlayers"
              return-object
              dense
            >
              <template v-slot:[`header.w3c_mmr`]="{ column, isSorted, getSortIcon }">
                <W3CMmr :sort-icon="isSorted(column) ? getSortIcon(column) : null" />
              </template>
              <template #item.team="{ item }">
                <v-select
                  v-model="playerTeamSelection[item.id]"
                  :items="teams"
                  item-title="name"
                  item-value="id"
                  density="compact"
                  clearable
                  hide-details
                  style="min-width: 150px;"
                ></v-select>
              </template>
              <template #item.name="{ item }">
                <PlayerName :player="item" @click.stop="showStats(item)">
                  <template v-if="!hasW3CStats(item)">
                    <v-tooltip>
                      <template #activator="{ props }">
                        <v-icon v-bind="props" small color="red">mdi-alert</v-icon>
                      </template>
                      <span>No W3C stats found for {{ item.race }}</span>
                    </v-tooltip>
                  </template>
                  <template v-else-if="hasLowGames(item)">
                    <v-tooltip>
                      <template #activator="{ props }">
                        <v-icon v-bind="props" small color="orange">mdi-alert</v-icon>
                      </template>
                      <span>Less than 20 games ({{ getW3CGamesCount(item, currentW3CSeason) }} games) for {{ item.race }}</span>
                    </v-tooltip>
                  </template>
                  <template v-if="perPlayerSyncStatus[item.id] && perPlayerSyncStatus[item.id].state === 'loading'">
                    <v-icon small class="text--secondary">mdi-sync</v-icon>
                  </template>
                  <template v-else-if="perPlayerSyncStatus[item.id] && perPlayerSyncStatus[item.id].state === 'success'">
                    <v-icon small color="green">mdi-check-circle</v-icon>
                  </template>
                  <template v-else-if="perPlayerSyncStatus[item.id] && perPlayerSyncStatus[item.id].state === 'skipped'">
                    <v-tooltip>
                      <template #activator="{ props }">
                        <v-icon v-bind="props" small color="grey">mdi-clock-outline</v-icon>
                      </template>
                      <span>Synced in the last 10 minutes</span>
                    </v-tooltip>
                  </template>
                  <template v-else-if="perPlayerSyncStatus[item.id] && perPlayerSyncStatus[item.id].state === 'error'">
                    <v-tooltip>
                      <template #activator="{ props }">
                        <v-icon v-bind="props" small color="red">mdi-alert-circle</v-icon>
                      </template>
                      <span>{{ perPlayerSyncStatus[item.id].message || 'Sync failed' }}</span>
                    </v-tooltip>
                  </template>
                </PlayerName>
              </template>
              <template #item.w3c_mmr="{ item }">
                <div>{{ getW3CMMR(item, currentW3CSeason) ?? 'N/A' }}</div>
                <div class="text-caption text-medium-emphasis">{{ syncedAgo(item) }}<v-tooltip activator="parent" location="top">{{ syncedAt(item) }}</v-tooltip></div>
              </template>
              <template #item.race="{ item }">
                <RaceIcon :raceIdentifier="item.race" />
              </template>
              <template #item.actions="{ item }">
                <v-btn
                  icon
                  size="small"
                  variant="text"
                  @click="editPlayer(item)"
                >
                  <v-icon>mdi-pencil</v-icon>
                </v-btn>
              </template>
              <template #no-data>
                <div>No available signed-up players for this season.</div>
              </template>
            </v-data-table>
      <v-card-actions class="px-4 pb-4">
        <v-btn
          color="primary"
          variant="elevated"
          prepend-icon="mdi-account-multiple-plus"
          @click="assignAllPlayers"
          :loading="assignAllLoading"
          :disabled="assignAllLoading || playersWithTeamSelected === 0"
        >
          Assign {{ playersWithTeamSelected }} Player{{ playersWithTeamSelected !== 1 ? 's' : '' }} to Teams
        </v-btn>
      </v-card-actions>
    </v-card>

    <!-- Edit Player Dialog -->
    <v-dialog v-model="showEditPlayerModal" max-width="800">
      <v-card v-if="selectedPlayer">
        <v-card-title class="bg-primary">
          <v-icon class="mr-2">mdi-pencil</v-icon>
          Edit Player: {{ selectedPlayer.name }}
        </v-card-title>

        <v-alert
          v-if="updateError"
          type="error"
          variant="tonal"
          border="start"
          border-color="red"
          class="mx-4 my-2"
          closable
          @click:close="updateError = null"
        >
          {{ updateError }}
        </v-alert>

        <v-card-text class="pt-4">
          <v-row>
            <v-col cols="12" md="6">
              <v-text-field
                v-model="selectedPlayer.name"
                label="Player Name"
                variant="outlined"
                prepend-inner-icon="mdi-account"
                density="comfortable"
              ></v-text-field>
            </v-col>
            <v-col cols="12" md="6">
              <v-text-field
                v-model="selectedPlayer.battleTag"
                label="BattleTag"
                variant="outlined"
                prepend-inner-icon="mdi-shield-account"
                density="comfortable"
              ></v-text-field>
            </v-col>
          </v-row>
          <v-row>
            <v-col cols="12" md="6">
              <CountrySelect v-model="selectedPlayer.country" />
            </v-col>
            <v-col cols="12" md="6">
              <v-text-field
                v-model="selectedPlayer.discordTag"
                label="Discord Tag"
                variant="outlined"
                prepend-inner-icon="mdi-discord"
                density="comfortable"
              ></v-text-field>
            </v-col>
          </v-row>
          <v-row>
            <v-col cols="12" md="6">
              <v-text-field
                v-model="selectedPlayer.discordId"
                label="Discord ID"
                hint="Numeric Discord user ID (required)"
                variant="outlined"
                prepend-inner-icon="mdi-identifier"
                density="comfortable"
              ></v-text-field>
            </v-col>
          </v-row>
          <v-row>
            <v-col cols="12" md="6">
              <RaceSelect v-model="selectedPlayer.race" />
            </v-col>
            <v-col cols="12" md="6">
              <v-text-field
                v-model="selectedPlayer.fantasy_tier"
                label="Fantasy Tier"
                variant="outlined"
                prepend-inner-icon="mdi-trophy"
                density="comfortable"
              ></v-text-field>
            </v-col>
          </v-row>
          <v-row>
            <v-col cols="12">
              <v-select
                v-model="selectedSignupSeasonIds"
                :items="seasons"
                item-title="name"
                item-value="id"
                multiple
                chips
                label="Signed-up Seasons"
                variant="outlined"
                prepend-inner-icon="mdi-calendar-check"
                density="comfortable"
              ></v-select>
            </v-col>
          </v-row>
        </v-card-text>

        <v-card-actions>
          <v-spacer />
          <v-btn @click="cancelEdit">Cancel</v-btn>
          <v-btn @click="updatePlayer" color="primary" variant="elevated" prepend-icon="mdi-content-save">
            Save Changes
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <!-- Player details dialog (open when clicking a player's name) -->
    <PlayerDetailsDialog
      v-model="showPlayerDetails"
      :player="playerDetails"
      :seasonId="seasonId"
    />

    <!-- Teams grid below -->
    <v-row>
      <v-col cols="12">
        <h2 class="mb-4">
          <v-icon class="mr-2">mdi-shield-account</v-icon>
          Team Assignments
        </h2>
        <div class="teams-grid" :style="{ gridTemplateColumns: `repeat(${colsCount}, 1fr)` }">
          <div v-for="team in teams" :key="team.id" class="team-card-grid">
            <v-card elevation="2">
              <v-card-title class="bg-primary">
                <v-icon class="mr-2">mdi-shield-account</v-icon>
                {{ team.name }}
              </v-card-title>
              <v-card-text>
                <div>
                  <div v-if="getTeamPlayersForSeason(team).length > 0">
                    <div v-for="p in getTeamPlayersForSeason(team)" :key="p.id" class="team-player" style="display:flex;align-items:center;justify-content:space-between;padding:6px 0;">
                      <div>
                        <div style="display:flex;align-items:center;gap:8px;">
                          <span style="cursor: pointer; color: var(--v-theme-primary);" @click="showStats(p)"><strong>{{ p.name }}</strong></span>
                          <template v-if="!hasW3CStats(p)">
                            <v-tooltip>
                              <template #activator="{ props }">
                                <v-icon v-bind="props" small color="red">mdi-alert</v-icon>
                              </template>
                              <span>No W3C stats found for {{ p.race }}</span>
                            </v-tooltip>
                          </template>
                          <template v-else-if="hasLowGames(p)">
                            <v-tooltip>
                              <template #activator="{ props }">
                                <v-icon v-bind="props" small color="orange">mdi-alert</v-icon>
                              </template>
                              <span>Less than 20 games ({{ getW3CGamesCount(p, currentW3CSeason) }} games) for {{ p.race }}</span>
                            </v-tooltip>
                          </template>
                          <template v-if="perPlayerSyncStatus[p.id] && perPlayerSyncStatus[p.id].state === 'loading'">
                            <v-icon small class="text--secondary">mdi-sync</v-icon>
                          </template>
                          <template v-else-if="perPlayerSyncStatus[p.id] && perPlayerSyncStatus[p.id].state === 'success'">
                            <v-icon small color="green">mdi-check-circle</v-icon>
                          </template>
                          <template v-else-if="perPlayerSyncStatus[p.id] && perPlayerSyncStatus[p.id].state === 'skipped'">
                            <v-tooltip>
                              <template #activator="{ props }">
                                <v-icon v-bind="props" small color="grey">mdi-clock-outline</v-icon>
                              </template>
                              <span>Synced in the last 10 minutes</span>
                            </v-tooltip>
                          </template>
                          <template v-else-if="perPlayerSyncStatus[p.id] && perPlayerSyncStatus[p.id].state === 'error'">
                            <v-tooltip>
                              <template #activator="{ props }">
                                <v-icon v-bind="props" small color="red">mdi-alert-circle</v-icon>
                              </template>
                              <span>{{ perPlayerSyncStatus[p.id].message || 'Sync failed' }}</span>
                            </v-tooltip>
                          </template>
                        </div>
                        <div class="text--secondary">{{ getW3CMMR(p, currentW3CSeason) ?? 'N/A' }} — <RaceIcon :raceIdentifier="p.race" /></div>
                        <div class="text-caption text-medium-emphasis">{{ syncedAgo(p) }}<v-tooltip activator="parent" location="top">{{ syncedAt(p) }}</v-tooltip></div>
                      </div>
                      <div style="display:flex;align-items:center;gap:6px;">
                          <v-btn
                            class="table-action ma-0 pa-0"
                            icon
                            density="compact"
                            color="red"
                            @click.stop.prevent="removePlayerFromTeam(team.id, p.id)"
                            :disabled="isRemoveLoading(team.id, p.id)"
                            :loading="isRemoveLoading(team.id, p.id)"
                          >
                            <template v-if="!isRemoveLoading(team.id, p.id)">
                              <v-icon small>mdi-delete</v-icon>
                            </template>
                          </v-btn>
                      </div>
                    </div>
                  </div>
                  <div v-else>
                    <em>No players assigned for this season</em>
                  </div>
                </div>
              </v-card-text>
            </v-card>
          </div>
        </div>
      </v-col>
    </v-row>
    <W3CSyncResultDialog v-model="syncDialog" :entries="syncEntries" />
  </v-container>
</template>

<script setup>
import { computed, onMounted, ref } from 'vue';
import { useLadderStore, usePlayerStore, useTeamStore, useSeasonStore } from '@/stores';
import { resolveCurrentW3CSeason } from '@/helpers/current-season';
import { storeToRefs } from 'pinia';
import { useRouter } from 'vue-router';
import PlayerDetailsDialog from '@/components/PlayerDetailsDialog.vue';
import W3CMmr from '@/components/W3CMmr.vue';
import FilterPanel from '@/components/FilterPanel.vue';
import SyncProgress from '@/components/SyncProgress.vue';
import W3CSyncResultDialog from '@/components/W3CSyncResultDialog.vue';
import { 
  getW3CMMR,
  getW3CGamesCount,
  hasW3CStatsTwoSeasons,
  hasLowGamesTwoSeasons,
  syncedAgo,
  syncedAt
} from '@/helpers/w3c-stats';
import { matchesPlayerSearch, filterByMmrRange } from '@/helpers/players';


const router = useRouter();

const seasonId = computed(() => {
  const params = router.currentRoute.value.params || {};
  const id = params.season_id || params.id || router.currentRoute.value.query.season_id;
  return id ? Number(id) : null;
});

const ladderStore = useLadderStore();
const playerStore = usePlayerStore();
const teamStore = useTeamStore();
const seasonStore = useSeasonStore();

const { teams } = storeToRefs(teamStore);
const { current_season } = storeToRefs(seasonStore);

// Local state for signed up players
const signedUpPlayersData = ref([]);

const searchName = ref('');
const searchRace = ref(null);
const rangeValues = ref([0, 3000]);
const hideNoW3CStats = ref(false);

// Track team selection per player
const playerTeamSelection = ref({});

// per-player sync status: { state: 'idle'|'loading'|'success'|'error', message?: string }
const perPlayerSyncStatus = ref({});

const syncDialog = ref(false);
const syncEntries = ref([]);

// Edit player state
const showEditPlayerModal = ref(false);
const selectedPlayer = ref(null);
const updateError = ref(null);
const selectedSignupSeasonIds = ref([]);
let originalSignupSeasonIds = [];

// Current W3C season for stats fallback
const currentW3CSeason = ref(null);

const hasW3CStats = (player) => {
  // Check current season OR previous season for warning display
  return hasW3CStatsTwoSeasons(player, currentW3CSeason.value);
};

const hasLowGames = (player) => {
  // Use combined games count from current + previous season
  return hasLowGamesTwoSeasons(player, currentW3CSeason.value);
};

const playerTableHeaders = [
  { title: 'ID', value: 'id' },
  { title: 'Name', value: 'name' },
  { title: 'MMR', key: 'w3c_mmr', sortable: true, sortRaw: (a, b) => {
    let aValue = getW3CMMR(a, currentW3CSeason.value) || 0;
    let bValue = getW3CMMR(b, currentW3CSeason.value) || 0;
    return aValue - bValue;
  }},
  { title: 'Race', value: 'race' },
  { title: 'Team', value: 'team', sortable: false },
  { title: '', value: 'actions', sortable: false, align: 'end' },
];

// compute assigned player ids across all teams for this season
const assignedPlayerIds = computed(() => {
  const sid = String(seasonId.value);
  const set = new Set();
  (teams.value || []).forEach(team => {
    const v = team.player_by_season?.[sid] || team.player_by_season?.[Number(sid)];
    if (!v) return;
    if (Array.isArray(v)) v.forEach(p => p && p.id && set.add(p.id));
    else if (typeof v === 'object') Object.values(v).forEach(p => p && p.id && set.add(p.id));
  });
  return set;
});

// available players = signed up players minus assigned players
const availablePlayers = computed(() => {
  return (filteredPlayers.value || []).filter(p => !assignedPlayerIds.value.has(p.id));
});

// Count players with team selected
const playersWithTeamSelected = computed(() => {
  return Object.values(playerTeamSelection.value).filter(teamId => teamId != null).length;
});

// columns for teams grid: if exactly 8 teams -> show 4 columns (will wrap to two rows);
// otherwise show all teams side-by-side (one column per team)
const colsCount = computed(() => {
  const n = (teams.value || []).length;
  if (n === 8) return 4; // two rows of 4
  return Math.max(1, n); // side-by-side for fewer than 8 teams
});

// fetch data — prefer fetching teams for the specific season when seasonId is available
const fetchData = async () => {
  await Promise.all([
    (seasonId.value && teamStore.fetchTeamsBySeason)
      ? teamStore.fetchTeamsBySeason(seasonId.value)
      : (teamStore.fetchTeams ? teamStore.fetchTeams() : Promise.resolve()),
    seasonStore.fetchSeason ? seasonStore.fetchSeason(seasonId.value) : Promise.resolve()
  ]);
  
  // Fetch signed up users separately
  if (seasonId.value && seasonStore.fetchSeasonSignups) {
    try {
      signedUpPlayersData.value = await seasonStore.fetchSeasonSignups(seasonId.value);
    } catch (err) {
      console.error('Failed to fetch season signups:', err);
      signedUpPlayersData.value = [];
    }
  }
};

onMounted(async () => {
  currentW3CSeason.value = await resolveCurrentW3CSeason();
  fetchData();
});

const seasonName = computed(() => {
  return current_season.name;
});

// players signed up for this season - from local data fetched separately
const signedUpPlayers = computed(() => {
  return signedUpPlayersData.value || [];
});

const filteredPlayers = computed(() => {
  let list = signedUpPlayers.value || [];
  if (searchName.value && searchName.value.trim().length > 0) {
    list = list.filter(p => matchesPlayerSearch(p, searchName.value));
  }
  if (searchRace.value) list = list.filter(p => p.race === searchRace.value);
  
  // filter by mmr range — only apply if user changed from defaults
  list = filterByMmrRange(list, rangeValues.value, p => getW3CMMR(p) ?? 0);
  
  // filter out players without W3C stats if checkbox is checked
  if (hideNoW3CStats.value) {
    list = list.filter(p => hasW3CStats(p));
  }
  
  return list;
});

const clearFilters = () => {
  searchName.value = '';
  searchRace.value = null;
  rangeValues.value = [0, 3000];
  hideNoW3CStats.value = false;
};

const onResetFilters = async () => {
  clearFilters();
  // refresh available players after clearing filters
  await fetchData();
};

// player details dialog state (open by clicking a player's name)
const showPlayerDetails = ref(false);
const playerDetails = ref(null);

const showStats = async (player) => {
  playerDetails.value = player;
  showPlayerDetails.value = true;
};

// Get W3C MMR for player's signed up race (with fallback)
function getTeamPlayersForSeason(team) {
  const sid = String(seasonId.value);
  if (!team || !team.player_by_season) return [];
  const v = team.player_by_season[sid] || team.player_by_season[Number(sid)];
  if (!v) return [];
  let players = [];
  if (Array.isArray(v)) players = v;
  else if (typeof v === 'object') players = Object.values(v);
  
  // Sort by W3C MMR descending
  return players.sort((a, b) => (getW3CMMR(b, currentW3CSeason.value) || 0) - (getW3CMMR(a, currentW3CSeason.value) || 0));
}

// per-team loading state to avoid double-clicks
const removeLoading = ref({});
const syncAllLoading = ref(false);
const assignAllLoading = ref(false);

const isRemoveLoading = (teamId, playerId) => {
  return !!removeLoading.value[`${teamId}_${playerId}`];
};

const assignAllPlayers = async () => {
  assignAllLoading.value = true;
  try {
    // Group players by team
    const playersByTeam = {};
    for (const [playerId, teamId] of Object.entries(playerTeamSelection.value)) {
      if (teamId != null) {
        if (!playersByTeam[teamId]) {
          playersByTeam[teamId] = [];
        }
        playersByTeam[teamId].push(parseInt(playerId));
      }
    }

    // Add players to each team
    for (const [teamId, playerIds] of Object.entries(playersByTeam)) {
      if (playerIds.length > 0) {
        await teamStore.addPlayersToTeamForSeason(parseInt(teamId), seasonId.value, playerIds);
      }
    }

    // Clear selections and refresh
    playerTeamSelection.value = {};
    await fetchData();
  } catch (err) {
    console.error('Failed to assign players to teams:', err);
  } finally {
    assignAllLoading.value = false;
  }
};

const removePlayerFromTeam = async (teamId, playerId) => {
  removeLoading.value = { ...removeLoading.value, [`${teamId}_${playerId}`]: true };
  try {
    if (teamStore.removePlayersFromTeamForSeason) {
      await teamStore.removePlayersFromTeamForSeason(teamId, seasonId.value, [playerId]);
    }
    await fetchData();
  } catch (err) {
    console.error('Failed to remove player from team:', err);
  } finally {
    removeLoading.value = { ...removeLoading.value, [`${teamId}_${playerId}`]: false };
  }
};

// sync every player signed up to the season, one chunk of players per request
const syncAllDraftPlayers = async () => {
  syncAllLoading.value = true;
  const list = signedUpPlayers.value || [];
  perPlayerSyncStatus.value = Object.fromEntries(list.map(p => [p.id, { state: 'loading' }]));
  try {
    const result = await ladderStore.syncSeason(seasonId.value);
    const status = {};
    for (const id of result.synced ?? []) status[id] = { state: 'success' };
    for (const id of result.skipped ?? []) status[id] = { state: 'skipped' };
    for (const f of result.failed ?? []) status[f.id] = { state: 'error', message: f.reason };
    perPlayerSyncStatus.value = status;
    syncEntries.value = [{ title: seasonName.value, result }];
    syncDialog.value = true;
  } catch (err) {
    console.error('Failed to sync season players:', err);
    perPlayerSyncStatus.value = Object.fromEntries(list.map(p => [p.id, { state: 'error', message: err.message }]));
  } finally {
    await fetchData();
    syncAllLoading.value = false;
  }
};

const editPlayer = async (player) => {
  try {
    if (seasonStore && seasonStore.fetchSeasons) await seasonStore.fetchSeasons();
  } catch (err) {
    console.error('Failed to fetch seasons before opening edit player dialog:', err);
  }
  selectedPlayer.value = { ...player };
  updateError.value = '';
  // prepare signup seasons selection
  const signup = selectedPlayer.value.signup_seasons || [];
  originalSignupSeasonIds = signup.map(s => s.id);
  selectedSignupSeasonIds.value = [...originalSignupSeasonIds];
  showEditPlayerModal.value = true;
};

const updatePlayer = async () => {
  updateError.value = '';
  try {
    await playerStore.updatePlayer(selectedPlayer.value);
    const playerId = selectedPlayer.value.id;
    const newSignupIds = selectedSignupSeasonIds.value || [];
    const toAdd = newSignupIds.filter(id => !originalSignupSeasonIds.includes(id));
    const toRemove = originalSignupSeasonIds.filter(id => !newSignupIds.includes(id));

    try {
      await Promise.all(toAdd.map(sid => seasonStore.addUserSignup(sid, [playerId])));
      await Promise.all(toRemove.map(sid => seasonStore.removeUserSignup(sid, [playerId])));
    } catch (err) {
      console.error('Failed to sync signup seasons:', err);
    }

    await fetchData();
    cancelEdit();
  } catch (error) {
    console.error('Error updating user:', error);
    updateError.value = 'Error updating user: ' + error.message;
  }
};

const cancelEdit = () => {
  showEditPlayerModal.value = false;
  selectedPlayer.value = null;
  updateError.value = null;
};
</script>

<style scoped>
/* small spacing tweaks */
.v-card { margin-bottom: 12px }
 .teams-grid {
   display: grid;
   gap: 12px;
 }
 .team-card-grid {
   display: block;
 }
 .team-player .v-icon {
   font-size: 14px;
 }
</style>
