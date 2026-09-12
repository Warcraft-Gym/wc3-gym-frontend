<template>
  <v-overlay v-model="isLoading" persistent class="loading-overlay">
    <v-progress-circular indeterminate size="64" width="8" color="primary"></v-progress-circular>
  </v-overlay>

  <!-- Controls bar (hidden when printing) -->
  <div class="no-print">
    <v-container fluid class="pa-4 pb-2">
      <v-row align="center" class="flex-wrap">
        <v-col v-if="!isReadonly" cols="12" sm="4" md="3">
          <v-select
            v-model="selectedSeasonId"
            :items="seasonItems"
            item-title="name"
            item-value="id"
            label="Select season"
            variant="outlined"
            density="compact"
            hide-details
            @update:modelValue="loadReport"
          />
        </v-col>
        <v-spacer />
        <v-col cols="auto">
          <v-btn
            color="primary"
            prepend-icon="mdi-printer"
            :disabled="!reportReady"
            @click="printReport"
          >
            Print / Save as PDF
          </v-btn>
        </v-col>
      </v-row>

      <v-alert
        v-if="errorMessage"
        type="error"
        variant="tonal"
        border="start"
        border-color="error"
        class="mt-3"
        closable
        @click:close="errorMessage = null"
      >
        {{ errorMessage }}
      </v-alert>
    </v-container>
  </div>

  <!-- Empty state -->
  <div v-if="!reportReady && !isLoading && !errorMessage" class="empty-state">
    <v-icon size="80" class="text-disabled">mdi-chart-box-outline</v-icon>
    <p class="text-medium-emphasis mt-4 text-h6">
      {{ selectedSeasonId ? `${season?.name ?? 'This season'} has no teams yet — the report starts when the draft is done.` : 'Select a season to generate the report' }}
    </p>
  </div>

  <!-- ═══════════════════════════════════════════════════════════════════════════
       REPORT DOCUMENT
  ════════════════════════════════════════════════════════════════════════════ -->
  <div v-if="reportReady" id="season-report">

    <!-- ── Hero Header ── -->
    <div class="report-hero text-on-hero">
      <div class="report-hero-overlay" />
      <v-container class="report-hero-content">
        <div class="text-subtitle-1 mb-1" style="opacity: 0.8;">Season report</div>
        <div class="text-h3 font-weight-bold mb-6">{{ season.name }}</div>
        <div class="hero-stats-row">
          <div v-for="stat in headerStats" :key="stat.label" class="hero-stat-card">
            <v-icon :icon="stat.icon" size="24" class="mb-1" style="opacity:0.9" />
            <div class="hero-stat-value">{{ stat.value }}</div>
            <div class="hero-stat-label">{{ stat.label }}</div>
          </div>
        </div>
      </v-container>
    </div>

    <v-container fluid class="report-body pa-4">

      <!-- ── Team standings ── -->
      <div class="report-section mb-6" :class="{ collapsed: collapsed.has('standings') }">
        <button type="button" class="section-title" :aria-expanded="!collapsed.has('standings')" @click="toggle('standings')">
          <v-icon color="primary" class="mr-2">mdi-trophy</v-icon>
          Team standings
          <v-icon class="ml-2 no-print">{{ collapsed.has('standings') ? 'mdi-chevron-down' : 'mdi-chevron-up' }}</v-icon>
        </button>
        <v-card elevation="2">
          <v-table density="comfortable" class="standings-table">
            <thead>
              <tr class="table-header-row">
                <th class="text-center" style="width:56px">#</th>
                <th>Team</th>
                <th class="text-center">Points</th>
                <th class="text-center d-none d-md-table-cell">Points available</th>
                <th class="text-center d-none d-md-table-cell">Points against</th>
                <th class="text-center d-none d-md-table-cell">Players</th>
                <th class="text-center">Win rate</th>
              </tr>
            </thead>
            <tbody>
              <tr
                v-for="(team, idx) in teamStandings"
                :key="team.id"
                :class="['standings-row', idx === 0 ? 'standings-first' : '']"
              >
                <td class="text-center">
                  <div class="rank-cell">
                    <v-icon
                      v-if="rankMedal(idx + 1)"
                      :color="rankMedal(idx + 1).color"
                      size="22"
                      class="mr-1"
                    >{{ rankMedal(idx + 1).icon }}</v-icon>
                    <span class="text-caption" :class="{ 'text-medium-emphasis': !rankMedal(idx + 1) }">{{ idx + 1 }}</span>
                  </div>
                </td>
                <td>
                  <div class="d-flex align-center">
                    <v-avatar size="24" rounded="sm" class="mr-2" style="flex-shrink:0">
                      <img class="team-icon" :src="teamImageUrl(team)" @error="showDefaultTeamImage">
                    </v-avatar>
                    <span class="font-weight-medium">{{ team.name }}</span>
                  </div>
                </td>
                <td class="text-center">
                  <v-chip color="primary" size="small" class="font-weight-bold">
                    {{ team.finalScore }}
                  </v-chip>
                </td>
                <td class="text-center d-none d-md-table-cell">{{ team.pointsAvailable }}</td>
                <td class="text-center d-none d-md-table-cell">{{ team.pointsAgainst }}</td>
                <td class="text-center d-none d-md-table-cell">{{ team.playerCount }}</td>
                <td class="text-center">
                  <div class="win-rate-cell">
                    <v-progress-linear
                      :model-value="team.winRate"
                      color="win"
                      height="8"
                      rounded
                      class="win-rate-bar"
                    />
                    <span class="text-caption ml-2">{{ team.winRate }}%</span>
                  </div>
                </td>
              </tr>
            </tbody>
          </v-table>
        </v-card>
      </div>

      <!-- ── Player leaderboard ── -->
      <div class="report-section mb-6" :class="{ collapsed: collapsed.has('leaderboard') }">
        <button type="button" class="section-title" :aria-expanded="!collapsed.has('leaderboard')" @click="toggle('leaderboard')">
          <v-icon color="primary" class="mr-2">mdi-account-star</v-icon>
          Player leaderboard
          <v-icon class="ml-2 no-print">{{ collapsed.has('leaderboard') ? 'mdi-chevron-down' : 'mdi-chevron-up' }}</v-icon>
        </button>
        <v-card elevation="2">
          <v-table density="compact" class="standings-table">
            <thead>
              <tr class="table-header-row">
                <th class="text-center" style="width:44px">#</th>
                <th>Player</th>
                <th class="text-center">Race</th>
                <th class="text-center d-none d-md-table-cell">Team</th>
                <th class="text-center">W-L</th>
                <th class="text-center d-none d-md-table-cell">Played</th>
                <th class="text-center d-none d-md-table-cell">Win %</th>
                <th class="text-center">Points</th>
              </tr>
            </thead>
            <tbody>
              <tr
                v-for="(player, idx) in [...allPlayers]
                  .map(p => ({
                    ...p,
                    wins: p.seasonStats?.wins || 0,
                    losses: p.seasonStats?.losses || 0,
                    games: p.seasonStats?.games || 0,
                    winRate: (p.seasonStats?.games || 0) > 0
                      ? Math.round(((p.seasonStats?.wins || 0) / p.seasonStats?.games) * 100)
                      : 0,
                    totalPoints: series
                      .filter(s => s.player1_id === p.id || s.player2_id === p.id)
                      .reduce((sum, s) => sum + (s.player1_id === p.id ? (s.player1_points || 0) : (s.player2_points || 0)), 0),
                  }))
                  .sort((a, b) => b.totalPoints - a.totalPoints || b.winRate - a.winRate || b.wins - a.wins)"
                :key="player.id"
                :class="{ 'player-row': mayOpenPlayer }"
                @click="mayOpenPlayer && router.push(playerPath(player))"
              >
                <td class="text-center text-caption text-medium-emphasis">{{ idx + 1 }}</td>
                <td><PlayerName :player="player" :plain="!mayOpenPlayer" /></td>
                <td class="text-center">
                  <RaceIcon v-if="player.signup_race" :raceIdentifier="player.signup_race" />
                  <span v-else class="text-caption">–</span>
                </td>
                <td class="text-center d-none d-md-table-cell">
                  <v-tooltip v-if="player.team" :text="player.teamName" location="top">
                    <template #activator="{ props }">
                      <v-avatar v-bind="props" size="24" rounded="sm">
                        <img class="team-icon" :src="teamImageUrl(player.team)" @error="showDefaultTeamImage">
                      </v-avatar>
                    </template>
                  </v-tooltip>
                  <span v-else class="text-caption">–</span>
                </td>
                <td class="text-center">{{ player.wins }}-{{ player.losses }}</td>
                <td class="text-center d-none d-md-table-cell">{{ player.games }}</td>
                <td class="text-center d-none d-md-table-cell">
                  <span>
                    {{ player.winRate }}%
                  </span>
                </td>
                <td class="text-center">
                  <v-chip v-if="player.totalPoints > 0" color="primary" size="x-small">
                    {{ player.totalPoints }}
                  </v-chip>
                  <span v-else class="text-caption text-medium-emphasis">–</span>
                </td>
              </tr>
            </tbody>
          </v-table>
        </v-card>
      </div>

      <!-- ── Race performance ── -->
      <div class="report-section mb-6" :class="{ collapsed: collapsed.has('races') }">
        <button type="button" class="section-title" :aria-expanded="!collapsed.has('races')" @click="toggle('races')">
          <v-icon color="primary" class="mr-2">mdi-sword-cross</v-icon>
          Race performance
          <v-icon class="ml-2 no-print">{{ collapsed.has('races') ? 'mdi-chevron-down' : 'mdi-chevron-up' }}</v-icon>
        </button>
        <v-row>
          <v-col
            v-for="raceEntry in raceBreakdown"
            :key="raceEntry.race"
            cols="12" sm="6" md="4"
          >
            <v-card class="race-card" elevation="2">
              <div class="race-stripe" :style="{ background: getRaceColor(raceEntry.race) }" />
              <div class="race-card-header">
                <div class="d-flex align-center">
                  <RaceIcon :raceIdentifier="raceEntry.race" class="mr-2" />
                  <span class="font-weight-bold text-subtitle-1">
                    {{ getRaceName(raceEntry.race) }}
                  </span>
                </div>
                <span class="text-caption text-medium-emphasis">{{ raceEntry.players }} players</span>
              </div>
              <v-card-text>
                <div class="race-stat-row">
                  <span class="text-caption text-medium-emphasis">Series won</span>
                  <div class="race-stat-bar-wrap">
                    <v-progress-linear
                      :model-value="raceEntry.winRate"
                      color="win"
                      height="10"
                      rounded
                      bg-color="surface-light"
                    />
                  </div>
                  <span class="race-stat-value font-weight-bold">{{ raceEntry.wins }}</span>
                </div>
                <div class="race-stat-row mt-2">
                  <span class="text-caption text-medium-emphasis">Series lost</span>
                  <div class="race-stat-bar-wrap">
                    <v-progress-linear
                      :model-value="raceEntry.games > 0 ? Math.round((raceEntry.losses / raceEntry.games) * 100) : 0"
                      color="loss"
                      height="10"
                      rounded
                      bg-color="surface-light"
                    />
                  </div>
                  <span class="race-stat-value">{{ raceEntry.losses }}</span>
                </div>
                <div class="race-stat-row mt-2">
                  <span class="text-caption text-medium-emphasis">Points vs top race</span>
                  <div class="race-stat-bar-wrap">
                    <v-progress-linear
                      :model-value="raceEntry.pointsBarPct"
                      color="draw"
                      height="10"
                      rounded
                      bg-color="surface-light"
                    />
                  </div>
                  <span class="race-stat-value font-weight-bold">{{ raceEntry.points }}</span>
                </div>
                <v-divider class="my-3" />
                <div class="d-flex justify-space-between">
                  <div class="text-center">
                    <div class="text-h6 font-weight-bold">{{ raceEntry.games }}</div>
                    <div class="text-caption text-medium-emphasis">Played</div>
                  </div>
                  <div class="text-center">
                    <div class="text-h6 font-weight-bold">{{ raceEntry.winRate }}%</div>
                    <div class="text-caption text-medium-emphasis">Win rate</div>
                  </div>
                  <div class="text-center">
                    <div class="text-h6 font-weight-bold">{{ raceEntry.points }}</div>
                    <div class="text-caption text-medium-emphasis">Points</div>
                  </div>
                </div>
              </v-card-text>
            </v-card>
          </v-col>
        </v-row>
      </div>

      <!-- ── Ladder activity ── -->
      <div v-if="heatRows.length" class="report-section mb-6" :class="{ collapsed: collapsed.has('ladder') }">
        <button type="button" class="section-title" :aria-expanded="!collapsed.has('ladder')" @click="toggle('ladder')">
          <v-icon color="primary" class="mr-2">mdi-podium</v-icon>
          Ladder activity
          <v-icon class="ml-2 no-print">{{ collapsed.has('ladder') ? 'mdi-chevron-down' : 'mdi-chevron-up' }}</v-icon>
        </button>
        <v-row>
          <v-col cols="12" md="6">
            <v-card elevation="2" class="fill-height">
              <v-card-title class="text-body-2 d-flex align-center">
                <span>Games by hour</span>
                <v-spacer />
                <span class="text-caption text-medium-emphasis">UTC</span>
              </v-card-title>
              <v-card-text>
                <div class="heat-grid">
                  <span></span>
                  <span v-for="day in dayLabels" :key="day" class="heat-day">{{ day }}</span>
                  <template v-for="row in heatRows" :key="row.hour">
                    <span class="heat-hour">{{ row.label }}</span>
                    <div
                      v-for="cell in row.cells"
                      :key="cell.key"
                      class="heat-cell"
                      :style="{ background: cell.color }"
                      :title="cell.title"
                    ></div>
                  </template>
                </div>
                <div class="heat-legend">
                  <template v-for="step in heatLegend" :key="step.label">
                    <span class="heat-swatch" :style="{ background: step.color }"></span>
                    <span>{{ step.label }}</span>
                  </template>
                </div>
              </v-card-text>
            </v-card>
          </v-col>
          <v-col cols="12" md="6">
            <v-card elevation="2" class="fill-height d-flex flex-column">
              <v-card-title class="text-body-2 d-flex align-center">
                <span>Games per day</span>
                <v-spacer />
                <span class="text-caption text-medium-emphasis">{{ ladder.total_games }} games</span>
              </v-card-title>
              <v-card-text class="flex-grow-1 d-flex flex-column">
                <div class="day-chart">
                  <div class="day-max-line"></div>
                  <span class="day-max-label">{{ dayMax }}</span>
                  <div class="day-bars">
                    <div
                      v-for="bar in dayBars"
                      :key="bar.d"
                      class="day-bar"
                      :style="{ height: bar.height }"
                      :title="bar.title"
                    ></div>
                  </div>
                </div>
                <div class="day-ticks">
                  <span v-for="tick in dayTicks" :key="tick.d" :class="{ end: tick.end }">{{ tick.label }}</span>
                </div>
              </v-card-text>
            </v-card>
          </v-col>
        </v-row>
      </div>

      <!-- ── Fantasy Leaderboard ── -->
      <div v-if="sortedFantasyTeams.length > 0" class="report-section mb-6" :class="{ collapsed: collapsed.has('fantasy') }">
        <button type="button" class="section-title" :aria-expanded="!collapsed.has('fantasy')" @click="toggle('fantasy')">
          <v-icon color="primary" class="mr-2">mdi-cards</v-icon>
          Fantasy league leaderboard
          <v-icon class="ml-2 no-print">{{ collapsed.has('fantasy') ? 'mdi-chevron-down' : 'mdi-chevron-up' }}</v-icon>
        </button>
        <v-card elevation="2">
          <v-table density="comfortable" class="standings-table">
            <thead>
              <tr class="table-header-row">
                <th class="text-center" style="width:56px">#</th>
                <th>Fantasy team</th>
                <th class="text-center">Captain</th>
                <th class="text-center d-none d-md-table-cell">Drafted team</th>
                <th class="text-center d-none d-md-table-cell">Drafted race</th>
                <th class="text-center d-none d-md-table-cell">Player pts</th>
                <th class="text-center d-none d-md-table-cell">Team pts</th>
                <th class="text-center d-none d-md-table-cell">Race pts</th>
                <th class="text-center d-none d-md-table-cell">Bet pts</th>
                <th class="text-center">Total</th>
              </tr>
            </thead>
            <tbody>
              <tr
                v-for="(ft, idx) in sortedFantasyTeams"
                :key="ft.id"
                :class="idx === 0 ? 'standings-first' : ''"
              >
                <td class="text-center">
                  <div class="rank-cell">
                    <v-icon
                      v-if="rankMedal(idx + 1)"
                      :color="rankMedal(idx + 1).color"
                      size="22"
                      class="mr-1"
                    >{{ rankMedal(idx + 1).icon }}</v-icon>
                    <span class="text-caption" :class="{ 'text-medium-emphasis': !rankMedal(idx + 1) }">{{ idx + 1 }}</span>
                  </div>
                </td>
                <td class="font-weight-medium">{{ ft.name }}</td>
                <td class="text-center text-caption">{{ ft.captain?.name || '–' }}</td>
                <td class="text-center text-caption d-none d-md-table-cell">{{ ft.drafted_team?.name || '–' }}</td>
                <td class="text-center d-none d-md-table-cell">
                  <RaceIcon v-if="ft.drafted_race" :raceIdentifier="ft.drafted_race" />
                  <span v-else class="text-caption">–</span>
                </td>
                <td class="text-center d-none d-md-table-cell">{{ ft.player_points ?? '–' }}</td>
                <td class="text-center d-none d-md-table-cell">{{ ft.team_points ?? '–' }}</td>
                <td class="text-center d-none d-md-table-cell">{{ ft.race_points ?? '–' }}</td>
                <td class="text-center d-none d-md-table-cell">{{ ft.bet_points ?? '–' }}</td>
                <td class="text-center">
                  <v-chip color="primary" size="small" class="font-weight-bold">
                    {{ ft.total_points ?? 0 }}
                  </v-chip>
                </td>
              </tr>
            </tbody>
          </v-table>
        </v-card>
      </div>

      <!-- ── Report Footer ── -->
      <div class="report-footer no-print">
        <v-divider class="mb-4" />
        <div class="d-flex justify-center">
          <v-btn color="primary" prepend-icon="mdi-printer" size="large" @click="printReport">
            Print / Save as PDF
          </v-btn>
        </div>
      </div>

      <div class="report-footer print-only">
        <v-divider class="mb-2" />
        <div class="text-caption text-center text-medium-emphasis">
          GNL Admin &mdash; {{ season.name }} season report
        </div>
      </div>

    </v-container>
  </div>
</template>

<script setup>
import { ref, computed, nextTick, onMounted, watch } from 'vue';
import { storeToRefs } from 'pinia';
import { useRoute, useRouter } from 'vue-router';
import { useSeasonStore } from '@/stores/season.store';
import { useTeamStore } from '@/stores/team.store';
import { useSeriesStore } from '@/stores/series.store';
import { useFantasyStore } from '@/stores/fantasy.store';
import { useLadderStore } from '@/stores/ladder.store';
import { teamImageUrl, showDefaultTeamImage } from '@/helpers/team-image';
import { raceWrapper } from '@/helpers/races';
import { resolveCurrentSeasonId } from '@/helpers/current-season';
import { playerPath } from '@/helpers/players';
import { canSeeRole } from '@/helpers';
import { useAuthStore } from '@/stores';
import { themeMode } from '@/helpers/theme';
import { gamesBarHeight } from '@/helpers/ladder-days.mjs';
import { scaleQuantize } from 'd3-scale';


const route = useRoute();
const router = useRouter();

const seasonStore = useSeasonStore();
const teamStore = useTeamStore();
const seriesStore = useSeriesStore();
const fantasyStore = useFantasyStore();
const ladderStore = useLadderStore();

const { me } = storeToRefs(useAuthStore());
const { seasons, current_season, selectedSeasonId } = storeToRefs(seasonStore);
const { teams } = storeToRefs(teamStore);
const { series } = storeToRefs(seriesStore);

const ladder = ref(null);
const isLoading = ref(false);
const errorMessage = ref(null);

// The current season heads the dropdown and is what a cold open loads
const currentSeasonId = ref(null);
const seasonItems = computed(() => seasons.value.slice().sort((a, b) =>
    (b.id === currentSeasonId.value) - (a.id === currentSeasonId.value) || b.id - a.id
));

// /report is public; only a reader who may open /player/:id gets a clickable row or a name link
const mayOpenPlayer = computed(() => !!me.value && canSeeRole(me.value.role, 'member'));

// Every section starts open, so the report still prints and embeds whole
const collapsed = ref(new Set());
const toggle = (key) => {
    collapsed.value.has(key) ? collapsed.value.delete(key) : collapsed.value.add(key);
    collapsed.value = new Set(collapsed.value);
};

// ─── Read-only mode: ?readonly=1 hides the season selector ───────────────────
const isReadonly = computed(() => route.query.readonly === '1' || route.query.readonly === 'true');

// ─── Raw data from stores ─────────────────────────────────────────────────────
const season = computed(() => current_season.value);
const fantasyTeams = computed(() =>
    (fantasyStore.teams || []).filter(t => t.season_id === selectedSeasonId.value)
);
const reportReady = computed(() => !!season.value && teams.value.length > 0);

// ─── All players in this season (deduplicated) ────────────────────────────────
const allPlayers = computed(() => {
    if (!season.value || !teams.value.length) return [];
    const seen = new Set();
    const result = [];
    const seasonIdKey = String(season.value.id);
    for (const team of teams.value) {
        const playersInSeason = team.player_by_season?.[seasonIdKey] || [];
        for (const player of playersInSeason) {
            if (!seen.has(player.id)) {
                seen.add(player.id);
                const seasonStats = player.gnl_stats?.find(s => s.season_id === season.value.id) || null;
                result.push({ ...player, seasonStats, teamName: team.name, team });
            }
        }
    }
    return result;
});

// ─── Team standings (sorted by final_score desc) ──────────────────────────────
const teamStandings = computed(() => {
    return teams.value
        .map(team => {
            const info = team.seasons_info?.find(s => s.season_id === season.value?.id)
                || team.seasons_info?.[0]
                || {};
            const seasonIdKey = String(season.value?.id);
            const players = team.player_by_season?.[seasonIdKey] || [];
            const totalWins = players.reduce((sum, p) => {
                const stats = p.gnl_stats?.find(s => s.season_id === season.value?.id);
                return sum + (stats?.wins || 0);
            }, 0);
            const totalGames = players.reduce((sum, p) => {
                const stats = p.gnl_stats?.find(s => s.season_id === season.value?.id);
                return sum + (stats?.games || 0);
            }, 0);
            return {
                id: team.id,
                icon_url: team.icon_url,
                name: team.long_name || team.name,
                finalScore: info.final_score || 0,
                pointsAvailable: info.points_available || 0,
                pointsAgainst: info.points_against || 0,
                playerCount: players.length,
                totalWins,
                winRate: totalGames > 0 ? Math.round((totalWins / totalGames) * 100) : 0,
            };
        })
        .sort((a, b) => b.finalScore - a.finalScore);
});

// ─── Race breakdown ───────────────────────────────────────────────────────────
const raceBreakdown = computed(() => {
    const raceMap = {};

    for (const player of allPlayers.value) {
        if (!player.signup_race) continue; // unsigned players have no race to tally, same as the points loop below
        const race = player.signup_race;
        if (!raceMap[race]) raceMap[race] = { wins: 0, losses: 0, games: 0, players: 0, points: 0 };
        raceMap[race].players++;
        if (player.seasonStats) {
            raceMap[race].wins += player.seasonStats.wins || 0;
            raceMap[race].losses += player.seasonStats.losses || 0;
            raceMap[race].games += player.seasonStats.games || 0;
        }
    }

    // Points go to the race the side played, which is his signup race unless
    // he reported another one for that series
    for (const s of series.value) {
        if (s.player1_race && s.player1_points != null) {
            const r = s.player1_race;
            if (!raceMap[r]) raceMap[r] = { wins: 0, losses: 0, games: 0, players: 0, points: 0 };
            raceMap[r].points += s.player1_points;
        }
        if (s.player2_race && s.player2_points != null) {
            const r = s.player2_race;
            if (!raceMap[r]) raceMap[r] = { wins: 0, losses: 0, games: 0, players: 0, points: 0 };
            raceMap[r].points += s.player2_points;
        }
    }

    const maxPoints = Math.max(...Object.values(raceMap).map(r => r.points), 1);

    return Object.entries(raceMap)
        .map(([race, stats]) => ({
            race,
            ...stats,
            winRate: stats.games > 0 ? Math.round((stats.wins / stats.games) * 100) : 0,
            pointsBarPct: Math.round((stats.points / maxPoints) * 100),
        }))
        .sort((a, b) => b.points - a.points);
});

// ─── Fantasy leaderboard (sorted by total_points) ────────────────────────────
const sortedFantasyTeams = computed(() =>
    [...fantasyTeams.value].sort((a, b) => (b.total_points || 0) - (a.total_points || 0))
);

// ─── Header summary stats ─────────────────────────────────────────────────────
const headerStats = computed(() => [
    { label: 'Rounds', value: season.value?.round_count ?? '–', icon: 'mdi-calendar-week' },
    { label: 'Teams', value: teams.value.length, icon: 'mdi-shield-outline' },
    { label: 'Players', value: allPlayers.value.length, icon: 'mdi-account-group' },
    { label: 'Series played', value: series.value.length, icon: 'mdi-sword-cross' },
]);

// ─── Race display helpers ─────────────────────────────────────────────────────
// Random is not a race, so it and any unknown race take the neutral draw colour
const raceTokens = { HU: 'race-hu', OC: 'race-oc', UD: 'race-ud', NE: 'race-ne' };
const getRaceColor = race => `rgb(var(--v-theme-${raceTokens[race] || 'draw'}))`;
const getRaceName = race => raceWrapper.getRaceObject(race)?.name || race;

// ─── Rank medal ───────────────────────────────────────────────────────────────
const rankMedal = rank => {
    if (rank === 1) return { icon: 'mdi-medal', color: 'medal-gold' };
    if (rank === 2) return { icon: 'mdi-medal', color: 'medal-silver' };
    if (rank === 3) return { icon: 'mdi-medal', color: 'primary' };
    return null;
};

// ─── Lifecycle ────────────────────────────────────────────────────────────────
onMounted(async () => {
    isLoading.value = true;
    try {
        await seasonStore.fetchSeasons();
        currentSeasonId.value = await resolveCurrentSeasonId();
        // The path names the season; without one, the season picked on another page, then the first season
        const paramId = route.params.id ? seasonStore.seasonIdOf(route.params.id) : null;
        if (paramId) {
            selectedSeasonId.value = paramId;
        } else if (seasons.value.length > 0) {
            const picked = seasons.value.find((season) => season.id === selectedSeasonId.value);
            selectedSeasonId.value = picked ? picked.id : (currentSeasonId.value ?? seasonItems.value[0].id);
            // Reflect the resolved id in the URL without adding a history entry
            router.replace({ path: `/report/${seasonStore.slugOf(selectedSeasonId.value)}`, query: route.query });
        }
        if (selectedSeasonId.value) await loadReport();
    } catch (e) {
        errorMessage.value = 'Failed to load seasons.';
    } finally {
        isLoading.value = false;
    }
});

// A season typed into the path while the page is open
watch(() => route.params.id, (id) => {
    const seasonId = id ? seasonStore.seasonIdOf(id) : null;
    if (seasonId && seasonId !== selectedSeasonId.value) {
        selectedSeasonId.value = seasonId;
        loadReport();
    }
});

const loadReport = async () => {
    if (!selectedSeasonId.value) return;
    // Keep the season id in the URL
    router.replace({ path: `/report/${seasonStore.slugOf(selectedSeasonId.value)}`, query: route.query });
    isLoading.value = true;
    errorMessage.value = null;
    try {
        await Promise.all([
            seasonStore.fetchSeason(selectedSeasonId.value),
            teamStore.fetchTeamsBySeason(selectedSeasonId.value),
            seriesStore.searchSeriesBySeason(selectedSeasonId.value, null),
            fantasyStore.fetchTeams(),
        ]);
        // A season with no synced ladder answers an error, and the card stays hidden
        try {
            ladder.value = await ladderStore.seasonLadder(selectedSeasonId.value);
        } catch {
            ladder.value = null;
        }
    } catch (e) {
        errorMessage.value = 'Failed to load report data.';
    } finally {
        isLoading.value = false;
    }
};

// The report is a light document: print it light and give the admin his theme back. The
// light is never stored, so a browser that skips afterprint leaves his saved theme alone.
const printReport = async () => {
    const previous = themeMode.value;
    themeMode.value = 'light';
    window.addEventListener('afterprint', () => { themeMode.value = previous; }, { once: true });
    await nextTick();
    window.print();
};

/* ── Ladder activity ──────────────────────────────────────────────────────── */

// Row 0 of by_hour is Sunday, the heatmap reads Monday first
const dayLabels = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
const dayRows = [1, 2, 3, 4, 5, 6, 0];

const pad2 = (n) => String(n).padStart(2, '0');
const monthDay = (iso) =>
    new Date(`${iso}T00:00:00Z`).toLocaleDateString('en-US', { month: 'short', day: 'numeric', timeZone: 'UTC' });

const hourMax = computed(() => Math.max(1, ...(ladder.value?.by_hour ?? []).flat()));

// Five equal buckets of 1..5 x step games, one bronze step each; an hour with no games stays surface-light
const heatStep = computed(() => Math.ceil(hourMax.value / 5));
const heatScale = computed(() => scaleQuantize().domain([0.5, 5 * heatStep.value + 0.5]).range([1, 2, 3, 4, 5]));
const heatColor = (games) => `rgb(var(--v-theme-${games ? `heat-${heatScale.value(games)}` : 'surface-light'}))`;

const heatRows = computed(() => {
    const grid = ladder.value?.by_hour;
    if (!grid?.length || !ladder.value?.total_games) return [];
    return Array.from({ length: 24 }, (_, hour) => ({
        hour,
        label: hour % 3 === 0 ? `${pad2(hour)}:00` : '',
        cells: dayRows.map((row, col) => {
            const games = grid[row]?.[hour] ?? 0;
            return {
                key: `${row}-${hour}`,
                color: heatColor(games),
                title: `${dayLabels[col]} ${pad2(hour)}:00 \u00b7 ${games} games`,
            };
        }),
    }));
});

const heatLegend = computed(() => {
    const step = heatStep.value;
    return [{ color: heatColor(0), label: '0' }, ...Array.from({ length: 5 }, (_, i) => ({
        color: `rgb(var(--v-theme-heat-${i + 1}))`,
        label: i === 4 ? `${step * 4 + 1}+` : `${i * step + 1}-${(i + 1) * step}`,
    }))];
});

// One entry per season day, as the answer serves it, and they add up to total_games
const ladderDays = computed(() => ladder.value?.per_day ?? []);

const dayMax = computed(() => Math.max(1, ...ladderDays.value.map(day => day.g)));

const dayBars = computed(() => ladderDays.value.map(day => ({
    d: day.d,
    height: gamesBarHeight(day.g, dayMax.value),
    title: `${monthDay(day.d)} \u00b7 ${day.g} games`,
})));

// One tick slot per day in the same flex row as the bars, labelled every 7th, so a
// label always sits under the day it names
const dayTicks = computed(() => {
    const lastLabel = Math.floor((ladderDays.value.length - 1) / 7) * 7;
    return ladderDays.value.map((day, i) => ({ d: day.d, label: i % 7 ? '' : monthDay(day.d), end: i === lastLabel }));
});
</script>

<style scoped>

.team-icon {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

/* ── Loading overlay ──────────────────────────────────────────────────────── */
.loading-overlay {
  display: flex;
  align-items: center;
  justify-content: center;
}

/* ── Empty state ──────────────────────────────────────────────────────────── */
.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  min-height: 60vh;
}

/* ── Hero header ──────────────────────────────────────────────────────────── */
.report-hero {
  position: relative;
  background: rgb(var(--v-theme-hero));
  padding: 3rem 0 2.5rem;
  overflow: hidden;
}
.report-hero-overlay {
  position: absolute;
  inset: 0;
  background: radial-gradient(ellipse at top right, rgba(var(--v-theme-on-hero), 0.08) 0%, transparent 60%);
  pointer-events: none;
}
.report-hero-content {
  position: relative;
  z-index: 1;
  padding-left: 1.5rem;
  padding-right: 1.5rem;
}
.hero-stats-row {
  display: flex;
  gap: 1rem;
  flex-wrap: wrap;
}
.hero-stat-card {
  background: rgba(var(--v-theme-on-hero), 0.12);
  border: 1px solid rgba(var(--v-theme-on-hero), 0.18);
  border-radius: 12px;
  padding: 1rem 1.5rem;
  text-align: center;
  backdrop-filter: blur(4px);
  min-width: 110px;
}
.hero-stat-value {
  font-size: 2rem;
  font-weight: 700;
  color: rgb(var(--v-theme-on-hero));
  line-height: 1;
  margin-bottom: 0.25rem;
}
.hero-stat-label {
  font-size: 0.75rem;
  color: rgb(var(--v-theme-band-muted));
}

/* ── Report body ──────────────────────────────────────────────────────────── */
.report-body {
  max-width: 1400px;
  margin: 0 auto;
  padding-top: 1.5rem !important;
}
.section-title {
  width: 100%;
  background: none;
  border: 0;
  color: inherit;
  font-family: inherit;
  font-size: 1.15rem;
  font-weight: 700;
  margin-bottom: 0.75rem;
  display: flex;
  align-items: center;
  cursor: pointer;
}

/* A collapsed section hides its body on screen only, so a print holds the whole report */
@media screen {
  .report-section.collapsed > :not(.section-title) {
    display: none;
  }
}

.player-row {
  cursor: pointer;
}
.player-row:hover {
  background-color: rgba(var(--v-theme-primary), 0.05);
}

/* ── Standings table ──────────────────────────────────────────────────────── */
.standings-table thead tr th {
  font-size: 0.75rem;
  color: rgba(var(--v-theme-on-surface), var(--v-medium-emphasis-opacity)) !important;
}
.standings-first {
  background: rgba(var(--v-theme-primary), 0.06);
}
.standings-row:hover {
  background: rgba(var(--v-theme-primary), 0.04);
}
.rank-cell {
  display: flex;
  align-items: center;
  justify-content: center;
}
.win-rate-cell {
  display: flex;
  align-items: center;
  min-width: 100px;
}
.win-rate-bar {
  flex: 1;
}

/* A phone has no width to spare for a fixed win-rate column or an unbroken name */
@media (max-width: 959px) {
  .win-rate-cell {
    min-width: 0;
  }
  .standings-table :deep(.player-name) {
    white-space: normal;
  }
  /* A name with no space in it breaks mid-word rather than push the table off the screen */
  .standings-table td {
    overflow-wrap: anywhere;
  }
}

/* ── Ladder activity ─────────────────────────────────────────────────────── */
.heat-grid {
  display: grid;
  grid-template-columns: 46px repeat(7, minmax(0, 1fr));
  gap: 2px;
  font-size: 0.6875rem;
  color: rgba(var(--v-theme-on-surface), var(--v-medium-emphasis-opacity));
}
.heat-day {
  text-align: center;
}
.heat-hour {
  text-align: right;
  padding-right: 6px;
  line-height: 12px;
  font-variant-numeric: tabular-nums;
}
.heat-cell {
  height: 12px;
  border-radius: 2px;
}
.heat-legend {
  display: flex;
  align-items: center;
  gap: 6px;
  margin-top: 10px;
  font-size: 0.6875rem;
  color: rgba(var(--v-theme-on-surface), var(--v-medium-emphasis-opacity));
}
.heat-swatch {
  display: inline-block;
  width: 14px;
  height: 10px;
  border-radius: 2px;
  /* the 0-games step is the page's own surface, so every swatch carries a hairline */
  box-shadow: inset 0 0 0 1px rgba(var(--v-theme-on-surface), 0.12);
}
.day-chart {
  position: relative;
  flex-grow: 1;
  min-height: 232px;
}
.day-max-line {
  position: absolute;
  inset: 0 0 auto 0;
  border-top: 1px dotted rgba(var(--v-theme-on-surface), 0.38);
}
.day-max-label {
  position: absolute;
  right: 0;
  top: 2px;
  font-size: 0.6875rem;
  color: rgba(var(--v-theme-on-surface), var(--v-medium-emphasis-opacity));
  background: rgb(var(--v-theme-surface));
  padding-left: 4px;
}
.day-bars {
  position: absolute;
  inset: 0;
  display: flex;
  align-items: flex-end;
  gap: 2px;
}
.day-bar {
  flex: 1;
  min-width: 4px;
  background: rgb(var(--v-theme-primary));
  border-radius: 1px 1px 0 0;
}
.day-ticks {
  display: flex;
  gap: 2px;
  margin-top: 6px;
  font-size: 0.6875rem;
  color: rgba(var(--v-theme-on-surface), var(--v-medium-emphasis-opacity));
}
/* A tick slot matches its bar: same flex row, same gap, same minimum. The label
   is wider than its slot and overflows it, so it starts at its own bar */
.day-ticks span {
  flex: 1;
  min-width: 4px;
  white-space: nowrap;
}
/* the last label would overflow the card, so it ends at its own slot */
.day-ticks span.end {
  text-align: right;
}

/* ── Race cards ───────────────────────────────────────────────────────────── */
.race-stripe {
  height: 4px;
  -webkit-print-color-adjust: exact;
  print-color-adjust: exact;
}
.race-card-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0.75rem 1rem;
}
.race-stat-row {
  display: flex;
  align-items: center;
  gap: 0.75rem;
}
.race-stat-row .text-caption {
  min-width: 80px;
}
.race-stat-bar-wrap {
  flex: 1;
}
.race-stat-value {
  min-width: 36px;
  text-align: right;
  font-size: 0.85rem;
}

/* ── Print styles ─────────────────────────────────────────────────────────── */
.print-only {
  display: none;
}

@media print {
  .no-print {
    display: none !important;
  }
  .print-only {
    display: block !important;
  }

  /* Hero header – keep background colors */
  .report-hero {
    -webkit-print-color-adjust: exact;
    print-color-adjust: exact;
    padding: 2rem 0 1.75rem;
    break-inside: avoid;
    border-radius: 0 0 8px 8px;
  }

  /* Card shadows become borders for print */
  .v-card {
    box-shadow: none !important;
    border: 1px solid rgba(var(--v-border-color), var(--v-border-opacity)) !important;
  }

  /* Avoid breaking sections across pages */
  .report-section {
    break-inside: avoid;
  }
  .race-card {
    break-inside: avoid;
  }

  /* Compact spacing */
  .report-body {
    padding: 1rem 0 !important;
    max-width: 100% !important;
  }
  .mb-6 {
    margin-bottom: 1.25rem !important;
  }

  /* Ensure progress bars print with color */
  .v-progress-linear__determinate {
    -webkit-print-color-adjust: exact;
    print-color-adjust: exact;
  }
}
</style>

<style>
@media print {
  /* Remove browser-generated headers/footers (URL, date, page numbers).
     Setting margin to 0 leaves no space for the browser to render them.
     The report body provides its own inner padding. */
  @page {
    size: A4;
    margin: 0;
  }

  html,
  body {
    margin: 0 !important;
    padding: 0 !important;
    -webkit-print-color-adjust: exact;
    print-color-adjust: exact;
  }

  /* Hide all Vuetify shell chrome */
  .v-app-bar,
  header.v-toolbar,
  .v-navigation-drawer,
  .v-overlay-container {
    display: none !important;
  }

  /* Remove v-main top padding (reserved for the app-bar) */
  .v-main {
    padding: 0 !important;
    margin: 0 !important;
  }

  /* Remove v-container side padding that causes the side gaps */
  .v-container {
    padding-left: 0 !important;
    padding-right: 0 !important;
  }

  /* Restore inner padding for the hero content so it isn't flush left */
  #season-report .report-hero-content {
    padding-left: 1.5rem !important;
    padding-right: 1.5rem !important;
  }

  /* Give the report content its own breathing room instead.
     Hero spans the full inner width; body sections get side padding via .report-body */
  #season-report {
    padding: 0;
  }

  /* Hero: full bleed side-to-side, small top gap from page edge */
  #season-report .report-hero {
    margin-top: 12mm;
    margin-left: 12mm;
    margin-right: 12mm;
    border-radius: 8px;
  }

  /* Body: inset from page edges */
  #season-report .report-body {
    padding-left: 12mm !important;
    padding-right: 12mm !important;
    padding-bottom: 12mm !important;
  }
}
</style>