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
          <v-card-text>
            <v-row>
              <v-col v-for="week in player.weeks" :key="week.week" cols="12" md="6" lg="4">
                <v-card variant="outlined" class="mb-2">
                  <v-card-subtitle class="font-weight-bold">Week {{ week.week }}</v-card-subtitle>
                  <v-card-text>
                    <div v-if="week.series.length > 0">
                      <div v-for="(series, idx) in week.series" :key="idx" class="mb-1">
                        <v-chip size="small" color="success" class="mr-1">+{{ series.points }}</v-chip>
                        vs <PlayerName :player="resolve(series.opponent)" :race="resolve(series.opponent).race" @click="openPlayer(series.opponent)" /> ({{ series.score }})
                      </div>
                      <v-divider class="my-1"></v-divider>
                      <strong>Week Total: {{ week.points }} pts</strong>
                    </div>
                    <div v-else-if="week.bench_points > 0" class="text-amber">
                      <v-icon size="small">mdi-seat</v-icon> Benched: +{{ week.bench_points }} pts
                    </div>
                    <div v-else class="text-grey">No games</div>
                  </v-card-text>
                </v-card>
              </v-col>
            </v-row>
          </v-card-text>
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
        <v-list>
          <v-list-item v-for="(bench, idx) in breakdown.bench_breakdown" :key="idx">
            <v-list-item-title>
              <v-chip size="small" color="amber" class="mr-2">+{{ bench.points }}</v-chip>
              <PlayerName :player="resolve(bench.player_name)" :race="resolve(bench.player_name).race" @click="openPlayer(bench.player_name)" />
              <span class="ml-1">- Week {{ bench.week }}</span>
            </v-list-item-title>
            <v-list-item-subtitle>{{ bench.reason }}</v-list-item-subtitle>
          </v-list-item>
        </v-list>
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
        <v-list>
          <v-list-item>
            <v-list-item-title class="font-weight-bold">{{ breakdown.team_breakdown.team_name }}</v-list-item-title>
          </v-list-item>
          <v-list-item>
            <v-list-item-title>Final Score: {{ breakdown.team_breakdown.final_score }}</v-list-item-title>
          </v-list-item>
          <v-list-item>
            <v-list-item-subtitle>Points Against: {{ breakdown.team_breakdown.points_against }}</v-list-item-subtitle>
          </v-list-item>
          <v-list-item>
            <v-list-item-subtitle>Points Available: {{ breakdown.team_breakdown.points_available }}</v-list-item-subtitle>
          </v-list-item>
        </v-list>
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
        <v-list>
          <v-list-item v-for="(bet, idx) in breakdown.bet_breakdown" :key="idx">
            <template v-slot:prepend>
              <v-icon :color="bet.won ? 'success' : 'error'">
                {{ bet.won ? 'mdi-check-circle' : 'mdi-close-circle' }}
              </v-icon>
            </template>
            <v-list-item-title>
              Week {{ bet.week }}: {{ bet.series }}
            </v-list-item-title>
            <v-list-item-subtitle class="d-flex align-center flex-wrap ga-1">
              Bet on: <PlayerName v-if="bet.bet_on" :player="resolve(bet.bet_on)" :race="resolve(bet.bet_on).race" @click="openPlayer(bet.bet_on)" /><span v-else>N/A</span>
              | Winner: <PlayerName v-if="bet.actual_winner" :player="resolve(bet.actual_winner)" :race="resolve(bet.actual_winner).race" @click="openPlayer(bet.actual_winner)" /><span v-else>N/A</span>
              |
              <span :class="bet.won ? 'text-success' : 'text-error'">
                {{ bet.result > 0 ? '+' : '' }}{{ bet.result }} pts
              </span>
            </v-list-item-subtitle>
          </v-list-item>
        </v-list>
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
