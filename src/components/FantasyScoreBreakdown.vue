<template>
  <v-expansion-panels multiple>
    <!-- Player Points Breakdown -->
    <v-expansion-panel>
      <v-expansion-panel-title>
        <v-icon class="mr-2" color="blue">mdi-account-multiple</v-icon>
        <strong>Player Points Details</strong>
        <v-spacer></v-spacer>
        <v-chip color="blue" size="small">{{ breakdown.totals.player_points }} pts</v-chip>
      </v-expansion-panel-title>
      <v-expansion-panel-text>
        <v-card v-for="player in breakdown.player_breakdown" :key="player.player_id" class="mb-3" elevation="1">
          <v-card-title class="bg-blue-lighten-5 py-2">
            <PlayerName :player="resolve(player.player_name, player.player_id)" :race="resolve(player.player_name, player.player_id).race" @click="openPlayer(player.player_name, player.player_id)" />
            <span class="ml-2">- Total: {{ player.total }} points</span>
          </v-card-title>
          <v-table density="compact">
            <thead>
              <tr>
                <th>Week</th>
                <th>Series</th>
                <th class="text-right">Points</th>
              </tr>
            </thead>
            <tbody>
              <template v-for="week in player.weeks" :key="week.week">
                <tr v-for="(series, idx) in week.series" :key="`${week.week}-${idx}`">
                  <td>{{ week.week }}</td>
                  <td>vs <PlayerName :player="resolve(series.opponent)" :race="resolve(series.opponent).race" @click="openPlayer(series.opponent)" /> ({{ series.score }})</td>
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
        </v-card>
      </v-expansion-panel-text>
    </v-expansion-panel>

    <!-- Bench Points Breakdown -->
    <v-expansion-panel v-if="breakdown.bench_breakdown.length > 0">
      <v-expansion-panel-title>
        <v-icon class="mr-2" color="amber">mdi-seat</v-icon>
        <strong>Bench Points Details</strong>
        <v-spacer></v-spacer>
        <v-chip color="amber" size="small">{{ breakdown.totals.bench_points }} pts</v-chip>
      </v-expansion-panel-title>
      <v-expansion-panel-text>
        <v-table density="compact">
          <thead>
            <tr>
              <th>Week</th>
              <th>Player</th>
              <th>Reason</th>
              <th class="text-right">Points</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="(bench, idx) in breakdown.bench_breakdown" :key="idx">
              <td>{{ bench.week }}</td>
              <td><PlayerName :player="resolve(bench.player_name)" :race="resolve(bench.player_name).race" @click="openPlayer(bench.player_name)" /></td>
              <td>{{ bench.reason }}</td>
              <td class="text-right text-amber">+{{ bench.points }}</td>
            </tr>
          </tbody>
        </v-table>
      </v-expansion-panel-text>
    </v-expansion-panel>

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

    <!-- Race Points Breakdown -->
    <v-expansion-panel>
      <v-expansion-panel-title>
        <v-icon class="mr-2" color="purple">mdi-trophy-variant</v-icon>
        <strong>Race Points Details</strong>
        <v-spacer></v-spacer>
        <v-chip color="purple" size="small">{{ breakdown.totals.race_points }} pts</v-chip>
      </v-expansion-panel-title>
      <v-expansion-panel-text>
        <v-list>
          <v-list-item>
            <v-list-item-title class="font-weight-bold">
              <RaceIcon :raceIdentifier="breakdown.race_breakdown.race" />
              {{ breakdown.race_breakdown.race }}
            </v-list-item-title>
            <v-list-item-subtitle>
              Season Stats: {{ breakdown.race_breakdown.season_stats.wins }}W - {{ breakdown.race_breakdown.season_stats.losses }}L
            </v-list-item-subtitle>
          </v-list-item>
        </v-list>
        <v-divider class="my-2"></v-divider>
        <div class="text-subtitle-2 mb-2">Weekly Performance:</div>
        <v-table density="compact">
          <thead>
            <tr>
              <th>Week</th>
              <th>Wins</th>
              <th>Losses</th>
              <th>Ratio</th>
              <th>Rank</th>
              <th>Points</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="week in breakdown.race_breakdown.weekly_breakdown" :key="week.week">
              <td>{{ week.week }}</td>
              <td>{{ week.wins }}</td>
              <td>{{ week.losses }}</td>
              <td>{{ week.ratio.toFixed(2) }}</td>
              <td>
                <v-chip v-if="week.rank" :color="week.rank === 1 ? 'success' : week.rank === 2 ? 'info' : 'warning'" size="x-small">
                  #{{ week.rank }}
                </v-chip>
                <span v-else class="text-grey">-</span>
              </td>
              <td>
                <v-chip v-if="week.points_awarded > 0" color="purple" size="small">+{{ week.points_awarded }}</v-chip>
                <span v-else class="text-grey">0</span>
              </td>
            </tr>
          </tbody>
        </v-table>
        <v-divider class="my-2"></v-divider>
        <div class="text-subtitle-2 mb-2">All Race Rankings:</div>
        <v-chip-group column>
          <v-chip v-for="(points, race) in breakdown.race_breakdown.all_race_points" :key="race"
            :color="race === breakdown.race_breakdown.race ? 'purple' : 'grey'"
            size="small">
            <RaceIcon :raceIdentifier="race" class="mr-1" />
            {{ race }}: {{ points }} pts
          </v-chip>
        </v-chip-group>
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
              <th>Week</th>
              <th>Series</th>
              <th>Bet On</th>
              <th class="text-right">Points</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="(bet, idx) in breakdown.bet_breakdown" :key="idx">
              <td>{{ bet.week }}</td>
              <td>{{ bet.series }}</td>
              <td>
                <PlayerName v-if="bet.bet_on" :player="resolve(bet.bet_on)" :race="resolve(bet.bet_on).race" @click="openPlayer(bet.bet_on)" />
                <span v-else class="text-grey">N/A</span>
              </td>
              <td class="text-right" :class="bet.won ? 'text-success' : 'text-error'">
                <v-icon size="small">{{ bet.won ? 'mdi-check-circle' : 'mdi-close-circle' }}</v-icon>
                {{ bet.result > 0 ? '+' : '' }}{{ bet.result }}
              </td>
            </tr>
          </tbody>
        </v-table>
      </v-expansion-panel-text>
    </v-expansion-panel>
  </v-expansion-panels>
</template>

<script setup>
import { computed } from 'vue';
import PlayerName from '@/components/PlayerName.vue';
import RaceIcon from '@/components/RaceIcon.vue';

// The breakdown answer carries names (and sometimes ids); the players list
// turns them back into full players so every reference renders as PlayerName.
const props = defineProps({
  breakdown: { type: Object, required: true },
  players: { type: Array, default: () => [] },
});
const emit = defineEmits(['open-player']);

const byId = computed(() => new Map(props.players.map(p => [p.id, p])));
const byName = computed(() => new Map(props.players.map(p => [p.name, p])));

const resolve = (name, id = null) => byId.value.get(id) || byName.value.get(name) || { name };

const openPlayer = (name, id = null) => {
  const player = resolve(name, id);
  if (player.id) emit('open-player', player);
};
</script>
