<template>
  <v-container fluid style="max-width: 960px; margin: 0 auto;" class="pa-6">

    <!-- Header -->
    <div class="d-flex align-center mb-6">
      <v-icon size="x-large" color="primary" class="mr-3">mdi-dice-multiple</v-icon>
      <div>
        <div class="text-h5 font-weight-bold">Random Stats Helper</div>
        <div class="text-body-2 text-grey">Breakdown of drawn race vs opponent race for Random games only</div>
      </div>
    </div>

    <!-- Search form -->
    <v-card elevation="2" class="mb-6">
      <v-card-title class="bg-primary">Player &amp; Seasons</v-card-title>
      <v-card-text class="pt-4">
        <v-row align="start">
          <v-col cols="12" md="5">
            <v-text-field
              v-model="battleTag"
              label="BattleTag  (e.g. Player#1234)"
              variant="outlined"
              density="comfortable"
              prepend-inner-icon="mdi-account"
              clearable
              hint="Exact BattleTag as shown on W3Champions"
              persistent-hint
              @keyup.enter="loadStats"
            />
          </v-col>
          <v-col cols="12" md="5">
            <v-select
              v-model="selectedSeasons"
              :items="seasonOptions"
              label="W3C Seasons"
              variant="outlined"
              density="comfortable"
              multiple
              chips
              closable-chips
              prepend-inner-icon="mdi-calendar-range"
              hint="Select one or more seasons to analyse"
              persistent-hint
            />
          </v-col>
          <v-col cols="12" md="2" class="d-flex align-center" style="padding-top: 4px;">
            <v-btn
              color="primary"
              variant="elevated"
              block
              size="large"
              :loading="isLoading"
              :disabled="!canSearch"
              prepend-icon="mdi-chart-bar"
              @click="loadStats"
            >
              Analyse
            </v-btn>
          </v-col>
        </v-row>

        <v-alert
          v-if="errorMessage"
          type="error"
          variant="tonal"
          class="mt-4"
          closable
          @click:close="errorMessage = null"
        >
          {{ errorMessage }}
        </v-alert>
      </v-card-text>
    </v-card>

    <!-- Loading progress -->
    <v-card v-if="isLoading" elevation="2" class="mb-6">
      <v-card-text class="py-4">
        <div class="text-body-2 mb-3">{{ loadingMessage }}</div>
        <v-progress-linear indeterminate color="primary" rounded height="6" />
      </v-card-text>
    </v-card>

    <!-- Overall summary -->
    <v-card v-if="hasResults && !isLoading" elevation="2" class="mb-6">
      <v-card-title class="bg-primary">
        Summary — {{ resolvedTag }}
        <span class="text-body-2 ml-2 text-white opacity-80">(seasons {{ selectedSeasons.join(', ') }})</span>
      </v-card-title>
      <v-card-text class="pt-4">
        <v-row>
          <v-col cols="6" sm="3" class="text-center">
            <div class="text-h5 font-weight-bold">{{ totalGames }}</div>
            <div class="text-caption text-grey">Total games</div>
          </v-col>
          <v-col cols="6" sm="3" class="text-center">
            <div class="text-h5 font-weight-bold text-green">{{ totalWins }}</div>
            <div class="text-caption text-grey">Wins</div>
          </v-col>
          <v-col cols="6" sm="3" class="text-center">
            <div class="text-h5 font-weight-bold text-red">{{ totalLosses }}</div>
            <div class="text-caption text-grey">Losses</div>
          </v-col>
          <v-col cols="6" sm="3" class="text-center">
            <div class="text-h5 font-weight-bold" :class="winRateTextColor(totalWins, totalLosses)">{{ overallWinRate }}%</div>
            <div class="text-caption text-grey">Win rate</div>
          </v-col>
        </v-row>
      </v-card-text>
    </v-card>

    <!-- Per-race breakdown cards -->
    <template v-if="hasResults && !isLoading">
      <v-card
        v-for="(data, raceName) in raceBreakdown"
        :key="raceName"
        elevation="2"
        class="mb-5"
      >
        <v-card-title class="bg-secondary d-flex align-center">
          <RaceIcon :raceIdentifier="raceIdMap[raceName]" class="mr-2" />
          <span>Playing as {{ raceName }}</span>
          <v-spacer />
          <v-chip color="white" variant="tonal" size="small" class="mr-2">
            {{ data.wins + data.losses }} games
          </v-chip>
          <v-chip :color="winRateChipColor(data.wins, data.losses)" size="small">
            {{ Math.round(data.wins / (data.wins + data.losses) * 100) }}% WR
          </v-chip>
        </v-card-title>

        <v-table density="comfortable">
          <thead>
            <tr class="bg-surface-variant">
              <th class="text-left">Opponent Race</th>
              <th class="text-right text-green">Wins</th>
              <th class="text-right text-red">Losses</th>
              <th class="text-right">Total</th>
              <th class="text-right" style="min-width:90px">Win %</th>
            </tr>
          </thead>
          <tbody>
            <tr
              v-for="(matchup, oppRace) in sortedMatchups(data.matchups)"
              :key="oppRace"
            >
              <td>
                <div class="d-flex align-center" style="gap: 8px;">
                  <RaceIcon :raceIdentifier="raceIdMap[oppRace]" />
                  <span>{{ oppRace }}</span>
                </div>
              </td>
              <td class="text-right text-green font-weight-medium">{{ matchup.wins }}</td>
              <td class="text-right text-red font-weight-medium">{{ matchup.losses }}</td>
              <td class="text-right">{{ matchup.wins + matchup.losses }}</td>
              <td class="text-right">
                <v-chip
                  size="small"
                  :color="winRateChipColor(matchup.wins, matchup.losses)"
                  variant="tonal"
                >
                  {{ Math.round(matchup.wins / (matchup.wins + matchup.losses) * 100) }}%
                </v-chip>
              </td>
            </tr>
          </tbody>
          <!-- Row totals -->
          <tfoot>
            <tr style="border-top: 2px solid rgba(0,0,0,0.12);">
              <td class="font-weight-bold">Total</td>
              <td class="text-right font-weight-bold text-green">{{ data.wins }}</td>
              <td class="text-right font-weight-bold text-red">{{ data.losses }}</td>
              <td class="text-right font-weight-bold">{{ data.wins + data.losses }}</td>
              <td class="text-right">
                <v-chip
                  size="small"
                  :color="winRateChipColor(data.wins, data.losses)"
                >
                  {{ Math.round(data.wins / (data.wins + data.losses) * 100) }}%
                </v-chip>
              </td>
            </tr>
          </tfoot>
        </v-table>
      </v-card>
    </template>

    <!-- No data -->
    <v-alert
      v-if="hasSearched && !isLoading && !hasResults"
      type="info"
      variant="tonal"
    >
      No Random games found for <strong>{{ resolvedTag }}</strong> in the selected seasons.
      Make sure the BattleTag is correct and the player has Random games in those seasons.
    </v-alert>

  </v-container>
</template>

<script setup>
import { ref, computed } from 'vue';


const W3C_MATCH_API = 'https://website-backend.w3champions.com/api/matches/search';

// W3C API returns race as a number. Mapping to display name.
// Confirmed from match data (heroes played):
//   0 = Random (selected race), 1 = Human, 2 = Orc, 4 = Night Elf, 8 = Undead, 16/32 = Random
const W3C_RACE_NAMES = {
  1: 'Human',
  2: 'Orc',
  4: 'Night Elf',
  8: 'Undead',
  16: 'Random',
  32: 'Random',
  // String variants returned by some API versions
  'HUMAN': 'Human',
  'ORC': 'Orc',
  'NIGHTELF': 'Night Elf',
  'NIGHT_ELF': 'Night Elf',
  'UNDEAD': 'Undead',
  'RANDOM': 'Random',
};

// Map from display name to RaceIcon identifier (keys in races.js)
const raceIdMap = {
  'Human': 'HU',
  'Orc': 'OC',
  'Night Elf': 'NE',
  'Undead': 'UD',
  'Random': 'RANDOM',
};

// Seasons to offer — show 1 through 35
const seasonOptions = Array.from({ length: 35 }, (_, i) => 35 - i);

// ── State ─────────────────────────────────────────────────────────────────────
const battleTag = ref('');
const selectedSeasons = ref([25, 26]);
const isLoading = ref(false);
const loadingMessage = ref('');
const errorMessage = ref(null);
const hasSearched = ref(false);
const resolvedTag = ref('');

// raceBreakdown: { 'Human': { wins, losses, matchups: { 'Orc': { wins, losses }, ... } }, ... }
const raceBreakdown = ref(null);

// ── Computed ──────────────────────────────────────────────────────────────────
const canSearch = computed(() =>
  battleTag.value?.trim().length > 0 && selectedSeasons.value.length > 0
);

const hasResults = computed(() =>
  raceBreakdown.value && Object.keys(raceBreakdown.value).length > 0
);

const totalGames = computed(() => {
  if (!raceBreakdown.value) return 0;
  return Object.values(raceBreakdown.value).reduce((s, r) => s + r.wins + r.losses, 0);
});

const totalWins = computed(() => {
  if (!raceBreakdown.value) return 0;
  return Object.values(raceBreakdown.value).reduce((s, r) => s + r.wins, 0);
});

const totalLosses = computed(() => totalGames.value - totalWins.value);

const overallWinRate = computed(() =>
  totalGames.value === 0 ? 0 : Math.round(totalWins.value / totalGames.value * 100)
);

// ── Helpers ───────────────────────────────────────────────────────────────────
function raceName(raceValue) {
  return W3C_RACE_NAMES[raceValue] ?? `Random`;
}

function winRateChipColor(wins, losses) {
  const total = wins + losses;
  if (total === 0) return 'grey';
  const r = wins / total;
  if (r >= 0.6) return 'success';
  if (r >= 0.5) return 'warning';
  return 'error';
}

function winRateTextColor(wins, losses) {
  const total = wins + losses;
  if (total === 0) return '';
  const r = wins / total;
  if (r >= 0.6) return 'text-green';
  if (r >= 0.5) return 'text-warning';
  return 'text-red';
}

// Sort matchups by total games descending
function sortedMatchups(matchups) {
  return Object.fromEntries(
    Object.entries(matchups).sort(([, a], [, b]) => (b.wins + b.losses) - (a.wins + a.losses))
  );
}

// ── API ───────────────────────────────────────────────────────────────────────
async function fetchPage(tag, season, offset) {
  const params = new URLSearchParams({
    playerId: tag,
    gateway: 20,
    offset,
    pageSize: 50,
    season,
    playerIncludeRandom: true,
    opponentIncludeRandom: true,
  });
  const res = await fetch(`${W3C_MATCH_API}?${params}`);
  if (!res.ok) throw new Error(`W3C API responded with ${res.status} ${res.statusText}`);
  return res.json();
}

function processMatches(matches, tagLower, breakdown) {
  for (const match of matches) {
    if (!Array.isArray(match.teams) || match.teams.length < 2) continue;

    // Only 1v1 solo games
    if (match.gameMode !== 1) continue;

    let playerTeam = null;
    let opponentTeam = null;

    for (const team of match.teams) {
      const hasPlayer = team.players?.some(p =>
        p.battleTag?.toLowerCase() === tagLower ||
        p.battleTag?.toLowerCase().startsWith(tagLower.split('#')[0].toLowerCase() + '#')
      );
      if (hasPlayer) playerTeam = team;
      else opponentTeam = team;
    }

    if (!playerTeam || !opponentTeam) continue;

    const playerEntry = playerTeam.players?.[0];
    const opponentEntry = opponentTeam.players?.[0];
    if (!playerEntry || !opponentEntry) continue;

    // Only process Random games (race === 0)
    if (playerEntry.race !== 0) continue;

    // Use rndRace (the actual drawn race) as the grouping key.
    // rndRace may be 0/null when the API doesn't report the drawn race (common for losses).
    const drawnRace = (playerEntry.rndRace != null && playerEntry.rndRace !== 0)
      ? raceName(playerEntry.rndRace)
      : 'Random=?';
    const oppRace = raceName(opponentEntry.race);
    const won = playerTeam.won === true;

    if (!breakdown[drawnRace]) {
      breakdown[drawnRace] = { wins: 0, losses: 0, matchups: {} };
    }
    if (!breakdown[drawnRace].matchups[oppRace]) {
      breakdown[drawnRace].matchups[oppRace] = { wins: 0, losses: 0 };
    }

    breakdown[drawnRace].wins += won ? 1 : 0;
    breakdown[drawnRace].losses += won ? 0 : 1;
    breakdown[drawnRace].matchups[oppRace].wins += won ? 1 : 0;
    breakdown[drawnRace].matchups[oppRace].losses += won ? 0 : 1;
  }
}

// ── Main action ───────────────────────────────────────────────────────────────
async function loadStats() {
  if (!canSearch.value) return;

  errorMessage.value = null;
  raceBreakdown.value = null;
  hasSearched.value = true;
  isLoading.value = true;
  resolvedTag.value = battleTag.value.trim();

  const tag = resolvedTag.value;
  const tagLower = tag.toLowerCase();
  const breakdown = {};

  try {
    for (const season of [...selectedSeasons.value].sort((a, b) => a - b)) {
      loadingMessage.value = `Fetching season ${season} — page 1...`;

      const firstPage = await fetchPage(tag, season, 0);
      const total = firstPage.count ?? firstPage.total ?? (firstPage.matches?.length ?? 0);
      processMatches(firstPage.matches ?? [], tagLower, breakdown);

      const totalPages = Math.ceil(total / 50);
      for (let page = 1; page < totalPages; page++) {
        loadingMessage.value = `Fetching season ${season} — page ${page + 1} of ${totalPages}...`;
        const data = await fetchPage(tag, season, page * 50);
        processMatches(data.matches ?? [], tagLower, breakdown);
      }
    }

    // Sort races by total games descending
    raceBreakdown.value = Object.fromEntries(
      Object.entries(breakdown).sort(([, a], [, b]) => (b.wins + b.losses) - (a.wins + a.losses))
    );
  } catch (err) {
    if (err.message.includes('Failed to fetch') || err.message.includes('NetworkError')) {
      errorMessage.value = 'Network error — the W3C Champions API may be unreachable or blocking cross-origin requests.';
    } else {
      errorMessage.value = `Failed to load stats: ${err.message}`;
    }
  } finally {
    isLoading.value = false;
  }
}
</script>
