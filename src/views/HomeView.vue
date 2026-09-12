<script setup>
import { ref, onMounted, computed } from 'vue';
import { useRouter } from 'vue-router';
import { useDisplay } from 'vuetify';
import { useTeamStore, useSeasonStore, usePlayerStore, useAuthStore, useKothStore } from '@/stores';
import { storeToRefs } from 'pinia';
import StatusAlert from '@/components/StatusAlert.vue';
import { homeCards, joinableEvents } from '@/helpers/events.mjs';

const router = useRouter();
const { smAndDown } = useDisplay();

const teamStore = useTeamStore();
const seasonStore = useSeasonStore();
const playerStore = usePlayerStore();
const authStore = useAuthStore();
const kothStore = useKothStore();

const { teams } = storeToRefs(teamStore);
const { seasons } = storeToRefs(seasonStore);
const { players } = storeToRefs(playerStore);
const { me, isAdmin } = storeToRefs(authStore);

const isLoading = ref(true);
const errorMessage = ref(null);

// /me names every season the account is in or may join; the /seasons row adds the rounds
const cards = computed(() => homeCards({ me: me.value, seasons: seasons.value, kothEvents: kothStore.events }));

// A season date is a calendar day, so it reads in UTC; a KOTH night is a moment
const day = (card) => card.date?.toLocaleDateString(undefined, { day: 'numeric', ...(card.kind === 'season' && { timeZone: 'UTC' }) }) ?? '\u2013';
const month = (card) => card.date?.toLocaleDateString(undefined, { month: 'short', ...(card.kind === 'season' && { timeZone: 'UTC' }) }) ?? '';

// The landing popup shows once per browser session, and only when there is something to join
const POPUP_KEY = 'eventsPopupSeen';
const popup = ref(false);
const popupRows = computed(() => joinableEvents(cards.value));
const openPopupOnce = () => {
  try {
    if (!popupRows.value.length || sessionStorage.getItem(POPUP_KEY)) return;
    sessionStorage.setItem(POPUP_KEY, '1');
  } catch {
    return;
  }
  popup.value = true;
};

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

const fetchHomeData = async () => {
  isLoading.value = true;
  errorMessage.value = null;
  try {
    await Promise.all([
      seasonStore.fetchSeasons(),
      kothStore.fetchAllEvents().catch(() => {}),  // KOTH nights are extra; the page stands without them
      ...(isAdmin.value ? [teamStore.fetchTeams(), playerStore.fetchPlayers()] : []),
    ]);
    openPopupOnce();
  } catch (error) {
    console.error('Error loading the home page:', error);
    errorMessage.value = error.message || 'Failed to load the home page.';
  } finally {
    isLoading.value = false;
  }
};

onMounted(fetchHomeData);
</script>

<template>
  <v-container fluid class="pa-4 home">
    <StatusAlert v-model="errorMessage" />

    <v-skeleton-loader v-if="isLoading" type="list-item-avatar-two-line@3" />
    <template v-else>
      <v-card v-for="card in cards" :key="card.key" class="mb-4" elevation="2">
        <div class="pa-4">
          <div class="d-flex ga-4 align-start">
            <div class="date-tile">
              <div class="date-tile__day">{{ day(card) }}</div>
              <div class="date-tile__month">{{ month(card) }}</div>
            </div>
            <div class="flex-grow-1 min-w-0">
              <h2 class="text-h5 font-weight-bold">{{ card.name }}</h2>
              <div class="text-body-2 text-medium-emphasis">{{ card.status }}</div>
              <div v-if="card.chips.length" class="d-flex flex-wrap ga-2 mt-2">
                <v-chip v-for="chip in card.chips" :key="chip.title" :color="chip.color" :prepend-icon="chip.icon" variant="tonal" size="small">{{ chip.title }}</v-chip>
              </div>
            </div>
            <v-btn v-if="card.primary && !smAndDown" class="align-self-center" color="primary" :variant="card.primary.variant" :to="card.primary.to">{{ card.primary.title }}</v-btn>
          </div>
          <v-btn v-if="card.primary && smAndDown" class="mt-3" block color="primary" :variant="card.primary.variant" :to="card.primary.to">{{ card.primary.title }}</v-btn>
          <div v-if="card.links.length" class="card-links mt-3 pt-3">
            <RouterLink v-for="link in card.links" :key="link.to" :to="link.to" class="card-link">
              <v-icon :icon="link.icon" size="16" />{{ link.title }}
            </RouterLink>
          </div>
        </div>
      </v-card>
      <div v-if="!cards.length" class="text-medium-emphasis">No events yet.</div>
    </template>

    <template v-if="isAdmin">
      <h2 class="text-h6 mt-10 mb-2">Admin</h2>
      <v-row>
        <v-col v-for="(stat, key) in stats" :key="key" cols="12" md="4">
          <v-hover v-slot="{ isHovering, props }">
            <v-card
              v-bind="props"
              :elevation="isHovering ? 8 : 2"
              @click="router.push(stat.route)"
              class="dashboard-card d-flex flex-column"
              :class="{ 'on-hover': isHovering }"
            >
              <v-card-title class="bg-primary">
                <v-icon :icon="stat.icon" size="large" class="mr-2" />
                {{ key.charAt(0).toUpperCase() + key.slice(1) }}
              </v-card-title>
              <v-card-text class="pt-6 text-center">
                <div class="text-h2 mb-3 text-primary">{{ isLoading ? '–' : stat.total }}</div>
                <div class="text-h6 mb-2 font-weight-medium">{{ stat.label }}</div>
                <div class="text-body-2 text-medium-emphasis">{{ stat.description }}</div>
              </v-card-text>
            </v-card>
          </v-hover>
        </v-col>
      </v-row>
    </template>

    <v-dialog v-model="popup" max-width="560" :fullscreen="false">
      <v-card>
        <v-card-title class="text-h6 pt-4">Upcoming events</v-card-title>
        <v-list lines="two" class="py-0">
          <v-list-item v-for="row in popupRows" :key="row.key">
            <template #prepend>
              <div class="date-tile mr-4">
                <div class="date-tile__day">{{ day(row) }}</div>
                <div class="date-tile__month">{{ month(row) }}</div>
              </div>
            </template>
            <v-list-item-title class="font-weight-medium">{{ row.name }}</v-list-item-title>
            <v-list-item-subtitle>{{ row.status }}</v-list-item-subtitle>
            <template #append>
              <v-btn color="primary" size="small" variant="elevated" :to="row.primary.to">{{ row.primary.title }}</v-btn>
            </template>
          </v-list-item>
        </v-list>
        <v-card-actions>
          <v-spacer />
          <v-btn variant="text" @click="popup = false">Close</v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>
  </v-container>
</template>

<style scoped>
.min-w-0 {
  min-width: 0;
}

.date-tile {
  width: 60px;
  flex: none;
  text-align: center;
  border: 1px solid rgba(var(--v-theme-on-surface), 0.16);
  border-radius: 4px;
  padding: 4px 0;
  line-height: 1.1;
}

.date-tile__day {
  font-size: 1.4rem;
  font-weight: 700;
  font-variant-numeric: tabular-nums;
}

.date-tile__month {
  font-size: 0.8rem;
  color: rgba(var(--v-theme-on-surface), var(--v-medium-emphasis-opacity));
}

.card-links {
  display: flex;
  flex-wrap: wrap;
  gap: 4px 18px;
  border-top: 1px solid rgba(var(--v-theme-on-surface), 0.16);
}

.card-link {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  font-weight: 500;
  text-decoration: none;
  color: rgb(var(--v-theme-primary-text));
}

.dashboard-card {
  cursor: pointer;
  transition: all 0.3s ease-in-out;
}

.dashboard-card.on-hover {
  transform: translateY(-5px);
}
</style>
