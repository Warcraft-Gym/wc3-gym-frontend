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
          <PlayerName :player="playerData.player" @click.stop="showPlayerDetails(playerData.player)">
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
        <v-btn v-if="!token" icon="mdi-pencil" size="small" variant="text" title="Edit profile" @click="openEditProfile" />
      </v-card-title>
      <v-card-text class="pt-4">
        <v-alert v-if="needsSignup" type="info" variant="tonal" border="start" class="mb-4">
          <div class="d-flex align-center justify-space-between flex-wrap ga-2">
            <span>Not signed up for {{ seasonLabel }}</span>
            <v-btn color="primary" variant="elevated" size="small" @click="router.push('/signup')">Sign up</v-btn>
          </div>
        </v-alert>
        <div class="d-flex flex-wrap align-center ga-2 mb-3">
          <v-chip color="secondary" prepend-icon="mdi-discord">
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

    <v-card v-if="!isLoading && weeks.length" elevation="2" class="mb-6">
      <v-card-title class="bg-primary d-flex justify-space-between align-center">
        <div class="d-flex align-center">
          <v-icon class="mr-2">mdi-calendar-check</v-icon>
          <span>My Weeks</span>
        </div>
        <v-chip color="white" variant="outlined">
          {{ answeredWeeks }} of {{ weeksAhead.length }} answered
        </v-chip>
      </v-card-title>
      <v-card-text class="d-flex flex-wrap ga-3 pt-4">
        <v-sheet
          v-for="week in weeks"
          :key="week"
          border
          rounded
          class="pa-3 flex-grow-1"
          style="min-width: 210px"
        >
          <div class="text-subtitle-2">Week {{ week }}</div>
          <div v-if="opponentOfWeek(week)" class="text-caption text-medium-emphasis">vs {{ opponentOfWeek(week).name }}</div>
          <div v-if="matchOfWeek(week)?.date_frame" class="text-caption text-medium-emphasis">{{ matchOfWeek(week).date_frame }}</div>

          <div v-if="week < currentWeek" class="mt-2">
            <v-chip v-if="seriesOfWeek(week)" :color="getScoreColor(seriesOfWeek(week))" variant="outlined" size="small">
              {{ myScore(seriesOfWeek(week)) }} - {{ theirScore(seriesOfWeek(week)) }}
            </v-chip>
            <v-chip v-else variant="tonal" size="small">No series</v-chip>
          </div>

          <template v-else>
            <div class="d-flex ga-2 mt-2">
              <v-btn
                color="success"
                :variant="answerFor(week) === true ? 'flat' : 'outlined'"
                :loading="savingWeek === week"
                :disabled="savingWeek !== null"
                @click="setWeek(week, true)"
              >
                Can play
              </v-btn>
              <v-btn
                color="error"
                :variant="answerFor(week) === false ? 'flat' : 'outlined'"
                :loading="savingWeek === week"
                :disabled="savingWeek !== null"
                @click="setWeek(week, false)"
              >
                Cannot play
              </v-btn>
            </div>
            <div class="text-caption text-medium-emphasis mt-2">{{ setByLine(week) }}</div>
          </template>
        </v-sheet>
      </v-card-text>
    </v-card>

    <v-card v-if="!isLoading && playerData" elevation="2">
      <v-card-title class="bg-primary d-flex justify-space-between align-center">
        <div class="d-flex align-center">
          <v-icon class="mr-2">mdi-calendar-clock</v-icon>
          <span>Upcoming Series</span>
        </div>
        <v-chip color="white" variant="outlined">
          {{ upcoming.length }} series
        </v-chip>
      </v-card-title>

      <!-- Desktop: Data Table -->
      <v-card-text v-if="!isMobile" class="pa-0">
      <v-data-table
        :headers="upcomingHeaders"
        :items="upcoming"
        :sort-by="[{ key: 'week', order: 'asc' }]"
        :items-per-page="-1"
        hide-default-footer
        class="elevation-1"
        item-value="id"
      >
        <template #item.opponent="{ item }">
          <PlayerName
            :player="opponent(item)"
            :race="opponent(item).signup_race"
            @click.stop="showPlayerDetails(opponent(item))"
          />
        </template>

        <template #item.date_time="{ item }">
          {{ formatDateTime(item.date_time) }}
        </template>

        <template #item.week="{ item }">
          {{ item.week || 'TBD' }}
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
          <v-btn
            color="primary"
            variant="outlined"
            size="small"
            prepend-icon="mdi-map-outline"
            class="ml-2"
            @click="router.push(vetoRoute(item))"
          >
            Maps
          </v-btn>
        </template>

        <template #no-data>
          No upcoming series. Every result is in.
        </template>
      </v-data-table>
      </v-card-text>

      <!-- Mobile: Card Layout -->
      <v-card-text v-if="isMobile" class="pa-4">
        <v-card
          v-for="item in upcoming"
          :key="item.id"
          elevation="1"
          class="mb-4"
        >
          <v-card-text>
            <div class="mb-3">
              <div class="text-caption text-grey">Opponent</div>
              <div class="text-h6">
                <PlayerName
                  :player="opponent(item)"
                  :race="opponent(item).signup_race"
                  @click.stop="showPlayerDetails(opponent(item))"
                />
              </div>
            </div>

            <v-divider class="my-3"></v-divider>

            <div class="mb-2">
              <div class="text-caption text-grey">Season</div>
              <div>{{ item.season_name }}</div>
            </div>

            <div class="mb-2">
              <div class="text-caption text-grey">Date & Time</div>
              <div>{{ formatDateTime(item.date_time) }}</div>
            </div>

            <div class="mb-3">
              <div class="text-caption text-grey">Week</div>
              <div>{{ item.week || 'TBD' }}</div>
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
              <v-btn
                color="primary"
                variant="outlined"
                block
                prepend-icon="mdi-map-outline"
                @click="router.push(vetoRoute(item))"
              >
                Maps
              </v-btn>
            </div>
          </v-card-text>
        </v-card>

        <v-alert v-if="upcoming.length === 0" type="info" variant="tonal">
          No upcoming series. Every result is in.
        </v-alert>
      </v-card-text>
    </v-card>

    <v-card v-if="!isLoading && completed.length" elevation="2" class="mt-6">
      <v-card-title class="bg-primary d-flex justify-space-between align-center">
        <div class="d-flex align-center">
          <v-icon class="mr-2">mdi-trophy</v-icon>
          <span>Completed Series</span>
        </div>
        <v-chip color="white" variant="outlined">
          {{ completed.length }} series
        </v-chip>
      </v-card-title>

      <!-- Desktop: Data Table -->
      <v-card-text v-if="!isMobile" class="pa-0">
      <v-data-table
        :headers="completedHeaders"
        :items="completed"
        :sort-by="[{ key: 'week', order: 'desc' }]"
        class="elevation-1"
        item-value="id"
      >
        <template #item.opponent="{ item }">
          <PlayerName
            :player="opponent(item)"
            :race="opponent(item).signup_race"
            @click.stop="showPlayerDetails(opponent(item))"
          />
        </template>

        <template #item.score="{ item }">
          <v-chip
            :color="getScoreColor(item)"
            variant="outlined"
            size="small"
          >
            {{ myScore(item) }} - {{ theirScore(item) }}
          </v-chip>
        </template>

        <template #item.date_time="{ item }">
          {{ formatDateTime(item.date_time) }}
        </template>

        <template #item.actions="{ item }">
          <v-tooltip text="Fix result" location="top">
            <template #activator="{ props }">
              <v-btn
                v-bind="props"
                icon="mdi-pencil"
                variant="text"
                size="small"
                @click="reportResult(item)"
                :loading="scoreSavingId === item.id"
              />
            </template>
          </v-tooltip>
        </template>
      </v-data-table>
      </v-card-text>

      <!-- Mobile: Card Layout -->
      <v-card-text v-if="isMobile" class="pa-4">
        <v-card
          v-for="item in completed"
          :key="item.id"
          elevation="1"
          class="mb-4"
        >
          <v-card-text>
            <div class="d-flex justify-space-between align-center">
              <PlayerName
                :player="opponent(item)"
                :race="opponent(item).signup_race"
                @click.stop="showPlayerDetails(opponent(item))"
              />
              <v-chip
                :color="getScoreColor(item)"
                variant="outlined"
              >
                {{ myScore(item) }} - {{ theirScore(item) }}
              </v-chip>
            </div>
            <div class="d-flex justify-space-between align-center mt-2">
              <span class="text-caption text-medium-emphasis">
                {{ item.season_name }}<template v-if="item.week">, week {{ item.week }}</template>
                <template v-if="item.date_time"> · {{ formatDateTime(item.date_time) }}</template>
              </span>
              <v-btn
                variant="text"
                size="x-small"
                prepend-icon="mdi-pencil"
                @click="reportResult(item)"
                :loading="scoreSavingId === item.id"
              >
                Fix result
              </v-btn>
            </div>
          </v-card-text>
        </v-card>
      </v-card-text>
    </v-card>

    <v-card v-if="!isLoading && history.events.length" elevation="2" class="mt-6">
      <v-card-title class="bg-primary d-flex justify-space-between align-center">
        <div class="d-flex align-center">
          <v-icon class="mr-2">mdi-history</v-icon>
          <span>My Events</span>
        </div>
        <v-chip color="white" variant="outlined">
          {{ history.events.length }} events, {{ eventTotals.won }} to {{ eventTotals.lost }}
        </v-chip>
      </v-card-title>
      <v-table density="comfortable">
        <thead>
          <tr>
            <th>Event</th>
            <th>Played for</th>
            <th>Series record</th>
            <th>Finish</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="event in history.events" :key="event.season_id">
            <td>{{ event.season_name }}</td>
            <td :class="{ 'text-medium-emphasis': !event.team_name }">{{ event.team_name || 'Solo' }}</td>
            <td>
              <v-chip :color="recordColor(event.won, event.lost)" variant="tonal" size="small">
                {{ event.won }} to {{ event.lost }}
              </v-chip>
            </td>
            <td>{{ finishText(event) }}</td>
          </tr>
        </tbody>
      </v-table>
    </v-card>

    <v-card v-if="!isLoading && history.opponents.length" elevation="2" class="mt-6">
      <v-card-title class="bg-primary d-flex justify-space-between align-center">
        <div class="d-flex align-center">
          <v-icon class="mr-2">mdi-sword-cross</v-icon>
          <span>Head to Head, Lifetime</span>
        </div>
        <v-chip color="white" variant="outlined">
          {{ history.opponents.length }} players faced
        </v-chip>
      </v-card-title>
      <v-table density="comfortable">
        <thead>
          <tr>
            <th>Opponent</th>
            <th>Played</th>
            <th>Series record</th>
            <th>Last met</th>
          </tr>
        </thead>
        <tbody>
          <template v-for="opp in history.opponents" :key="opp.id">
            <tr class="opponent-row" @click="openOpponent = openOpponent === opp.id ? null : opp.id">
              <!-- no race here: the row spans every season, and a player is not one race -->
              <td><PlayerName :player="opp" /></td>
              <td>{{ opp.played }} series</td>
              <td>
                <v-chip :color="recordColor(opp.won, opp.lost)" variant="tonal" size="small">
                  {{ opp.won }} to {{ opp.lost }}
                </v-chip>
              </td>
              <td class="d-flex align-center justify-space-between ga-2">
                <span class="text-medium-emphasis">{{ lastMet(opp) }}</span>
                <v-icon size="small">{{ openOpponent === opp.id ? 'mdi-chevron-up' : 'mdi-chevron-down' }}</v-icon>
              </td>
            </tr>
            <tr
              v-for="meeting in (openOpponent === opp.id ? opp.meetings : [])"
              :key="meeting.series_id"
              class="bg-grey-lighten-4"
            >
              <td class="text-caption">
                {{ meeting.season_name }}<template v-if="meeting.playday">, week {{ meeting.playday }}</template>
              </td>
              <td>
                <v-chip :color="recordColor(meeting.my_score, meeting.their_score)" variant="tonal" size="x-small">
                  {{ meeting.my_score }} to {{ meeting.their_score }}
                </v-chip>
                <span class="text-caption text-medium-emphasis ml-1">games</span>
              </td>
              <td colspan="2" class="text-caption text-medium-emphasis">
                <template v-if="meeting.maps?.length">{{ meeting.maps.join(', ') }} · </template>
                {{ meeting.date_time ? formatDateTime(meeting.date_time) : '' }}
              </td>
            </tr>
          </template>
        </tbody>
      </v-table>
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
        <v-alert
          v-if="scoreVeto"
          :type="scoreVeto.complete ? 'success' : 'warning'"
          variant="tonal"
          density="compact"
          class="mb-2"
        >
          {{ scoreVeto.complete ? 'Map veto complete' : 'The map veto is not complete. Enter it first.' }}
          <template v-if="!scoreVeto.complete" #append>
            <v-btn size="small" variant="outlined" prepend-icon="mdi-map-outline" @click="goToVeto">Map veto</v-btn>
          </template>
        </v-alert>
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
            <v-row v-for="game in replaySlots" :key="game">
              <v-col cols="12">
                <v-file-input
                  v-model="scoreSeries.replays[game]"
                  :label="`Game ${game} Replay`"
                  variant="outlined"
                  accept=".w3g"
                  prepend-icon="mdi-file-upload"
                  :rules="game > seriesWins ? [rules.required, rules.w3gFile] : [rules.w3gFile]"
                  :required="game > seriesWins"
                  :hint="game > seriesWins ? decidingHint : undefined"
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

  <!-- Player Details Dialog -->
  <PlayerDetailsDialog
    ref="playerDetailsDialog"
    :seasonId="playerData?.season_id ? Number(playerData.season_id) : null"
    :w3cSeason="currentW3CSeason"
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
import { ref, onMounted, computed } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { fetchWrapper, pageQuery, PAGE_LIMIT } from '@/helpers';
import { authHeader } from '@/helpers/fetch-wrapper';
import { useAuthStore, useAvailabilityStore, useSeasonStore, useMatchStore, usePlayerStore } from '@/stores';
import { syncedAgo, w3cPlayerUrl } from '@/helpers/w3c-stats';
import { winsOf, isValidResult, replaysNeeded } from '@/helpers/best-of';
import RaceMmrChips from '@/components/RaceMmrChips.vue';
import SimpleTimePicker from '@/components/SimpleTimePicker.vue';
import SimpleDatePicker from '@/components/SimpleDatePicker.vue';
import PlayerDetailsDialog from '@/components/PlayerDetailsDialog.vue';
import RaceSelect from '@/components/RaceSelect.vue';
import CountrySelect from '@/components/CountrySelect.vue';
import W3CIcon from '@/components/W3CIcon.vue';
import W3CMmr from '@/components/W3CMmr.vue';
import { DateTime } from 'luxon';
import { formatDateTime } from '@/helpers/datetime';
import { useDisplay } from 'vuetify';
import { resolveCurrentW3CSeason } from '@/helpers/current-season';
import StatusAlert from '@/components/StatusAlert.vue';


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
const playerDetailsDialog = ref(null);

const showPlayerDetails = (player) => {
  if (!player) return;
  playerDetailsDialog.value.open(player);
};

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
// the other side of a series; the id is the fallback when the payload carries no player row
const opponent = (item) => {
  const mine = item.player1_id === playerData.value?.player?.id;
  return (mine ? item.player2 : item.player1) || { name: `Player ${mine ? item.player2_id : item.player1_id}` };
};

const playerData = ref(null);
const series = ref([]);
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
// a result carries its veto, so the dialog reads the board before the scores
const scoreVeto = ref(null);
const vetoMissing = computed(() => !!scoreVeto.value && !scoreVeto.value.complete);
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

const upcomingHeaders = [
  { title: 'Opponent', key: 'opponent', sortable: false },
  { title: 'Season', key: 'season_name' },
  { title: 'Date & Time', key: 'date_time' },
  { title: 'Week', key: 'week' },
  { title: '', key: 'actions', sortable: false }
];

const completedHeaders = [
  { title: 'Opponent', key: 'opponent', sortable: false },
  { title: 'Season', key: 'season_name' },
  { title: 'Date & Time', key: 'date_time' },
  { title: 'Score', key: 'score', sortable: false },
  { title: 'Week', key: 'week' },
  { title: '', key: 'actions', sortable: false }
];

// week and season lifted out of the match so the tables sort on them
const withKeys = (item) => ({ ...item, week: item.match?.playday ?? null, season_name: item.match?.season?.name || '' });
const upcoming = computed(() => series.value.filter(isUnplayed).map(withKeys));
const completed = computed(() => series.value.filter((item) => !isUnplayed(item)).map(withKeys));

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
    const seriesUrl = (limit, offset) => `${backendUrl}/player-series?${tokenParam}${pageQuery({ limit, offset })}`;

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
    await fetchTeamMatches();

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

// the map veto is only worth opening before the series is played; the link carries the token
const isUnplayed = (item) => !item.player1_score && !item.player2_score;
const vetoRoute = (item, query = {}) => ({
  path: `/player-series/${item.id}/veto`,
  query: token.value ? { token: token.value, ...query } : query
});

// Scores read from the player's side: mine first, the opponent's second
const myScore = (item) => (item.player1_id === playerData.value?.player?.id ? item.player1_score : item.player2_score) || 0;
const theirScore = (item) => (item.player1_id === playerData.value?.player?.id ? item.player2_score : item.player1_score) || 0;

// Get score color based on win/loss
const getScoreColor = (item) => {
  if (myScore(item) > theirScore(item)) return 'success';
  if (myScore(item) < theirScore(item)) return 'error';
  return 'warning';
};

// My weeks: /player-series carries the answers and the length of the season
const availabilityStore = useAvailabilityStore();
const matchStore = useMatchStore();
const playerStore = usePlayerStore();
const savingWeek = ref(null);

const weeks = computed(() => Array.from({ length: playerData.value?.number_weeks || 0 }, (_, i) => i + 1));

// The week labels: the team's match of each week names the opponent and the dates (#33)
const teamMatches = ref([]);
const myTeamId = ref(null);
const fetchTeamMatches = async () => {
  const seasonId = Number(playerData.value?.season_id);
  if (!seasonId) return;
  // the dashboard player is the reduced one; the full player names the team of each season
  const [full, seasonMatches] = await Promise.all([
    playerStore.getPlayer(playerData.value.player.id).catch(() => null),
    matchStore.searchMatchesBySeason(seasonId).catch(() => []),
  ]);
  myTeamId.value = full?.gnl_stats?.find(stat => stat.season_id === seasonId)?.team_id ?? null;
  teamMatches.value = seasonMatches;
};
const matchOfWeek = (week) => teamMatches.value.find(m => m.playday === week && [m.team1_id, m.team2_id].includes(myTeamId.value));
const opponentOfWeek = (week) => { const m = matchOfWeek(week); return m && (m.team1_id === myTeamId.value ? m.team2 : m.team1); };

// the earliest week whose series has no score; a season with none left starts again at week 1
const currentWeek = computed(() => {
  const open = series.value
    .filter(item => !item.player1_score && !item.player2_score)
    .map(item => item.match?.playday)
    .filter(Boolean);
  return open.length ? Math.min(...open) : 1;
});

const weeksAhead = computed(() => weeks.value.filter(week => week >= currentWeek.value));
const answeredWeeks = computed(() => weeksAhead.value.filter(week => answerFor(week) !== null).length);

const seriesOfWeek = (week) => series.value.find(item => item.match?.playday === week);
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
    if (token.value) answer.token = token.value;
    if (playerData.value?.season_id) answer.season_id = Number(playerData.value.season_id);
    playerData.value.availability = await availabilityStore.setPlayerAvailability(answer);
  } catch (error) {
    console.error('Error saving availability:', error);
    errorMessage.value = error.message || 'Error saving availability.';
  } finally {
    savingWeek.value = null;
  }
};

// My history: every event the player took part in and their lifetime head to head
const history = ref({ events: [], opponents: [] });
const openOpponent = ref(null);

const eventTotals = computed(() => history.value.events.reduce(
  (total, event) => ({ won: total.won + event.won, lost: total.lost + event.lost }),
  { won: 0, lost: 0 }
));

const recordColor = (won, lost) => (won > lost ? 'success' : won < lost ? 'error' : undefined);

const ordinal = (n) => `${n}${['th', 'st', 'nd', 'rd'][(n % 100 - 20) % 10] || ['th', 'st', 'nd', 'rd'][n % 100] || 'th'}`;

const finishText = (event) => {
  if (event.running) return 'Running';
  if (!event.place) return '';
  return event.team_count ? `${ordinal(event.place)} of ${event.team_count}` : ordinal(event.place);
};

const lastMet = (opp) => [opp.last_season_name, opp.last_playday ? `week ${opp.last_playday}` : null].filter(Boolean).join(', ');

// read once; the history does not change with the series table controls
const fetchHistory = async () => {
  if (!hasAccess()) return;
  const query = route.query.token ? `?token=${encodeURIComponent(route.query.token)}` : '';
  try {
    history.value = await fetchWrapper.get(`${backendUrl}/player-history${query}`);
  } catch (error) {
    console.error('Error fetching player history:', error);  // the dashboard stands without it
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
    map_rules: item.match?.season?.map_rules,
    replays: {}
  };

  scoreVeto.value = null;
  const vetoUrl = `${backendUrl}/player-series/${item.id}/veto`;
  fetchWrapper.get(token.value ? `${vetoUrl}?token=${encodeURIComponent(token.value)}` : vetoUrl)
    .then(board => { scoreVeto.value = board; })
    .catch(() => {});  // the backend refuses the report anyway
  scoreDialog.value = true;
};

const goToVeto = () => {
  const id = scoreSeries.value.id;
  closeScore();
  router.push(vetoRoute({ id }, { report: 1 }));  // the board opens in record mode and leads back here
};

const closeScore = () => {
  scoreDialog.value = false;
  scoreSeries.value = { replays: {} };
};

const saveResult = async () => {
  scoreSavingId.value = scoreSeries.value.id;
  try {
    const p1 = parseInt(scoreSeries.value.player1_score) || 0;
    const p2 = parseInt(scoreSeries.value.player2_score) || 0;

    const played = replaysNeeded(p1, p2);
    for (let game = 1; game <= played; game++) {
      if (!hasReplay(game)) {
        errorMessage.value = `Game ${game} replay file is required for a ${p1}:${p2} result.`;
        return;
      }
    }

    const formData = new FormData();
    if (token.value) formData.append('token', token.value);
    formData.append('player1_score', p1);
    formData.append('player2_score', p2);
    formData.append('action', 'score_updated');

    for (let game = 1; game <= played; game++) formData.append(`game${game}`, scoreSeries.value.replays[game]);

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

// The reported score, the season's maps to win, and the replay the reporter picked for a game
const reportedScore = computed(() => [parseInt(scoreSeries.value.player1_score), parseInt(scoreSeries.value.player2_score)]);
const seriesWins = computed(() => winsOf(scoreSeries.value.map_rules));
const hasReplay = (game) => scoreSeries.value.replays?.[game] instanceof File;

// The series always plays as many maps as it takes to win; the rest show once the score calls for them
const replaySlots = computed(() => {
  const [p1, p2] = reportedScore.value;
  return isValidResult(p1, p2, seriesWins.value) ? replaysNeeded(p1, p2) : seriesWins.value;
});
const decidingHint = computed(() => `Required for a ${reportedScore.value.join(':')} result`);

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
  for (let game = 1; game <= played; game++) if (!hasReplay(game)) return false;

  return true;
});

onMounted(async () => {
  currentW3CSeason.value = await resolveCurrentW3CSeason();
  if (authStore.me) seasonStore.fetchSeasons().catch(() => {});  // names the season the signup alert asks about
  await fetchPlayerData();
  fetchHistory();
  // the veto board sends the reporter back with ?report=<series id>
  const back = series.value.find(item => String(item.id) === route.query.report);
  if (back) reportResult(back);
});
</script>

<style scoped>
.v-chip {
  margin: 2px;
}

.opponent-row {
  cursor: pointer;
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