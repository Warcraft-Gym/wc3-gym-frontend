<script setup>
import { ref, onMounted, computed } from 'vue';
import { useRouter } from 'vue-router';
import { useTeamStore, useSeasonStore, usePlayerStore, useAuthStore, useKothStore } from '@/stores';
import { storeToRefs } from 'pinia';
import StatusAlert from '@/components/StatusAlert.vue';
import PlayerName from '@/components/PlayerName.vue';
import { joinableEvents, upcomingEvents } from '@/helpers/events.mjs';

const router = useRouter();

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

// /me answers signed_up for its season only, and /signup acts on that season only
const events = computed(() => upcomingEvents({ seasons: seasons.value, currentSeasonId: me.value?.season_id, signedUp: !!me.value?.signed_up, kothEvents: kothStore.events }));
const seasonRow = computed(() => events.value.find((row) => row.key === `season:${me.value?.season_id}`) || null);
const currentSeason = computed(() => seasons.value.find((season) => season.id === me.value?.season_id) || null);
const slug = computed(() => (currentSeason.value ? seasonStore.slugOf(currentSeason.value.id) : null));

const quickLinks = computed(() => [
  { title: 'My dashboard', icon: 'mdi-view-dashboard', to: '/player-dashboard' },
  { title: 'All events', icon: 'mdi-calendar-star', to: '/events' },
  ...(me.value?.team ? [{ title: me.value.team.name, icon: 'mdi-shield-account', to: `/team/${me.value.team.id}` }] : []),
  ...(slug.value ? [
    { title: 'Season report', icon: 'mdi-trophy-outline', to: `/report/${slug.value}` },
    { title: 'Upcoming series', icon: 'mdi-calendar-clock', to: '/upcoming' },
    { title: 'Ladder', icon: 'mdi-chart-line', to: `/ladder?season=${slug.value}` },
    { title: 'Players', icon: 'mdi-account-multiple', to: `/players?season=${slug.value}` },
    { title: 'My fantasy team', icon: 'mdi-cards-playing-outline', to: `/fantasy-registration?season=${slug.value}` },
  ] : []),
]);

const rowTarget = (row) => (row.kind === 'koth' ? '/koth/dashboard' : '/signup');
const kindLabel = { season: 'GNL season', koth: 'King of the Hill' };
// A season date is a calendar day, so it reads in UTC; a KOTH night is a moment
const day = (row) => row.date?.toLocaleDateString(undefined, { day: 'numeric', ...(row.kind === 'season' && { timeZone: 'UTC' }) }) ?? '–';
const month = (row) => row.date?.toLocaleDateString(undefined, { month: 'short', ...(row.kind === 'season' && { timeZone: 'UTC' }) }) ?? '';

// The landing popup shows once per browser session, and only when there is something to join
const POPUP_KEY = 'eventsPopupSeen';
const popup = ref(false);
const popupRows = computed(() => joinableEvents(events.value));
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
    errorMessage.value = 'Failed to load the home page. Please try again later.';
  } finally {
    isLoading.value = false;
  }
};

onMounted(fetchHomeData);
</script>

<template>
  <v-container fluid class="pa-4 home">
    <div class="d-flex align-center ga-4 mb-6">
      <v-avatar size="56" color="primary">
        <v-img v-if="me?.avatar" :src="me.avatar" alt="" />
        <span v-else>{{ (me?.name || '?').slice(0, 2).toUpperCase() }}</span>
      </v-avatar>
      <div class="min-w-0">
        <div class="text-h5 font-weight-bold">
          <PlayerName v-if="me?.user" :player="me.user" />
          <span v-else>{{ me?.name }}</span>
        </div>
        <div v-if="me?.user?.battleTag" class="text-body-2 text-medium-emphasis">{{ me.user.battleTag }}</div>
      </div>
    </div>

    <StatusAlert v-model="errorMessage" />

    <v-skeleton-loader v-if="isLoading" type="list-item-avatar-two-line@3" />
    <template v-else>
      <v-card v-if="seasonRow" class="mb-8" elevation="2">
        <div class="d-flex flex-wrap align-center ga-4 pa-4">
          <div class="date-tile date-tile--lg">
            <div class="date-tile__day">{{ day(seasonRow) }}</div>
            <div class="date-tile__month">{{ month(seasonRow) }}</div>
          </div>
          <div class="flex-grow-1 min-w-0">
            <div class="text-h5 font-weight-bold">{{ seasonRow.name }}</div>
            <div class="text-body-1 text-medium-emphasis">
              <template v-if="seasonRow.joined">You are signed up</template>
              <template v-else-if="seasonRow.action === 'signup'">Signups are open</template>
              <template v-else>Signups are closed. An admin may add you.</template>
            </div>
          </div>
          <div class="d-flex flex-wrap ga-2">
            <template v-if="seasonRow.joined">
              <v-btn color="primary" variant="elevated" prepend-icon="mdi-view-dashboard" to="/player-dashboard">My dashboard</v-btn>
            </template>
            <v-btn v-else-if="seasonRow.action === 'signup'" color="primary" variant="elevated" size="large" prepend-icon="mdi-account-plus" to="/signup">Sign up</v-btn>
            <v-btn v-else color="primary" variant="outlined" prepend-icon="mdi-hand-back-right-outline" to="/signup">Ask to join</v-btn>
          </div>
        </div>
      </v-card>

      <v-row>
        <v-col cols="12" md="7">
          <div class="d-flex align-center mb-2">
            <h2 class="text-h6">Upcoming events</h2>
            <v-spacer />
            <v-btn variant="text" size="small" append-icon="mdi-chevron-right" to="/events">All events</v-btn>
          </div>
          <v-card elevation="1">
            <v-list v-if="events.length" lines="two" class="py-0">
              <template v-for="(row, i) in events" :key="row.key">
                <v-divider v-if="i" />
                <v-list-item class="py-3">
                  <template #prepend>
                    <div class="date-tile mr-4">
                      <div class="date-tile__day">{{ day(row) }}</div>
                      <div class="date-tile__month">{{ month(row) }}</div>
                    </div>
                  </template>
                  <v-list-item-title class="font-weight-medium">{{ row.name }}</v-list-item-title>
                  <v-list-item-subtitle>{{ kindLabel[row.kind] }}</v-list-item-subtitle>
                  <template #append>
                    <v-chip v-if="row.joined" color="success" variant="tonal" size="small" prepend-icon="mdi-check">Signed up</v-chip>
                    <v-btn v-else-if="row.action === 'signup'" color="primary" size="small" variant="tonal" :to="rowTarget(row)">Sign up</v-btn>
                    <v-btn v-else-if="row.action === 'request'" size="small" variant="text" :to="rowTarget(row)">Ask to join</v-btn>
                  </template>
                </v-list-item>
              </template>
            </v-list>
            <v-card-text v-else class="text-medium-emphasis">No upcoming events</v-card-text>
          </v-card>
        </v-col>

        <v-col cols="12" md="5">
          <h2 class="text-h6 mb-2">{{ currentSeason?.name || 'This season' }}</h2>
          <v-card elevation="1">
            <v-list class="py-0" density="comfortable">
              <v-list-item v-for="link in quickLinks" :key="link.to" :to="link.to" :prepend-icon="link.icon" :title="link.title" append-icon="mdi-chevron-right" />
            </v-list>
          </v-card>
        </v-col>
      </v-row>
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
            <v-list-item-subtitle>{{ kindLabel[row.kind] }}</v-list-item-subtitle>
            <template #append>
              <v-btn color="primary" size="small" variant="elevated" :to="rowTarget(row)">Sign up</v-btn>
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
  width: 52px;
  flex: none;
  text-align: center;
  border: 1px solid rgba(var(--v-theme-on-surface), 0.16);
  border-radius: 4px;
  padding: 4px 0;
  line-height: 1.1;
}

.date-tile--lg {
  width: 72px;
  padding: 8px 0;
}

.date-tile__day {
  font-size: 1.4rem;
  font-weight: 700;
  font-variant-numeric: tabular-nums;
}

.date-tile--lg .date-tile__day {
  font-size: 2rem;
}

.date-tile__month {
  font-size: 0.8rem;
  color: rgba(var(--v-theme-on-surface), var(--v-medium-emphasis-opacity));
}

.dashboard-card {
  cursor: pointer;
  transition: all 0.3s ease-in-out;
}

.dashboard-card.on-hover {
  transform: translateY(-5px);
}
</style>
