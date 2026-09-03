<template>
  <v-overlay v-model="isLoading" persistent class="loading-overlay">
    <v-progress-circular
      indeterminate
      size="64" 
      width="8"
      color="primary"
    ></v-progress-circular>
  </v-overlay>

  <!-- Enhanced Match Header -->
  <div id="matchHeader">
    <v-parallax class="banner-image" :src="bannerImg" height="250">
      <div class="banner-overlay"></div>
      <v-container class="fill-height banner-content">
        <v-row align="center" class="fill-height">
          <!-- Match Info Column -->
          <v-col cols="12" class="text-center">
            <div class="mb-2">
              <v-chip color="primary" size="large" class="mb-2">
                <v-icon start>mdi-calendar-week</v-icon>
                Week {{ match.playday }}
              </v-chip>
              <div v-if="match.date_frame" class="text-subtitle-2 mt-1 text-white">
                <v-icon size="small" color="white">mdi-clock-outline</v-icon>
                {{ match.date_frame }}
              </div>
            </div>

            <!-- Teams Matchup -->
            <v-row align="center" justify="center" class="teams-matchup">
              <v-col cols="5" class="text-center">
                <div class="team-section-header">
                  <h2 class="text-h4 font-weight-bold team-name-header text-white">{{ team1.name }}</h2>
                  <v-chip color="success" size="large" class="mt-2 score-chip-large">
                    {{ match.team1_score || 0 }}
                  </v-chip>
                </div>
              </v-col>
              
              <v-col cols="2" class="text-center">
                <v-icon size="48" color="white">mdi-sword-cross</v-icon>
              </v-col>
              
              <v-col cols="5" class="text-center">
                <div class="team-section-header">
                  <h2 class="text-h4 font-weight-bold team-name-header text-white">{{ team2.name }}</h2>
                  <v-chip color="error" size="large" class="mt-2 score-chip-large">
                    {{ match.team2_score || 0 }}
                  </v-chip>
                </div>
              </v-col>
            </v-row>
          </v-col>
        </v-row>
      </v-container>
    </v-parallax>
  </div>

  <v-container fluid class="pa-4">
    <!-- Week Navigation Panel -->
    <v-card class="mb-4" elevation="2">
      <v-card-text class="pa-3">
        <v-row align="center">
          <v-col cols="12" md="2">
            <v-btn
              variant="elevated"
              color="primary"
              prepend-icon="mdi-calendar-multiple"
              @click="$router.push(`/seasons/${match.season ? seasonSlug(match.season) : match.season_id}`)"
              block
            >
              Back to Season
            </v-btn>
          </v-col>
          <v-col cols="12" md="8" class="pa-0">
            <v-tabs
              :model-value="match.playday"
              bg-color="primary"
              slider-color="white"
              show-arrows
              density="compact"
            >
              <v-tab
                v-for="week in weeklyMatches"
                :key="week.weekNumber"
                :value="week.weekNumber"
              >
                <v-menu location="bottom" :close-on-content-click="true" scroll-strategy="close" activator="parent">
                  <v-list density="compact" max-width="400">
                    <v-list-subheader>Week {{ week.weekNumber }} Matches</v-list-subheader>
                    <v-list-item
                      v-for="matchItem in week.matches"
                      :key="matchItem.id"
                      :active="matchItem.id === match.id"
                      @click.stop="navigateToMatch(matchItem.id)"
                      :class="{ 'bg-primary-lighten-4': matchItem.id === match.id }"
                    >
                      <div class="d-flex align-center justify-space-between w-100">
                        <!-- Team 1 -->
                        <div class="d-flex flex-column align-center" style="width: 45%;">
                          <v-avatar size="32" class="mb-1">
                            <img class="team-icon" :src="teamImageUrl(matchItem.team1_id)" @error="hideMissingImage">
                          </v-avatar>
                          <div class="text-caption text-center">{{ matchItem.team1_name }}</div>
                        </div>
                        
                        <!-- VS -->
                        <div class="text-caption text-grey">vs</div>
                        
                        <!-- Team 2 -->
                        <div class="d-flex flex-column align-center" style="width: 45%;">
                          <v-avatar size="32" class="mb-1">
                            <img class="team-icon" :src="teamImageUrl(matchItem.team2_id)" @error="hideMissingImage">
                          </v-avatar>
                          <div class="text-caption text-center">{{ matchItem.team2_name }}</div>
                        </div>
                      </div>
                    </v-list-item>
                    <v-divider v-if="week.matches.length === 0"></v-divider>
                    <v-list-item v-if="week.matches.length === 0">
                      <v-list-item-title class="text-grey text-center">No matches scheduled</v-list-item-title>
                    </v-list-item>
                  </v-list>
                </v-menu>
                <v-icon start size="small">mdi-calendar-week</v-icon>
                Week {{ week.weekNumber }}
              </v-tab>
            </v-tabs>
          </v-col>
          <v-col cols="12" md="2">
            <v-btn
              variant="elevated"
              color="primary"
              v-if="auth.isAdmin" @click="syncW3CTeams"
              :loading="isLoading"
              block
            >
              <template #prepend><W3CIcon :size="18" /></template>
              Sync W3C
              <v-tooltip activator="parent" location="top">MMR and ladder matches</v-tooltip>
            </v-btn>
          </v-col>
        </v-row>
      </v-card-text>
    </v-card>

    <!-- Series Management Card -->
    <v-card class="mb-4" elevation="2">
      <v-card-title class="d-flex align-center bg-primary">
        <v-icon class="mr-2">mdi-trophy-variant</v-icon>
        Series Management
        <v-spacer></v-spacer>
        <v-chip class="mr-2" size="small" color="success">
          {{ series?.length || 0 }} Published
        </v-chip>
        <v-chip v-if="auth.isCaptain" class="mr-2" size="small" color="warning">
          {{ draftSeries?.length || 0 }} Drafts
        </v-chip>
        <v-btn
          icon="mdi-refresh"
          variant="text"
          color="white"
          size="small"
          @click="fetchMatchSeries"
          :loading="isLoading"
          title="Refresh series data"
        ></v-btn>
      </v-card-title>

      <!-- Tabs for Published vs Draft Series -->
      <v-tabs v-model="seriesViewTab" bg-color="grey-lighten-4" color="primary" align-tabs="center">
        <v-tab value="published">
          <v-icon start>mdi-check-circle</v-icon>
          Published Series
        </v-tab>
        <v-tab v-if="auth.isCaptain" value="draft">
          <v-icon start>mdi-pencil-circle</v-icon>
          Draft Series
        </v-tab>
      </v-tabs>

      <!-- Published Series Table -->
      <v-window v-model="seriesViewTab">
        <v-window-item value="published">
          <v-card-text v-if="series && series.length > 0" class="pa-0">
            <v-toolbar flat height="auto">
              <v-row align="center" class="flex-wrap ma-0 pa-2">
                <v-spacer />
                <v-col cols="12" sm="auto">
                  <v-btn variant="elevated" color="primary" prepend-icon="mdi-plus" v-if="auth.isAdmin" @click="openCreateNewSeries" block>
                    Add Series
                  </v-btn>
                </v-col>
              </v-row>
            </v-toolbar>
            <v-data-table
              v-if="!smAndDown"
              :headers="seriesTableHeader"
              :items="enrichedSeries"
              fixed-header
              hover
              density="comfortable"
            >
              <template v-slot:[`header.p1_w3c_mmr`]="{ column, isSorted, getSortIcon }">
                <W3CMmr :sort-icon="isSorted(column) ? getSortIcon(column) : null" />
              </template>
              <template v-slot:[`header.p2_w3c_mmr`]="{ column, isSorted, getSortIcon }">
                <W3CMmr :sort-icon="isSorted(column) ? getSortIcon(column) : null" />
              </template>
              <template v-slot:loading>
                <v-skeleton-loader type="table-row@10"></v-skeleton-loader>
              </template>

              <template v-slot:item="{ item }">
                <tr class="series-row">
                  <td class="d-none d-md-table-cell">{{ item.id }}</td>
                  <td class="d-none d-md-table-cell">{{ item.caster || '—' }}</td>
                  <td class="text-no-wrap">
                    <span v-if="item.date_time">
                      {{ formateDate(item.date_time) }}
                    </span>
                    <span v-else class="text-grey">Not scheduled</span>
                  </td>
                  <td>
                    <PlayerName :player="item.player1" :race="item.player1.signup_race" :host="item.host_player_id === item.player1.id" @click.stop="showStats(item.player1)" />
                  </td>
                  <td class="d-none d-md-table-cell text-end">
                    <v-chip size="small" color="info">
                      {{ getW3CMMR(item.player1, null, item.player1.signup_race) ?? 'N/A' }}
                    </v-chip>
                    <div class="text-caption text-medium-emphasis">{{ syncedAgo(item.player1) }}<v-tooltip activator="parent" location="top">{{ syncedAt(item.player1) }}</v-tooltip></div>
                  </td>
                  <td class="text-center">
                    <v-chip :color="item.player1_score > item.player2_score ? 'success' : 'default'" size="small">
                      {{ item.player1_score ?? '–' }}
                    </v-chip>
                  </td>
                  <td class="text-center">
                    <v-chip :color="item.player2_score > item.player1_score ? 'success' : 'default'" size="small">
                      {{ item.player2_score ?? '–' }}
                    </v-chip>
                  </td>
                  <td>
                    <PlayerName :player="item.player2" :race="item.player2.signup_race" :host="item.host_player_id === item.player2.id" @click.stop="showStats(item.player2)" />
                  </td>
                  <td class="d-none d-md-table-cell text-end">
                    <v-chip size="small" color="info">
                      {{ getW3CMMR(item.player2, null, item.player2.signup_race) ?? 'N/A' }}
                    </v-chip>
                    <div class="text-caption text-medium-emphasis">{{ syncedAgo(item.player2) }}<v-tooltip activator="parent" location="top">{{ syncedAt(item.player2) }}</v-tooltip></div>
                  </td>
                  <td class="d-none d-md-table-cell text-center">
                    <v-icon v-if="item.is_fantasy_match" icon="mdi-star" color="purple" title="Fantasy match"></v-icon>
                    <span v-else class="text-grey">—</span>
                  </td>
                  <td v-if="auth.isAdmin" class="text-center">
                    <RowActions :actions="seriesActions(item)" />
                  </td>
                </tr>
              </template>
            </v-data-table>
            <div v-else>
              <SeriesCard v-for="item in enrichedSeries" :key="item.id" :series="item" @player="showStats">
                <template #title>
                  <span v-if="item.date_time">{{ formateDate(item.date_time) }}</span>
                  <span v-else>Not scheduled</span>
                </template>
                <template #actions><RowActions :actions="seriesActions(item)" /></template>
                <template #side="{ n, won }">
                  <v-chip size="small" :color="won ? 'success' : 'default'">{{ (n ? item.player2_score : item.player1_score) ?? '–' }}</v-chip>
                </template>
              </SeriesCard>
            </div>
          </v-card-text>

          <!-- Empty State for Published -->
          <v-card-text v-else class="text-center pa-8">
            <v-icon size="64" color="grey-lighten-1">mdi-trophy-broken</v-icon>
            <div class="text-h6 mt-4 text-grey">No published series yet</div>
            <v-btn 
              color="primary" 
              variant="tonal" 
              class="mt-4"
              prepend-icon="mdi-plus"
              v-if="auth.isAdmin" @click="openCreateNewSeries"
            >
              Create Series
            </v-btn>
          </v-card-text>

          <v-card-actions v-if="auth.isAdmin && series && series.length > 0">
            <v-spacer></v-spacer>
            <v-btn 
              variant="text" 
              color="error" 
              prepend-icon="mdi-delete-sweep"
              v-if="auth.isAdmin" @click="openDeleteDialog(null, removeAllSeries)"
            >
              Delete All Published
            </v-btn>
          </v-card-actions>
        </v-window-item>

        <!-- Draft Series Table -->
        <v-window-item v-if="auth.isCaptain" value="draft">
          <v-card-text v-if="draftSeries && draftSeries.length > 0" class="pa-0">
            <v-toolbar flat height="auto">
              <v-row align="center" class="flex-wrap ma-0 pa-2">
                <v-alert type="info" variant="tonal" density="compact" class="ma-2" border="start">
                  <v-icon start>mdi-information</v-icon>
                  Draft series won't appear on the website or affect calculations until an admin publishes them.
                </v-alert>
                <v-spacer />
                <v-col cols="12" sm="auto">
                  <v-btn variant="elevated" color="warning" prepend-icon="mdi-plus" v-if="canDraft" @click="openCreateNewDraftSeries" block>
                    Add Draft Series
                  </v-btn>
                </v-col>
              </v-row>
            </v-toolbar>
            <v-data-table
              v-if="!smAndDown"
              :headers="draftSeriesTableHeader"
              :items="enrichedDraftSeries"
              fixed-header
              hover
              density="comfortable"
            >
              <template v-slot:[`header.p1_w3c_mmr`]="{ column, isSorted, getSortIcon }">
                <W3CMmr :sort-icon="isSorted(column) ? getSortIcon(column) : null" />
              </template>
              <template v-slot:[`header.p2_w3c_mmr`]="{ column, isSorted, getSortIcon }">
                <W3CMmr :sort-icon="isSorted(column) ? getSortIcon(column) : null" />
              </template>
              <template v-slot:loading>
                <v-skeleton-loader type="table-row@10"></v-skeleton-loader>
              </template>

              <template v-slot:item="{ item }">
                <tr class="series-row draft-series-row">
                  <td class="d-none d-md-table-cell">{{ item.id }}</td>
                  <td>
                    <PlayerName :player="item.player1" :race="item.player1.signup_race" :host="item.host_player_id === item.player1.id" @click.stop="showStats(item.player1)" />
                  </td>
                  <td class="d-none d-md-table-cell">
                    <div class="d-flex align-center ga-1">
                      <template v-for="(race, idx) in getOpponentRaceHistory(item.player1)" :key="`p1-${idx}`">
                        <v-avatar v-if="race" size="24" class="race-avatar">
                          <v-img :src="getRaceIconUrl(race)" :alt="race" cover></v-img>
                        </v-avatar>
                      </template>
                      <span v-if="getOpponentRaceHistory(item.player1).length === 0" class="text-grey text-caption">—</span>
                    </div>
                  </td>
                  <td class="d-none d-md-table-cell"><VsRaces :player="ladderById.get(item.player1.id)" :race="item.player2.signup_race" /></td>
                  <td class="d-none d-md-table-cell text-end">
                    <v-chip size="small" color="info">
                      {{ getW3CMMR(item.player1, null, item.player1.signup_race) || '—' }}
                    </v-chip>
                    <div class="text-caption text-medium-emphasis">{{ syncedAgo(item.player1) }}<v-tooltip activator="parent" location="top">{{ syncedAt(item.player1) }}</v-tooltip></div>
                  </td>
                  <td class="d-none d-md-table-cell text-end">
                    <v-chip size="small" color="purple">
                      {{ getHighestW3CMMR(item.player1) || '—' }}
                    </v-chip>
                  </td>
                  <td>
                    <PlayerName :player="item.player2" :race="item.player2.signup_race" :host="item.host_player_id === item.player2.id" @click.stop="showStats(item.player2)" />
                  </td>
                  <td class="d-none d-md-table-cell">
                    <div class="d-flex align-center ga-1">
                      <template v-for="(race, idx) in getOpponentRaceHistory(item.player2)" :key="`p2-${idx}`">
                        <v-avatar v-if="race" size="24" class="race-avatar">
                          <v-img :src="getRaceIconUrl(race)" :alt="race" cover></v-img>
                        </v-avatar>
                      </template>
                      <span v-if="getOpponentRaceHistory(item.player2).length === 0" class="text-grey text-caption">—</span>
                    </div>
                  </td>
                  <td class="d-none d-md-table-cell"><VsRaces :player="ladderById.get(item.player2.id)" :race="item.player1.signup_race" /></td>
                  <td class="d-none d-md-table-cell text-end">
                    <v-chip size="small" color="info">
                      {{ getW3CMMR(item.player2, null, item.player2.signup_race) || '—' }}
                    </v-chip>
                    <div class="text-caption text-medium-emphasis">{{ syncedAgo(item.player2) }}<v-tooltip activator="parent" location="top">{{ syncedAt(item.player2) }}</v-tooltip></div>
                  </td>
                  <td class="d-none d-md-table-cell text-end">
                    <v-chip size="small" color="purple">
                      {{ getHighestW3CMMR(item.player2) || '—' }}
                    </v-chip>
                  </td>
                  <td v-if="auth.isAdmin" class="text-center">
                    <v-icon v-if="item.is_fantasy_match" icon="mdi-star" color="purple" title="Marked to count for fantasy when published"></v-icon>
                    <span v-else class="text-grey">—</span>
                  </td>
                  <td v-if="canDraft" class="text-center">
                    <RowActions :actions="draftActions(item)" />
                  </td>
                </tr>
              </template>
            </v-data-table>
            <div v-else>
              <SeriesCard v-for="item in enrichedDraftSeries" :key="item.id" :series="item" @player="showStats">
                <template #title>
                  <v-icon v-if="item.is_fantasy_match" size="small" color="purple" title="Marked to count for fantasy when published">mdi-star</v-icon>
                </template>
                <template #actions><RowActions v-if="canDraft" :actions="draftActions(item)" /></template>
                <template #side="{ player }">
                  <v-chip size="small" color="info">{{ getW3CMMR(player, null, player.signup_race) || '—' }}</v-chip>
                </template>
              </SeriesCard>
            </div>
          </v-card-text>

          <!-- Empty State for Drafts -->
          <v-card-text v-else class="text-center pa-8">
            <v-icon size="64" color="warning">mdi-pencil-box-outline</v-icon>
            <div class="text-h6 mt-4 text-grey">No draft series yet</div>
            <div class="text-body-2 text-grey mt-2">Drafts let you plan series without affecting the website or calculations</div>
            <v-btn 
              color="warning" 
              variant="tonal" 
              class="mt-4"
              prepend-icon="mdi-plus"
              v-if="canDraft" @click="openCreateNewDraftSeries"
            >
              Create Draft Series
            </v-btn>
          </v-card-text>

          <v-card-actions v-if="auth.isAdmin && draftSeries && draftSeries.length > 0">
            <v-spacer></v-spacer>
            <v-btn 
              variant="text" 
              color="success"
              prepend-icon="mdi-publish"
              v-if="auth.isAdmin" @click="publishAllDraftSeries"
            >
              Publish All Drafts
            </v-btn>
            <v-btn 
              variant="text" 
              color="error" 
              prepend-icon="mdi-delete-sweep"
              v-if="auth.isAdmin" @click="openDeleteDialog(null, removeAllDraftSeries)"
            >
              Delete All Drafts
            </v-btn>
          </v-card-actions>
        </v-window-item>
      </v-window>
    </v-card>

    <!-- Create New Series Dialog -->
    <v-dialog v-model="createNewSeriesDialogOpen" max-width="95vw" max-height="95vh" :fullscreen="smAndDown" persistent>
      <v-card class="d-flex flex-column h-100" :style="smAndDown ? null : 'height: 90vh'">
        <v-card-title class="bg-primary flex-shrink-0">
          <v-icon class="mr-2">mdi-plus-circle</v-icon>
          Add New Series
        </v-card-title>
        
        <v-alert
          v-if="creationSeriesError"
          type="error"
          variant="tonal"
          class="mx-4 mt-4 mb-2 flex-shrink-0"
          border="start"
          border-color="red"
          closable
          @click:close="creationSeriesError = null"
        >
          {{ creationSeriesError }}
        </v-alert>

        <v-card-text class="pa-4 flex-grow-1" style="overflow-y: auto;">
          <v-row class="justify-space-between h-100" dense>
            <template v-for="(s, i) in sideTeams" :key="i">
            <v-col cols="12" md="5" class="d-flex flex-column">
              <v-card elevation="2" class="d-flex flex-column flex-grow-1">
                <v-toolbar color="primary" density="compact" class="flex-shrink-0">
                  <v-avatar size="28" class="ml-3"><img v-if="s.team.id" class="team-icon" :src="teamImageUrl(s.team)" @error="showDefaultTeamImage"></v-avatar>
                  <v-toolbar-title>{{ s.team.name }}</v-toolbar-title>
                  <v-spacer></v-spacer>
                  <v-text-field
                    v-model="searchQueryTeam[i]"
                    density="compact"
                    hide-details
                    :label="`Search Team ${i + 1}`"
                    prepend-inner-icon="mdi-magnify"
                    single-line
                    variant="underlined"
                    clearable
                    class="mr-3"
                    style="max-width: 300px;"
                  ></v-text-field>
                </v-toolbar>
                <v-data-table
                  :headers="tablePlayerHeader"
                  :custom-filter="customFilter"
                  :search="searchQueryTeam[i]"
                  v-model="newSeriesPlayers[i]"
                  :items="s.roster"
                  item-value="id"
                  select-strategy="single"
                  density="compact"
                  multi-sort
                  fixed-header
                  hover
                  show-select
                  class="flex-grow-1"
                >
                  <template v-slot:[`header.p1_w3c_mmr`]="{ column, isSorted, getSortIcon }">
                    <W3CMmr :sort-icon="isSorted(column) ? getSortIcon(column) : null" />
                  </template>
                  <template v-slot:[`header.p2_w3c_mmr`]="{ column, isSorted, getSortIcon }">
                    <W3CMmr :sort-icon="isSorted(column) ? getSortIcon(column) : null" />
                  </template>
                  <template v-slot:loading>
                    <v-skeleton-loader type="table-row@10"></v-skeleton-loader>
                  </template>
                  <template v-slot:[`item.name`]="{ item }">
                    <PlayerName :player="item" :race="item.signup_race" @click.stop="showStats(item)">
                      <v-chip v-if="s.isOut(item)" size="x-small" variant="tonal" color="grey">Out</v-chip>
                    </PlayerName>
                  </template>
                  <template v-slot:[`item.w3c_mmr`]="{ item }">
                    <td>
                      {{ getW3CMMR(item, currentW3CSeason, item.signup_race) || 'N/A' }}
                      <span v-if="mmrSeasonLabel(item, currentW3CSeason, item.signup_race)" class="text-caption text-medium-emphasis ml-1">{{ mmrSeasonLabel(item, currentW3CSeason, item.signup_race) }}</span>
                      <div class="text-caption text-medium-emphasis">{{ syncedAgo(item) }}<v-tooltip activator="parent" location="top">{{ syncedAt(item) }}</v-tooltip></div>
                    </td>
                  </template>
                </v-data-table>
              </v-card>
            </v-col>

            <v-col v-if="i === 0" md="2" class="d-none d-md-flex flex-column align-center justify-center">
              <v-icon size="80" color="primary" class="mb-4">mdi-sword-cross</v-icon>
              <v-btn 
                color="primary"
                variant="elevated"
                v-if="auth.isAdmin" @click="syncW3CTeams"
                :loading="isLoading"
                :disabled="isLoading"
              >
                <template #prepend><W3CIcon :size="18" /></template>
                Sync W3C
                <v-tooltip activator="parent" location="top">MMR and ladder matches</v-tooltip>
              </v-btn>
            </v-col> 
            </template>
          </v-row>     
        </v-card-text>
                      
        <v-card-actions class="px-4 py-3 flex-shrink-0 flex-wrap" style="border-top: 1px solid rgba(0,0,0,0.12);">
          <v-checkbox
            v-model="newSeries_IsDraft"
            label="Create as Draft"
            hide-details
            color="warning"
            :class="smAndDown ? 'w-100' : 'ml-4'"
            :disabled="!auth.isAdmin"
          ></v-checkbox>
          <v-spacer></v-spacer>
          <v-btn 
            variant="text"
            @click="cancelCreateSeries"
          >
            Cancel
          </v-btn>
          <v-btn 
            color="primary"
            prepend-icon="mdi-plus"
            @click="createSeries"
            :disabled="!newSeriesPlayer1 || !newSeriesPlayer2"
          >
            Create Series
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <!-- Edit Series Modal -->
    <v-dialog v-model="editSeriesDialogOpen" max-width="65vw" :fullscreen="smAndDown" persistent>
      <v-card style="display: flex; flex-direction: column; height: 95vh;">
        <v-alert
          v-if="updateSeriesError"
          type="error"
          class="mx-4 my-2"
          dense
          border="start"
          border-color="red"
        >
          {{ updateSeriesError }}
        </v-alert>
        <v-card-title>Edit Series</v-card-title>
        <v-card-text>
          <v-form>
            <v-row dense>
              <v-col cols="12" sm="6">
                <SimpleDatePicker
                  v-model="selectedDate"
                  label="Scheduled Date"
                />
              </v-col>
              <v-col cols="12" sm="6">
                <SimpleTimePicker
                  v-model="selectedTime"
                  label="Scheduled Time"
                />
              </v-col>
              <v-col cols="12" sm="6">
                <v-text-field
                  v-model="selectedSeries.caster"
                  label="Caster:"
                ></v-text-field>
              </v-col>
              <v-col cols="12" sm="6">
                <v-number-input
                  v-model="selectedSeries.player1_score"
                  :label="`${selectedSeries.player1.name} Score`"
                ></v-number-input>
              </v-col>
              <v-col cols="12" sm="6">
                <v-number-input
                  v-model="selectedSeries.player2_score"
                  :label="`${selectedSeries.player2.name} Score`"
                ></v-number-input>
              </v-col>
              <v-col cols="12" sm="6">
                <v-select
                  :items="hostPlayers"
                  label="Choose a Host"
                  v-model="selectedSeries.host_player_id"
                  item-title="battleTag"
                  item-value="id"
                  outlined
                ></v-select>
              </v-col>
              <v-col cols="12" sm="6">
                <v-checkbox
                  v-model="selectedSeries.is_fantasy_match"
                  label="Is Fantasy Match"
                ></v-checkbox>
              </v-col>
            </v-row>
          </v-form>
        </v-card-text>
        <v-card-actions style="position: sticky; bottom: 0; background: white; z-index: 10;">
          <v-btn @click="updateSeries" color="green" prepend-icon="mdi-check">
            Save
          </v-btn>
          <v-btn @click="cancelEditSeries" color="red" prepend-icon="mdi-close">
            Cancel
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <!-- Team Rosters Expansion Panel; proposing series is an admin write -->
    <v-expansion-panels v-if="auth.isAdmin" class="mt-4" v-model="teamRostersPanel">
      <v-expansion-panel>
        <v-expansion-panel-title class="text-h6">
          <v-icon class="mr-2">mdi-account-group</v-icon>
          Team Rosters & Series Proposal
          <template v-slot:actions="{ expanded }">
            <v-icon :icon="expanded ? 'mdi-chevron-up' : 'mdi-chevron-down'"></v-icon>
          </template>
        </v-expansion-panel-title>
        <v-expansion-panel-text>
          <!-- Propose Series Controls -->
          <v-card class="mb-4" variant="tonal" color="primary">
            <v-card-text>
              <v-row align="center">
                <v-col cols="12" md="4">
                  <v-text-field
                    v-model="proposeSeriesMMRDiff"
                    label="Max MMR Difference"
                    type="number"
                    variant="outlined"
                    density="comfortable"
                    prepend-inner-icon="mdi-target"
                    hint="Pairs every selected player across both rosters within this gap; a pair that already has a series is skipped"
                    persistent-hint
                  ></v-text-field>
                </v-col>
                <v-col cols="12" md="8" class="text-right">
                  <v-btn
                    @click="openProposeSeries"
                    :disabled="!isProposeValid"
                    color="primary"
                    variant="elevated"
                    prepend-icon="mdi-lightbulb-on"
                    size="large"
                  >
                    Propose Series
                  </v-btn>
                </v-col>
              </v-row>
            </v-card-text>
          </v-card>

          <!-- Team Rosters -->
          <v-row>
            <v-col cols="12" md="6">
              <v-card elevation="2">
                <v-card-title class="bg-success d-flex align-center">
                  <v-avatar size="28" class="mr-2"><img v-if="team1.id" class="team-icon" :src="teamImageUrl(team1)" @error="showDefaultTeamImage"></v-avatar>
                  {{ team1.name }}
                  <v-chip size="small" class="ml-2" color="white">
                    {{ proposePlayersTeam_1.length }} selected
                  </v-chip>
                </v-card-title>
                <v-card-text class="pa-0">
                  <v-data-table
                    :headers="tablePlayerHeader"
                    :items="roster1"
                    item-value="id"
                    :custom-filter="customFilter"
                    :search="searchQueryTeam[0]"
                    v-model="proposePlayersTeam_1"
                    select-strategy="all"
                    density="comfortable"
                    multi-sort
                    fixed-header
                    hover
                    show-select
                  >
                    <template v-slot:[`header.p1_w3c_mmr`]="{ column, isSorted, getSortIcon }">
                      <W3CMmr :sort-icon="isSorted(column) ? getSortIcon(column) : null" />
                    </template>
                    <template v-slot:[`header.p2_w3c_mmr`]="{ column, isSorted, getSortIcon }">
                      <W3CMmr :sort-icon="isSorted(column) ? getSortIcon(column) : null" />
                    </template>
                    <template v-slot:loading>
                      <v-skeleton-loader type="table-row@10"></v-skeleton-loader>
                    </template>
                    <template v-slot:top>
                      <v-toolbar flat density="compact">
                        <v-text-field
                          v-model="searchQueryTeam[0]"
                          placeholder="Search players..."
                          prepend-inner-icon="mdi-magnify"
                          variant="outlined"
                          density="compact"
                          hide-details
                          single-line
                          clearable
                        ></v-text-field>
                        <v-btn class="ml-2" size="small" variant="text" prepend-icon="mdi-account-check" @click="selectAvailableTeam1">
                          Select available
                        </v-btn>
                      </v-toolbar>
                    </template>
                    <template v-slot:[`item.name`]="{ item }">
                      <PlayerName :player="item" :race="item.signup_race" @click.stop="showStats(item)">
                        <v-chip v-if="outTeam1(item)" size="x-small" variant="tonal" color="grey">Out</v-chip>
                        <v-chip v-else-if="hasSeries(item.id)" size="x-small" variant="tonal" color="grey">Has series</v-chip>
                      </PlayerName>
                    </template>
                    <template v-slot:[`item.w3c_mmr`]="{ item }">
                      <v-chip size="small" color="info">
                        {{ getW3CMMR(item, null, item.signup_race) ?? 'N/A' }}
                      </v-chip>
                      <div class="text-caption text-medium-emphasis">{{ syncedAgo(item) }}<v-tooltip activator="parent" location="top">{{ syncedAt(item) }}</v-tooltip></div>
                    </template>
                  </v-data-table>
                </v-card-text>
              </v-card>
            </v-col>

            <v-col cols="12" md="6">
              <v-card elevation="2">
                <v-card-title class="bg-error d-flex align-center">
                  <v-avatar size="28" class="mr-2"><img v-if="team2.id" class="team-icon" :src="teamImageUrl(team2)" @error="showDefaultTeamImage"></v-avatar>
                  {{ team2.name }}
                  <v-chip size="small" class="ml-2" color="white">
                    {{ proposePlayersTeam_2.length }} selected
                  </v-chip>
                </v-card-title>
                <v-card-text class="pa-0">
                  <v-data-table
                    :headers="tablePlayerHeader"
                    :items="roster2"
                    item-value="id"
                    :custom-filter="customFilter"
                    :search="searchQueryTeam[1]"
                    v-model="proposePlayersTeam_2"
                    select-strategy="all"
                    density="comfortable"
                    multi-sort
                    fixed-header
                    hover
                    show-select
                  >
                    <template v-slot:[`header.p1_w3c_mmr`]="{ column, isSorted, getSortIcon }">
                      <W3CMmr :sort-icon="isSorted(column) ? getSortIcon(column) : null" />
                    </template>
                    <template v-slot:[`header.p2_w3c_mmr`]="{ column, isSorted, getSortIcon }">
                      <W3CMmr :sort-icon="isSorted(column) ? getSortIcon(column) : null" />
                    </template>
                    <template v-slot:loading>
                      <v-skeleton-loader type="table-row@10"></v-skeleton-loader>
                    </template>
                    <template v-slot:top>
                      <v-toolbar flat density="compact">
                        <v-text-field
                          v-model="searchQueryTeam[1]"
                          placeholder="Search players..."
                          prepend-inner-icon="mdi-magnify"
                          variant="outlined"
                          density="compact"
                          hide-details
                          single-line
                          clearable
                        ></v-text-field>
                        <v-btn class="ml-2" size="small" variant="text" prepend-icon="mdi-account-check" @click="selectAvailableTeam2">
                          Select available
                        </v-btn>
                      </v-toolbar>
                    </template>
                    <template v-slot:[`item.name`]="{ item }">
                      <PlayerName :player="item" :race="item.signup_race" @click.stop="showStats(item)">
                        <v-chip v-if="outTeam2(item)" size="x-small" variant="tonal" color="grey">Out</v-chip>
                        <v-chip v-else-if="hasSeries(item.id)" size="x-small" variant="tonal" color="grey">Has series</v-chip>
                      </PlayerName>
                    </template>
                    <template v-slot:[`item.w3c_mmr`]="{ item }">
                      <v-chip size="small" color="info">
                        {{ getW3CMMR(item, null, item.signup_race) ?? 'N/A' }}
                      </v-chip>
                      <div class="text-caption text-medium-emphasis">{{ syncedAgo(item) }}<v-tooltip activator="parent" location="top">{{ syncedAt(item) }}</v-tooltip></div>
                    </template>
                  </v-data-table>
                </v-card-text>
              </v-card>
            </v-col>
          </v-row>
        </v-expansion-panel-text>
      </v-expansion-panel>
    </v-expansion-panels>
  </v-container>

  <!-- Propose Series Dialog -->
  <v-dialog
    id="proposeSeriesModal"
    v-if="showProposeSeriesModal"
    v-model="showProposeSeriesModal"
    max-width="1400px" :fullscreen="smAndDown">
    <v-card>
      <v-card-title class="bg-primary">
        <v-icon class="mr-2">mdi-lightbulb-on</v-icon>
        Proposed Series
      </v-card-title>
      <v-card-subtitle class="pa-3">
        <v-row align="center" justify="center">
          <v-col cols="5" class="text-center">
            <v-chip color="success" size="large">
              <v-avatar start><img class="team-icon" :src="teamImageUrl(team1)" @error="showDefaultTeamImage"></v-avatar>
              {{ team1.name }}
            </v-chip>
          </v-col>        
          <v-col cols="2" class="text-center">
            <v-icon size="large">mdi-sword-cross</v-icon>
          </v-col>        
          <v-col cols="5" class="text-center">
            <v-chip color="error" size="large">
              <v-avatar start><img class="team-icon" :src="teamImageUrl(team2)" @error="showDefaultTeamImage"></v-avatar>
              {{ team2.name }}
            </v-chip>
          </v-col>
        </v-row>
      </v-card-subtitle>
      <v-card-text class="pa-0">
        <v-data-table
          v-if="proposedSeries.length > 0"
          :headers="proposedSeriesTableHeader"
          :items="proposedSeries"
          item-value="key"
          :custom-filter="customFilterSeries"
          :search="searchQuerySeries"
          select-strategy="all"
          density="comfortable"
          v-model="selectedProposedSeries"
          multi-sort
          fixed-header
          hover
          show-select
          :row-props="getRowClass"
        >
          <template v-slot:[`header.p1_w3c_mmr`]="{ column, isSorted, getSortIcon }">
            <W3CMmr :sort-icon="isSorted(column) ? getSortIcon(column) : null" />
          </template>
          <template v-slot:[`header.p2_w3c_mmr`]="{ column, isSorted, getSortIcon }">
            <W3CMmr :sort-icon="isSorted(column) ? getSortIcon(column) : null" />
          </template>
              <template v-slot:loading>
                <v-skeleton-loader type="table-row@10"></v-skeleton-loader>
              </template>
          <template v-slot:top>
            <v-toolbar flat>
              <v-toolbar-title>
                <v-icon class="mr-2">mdi-format-list-bulleted</v-icon>
                Matched Players
              </v-toolbar-title>
              <v-chip size="small" class="ml-2">{{ selectedProposedSeries.length }} selected</v-chip>
              <v-chip v-if="proposeExisting" size="small" class="ml-2" variant="text">{{ proposeExisting }} skipped, already have a series</v-chip>
              <v-spacer></v-spacer>
              <v-text-field
                v-model="searchQuerySeries"
                placeholder="Search by player name..."
                prepend-inner-icon="mdi-magnify"
                variant="outlined"
                density="compact"
                hide-details
                single-line
                clearable
              ></v-text-field>
            </v-toolbar>
          </template>
              <template v-slot:[`item.player1.name`]="{ item }">
                <PlayerName :player="item.player1" :race="item.player1.signup_race" @click.stop="showStats(item.player1)" />
              </template>
              <template v-slot:[`item.player2.name`]="{ item }">
                <PlayerName :player="item.player2" :race="item.player2.signup_race" @click.stop="showStats(item.player2)" />
              </template>
              <template v-slot:[`item.p1_matchup_history`]="{ item }">
                <div class="d-flex align-center ga-1">
                  <template v-for="(race, idx) in getOpponentRaceHistory(item.player1)" :key="`p1-${idx}`">
                    <v-avatar v-if="race" size="24" class="race-avatar">
                      <v-img :src="getRaceIconUrl(race)" :alt="race" cover></v-img>
                    </v-avatar>
                  </template>
                  <span v-if="getOpponentRaceHistory(item.player1).length === 0" class="text-grey text-caption">—</span>
                </div>
              </template>
              <template v-slot:[`item.p2_matchup_history`]="{ item }">
                <div class="d-flex align-center ga-1">
                  <template v-for="(race, idx) in getOpponentRaceHistory(item.player2)" :key="`p2-${idx}`">
                    <v-avatar v-if="race" size="24" class="race-avatar">
                      <v-img :src="getRaceIconUrl(race)" :alt="race" cover></v-img>
                    </v-avatar>
                  </template>
                  <span v-if="getOpponentRaceHistory(item.player2).length === 0" class="text-grey text-caption">—</span>
                </div>
              </template>
              <template v-slot:[`item.p1_vs_race`]="{ item }">
                <VsRaces :player="ladderById.get(item.player1.id)" :race="item.player2.signup_race" />
              </template>
              <template v-slot:[`item.p2_vs_race`]="{ item }">
                <VsRaces :player="ladderById.get(item.player2.id)" :race="item.player1.signup_race" />
              </template>
              <template v-slot:[`item.p1_w3c_mmr`]="{ item }">
                  <td>{{ getW3CMMR(item.player1, null, item.player1.signup_race) ?? 'N/A' }}
                    <div class="text-caption text-medium-emphasis">{{ syncedAgo(item.player1) }}<v-tooltip activator="parent" location="top">{{ syncedAt(item.player1) }}</v-tooltip></div>
                  </td>
              </template>
              <template v-slot:[`item.p1_w3c_high_mmr`]="{ item }">
                  <td>{{ getHighestW3CMMR(item.player1) ?? 'N/A' }}</td>
              </template>
              <template v-slot:[`item.p2_w3c_mmr`]="{ item }">
                  <td>{{ getW3CMMR(item.player2, null, item.player2.signup_race) ?? 'N/A' }}
                    <div class="text-caption text-medium-emphasis">{{ syncedAgo(item.player2) }}<v-tooltip activator="parent" location="top">{{ syncedAt(item.player2) }}</v-tooltip></div>
                  </td>
              </template>
              <template v-slot:[`item.p2_w3c_high_mmr`]="{ item }">
                  <td>{{ getHighestW3CMMR(item.player2) ?? 'N/A' }}</td>
              </template>
          <template v-slot:[`item.actions`]="{ item }">
            <v-btn 
              icon="mdi-delete" 
              variant="text"
              size="small"
              color="error"
              @click.stop="openDeleteDialog(item.key, removeProposedSeries)"
            ></v-btn>
          </template>
        </v-data-table>
        <v-alert v-else type="info" variant="tonal" class="ma-4">
          <template v-if="!proposePairs">Select players on both rosters first.</template>
          <template v-else-if="proposeExisting === proposePairs">Every selected pair already has a series on this match.</template>
          <template v-else-if="proposeExisting">{{ proposeExisting }} of {{ proposePairs }} selected pairs already have a series; the rest are outside the MMR difference.</template>
          <template v-else>No matchups found with current MMR criteria. Try adjusting the MMR difference.</template>
        </v-alert>
      </v-card-text>
      <v-card-actions>
        <v-spacer></v-spacer>
        <v-btn variant="text" @click="cancelProposeSeries">Cancel</v-btn>
        <v-btn 
          color="warning"
          variant="elevated"
          prepend-icon="mdi-pencil"
          @click="createSelectedProposedSeries(true)"
          :disabled="!selectedProposedSeries || selectedProposedSeries.length === 0"
        >
          Create {{ selectedProposedSeries?.length || 0 }} Draft Series
        </v-btn>
        <v-btn 
          color="primary"
          variant="elevated"
          prepend-icon="mdi-publish"
          @click="createSelectedProposedSeries(false)"
          :disabled="!selectedProposedSeries || selectedProposedSeries.length === 0"
        >
          Create {{ selectedProposedSeries?.length || 0 }} Published Series
        </v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>

  <!-- Player Details Dialog -->
  <PlayerDetailsDialog 
    ref="playerDetailsDialog"
    :seasonId="match?.season_id"
    :seasonName="match?.season?.name"
    :w3cSeason="currentW3CSeason"
  />

  <W3CSyncResultDialog v-model="syncDialog" :entries="syncEntries" />

  <ConfirmDeleteDialog
    v-model="showDeleteDialog"
    message="Are you sure you want to delete this item? This action cannot be undone."
    @confirm="confirmDelete"
    @cancel="cancelDeleteDialog"
  />

</template>


<script setup>
import RowActions from '@/components/RowActions.vue';
import SeriesCard from '@/components/SeriesCard.vue';
import ConfirmDeleteDialog from '@/components/ConfirmDeleteDialog.vue';
import bannerImg from '@/assets/media/match-banner.jpg'
import { useRouter } from 'vue-router';
import { seasonSlug } from '@/helpers/season-slug.mjs';
import { ref, onMounted, computed } from 'vue';
import { DateTime } from "luxon";
import { useAuthStore, useAvailabilityStore, useMatchStore, useSeasonStore, useSeriesStore, useTeamStore } from '@/stores';
import { storeToRefs } from 'pinia';
import { useDisplay } from 'vuetify';
import { fetchWrapper } from '@/helpers';
import { useDeleteDialog } from '@/helpers/delete-dialog';
import SimpleTimePicker from '../components/SimpleTimePicker.vue';
import SimpleDatePicker from '../components/SimpleDatePicker.vue';
import PlayerDetailsDialog from '../components/PlayerDetailsDialog.vue';
import { getW3CMMR, mmrSeasonLabel, syncedAgo, syncedAt } from '@/helpers/w3c-stats';
import W3CSyncResultDialog from '@/components/W3CSyncResultDialog.vue';
import W3CMmr from '@/components/W3CMmr.vue';
import W3CIcon from '@/components/W3CIcon.vue';
import VsRaces from '@/components/VsRaces.vue';
import { resolveCurrentW3CSeason } from '@/helpers/current-season';
import { teamImageUrl, hideMissingImage, showDefaultTeamImage } from '@/helpers/team-image';
import { raceWrapper } from '@/helpers/races';
import { useColumns } from '@/helpers/columns';


// Stores initialization
const router = useRouter();
const { smAndDown } = useDisplay();
const matchStore = useMatchStore();
const seriesStore = useSeriesStore();
const teamStore = useTeamStore();
const seasonStore = useSeasonStore();
const availabilityStore = useAvailabilityStore();
const auth = useAuthStore();
const { match } = storeToRefs(matchStore);
const { series, draftSeries } = storeToRefs(seriesStore);

// Week navigation state
const weeklyMatches = ref([]);

const allSeriesTableHeader = computed(() => [

  { mobile: false, title: 'ID', value: 'id', sortable: true },  
  { mobile: false, title: 'Caster'},  
  { title: 'Date/Time'}, 
  { title: 'Player 1', value: 'player1.name', sortable: true },
  { mobile: false, title: 'MMR', value: 'p1_w3c_mmr', sortable: true, sortRaw: (a, b) => {
    let aValue = getW3CMMR(a?.player1, currentW3CSeason.value, a?.player1?.signup_race) || 0;
    let bValue = getW3CMMR(b?.player1, currentW3CSeason.value, b?.player1?.signup_race) || 0;
    return aValue - bValue;
  } },
  { title: 'P1 Score' },
  { title: 'P2 Score' },
  { title: 'Player 2', value: 'player2.name', sortable: true },
  { mobile: false, title: 'MMR', value: 'p2_w3c_mmr', sortable: true, sortRaw: (a, b) => {
    let aValue = getW3CMMR(a?.player2, currentW3CSeason.value, a?.player2?.signup_race) || 0;
    let bValue = getW3CMMR(b?.player2, currentW3CSeason.value, b?.player2?.signup_race) || 0;
    return aValue - bValue;
  }},
  { mobile: false, title: 'Fantasy Match'},
  ...(auth.isAdmin ? [{ title: '', value: 'actions', sortable: false }] : []),
]);
const seriesTableHeader = useColumns(allSeriesTableHeader);

const allDraftSeriesTableHeader = computed(() => [
  { mobile: false, title: 'ID', value: 'id', sortable: true },  
  { title: 'Player 1', value: 'player1.name', sortable: true },
  { mobile: false, title: 'Faced Races', key: 'p1_matchup_history', sortable: false },
  { mobile: false, title: 'vs race', key: 'p1_vs_race', sortable: false },
  { mobile: false, title: 'Current MMR', value: 'p1_w3c_mmr', sortable: true, sortRaw: (a, b) => {
    let aValue = getW3CMMR(a?.player1, currentW3CSeason.value, a?.player1?.signup_race) || 0;
    let bValue = getW3CMMR(b?.player1, currentW3CSeason.value, b?.player1?.signup_race) || 0;
    return aValue - bValue;
  } },
  { mobile: false, title: 'Highest MMR', key: 'p1_w3c_high_mmr', sortable: true, sortRaw: (a, b) => {
    let aValue = getHighestW3CMMR(a?.player1) || 0;
    let bValue = getHighestW3CMMR(b?.player1) || 0;
    return aValue - bValue;
  }},
  { title: 'Player 2', value: 'player2.name', sortable: true },
  { mobile: false, title: 'Faced Races', key: 'p2_matchup_history', sortable: false },
  { mobile: false, title: 'vs race', key: 'p2_vs_race', sortable: false },
  { mobile: false, title: 'Current MMR', value: 'p2_w3c_mmr', sortable: true, sortRaw: (a, b) => {
    let aValue = getW3CMMR(a?.player2, currentW3CSeason.value, a?.player2?.signup_race) || 0;
    let bValue = getW3CMMR(b?.player2, currentW3CSeason.value, b?.player2?.signup_race) || 0;
    return aValue - bValue;
  }},
  { mobile: false, title: 'Highest MMR', key: 'p2_w3c_high_mmr', sortable: true, sortRaw: (a, b) => {
    let aValue = getHighestW3CMMR(a?.player2) || 0;
    let bValue = getHighestW3CMMR(b?.player2) || 0;
    return aValue - bValue;
  }},
  ...(auth.isAdmin ? [{ title: 'Fantasy on publish' }] : []),
  ...(canDraft.value ? [{ title: '', value: 'actions', sortable: false }] : []),
]);
const draftSeriesTableHeader = useColumns(allDraftSeriesTableHeader);

const proposedSeriesTableHeader = [
  { title: 'Player 1', value: 'player1.name', width:'300px', sortable: true },
  { title: 'Faced Races', key: 'p1_matchup_history', sortable: false },
  { title: 'vs race', key: 'p1_vs_race', sortable: false },
  { title: 'Current MMR', key: 'p1_w3c_mmr', sortable: true, sortRaw: (a, b) => {
    let aValue = getW3CMMR(a?.player1, null, a?.player1?.signup_race) || 0;
    let bValue = getW3CMMR(b?.player1, null, b?.player1?.signup_race) || 0;
    return aValue - bValue;
  }},
  { title: 'Highest Race MMR', key: 'p1_w3c_high_mmr', sortable: true, sortRaw: (a, b) => {
    let aValue = getHighestW3CMMR(a?.player1) || 0;
    let bValue = getHighestW3CMMR(b?.player1) || 0;
    return aValue - bValue;
  }},
  { title: 'Player 2', value: 'player2.name', width:'300px', sortable: true },
  { title: 'Faced Races', key: 'p2_matchup_history', sortable: false },
  { title: 'vs race', key: 'p2_vs_race', sortable: false },
  { title: 'Current MMR', key: 'p2_w3c_mmr', sortable: true, sortRaw: (a, b) => {
    let aValue = getW3CMMR(a?.player2, null, a?.player2?.signup_race) || 0;
    let bValue = getW3CMMR(b?.player2, null, b?.player2?.signup_race) || 0;
    return aValue - bValue;
  }},
  { title: 'Highest Race MMR', key: 'p2_w3c_high_mmr', sortable: true, sortRaw: (a, b) => {
    let aValue = getHighestW3CMMR(a?.player2) || 0;
    let bValue = getHighestW3CMMR(b?.player2) || 0;
    return aValue - bValue;
  }
  },
  { title: '', value: 'actions', sortable: true }, 
];

const tablePlayerHeader = computed(() => [
  { title: 'Name', value: 'name', sortable: true },
  { title: currentW3CSeason.value ? `MMR (S${currentW3CSeason.value})` : 'MMR', key: 'w3c_mmr', value: 'item', sortable: true, sortRaw: (a, b) => {
    let aValue = getW3CMMR(a, currentW3CSeason.value, a?.signup_race) || 0;
    let bValue = getW3CMMR(b, currentW3CSeason.value, b?.signup_race) || 0;
    return aValue - bValue;
  }
},
]);

// Route params - use computed to get the current route param
const matchId = computed(() => router.currentRoute.value.params.id);

// a captain writes the draft of the matches their own team plays; an admin any
const canDraft = computed(() => auth.isAdmin || (auth.me?.team?.id != null
  && [matchStore.match?.team1_id, matchStore.match?.team2_id].includes(auth.me.team.id)));

// Component state
const isLoading = ref(false);

// Team state
const backendUrl = `${import.meta.env.VITE_BACKEND_URL}`;

const team1 = ref({});
const team2 = ref({});
// The season ladder record of every signup, by user id, for the record against each race
const ladderById = ref(new Map());
const extraPlayersById = ref({});

// Full players for the series tables: rosters first, fetched extras second.
// The series routes answer reduced players, so the stats come from here.
const seriesPlayerById = computed(() => {
  const map = {};
  for (const team of [team1.value, team2.value]) {
    for (const list of Object.values(team?.player_by_season || {})) {
      for (const player of list || []) map[player.id] = player;
    }
  }
  return { ...map, ...extraPlayersById.value };
});

const withFullPlayers = (row) => ({
  ...row,
  player1: seriesPlayerById.value[row.player1_id] || row.player1,
  player2: seriesPlayerById.value[row.player2_id] || row.player2,
});

const enrichedSeries = computed(() => (series.value || []).map(withFullPlayers));
const enrichedDraftSeries = computed(() => (draftSeries.value || []).map(withFullPlayers));

// Fetch the series players the rosters do not hold
const loadMissingSeriesPlayers = async () => {
  const ids = new Set();
  for (const row of [...(series.value || []), ...(draftSeries.value || [])]) {
    for (const id of [row.player1_id, row.player2_id]) {
      if (id && !seriesPlayerById.value[id]) ids.add(id);
    }
  }
  if (ids.size === 0) return;
  const query = [...ids].map(id => `id == ${id}`).join(' or ');
  try {
    const found = await fetchWrapper.post(`${backendUrl}/users/search?query=${encodeURIComponent(query)}`);
    for (const player of found || []) extraPlayersById.value[player.id] = player;
  } catch (error) {
    console.error('Failed to load series players:', error);
  }
};

// Series state
const createNewSeriesDialogOpen = ref(false);
const newSeriesPlayers = ref([[], []]);
const newSeries_IsDraft = ref(false);
const editSeriesDialogOpen = ref(false);
const selectedSeries = ref(null);
const hostPlayers = ref(null);
const selectedDate = ref(null);
const selectedTime = ref(null);
const creationSeriesError = ref(null);
const updateSeriesError = ref('');

// UI state
const teamRostersPanel = ref(null);
const seriesViewTab = ref('published'); // 'published' or 'draft'

// Propose series state
const showProposeSeriesModal = ref(false);
const proposePlayersTeam_1 = ref([]);
const proposePlayersTeam_2 = ref([]);
const proposeSeriesMMRDiff = ref(null);
const proposedSeries = ref([]);
const proposePairs = ref(0);  // selected pairs on the last proposal
const proposeExisting = ref(0);  // of those, pairs that already had a series
const selectedProposedSeries = ref([]);

// Search state
const searchQueryTeam = ref(['', '']);
const searchQuerySeries = ref('');

// Player details state
const playerDetailsDialog = ref(null);

// Sync state
const syncDialog = ref(false);
const syncEntries = ref([]);

// Delete dialog state
const { showDeleteDialog, openDeleteDialog, confirmDelete, cancelDeleteDialog } = useDeleteDialog();

// Current W3C season for stats fallback
const currentW3CSeason = ref(null);

// Helper to get highest MMR across all races, preferring current season with fallback to previous
const getHighestW3CMMR = (player) => {
  if (!player || !player.w3c_stats || player.w3c_stats.length === 0) return null;
  const season = currentW3CSeason.value;
  const getMax = (entries) => entries.length > 0 ? Math.max(...entries.map(s => s.mmr || 0)) : null;
  if (season) {
    const current = player.w3c_stats.filter(s => s.wc3_season === season);
    if (current.length > 0) return getMax(current);
    const prev = player.w3c_stats.filter(s => s.wc3_season === season - 1);
    if (prev.length > 0) return getMax(prev);
  }
  const maxSeason = Math.max(...player.w3c_stats.map(s => s.wc3_season || 0));
  return getMax(player.w3c_stats.filter(s => s.wc3_season === maxSeason));
};

// Computed properties
const roster1 = computed(() => team1.value?.player_by_season?.[matchStore.match?.season_id] || []);
const roster2 = computed(() => team2.value?.player_by_season?.[matchStore.match?.season_id] || []);
// The tables hold ids, so a roster reload never leaves a selection pointing at a stale row
const playersById = (roster, ids) => roster.filter(p => ids.includes(p.id));

// Who said they cannot play this week; no answer counts as available and nothing is ever blocked
const availability1 = ref([]);
const availability2 = ref([]);

const isOut = (rows, playerId) => rows.some(
  row => row.user_id === playerId && row.playday === match.value?.playday && row.available === false
);
const outTeam1 = (player) => isOut(availability1.value, player.id);
const outTeam2 = (player) => isOut(availability2.value, player.id);
// Already in a series on this match, published or draft; a second one is allowed by hand
const hasSeries = (playerId) => [...(series.value || []), ...(draftSeries.value || [])]
  .some(s => s.player1_id === playerId || s.player2_id === playerId);
const sideTeams = computed(() => [
  { team: team1.value, roster: roster1.value, isOut: outTeam1 },
  { team: team2.value, roster: roster2.value, isOut: outTeam2 },
]);

// The default selection: everyone who did not say they cannot play this week (#33)
const selectAvailableTeam1 = () => {
  proposePlayersTeam_1.value = roster1.value.filter(p => !outTeam1(p)).map(p => p.id);
};
const selectAvailableTeam2 = () => {
  proposePlayersTeam_2.value = roster2.value.filter(p => !outTeam2(p)).map(p => p.id);
};
const selectAvailable = () => { selectAvailableTeam1(); selectAvailableTeam2(); };

// A captain reads their own team only, so the team they cannot read stays empty
const fetchAvailability = async () => {
  const { team1_id, team2_id, season_id } = matchStore.match;
  const read = (teamId) => (teamId && (auth.isAdmin || auth.me?.team?.id === teamId)
    ? availabilityStore.fetchTeamAvailability(teamId, season_id).catch(() => [])
    : Promise.resolve([]));
  [availability1.value, availability2.value] = await Promise.all([read(team1_id), read(team2_id)]);
};
const newSeriesPlayer1 = computed(() => playersById(roster1.value, newSeriesPlayers.value[0])[0]);
const newSeriesPlayer2 = computed(() => playersById(roster2.value, newSeriesPlayers.value[1])[0]);
const selectedProposed = computed(() => proposedSeries.value.filter(ps => selectedProposedSeries.value.includes(ps.key)));
const proposedKey = (p1, p2) => `${p1.id}-${p2.id}`;

const isProposeValid = computed(() => 
  proposePlayersTeam_1.value != null && 
  proposePlayersTeam_2.value != null && 
  proposeSeriesMMRDiff.value != null
);

const formateDate = ( dateToFormat ) => {
  if (!dateToFormat) {
    return dateToFormat;
  }
  // Backend stores UTC, convert to ET for display
  const formatedDate = DateTime.fromISO(dateToFormat, { zone: 'UTC' })
    .setZone('America/New_York')
    .toLocaleString({ month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' });  // the season page carries the year
  return formatedDate
}

const customFilter = (value, search, item) => {
  if (!search) return true;
  search = search.toLowerCase();
  // Check if the search query matches the name or Discord fields
  return (
    item.raw.name.toLowerCase().includes(search) ||
    item.raw.discordTag.toLowerCase().includes(search)
  );
}

const getRowClass = item => {
  // Highlight if this exact matchup is selected
  const isMatchSelected = selectedProposedSeries.value.includes(item.item.key);
  if(isMatchSelected){
    return {class: 'highlight-selected-row'}; 
  }
  
  // Highlight if either player already has a series created (published or draft)
  const playerHasSeries = (series.value && series.value.some(
    sel => sel.player1.id === item.item.player1.id || sel.player2.id === item.item.player2.id
  )) || (draftSeries.value && draftSeries.value.some(
    sel => sel.player1.id === item.item.player1.id || sel.player2.id === item.item.player2.id
  ));
  if(playerHasSeries){
    return {class: 'highlight-row'}; 
  }
  
  // Highlight if either player is in the selected proposed series
  const isPlayerSelected = selectedProposed.value.some(
    sel => sel.player1.id === item.item.player1.id || sel.player2.id === item.item.player2.id
  );
  return {class: isPlayerSelected ? 'highlight-row' : ''};
};


const customFilterSeries = (value, search, item) => {
  if (!search) return true;
  search = search.toLowerCase();
  // Check if the search query matches the name or Discord fields
  return (
    item.raw.player1.name.toLowerCase().includes(search) ||
    item.raw.player2.name.toLowerCase().includes(search)
  );
}



const openCreateNewSeries = () => {
  createNewSeriesDialogOpen.value = true;
  newSeriesPlayers.value = [[], []];
  newSeries_IsDraft.value = false;
  creationSeriesError.value = null;
};

const openCreateNewDraftSeries = () => {
  createNewSeriesDialogOpen.value = true;
  newSeriesPlayers.value = [[], []];
  newSeries_IsDraft.value = true; // Force draft mode
  creationSeriesError.value = null;
};

const cancelCreateSeries = () => {
  createNewSeriesDialogOpen.value = false;
};

const navigateToMatch = async (newMatchId) => {
  if (newMatchId === match.value.id) return; // Already on this match
  
  // Navigate to the new match
  await router.push(`/match/${newMatchId}`);
  
  // Reload the page data with the new match ID
  isLoading.value = true;
  try {
    await matchStore.fetchMatchDetails(newMatchId);
    await Promise.all([
      matchStore.match.team1_id && matchStore.match.team2_id ? fetchTeamDetails() : null,
      fetchSeriesRows(),
      fetchAvailability(),
    ]);
    selectAvailable();
    await loadMissingSeriesPlayers();
  } catch (error) {
    console.error('Failed to fetch match details:', error);
  } finally {
    isLoading.value = false;
  }
};

const fetchSeasonMatches = async () => {
  if (!match.value?.season_id) return;

  try {
    const seasonMatches = await matchStore.searchMatchesBySeason(match.value.season_id);
    const numberOfWeeks = match.value.season?.number_weeks
      || Math.max(0, ...seasonMatches.map(m => m.playday || 0));

    weeklyMatches.value = Array.from({ length: numberOfWeeks }, (_, i) => ({
      weekNumber: i + 1,
      matches: seasonMatches.filter(m => m.playday === i + 1),
    }));
  } catch (error) {
    console.error('Failed to fetch season matches:', error);
  }
};

const fetchMatchDetails = async () => {
  isLoading.value = true;
  try {
    await matchStore.fetchMatchDetails(matchId.value);
    // The rosters, the series rows and the season navigation do not depend on each other
    await Promise.all([
      matchStore.match.team1_id && matchStore.match.team2_id ? fetchTeamDetails() : null,
      fetchSeriesRows(),
      fetchSeasonMatches(),
      fetchAvailability(),
      fetchLadderPlayers(),
    ]);
    selectAvailable();
    await loadMissingSeriesPlayers();
  } catch (error) {
    console.error('Failed to fetch match details:', error);
  } finally {
    isLoading.value = false;
  }
};

const fetchLadderPlayers = async () => {
  try {
    const rows = await seasonStore.fetchSeasonLadderPlayers(matchStore.match.season_id);
    ladderById.value = new Map(rows.map(p => [p.id, p]));
  } catch (error) {
    console.error('Failed to fetch ladder players:', error);
  }
};

const fetchTeamDetails = async () => {
  try {
    const { team1_id, team2_id, season_id } = matchStore.match;
    [team1.value, team2.value] = await Promise.all([
      teamStore.getTeamDetailsSeason(team1_id, season_id),
      teamStore.getTeamDetailsSeason(team2_id, season_id),
    ]);
  } catch (error) {
    console.error('Failed to fetch match details:', error);
  }
};

const syncEntry = (title, settled) =>
  settled.status === 'fulfilled' ? { title, result: settled.value } : { title, error: settled.reason };

const syncW3CTeams = async () => {
  isLoading.value = true;
  syncEntries.value = [];
  syncDialog.value = true;

  const [r1, r2] = await Promise.allSettled([
    teamStore.syncPlayersW3C(matchStore.match.team1_id, matchStore.match.season_id),
    teamStore.syncPlayersW3C(matchStore.match.team2_id, matchStore.match.season_id),
  ]);
  syncEntries.value = [syncEntry(team1.value.name, r1), syncEntry(team2.value.name, r2)];

  try {
    await fetchTeamDetails();
  } catch (error) {
    console.error('Failed to refresh team details after sync:', error);
  }

  isLoading.value = false;
};

const showStats = async(player) => {
  playerDetailsDialog.value.open(player);
}

const fetchSeriesRows = () => Promise.all([
  seriesStore.getSeriesByMatchId(matchId.value),
  auth.isCaptain && seriesStore.getDraftSeriesByMatchId(matchId.value),  // drafts are captain-only on the backend
]);

const fetchMatchSeries = async () => {
  isLoading.value = true;
  try {
    await fetchSeriesRows();
    await loadMissingSeriesPlayers();
  } catch (error) {
    console.error('Failed to fetch match series:', error);
  } finally {
    isLoading.value = false;
  }
};

const seriesActions = (item) => [
  { icon: 'mdi-pencil', label: 'Edit Series', onClick: () => editSeries(item) },
  { icon: 'mdi-map-outline', label: 'Map veto', onClick: () => router.push(`/player-series/${item.id}/veto`) },
  { icon: 'mdi-delete', label: 'Delete Series', color: 'error', onClick: () => openDeleteDialog(item.id, removeSeries) },
];
const draftActions = (item) => [
  { icon: item.is_fantasy_match ? 'mdi-star-off' : 'mdi-star', label: item.is_fantasy_match ? 'Remove from Fantasy' : 'Mark as Fantasy Match', color: item.is_fantasy_match ? 'orange' : 'purple', onClick: () => toggleDraftFantasyMatch(item) },
  { icon: 'mdi-publish', label: 'Publish Series', color: 'success', onClick: () => publishDraftSeries(item) },
  { icon: 'mdi-delete', label: 'Delete Draft', color: 'error', public: canDraft.value, onClick: () => openDeleteDialog(item.id, removeDraftSeries) },
];

const editSeries = async (seriesItem) => {
  const copy_series =  { ...seriesItem };
  // Mark if this is a draft for proper update routing
  copy_series.isDraft = seriesViewTab.value === 'draft';
  updateSeriesError.value = '';
  selectedSeries.value = copy_series;
  if (copy_series.date_time) {
    // Backend stores UTC, convert to ET for display in date picker
    const initialDateTime = DateTime.fromISO(copy_series.date_time, { zone: 'UTC' })
      .setZone('America/New_York');
    
    // Create date in local timezone but with ET date/time values (no conversion)
    selectedDate.value = new Date(
      initialDateTime.year,
      initialDateTime.month - 1,
      initialDateTime.day
    );
    selectedTime.value = initialDateTime.toFormat("HH:mm"); // Time only
  }

  hostPlayers.value = [copy_series.player1, copy_series.player2];
  editSeriesDialogOpen.value = true;
};
const cancelEditSeries = async () => {
  editSeriesDialogOpen.value = false;
}

const updateSeries = async () => {
  isLoading.value = true;
  updateSeriesError.value = '';
  try{
    // Only process date/time if both are provided
    if (selectedDate.value && selectedTime.value) {
      // Get date components from the local date picker (which shows ET values)
      const year = selectedDate.value.getFullYear();
      const month = selectedDate.value.getMonth() + 1; // getMonth() is 0-indexed
      const day = selectedDate.value.getDate();
      
      // Parse user input as ET timezone, then convert to UTC for backend
      const etDateTime = DateTime.fromISO(
        `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}T${selectedTime.value}`, 
        { zone: "America/New_York" }
      );
      
      // Convert to UTC and format as ISO string without 'Z' (backend expects this format)
      const utcDateTime = etDateTime.toUTC();
      selectedSeries.value.date_time = utcDateTime.toFormat("yyyy-MM-dd'T'HH:mm:ss");
    } else {
      // If date/time not set, ensure it's null
      selectedSeries.value.date_time = null;
    }
    
    // Update either draft or published series depending on type
    if (selectedSeries.value.isDraft) {
      await seriesStore.updateDraftSeries(selectedSeries.value);
    } else {
      await seriesStore.updateSeries(selectedSeries.value);
    }
    await fetchMatchSeries(); // Refresh match details after update
    cancelEditSeries();
  } catch (error) {
    console.error('Error updating series:', error);
    const detail = error?.error || error?.message || String(error);
    updateSeriesError.value = 'Error updating series: ' + detail;
  } finally {
    isLoading.value = false;
  }
}

const removeProposedSeries = (key) => {
  proposedSeries.value = proposedSeries.value.filter(series => series.key !== key);

}

// Get opponent races from player's gnl_stats matchup_history for the current season
const getOpponentRaceHistory = (player) => {
  if (!player || !player.gnl_stats || player.gnl_stats.length === 0) {
    return [];
  }
  
  // Find the entry for the current season; fall back to nothing if absent
  const currentSeasonId = match.value?.season_id;
  const currentSeasonStats = currentSeasonId
    ? player.gnl_stats.find(s => s.season_id === currentSeasonId)
    : player.gnl_stats[0];
  return currentSeasonStats?.matchup_history || [];
};

// Helper: count how many series are hosted by team1 vs team2
// For every series, host_player_id === player1.id means team1 is hosting
const countTeamHosts = (seriesList) => {
  let team1Hosts = 0;
  let team2Hosts = 0;
  for (const s of seriesList) {
    if (s.host_player_id === s.player1.id) team1Hosts++;
    else if (s.host_player_id === s.player2.id) team2Hosts++;
  }
  return { team1Hosts, team2Hosts };
};

// Helper: return the player id that should host next to keep counts balanced
// player1 is always from team1, player2 from team2
const getAutoHostPlayerId = (player1, player2, team1HostCount, team2HostCount) => {
  return team1HostCount > team2HostCount ? player2.id : player1.id;
};

// Get race icon URL from race code
const getRaceIconUrl = (race) => raceWrapper.getRaceObject(race)?.icon || '';

const proposeSeries = async () => {
  isLoading.value = true;
  try {
    const kept = selectedProposed.value;
    proposedSeries.value = []
    let t1_player = playersById(roster1.value, proposePlayersTeam_1.value);
    let t2_player = playersById(roster2.value, proposePlayersTeam_2.value);
    proposePairs.value = t1_player.length * t2_player.length;
    proposeExisting.value = 0;

    for(let i = 0; i< t1_player.length; i++) {
      let p1 = t1_player[i];
      let p1_mmr = getW3CMMR(p1, null, p1.signup_race) || 0;
      
      for(let k=0;k< t2_player.length; k++) {
        let p2_mmr = 0;
        let p2 = t2_player[k];
        
        // Check if series already exists (in either regular series or draft series)
        if(series.value != null || draftSeries.value != null) {
          let seriesExists = false;
          // Check published series
          if (series.value) {
            for (let n = 0; n < series.value.length; n++){
              let s = series.value[n];
              if(p1.id == s.player1_id && p2.id == s.player2_id){
                seriesExists = true;
                break;
              }
            }
          }
          // Check draft series
          if (!seriesExists && draftSeries.value) {
            for (let n = 0; n < draftSeries.value.length; n++){
              let s = draftSeries.value[n];
              if(p1.id == s.player1_id && p2.id == s.player2_id){
                seriesExists = true;
                break;
              }
            }
          }
          if(seriesExists){
            proposeExisting.value++;
            continue;
          }
        }

        const keptSeries = kept.find(sPropS => sPropS.key === proposedKey(p1, p2));
        if(keptSeries) {
          proposedSeries.value.push(keptSeries);
          continue;
        }

        p2_mmr = getW3CMMR(p2, null, p2.signup_race) || 0;
        
        let mmr_diff = p1_mmr - p2_mmr;
        if (mmr_diff<0){
          mmr_diff*=-1
        }
        if(mmr_diff <= proposeSeriesMMRDiff.value){
          const newSeries = {}
          newSeries.key = proposedKey(p1, p2)
          newSeries.match_id = matchStore.match.id
          newSeries.season_id = matchStore.match.season_id
          newSeries.host_player_id = p1.id
          newSeries.player1_score = 0
          newSeries.player2_score = 0
          newSeries.player1_id = p1.id
          newSeries.player1 = p1
          newSeries.player2_id = p2.id
          newSeries.player2 = p2
          proposedSeries.value.push(newSeries)
        }
      }
    }
    selectedProposedSeries.value = selectedProposedSeries.value.filter(key =>
      proposedSeries.value.some(ps => ps.key === key)
    );
  } catch (error) {
    console.error('Failed to fetch match details:', error);
  } finally {
    isLoading.value = false;
  }
};

const openProposeSeries = async () => {
  proposeSeries();
  showProposeSeriesModal.value = true;
};
const cancelProposeSeries = () => {
  showProposeSeriesModal.value = false;
};

const createSelectedProposedSeries = async (isDraft = false) => {
  
  isLoading.value = true;
  try {
    // Start host counts from series already on this match
    const baseSeries = isDraft
      ? [...(series.value || []), ...(draftSeries.value || [])]
      : [...(series.value || [])];
    let { team1Hosts, team2Hosts } = countTeamHosts(baseSeries);

    for (const ps of selectedProposed.value) {
      const hostId = getAutoHostPlayerId(ps.player1, ps.player2, team1Hosts, team2Hosts);
      const seriesWithHost = { ...ps, host_player_id: hostId };

      if (isDraft) {
        await seriesStore.createDraftSeries(seriesWithHost);
      } else {
        await seriesStore.createSeries(seriesWithHost);
      }

      // Track new host for subsequent iterations
      if (hostId === ps.player1.id) team1Hosts++; else team2Hosts++;
    }

    await fetchMatchSeries(); // Refresh match details after creation
    cancelProposeSeries();
  } catch (error) {
    console.error('Failed to create series:', error);
  } finally {
    isLoading.value = false;
  }
};

const createSeries = async () => {
  const newSeries = {}

  newSeries.match_id = matchStore.match.id
  newSeries.season_id = matchStore.match.season_id
  newSeries.player1_score = 0
  newSeries.player2_score = 0
  newSeries.player1_id = newSeriesPlayer1.value.id
  newSeries.player2_id = newSeriesPlayer2.value.id

  // Auto-assign host to keep counts balanced between teams
  const allCurrent = [...(series.value || []), ...(draftSeries.value || [])];
  const { team1Hosts, team2Hosts } = countTeamHosts(allCurrent);
  newSeries.host_player_id = getAutoHostPlayerId(
    newSeriesPlayer1.value,
    newSeriesPlayer2.value,
    team1Hosts,
    team2Hosts
  );
  
  isLoading.value = true;
  try {
    // Create as draft or published series based on checkbox
    if (newSeries_IsDraft.value) {
      await seriesStore.createDraftSeries(newSeries);
    } else {
      await seriesStore.createSeries(newSeries);
    }
    await fetchMatchSeries(); // Refresh match details after creation
    cancelCreateSeries();
  } catch (error) {
    console.error('Failed to create series:', error);
  } finally {
    isLoading.value = false;
  }
};

const removeSeries = async (seriesId) => {
  isLoading.value = true;
  try {
    await seriesStore.deleteSeries(seriesId);
    await fetchMatchDetails(); // Refresh match details after removal
  } catch (error) {
    console.error('Failed to remove series:', error);
  } finally {
    isLoading.value = false;
  }
};

const removeDraftSeries = async (draftSeriesId) => {
  isLoading.value = true;
  try {
    await seriesStore.deleteDraftSeries(draftSeriesId);
    await fetchMatchSeries(); // Refresh after removal
  } catch (error) {
    console.error('Failed to remove draft series:', error);
  } finally {
    isLoading.value = false;
  }
};

const removeAllSeries = async () => {
  isLoading.value = true;
  try {
    await seriesStore.deleteAllSeries()
    await fetchMatchDetails(); // Refresh match details after removal
  } catch (error) {
    console.error('Failed to remove series:', error);
  } finally {
    isLoading.value = false;
  }
};

const removeAllDraftSeries = async () => {
  isLoading.value = true;
  try {
    await seriesStore.deleteAllDraftSeriesForMatch(matchId.value);
    await fetchMatchSeries(); // Refresh after removal
  } catch (error) {
    console.error('Failed to remove draft series:', error);
  } finally {
    isLoading.value = false;
  }
};

const publishDraftSeries = async (draftSeriesItem) => {
  isLoading.value = true;
  try {
    // Re-evaluate host against current published series before promoting
    const { team1Hosts, team2Hosts } = countTeamHosts(series.value || []);
    const autoHostId = getAutoHostPlayerId(
      draftSeriesItem.player1,
      draftSeriesItem.player2,
      team1Hosts,
      team2Hosts
    );
    if (autoHostId !== draftSeriesItem.host_player_id) {
      await seriesStore.updateDraftSeries({ ...draftSeriesItem, host_player_id: autoHostId });
    }
    await seriesStore.promoteDraftSeries(draftSeriesItem.id);
    await fetchMatchSeries(); // Refresh to show updated status
  } catch (error) {
    console.error('Failed to publish draft series:', error);
  } finally {
    isLoading.value = false;
  }
};

const publishAllDraftSeries = async () => {
  if (!draftSeries.value || draftSeries.value.length === 0) return;
  
  isLoading.value = true;
  try {
    // Start host counts from currently published series, then balance as each draft is promoted
    let { team1Hosts, team2Hosts } = countTeamHosts(series.value || []);

    for (const draft of draftSeries.value) {
      const autoHostId = getAutoHostPlayerId(draft.player1, draft.player2, team1Hosts, team2Hosts);
      if (autoHostId !== draft.host_player_id) {
        await seriesStore.updateDraftSeries({ ...draft, host_player_id: autoHostId });
      }
      await seriesStore.promoteDraftSeries(draft.id);
      if (autoHostId === draft.player1.id) team1Hosts++; else team2Hosts++;
    }
    await fetchMatchSeries();
  } catch (error) {
    console.error('Failed to publish all draft series:', error);
  } finally {
    isLoading.value = false;
  }
};

const toggleDraftFantasyMatch = async (draftSeriesItem) => {
  isLoading.value = true;
  try {
    // Toggle the fantasy match status
    const updatedDraft = {
      ...draftSeriesItem,
      is_fantasy_match: !draftSeriesItem.is_fantasy_match
    };
    await seriesStore.updateDraftSeries(updatedDraft);
    await fetchMatchSeries(); // Refresh to show updated status
  } catch (error) {
    console.error('Failed to toggle fantasy match:', error);
  } finally {
    isLoading.value = false;
  }
};

onMounted(async () => {
  // The w3champions season does not depend on the match, so both reads start together
  const [w3cSeason] = await Promise.all([resolveCurrentW3CSeason(), fetchMatchDetails()]);
  currentW3CSeason.value = w3cSeason;
});
</script>

<style scoped>

.team-icon {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

#matchHeader {
  position: relative;
  color: white;
  min-height: 300px;
  height: 300px;
}

.banner-image {
  position: absolute;
  top: 0;
  height: 100%; 
  width: 100%;
}

.banner-overlay {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background: linear-gradient(to bottom, rgba(0,0,0,0.4), rgba(0,0,0,0.7));
  z-index: 1;
}

.banner-content {
  position: relative;
  z-index: 2;
}

.teams-matchup {
  margin-top: 2rem;
}

.team-name-header {
  text-shadow: 2px 2px 4px rgba(0,0,0,0.8);
  letter-spacing: 1px;
}

.score-chip-large {
  font-size: 2rem !important;
  font-weight: bold;
  min-width: 80px;
}

.series-row {
  transition: all 0.2s ease;
}

.series-row:hover {
  background-color: rgba(var(--v-theme-primary), 0.05) !important;
}

@media (max-width: 960px) {
  .team-name-header {
    font-size: 1.5rem !important;
  }
  
  .score-chip-large {
    font-size: 1.5rem !important;
    min-width: 60px;
  }
}

</style>

<style>
/* Global styles for table row highlighting (cannot be scoped) */
.highlight-row {
  background-color: #ffc87a !important;
}

.highlight-selected-row {
  background-color: #99ff7a !important;
}
</style>