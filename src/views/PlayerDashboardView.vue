<template>
  <v-overlay v-model="isLoading" contained class="align-center justify-center">
    <v-progress-circular color="primary" indeterminate size="64"></v-progress-circular>
  </v-overlay>

  <v-container fluid class="pa-4">
    <v-row class="mb-4">
      <v-col>
        <h1><v-icon class="mr-2">mdi-view-dashboard</v-icon> Player Dashboard</h1>
      </v-col>
    </v-row>

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

    <v-alert
      v-if="successMessage"
      type="success"
      variant="tonal"
      border="start"
      border-color="green"
      class="mb-4"
      closable
      @click:close="successMessage = null"
    >
      {{ successMessage }}
    </v-alert>
    <v-card v-if="!isLoading && playerData" elevation="2" class="mb-6">
      <v-card-title class="bg-primary">
        <v-icon class="mr-2">mdi-account-circle</v-icon>
        Player Information
      </v-card-title>
      <v-card-text class="pt-4">
        <v-alert v-if="needsSignup" type="info" variant="tonal" border="start" class="mb-4">
          <div class="d-flex align-center justify-space-between flex-wrap ga-2">
            <span>Not signed up for {{ seasonLabel }}</span>
            <v-btn color="primary" variant="elevated" size="small" @click="router.push('/signup')">Sign up</v-btn>
          </div>
        </v-alert>
        <v-chip color="secondary" class="mb-2">
          {{ playerData.discord_tag }}
        </v-chip>
        <h2 class="text-h5 mb-2">
          <PlayerName
            :player="playerData.player"
            :race="playerData.player.race"
            @click.stop="showPlayerDetails(playerData.player)"
          />
        </h2>
        <p>
          <strong>Battle Tag:</strong>
          <a :href="w3cPlayerUrl(playerData.player.battleTag)" target="_blank" rel="noopener noreferrer" class="text-decoration-none">
            {{ playerData.player.battleTag }} <W3CIcon :size="16" />
          </a>
        </p>
        <p><strong>MMR:</strong> {{ getW3CMMR(playerData.player, null) }}</p>
        <v-chip v-if="playerData.player.timezone" size="small" variant="tonal" prepend-icon="mdi-clock-outline">
          {{ playerData.player.timezone }}
        </v-chip>
      </v-card-text>
    </v-card>

    <v-card v-if="!isLoading && playerData" elevation="2">
      <v-card-title class="bg-primary d-flex justify-space-between align-center">
        <div class="d-flex align-center">
          <v-icon class="mr-2">mdi-tournament</v-icon>
          <span>My Series</span>
        </div>
        <v-chip color="white" variant="outlined">
          {{ totalSeries }} series
        </v-chip>
      </v-card-title>
      
      <!-- Desktop: Data Table -->
      <v-card-text v-if="!isMobile" class="pa-0">
      <v-data-table-server
        :headers="headers"
        :items="series"
        :items-length="totalSeries"
        v-model:page="page"
        v-model:items-per-page="itemsPerPage"
        :items-per-page-options="[10, 25, 50, 100, { value: -1, title: 'All' }]"
        v-model:sort-by="sortBy"
        :loading="isLoading"
        class="elevation-1"
        item-value="id"
      >
        <template #item.opponent="{ item }">
          <PlayerName
            :player="opponent(item)"
            :race="opponent(item).race"
            @click.stop="showPlayerDetails(opponent(item))"
          />
          <div class="text-caption text-grey">{{ getW3CMMR(opponent(item), currentW3CSeason) }}</div>
        </template>

        <template #item.score="{ item }">
          <v-chip
            :color="getScoreColor(item)"
            variant="outlined"
            size="small"
          >
            {{ item.player1_score || 0 }} - {{ item.player2_score || 0 }}
          </v-chip>
        </template>

        <template #item.date_time="{ item }">
          {{ formatDateTime(item.date_time) }}
        </template>

        <template #item.week="{ item }">
          {{ item.match?.playday || 'TBD' }}
        </template>

        <template #item.actions="{ item }">
          <v-btn
            color="primary"
            variant="elevated"
            size="small"
            prepend-icon="mdi-calendar-edit"
            @click="editSchedule(item)"
            :loading="scheduleSavingId === item.id"
            :disabled="scheduleSavingId === item.id || scoreSavingId === item.id"
          >
            Edit Schedule
          </v-btn>
          <v-btn
            color="success"
            variant="elevated"
            size="small"
            prepend-icon="mdi-trophy"
            class="ml-2"
            @click="reportResult(item)"
            :loading="scoreSavingId === item.id"
            :disabled="scoreSavingId === item.id || scheduleSavingId === item.id"
          >
            Report Result
          </v-btn>
        </template>
      </v-data-table-server>
      </v-card-text>

      <!-- Mobile: Card Layout -->
      <v-card-text v-if="isMobile" class="pa-4">
        <v-card
          v-for="item in series"
          :key="item.id"
          elevation="1"
          class="mb-4"
        >
          <v-card-text>
            <div class="d-flex justify-space-between align-center mb-3">
              <div>
                <div class="text-caption text-grey">Opponent</div>
                <div class="text-h6">
                  <PlayerName
                    :player="opponent(item)"
                    :race="opponent(item).race"
                    @click.stop="showPlayerDetails(opponent(item))"
                  />
                  <div class="text-caption text-grey">{{ getW3CMMR(opponent(item), currentW3CSeason) }}</div>
                </div>
              </div>
              <v-chip
                :color="getScoreColor(item)"
                variant="outlined"
              >
                {{ item.player1_score || 0 }} - {{ item.player2_score || 0 }}
              </v-chip>
            </div>

            <v-divider class="my-3"></v-divider>

            <div class="mb-2">
              <div class="text-caption text-grey">Date & Time</div>
              <div>{{ formatDateTime(item.date_time) }}</div>
            </div>

            <div class="mb-3">
              <div class="text-caption text-grey">Week</div>
              <div>{{ item.match?.playday || 'TBD' }}</div>
            </div>

            <div class="d-flex flex-column gap-2">
              <v-btn
                color="primary"
                variant="elevated"
                block
                prepend-icon="mdi-calendar-edit"
                @click="editSchedule(item)"
                :loading="scheduleSavingId === item.id"
                :disabled="scheduleSavingId === item.id || scoreSavingId === item.id"
              >
                Edit Schedule
              </v-btn>
              <v-btn
                color="success"
                variant="elevated"
                block
                prepend-icon="mdi-trophy"
                @click="reportResult(item)"
                :loading="scoreSavingId === item.id"
                :disabled="scoreSavingId === item.id || scheduleSavingId === item.id"
              >
                Report Result
              </v-btn>
            </div>
          </v-card-text>
        </v-card>

        <v-alert v-if="series.length === 0" type="info" variant="tonal">
          No series scheduled yet.
        </v-alert>

        <v-pagination
          v-if="pageCount > 1"
          v-model="page"
          :length="pageCount"
          density="comfortable"
          class="mt-2"
        ></v-pagination>
      </v-card-text>
    </v-card>
  </v-container>

  <!-- Schedule Dialog -->
  <v-dialog v-model="scheduleDialog" max-width="500px">
    <v-card>
      <v-card-title class="bg-primary">
        <v-icon class="mr-2">mdi-calendar-edit</v-icon>
        Edit Schedule
      </v-card-title>
      <v-card-text class="pt-4">
        <v-alert type="info" variant="tonal" density="compact" class="mb-4">
          Enter time in your local timezone ({{ userTimezone }}).
        </v-alert>
        <v-form ref="scheduleForm" v-model="scheduleFormValid">
          <v-container>
            <v-row>
              <v-col cols="12" md="6">
                <SimpleDatePicker v-model="scheduleSeries.date" label="Date" />
              </v-col>
              <v-col cols="12" md="6">
                <SimpleTimePicker v-model="scheduleSeries.time" :label="`Time (${userTimezone})`" />
              </v-col>
            </v-row>
          </v-container>
        </v-form>
      </v-card-text>
      <v-card-actions>
        <v-spacer />
        <v-btn variant="text" @click="closeSchedule" :disabled="scheduleSavingId === scheduleSeries.id">Cancel</v-btn>
        <v-btn color="primary" variant="elevated" prepend-icon="mdi-content-save" :disabled="!isScheduleValid || scheduleSavingId === scheduleSeries.id" :loading="scheduleSavingId === scheduleSeries.id" @click="saveSchedule">Save</v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>

  <!-- Report Result Dialog -->
  <v-dialog v-model="scoreDialog" max-width="600px">
    <v-card>
      <v-card-title class="bg-primary">
        <v-icon class="mr-2">mdi-trophy</v-icon>
        Report Result
      </v-card-title>
      <v-card-text class="pt-4">
        <v-form ref="scoreForm" v-model="scoreFormValid">
          <v-container>
            <v-row>
              <v-col cols="6">
                <v-text-field 
                  v-model="scoreSeries.player1_score" 
                  :label="scoreSeries.player1_name || ''" 
                  variant="outlined"
                  prepend-inner-icon="mdi-numeric"
                  type="number" 
                  min="0" 
                  :hint="scoreSeries.isPlayer1Current ? '(You)' : ''" 
                  persistent-hint
                />
              </v-col>
              <v-col cols="6">
                <v-text-field 
                  v-model="scoreSeries.player2_score" 
                  :label="scoreSeries.player2_name || ''" 
                  variant="outlined"
                  prepend-inner-icon="mdi-numeric"
                  type="number" 
                  min="0" 
                  :hint="scoreSeries.isPlayer2Current ? '(You)' : ''" 
                  persistent-hint
                />
              </v-col>
            </v-row>
            <v-row>
              <v-col cols="12">
                <v-file-input 
                  v-model="scoreSeries.game1File" 
                  label="Game 1 Replay" 
                  variant="outlined"
                  accept=".w3g" 
                  prepend-icon="mdi-file-upload"
                  :rules="[rules.w3gFile]"
                />
              </v-col>
            </v-row>
            <v-row>
              <v-col cols="12">
                <v-file-input 
                  v-model="scoreSeries.game2File" 
                  label="Game 2 Replay" 
                  variant="outlined"
                  accept=".w3g" 
                  prepend-icon="mdi-file-upload"
                  :rules="[rules.w3gFile]"
                />
              </v-col>
            </v-row>
            <v-row v-if="needsGame3">
              <v-col cols="12">
                <v-file-input 
                  v-model="scoreSeries.game3File" 
                  label="Game 3 Replay" 
                  variant="outlined"
                  accept=".w3g" 
                  prepend-icon="mdi-file-upload" 
                  :rules="[rules.required, rules.w3gFile]" 
                  required 
                  :hint="'Required for 2:1 or 1:2 results'" 
                />
              </v-col>
            </v-row>
          </v-container>
        </v-form>
      </v-card-text>
      <v-card-actions>
        <v-spacer />
        <v-btn variant="text" @click="closeScore" :disabled="scoreSavingId === scoreSeries.id">Cancel</v-btn>
        <v-btn color="primary" variant="elevated" prepend-icon="mdi-content-save" :disabled="!isScoreValid || scoreSavingId === scoreSeries.id" :loading="scoreSavingId === scoreSeries.id" @click="saveResult">Save Result</v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>

  <!-- Player Details Dialog -->
  <PlayerDetailsDialog
    v-model="showPlayerDetailsDialog"
    :player="selectedPlayerForDetails"
    :seasonId="playerData?.season_id ? Number(playerData.season_id) : null"
    :w3cSeason="currentW3CSeason"
  />
</template>

<script setup>
import { ref, onMounted, computed, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { fetchWrapper, pageQuery, PAGE_LIMIT } from '@/helpers';
import { authHeader } from '@/helpers/fetch-wrapper';
import { useAuthStore, useSeasonStore } from '@/stores';
import { getW3CMMR } from '@/helpers/w3c-stats';
import SimpleTimePicker from '@/components/SimpleTimePicker.vue';
import SimpleDatePicker from '@/components/SimpleDatePicker.vue';
import PlayerDetailsDialog from '@/components/PlayerDetailsDialog.vue';
import W3CIcon from '@/components/W3CIcon.vue';
import { DateTime } from 'luxon';
import { formatDateTime } from '@/helpers/datetime';
import { useDisplay } from 'vuetify';
import { resolveCurrentW3CSeason } from '@/helpers/current-season';


const route = useRoute();
const router = useRouter();
const backendUrl = import.meta.env.VITE_BACKEND_URL;
const { mobile } = useDisplay();

// Current W3C season
const currentW3CSeason = ref(null);

// Computed property for mobile detection
const isMobile = computed(() => {
  // Use Vuetify's display breakpoint, or fallback to window width
  if (mobile !== undefined) return mobile.value;
  return window.innerWidth < 960;
});

// Player Details Dialog
const showPlayerDetailsDialog = ref(false);
const selectedPlayerForDetails = ref(null);

const showPlayerDetails = (player) => {
  if (!player) return;
  selectedPlayerForDetails.value = player;
  showPlayerDetailsDialog.value = true;
};

// State
const isLoading = ref(true);
const errorMessage = ref(null);
const successMessage = ref(null);
const w3cPlayerUrl = (battleTag) => `https://www.w3champions.com/player/${encodeURIComponent(battleTag)}`;

// the other side of a series; the id is the fallback when the payload carries no player row
const opponent = (item) => {
  const mine = item.player1_id === playerData.value?.player?.id;
  return (mine ? item.player2 : item.player1) || { name: `Player ${mine ? item.player2_id : item.player1_id}` };
};

const playerData = ref(null);
const series = ref([]);
const totalSeries = ref(0);
const page = ref(1);
const itemsPerPage = ref(25);
const sortBy = ref([]);  // Vuetify single sort: [] or [{ key, order }]
const token = ref(null);
const authStore = useAuthStore();

// the session drives the routes when there is no ?token=; the backend reads the id from the bearer
const hasAccess = () => !!token.value || !!authStore.me;

// /me answers whether the session has a signup for the current GNL season
const seasonStore = useSeasonStore();
const needsSignup = computed(() => authStore.me?.signed_up === false && !!authStore.me?.season_id);
const seasonLabel = computed(() =>
  seasonStore.seasons.find(s => s.id === authStore.me?.season_id)?.name || `GNL Season ${authStore.me?.season_id}`
);

// Schedule / Result dialog state
const scheduleDialog = ref(false);
const scoreDialog = ref(false);
const scheduleFormValid = ref(true);
const scoreFormValid = ref(true);
const scheduleForm = ref(null);
const scoreForm = ref(null);
const scheduleSeries = ref({});
const scoreSeries = ref({});
// Per-series saving state (store id of series currently being saved)
const scheduleSavingId = ref(null);
const scoreSavingId = ref(null);

// User's timezone for display
const userTimezone = computed(() => {
  return Intl.DateTimeFormat().resolvedOptions().timeZone;
});

// Validation rules
const rules = {
  required: (value) => !!value || 'This field is required',
  w3gFile: (value) => {
    if (!value || !(value instanceof File)) return true;
    const fileName = value.name.toLowerCase();
    return fileName.endsWith('.w3g') || 'Only .w3g replay files are allowed';
  }
};

// The server sorts date_time and week; opponent and score are computed per side here
const headers = [
  { title: 'Opponent', key: 'opponent', sortable: false },
  { title: 'Date & Time', key: 'date_time', sortable: true },
  { title: 'Score', key: 'score', sortable: false },
  { title: 'Week', key: 'week', sortable: true },
  { title: 'Actions', key: 'actions', sortable: false }
];

const pageCount = computed(() => itemsPerPage.value === -1 ? 1 : Math.max(1, Math.ceil(totalSeries.value / itemsPerPage.value)));

// Load player dashboard data
const fetchPlayerData = async () => {
  isLoading.value = true;
  errorMessage.value = null;
  
  try {
    token.value = route.query.token;

    if (!hasAccess()) {
      errorMessage.value = 'No access token provided';
      return;
    }

    // Validate token first
    if (token.value) {
      const tokenResponse = await fetchWrapper.get(`${backendUrl}/public-token/${token.value}`);
      if (tokenResponse.access_type !== 'dashboard') {
        errorMessage.value = 'Invalid access token type';
        return;
      }
    }

    const tokenParam = token.value ? `token=${encodeURIComponent(token.value)}&` : '';
    const seriesUrl = (limit, offset) => `${backendUrl}/player-series?${tokenParam}${pageQuery({
      limit,
      offset,
      sort: sortBy.value[0]?.key,
      order: sortBy.value[0]?.order
    })}`;

    // 'All': read the server pages and keep the player fields of the first one
    if (itemsPerPage.value === -1) {
      const collected = [];
      let firstPage = null;
      let total = 0;

      do {
        const { items: pageData, total: pageTotal } = await fetchWrapper.getPage(seriesUrl(PAGE_LIMIT, collected.length));
        const rows = pageData?.series || [];
        firstPage = firstPage ?? pageData;
        total = pageTotal ?? collected.length + rows.length;
        collected.push(...rows);
        if (rows.length === 0) {
          break;  // stop when the route sends no more rows
        }
      } while (collected.length < total);

      playerData.value = firstPage;
      series.value = collected;
      totalSeries.value = collected.length;
      return;
    }

    // Get one page of the player series data
    const offset = (page.value - 1) * itemsPerPage.value;
    const { items: response, total } = await fetchWrapper.getPage(seriesUrl(itemsPerPage.value, offset));
    playerData.value = response;
    series.value = response.series || [];
    totalSeries.value = total ?? series.value.length;

    // A page can fall past the end; step back onto the table
    if (series.value.length === 0 && page.value > pageCount.value) {
      page.value = pageCount.value;
    }

  } catch (error) {
    console.error('Error fetching player data:', error);
    if (error?.message?.includes('token_not_found_or_expired')) {
      errorMessage.value = 'Access link has expired. Please request a new one from Discord.';
    } else if (error?.message?.includes('player_not_found')) {
      errorMessage.value = 'Player not found. Please make sure you have signed up first.';
    } else {
      errorMessage.value = 'Error loading player dashboard. Please try again.';
    }
  } finally {
    isLoading.value = false;
  }
};

// The table controls drive the page state
watch([page, itemsPerPage], () => {
  if (hasAccess()) fetchPlayerData();
});

// A header click reloads from the first page in the new order
watch(sortBy, () => {
  if (!hasAccess()) return;
  if (page.value === 1) {
    fetchPlayerData();
  } else {
    page.value = 1;
  }
});

// Get score color based on win/loss
const getScoreColor = (item) => {
  const isPlayer1 = item.player1_id === playerData.value?.player?.id;
  const myScore = isPlayer1 ? (item.player1_score || 0) : (item.player2_score || 0);
  const oppScore = isPlayer1 ? (item.player2_score || 0) : (item.player1_score || 0);
  
  if (myScore > oppScore) return 'success';
  if (myScore < oppScore) return 'error';
  return 'warning';
};

// Edit schedule handlers
const editSchedule = (item) => {
  let date = '';
  let time = '';

  if (item.date_time) {
    // Backend stores datetime in UTC as naive datetime (no timezone info)
    // Parse as UTC and convert to user's local timezone
    const utcDateTime = DateTime.fromISO(item.date_time, { zone: 'UTC' });
    
    if (utcDateTime.isValid) {
      // Convert to local timezone
      const localDateTime = utcDateTime.toLocal();
      
      // Format for pickers
      date = localDateTime.toFormat('MM/dd/yyyy');
      time = localDateTime.toFormat('HH:mm');
    }
  }

  scheduleSeries.value = {
    id: item.id,
    date: date,
    time: time
  };

  scheduleDialog.value = true;
};

const closeSchedule = () => {
  scheduleDialog.value = false;
  scheduleSeries.value = {};
};

const saveSchedule = async () => {
  scheduleSavingId.value = scheduleSeries.value.id;
  try {
    let utcDateTime = null;
    if (scheduleSeries.value.date && scheduleSeries.value.time) {
      let year, month, day, hour, minute;
      
      // Handle date: could be a Date object or string (MM/DD/YYYY)
      if (scheduleSeries.value.date instanceof Date) {
        year = scheduleSeries.value.date.getFullYear();
        month = scheduleSeries.value.date.getMonth() + 1;
        day = scheduleSeries.value.date.getDate();
      } else if (typeof scheduleSeries.value.date === 'string' && scheduleSeries.value.date.includes('/')) {
        [month, day, year] = scheduleSeries.value.date.split('/');
        month = parseInt(month);
        day = parseInt(day);
        year = parseInt(year);
      }
      
      // Handle time: could be a Date object or string (HH:mm)
      if (scheduleSeries.value.time instanceof Date) {
        hour = scheduleSeries.value.time.getHours();
        minute = scheduleSeries.value.time.getMinutes();
      } else if (typeof scheduleSeries.value.time === 'string' && scheduleSeries.value.time.includes(':')) {
        [hour, minute] = scheduleSeries.value.time.split(':');
        hour = parseInt(hour);
        minute = parseInt(minute);
      }
      
      if (year && month && day !== undefined && hour !== undefined && minute !== undefined) {
        // Create datetime in user's local timezone
        const localDateTime = DateTime.local(year, month, day, hour, minute);
        
        // Convert to UTC
        const utcDateTimeObj = localDateTime.toUTC();
        
        // Format as required by backend: "YYYY-MM-DD HH:mm:ss" (without 'Z')
        utcDateTime = utcDateTimeObj.toFormat('yyyy-MM-dd HH:mm:ss');
      }
    }

    const formData = new FormData();
    if (token.value) formData.append('token', token.value);
    if (utcDateTime) formData.append('date_time', utcDateTime);
    formData.append('action', 'scheduled');

    const url = `${backendUrl}/player-series/${scheduleSeries.value.id}`;
    const response = await fetch(url, {
      method: 'PUT',
      headers: await authHeader('PUT', url),
      body: formData
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || 'Update failed');
    }

    successMessage.value = 'Schedule updated successfully!';
    closeSchedule();
    await fetchPlayerData();
  } catch (error) {
    console.error('Error saving schedule:', error);
    errorMessage.value = error.message || 'Error saving schedule.';
  } finally {
    scheduleSavingId.value = null;
  }
};

// Report result handlers
const reportResult = (item) => {
  const isPlayer1 = item.player1_id === playerData.value?.player?.id;
  
  scoreSeries.value = {
    id: item.id,
    player1_score: item.player1_score || 0,
    player2_score: item.player2_score || 0,
    player1_name: item.player1?.name || `Player ${item.player1_id}`,
    player2_name: item.player2?.name || `Player ${item.player2_id}`,
    isPlayer1Current: isPlayer1,
    isPlayer2Current: !isPlayer1,
    game1File: null,
    game2File: null,
    game3File: null
  };

  scoreDialog.value = true;
};

const closeScore = () => {
  scoreDialog.value = false;
  scoreSeries.value = {};
};

const saveResult = async () => {
  scoreSavingId.value = scoreSeries.value.id;
  try {
    const p1 = parseInt(scoreSeries.value.player1_score) || 0;
    const p2 = parseInt(scoreSeries.value.player2_score) || 0;

    const hasGame1File = scoreSeries.value.game1File && scoreSeries.value.game1File instanceof File;
    const hasGame2File = scoreSeries.value.game2File && scoreSeries.value.game2File instanceof File;
    const hasGame3File = scoreSeries.value.game3File && scoreSeries.value.game3File instanceof File;

    if (!hasGame1File || !hasGame2File) {
      errorMessage.value = 'Game 1 and Game 2 replay files are required when reporting a result.';
      return;
    }

    const needG3 = (p1 === 2 && p2 === 1) || (p1 === 1 && p2 === 2);
    if (needG3 && !hasGame3File) {
      errorMessage.value = 'Game 3 replay file is required for 2:1 or 1:2 results.';
      return;
    }

    const formData = new FormData();
    if (token.value) formData.append('token', token.value);
    formData.append('player1_score', p1);
    formData.append('player2_score', p2);
    formData.append('action', 'score_updated');

    if (hasGame1File) formData.append('game1', scoreSeries.value.game1File);
    if (hasGame2File) formData.append('game2', scoreSeries.value.game2File);
    if (hasGame3File) formData.append('game3', scoreSeries.value.game3File);

    const url = `${backendUrl}/player-series/${scoreSeries.value.id}`;
    const response = await fetch(url, {
      method: 'PUT',
      headers: await authHeader('PUT', url),
      body: formData
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || 'Update failed');
    }

    successMessage.value = 'Result reported successfully!';
    closeScore();
    await fetchPlayerData();
  } catch (error) {
    console.error('Error saving result:', error);
    errorMessage.value = error.message || 'Error reporting result.';
  } finally {
    scoreSavingId.value = null;
  }
};

// Show Game 3 input only when needed (2:1 or 1:2) for the score dialog
const needsGame3 = computed(() => {
  const p1 = Number(scoreSeries.value.player1_score);
  const p2 = Number(scoreSeries.value.player2_score);
  if (Number.isNaN(p1) || Number.isNaN(p2)) return false;
  return (p1 === 2 && p2 === 1) || (p1 === 1 && p2 === 2);
});

// Validate schedule: date and time must be present
const isScheduleValid = computed(() => {
  return !!(scheduleSeries.value && scheduleSeries.value.date && scheduleSeries.value.time);
});

// Validate score: allowed score combinations and required files present
const isScoreValid = computed(() => {
  if (!scoreSeries.value) return false;
  
  // Check if form is valid (includes file validation rules)
  if (!scoreFormValid.value) return false;
  
  const p1 = parseInt(scoreSeries.value.player1_score);
  const p2 = parseInt(scoreSeries.value.player2_score);
  if (Number.isNaN(p1) || Number.isNaN(p2)) return false;

  const allowed = (
    (p1 === 2 && p2 === 0) ||
    (p1 === 0 && p2 === 2) ||
    (p1 === 2 && p2 === 1) ||
    (p1 === 1 && p2 === 2)
  );
  if (!allowed) return false;

  const hasGame1 = scoreSeries.value.game1File && scoreSeries.value.game1File instanceof File;
  const hasGame2 = scoreSeries.value.game2File && scoreSeries.value.game2File instanceof File;
  if (!hasGame1 || !hasGame2) return false;

  // If it's a 2:1 or 1:2 result, require game3
  if ((p1 === 2 && p2 === 1) || (p1 === 1 && p2 === 2)) {
    const hasGame3 = scoreSeries.value.game3File && scoreSeries.value.game3File instanceof File;
    return !!hasGame3;
  }

  return true;
});

onMounted(async () => {
  currentW3CSeason.value = await resolveCurrentW3CSeason();
  if (authStore.me) seasonStore.fetchSeasons().catch(() => {});  // names the season the signup alert asks about
  fetchPlayerData();
});
</script>

<style scoped>
.v-chip {
  margin: 2px;
}

.text-primary {
  color: rgb(var(--v-theme-primary)) !important;
}

/* Truncate long filenames in file input */
:deep(.v-file-input .v-field__input) {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

:deep(.v-file-input .v-field__input > input) {
  text-overflow: ellipsis;
}
</style>