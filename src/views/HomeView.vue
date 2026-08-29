<script setup>
import { ref, onMounted, computed } from 'vue';
import { useRouter } from 'vue-router';
import { useTeamStore, useSeasonStore, usePlayerStore } from '@/stores';
import { storeToRefs } from 'pinia';


// Router
const router = useRouter();

// Stores
const teamStore = useTeamStore();
const seasonStore = useSeasonStore();
const playerStore = usePlayerStore();

// Store refs
const { teams } = storeToRefs(teamStore);
const { seasons } = storeToRefs(seasonStore);
const { players } = storeToRefs(playerStore);

// Component state
const isLoading = ref(true);
const errorMessage = ref(null);

// Computed stats
const stats = computed(() => ({
  teams: {
    total: teams.value.length,
    label: 'Active Teams',
    description: 'Manage team rosters and standings',
    icon: 'mdi-account-group',
    route: '/teams'
  },
  seasons: {
    total: seasons.value.length,
    label: 'Total Seasons',
    description: 'View and manage league seasons',
    icon: 'mdi-trophy',
    route: '/seasons'
  },
  players: {
    total: players.value.length,
    label: 'Registered Players',
    description: 'Player profiles and statistics',
    icon: 'mdi-account',
    route: '/players'
  }
}));

// Data fetching
const fetchDashboardData = async () => {
  isLoading.value = true;
  errorMessage.value = null;
  
  try {
    await Promise.all([
      teamStore.fetchTeams(),
      seasonStore.fetchSeasons(),
      playerStore.fetchPlayers()
    ]);
  } catch (error) {
    console.error('Error loading dashboard data:', error);
    errorMessage.value = 'Failed to load dashboard data. Please try again later.';
  } finally {
    isLoading.value = false;
  }
};

// Lifecycle hooks
onMounted(() => {
  fetchDashboardData();
});

// Navigation
const navigateTo = (route) => {
  router.push(route);
};
</script>

<template>
  <div>
    <!-- Loading Overlay -->
    <v-overlay v-model="isLoading" persistent absolute>
      <v-progress-circular
        indeterminate
        size="64"
        width="8"
        color="primary"
      ></v-progress-circular>
    </v-overlay>

    <v-container fluid class="pa-4">
      <v-row class="mb-4">
        <v-col>
          <h1><v-icon class="mr-2">mdi-home</v-icon> GNL League Dashboard</h1>
        </v-col>
      </v-row>

      <!-- Error Message -->
      <v-alert
        v-if="errorMessage"
        type="error"
        variant="tonal"
        border="start"
        border-color="red"
        class="mb-4"
        closable
        @click:close="errorMessage = null"
      >
        {{ errorMessage }}
      </v-alert>

      <!-- Dashboard Cards -->
      <v-row class="mt-4">
        <v-col v-for="(stat, key) in stats" :key="key" cols="12" md="4">
          <v-hover v-slot="{ isHovering, props }">
            <v-card
              v-bind="props"
              :elevation="isHovering ? 8 : 2"
              @click="navigateTo(stat.route)"
              class="dashboard-card d-flex flex-column"
              min-height="300"
              :class="{ 'on-hover': isHovering }"
            >
              <v-card-title class="bg-primary">
                <v-icon :icon="stat.icon" size="large" class="mr-2" />
                {{ key.charAt(0).toUpperCase() + key.slice(1) }}
              </v-card-title>
              
              <v-card-text class="pt-6 flex-grow-1 d-flex align-center">
                <div class="d-flex flex-column justify-center align-center text-center w-100">
                  <div class="text-h2 mb-3" style="color: rgb(var(--v-theme-primary))">{{ stat.total }}</div>
                  <div class="text-h6 mb-2 font-weight-medium">{{ stat.label }}</div>
                  <div class="text-body-2 text-medium-emphasis">{{ stat.description }}</div>
                </div>
              </v-card-text>
              
              <v-card-actions class="justify-center pb-4">
                <v-btn
                  variant="elevated"
                  color="primary"
                  prepend-icon="mdi-arrow-right"
                >
                  View {{ key.charAt(0).toUpperCase() + key.slice(1) }}
                </v-btn>
              </v-card-actions>
            </v-card>
          </v-hover>
        </v-col>
      </v-row>
    </v-container>
  </div>
</template>

<style scoped>
.dashboard-card {
  cursor: pointer;
  transition: all 0.3s ease-in-out;
}

.dashboard-card.on-hover {
  transform: translateY(-5px);
}

.text-medium-emphasis {
  opacity: 0.7;
}
</style>
