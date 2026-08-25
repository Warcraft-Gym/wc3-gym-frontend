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

    <!-- Coach Selection Card -->
    <v-card elevation="2" class="mb-4">
      <v-card-title class="bg-secondary d-flex align-center">
        <v-icon class="mr-2">mdi-shield-star</v-icon>
        <span>Team Coaches</span>
      </v-card-title>
      <v-card-text class="pa-0">
        <v-toolbar flat height="auto">
          <v-row align="center" class="flex-wrap ma-0 pa-2">
            <v-spacer />
            <v-col cols="12" sm="auto">
              <v-btn variant="elevated" color="success" prepend-icon="mdi-content-save" @click="saveCoaches" :loading="isSavingCoaches" :disabled="isSavingCoaches" block>
                Save Coaches
              </v-btn>
            </v-col>
          </v-row>
        </v-toolbar>
      </v-card-text>
      <v-card-text>
        <p class="text-subtitle-2 mb-3">Assign coaches for this season (Coach 1 is the main coach):</p>
        
        <v-row>
          <v-col cols="12" md="4">
            <v-autocomplete
              v-model="coach1"
              :items="allAvailableUsers"
              item-title="name"
              item-value="id"
              label="Coach 1 (Main Coach)"
              placeholder="Start typing to search..."
              clearable
              auto-select-first
              hint="Primary team coach"
              persistent-hint
            >
              <template v-slot:prepend-inner>
                <v-icon color="primary">mdi-shield-star</v-icon>
              </template>
            </v-autocomplete>
          </v-col>
          
          <v-col cols="12" md="4">
            <v-autocomplete
              v-model="coach2"
              :items="allAvailableUsers"
              item-title="name"
              item-value="id"
              label="Coach 2 (Optional)"
              placeholder="Start typing to search..."
              clearable
              auto-select-first
              hint="Assistant coach"
              persistent-hint
            >
              <template v-slot:prepend-inner>
                <v-icon>mdi-shield-star-outline</v-icon>
              </template>
            </v-autocomplete>
          </v-col>
          
          <v-col cols="12" md="4">
            <v-autocomplete
              v-model="coach3"
              :items="allAvailableUsers"
              item-title="name"
              item-value="id"
              label="Coach 3 (Optional)"
              placeholder="Start typing to search..."
              clearable
              auto-select-first
              hint="Assistant coach"
              persistent-hint
            >
              <template v-slot:prepend-inner>
                <v-icon>mdi-shield-star-outline</v-icon>
              </template>
            </v-autocomplete>
          </v-col>
        </v-row>
      </v-card-text>
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
          <template v-slot:loading>
            <v-skeleton-loader type="table-row@10"></v-skeleton-loader>
          </template>

          <template #top>
            <v-toolbar flat height="auto">
              <v-row align="center" class="flex-wrap ma-0 pa-2">
                <v-spacer />
                <v-col cols="12" sm="auto">
                  <v-btn variant="elevated" color="primary" @click="syncW3CTeam" :loading="isLoading" :disabled="isLoading" prepend-icon="mdi-sync" block>
                    Sync W3C Info
                  </v-btn>
                </v-col>
                <v-col cols="12" sm="auto">
                  <v-btn variant="elevated" color="success" prepend-icon="mdi-plus" @click="showNewPlayerModal = true" block>
                    Add Player
                  </v-btn>
                </v-col>
              </v-row>
            </v-toolbar>
          </template>

            <template v-slot:item="{ item }">
              <tr class="text-no-wrap">
                <td>{{ item.id }}</td>
                <td>
                  <span @click.stop="showStats(item)" style="cursor: pointer; text-decoration: underline;">
                    {{ item.name }}
                  </span>
                </td>
                <td>{{ item.battleTag }}</td>
                <td>
                  <div v-if="item.country">
                    <FlagIcon :countryIdentifier="item.country" />
                  </div>
                </td>
                <td>{{ item.discordTag }}</td>
                <td>{{ getW3CMMR(item, currentW3CSeason) }}</td>
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
        <v-btn variant="elevated" color="primary" prepend-icon="mdi-plus" @click="showNewPlayerModal = true">
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
          <template v-slot:[`item.name`]="{ item }">
            <span @click.stop="showStats(item)" style="cursor: pointer; text-decoration: underline; color: var(--v-theme-primary);">
              {{ item.name }}
            </span>
          </template>
        </v-data-table>
      </v-card-text>
      <v-card-actions>
        <v-spacer />
        <v-btn @click="showNewPlayerModal = false">Cancel</v-btn>
        <v-btn color="primary" variant="elevated" prepend-icon="mdi-content-save" @click="saveSelectedPlayers">
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
  />
  </v-container>
</template>

<script setup>
import RowActions from '@/components/RowActions.vue';
import '@/assets/base.css';
import { useRouter } from 'vue-router';
import { useTeamStore, usePlayerStore, useConfigStore } from '@/stores';
import { computed, onMounted, ref, watch } from 'vue';
import { storeToRefs } from 'pinia';
import FlagIcon from '@/components/FlagIcon.vue';
import RaceIcon from '@/components/RaceIcon.vue';
import PlayerDetailsDialog from '@/components/PlayerDetailsDialog.vue';
import FilterPanel from '@/components/FilterPanel.vue';
import { getW3CMMR } from '@/helpers/w3c-stats';

defineOptions({ name: 'SeasonTeamDetailsView' });

// Router and store setup
const router = useRouter();
const teamStore = useTeamStore();
const playerStore = usePlayerStore();
const configStore = useConfigStore();

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

// Coach management state
const coach1 = ref(null);
const coach2 = ref(null);
const coach3 = ref(null);
const isSavingCoaches = ref(false);
const allAvailableUsers = ref([]);

// Player details state
const showPlayerDetails = ref(false);
const playerDetails = ref(null);

// Search state
const searchRace = ref(null);
const searchName = ref(null);
const searchEnabled = ref(false);
const rangeValues = ref([0, 3000]);

// Table configuration
const tableHeader = [
  { title: 'ID', value: 'id', align: 'start', sortable: true },
  { title: 'Name', value: 'name', sortable: true },  
  { title: 'Battletag', value: 'battleTag', sortable: true },    
  { title: 'Country', value: 'country', sortable: true },
  { title: 'Discord Name', value: 'discordTag', sortable: true }, 
  { title: 'W3C MMR', value: 'mmr', sortable: false }, 
  { title: 'Main Race', value: 'race', sortable: true },  
  { title: 'Signups', value: 'signups', sortable: false },    
  { title: 'Actions', key: 'actions', align: 'end', sortable: false }, 
];

const playerTableHeaders = [
  { title: 'Name', value: 'name' },
  { title: 'BattleTag', value: 'battleTag' },
  { title: 'Country', value: 'country' },
  { title: 'MMR', value: 'mmr' },
];

const races = ref([
  { name: "HU" },
  { name: "OC" },
  { name: "UD" },
  { name: "NE" },
]);

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
    searchEnabled.value = false;
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
    
    // Load ALL users for coach selection (coaches can be anyone, not just season players)
    // Fetch all players first to populate allPlayers (for player modal)
    await playerStore.fetchPlayers();
    // For coaches, use ALL users directly from store (not filtered by season)
    allAvailableUsers.value = playerStore.players || [];
    
    // Initialize coach selections based on current coaches (order is preserved)
    const currentCoaches = team.value.coaches_by_season?.[seasonId.value] || [];
    coach1.value = currentCoaches[0]?.id || null;
    coach2.value = currentCoaches[1]?.id || null;
    coach3.value = currentCoaches[2]?.id || null;
  } catch (error) {
    console.error(error);
    errorMessage.value = 'Failed to load team. Please try again later.';
  } finally {
    isLoading.value = false;
  }
};

const saveCoaches = async () => {
  // Build coach array in order, filtering out null values
  const coachIds = [coach1.value, coach2.value, coach3.value].filter(id => id !== null);
  
  isSavingCoaches.value = true;
  try {
    await teamStore.setCoaches(teamId.value, seasonId.value, coachIds);
    // Refresh team data to show updated coach status
    await fetchTeam();
  } catch (error) {
    console.error('Failed to save coaches:', error);
    errorMessage.value = 'Failed to save coaches. Please try again.';
  } finally {
    isSavingCoaches.value = false;
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

// Resolve current W3C season from config
async function resolveCurrentW3CSeason() {
  try {
    const setting = await configStore.fetchSetting('current_wc3_season');
    if (setting && setting.value) {
      const num = Number(setting.value);
      if (!Number.isNaN(num)) {
        currentW3CSeason.value = num;
        return;
      }
    }
  } catch (err) {
    console.warn('Failed to fetch current_wc3_season setting:', err);
  }
  currentW3CSeason.value = null;
}

onMounted(async () => {
  await resolveCurrentW3CSeason();
  fetchTeam(); 
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

const syncW3CTeam = async () => {
  isLoading.value = true;
  try {
    await teamStore.syncPlayersW3C(teamId.value, seasonId.value);
    await fetchTeam();
  } catch (error) {
    console.error('Error syncing W3C data:', error);
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

const searchPlayer = async () => {
  // Use client-side filtering for the Add Player modal (allPlayers already fetched).
  searchEnabled.value = true;
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
    const q = searchName.value.trim().toLowerCase();
    list = list.filter(p => {
      const name = (p.name || '').toLowerCase();
      const bt = (p.battleTag || '').toLowerCase();
      const discord = (p.discordTag || '').toLowerCase();
      return name.includes(q) || bt.includes(q) || discord.includes(q);
    });
  }

  if (searchRace.value) {
    list = list.filter(p => p.race === searchRace.value);
  }

  // filter by mmr range — only apply if user changed from defaults
  const DEFAULT_MMR_MIN = 0;
  const DEFAULT_MMR_MAX = 3000;
  if (Array.isArray(rangeValues.value) && rangeValues.value.length === 2) {
    const mmrMin = Number(rangeValues.value[0]);
    const mmrMax = Number(rangeValues.value[1]);
    const rangeChanged = (mmrMin !== DEFAULT_MMR_MIN) || (mmrMax !== DEFAULT_MMR_MAX);
    if (rangeChanged) {
      list = list.filter(p => {
        const mmr = Number(getW3CMMR(p, currentW3CSeason.value) ?? 0);
        return mmr >= mmrMin && mmr <= mmrMax;
      });
    }
  }

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
