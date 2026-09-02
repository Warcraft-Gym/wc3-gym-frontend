<template>
  <v-expansion-panels multiple>
    <!-- Team Points Breakdown -->
    <v-expansion-panel v-if="breakdown.team_breakdown.team_name">
      <v-expansion-panel-title>
        <img class="tab-icon mr-2" :src="teamImageUrl(breakdown.team_breakdown.team_id)" @error="showDefaultTeamImage" alt="" />
        <strong>Team Points Details</strong>
        <span class="ml-2 text-medium-emphasis">{{ breakdown.team_breakdown.team_name }}</span>
        <v-spacer></v-spacer>
        <v-chip color="red" size="small">{{ breakdown.totals.team_points }} points</v-chip>
      </v-expansion-panel-title>
      <v-expansion-panel-text>
        <v-table density="compact" class="narrow">
          <thead>
            <tr>
              <th>Team</th>
              <th>Final Score</th>
              <th>Points Against</th>
              <th>Points Available</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td class="font-weight-bold">
                <span class="d-inline-flex align-center ga-2">
                  <img class="row-icon" :src="teamImageUrl(breakdown.team_breakdown.team_id)" @error="showDefaultTeamImage" alt="" />
                  {{ breakdown.team_breakdown.team_name }}
                </span>
              </td>
              <td>{{ breakdown.team_breakdown.final_score }}</td>
              <td>{{ breakdown.team_breakdown.points_against }}</td>
              <td>{{ breakdown.team_breakdown.points_available }}</td>
            </tr>
          </tbody>
        </v-table>
      </v-expansion-panel-text>
    </v-expansion-panel>

    <!-- Race Points Breakdown -->
    <v-expansion-panel>
      <v-expansion-panel-title>
        <span class="mr-2 d-inline-flex"><RaceIcon :raceIdentifier="breakdown.race_breakdown.race" size="24" /></span>
        <strong>Race Points Details</strong>
        <span class="ml-2 text-medium-emphasis">{{ raceName }} · {{ breakdown.race_breakdown.season_stats.wins }}W - {{ breakdown.race_breakdown.season_stats.losses }}L</span>
        <v-chip class="ml-2" size="x-small" variant="tonal" color="purple">#{{ raceRank }} of {{ raceRanking.length }}</v-chip>
        <v-spacer></v-spacer>
        <v-chip color="purple" size="small">{{ breakdown.totals.race_points }} points</v-chip>
      </v-expansion-panel-title>
      <v-expansion-panel-text>
        <v-table density="compact" class="narrow">
          <thead>
            <tr>
              <th style="width: 80px">Week</th>
              <th class="text-right">Wins</th>
              <th class="text-right">Losses</th>
              <th class="text-right">Ratio</th>
              <th class="text-right">Rank</th>
              <th class="text-right">Points</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="week in breakdown.race_breakdown.weekly_breakdown" :key="week.week">
              <td>{{ week.week }}</td>
              <td class="text-right">{{ week.wins }}</td>
              <td class="text-right">{{ week.losses }}</td>
              <td class="text-right">{{ week.ratio.toFixed(2) }}</td>
              <td class="text-right">
                <v-chip v-if="week.rank" :color="week.rank === 1 ? 'success' : week.rank === 2 ? 'info' : 'warning'" size="x-small">
                  #{{ week.rank }}
                </v-chip>
                <span v-else class="text-grey">-</span>
              </td>
              <td class="text-right">
                <strong v-if="week.points_awarded > 0">+{{ week.points_awarded }}</strong>
                <span v-else class="text-grey">0</span>
              </td>
            </tr>
          </tbody>
        </v-table>
      </v-expansion-panel-text>
    </v-expansion-panel>

    <!-- Player Points Breakdown: the drafted roster; a row opens the player's weeks -->
    <v-expansion-panel>
      <v-expansion-panel-title>
        <v-icon class="mr-2" color="blue">mdi-account-multiple</v-icon>
        <strong>Player Points Details</strong>
        <v-spacer></v-spacer>
        <v-chip color="blue" size="small">{{ breakdown.totals.player_points }} points</v-chip>
        <v-chip color="orange-darken-2" size="small" class="ml-1">{{ breakdown.totals.bench_points }} bench points</v-chip>
      </v-expansion-panel-title>
      <v-expansion-panel-text>
        <GroupedTable :columns="playerColumns" :groups="roster" empty="No drafted players">
          <template #head.mmr><W3CMmr /></template>
          <template #group="{ group: row }">
            <td class="font-weight-bold"><PlayerName :player="row.player" :race="row.player.signup_race" @click.stop="openPlayer(row.player_name, row.player_id)" /></td>
            <td class="text-right">{{ row.mmr || 'N/A' }}</td>
            <td class="text-right">{{ row.record }}</td>
            <td class="text-right">{{ row.total }}</td>
            <td class="text-right text-orange-darken-2">{{ row.bench ? `+${row.bench}` : 0 }}</td>
            <td class="text-right"><strong>{{ row.total + row.bench }}</strong></td>
          </template>
          <template #rows="{ group: row }">
            <template v-for="week in row.weeks" :key="week.week">
              <tr v-for="(series, idx) in week.series" :key="`${week.week}-${idx}`" class="detail-row" :class="{ 'same-week': idx }">
                <td></td>
                <td>
                  <div class="d-flex align-center ga-1 flex-wrap">
                    <span class="week-label text-medium-emphasis">{{ idx ? '' : `Week ${week.week}` }}</span>
                    <span class="text-medium-emphasis">vs</span>
                    <PlayerName :player="resolve(series.opponent)" :race="resolve(series.opponent).signup_race" @click="openPlayer(series.opponent)" />
                  </div>
                </td>
                <td class="text-right">{{ opponentMmr(series) || 'N/A' }}</td>
                <td class="text-right">{{ series.score }}</td>
                <td class="text-right">{{ series.points }}</td>
                <td></td>
                <td></td>
              </tr>
              <tr v-if="week.series.length === 0" class="detail-row">
                <td></td>
                <td>
                  <span class="week-label text-medium-emphasis">Week {{ week.week }}</span>
                  <span v-if="week.bench_points > 0" class="text-orange-darken-2">
                    <v-icon size="small">mdi-seat</v-icon> Benched
                  </span>
                  <span v-else class="text-grey">No games</span>
                </td>
                <td></td>
                <td></td>
                <td></td>
                <td class="text-right">
                  <span v-if="week.bench_points > 0" class="text-orange-darken-2">+{{ week.bench_points }}</span>
                  <span v-else class="text-grey">0</span>
                </td>
                <td></td>
              </tr>
            </template>
          </template>
        </GroupedTable>
      </v-expansion-panel-text>
    </v-expansion-panel>

    <!-- Bet Points Breakdown -->
    <v-expansion-panel v-if="breakdown.bet_breakdown.length > 0">
      <v-expansion-panel-title>
        <BetIcon size="24" class="mr-2 text-green" />
        <strong>Bet Points Details</strong>
        <v-spacer></v-spacer>
        <v-chip :color="breakdown.totals.bet_points >= 0 ? 'green' : 'red'" size="small">{{ breakdown.totals.bet_points }} points</v-chip>
      </v-expansion-panel-title>
      <v-expansion-panel-text>
        <GroupedTable :columns="betColumns" :groups="betWeeks" empty="No bets" class="narrow">
          <template #group="{ group: week }">
            <td>Week {{ week.week }}</td>
            <td class="text-medium-emphasis">{{ week.summary }}</td>
            <td class="text-right">
              <strong :class="week.net >= 0 ? 'text-success' : 'text-error'">{{ week.net > 0 ? '+' : '' }}{{ week.net }}</strong>
            </td>
          </template>
          <template #rows="{ group: week }">
            <tr v-for="(bet, idx) in week.bets" :key="idx" class="detail-row">
              <td></td>
              <td></td>
              <td>
                <div v-if="bet.player1 && bet.player2" class="d-flex align-center ga-1 flex-wrap">
                  <template v-for="side in [bet.player1, bet.player2]" :key="side">
                    <span v-if="side === bet.player2" class="text-medium-emphasis">{{ bet.score }}</span>
                    <span :class="{ winner: side === bet.actual_winner }">
                      <PlayerName :player="resolve(side)" :race="resolve(side).signup_race" @click="openPlayer(side)" />
                    </span>
                    <BetIcon v-if="side === bet.bet_on" class="text-green" />
                  </template>
                </div>
                <span v-else>{{ bet.series }}</span>
              </td>
              <td class="text-right" :class="bet.won ? 'text-success' : 'text-error'">
                {{ bet.result > 0 ? '+' : '' }}{{ bet.result }}
              </td>
            </tr>
          </template>
        </GroupedTable>
      </v-expansion-panel-text>
    </v-expansion-panel>
  </v-expansion-panels>
</template>

<script setup>
import { computed } from 'vue';
import BetIcon from '@/components/BetIcon.vue';
import GroupedTable from '@/components/GroupedTable.vue';
import PlayerName from '@/components/PlayerName.vue';
import RaceIcon from '@/components/RaceIcon.vue';
import { raceWrapper } from '@/helpers/races';
import { teamImageUrl, showDefaultTeamImage } from '@/helpers/team-image';
import W3CMmr from '@/components/W3CMmr.vue';
import { getW3CMMR } from '@/helpers/w3c-stats';

const playerColumns = [
  { key: 'player', title: 'Player' },
  { key: 'mmr', title: 'W3C MMR', align: 'right' },
  { key: 'record', title: 'GNL Record', align: 'right' },
  { key: 'player_pts', title: 'Player Points', align: 'right' },
  { key: 'bench_pts', title: 'Bench Points', align: 'right' },
  { key: 'total', title: 'Total', align: 'right' },
];

const betColumns = [
  { key: 'week', title: 'Week', width: '110px' },
  { key: 'series', title: 'Series' },
  { key: 'points', title: 'Points', align: 'right' },
];

// The breakdown answer carries names (and sometimes ids); the players list
// turns them back into full players so every reference renders as PlayerName.
const props = defineProps({
  breakdown: { type: Object, required: true },
  players: { type: Array, default: () => [] },
  draftedPlayers: { type: Array, default: () => [] },
  seasonId: { type: Number, default: null },
  w3cSeason: { type: Object, default: null },
});
const emit = defineEmits(['open-player']);

// drafted players last: they carry the season stats the roster table reads
const byId = computed(() => new Map([...props.players, ...props.draftedPlayers].map(p => [p.id, p])));
const byName = computed(() => new Map([...props.players, ...props.draftedPlayers].map(p => [p.name, p])));

const resolve = (name, id = null) => byId.value.get(id) || byName.value.get(name) || { name };

const openPlayer = (name, id = null) => {
  const player = resolve(name, id);
  if (player.id) emit('open-player', player);
};

// the opponent's MMR comes from the same signup pool the roster rows read
const opponentMmr = (series) => {
  const player = resolve(series.opponent);
  return player.signup_race ? getW3CMMR(player, props.w3cSeason, player.signup_race) : null;
};

const gnlRecord = (player) => {
  const stat = player.gnl_stats?.find(s => s.season_id === props.seasonId);
  return stat ? `${stat.wins || 0}W - ${stat.losses || 0}L` : '-';
};

const roster = computed(() => {
  const bench = {};
  for (const b of props.breakdown.bench_breakdown) {
    bench[b.player_name] = (bench[b.player_name] || 0) + b.points;
  }
  return props.breakdown.player_breakdown.map(b => {
    const player = resolve(b.player_name, b.player_id);
    return {
      ...b,
      key: b.player_id ?? b.player_name,
      player,
      mmr: getW3CMMR(player, props.w3cSeason, player.signup_race),
      record: gnlRecord(player),
      bench: bench[b.player_name] || 0,
    };
  });
});

const raceRanking = computed(() =>
  Object.entries(props.breakdown.race_breakdown.all_race_points)
    .map(([race, points]) => ({ race, points }))
    .sort((a, b) => b.points - a.points)
);

const betWeeks = computed(() => {
  const weeks = new Map();
  for (const bet of props.breakdown.bet_breakdown) {
    weeks.set(bet.week, [...(weeks.get(bet.week) || []), bet]);
  }
  return [...weeks.entries()].sort(([a], [b]) => a - b).map(([week, bets]) => {
    const won = bets.filter(b => b.won);
    const lost = bets.filter(b => !b.won);
    const points = arr => arr.reduce((sum, b) => sum + b.result, 0);
    const summary = [
      won.length && `${won.length} won (+${points(won)})`,
      lost.length && `${lost.length} lost (${points(lost)})`,
    ].filter(Boolean).join(' · ');
    return { key: week, week, bets, summary, net: points(bets) };
  });
});

const raceName = computed(() => {
  const race = props.breakdown.race_breakdown.race;
  return raceWrapper.getRaceObject(race)?.name ?? race;
});

const raceRank = computed(
  () => raceRanking.value.findIndex(e => e.race === props.breakdown.race_breakdown.race) + 1
);
</script>

<style scoped>
.week-label {
  display: inline-block;
  min-width: 64px;
}
.detail-row:has(+ .same-week) > td {
  border-bottom: none !important;
}
.winner {
  font-weight: 700;
}
/* Team, Race and Bets hold a handful of numbers; stretching them to the panel
   pushes the points column an eye-travel away from the row it belongs to. */
.narrow :deep(table) {
  width: auto;
}
.tab-icon,
.row-icon {
  width: 24px;
  height: 24px;
  object-fit: contain;
}
</style>
