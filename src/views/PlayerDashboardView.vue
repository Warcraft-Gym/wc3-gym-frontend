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
          <v-chip v-for="seat in captainSeats" :key="seat.id" color="primary" variant="tonal" size="small" prepend-icon="mdi-shield-star">
            Captain · {{ seat.team.name }} · {{ seat.name }}
          </v-chip>
        </h1>
        <h1 v-else>Player Dashboard</h1>
      </v-col>
    </v-row>

    <StatusAlert v-model="errorMessage" :retry="fetchPlayerData" />
    <div v-if="noPlayerRow" class="mb-4">
      <v-btn color="primary" variant="elevated" @click="router.push('/signup')">Sign up</v-btn>
    </div>

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
        <v-alert v-if="showBlockPrompt" type="info" variant="tonal" border="start" class="mb-4">
          <div class="d-flex align-center justify-space-between flex-wrap ga-2">
            <span>When can't you play? Blocked times show your opponent the hours you are open.</span>
            <div class="d-flex ga-2">
              <v-btn class="blocks-btn" variant="text" @click="dismissBlocks">Not now</v-btn>
              <v-btn class="blocks-btn" color="primary" variant="elevated" @click="blocksOpen = true">Set blocked times</v-btn>
            </div>
          </div>
        </v-alert>
        <div class="d-flex flex-wrap align-center ga-2 mb-3">
          <v-chip color="secondary" prepend-icon="$discord">
            {{ playerData.discord_tag }}
          </v-chip>
          <v-chip v-if="playerData.player.timezone" size="small" variant="tonal" prepend-icon="mdi-clock-outline">
            {{ zoneLabel(playerData.player.timezone, userTimezone) }}
          </v-chip>
          <v-btn v-if="schedulingOn" class="blocks-btn" variant="text" prepend-icon="mdi-calendar-remove" @click="blocksOpen = true">
            Blocked times
          </v-btn>
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
      <PlayerSeasons :player="fullPlayer" :open="playerData.season_id ? Number(playerData.season_id) : undefined">
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
                  v-if="isUnscored(item)"
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
                  {{ isUnscored(item) ? 'Report Result' : 'Edit result' }}
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
        <StatusAlert v-model="errorMessage" />
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
            <v-row v-if="freeTime">
              <v-col cols="12" class="pt-0">
                <div class="text-body-2 font-weight-medium">{{ commonHours(freeTime.hours) }}</div>
                <div v-for="line in sharedLines" :key="line" class="text-caption text-medium-emphasis">{{ line }}</div>
                <div v-if="moreLines" class="text-caption text-medium-emphasis">+{{ moreLines }} more</div>
                <div class="text-caption text-medium-emphasis mt-2">
                  Open hours are a starting point, not a promise. Agree the time with your opponent.
                </div>
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

  <!-- Blocked times -->
  <v-dialog v-model="blocksOpen" max-width="720px" scrollable>
    <v-card>
      <v-card-title class="bg-primary">
        <v-icon class="mr-2">mdi-calendar-remove</v-icon>
        When can't you play?
      </v-card-title>
      <v-card-text class="pt-4">
        <BlockedTimesEditor v-if="blocksOpen" :zone="playerData?.player?.timezone" @change="count => blockCount = count" @zone="setPlayerZone" />
      </v-card-text>
      <v-card-actions>
        <v-spacer />
        <v-btn color="primary" variant="elevated" @click="blocksOpen = false">Done</v-btn>
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
        <StatusAlert v-model="errorMessage" />
        <v-alert
          v-if="scoreVeto"
          :type="scoreVeto.complete ? 'success' : 'warning'"
          variant="tonal"
          density="compact"
          class="mb-2"
        >
          {{ scoreVeto.complete ? 'Map veto complete' : 'The map veto is not complete. Enter it below, or report without it. Each step is saved when you tap it.' }}
        </v-alert>
        <VetoBoard v-if="scoreSeries.id" :key="scoreSeries.id" :series-id="scoreSeries.id" report class="mb-4" @change="board => scoreVeto = board" />
        <v-form ref="scoreForm" v-model="scoreFormValid">
          <v-container>
            <v-row v-if="!scoreSeries.raceOpen">
              <v-col cols="12" class="pt-0">
                <v-btn variant="text" size="small" density="comfortable" prepend-icon="mdi-account-switch" @click="scoreSeries.raceOpen = true">
                  Played a different race
                </v-btn>
              </v-col>
            </v-row>
            <v-row v-else>
              <v-col cols="6">
                <RaceSelect v-model="scoreSeries.races.player1" :label="scoreSeries.player1_name || ''" density="comfortable" />
              </v-col>
              <v-col cols="6">
                <RaceSelect v-model="scoreSeries.races.player2" :label="scoreSeries.player2_name || ''" density="comfortable" />
              </v-col>
            </v-row>
            <v-row v-for="game in gameRows" :key="game">
              <v-col cols="12">
                <v-card variant="outlined">
                  <v-card-text class="py-3">
                    <div class="text-subtitle-2 mb-2">Game {{ game }}</div>
                    <v-btn-toggle
                      :model-value="scoreSeries.winners[game - 1]"
                      color="primary"
                      divided
                      variant="outlined"
                      density="comfortable"
                      class="d-flex mb-3"
                      @update:model-value="setWinner(game, $event)"
                    >
                      <v-btn value="A" class="flex-grow-1">{{ scoreSeries.player1_name }} won</v-btn>
                      <v-btn value="B" class="flex-grow-1">{{ scoreSeries.player2_name }} won</v-btn>
                    </v-btn-toggle>
                    <v-select
                      :model-value="mapOf(game)"
                      :items="mapStore.maps"
                      item-title="name"
                      item-value="id"
                      label="Map played"
                      variant="outlined"
                      density="comfortable"
                      :hint="mapHint(game)"
                      :hide-details="!mapHint(game)"
                      persistent-hint
                      clearable
                      class="mb-3"
                      @update:model-value="setMap(game, $event)"
                    />
                    <v-file-input
                      v-model="scoreSeries.replays[game]"
                      :label="`Game ${game} replay`"
                      variant="outlined"
                      density="comfortable"
                      accept=".w3g"
                      prepend-icon="mdi-file-upload"
                      :rules="needsFile(game) ? [rules.required, rules.w3gFile] : [rules.w3gFile]"
                      :required="needsFile(game)"
                      :hint="fileHint(game)"
                      @update:model-value="readGameReplay(game, $event)"
                    />
                    <v-alert
                      v-if="replayNote(game)"
                      type="warning"
                      variant="tonal"
                      density="compact"
                      class="mt-2"
                    >
                      {{ replayNote(game) }}
                    </v-alert>
                  </v-card-text>
                </v-card>
              </v-col>
            </v-row>
            <v-row>
              <v-col cols="12" class="pt-0 text-center">
                <span v-if="scoreProblem" class="text-caption text-medium-emphasis">{{ scoreProblem }}</span>
                <span v-else class="text-subtitle-1 font-weight-medium">{{ resultLine }}</span>
              </v-col>
            </v-row>
          </v-container>
        </v-form>
      </v-card-text>
      <v-card-actions>
        <v-spacer />
        <v-btn variant="text" @click="closeScore" :disabled="scoreSavingId === scoreSeries.id">Close</v-btn>
        <v-btn :color="vetoMissing ? 'warning' : 'primary'" variant="elevated" prepend-icon="mdi-content-save" :disabled="!isScoreValid || scoreSavingId === scoreSeries.id" :loading="scoreSavingId === scoreSeries.id" @click="saveResult">{{ vetoMissing ? 'Report without a veto' : 'Save Result' }}</v-btn>
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
        <v-text-field v-model="profileForm.twitch_url" label="Twitch channel" hint="twitch.tv/you" persistent-hint prepend-inner-icon="mdi-twitch" :error-messages="twitchChannel.error" variant="outlined" density="comfortable" class="mb-2" />
        <v-text-field v-model="profileForm.youtube_url" label="YouTube channel" hint="youtube.com/@you" persistent-hint prepend-inner-icon="mdi-youtube" :error-messages="youtubeChannel.error" variant="outlined" density="comfortable" />
      </v-card-text>
      <v-card-actions class="px-4 py-3">
        <v-spacer />
        <v-btn variant="text" @click="editProfileOpen = false">Cancel</v-btn>
        <v-btn color="primary" variant="elevated" prepend-icon="mdi-check" :loading="isSavingProfile" :disabled="!!(twitchChannel.error || youtubeChannel.error)" @click="saveProfile">Save</v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>

<script setup>
import { ref, onMounted, computed, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { backendUrl, fetchWrapper, pageQuery, PAGE_LIMIT } from '@/helpers';
import { authHeader } from '@/helpers/fetch-wrapper';
import { useAuthStore, useAvailabilityStore, useMapStore, useSeasonStore, usePlayerStore } from '@/stores';
import { syncedAgo, w3cPlayerUrl } from '@/helpers/w3c-stats';
import { winsOf, isValidResult, replaysNeeded } from '@/helpers/best-of';
import { mapsByGame, picksOf, scoreOf, gameSlots, gamesReported } from '@/helpers/map-order.mjs';
import { readReplay, matchMap, isOtherSeries } from '@/helpers/w3g.mjs';
import { isUnscored } from '@/helpers/season-phase.mjs';
import { channelInput } from '@/helpers/casts.mjs';
import HeadToHead from '@/components/HeadToHead.vue';
import PlayerSeasons from '@/components/PlayerSeasons.vue';
import RaceMmrChips from '@/components/RaceMmrChips.vue';
import RoundCards from '@/components/RoundCards.vue';
import PlayerTrophies from '@/components/PlayerTrophies.vue';
import SimpleTimePicker from '@/components/SimpleTimePicker.vue';
import SimpleDatePicker from '@/components/SimpleDatePicker.vue';
import RaceSelect from '@/components/RaceSelect.vue';
import CountrySelect from '@/components/CountrySelect.vue';
import W3CIcon from '@/components/W3CIcon.vue';
import W3CMmr from '@/components/W3CMmr.vue';
import { pickedInstant, pickerParts, viewerZone, zoneLabel } from '@/helpers/timezone.mjs';
import { resolveCurrentW3CSeason } from '@/helpers/current-season';
import StatusAlert from '@/components/StatusAlert.vue';
import VetoBoard from '@/components/VetoBoard.vue';
import BlockedTimesEditor from '@/components/BlockedTimesEditor.vue';
import { commonHours, freeLines } from '@/helpers/blocks.mjs';


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
    twitch_url: p.twitch_url, youtube_url: p.youtube_url,
  };
  editProfileError.value = null;
  editProfileOpen.value = true;
};

// The stored channel is the URL the field normalised, so the profile shows what was saved
const twitchChannel = computed(() => channelInput('twitch', profileForm.value.twitch_url));
const youtubeChannel = computed(() => channelInput('youtube', profileForm.value.youtube_url));

const saveProfile = async () => {
  isSavingProfile.value = true;
  editProfileError.value = null;
  try {
    const body = { ...profileForm.value, twitch_url: twitchChannel.value.url, youtube_url: youtubeChannel.value.url };
    const { user } = await fetchWrapper.put(`${backendUrl}/user-info`, body);
    playerData.value = { ...playerData.value, player: { ...playerData.value.player, ...user } };
    // the claim dialog reads the channels off the session payload, which only loads once per visit
    if (authStore.me?.user) authStore.me.user = { ...authStore.me.user, ...user };
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
const noPlayerRow = ref(false);  // the session has no player row at all

// the avatar menu asks for the dialog with ?edit=1; the form needs the loaded player,
// and the flag is dropped once used so a later save does not reopen it
watch([() => route.query.edit, playerData], ([edit, data]) => {
  if (!edit || !data) return;
  router.replace({ query: { ...route.query, edit: undefined } });
  openEditProfile();
}, { immediate: true });
const authStore = useAuthStore();
const mapStore = useMapStore();

// /me answers whether the session has a signup for the current GNL season
const seasonStore = useSeasonStore();
// one chip per season this account captains
const captainSeats = computed(() => (authStore.me?.seasons ?? []).filter(season => season.captain && season.team));
const needsSignup = computed(() => authStore.me?.signed_up === false && !!authStore.me?.season_id);
const currentSeason = computed(() => seasonStore.seasons.find(s => s.id === authStore.me?.season_id) ?? null);
const seasonLabel = computed(() => currentSeason.value?.name || `GNL Season ${authStore.me?.season_id}`);

// Blocked times: only where the player is in the season and the season runs the scheduling tools
const blocksOpen = ref(false);
const blockCount = ref(null);
const blocksDismissed = ref(false);
const dismissKey = computed(() => `blocks_dismissed_${authStore.me?.user?.id ?? 'me'}`);
const schedulingOn = computed(() => !!authStore.me?.signed_up && !!currentSeason.value?.scheduling_enabled);
const showBlockPrompt = computed(() => schedulingOn.value && blockCount.value === 0 && !blocksDismissed.value);

// the editor writes the browser zone when the profile has none, so the page shows the same zone
const setPlayerZone = (timezone) => {
  playerData.value = { ...playerData.value, player: { ...playerData.value.player, timezone } };
};

const dismissBlocks = () => {
  blocksDismissed.value = true;
  localStorage.setItem(dismissKey.value, '1');
};

// The prompt asks once; a player who already has a block, or said not now, never sees it
const readBlockCount = async () => {
  if (!schedulingOn.value) return;
  blocksDismissed.value = localStorage.getItem(dismissKey.value) === '1';
  if (blocksDismissed.value) return;
  const blocks = await fetchWrapper.get(`${backendUrl}/player-blocks`).catch(() => null);
  if (blocks) blockCount.value = (blocks.repeating?.length ?? 0) + (blocks.busy?.length ?? 0);
};

// The season list lands after the page, so the read waits for the gate to answer
watch(schedulingOn, (on) => { if (on && blockCount.value === null) readBlockCount(); }, { immediate: true });

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
const scoreSeries = ref({ replays: {}, races: {}, winners: [], maps: {} });
// a result carries its veto, so the dialog holds the board above the scores
const scoreVeto = ref(null);
const vetoMissing = computed(() => scoreVeto.value !== null && !scoreVeto.value.complete);
// Per-series saving state (store id of series currently being saved)
const scheduleSavingId = ref(null);
const scoreSavingId = ref(null);

const userTimezone = viewerZone();

// The hours both players are open this round; a hint only, and never a reason to block Save
const freeTime = ref(null);
const HINT_LINES = 6;
const sharedLines = computed(() => freeLines(freeTime.value?.ranges ?? [], userTimezone).slice(0, HINT_LINES));
const moreLines = computed(() => Math.max((freeTime.value?.ranges?.length ?? 0) - HINT_LINES, 0));

// A season with the tools off, or a series the backend will not answer for, shows nothing
const readFreeTime = async (seriesId) => {
  if (!schedulingOn.value) return;
  const found = await fetchWrapper.get(`${backendUrl}/player-series/${seriesId}/free-time`).catch(() => null);
  if (scheduleSeries.value.id === seriesId) freeTime.value = found;
};

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
  noPlayerRow.value = false;
  
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
    noPlayerRow.value = !!error?.message?.includes('player_not_found');
    if (noPlayerRow.value) {
      errorMessage.value = 'You are not signed up yet, so there is nothing to show here.';
    } else {
      errorMessage.value = 'Could not load your dashboard.';
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
  fullPlayer.value = await playerStore.getPlayer(playerData.value.player.id).catch(() => {
    errorMessage.value = 'Could not load your seasons. Your rounds are not shown.';
    return null;
  });
};

const rowOfWeek = (week) => playerData.value?.availability?.find(row => row.playday === week);
const answerFor = (week) => rowOfWeek(week)?.available ?? null;

const setByLine = (week) => {
  const row = rowOfWeek(week);
  if (!row || row.available == null) return 'No answer';
  return `Set by ${row.set_by_user_id === playerData.value?.player?.id ? 'You' : row.set_by_name} · tap again to clear`;
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
  errorMessage.value = null;
  const mine = item.player1_id === playerData.value.player.id;
  scheduleSeries.value = {
    id: item.id,
    ...(item.date_time ? pickerParts(item.date_time, userTimezone) : { date: null, time: '' }),
    opponent: mine ? item.player2 : item.player1,
  };
  freeTime.value = null;
  scheduleDialog.value = true;
  readFreeTime(item.id);
};

const closeSchedule = () => {
  scheduleDialog.value = false;
  scheduleSeries.value = {};
  freeTime.value = null;
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

// Report result handlers
const reportResult = (item) => {
  errorMessage.value = null;
  scoreSeries.value = {
    id: item.id,
    player1_name: item.player1?.name || `Player ${item.player1_id}`,
    player2_name: item.player2?.name || `Player ${item.player2_id}`,
    // the tags name the sides in a replay, which carries no player id of ours
    tags: [item.player1?.battleTag, item.player2?.battleTag],
    map_rules: item.match?.season?.map_rules,
    // the race each side played; the panel opens by itself when one is an exception
    races: { player1: item.player1_race, player2: item.player2_race },
    raceOpen: !!(item.player1_off_race || item.player2_off_race),
    // games already reported: their stored replays stay unless a new file is picked
    reported: item.player1_score != null && item.player2_score != null ? item.player1_score + item.player2_score : 0,
    replays: {},
    // the side that won each game, in play order, and the map named for a game
    winners: [],
    maps: {},
    // what each game's replay says, by game number
    reads: {},
    storedGames: '[]'
  };

  scoreVeto.value = null;
  scoreDialog.value = true;
  loadGames(item.id);
};

// A series reported before opens on the games it recorded, so a fix starts from them
const loadGames = async (id) => {
  let games = [];
  try {
    games = await fetchWrapper.get(`${backendUrl}/series/${id}/games`);
  } catch {
    return;  // a series with no games recorded answers nothing to start from
  }
  if (scoreSeries.value.id !== id) return;  // the dialog moved on while the read was out
  for (const game of games) {
    scoreSeries.value.winners[game.game_no - 1] = game.winner_side;
    if (game.map_id) scoreSeries.value.maps[game.game_no] = game.map_id;
  }
  scoreSeries.value.storedGames = JSON.stringify(gamesReported(scoreSeries.value.winners, mapOf));
};

const closeScore = () => {
  scoreDialog.value = false;
  scoreSeries.value = { replays: {}, races: {}, winners: [], maps: {}, reads: {}, tags: [] };
};

// A picked replay says which map was played. It never blocks a report: the file is the
// evidence, but a player who names something else may be right and the parse may be wrong.
const readGameReplay = async (game, file) => {
  delete scoreSeries.value.reads[game];
  if (!(file instanceof File)) return;
  const series = scoreSeries.value.id;
  const read = await readReplay(file).catch(() => null);
  if (!read || scoreSeries.value.id !== series) return;  // the dialog moved on, or not a replay
  scoreSeries.value.reads[game] = read;
  // the replay beats the season's rule, but never a map the reporter named himself
  const map = matchMap(read.mapPath, mapStore.maps);
  if (map && !scoreSeries.value.maps[game]) scoreSeries.value.maps[game] = map.id;
};

// Says where the map came from when the replay named it, so a changed field is not a surprise
const mapHint = (game) => {
  const read = scoreSeries.value.reads?.[game];
  const played = read && matchMap(read.mapPath, mapStore.maps);
  return played && played.id === scoreSeries.value.maps[game] ? 'Read from the replay' : undefined;
};

// What the replay disagrees with, or null
const replayNote = (game) => {
  const read = scoreSeries.value.reads?.[game];
  if (!read) return null;
  if (isOtherSeries(read.tags, scoreSeries.value.tags)) {
    return `This replay is ${read.tags.join(' against ')}. It is not this series.`;
  }
  const played = matchMap(read.mapPath, mapStore.maps);
  if (played && scoreSeries.value.maps[game] && scoreSeries.value.maps[game] !== played.id) {
    return `The replay was played on ${played.name}.`;
  }
  return null;
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
    const [p1, p2] = reportedScore.value;
    const games = gamesReported(scoreSeries.value.winners, mapOf);

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

    if (played === scoreSeries.value.reported && uploaded.length && JSON.stringify(games) === scoreSeries.value.storedGames) {
      // the result stands; each new file replaces one stored replay
      for (const game of uploaded) await fetchWrapper.put(`${backendUrl}/player-series/${id}/replays/${game}`);
    } else {
      // the report confirms every game's file in the bucket before it writes the score
      const formData = new FormData();
      formData.append('player1_score', p1);
      formData.append('player2_score', p2);
      formData.append('action', 'score_updated');
      // one entry per game played, which the backend checks against the score
      formData.append('games', JSON.stringify(games));
      if (scoreSeries.value.raceOpen) {
        // the backend stores nothing when the race is the one he signed up on
        formData.append('player1_off_race', scoreSeries.value.races.player1 || '');
        formData.append('player2_off_race', scoreSeries.value.races.player2 || '');
      }
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

// The score the tapped winners add up to, the season's maps to win, and the file picked for a game
const reportedScore = computed(() => scoreOf(scoreSeries.value.winners || []));
const seriesWins = computed(() => winsOf(scoreSeries.value.map_rules));
const hasReplay = (game) => scoreSeries.value.replays?.[game] instanceof File;
// A first report needs every game's file; a fix keeps the stored ones unless a new file is picked
const needsFile = (game) => game > (scoreSeries.value.reported || 0);
const fileHint = (game) => (needsFile(game) ? undefined : 'Leave empty to keep the stored replay');

// One row per game played, plus the next while neither side has won the series
const gameRows = computed(() => gameSlots(scoreSeries.value.map_rules, scoreSeries.value.winners || []));

// The map the season's rules offer for each game, given the veto and who won the games before
const offeredMaps = computed(() => mapsByGame(
  scoreSeries.value.map_rules,
  scoreVeto.value?.week_map_id,
  picksOf(scoreVeto.value?.steps),
  scoreSeries.value.winners || []
));
const mapOf = (game) => scoreSeries.value.maps?.[game] ?? offeredMaps.value[game - 1] ?? null;
const setMap = (game, mapId) => { scoreSeries.value.maps[game] = mapId; };

// A changed winner reopens the games after it: they were played under a different map order
const setWinner = (game, side) => {
  const winners = scoreSeries.value.winners;
  if (winners[game - 1] === side) return;
  winners[game - 1] = side || null;
  winners.length = game;
  for (const named of Object.keys(scoreSeries.value.maps)) {
    if (Number(named) > game) delete scoreSeries.value.maps[named];
  }
};

const scoreProblem = computed(() => {
  const [p1, p2] = reportedScore.value;
  return isValidResult(p1, p2, seriesWins.value) ? null : 'Tap the winner of each game played';
});
const resultLine = computed(() => {
  const [p1, p2] = reportedScore.value;
  return `${scoreSeries.value.player1_name} ${p1} – ${p2} ${scoreSeries.value.player2_name}`;
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
  mapStore.fetchMaps().catch(() => {});  // names the maps the report offers for each game
  await fetchPlayerData();
});
</script>

<style scoped>
.v-chip {
  margin: 2px;
}

/* Phone: the blocked-times buttons meet the 48 px minimum */
@media (max-width: 600px) {
  .blocks-btn { min-height: 48px; }
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