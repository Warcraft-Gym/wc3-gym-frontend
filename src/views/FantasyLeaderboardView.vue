<template>
  <v-overlay v-model="isLoading" persistent absolute>
    <v-progress-circular indeterminate size="64" width="8" color="primary"></v-progress-circular>
  </v-overlay>

  <v-container fluid class="pa-4">
    <v-row class="mb-4">
      <v-col>
        <h1><v-icon class="mr-2">mdi-trophy</v-icon> Fantasy Teams Leaderboard</h1>
      </v-col>
    </v-row>

    <v-alert v-if="errorMessage" type="error" variant="tonal" border="start" border-color="red" class="mb-4" closable>
      {{ errorMessage }}
    </v-alert>

    <v-row>
      <v-col cols="12">
        <v-card elevation="2">
          <v-card-title class="bg-primary d-flex align-center">
            <v-icon class="mr-2">mdi-chart-bar</v-icon>
            <span>Season Leaderboard</span>
          </v-card-title>
          <v-card-text class="pa-0">
            <v-toolbar flat height="auto">
              <v-row align="center" class="flex-wrap ma-0 pa-2">
                <v-col cols="12" sm="auto">
                  <v-select
                    v-model="selectedSeasonId"
                    :items="seasons"
                    item-title="name"
                    item-value="id"
                    label="Season"
                    variant="outlined"
                    density="compact"
                    hide-details
                    style="min-width: 200px;"
                    @update:modelValue="onSeasonChange"
                  ></v-select>
                </v-col>
                <v-spacer />
                <v-col cols="12" sm="auto">
                  <v-alert
                    type="info"
                    variant="tonal"
                    density="compact"
                    icon="mdi-information-outline"
                    class="text-caption mb-0"
                  >
                    All scores are computed automatically and don't need to be recalculated manually.
                  </v-alert>
                </v-col>
                <v-col cols="12" sm="auto">
                  <v-btn variant="elevated" color="primary" prepend-icon="mdi-plus" @click="openCreateDialog" block>
                    Create Team
                  </v-btn>
                </v-col>
              </v-row>
            </v-toolbar>
            <v-data-table
              :headers="headers"
              :items="sortedTeams"
              :items-per-page="25"
              class="elevation-1"
              density="comfortable"
            >
              <template v-slot:[`item.rank`]="{ index }">
                <v-chip :color="getRankColor(index + 1)" size="small">
                  {{ index + 1 }}
                </v-chip>
              </template>

              <template v-slot:[`item.name`]="{ item }">
                {{ item.name || 'N/A' }}
              </template>

              <template v-slot:[`item.captain`]="{ item }">
                {{ item.captain?.name || 'N/A' }}
              </template>

              <template v-slot:[`item.drafted_team`]="{ item }">
                {{ item.drafted_team?.name || 'N/A' }}
              </template>

              <template v-slot:[`item.drafted_race`]="{ item }">
                <RaceIcon v-if="item.drafted_race" :raceIdentifier="item.drafted_race" />
                <span v-else>N/A</span>
              </template>

              <template v-slot:[`item.player_points`]="{ item }">
                {{ item.player_points || 0 }}
              </template>

              <template v-slot:[`item.bench_points`]="{ item }">
                {{ item.bench_points || 0 }}
              </template>

              <template v-slot:[`item.team_points`]="{ item }">
                {{ item.team_points || 0 }}
              </template>

              <template v-slot:[`item.race_points`]="{ item }">
                {{ item.race_points || 0 }}
              </template>

              <template v-slot:[`item.bet_points`]="{ item }">
                {{ item.bet_points || 0 }}
              </template>

              <template v-slot:[`item.total_points`]="{ item }">
                <strong>{{ item.total_points || 0 }}</strong>
              </template>

              <template v-slot:[`item.actions`]="{ item }">
                <RowActions :actions="[
                  { icon: 'mdi-eye', label: 'View Details', onClick: () => viewTeamDetails(item.id) },
                  { icon: 'mdi-chart-box', label: 'Score Breakdown', onClick: () => viewScoreBreakdown(item) },
                  { icon: 'mdi-pencil', label: 'Edit', onClick: () => openEditDialog(item) },
                  { icon: 'mdi-delete', label: 'Delete', color: 'error', onClick: () => openDeleteDialog(item) },
                ]" />
              </template>
            </v-data-table>
          </v-card-text>
        </v-card>
      </v-col>
    </v-row>
  </v-container>

  <!-- Team Details Dialog -->
  <v-dialog v-model="teamDialog" max-width="800px">
    <v-card>
      <v-card-title class="bg-primary">
        <v-icon class="mr-2">mdi-trophy-variant</v-icon>
        Team Details
      </v-card-title>
      <v-card-text v-if="selectedTeam" class="pt-4">
        <v-row>
          <v-col cols="12" md="6">
            <v-list>
              <v-list-item>
                <v-list-item-title class="font-weight-bold">Captain</v-list-item-title>
                <v-list-item-subtitle>{{ selectedTeam.captain?.name || 'N/A' }}</v-list-item-subtitle>
              </v-list-item>
              <v-list-item>
                <v-list-item-title class="font-weight-bold">Season</v-list-item-title>
                <v-list-item-subtitle>{{ selectedTeam.season?.name || 'N/A' }}</v-list-item-subtitle>
              </v-list-item>
              <v-list-item>
                <v-list-item-title class="font-weight-bold">Drafted Team</v-list-item-title>
                <v-list-item-subtitle>{{ selectedTeam.drafted_team?.name || 'N/A' }}</v-list-item-subtitle>
              </v-list-item>
              <v-list-item>
                <v-list-item-title class="font-weight-bold">Drafted Race</v-list-item-title>
                <v-list-item-subtitle>
                  <RaceIcon v-if="selectedTeam.drafted_race" :raceIdentifier="selectedTeam.drafted_race" />
                  <span v-else>N/A</span>
                </v-list-item-subtitle>
              </v-list-item>
            </v-list>
          </v-col>
          <v-col cols="12" md="6">
            <v-card variant="outlined" class="pa-4">
              <div class="text-h6 mb-3">Points Breakdown</div>
              <v-list density="compact">
                <v-list-item>
                  <v-list-item-title>Player Points</v-list-item-title>
                  <template v-slot:append>
                    <span class="text-h6">{{ selectedTeam.player_points || 0 }}</span>
                  </template>
                </v-list-item>
                <v-list-item>
                  <v-list-item-title>Bench Points</v-list-item-title>
                  <template v-slot:append>
                    <span class="text-h6">{{ selectedTeam.bench_points || 0 }}</span>
                  </template>
                </v-list-item>
                <v-list-item>
                  <v-list-item-title>Team Points</v-list-item-title>
                  <template v-slot:append>
                    <span class="text-h6">{{ selectedTeam.team_points || 0 }}</span>
                  </template>
                </v-list-item>
                <v-list-item>
                  <v-list-item-title>Race Points</v-list-item-title>
                  <template v-slot:append>
                    <span class="text-h6">{{ selectedTeam.race_points || 0 }}</span>
                  </template>
                </v-list-item>
                <v-list-item>
                  <v-list-item-title>Bet Points</v-list-item-title>
                  <template v-slot:append>
                    <span class="text-h6">{{ selectedTeam.bet_points || 0 }}</span>
                  </template>
                </v-list-item>
                <v-divider class="my-2" />
                <v-list-item>
                  <v-list-item-title class="font-weight-bold">Total Points</v-list-item-title>
                  <template v-slot:append>
                    <span class="text-h5 primary--text">{{ selectedTeam.total_points || 0 }}</span>
                  </template>
                </v-list-item>
              </v-list>
            </v-card>
          </v-col>
        </v-row>
        <v-row v-if="selectedTeam.drafted_players && selectedTeam.drafted_players.length > 0">
          <v-col cols="12">
            <v-divider class="my-4" />
            <div class="text-h6 mb-3">Drafted Players</div>
            <v-chip-group>
              <v-chip v-for="player in selectedTeam.drafted_players" :key="player.id" color="primary">
                {{ player.name }}
              </v-chip>
            </v-chip-group>
          </v-col>
        </v-row>
      </v-card-text>
      <v-card-actions>
        <v-spacer />
        <v-btn variant="text" @click="closeTeamDialog">Close</v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>

  <!-- Create/Edit Team Dialog -->
  <v-dialog v-model="editDialog" max-width="900px" persistent>
    <v-card>
      <v-card-title class="text-h5 bg-primary">
        <v-icon class="mr-2">{{ isEditing ? 'mdi-pencil' : 'mdi-plus' }}</v-icon>
        {{ isEditing ? 'Edit Fantasy Team' : 'Create Fantasy Team' }}
      </v-card-title>
      <v-card-text class="pt-4">
        <v-alert
          v-if="dialogErrorMessage"
          type="error"
          variant="tonal"
          border="start"
          border-color="red"
          class="mb-4"
          closable
          @click:close="dialogErrorMessage = null"
        >
          {{ dialogErrorMessage }}
        </v-alert>
        <v-form ref="teamForm">
          <v-row>
            <v-col cols="12" md="6">
              <v-text-field
                v-model="editedTeam.name"
                label="Team Name *"
                variant="outlined"
                prepend-inner-icon="mdi-account-group"
                density="comfortable"
                :rules="[v => !!v || 'Team name is required']"
              ></v-text-field>
            </v-col>
            <v-col cols="12" md="6">
              <v-select
                v-model="editedTeam.season_id"
                :items="seasons"
                item-title="name"
                item-value="id"
                label="Season *"
                variant="outlined"
                prepend-inner-icon="mdi-calendar"
                density="comfortable"
                :rules="[v => !!v || 'Season is required']"
              ></v-select>
            </v-col>
            <v-col cols="12" md="6">
              <v-autocomplete
                v-model="editedTeam.captain_id"
                :items="players"
                item-title="name"
                item-value="id"
                label="Captain *"
                variant="outlined"
                prepend-inner-icon="mdi-account-star"
                density="comfortable"
                :rules="[v => !!v || 'Captain is required']"
              ></v-autocomplete>
            </v-col>
            <v-col cols="12" md="6">
              <v-autocomplete
                v-model="editedTeam.drafted_team_id"
                :items="gnlTeams"
                item-title="name"
                item-value="id"
                label="Drafted Team *"
                variant="outlined"
                prepend-inner-icon="mdi-shield"
                density="comfortable"
                :rules="[v => !!v || 'Drafted team is required']"
              ></v-autocomplete>
            </v-col>
            <v-col cols="12" md="6">
              <v-select
                v-model="editedTeam.drafted_race"
                :items="races"
                label="Drafted Race *"
                variant="outlined"
                prepend-inner-icon="mdi-sword"
                density="comfortable"
                :rules="[v => !!v || 'Drafted race is required']"
              ></v-select>
            </v-col>
          </v-row>

          <v-row>
            <v-col cols="12">
              <v-divider class="my-2"></v-divider>
              <h3 class="text-h6 mb-3">Drafted Players (Select 1 per Tier) *</h3>
              <v-alert type="info" variant="tonal" density="compact" class="mb-3">
                You must select exactly one player from each tier (1-6)
              </v-alert>
            </v-col>
            <v-col cols="12" md="6" v-for="tier in [1, 2, 3, 4, 5, 6]" :key="tier">
              <v-autocomplete
                v-model="selectedTierPlayers[tier]"
                :items="tierPlayers[tier]"
                item-title="name"
                item-value="id"
                :label="`Tier ${tier} Player *`"
                variant="outlined"
                density="comfortable"
                :rules="[v => !!v || `Tier ${tier} player is required`]"
                clearable
              >
                <template v-slot:prepend-inner>
                  <v-chip size="small" :color="getTierColor(tier)">T{{ tier }}</v-chip>
                </template>
              </v-autocomplete>
            </v-col>
          </v-row>
        </v-form>
      </v-card-text>
      <v-card-actions>
        <v-spacer />
        <v-btn variant="text" @click="closeEditDialog" :disabled="isSaving">Cancel</v-btn>
        <v-btn color="primary" variant="elevated" @click="saveTeam" :loading="isSaving">{{ isEditing ? 'Update' : 'Create' }}</v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>

  <!-- Delete Confirmation Dialog -->
  <v-dialog v-model="deleteDialog" max-width="500px">
    <v-card>
      <v-card-title class="bg-error text-white">
        <v-icon class="mr-2" color="white">mdi-alert</v-icon>
        Confirm Delete
      </v-card-title>
      <v-card-text class="pt-4">
        <p>Are you sure you want to delete the fantasy team "{{ teamToDelete?.name }}"?</p>
        <p class="text-error font-weight-bold mt-2">This action cannot be undone.</p>
      </v-card-text>
      <v-card-actions>
        <v-spacer />
        <v-btn variant="text" @click="closeDeleteDialog" :disabled="isDeleting">Cancel</v-btn>
        <v-btn color="error" variant="elevated" prepend-icon="mdi-delete" @click="confirmDelete" :loading="isDeleting">Delete</v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>

  <!-- Score Breakdown Dialog -->
  <v-dialog v-model="breakdownDialog" max-width="1200px" scrollable>
    <v-card>
      <v-card-title class="bg-primary">
        <v-icon class="mr-2">mdi-chart-box</v-icon>
        Score Breakdown
      </v-card-title>
      <v-card-subtitle v-if="breakdownData" class="bg-primary pb-3 text-white">
        {{ breakdownData.display_name }}
      </v-card-subtitle>
      
      <v-overlay v-model="isLoadingBreakdown" contained persistent>
        <v-progress-circular indeterminate size="64" width="8" color="primary"></v-progress-circular>
      </v-overlay>

      <v-card-text v-if="breakdownData && !isLoadingBreakdown" class="pa-4">
        <!-- Score Summary Cards -->
        <v-row class="mb-4">
          <v-col cols="12" sm="6" md="2">
            <v-card color="blue-lighten-4" elevation="2">
              <v-card-text class="text-center">
                <div class="text-h4 font-weight-bold">{{ breakdownData.totals.player_points }}</div>
                <div class="text-caption">Player Points</div>
              </v-card-text>
            </v-card>
          </v-col>
          <v-col cols="12" sm="6" md="2">
            <v-card color="amber-lighten-4" elevation="2">
              <v-card-text class="text-center">
                <div class="text-h4 font-weight-bold">{{ breakdownData.totals.bench_points }}</div>
                <div class="text-caption">Bench Points</div>
              </v-card-text>
            </v-card>
          </v-col>
          <v-col cols="12" sm="6" md="2">
            <v-card color="green-lighten-4" elevation="2">
              <v-card-text class="text-center">
                <div class="text-h4 font-weight-bold">{{ breakdownData.totals.team_points }}</div>
                <div class="text-caption">Team Points</div>
              </v-card-text>
            </v-card>
          </v-col>
          <v-col cols="12" sm="6" md="2">
            <v-card color="purple-lighten-4" elevation="2">
              <v-card-text class="text-center">
                <div class="text-h4 font-weight-bold">{{ breakdownData.totals.race_points }}</div>
                <div class="text-caption">Race Points</div>
              </v-card-text>
            </v-card>
          </v-col>
          <v-col cols="12" sm="6" md="2">
            <v-card :color="breakdownData.totals.bet_points >= 0 ? 'teal-lighten-4' : 'red-lighten-4'" elevation="2">
              <v-card-text class="text-center">
                <div class="text-h4 font-weight-bold">{{ breakdownData.totals.bet_points }}</div>
                <div class="text-caption">Bet Points</div>
              </v-card-text>
            </v-card>
          </v-col>
          <v-col cols="12" sm="6" md="2">
            <v-card color="primary" elevation="4">
              <v-card-text class="text-center">
                <div class="text-h4 font-weight-bold text-white">{{ breakdownData.totals.total_points }}</div>
                <div class="text-caption text-white">Total Points</div>
              </v-card-text>
            </v-card>
          </v-col>
        </v-row>

        <!-- Expansion Panels for Details -->
        <v-expansion-panels multiple>
          <!-- Player Points Breakdown -->
          <v-expansion-panel>
            <v-expansion-panel-title>
              <v-icon class="mr-2" color="blue">mdi-account-multiple</v-icon>
              <strong>Player Points Details</strong>
              <v-spacer></v-spacer>
              <v-chip color="blue" size="small">{{ breakdownData.totals.player_points }} pts</v-chip>
            </v-expansion-panel-title>
            <v-expansion-panel-text>
              <v-card v-for="player in breakdownData.player_breakdown" :key="player.player_id" class="mb-3" elevation="1">
                <v-card-title class="bg-blue-lighten-5 py-2">
                  {{ player.player_name }} - Total: {{ player.total }} points
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
                              vs {{ series.opponent }} ({{ series.score }})
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
          <v-expansion-panel v-if="breakdownData.bench_breakdown.length > 0">
            <v-expansion-panel-title>
              <v-icon class="mr-2" color="amber">mdi-seat</v-icon>
              <strong>Bench Points Details</strong>
              <v-spacer></v-spacer>
              <v-chip color="amber" size="small">{{ breakdownData.totals.bench_points }} pts</v-chip>
            </v-expansion-panel-title>
            <v-expansion-panel-text>
              <v-list>
                <v-list-item v-for="(bench, idx) in breakdownData.bench_breakdown" :key="idx">
                  <v-list-item-title>
                    <v-chip size="small" color="amber" class="mr-2">+{{ bench.points }}</v-chip>
                    {{ bench.player_name }} - Week {{ bench.week }}
                  </v-list-item-title>
                  <v-list-item-subtitle>{{ bench.reason }}</v-list-item-subtitle>
                </v-list-item>
              </v-list>
            </v-expansion-panel-text>
          </v-expansion-panel>

          <!-- Team Points Breakdown -->
          <v-expansion-panel v-if="breakdownData.team_breakdown.team_name">
            <v-expansion-panel-title>
              <v-icon class="mr-2" color="green">mdi-shield-account</v-icon>
              <strong>Team Points Details</strong>
              <v-spacer></v-spacer>
              <v-chip color="green" size="small">{{ breakdownData.totals.team_points }} pts</v-chip>
            </v-expansion-panel-title>
            <v-expansion-panel-text>
              <v-list>
                <v-list-item>
                  <v-list-item-title class="font-weight-bold">{{ breakdownData.team_breakdown.team_name }}</v-list-item-title>
                </v-list-item>
                <v-list-item>
                  <v-list-item-title>Final Score: {{ breakdownData.team_breakdown.final_score }}</v-list-item-title>
                </v-list-item>
                <v-list-item>
                  <v-list-item-subtitle>Points Against: {{ breakdownData.team_breakdown.points_against }}</v-list-item-subtitle>
                </v-list-item>
                <v-list-item>
                  <v-list-item-subtitle>Points Available: {{ breakdownData.team_breakdown.points_available }}</v-list-item-subtitle>
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
              <v-chip color="purple" size="small">{{ breakdownData.totals.race_points }} pts</v-chip>
            </v-expansion-panel-title>
            <v-expansion-panel-text>
              <v-list>
                <v-list-item>
                  <v-list-item-title class="font-weight-bold">
                    <RaceIcon :raceIdentifier="breakdownData.race_breakdown.race" />
                    {{ breakdownData.race_breakdown.race }}
                  </v-list-item-title>
                  <v-list-item-subtitle>
                    Season Stats: {{ breakdownData.race_breakdown.season_stats.wins }}W - {{ breakdownData.race_breakdown.season_stats.losses }}L
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
                  <tr v-for="week in breakdownData.race_breakdown.weekly_breakdown" :key="week.week">
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
                <v-chip v-for="(points, race) in breakdownData.race_breakdown.all_race_points" :key="race" 
                  :color="race === breakdownData.race_breakdown.race ? 'purple' : 'grey'"
                  size="small">
                  <RaceIcon :raceIdentifier="race" class="mr-1" />
                  {{ race }}: {{ points }} pts
                </v-chip>
              </v-chip-group>
            </v-expansion-panel-text>
          </v-expansion-panel>

          <!-- Bet Points Breakdown -->
          <v-expansion-panel v-if="breakdownData.bet_breakdown.length > 0">
            <v-expansion-panel-title>
              <v-icon class="mr-2" :color="breakdownData.totals.bet_points >= 0 ? 'teal' : 'red'">mdi-casino</v-icon>
              <strong>Bet Points Details</strong>
              <v-spacer></v-spacer>
              <v-chip :color="breakdownData.totals.bet_points >= 0 ? 'teal' : 'red'" size="small">{{ breakdownData.totals.bet_points }} pts</v-chip>
            </v-expansion-panel-title>
            <v-expansion-panel-text>
              <v-list>
                <v-list-item v-for="(bet, idx) in breakdownData.bet_breakdown" :key="idx">
                  <template v-slot:prepend>
                    <v-icon :color="bet.won ? 'success' : 'error'">
                      {{ bet.won ? 'mdi-check-circle' : 'mdi-close-circle' }}
                    </v-icon>
                  </template>
                  <v-list-item-title>
                    Week {{ bet.week }}: {{ bet.series }}
                  </v-list-item-title>
                  <v-list-item-subtitle>
                    Bet on: {{ bet.bet_on }} | Winner: {{ bet.actual_winner }} | 
                    <span :class="bet.won ? 'text-success' : 'text-error'">
                      {{ bet.result > 0 ? '+' : '' }}{{ bet.result }} pts
                    </span>
                  </v-list-item-subtitle>
                </v-list-item>
              </v-list>
            </v-expansion-panel-text>
          </v-expansion-panel>
        </v-expansion-panels>
      </v-card-text>

      <v-card-actions>
        <v-spacer />
        <v-btn variant="text" @click="closeBreakdownDialog">Close</v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>

<script setup>
import RowActions from '@/components/RowActions.vue';
import '@/assets/base.css';
import { ref, computed, onMounted } from 'vue';
import { useFantasyStore, useSeasonStore, usePlayerStore, useTeamStore } from '@/stores';
import { storeToRefs } from 'pinia';
import { useRouter } from 'vue-router';
import RaceIcon from '@/components/RaceIcon.vue';
import { resolveCurrentSeasonId } from '@/helpers/current-season';

defineOptions({ name: 'FantasyLeaderboardView' });

const router = useRouter();
const fantasyStore = useFantasyStore();
const seasonStore = useSeasonStore();
const playerStore = usePlayerStore();
const teamStore = useTeamStore();

const { teams } = storeToRefs(fantasyStore);

const isLoading = ref(false);
const isSaving = ref(false);
const isDeleting = ref(false);
const errorMessage = ref(null);
const seasons = ref([]);
const selectedSeasonId = ref(null);
const teamDialog = ref(false);
const selectedTeam = ref(null);
const editDialog = ref(false);
const deleteDialog = ref(false);
const teamToDelete = ref(null);
const isEditing = ref(false);
const breakdownDialog = ref(false);
const breakdownData = ref(null);
const isLoadingBreakdown = ref(false);
const players = ref([]);
const gnlTeams = ref([]);
const races = ref([
  { title: 'Human', value: 'HU' },
  { title: 'Orc', value: 'OC' },
  { title: 'Night Elf', value: 'NE' },
  { title: 'Undead', value: 'UD' },
  { title: 'Random', value: 'RANDOM' }
]);
const editedTeam = ref({
  id: null,
  name: '',
  season_id: null,
  captain_id: null,
  drafted_team_id: null,
  drafted_race: null,
  player_ids: []
});
const teamForm = ref(null);
const dialogErrorMessage = ref(null);
const tierPlayers = ref({
  1: [],
  2: [],
  3: [],
  4: [],
  5: [],
  6: []
});
const selectedTierPlayers = ref({
  1: null,
  2: null,
  3: null,
  4: null,
  5: null,
  6: null
});

const headers = [
  { title: 'Rank', value: 'rank', sortable: false, width: '80px' },
  { title: 'Fantasy Team', value: 'name', sortable: false },
  { title: 'Captain', value: 'captain', sortable: false },
  { title: 'Team', value: 'drafted_team', sortable: false },
  { title: 'Race', value: 'drafted_race', sortable: false, align: 'center' },
  { title: 'Player Pts', value: 'player_points', align: 'end' },
  { title: 'Bench Pts', value: 'bench_points', align: 'end' },
  { title: 'Team Pts', value: 'team_points', align: 'end' },
  { title: 'Race Pts', value: 'race_points', align: 'end' },
  { title: 'Bet Pts', value: 'bet_points', align: 'end' },
  { title: 'Total', value: 'total_points', align: 'end' },
  { title: 'Actions', value: 'actions', sortable: false, align: 'center' }
];

const sortedTeams = computed(() => {
  return [...teams.value].sort((a, b) => {
    const aTotal = a.total_points || 0;
    const bTotal = b.total_points || 0;
    return bTotal - aTotal;
  });
});

const getRankColor = (rank) => {
  if (rank === 1) return 'gold';
  if (rank === 2) return 'silver';
  if (rank === 3) return '#CD7F32'; // bronze
  return 'grey';
};

const getTierColor = (tier) => {
  const colors = {
    1: 'purple',
    2: 'blue',
    3: 'green',
    4: 'orange',
    5: 'brown',
    6: 'grey'
  };
  return colors[tier] || 'grey';
};

const fetchData = async () => {
  isLoading.value = true;
  errorMessage.value = null;
  try {
    // If no season selected, get current season
    if (!selectedSeasonId.value) {
      selectedSeasonId.value = await resolveCurrentSeasonId();
    }

    if (!selectedSeasonId.value) {
      errorMessage.value = 'No season is available. Please contact an administrator.';
      isLoading.value = false;
      return;
    }
    
    // Fetch teams for selected season
    const teamsQuery = `season_id == ${selectedSeasonId.value}`;
    await fantasyStore.searchTeams(teamsQuery);
  } catch (error) {
    console.error('Failed to fetch fantasy teams:', error);
    errorMessage.value = 'Failed to load fantasy teams. Please try again later.';
  } finally {
    isLoading.value = false;
  }
};

const onSeasonChange = async () => {
  await fetchData();
};

const loadSeasons = async () => {
  try {
    await seasonStore.fetchSeasons();
    seasons.value = seasonStore.seasons || [];
  } catch (error) {
    console.error('Failed to load seasons:', error);
    seasons.value = [];
  }
};

const viewTeamDetails = (teamId) => {
  selectedTeam.value = teams.value.find(t => t.id === teamId);
  teamDialog.value = true;
};

const closeTeamDialog = () => {
  teamDialog.value = false;
  selectedTeam.value = null;
};

const openCreateDialog = async () => {
  isEditing.value = false;
  dialogErrorMessage.value = null;
  editedTeam.value = {
    id: null,
    name: '',
    season_id: selectedSeasonId.value,
    captain_id: null,
    drafted_team_id: null,
    drafted_race: null,
    player_ids: []
  };
  selectedTierPlayers.value = {
    1: null,
    2: null,
    3: null,
    4: null,
    5: null,
    6: null
  };
  await loadPlayersAndTeams();
  editDialog.value = true;
};

const openEditDialog = async (team) => {
  isEditing.value = true;
  dialogErrorMessage.value = null;
  
  editedTeam.value = {
    id: team.id,
    name: team.name,
    season_id: team.season_id,
    captain_id: team.captain_id,
    drafted_team_id: team.drafted_team_id,
    drafted_race: team.drafted_race,
    player_ids: team.drafted_players?.map(p => p.user_id) || []
  };
  
  // Load players and teams first to ensure tier dropdowns are populated
  await loadPlayersAndTeams();
  
  // Reset tier selections
  selectedTierPlayers.value = {
    1: null,
    2: null,
    3: null,
    4: null,
    5: null,
    6: null
  };
  
  // Populate tier selections from existing players AFTER players are loaded
  if (team.drafted_players && team.drafted_players.length > 0) {
    team.drafted_players.forEach(dp => {
      // Try different possible property names
      const playerId = dp.user_id || dp.id || dp.player_id;
      const player = players.value.find(p => p.id === playerId);
      if (player && player.fantasy_tier) {
        selectedTierPlayers.value[player.fantasy_tier] = player.id;
      }
    });
  }
  
  editDialog.value = true;
};

const closeEditDialog = () => {
  editDialog.value = false;
  dialogErrorMessage.value = null;
  editedTeam.value = {
    id: null,
    name: '',
    season_id: null,
    captain_id: null,
    drafted_team_id: null,
    drafted_race: null,
    player_ids: []
  };
  selectedTierPlayers.value = {
    1: null,
    2: null,
    3: null,
    4: null,
    5: null,
    6: null
  };
};

const saveTeam = async () => {
  // Validate form
  const { valid } = await teamForm.value.validate();
  if (!valid) return;

  // Validate all 6 tiers are selected
  const missingTiers = [];
  for (let tier = 1; tier <= 6; tier++) {
    if (!selectedTierPlayers.value[tier]) {
      missingTiers.push(tier);
    }
  }
  
  if (missingTiers.length > 0) {
    dialogErrorMessage.value = `Please select players for tier(s): ${missingTiers.join(', ')}`;
    return;
  }

  // Build player_ids array from tier selections
  const playerIds = Object.values(selectedTierPlayers.value).filter(id => id !== null);
  
  if (playerIds.length !== 6) {
    dialogErrorMessage.value = 'You must select exactly 6 players (one from each tier)';
    return;
  }

  isSaving.value = true;
  dialogErrorMessage.value = null;
  try {
    const teamData = {
      name: editedTeam.value.name,
      season_id: editedTeam.value.season_id,
      captain_id: editedTeam.value.captain_id,
      drafted_team_id: editedTeam.value.drafted_team_id,
      drafted_race: editedTeam.value.drafted_race
    };

    if (isEditing.value) {
      // Update existing team
      await fantasyStore.updateTeam(editedTeam.value.id, teamData);
      
      // Update players if changed
      const team = teams.value.find(t => t.id === editedTeam.value.id);
      // Get current player IDs - use the same property lookup as in openEditDialog
      const currentPlayerIds = team.drafted_players?.map(p => p.user_id || p.id || p.player_id).filter(id => id) || [];
      
      const playersToAdd = playerIds.filter(id => !currentPlayerIds.includes(id));
      const playersToRemove = currentPlayerIds.filter(id => !playerIds.includes(id));
      
      if (playersToRemove.length > 0) {
        await fantasyStore.removePlayers(editedTeam.value.id, playersToRemove);
      }
      if (playersToAdd.length > 0) {
        await fantasyStore.addPlayers(editedTeam.value.id, playersToAdd);
      }
    } else {
      // Create new team
      const newTeam = await fantasyStore.createTeam(teamData);
      
      // Add players
      if (playerIds.length > 0) {
        await fantasyStore.addPlayers(newTeam.id, playerIds);
      }
    }

    closeEditDialog();
    await fetchData(); // Refresh the list
  } catch (error) {
    console.error('Failed to save team:', error);
    dialogErrorMessage.value = `Failed to ${isEditing.value ? 'update' : 'create'} team: ${error.message || 'Unknown error'}`;
  } finally {
    isSaving.value = false;
  }
};

const loadPlayersAndTeams = async () => {
  try {
    await playerStore.fetchPlayers();
    players.value = playerStore.players || [];
    
    // Organize players by tier
    tierPlayers.value = {
      1: [],
      2: [],
      3: [],
      4: [],
      5: [],
      6: []
    };
    
    players.value.forEach(player => {
      if (player.fantasy_tier >= 1 && player.fantasy_tier <= 6) {
        tierPlayers.value[player.fantasy_tier].push(player);
      }
    });
    
    if (selectedSeasonId.value) {
      await teamStore.fetchTeamsBySeasonBasic(selectedSeasonId.value);
      gnlTeams.value = teamStore.teams || [];
    }
  } catch (error) {
    console.error('Failed to load players and teams:', error);
  }
};

const openDeleteDialog = (team) => {
  teamToDelete.value = team;
  deleteDialog.value = true;
};

const closeDeleteDialog = () => {
  deleteDialog.value = false;
  teamToDelete.value = null;
};

const confirmDelete = async () => {
  if (!teamToDelete.value) return;
  
  isDeleting.value = true;
  errorMessage.value = null;
  try {
    await fantasyStore.deleteTeam(teamToDelete.value.id);
    closeDeleteDialog();
    await fetchData(); // Refresh the list
  } catch (error) {
    console.error('Failed to delete team:', error);
    errorMessage.value = `Failed to delete team: ${error.message || 'Unknown error'}`;
    closeDeleteDialog();
  } finally {
    isDeleting.value = false;
  }
};

const viewScoreBreakdown = async (team) => {
  if (!selectedSeasonId.value) {
    errorMessage.value = 'Please select a season first';
    return;
  }

  breakdownDialog.value = true;
  isLoadingBreakdown.value = true;
  errorMessage.value = null;
  
  try {
    const data = await fantasyStore.getTeamScoreBreakdown(team.id, selectedSeasonId.value);
    breakdownData.value = {
      ...data,
      display_name: `${data.team_name} (${team.captain?.name || team.captain})`
    };
  } catch (error) {
    console.error('Failed to fetch score breakdown:', error);
    errorMessage.value = `Failed to fetch score breakdown: ${error.message || 'Unknown error'}`;
    closeBreakdownDialog();
  } finally {
    isLoadingBreakdown.value = false;
  }
};

const closeBreakdownDialog = () => {
  breakdownDialog.value = false;
  breakdownData.value = null;
};

onMounted(() => {
  loadSeasons();
  fetchData();
  loadPlayersAndTeams();
});
</script>

<style scoped>
.v-chip.gold {
  background-color: #FFD700 !important;
  color: #000 !important;
}

.v-chip.silver {
  background-color: #C0C0C0 !important;
  color: #000 !important;
}
</style>
