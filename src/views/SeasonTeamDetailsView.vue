<template>
  <v-overlay v-model="isLoading" persistent contained class="align-center justify-center">
    <v-progress-circular indeterminate size="64" width="8" color="primary"></v-progress-circular>
  </v-overlay>

  <v-container fluid class="pa-4">
    <!-- Page Header -->
    <v-row class="mb-4">
      <v-col>
        <h1>
          <v-icon class="mr-2">mdi-shield-account</v-icon>
          Team Details
        </h1>
      </v-col>
    </v-row>

    <!-- Team Overview -->
    <v-card v-if="team" elevation="2" class="mb-4">
      <v-card-title class="bg-primary d-flex align-center">
        <v-icon class="mr-2">mdi-shield-account</v-icon>
        <span>{{ team.name }}</span>
      </v-card-title>
      <v-card-text v-if="currentSeasonInfo">
        <p><strong>Final Score:</strong> {{ currentSeasonInfo.final_score }}</p>
        <p><strong>Points Against:</strong> {{ currentSeasonInfo.points_against }}</p>
        <p><strong>Points Available:</strong> {{ currentSeasonInfo.points_available }}</p>
        <!-- Add more details as needed -->
      </v-card-text>
    </v-card>

    <!-- Captain Selection Card -->
    <v-card elevation="2" class="mb-4">
      <v-card-title class="bg-secondary d-flex align-center">
        <v-icon class="mr-2">mdi-shield-star</v-icon>
        <span>Team Captains</span>
      </v-card-title>
      <v-card-text class="pa-0">
        <v-toolbar flat height="auto">
          <v-row align="center" class="flex-wrap ma-0 pa-2">
            <v-spacer />
            <v-col cols="12" sm="auto">
              <v-btn variant="elevated" color="success" prepend-icon="mdi-content-save" v-if="auth.isAdmin" @click="saveCaptains" :loading="isSavingCaptains" :disabled="isSavingCaptains" block>
                Save Captains
              </v-btn>
            </v-col>
          </v-row>
        </v-toolbar>
      </v-card-text>
      <v-card-text>
        <p class="text-subtitle-2 mb-3">Assign the captains of this season:</p>

        <v-autocomplete
          v-model="captainIds"
          :items="allAvailableUsers"
          item-title="name"
          item-value="id"
          label="Captains"
          placeholder="Start typing to search..."
          multiple
          chips
          closable-chips
          clearable
          auto-select-first
          hint="Any number of captains"
          persistent-hint
        >
          <template v-slot:prepend-inner>
            <v-icon color="primary">mdi-shield-star</v-icon>
          </template>
        </v-autocomplete>

        <!-- Save Captains answers the accounts the guild has not granted the role yet -->
        <v-chip
          v-for="captain in missingRoleCaptains"
          :key="captain.id"
          color="warning"
          variant="tonal"
          size="small"
          prepend-icon="mdi-alert"
          class="mr-2 mt-4"
        >
          {{ captain.name }} — role missing in Discord
        </v-chip>
      </v-card-text>
    </v-card>

    <!-- Ladder -->
    <v-card v-if="ladderTeam" elevation="2" class="mb-4">
      <v-card-title class="bg-primary d-flex align-center">
        <W3CIcon :size="22" class="mr-2" />
        <span>W3C Ladder</span>
      </v-card-title>
      <v-toolbar flat height="auto">
        <v-row align="center" class="flex-wrap ma-0 pa-2" style="gap: 8px">
          <v-chip variant="outlined" size="small">{{ ladderTeam.points }} points</v-chip>
          <v-chip variant="outlined" size="small">Rank {{ ladderRank }}</v-chip>
          <v-chip variant="outlined" size="small">{{ ladderTeam.games }} games</v-chip>
          <v-spacer />
          <span class="text-caption text-medium-emphasis">
            {{ ladderSyncCaption }}
            <v-tooltip activator="parent" location="top">{{ localFromIso(seasonLadder.season.synced_at) }}</v-tooltip>
          </span>
        </v-row>
      </v-toolbar>
      <v-table density="compact">
        <thead>
          <tr>
            <th style="width: 64px">Race</th>
            <th>Name</th>
            <th class="text-right">
              <ColumnNote title="Ladder Points" :note="LADDER_NOTE" />
            </th>
            <th>
              <ColumnNote title="Achievements" :note="ACHIEVEMENTS_NOTE" />
            </th>
            <th class="text-right">
              <ColumnNote title="Total Points" :note="SCORED_NOTE" />
            </th>
            <th class="text-right">W</th>
            <th class="text-right">L</th>
            <th class="text-right"><W3CMmr /></th>
            <th class="text-right">
              <ColumnNote :note="MMR_NOTE"><W3CMmr suffix=" +/-" /></ColumnNote>
            </th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="row in ladderTeam.players" :key="row.id">
            <td><RaceIcon v-if="row.race" :raceIdentifier="row.race" /></td>
            <td><PlayerName :player="row" @click.stop="showStats(row)" /></td>
            <td class="text-right">{{ row.ladder_points }}</td>
            <td>
              <AchievementChip :badges="row.achievements" />
            </td>
            <td class="text-right font-weight-bold">{{ row.points }}</td>
            <td class="text-right text-green">{{ row.wins }}</td>
            <td class="text-right text-red">{{ row.losses }}</td>
            <td class="text-right">{{ row.mmr?.current ?? '\u2014' }}</td>
            <td class="text-right" :class="ladderMmrDiff(row) > 0 ? 'text-green' : ladderMmrDiff(row) < 0 ? 'text-red' : ''">
              <span v-if="ladderMmrDiff(row) == null">&mdash;</span>
              <span v-else>{{ ladderMmrDiff(row) > 0 ? `+${ladderMmrDiff(row)}` : ladderMmrDiff(row) }}</span>
            </td>
          </tr>
        </tbody>
      </v-table>
    </v-card>

    <!-- Players -->
    <v-card elevation="2">
      <v-card-title class="bg-primary d-flex align-center">
        <v-icon class="mr-2">mdi-account-multiple</v-icon>
        <span>Team Players</span>
      </v-card-title>

      <v-card-text v-if="!errorMessage" class="pa-0">
        <v-data-table
          :headers="tableHeader"
          :loading="isLoading"
          :items="players"
          :row-props="getRowClass"
          fixed-header
          hover
        >
          <template v-slot:[`header.mmr`]><W3CMmr /></template>
          <template v-slot:loading>
            <v-skeleton-loader type="table-row@10"></v-skeleton-loader>
          </template>

          <template #top>
            <v-toolbar flat height="auto">
              <v-row align="center" class="flex-wrap ma-0 pa-2">
                <v-spacer />
                <v-col cols="12" sm="auto">
                  <v-btn v-if="auth.isAdmin" variant="elevated" color="primary" @click="syncW3CTeam" :loading="isLoading" :disabled="isLoading" prepend-icon="mdi-sync" block>
                    Sync W3C
                    <v-tooltip activator="parent" location="top">MMR and ladder matches</v-tooltip>
                  </v-btn>
                </v-col>
                <v-col cols="12" sm="auto">
                  <v-btn v-if="auth.isAdmin" variant="elevated" color="success" prepend-icon="mdi-plus" @click="showNewPlayerModal = true" block>
                    Add Player
                  </v-btn>
                </v-col>
              </v-row>
            </v-toolbar>
          </template>

            <template v-slot:item="{ item }">
              <tr class="text-no-wrap">
                <td>{{ item.id }}</td>
                <td><PlayerName :player="item" @click.stop="showStats(item)" /></td>
                <td>{{ item.battleTag }}</td>
                <td>{{ item.discordTag }}</td>
                <td>{{ getW3CMMR(item, currentW3CSeason) }}
                  <div class="text-caption text-medium-emphasis">{{ syncedAgo(item) }}<v-tooltip activator="parent" location="top">{{ syncedAt(item) }}</v-tooltip></div>
                </td>
                <td>
                  <div v-if="item.race">
                    <RaceIcon :raceIdentifier="item.race" />                                          
                  </div>
                </td>     
                <td>
                  <div v-if="item.signup_seasons && item.signup_seasons.length > 0">
                    <template v-for="s in item.signup_seasons.slice().sort((a,b) => b.id - a.id).slice(0,2)" :key="s.id">
                      <v-chip small class="ma-1">{{ s.name }}</v-chip>
                    </template>
                    <v-menu v-if="item.signup_seasons.length > 2" offset-y>
                      <template #activator="{ props }">
                        <v-chip v-bind="props" class="ma-1" small>+{{ item.signup_seasons.length - 2 }}</v-chip>
                      </template>
                      <v-list>
                        <v-list-item v-for="s in item.signup_seasons.slice().sort((a,b) => b.id - a.id)" :key="s.id">
                          <v-list-item-title>{{ s.name }}</v-list-item-title>
                        </v-list-item>
                      </v-list>
                    </v-menu>
                  </div>
                  <div v-else>—</div>
                </td>
                <td>
                  <RowActions :actions="[
                    { icon: 'mdi-chart-box', label: 'View Stats', onClick: () => showStats(item) },
                    { icon: 'mdi-account-minus', label: 'Remove from Team', color: 'error', onClick: () => removePlayerFromTeam(item.id) },
                  ]" />
                </td>
              </tr>
            </template>
        </v-data-table>
      </v-card-text>

      <!-- Enhanced Empty State -->
      <v-card-text v-else class="text-center pa-8">
        <v-icon size="64" color="grey-lighten-1">mdi-account-off</v-icon>
        <div class="text-h6 text-grey mt-4 mb-2">No players found</div>
        <p class="text-grey-darken-1 mb-4">Add players to this team to get started</p>
        <v-btn v-if="auth.isAdmin" variant="elevated" color="primary" prepend-icon="mdi-plus" @click="showNewPlayerModal = true">
          Add First Player
        </v-btn>
      </v-card-text>
    </v-card>

  <!-- Add New Player Modal -->
  <v-dialog v-model="showNewPlayerModal" persistent max-width="900">
    <v-card>
      <v-card-title class="bg-primary">
        <v-icon class="mr-2">mdi-account-multiple-plus</v-icon>
        Select Players to Add
      </v-card-title>

      <v-card-text class="pt-4">
        <!-- Filters (reusable) -->
        <FilterPanel
          v-model:searchName="searchName"
          v-model:searchRace="searchRace"
          v-model:rangeValues="rangeValues"
          :showName="true"
          :showRace="true"
          :showSeason="false"
          :showMMR="true"
          :showReset="true"
          @reset="fetchAllPlayers"
        />
        <v-data-table
          :headers="playerTableHeaders"
          :items="filteredAllPlayers"
          item-value="id"
          v-model="selectedPlayers"
          show-select
          :item-disabled="isRowDisabled"
          density="comfortable"
        >
          <template v-slot:[`header.mmr`]><W3CMmr /></template>
          <template v-slot:[`item.name`]="{ item }">
            <PlayerName :player="item" @click.stop="showStats(item)" />
          </template>
        </v-data-table>
      </v-card-text>
      <v-card-actions>
        <v-spacer />
        <v-btn @click="showNewPlayerModal = false">Cancel</v-btn>
        <v-btn color="primary" variant="elevated" prepend-icon="mdi-content-save" v-if="auth.isAdmin" @click="saveSelectedPlayers">
          Add Selected Players
        </v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>

  <!-- Player Details Modal -->
  <PlayerDetailsDialog 
    v-model="showPlayerDetails" 
    :player="playerDetails" 
    :seasonId="seasonId"
    :w3cSeason="currentW3CSeason"
  />

  <W3CSyncResultDialog v-model="syncDialog" :entries="syncEntries" />
  </v-container>
</template>

<script setup>
import RowActions from '@/components/RowActions.vue';
import { useRouter } from 'vue-router';
import { useAuthStore, useTeamStore, usePlayerStore, useLadderStore } from '@/stores';
import { resolveCurrentW3CSeason } from '@/helpers/current-season';
import { SCORED_NOTE, MMR_NOTE, ACHIEVEMENTS_NOTE, LADDER_NOTE } from '@/helpers/achievements';
import ColumnNote from '@/components/ColumnNote.vue';
import W3CMmr from '@/components/W3CMmr.vue';
import { computed, onMounted, ref, watch } from 'vue';
import { storeToRefs } from 'pinia';
import AchievementChip from '@/components/AchievementChip.vue';
import PlayerDetailsDialog from '@/components/PlayerDetailsDialog.vue';
import FilterPanel from '@/components/FilterPanel.vue';
import { getW3CMMR, syncedAgo, syncedAt, agoFromIso, localFromIso } from '@/helpers/w3c-stats';
import { matchesPlayerSearch, filterByMmrRange } from '@/helpers/players';
import W3CIcon from '@/components/W3CIcon.vue';
import W3CSyncResultDialog from '@/components/W3CSyncResultDialog.vue';


// Router and store setup
const router = useRouter();
const teamStore = useTeamStore();
const playerStore = usePlayerStore();
const ladderStore = useLadderStore();
const auth = useAuthStore();

// Route params
const teamId = computed(() => router.currentRoute.value.params.id);
const seasonId = computed(() => {
  const id = router.currentRoute.value.params.season_id;
  return id ? Number(id) : null;
});

// Current W3C season for stats fallback
const currentW3CSeason = ref(null);

// Store refs
const { team } = storeToRefs(teamStore);
const { players: allPlayers } = storeToRefs(playerStore);

// Season info for the currently viewed season
const currentSeasonInfo = computed(() => {
  if (!team.value?.seasons_info) return null;
  return team.value.seasons_info.find(s => s.season_id === seasonId.value)
    ?? team.value.seasons_info[0];
});

// State management
const isLoading = ref(false);
const errorMessage = ref(null);
const players = ref([]);
const showNewPlayerModal = ref(false);
const selectedPlayers = ref([]);

// Captain management state
const captainIds = ref([]);
const discordRoleMissing = ref([]);
const isSavingCaptains = ref(false);
const allAvailableUsers = ref([]);

const missingRoleCaptains = computed(() =>
  (team.value?.captains_by_season?.[seasonId.value] || [])
    .filter(captain => discordRoleMissing.value.includes(captain.discordId))
);

// Player details state
const showPlayerDetails = ref(false);
const playerDetails = ref(null);

// Ladder card state
const seasonLadder = ref(null);

const ladderTeam = computed(() =>
  (seasonLadder.value?.teams ?? []).find(t => String(t.id) === String(teamId.value)) ?? null
);

// The card is as synced as its least synced player, and says so when one is behind
const ladderSyncCaption = computed(() => {
  const players = ladderTeam.value?.players ?? [];
  const synced = players.filter(player => player.synced_at).length;
  if (!synced) return 'never synced';
  if (synced < players.length) return `partly synced · ${synced} of ${players.length} players`;
  return `synced ${agoFromIso(seasonLadder.value?.season?.synced_at)}`;
});

// The teams of the answer are ordered by ladder points
const ladderRank = computed(() =>
  (seasonLadder.value?.teams ?? []).findIndex(t => String(t.id) === String(teamId.value)) + 1
);

// A player still in his placement games has no MMR, so there is no span to subtract
const ladderMmrDiff = (row) =>
  row.mmr?.current != null && row.mmr?.start != null ? row.mmr.current - row.mmr.start : null;

const fetchLadder = async () => {
  if (!seasonId.value) return;
  try {
    seasonLadder.value = await ladderStore.seasonLadder(seasonId.value);
  } catch (error) {
    console.error('Failed to load the ladder of the season:', error);
    seasonLadder.value = null;
  }
};

// Search state
const searchRace = ref(null);
const searchName = ref(null);
const rangeValues = ref([0, 3000]);

// Table configuration
const tableHeader = [
  { title: 'ID', value: 'id', align: 'start', sortable: true },
  { title: 'Name', value: 'name', sortable: true },  
  { title: 'Battletag', value: 'battleTag', sortable: true },    
  { title: 'Discord Name', value: 'discordTag', sortable: true }, 
  { title: 'W3C MMR', value: 'mmr', sortable: false }, 
  { title: 'Main Race', value: 'race', sortable: true },  
  { title: 'Signups', value: 'signups', sortable: false },    
  { title: 'Actions', key: 'actions', align: 'end', sortable: false }, 
];

const playerTableHeaders = [
  { title: 'Name', value: 'name' },
  { title: 'BattleTag', value: 'battleTag' },
  { title: 'MMR', value: 'mmr' },
];

// Methods
const getRowClass = () => ({
  class: 'player-row'
});

const fetchAllPlayers = async () => {
  try {
    await playerStore.fetchPlayers();
  } catch (error) {
    console.error('Failed to fetch players:', error);
  } finally {
    isLoading.value = false;
    searchName.value = '';
    searchRace.value = '';
    rangeValues.value = [0, 3000];
  }
};

const fetchTeam = async () => {
  isLoading.value = true;
  errorMessage.value = null;
  try {
    await teamStore.fetchTeamBySeason(teamId.value, seasonId.value);
    if (!team.value) {
      errorMessage.value = 'No team information found.';
    }
    players.value = team.value.player_by_season[seasonId.value] || [];
    
    // Load ALL users for captain selection (captains can be anyone, not just season players)
    // Fetch all players first to populate allPlayers (for player modal)
    await playerStore.fetchPlayers();
    // For captains, use ALL users directly from store (not filtered by season)
    allAvailableUsers.value = playerStore.players || [];
    
    // Initialize captain selections based on current captains (order is preserved)
    captainIds.value = (team.value.captains_by_season?.[seasonId.value] || []).map(captain => captain.id);
  } catch (error) {
    console.error(error);
    errorMessage.value = 'Failed to load team. Please try again later.';
  } finally {
    isLoading.value = false;
  }
};

const saveCaptains = async () => {
  isSavingCaptains.value = true;
  try {
    const saved = await teamStore.setCaptains(teamId.value, seasonId.value, captainIds.value);
    // Refresh team data to show updated captain status
    await fetchTeam();
    discordRoleMissing.value = saved?.discord_role_missing || [];
  } catch (error) {
    console.error('Failed to save captains:', error);
    errorMessage.value = 'Failed to save captains. Please try again.';
  } finally {
    isSavingCaptains.value = false;
  }
};

const saveSelectedPlayers = async () => {
  try {
    await teamStore.addPlayersToTeamForSeason(
      teamId.value,
      seasonId.value,
      selectedPlayers.value
    );
    selectedPlayers.value = [];
    fetchTeam();
    showNewPlayerModal.value = false;
  } catch (error) {
    console.error('Failed to save selected players:', error);
  }
};

watch(showNewPlayerModal, (newValue) => {
  if (newValue === true) {
    fetchAllPlayers();
  }
});

onMounted(async () => {
  currentW3CSeason.value = await resolveCurrentW3CSeason();
  fetchTeam();
  fetchLadder();
});

const removePlayerFromTeam = async (playerId) => {
  if (!confirm('Remove this player from the team?')) return;
  try {
    await teamStore.removePlayersFromTeamForSeason(
      teamId.value,
      seasonId.value,
      [playerId]
    );
    fetchTeam();
  } catch (error) {
    console.error('Error removing player:', error);
  }
};

const syncDialog = ref(false);
const syncEntries = ref([]);

const syncW3CTeam = async () => {
  isLoading.value = true;
  syncEntries.value = [];
  syncDialog.value = true;
  try {
    syncEntries.value = [{ title: team.value?.name ?? 'Team', result: await teamStore.syncPlayersW3C(teamId.value, seasonId.value) }];
    await fetchTeam();
  } catch (error) {
    console.error('Error syncing W3C data:', error);
    syncEntries.value = [{ title: team.value?.name ?? 'Team', error }];
  } finally {
    isLoading.value = false;
  }
};

const isRowDisabled = (item) => {
  let playerAlreadyInTeam = false;
  for (const player in players.value) {
    if (player == item.id) {
      playerAlreadyInTeam = true;
      break;
    }
  }
  return playerAlreadyInTeam;
};

const showStats = async (player) => {
  showPlayerDetails.value = true;
  playerDetails.value = player;
};




const filteredAllPlayers = computed(() => {
  let list = allPlayers.value || [];

  // Only include players who signed up for the current season
  if (seasonId.value) {
    const sid = String(seasonId.value);
    list = list.filter(p => {
      if (!p.signup_seasons) return false;
      return p.signup_seasons.some(s => String(s.id) === sid);
    });
  }

  if (searchName.value && searchName.value.trim().length > 0) {
    list = list.filter(p => matchesPlayerSearch(p, searchName.value));
  }

  if (searchRace.value) {
    list = list.filter(p => p.race === searchRace.value);
  }

  // filter by mmr range — only apply if user changed from defaults
  list = filterByMmrRange(list, rangeValues.value, p => Number(getW3CMMR(p, currentW3CSeason.value) ?? 0));

  return list;
});

</script>

<style scoped>
.player-row {
  cursor: pointer;
  transition: all 0.2s ease;
}

.player-row:hover {
  background-color: rgba(var(--v-theme-primary), 0.05) !important;
}

</style>
