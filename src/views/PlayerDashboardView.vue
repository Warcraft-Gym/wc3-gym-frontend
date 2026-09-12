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
          <v-chip v-if="authStore.captainTeamId" color="primary" variant="tonal" size="small" prepend-icon="mdi-shield-star">
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
            {{ zoneLabel(playerData.player.timezone, userTimezone) }}
          </v-chip>
        </div>
        <div class="d-flex flex-wrap align-center ga-2">
          <strong><W3CMmr /></strong>
          <RaceMmrChips :player="playerData.player" :w3cSeason="currentW3CSeason" />
        </div>
        <div class="text-caption text-medium-emphasis mt-2">{{ syncCaption }}</div>
        <PlayerTrophies :trophies="fullPlayer?.trophies" />
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
          Enter time in your local timezone ({{ zoneLabel(userTimezone, userTimezone, chosen) }}).
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
            <v-row v-if="opponentZone">
              <v-col cols="12" class="pt-0">
                <div class="d-flex flex-wrap align-center ga-2">
                  <PlayerName :player="scheduleSeries.opponent" />
                  <strong v-if="opponentTime" class="text-no-wrap">{{ opponentTime }}</strong>
                </div>
                <div class="text-caption text-medium-emphasis">{{ opponentZone }}</div>
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

  <ReportResultDialog
    v-model="scoreDialog"
    :series="scoreSeries"
    @update:saving="id => scoreSavingId = id"
    @saved="message => { successMessage = message; fetchPlayerData(); }"
    @error="message => errorMessage = message"
  />

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
import { ref, onMounted, computed, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { backendUrl, fetchWrapper, pageQuery, PAGE_LIMIT } from '@/helpers';
import { authHeader } from '@/helpers/fetch-wrapper';
import { useAuthStore, useAvailabilityStore, useSeasonStore, usePlayerStore } from '@/stores';
import { syncedAgo, w3cPlayerUrl } from '@/helpers/w3c-stats';
import HeadToHead from '@/components/HeadToHead.vue';
import PlayerSeasons from '@/components/PlayerSeasons.vue';
import RaceMmrChips from '@/components/RaceMmrChips.vue';
import RoundCards from '@/components/RoundCards.vue';
import PlayerTrophies from '@/components/PlayerTrophies.vue';
import SimpleTimePicker from '@/components/SimpleTimePicker.vue';
import SimpleDatePicker from '@/components/SimpleDatePicker.vue';
import RaceSelect from '@/components/RaceSelect.vue';
import ReportResultDialog from '@/components/ReportResultDialog.vue';
import CountrySelect from '@/components/CountrySelect.vue';
import W3CIcon from '@/components/W3CIcon.vue';
import W3CMmr from '@/components/W3CMmr.vue';
import { pickedInstant, pickerParts, viewerZone, zoneLabel } from '@/helpers/timezone.mjs';
import { resolveCurrentW3CSeason } from '@/helpers/current-season';
import StatusAlert from '@/components/StatusAlert.vue';


const router = useRouter();
const route = useRoute();

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

// the avatar menu asks for the dialog with ?edit=1; the form needs the loaded player,
// and the flag is dropped once used so a later save does not reopen it
watch([() => route.query.edit, playerData], ([edit, data]) => {
  if (!edit || !data) return;
  router.replace({ query: { ...route.query, edit: undefined } });
  openEditProfile();
}, { immediate: true });
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
const scheduleForm = ref(null);
const scheduleSeries = ref({});
// the series the report dialog is open on
const scoreSeries = ref(null);
// Per-series saving state (store id of series currently being saved)
const scheduleSavingId = ref(null);
const scoreSavingId = ref(null);

const userTimezone = viewerZone();

// the instant the dialog's date and time name, read in the player's zone
const chosen = computed(() => {
  const { date, time } = scheduleSeries.value;
  return date instanceof Date && time ? pickedInstant(date, time, userTimezone) : null;
});
// the opponent's zone and the chosen time on their clock; their availability stays private
const opponentZone = computed(() => zoneLabel(scheduleSeries.value.opponent?.timezone, userTimezone, chosen.value));
const opponentTime = computed(() =>
  opponentZone.value && chosen.value ? chosen.value.setZone(scheduleSeries.value.opponent.timezone).toFormat('ccc d LLL, HH:mm') : '',
);

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
  const mine = item.player1_id === playerData.value.player.id;
  scheduleSeries.value = {
    id: item.id,
    ...(item.date_time ? pickerParts(item.date_time, userTimezone) : { date: null, time: '' }),
    opponent: mine ? item.player2 : item.player1,
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
    const utcDateTime = chosen.value?.toUTC().toFormat('yyyy-MM-dd HH:mm:ss') ?? null;

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

// Report result: the dialog holds the games, the veto and the write
const reportResult = (item) => {
  scoreSeries.value = item;
  scoreDialog.value = true;
};

// Validate schedule: date and time must be present
const isScheduleValid = computed(() => {
  return !!(scheduleSeries.value && scheduleSeries.value.date && scheduleSeries.value.time);
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