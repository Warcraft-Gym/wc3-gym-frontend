<template>
  <v-overlay v-model="isLoading" contained class="align-center justify-center">
    <v-progress-circular color="primary" indeterminate size="64"></v-progress-circular>
  </v-overlay>

  <v-container fluid class="pa-4">
    <v-row class="mb-4">
      <v-col>
        <h1 v-if="playerData" class="d-flex flex-wrap align-center ga-3">
          <v-avatar size="48" color="primary">
            <v-img v-if="authStore.me?.avatar" :src="authStore.me.avatar" alt="" />
            <span v-else>{{ (playerData.player.name || '?').slice(0, 2).toUpperCase() }}</span>
          </v-avatar>
          <PlayerName :player="playerData.player">
            <a :href="w3cPlayerUrl(playerData.player.battleTag)" target="_blank" rel="noopener noreferrer" class="text-body-1 text-decoration-none ml-2">
              {{ playerData.player.battleTag }} <W3CIcon :size="16" />
            </a>
          </PlayerName>
          <v-chip v-if="authStore.me?.team" color="primary" variant="tonal" size="small" prepend-icon="mdi-shield-star">
            Captain · {{ authStore.me.team.name }}
          </v-chip>
        </h1>
        <h1 v-else>Player Dashboard</h1>
      </v-col>
    </v-row>

    <StatusAlert v-model="errorMessage" />

    <StatusAlert v-model="successMessage" type="success" />
    <v-card v-if="!isLoading && playerData" elevation="2" class="mb-6">
      <v-card-title class="bg-primary d-flex align-center">
        <v-icon class="mr-2">mdi-account-circle</v-icon>
        Player Information
        <v-spacer />
        <v-btn icon="mdi-pencil" size="small" variant="text" title="Edit profile" @click="openEditProfile" />
      </v-card-title>
      <v-card-text class="pt-4">
        <v-alert v-if="needsSignup" type="info" variant="tonal" border="start" class="mb-4">
          <div class="d-flex align-center justify-space-between flex-wrap ga-2">
            <span>Not signed up for {{ seasonLabel }}</span>
            <v-btn color="primary" variant="elevated" size="small" @click="router.push('/signup')">Sign up</v-btn>
          </div>
        </v-alert>
        <div class="d-flex flex-wrap align-center ga-2 mb-3">
          <v-chip color="secondary" prepend-icon="$discord">
            {{ playerData.discord_tag }}
          </v-chip>
          <v-chip v-if="playerData.player.timezone" size="small" variant="tonal" prepend-icon="mdi-clock-outline">
            {{ playerData.player.timezone }}
          </v-chip>
        </div>
        <div class="d-flex flex-wrap align-center ga-2">
          <strong><W3CMmr /></strong>
          <RaceMmrChips :player="playerData.player" :w3cSeason="currentW3CSeason" />
        </div>
        <div class="text-caption text-medium-emphasis mt-2">{{ syncCaption }}</div>
      </v-card-text>
    </v-card>

    <v-card v-if="!isLoading && fullPlayer" elevation="2" class="mb-6">
      <v-card-title class="bg-primary d-flex align-center">
        <v-icon class="mr-2">mdi-calendar-account</v-icon>
        Events
      </v-card-title>
      <!-- The current season opens onto its rounds; a series replaces the availability question -->
      <PlayerSeasons :player="fullPlayer" :open="Number(playerData.season_id)">
        <template #current="{ row }">
          <RoundCards
            :player="playerData.player"
            :season="row.season"
            :series="series"
            :teamId="row.stat?.team_id"
            :answers="playerData.availability ?? []"
          >
            <template #series-actions="{ series: item }">
              <div class="d-flex flex-wrap ga-1 mt-2">
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
                  @click="reportResult(item)"
                  :loading="scoreSavingId === item.id"
                  :disabled="scoreSavingId === item.id || scheduleSavingId === item.id"
                >
                  Report Result
                </v-btn>
                <v-btn
                  color="primary"
                  variant="outlined"
                  size="small"
                  prepend-icon="mdi-map-outline"
                  @click="router.push(vetoRoute(item))"
                >
                  Maps
                </v-btn>
              </div>
            </template>

            <template #question="{ card }">
              <div class="d-flex ga-2 mt-2">
                <v-btn
                  color="success"
                  :variant="card.answer === true ? 'flat' : 'outlined'"
                  :loading="savingWeek === card.playday"
                  :disabled="savingWeek !== null"
                  @click="setWeek(card.playday, true)"
                >
                  Can play
                </v-btn>
                <v-btn
                  color="error"
                  :variant="card.answer === false ? 'flat' : 'outlined'"
                  :loading="savingWeek === card.playday"
                  :disabled="savingWeek !== null"
                  @click="setWeek(card.playday, false)"
                >
                  Cannot play
                </v-btn>
              </div>
              <div class="text-caption text-medium-emphasis mt-2">{{ setByLine(card.playday) }}</div>
            </template>
          </RoundCards>
        </template>
      </PlayerSeasons>
    </v-card>

    <HeadToHead v-if="!isLoading && playerData" :playerId="playerData.player.id" />
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
  <v-dialog v-model="scoreDialog" :max-width="vetoMissing ? 960 : 600">
    <v-card>
      <v-card-title class="bg-primary">
        <v-icon class="mr-2">mdi-trophy</v-icon>
        Report Result
      </v-card-title>
      <v-card-text class="pt-4">
        <v-alert
          v-if="scoreVeto"
          :type="scoreVeto.complete ? 'success' : 'warning'"
          variant="tonal"
          density="compact"
          class="mb-2"
        >
          {{ scoreVeto.complete ? 'Map veto complete' : 'The map veto is not complete. Enter it below.' }}
        </v-alert>
        <VetoBoard v-if="scoreSeries.id" :key="scoreSeries.id" :series-id="scoreSeries.id" report class="mb-4" @change="board => scoreVeto = board" />
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
                  :max="seriesWins" 
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
                  :max="seriesWins" 
                  :hint="scoreSeries.isPlayer2Current ? '(You)' : ''" 
                  persistent-hint
                />
              </v-col>
            </v-row>
            <v-row v-if="scoreProblem">
              <v-col cols="12" class="pt-0 text-error text-caption">{{ scoreProblem }}</v-col>
            </v-row>
            <v-row v-for="game in replaySlots" :key="game">
              <v-col cols="12">
                <v-file-input
                  v-model="scoreSeries.replays[game]"
                  :label="`Game ${game} Replay`"
                  variant="outlined"
                  accept=".w3g"
                  prepend-icon="mdi-file-upload"
                  :rules="needsFile(game) ? [rules.required, rules.w3gFile] : [rules.w3gFile]"
                  :required="needsFile(game)"
                  :hint="fileHint(game)"
                />
              </v-col>
            </v-row>
          </v-container>
        </v-form>
      </v-card-text>
      <v-card-actions>
        <v-spacer />
        <v-btn variant="text" @click="closeScore" :disabled="scoreSavingId === scoreSeries.id">Cancel</v-btn>
        <v-btn color="primary" variant="elevated" prepend-icon="mdi-content-save" :disabled="!isScoreValid || vetoMissing || scoreSavingId === scoreSeries.id" :loading="scoreSavingId === scoreSeries.id" @click="saveResult">Save Result</v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>

  <!-- Edit Profile Dialog -->
  <v-dialog v-model="editProfileOpen" max-width="480" persistent>
    <v-card>
      <v-card-title class="bg-primary">
        <v-icon class="mr-2">mdi-pencil</v-icon>
        Edit Profile
      </v-card-title>
      <v-alert v-if="editProfileError" type="error" variant="tonal" border="start" class="mx-4 mt-4" closable @click:close="editProfileError = null">
        {{ editProfileError }}
      </v-alert>
      <v-card-text class="pt-4">
        <v-text-field v-model="profileForm.name" label="Player name" variant="outlined" density="comfortable" />
        <v-text-field v-model="profileForm.battleTag" label="BattleTag" hint="Checked against W3Champions" persistent-hint variant="outlined" density="comfortable" class="mb-2" />
        <RaceSelect v-model="profileForm.race" label="Main race" />
        <CountrySelect v-model="profileForm.country" />
        <v-autocomplete v-model="profileForm.timezone" :items="timezones" label="Timezone" variant="outlined" density="comfortable" />
      </v-card-text>
      <v-card-actions class="px-4 py-3">
        <v-spacer />
        <v-btn variant="text" @click="editProfileOpen = false">Cancel</v-btn>
        <v-btn color="primary" variant="elevated" prepend-icon="mdi-check" :loading="isSavingProfile" @click="saveProfile">Save</v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>

<script setup>
import { ref, onMounted, computed } from 'vue';
import { useRouter } from 'vue-router';
import { backendUrl, fetchWrapper, pageQuery, PAGE_LIMIT } from '@/helpers';
import { authHeader } from '@/helpers/fetch-wrapper';
import { useAuthStore, useAvailabilityStore, useSeasonStore, usePlayerStore } from '@/stores';
import { syncedAgo, w3cPlayerUrl } from '@/helpers/w3c-stats';
import { gamesOf, winsOf, isValidResult, replaysNeeded } from '@/helpers/best-of';
import HeadToHead from '@/components/HeadToHead.vue';
import PlayerSeasons from '@/components/PlayerSeasons.vue';
import RaceMmrChips from '@/components/RaceMmrChips.vue';
import RoundCards from '@/components/RoundCards.vue';
import SimpleTimePicker from '@/components/SimpleTimePicker.vue';
import SimpleDatePicker from '@/components/SimpleDatePicker.vue';
import RaceSelect from '@/components/RaceSelect.vue';
import CountrySelect from '@/components/CountrySelect.vue';
import W3CIcon from '@/components/W3CIcon.vue';
import W3CMmr from '@/components/W3CMmr.vue';
import { DateTime } from 'luxon';
import { resolveCurrentW3CSeason } from '@/helpers/current-season';
import StatusAlert from '@/components/StatusAlert.vue';
import VetoBoard from '@/components/VetoBoard.vue';


const router = useRouter();

// Current W3C season
const currentW3CSeason = ref(null);

// State
const isLoading = ref(true);
const errorMessage = ref(null);
const successMessage = ref(null);

// the member's own profile edit
const editProfileOpen = ref(false);
const editProfileError = ref(null);
const isSavingProfile = ref(false);
const profileForm = ref({});
const timezones = Intl.supportedValuesOf('timeZone');

const openEditProfile = () => {
  const p = playerData.value?.player || {};
  profileForm.value = {
    name: p.name, battleTag: p.battleTag, race: p.race, country: p.country, timezone: p.timezone,
  };
  editProfileError.value = null;
  editProfileOpen.value = true;
};

const saveProfile = async () => {
  isSavingProfile.value = true;
  editProfileError.value = null;
  try {
    const { user } = await fetchWrapper.put(`${backendUrl}/user-info`, profileForm.value);
    playerData.value = { ...playerData.value, player: { ...playerData.value.player, ...user } };
    editProfileOpen.value = false;
    successMessage.value = 'Profile saved.';
  } catch (error) {
    editProfileError.value = error.message || 'Failed to save the profile.';
  } finally {
    isSavingProfile.value = false;
  }
};

const playerData = ref(null);
const series = ref([]);
const authStore = useAuthStore();

// /me answers whether the session has a signup for the current GNL season
const seasonStore = useSeasonStore();
const needsSignup = computed(() => authStore.me?.signed_up === false && !!authStore.me?.season_id);
const seasonLabel = computed(() =>
  seasonStore.seasons.find(s => s.id === authStore.me?.season_id)?.name || `GNL Season ${authStore.me?.season_id}`
);

// e.g. "synced 2 hours ago"; syncedAgo already words the never case
const syncCaption = computed(() => {
  const ago = syncedAgo(playerData.value?.player);
  return ago === 'never synced' ? ago : `synced ${ago}`;
});

// Schedule / Result dialog state
const scheduleDialog = ref(false);
const scoreDialog = ref(false);
const scheduleFormValid = ref(true);
const scoreFormValid = ref(true);
const scheduleForm = ref(null);
const scoreForm = ref(null);
const scheduleSeries = ref({});
const scoreSeries = ref({ replays: {} });
// a result carries its veto, so the dialog holds the board above the scores
const scoreVeto = ref(null);
const vetoMissing = computed(() => !scoreVeto.value?.complete);
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

// Load player dashboard data
const fetchPlayerData = async () => {
  isLoading.value = true;
  errorMessage.value = null;
  
  try {
    // the backend reads the member off the session bearer
    const seriesUrl = (limit, offset) => `${backendUrl}/player-series?${pageQuery({ limit, offset })}`;

    // Read every server page; the split into upcoming and completed happens here
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
    await fetchFullPlayer();

  } catch (error) {
    console.error('Error fetching player data:', error);
    if (error?.message?.includes('player_not_found')) {
      errorMessage.value = 'Player not found. Please make sure you have signed up first.';
    } else {
      errorMessage.value = 'Error loading player dashboard. Please try again.';
    }
  } finally {
    isLoading.value = false;
  }
};

// the map veto is only worth opening before the series is played
const vetoRoute = (item, query = {}) => ({ path: `/player-series/${item.id}/veto`, query });

// My rounds: /player-series carries the rounds, the answers and the series (#33)
const availabilityStore = useAvailabilityStore();
const playerStore = usePlayerStore();
const savingWeek = ref(null);

// the dashboard player is the reduced one; the full player names the team of each season
const fullPlayer = ref(null);
const fetchFullPlayer = async () => {
  fullPlayer.value = await playerStore.getPlayer(playerData.value.player.id).catch(() => null);
};

const rowOfWeek = (week) => playerData.value?.availability?.find(row => row.playday === week);
const answerFor = (week) => rowOfWeek(week)?.available ?? null;

const setByLine = (week) => {
  const row = rowOfWeek(week);
  if (!row) return 'No answer';
  return `Set by ${row.set_by_user_id === playerData.value?.player?.id ? 'You' : row.set_by_name}`;
};

// a second click on the state already set clears the week back to no answer
const setWeek = async (week, want) => {
  savingWeek.value = week;
  errorMessage.value = null;
  try {
    const answer = { playday: week, available: answerFor(week) === want ? null : want };
    if (playerData.value?.season_id) answer.season_id = Number(playerData.value.season_id);
    playerData.value.availability = await availabilityStore.setPlayerAvailability(answer);
  } catch (error) {
    console.error('Error saving availability:', error);
    errorMessage.value = error.message || 'Error saving availability.';
  } finally {
    savingWeek.value = null;
  }
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
    map_rules: item.match?.season?.map_rules,
    // games already reported: their stored replays stay unless a new file is picked
    reported: item.player1_score != null && item.player2_score != null ? item.player1_score + item.player2_score : 0,
    replays: {}
  };

  scoreVeto.value = null;
  scoreDialog.value = true;
};

const closeScore = () => {
  scoreDialog.value = false;
  scoreSeries.value = { replays: {} };
};

const REPLAY_MAGIC = 'Warcraft III recorded game';

// The file goes from the browser straight to the bucket, at a link the backend signs per game
const uploadReplay = async (seriesId, game, file) => {
  const head = new TextDecoder().decode(await file.slice(0, REPLAY_MAGIC.length).arrayBuffer());
  if (head !== REPLAY_MAGIC) throw new Error(`Game ${game} is not a Warcraft III replay`);
  const { url } = await fetchWrapper.post(`${backendUrl}/player-series/${seriesId}/replays/${game}/upload-url`);
  const put = await fetch(url, {
    method: 'PUT',
    body: file,
    headers: { 'Content-Type': 'application/octet-stream', 'Content-Disposition': `attachment; filename="game${game}.w3g"` }
  });
  if (!put.ok) throw new Error(`Game ${game} replay upload failed`);
};

const saveResult = async () => {
  scoreSavingId.value = scoreSeries.value.id;
  try {
    const p1 = parseInt(scoreSeries.value.player1_score) || 0;
    const p2 = parseInt(scoreSeries.value.player2_score) || 0;

    const played = replaysNeeded(p1, p2);
    for (let game = 1; game <= played; game++) {
      if (needsFile(game) && !hasReplay(game)) {
        errorMessage.value = `Game ${game} replay file is required for a ${p1}:${p2} result.`;
        return;
      }
    }

    const id = scoreSeries.value.id;
    const uploaded = [];
    for (let game = 1; game <= played; game++) {
      if (!hasReplay(game)) continue;
      await uploadReplay(id, game, scoreSeries.value.replays[game]);
      uploaded.push(game);
    }

    if (played === scoreSeries.value.reported && uploaded.length) {
      // the result stands; each new file replaces one stored replay
      for (const game of uploaded) await fetchWrapper.put(`${backendUrl}/player-series/${id}/replays/${game}`);
    } else {
      // the report confirms every game's file in the bucket before it writes the score
      const formData = new FormData();
      formData.append('player1_score', p1);
      formData.append('player2_score', p2);
      formData.append('action', 'score_updated');
      const url = `${backendUrl}/player-series/${id}`;
      const response = await fetch(url, { method: 'PUT', headers: await authHeader('PUT', url), body: formData });
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Update failed');
      }
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

// The reported score, the season's maps to win, and the replay the reporter picked for a game
const reportedScore = computed(() => [parseInt(scoreSeries.value.player1_score), parseInt(scoreSeries.value.player2_score)]);
const seriesWins = computed(() => winsOf(scoreSeries.value.map_rules));
const hasReplay = (game) => scoreSeries.value.replays?.[game] instanceof File;
// A first report needs every game's file; a fix keeps the stored ones unless a new file is picked
const needsFile = (game) => game > (scoreSeries.value.reported || 0);
const fileHint = (game) => {
  if (!needsFile(game)) return 'Leave empty to keep the stored replay';
  return game > seriesWins.value ? decidingHint.value : undefined;
};

// The series always plays as many maps as it takes to win; the rest show once the score calls for them
const replaySlots = computed(() => {
  const [p1, p2] = reportedScore.value;
  return isValidResult(p1, p2, seriesWins.value) ? replaysNeeded(p1, p2) : seriesWins.value;
});
const decidingHint = computed(() => `Required for a ${reportedScore.value.join(':')} result`);

// The two map scores are one result, and the season's best-of says which results exist
const scoreProblem = computed(() => {
  const [p1, p2] = reportedScore.value;
  if (Number.isNaN(p1) || Number.isNaN(p2)) return 'Enter both map scores';
  if (!p1 && !p2) return null;  // the dialog opens at 0:0 and says nothing until a score is typed
  if (isValidResult(p1, p2, seriesWins.value)) return null;
  return `A Bo${gamesOf(scoreSeries.value.map_rules)} ends when one player wins ${seriesWins.value} maps`;
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
  
  const [p1, p2] = reportedScore.value;
  if (!isValidResult(p1, p2, seriesWins.value)) return false;

  const played = replaysNeeded(p1, p2);
  for (let game = 1; game <= played; game++) if (needsFile(game) && !hasReplay(game)) return false;

  return true;
});

onMounted(async () => {
  currentW3CSeason.value = await resolveCurrentW3CSeason();
  if (authStore.me) seasonStore.fetchSeasons().catch(() => {});  // names the season the signup alert asks about
  await fetchPlayerData();
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