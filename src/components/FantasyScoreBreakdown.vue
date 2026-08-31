<template>
  <v-expansion-panels multiple>
    <!-- Team Points Breakdown -->
    <v-expansion-panel v-if="breakdown.team_breakdown.team_name">
      <v-expansion-panel-title>
        <v-icon class="mr-2" color="green">mdi-shield-account</v-icon>
        <strong>Team Points Details</strong>
        <v-spacer></v-spacer>
        <v-chip color="green" size="small">{{ breakdown.totals.team_points }} pts</v-chip>
      </v-expansion-panel-title>
      <v-expansion-panel-text>
        <v-table density="compact">
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
              <td class="font-weight-bold">{{ breakdown.team_breakdown.team_name }}</td>
              <td>{{ breakdown.team_breakdown.final_score }}</td>
              <td>{{ breakdown.team_breakdown.points_against }}</td>
              <td>{{ breakdown.team_breakdown.points_available }}</td>
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
        <v-chip color="blue" size="small">{{ breakdown.totals.player_points }} pts</v-chip>
        <v-chip color="amber" size="small" class="ml-1">{{ breakdown.totals.bench_points }} bench pts</v-chip>
      </v-expansion-panel-title>
      <v-expansion-panel-text>
        <v-table density="compact">
          <thead>
            <tr>
              <th style="width: 48px"></th>
              <th>Player</th>
              <th class="text-right"><W3CMmr /></th>
              <th class="text-right">GNL Record</th>
              <th class="text-right">Player Pts</th>
              <th class="text-right">Bench Pts</th>
              <th class="text-right">Total</th>
            </tr>
          </thead>
          <tbody>
            <template v-for="row in roster" :key="row.key">
              <tr class="roster-row" @click="toggleWeeks(row.key)">
                <td><v-icon size="small">{{ openWeeks.has(row.key) ? 'mdi-chevron-up' : 'mdi-chevron-down' }}</v-icon></td>
                <td><PlayerName :player="row.player" :race="row.player.race" @click.stop="openPlayer(row.player_name, row.player_id)" /></td>
                <td class="text-right">{{ row.mmr || 'N/A' }}</td>
                <td class="text-right">{{ row.record }}</td>
                <td class="text-right">{{ row.total }}</td>
                <td class="text-right text-amber">{{ row.bench ? `+${row.bench}` : 0 }}</td>
                <td class="text-right"><strong>{{ row.total + row.bench }}</strong></td>
              </tr>
              <tr v-if="openWeeks.has(row.key)">
                <td></td>
                <td colspan="6" class="pa-2">
                  <v-table density="compact">
                    <thead>
                      <tr>
                        <th style="width: 80px">Week</th>
                        <th>Series</th>
                        <th class="text-right">Points</th>
                      </tr>
                    </thead>
                    <tbody>
                      <template v-for="week in row.weeks" :key="week.week">
                        <tr v-for="(series, idx) in week.series" :key="`${week.week}-${idx}`">
                          <td v-if="idx === 0" :rowspan="week.series.length">{{ week.week }}</td>
                          <td>
                            <div class="d-flex align-center ga-1 flex-wrap">
                              vs <PlayerName :player="resolve(series.opponent)" :race="resolve(series.opponent).race" @click="openPlayer(series.opponent)" />
                              <span>({{ series.score }})</span>
                            </div>
                          </td>
                          <td class="text-right"><strong>{{ series.points }}</strong></td>
                        </tr>
                        <tr v-if="week.series.length === 0">
                          <td>{{ week.week }}</td>
                          <td>
                            <span v-if="week.bench_points > 0" class="text-amber">
                              <v-icon size="small">mdi-seat</v-icon> Benched
                            </span>
                            <span v-else class="text-grey">No games</span>
                          </td>
                          <td class="text-right">
                            <span v-if="week.bench_points > 0" class="text-amber">+{{ week.bench_points }}</span>
                            <span v-else class="text-grey">0</span>
                          </td>
                        </tr>
                      </template>
                    </tbody>
                  </v-table>
                </td>
              </tr>
            </template>
            <tr v-if="!roster.length">
              <td colspan="7" class="text-grey">No drafted players</td>
            </tr>
          </tbody>
        </v-table>
      </v-expansion-panel-text>
    </v-expansion-panel>

    <!-- Race Points Breakdown -->
    <v-expansion-panel>
      <v-expansion-panel-title>
        <v-icon class="mr-2" color="purple">mdi-trophy-variant</v-icon>
        <strong>Race Points Details</strong>
        <v-spacer></v-spacer>
        <v-chip color="purple" size="small">{{ breakdown.totals.race_points }} pts</v-chip>
      </v-expansion-panel-title>
      <v-expansion-panel-text>
        <div class="text-subtitle-2 mb-2">Weekly Performance of {{ breakdown.race_breakdown.race }} ({{ breakdown.race_breakdown.season_stats.wins }}W - {{ breakdown.race_breakdown.season_stats.losses }}L):</div>
        <v-table density="compact">
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
        <div class="text-subtitle-2 mt-4 mb-2">Season Race Ranking:</div>
        <v-table density="compact">
          <thead>
            <tr>
              <th style="width: 80px">#</th>
              <th>Race</th>
              <th class="text-right">Points</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="(entry, idx) in raceRanking" :key="entry.race" :class="{ 'bg-purple-lighten-5': entry.race === breakdown.race_breakdown.race }">
              <td>{{ idx + 1 }}</td>
              <td>
                <RaceIcon :raceIdentifier="entry.race" />
                {{ entry.race }}
                <v-chip v-if="entry.race === breakdown.race_breakdown.race" size="x-small" variant="tonal" color="purple" class="ml-1">Drafted</v-chip>
              </td>
              <td class="text-right"><strong>{{ entry.points }}</strong></td>
            </tr>
          </tbody>
        </v-table>
      </v-expansion-panel-text>
    </v-expansion-panel>

    <!-- Bet Points Breakdown -->
    <v-expansion-panel v-if="breakdown.bet_breakdown.length > 0">
      <v-expansion-panel-title>
        <v-icon class="mr-2" :color="breakdown.totals.bet_points >= 0 ? 'teal' : 'red'">mdi-casino</v-icon>
        <strong>Bet Points Details</strong>
        <v-spacer></v-spacer>
        <v-chip :color="breakdown.totals.bet_points >= 0 ? 'teal' : 'red'" size="small">{{ breakdown.totals.bet_points }} pts</v-chip>
      </v-expansion-panel-title>
      <v-expansion-panel-text>
        <v-table density="compact">
          <thead>
            <tr>
              <th style="width: 80px">Week</th>
              <th>Series (<v-icon size="x-small" color="teal">mdi-poker-chip</v-icon> = bet, bold = winner)</th>
              <th class="text-right">Points</th>
            </tr>
          </thead>
          <tbody>
            <template v-for="[week, bets] in betsByWeek" :key="week">
              <tr v-for="(bet, idx) in bets" :key="`${week}-${idx}`">
                <td v-if="idx === 0" :rowspan="bets.length">{{ week }}</td>
                <td>
                  <div v-if="sides(bet).length === 2" class="d-flex align-center ga-1 flex-wrap">
                    <template v-for="(side, i) in sides(bet)" :key="i">
                      <span v-if="i" class="text-grey">vs</span>
                      <span :class="{ loser: bet.actual_winner && side !== bet.actual_winner }">
                        <PlayerName :player="resolve(side)" :race="resolve(side).race" @click="openPlayer(side)" />
                      </span>
                      <v-icon v-if="side === bet.bet_on" size="x-small" color="teal">mdi-poker-chip</v-icon>
                    </template>
                  </div>
                  <span v-else>{{ bet.series }}</span>
                </td>
                <td class="text-right" :class="bet.won ? 'text-success' : 'text-error'">
                  <v-icon size="small">{{ bet.won ? 'mdi-check-circle' : 'mdi-close-circle' }}</v-icon>
                  {{ bet.result > 0 ? '+' : '' }}{{ bet.result }}
                </td>
              </tr>
            </template>
          </tbody>
        </v-table>
      </v-expansion-panel-text>
    </v-expansion-panel>
  </v-expansion-panels>
</template>

<script setup>
import { computed, ref } from 'vue';
import PlayerName from '@/components/PlayerName.vue';
import RaceIcon from '@/components/RaceIcon.vue';
import W3CMmr from '@/components/W3CMmr.vue';
import { getW3CMMR } from '@/helpers/w3c-stats';

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
      mmr: getW3CMMR(player, props.w3cSeason),
      record: gnlRecord(player),
      bench: bench[b.player_name] || 0,
    };
  });
});

const openWeeks = ref(new Set());
const toggleWeeks = (key) => {
  openWeeks.value.has(key) ? openWeeks.value.delete(key) : openWeeks.value.add(key);
  openWeeks.value = new Set(openWeeks.value);
};

const raceRanking = computed(() =>
  Object.entries(props.breakdown.race_breakdown.all_race_points)
    .map(([race, points]) => ({ race, points }))
    .sort((a, b) => b.points - a.points)
);

const betsByWeek = computed(() => {
  const weeks = new Map();
  for (const bet of props.breakdown.bet_breakdown) {
    weeks.set(bet.week, [...(weeks.get(bet.week) || []), bet]);
  }
  return [...weeks.entries()].sort(([a], [b]) => a - b);
});

const sides = (bet) => bet.series?.split(' vs ') ?? [];
</script>

<style scoped>
.roster-row {
  cursor: pointer;
}
.loser :deep(strong) {
  font-weight: 400;
}
</style>
