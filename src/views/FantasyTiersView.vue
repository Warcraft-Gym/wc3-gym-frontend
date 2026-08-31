<template>
  <v-overlay v-model="isLoading" contained class="align-center justify-center">
    <v-progress-circular color="primary" indeterminate size="64"></v-progress-circular>
  </v-overlay>

  <v-container fluid class="pa-4">
    <v-row class="mb-4">
      <v-col>
        <h1><v-icon class="mr-2">mdi-trophy-variant</v-icon> Fantasy Player Tiers</h1>
        <p class="text-grey">Allocate players to fantasy tiers based on MMR ranges</p>
      </v-col>
    </v-row>

    <StatusAlert v-model="errorMessage" />

    <StatusAlert v-model="successMessage" type="success" />

    <!-- MMR Range Configuration -->
    <v-card elevation="2" class="mb-6">
      <v-card-title class="bg-primary">
        <v-icon class="mr-2">mdi-tune</v-icon>
        Configure Tier MMR Ranges
      </v-card-title>
      <v-card-text class="pt-4">
        <v-alert type="info" variant="tonal" density="compact" class="mb-4">
          Define MMR ranges for each tier. Players allocated to teams in the current season will be automatically grouped into these tiers.
        </v-alert>

        <v-btn color="primary" variant="tonal" prepend-icon="mdi-scale-balance" class="mb-4" :disabled="!currentSeasonPlayers.length" @click="distributeEvenly">
          Even Split by MMR
        </v-btn>
        
        <v-row>
          <v-col v-for="(tier, index) in tiers" :key="index" cols="12" md="6" lg="4">
            <v-card variant="outlined">
              <v-card-title class="text-h6 bg-grey-lighten-4">
                <v-icon class="mr-2">mdi-numeric-{{ index + 1 }}-circle</v-icon>
                Tier {{ index + 1 }}
              </v-card-title>
              <v-card-text>
                <v-row dense>
                  <v-col cols="6">
                    <v-text-field
                      v-model.number="tier.min"
                      label="Min MMR"
                      type="number"
                      variant="outlined"
                      density="compact"
                      hide-details
                      @input="updateTierRanges"
                    ></v-text-field>
                  </v-col>
                  <v-col cols="6">
                    <v-text-field
                      v-model.number="tier.max"
                      label="Max MMR"
                      type="number"
                      variant="outlined"
                      density="compact"
                      hide-details
                      @input="updateTierRanges"
                    ></v-text-field>
                  </v-col>
                </v-row>
                <v-chip 
                  class="mt-2" 
                  color="primary" 
                  variant="outlined"
                  size="small"
                >
                  {{ tier.players.length }} players
                </v-chip>
              </v-card-text>
            </v-card>
          </v-col>
        </v-row>
      </v-card-text>
    </v-card>

    <!-- Players Preview by Tier -->
    <v-card elevation="2" class="mb-6">
      <v-card-title class="bg-primary d-flex justify-space-between align-center">
        <div>
          <v-icon class="mr-2">mdi-account-group</v-icon>
          Players by Tier (On Teams)
        </div>
        <v-chip color="white" variant="outlined">
          {{ totalPlayers }} total players
        </v-chip>
      </v-card-title>
      <v-card-text class="pa-0">
        <v-expansion-panels>
          <v-expansion-panel v-for="(tier, index) in tiers" :key="index">
            <v-expansion-panel-title>
              <div class="d-flex align-center justify-space-between w-100 pr-4">
                <div>
                  <v-icon class="mr-2">mdi-numeric-{{ index + 1 }}-circle</v-icon>
                  <strong>Tier {{ index + 1 }}</strong>
                  <span class="ml-2 text-grey">({{ tier.min }} - {{ tier.max }} MMR)</span>
                </div>
                <v-chip color="primary" size="small">
                  {{ tier.players.length }} players
                </v-chip>
              </div>
            </v-expansion-panel-title>
            <v-expansion-panel-text>
              <v-list v-if="tier.players.length > 0" density="compact">
                <v-list-item
                  v-for="player in tier.players"
                  :key="player.id"
                  class="border-b"
                >
                  <template #prepend>
                    <v-avatar color="primary" size="32">
                      {{ player.name.charAt(0).toUpperCase() }}
                    </v-avatar>
                  </template>
                  <v-list-item-title>
                    <strong>{{ player.name }}</strong>
                  </v-list-item-title>
                  <v-list-item-subtitle>
                    {{ player.battleTag }} • <W3CMmr /> {{ getW3CMMR(player) ?? 'N/A' }}
                  </v-list-item-subtitle>
                  <template #append>
                    <v-chip 
                      v-if="player.fantasy_tier" 
                      color="grey" 
                      size="small"
                      variant="outlined"
                    >
                      Current: Tier {{ player.fantasy_tier }}
                    </v-chip>
                  </template>
                </v-list-item>
              </v-list>
              <v-alert v-else type="info" variant="tonal" class="ma-2">
                No players in this tier range
              </v-alert>
            </v-expansion-panel-text>
          </v-expansion-panel>
        </v-expansion-panels>
      </v-card-text>
    </v-card>

    <!-- Submit Button -->
    <v-card elevation="2">
      <v-card-text class="text-center pa-6">
        <v-alert type="warning" variant="tonal" class="mb-4">
          <strong>Warning:</strong> Clicking "Apply Tier Allocation" will:
          <ul class="mt-2">
            <li>Clear all existing tier assignments for ALL players</li>
            <li>Assign new tier values (1-6) to players allocated to teams in the current season</li>
            <li>This action cannot be undone</li>
          </ul>
        </v-alert>
        
        <v-btn
          color="primary"
          size="large"
          variant="elevated"
          prepend-icon="mdi-content-save"
          :loading="isSaving"
          :disabled="isSaving || totalPlayers === 0"
          @click="applyTierAllocation"
        >
          Apply Tier Allocation
        </v-btn>
      </v-card-text>
    </v-card>
  </v-container>
</template>

<script setup>
import { ref, onMounted, computed } from 'vue';
import { usePlayerStore, useTeamStore } from '@/stores';
import { storeToRefs } from 'pinia';
import W3CMmr from '@/components/W3CMmr.vue';
import { getW3CStatsWithFallback } from '@/helpers/w3c-stats';
import { resolveCurrentSeasonId, resolveCurrentW3CSeason } from '@/helpers/current-season';
import StatusAlert from '@/components/StatusAlert.vue';


const playerStore = usePlayerStore();
const teamStore = useTeamStore();
const { players } = storeToRefs(playerStore);
const { teams } = storeToRefs(teamStore);

const isLoading = ref(true);
const isSaving = ref(false);
const errorMessage = ref(null);
const successMessage = ref(null);
const currentSeasonId = ref(null);
const currentW3CSeason = ref(null);

// Default tier ranges
const tiers = ref([
  { min: 1600, max: 3000, players: [] }, // Tier 1
  { min: 1400, max: 1599, players: [] }, // Tier 2
  { min: 1200, max: 1399, players: [] }, // Tier 3
  { min: 1000, max: 1199, players: [] }, // Tier 4
  { min: 800, max: 999, players: [] },   // Tier 5
  { min: 0, max: 799, players: [] },     // Tier 6
]);

const totalPlayers = computed(() => {
  return tiers.value.reduce((sum, tier) => sum + tier.players.length, 0);
});

// Get W3C MMR for player's race (with fallback)
const getW3CMMR = (player) => {
  const stats = getW3CStatsWithFallback(player, null, currentW3CSeason.value);
  return stats?.mmr ?? null;
};

// Get current season players (only those allocated to teams)
const currentSeasonPlayers = computed(() => {
  if (!currentSeasonId.value || !players.value || !teams.value) return [];
  
  // Build a set of player IDs that are on teams for the current season
  const playerIdsOnTeams = new Set();
  const sid = String(currentSeasonId.value);
  
  teams.value.forEach(team => {
    const teamPlayers = team.player_by_season?.[sid] || team.player_by_season?.[Number(sid)];
    if (teamPlayers) {
      if (Array.isArray(teamPlayers)) {
        teamPlayers.forEach(p => p && p.id && playerIdsOnTeams.add(p.id));
      } else if (typeof teamPlayers === 'object') {
        Object.values(teamPlayers).forEach(p => p && p.id && playerIdsOnTeams.add(p.id));
      }
    }
  });
  
  // Filter players to only include those on teams
  return players.value.filter(player => playerIdsOnTeams.has(player.id));
});

// Update tier player allocations based on MMR ranges
const updateTierRanges = () => {
  tiers.value.forEach(tier => {
    tier.players = currentSeasonPlayers.value.filter(player => {
      const mmr = getW3CMMR(player) || 0;
      return mmr >= tier.min && mmr <= tier.max;
    });
  });
};

// Load initial data
const loadData = async () => {
  isLoading.value = true;
  errorMessage.value = null;
  
  try {
    currentSeasonId.value = await resolveCurrentSeasonId();
    currentW3CSeason.value = await resolveCurrentW3CSeason();
    await playerStore.fetchPlayers();
    
    // Fetch teams for the current season
    if (currentSeasonId.value) {
      await teamStore.fetchTeamsBySeason(currentSeasonId.value);
    }
    
    updateTierRanges();
  } catch (error) {
    console.error('Error loading data:', error);
    errorMessage.value = 'Failed to load player data. Please try again.';
  } finally {
    isLoading.value = false;
  }
};

// Set the tier ranges so each holds about the same number of players:
// sort the season's players by MMR and cut at the sixths. Ties share a
// tier, so counts can differ a little; the ranges stay editable after.
const distributeEvenly = () => {
  const sorted = currentSeasonPlayers.value
    .map(player => getW3CMMR(player) || 0)
    .sort((a, b) => b - a);
  const count = tiers.value.length;
  let ceiling = Math.max(3000, sorted[0]);
  tiers.value.forEach((tier, index) => {
    const last = Math.ceil(((index + 1) * sorted.length) / count) - 1;
    tier.max = ceiling;
    tier.min = index === count - 1 ? 0 : Math.min(sorted[last], ceiling);
    ceiling = tier.min - 1;
  });
  updateTierRanges();
};

// Apply tier allocation
const applyTierAllocation = async () => {
  if (!confirm('Are you sure you want to apply this tier allocation? This will clear all existing tier assignments.')) {
    return;
  }

  isSaving.value = true;
  errorMessage.value = null;
  successMessage.value = null;

  try {
    // One request replaces the whole allocation; unlisted players lose their tier
    const allocation = {};
    tiers.value.forEach((tier, index) => {
      tier.players.forEach(player => {
        allocation[player.id] = index + 1;
      });
    });

    await playerStore.updateFantasyTiers(allocation);

    successMessage.value = `Successfully updated tier assignments for ${totalPlayers.value} players!`;
    
    // Refresh player data
    await playerStore.fetchPlayers();
    updateTierRanges();
    
  } catch (error) {
    console.error('Error applying tier allocation:', error);
    errorMessage.value = 'Failed to apply tier allocation. Please try again.';
  } finally {
    isSaving.value = false;
  }
};

onMounted(() => {
  loadData();
});
</script>

<style scoped>
.border-b {
  border-bottom: 1px solid rgba(0, 0, 0, 0.12);
}

.v-expansion-panel-text :deep(.v-expansion-panel-text__wrapper) {
  padding: 0;
}
</style>
