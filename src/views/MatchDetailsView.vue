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
              <v-col cols="12" md="5" class="text-center">
                <div class="team-section-header">
                  <h2 class="text-h4 font-weight-bold team-name-header text-white">{{ team1.name }}</h2>
                  <v-chip color="success" size="large" class="mt-2 score-chip-large">
                    {{ match.team1_score || 0 }}
                  </v-chip>
                </div>
              </v-col>
              
              <v-col cols="12" md="2" class="text-center">
                <v-icon size="48" color="white">mdi-sword-cross</v-icon>
              </v-col>
              
              <v-col cols="12" md="5" class="text-center">
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
              @click="$router.push(`/seasons/${match.season_id}`)"
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
                            <v-img :src="teamImages[matchItem.team1_id] || teamDefaultImg" cover></v-img>
                          </v-avatar>
                          <div class="text-caption text-center">{{ matchItem.team1_name }}</div>
                        </div>
                        
                        <!-- VS -->
                        <div class="text-caption text-grey">vs</div>
                        
                        <!-- Team 2 -->
                        <div class="d-flex flex-column align-center" style="width: 45%;">
                          <v-avatar size="32" class="mb-1">
                            <v-img :src="teamImages[matchItem.team2_id] || teamDefaultImg" cover></v-img>
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
              color="success"
              prepend-icon="mdi-sync"
              @click="syncW3CTeams"
              :loading="isLoading"
              block
            >
              Sync W3C
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
        <v-chip class="mr-2" size="small" color="warning">
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
        <v-tab value="draft">
          <v-icon start>mdi-pencil-circle</v-icon>
          Draft Series
        </v-tab>
      </v-tabs>

      <!-- Published Series Table -->
      <v-window v-model="seriesViewTab">
        <v-window-item value="published">
          <v-card-text v-if="series && series.length > 0" class="pa-0">
            <v-data-table
              :headers="seriesTableHeader"
              :items="enrichedSeries"
              fixed-header
              hover
              density="comfortable"
            >
              <template v-slot:loading>
                <v-skeleton-loader type="table-row@10"></v-skeleton-loader>
              </template>

              <template #top>
                <v-toolbar flat height="auto">
                  <v-row align="center" class="flex-wrap ma-0 pa-2">
                    <v-spacer />
                    <v-col cols="12" sm="auto">
                      <v-btn variant="elevated" color="primary" prepend-icon="mdi-plus" @click="openCreateNewSeries" block>
                        Add Series
                      </v-btn>
                    </v-col>
                  </v-row>
                </v-toolbar>
              </template>

              <template v-slot:item="{ item }">
                <tr class="series-row">
                  <td>{{ item.id }}</td>
                  <td>{{ item.caster || '—' }}</td>
                  <td>
                    <span v-if="item.date_time">
                      {{ formateDate(item.date_time) }}
                    </span>
                    <span v-else class="text-grey">Not scheduled</span>
                  </td>
                  <td @click.stop="showStats(item.player1)" class="player-cell">
                    <div class="d-flex align-center ga-2">
                      <RaceIcon :raceIdentifier="item.player1.race" />
                      <strong>{{ item.player1.name }}</strong>
                    </div>
                  </td>
                  <td class="text-end">
                    <v-chip size="small" color="info">
                      {{ getW3CMMR(item.player1) ?? 'N/A' }}
                    </v-chip>
                  </td>
                  <td class="text-center">
                    <v-chip :color="item.player1_score > item.player2_score ? 'success' : 'default'" size="small">
                      {{ item.player1_score }}
                    </v-chip>
                  </td>
                  <td class="text-center">
                    <v-chip :color="item.player2_score > item.player1_score ? 'success' : 'default'" size="small">
                      {{ item.player2_score }}
                    </v-chip>
                  </td>
                  <td @click.stop="showStats(item.player2)" class="player-cell">
                    <div class="d-flex align-center ga-2">
                      <RaceIcon :raceIdentifier="item.player2.race" />
                      <strong>{{ item.player2.name }}</strong>
                    </div>
                  </td>
                  <td class="text-end">
                    <v-chip size="small" color="info">
                      {{ getW3CMMR(item.player2) ?? 'N/A' }}
                    </v-chip>
                  </td>
                  <td>
                    <span v-if="item.host_player_id === item.player1.id">
                      {{ item.player1.name }}
                    </span>
                    <span v-else-if="item.host_player_id === item.player2.id">
                      {{ item.player2.name }}
                    </span>
                    <span v-else class="text-grey">—</span>
                  </td>
                  <td class="text-center">
                    <v-icon v-if="item.is_fantasy_match" icon="mdi-star" color="purple" title="Fantasy match"></v-icon>
                    <span v-else class="text-grey">—</span>
                  </td>
                  <td class="text-center">
                    <RowActions :actions="[
                      { icon: 'mdi-pencil', label: 'Edit Series', onClick: () => editSeries(item) },
                      { icon: 'mdi-delete', label: 'Delete Series', color: 'error', onClick: () => openDeleteDialog(item.id, removeSeries) },
                    ]" />
                  </td>
                </tr>
              </template>
            </v-data-table>
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
              @click="openCreateNewSeries"
            >
              Create Series
            </v-btn>
          </v-card-text>

          <v-card-actions v-if="series && series.length > 0">
            <v-spacer></v-spacer>
            <v-btn 
              variant="text" 
              color="error" 
              prepend-icon="mdi-delete-sweep"
              @click="openDeleteDialog(null, removeAllSeries)"
            >
              Delete All Published
            </v-btn>
          </v-card-actions>
        </v-window-item>

        <!-- Draft Series Table -->
        <v-window-item value="draft">
          <v-card-text v-if="draftSeries && draftSeries.length > 0" class="pa-0">
            <v-data-table
              :headers="draftSeriesTableHeader"
              :items="enrichedDraftSeries"
              fixed-header
              hover
              density="comfortable"
            >
              <template v-slot:loading>
                <v-skeleton-loader type="table-row@10"></v-skeleton-loader>
              </template>

              <template #top>
                <v-toolbar flat height="auto">
                  <v-row align="center" class="flex-wrap ma-0 pa-2">
                    <v-alert type="info" variant="tonal" density="compact" class="ma-2" border="start">
                      <v-icon start>mdi-information</v-icon>
                      Draft series are only visible in the admin UI and won't appear on the website or affect calculations.
                    </v-alert>
                    <v-spacer />
                    <v-col cols="12" sm="auto">
                      <v-btn variant="elevated" color="warning" prepend-icon="mdi-plus" @click="openCreateNewDraftSeries" block>
                        Add Draft Series
                      </v-btn>
                    </v-col>
                  </v-row>
                </v-toolbar>
              </template>

              <template v-slot:item="{ item }">
                <tr class="series-row draft-series-row">
                  <td>{{ item.id }}</td>
                  <td @click.stop="showStats(item.player1)" class="player-cell">
                    <div class="d-flex align-center ga-2">
                      <RaceIcon :raceIdentifier="item.player1.race" />
                      <strong>{{ item.player1.name }}</strong>
                    </div>
                  </td>
                  <td>
                    <div class="d-flex align-center ga-1">
                      <v-avatar
                        v-for="(race, idx) in getOpponentRaceHistory(item.player1)"
                        :key="`p1-${idx}`"
                        size="24"
                        class="race-avatar"
                      >
                        <v-img :src="getRaceIconUrl(race)" :alt="race" cover></v-img>
                      </v-avatar>
                      <span v-if="getOpponentRaceHistory(item.player1).length === 0" class="text-grey text-caption">—</span>
                    </div>
                  </td>
                  <td class="text-end">
                    <v-chip size="small" color="info">
                      {{ getW3CMMR(item.player1) ?? 'N/A' }}
                    </v-chip>
                  </td>
                  <td class="text-end">
                    <v-chip size="small" color="purple">
                      {{ getHighestW3CMMR(item.player1) ?? 'N/A' }}
                    </v-chip>
                  </td>
                  <td @click.stop="showStats(item.player2)" class="player-cell">
                    <div class="d-flex align-center ga-2">
                      <RaceIcon :raceIdentifier="item.player2.race" />
                      <strong>{{ item.player2.name }}</strong>
                    </div>
                  </td>
                  <td>
                    <div class="d-flex align-center ga-1">
                      <v-avatar
                        v-for="(race, idx) in getOpponentRaceHistory(item.player2)"
                        :key="`p2-${idx}`"
                        size="24"
                        class="race-avatar"
                      >
                        <v-img :src="getRaceIconUrl(race)" :alt="race" cover></v-img>
                      </v-avatar>
                      <span v-if="getOpponentRaceHistory(item.player2).length === 0" class="text-grey text-caption">—</span>
                    </div>
                  </td>
                  <td class="text-end">
                    <v-chip size="small" color="info">
                      {{ getW3CMMR(item.player2) ?? 'N/A' }}
                    </v-chip>
                  </td>
                  <td class="text-end">
                    <v-chip size="small" color="purple">
                      {{ getHighestW3CMMR(item.player2) ?? 'N/A' }}
                    </v-chip>
                  </td>
                  <td>
                    <span v-if="item.host_player_id === item.player1.id">
                      {{ item.player1.name }}
                    </span>
                    <span v-else-if="item.host_player_id === item.player2.id">
                      {{ item.player2.name }}
                    </span>
                    <span v-else class="text-grey">—</span>
                  </td>
                  <td class="text-center">
                    <v-icon v-if="item.is_fantasy_match" icon="mdi-star" color="purple" title="Fantasy match"></v-icon>
                    <span v-else class="text-grey">—</span>
                  </td>
                  <td class="text-center">
                    <RowActions :actions="[
                      { icon: item.is_fantasy_match ? 'mdi-star-off' : 'mdi-star', label: item.is_fantasy_match ? 'Remove from Fantasy' : 'Mark as Fantasy Match', color: item.is_fantasy_match ? 'orange' : 'purple', onClick: () => toggleDraftFantasyMatch(item) },
                      { icon: 'mdi-publish', label: 'Publish Series', color: 'success', onClick: () => publishDraftSeries(item) },
                      { icon: 'mdi-delete', label: 'Delete Draft', color: 'error', onClick: () => openDeleteDialog(item.id, removeDraftSeries) },
                    ]" />
                  </td>
                </tr>
              </template>
            </v-data-table>
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
              @click="openCreateNewDraftSeries"
            >
              Create Draft Series
            </v-btn>
          </v-card-text>

          <v-card-actions v-if="draftSeries && draftSeries.length > 0">
            <v-spacer></v-spacer>
            <v-btn 
              variant="text" 
              color="success"
              prepend-icon="mdi-publish"
              @click="publishAllDraftSeries"
            >
              Publish All Drafts
            </v-btn>
            <v-btn 
              variant="text" 
              color="error" 
              prepend-icon="mdi-delete-sweep"
              @click="openDeleteDialog(null, removeAllDraftSeries)"
            >
              Delete All Drafts
            </v-btn>
          </v-card-actions>
        </v-window-item>
      </v-window>
    </v-card>

    <!-- Create New Series Dialog -->
    <v-dialog v-model="createNewSeriesDialogOpen" max-width="95vw" max-height="95vh" persistent>
      <v-card class="d-flex flex-column" style="height: 90vh;">
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
            <v-col cols="12" md="5" class="d-flex flex-column">
              <v-card elevation="2" class="d-flex flex-column flex-grow-1">
                <v-toolbar color="primary" density="compact" class="flex-shrink-0">
                  <v-icon class="ml-3">mdi-shield</v-icon>
                  <v-toolbar-title>{{ team1.name }}</v-toolbar-title>
                  <v-spacer></v-spacer>
                  <v-text-field
                    v-model="searchQueryT1"
                    density="compact"
                    hide-details
                    label="Search Team 1"
                    prepend-inner-icon="mdi-magnify"
                    single-line
                    variant="underlined"
                    clearable
                    style="max-width: 300px;"
                  ></v-text-field>
                </v-toolbar>
                <v-data-table
                  :headers="tablePlayerHeader"
                  :custom-filter="customFilter"
                  :search="searchQueryT1"
                  v-model="newSeries_Player_1"
                  :items="team1.player_by_season ? team1.player_by_season[match.season_id] : []"
                  select-strategy="single"
                  density="compact"
                  multi-sort
                  fixed-header
                  hover
                  return-object
                  show-select
                  class="flex-grow-1"
                >
                  <template v-slot:loading>
                    <v-skeleton-loader type="table-row@10"></v-skeleton-loader>
                  </template>
                  <template v-slot:[`item.name`]="{ item }">
                    <FlagIcon :countryIdentifier="item.country" />
                    <span @click.stop="showStats(item)">{{ item.name }}</span>
                  </template>
                  <template v-slot:[`item.w3c_mmr`]="{ item }">
                    <td>{{ getW3CMMR(item, currentW3CSeason) || 'N/A' }}</td>
                  </template>
                </v-data-table>
              </v-card>                    
            </v-col>

            <v-col cols="12" md="2" class="d-flex flex-column align-center justify-center">
              <v-icon size="80" color="primary" class="mb-4">mdi-sword-cross</v-icon>
              <v-btn 
                color="success" 
                variant="elevated"
                prepend-icon="mdi-sync"
                @click="syncW3CTeams" 
                :loading="isLoading" 
                :disabled="isLoading"
              >
                Sync W3C Info
              </v-btn>
            </v-col> 

            <v-col cols="12" md="5" class="d-flex flex-column">
              <v-card elevation="2" class="d-flex flex-column flex-grow-1">
                <v-toolbar color="primary" density="compact" class="flex-shrink-0">
                  <v-icon class="ml-3">mdi-shield</v-icon>
                  <v-toolbar-title>{{ team2.name }}</v-toolbar-title>
                  <v-spacer></v-spacer>
                  <v-text-field
                    v-model="searchQueryT2"
                    density="compact"
                    hide-details
                    label="Search Team 2"
                    prepend-inner-icon="mdi-magnify"
                    single-line
                    variant="underlined"
                    clearable
                    style="max-width: 300px;"
                  ></v-text-field>
                </v-toolbar>
                <v-data-table
                  :headers="tablePlayerHeader"
                  :custom-filter="customFilter"
                  :search="searchQueryT2"
                  v-model="newSeries_Player_2"
                  :items="team2.player_by_season ? team2.player_by_season[match.season_id] : []"
                  select-strategy="single"
                  density="compact"
                  multi-sort
                  fixed-header
                  hover
                  return-object
                  show-select
                  class="flex-grow-1"
                >
                  <template v-slot:loading>
                    <v-skeleton-loader type="table-row@10"></v-skeleton-loader>
                  </template>
                  <template v-slot:[`item.name`]="{ item }">
                    <FlagIcon :countryIdentifier="item.country" />
                    <span @click.stop="showStats(item)">{{ item.name }}</span>
                  </template>
                  <template v-slot:[`item.w3c_mmr`]="{ item }">
                    <td>{{ getW3CMMR(item, currentW3CSeason) || 'N/A' }}</td>
                  </template>
                </v-data-table>
              </v-card> 
            </v-col>
          </v-row>     
        </v-card-text>
                      
        <v-card-actions class="px-4 py-3 flex-shrink-0" style="border-top: 1px solid rgba(0,0,0,0.12);">
          <v-checkbox
            v-model="newSeries_IsDraft"
            label="Create as Draft (Admin Only)"
            hint="Draft series won't appear on website or in calculations"
            persistent-hint
            color="warning"
            class="ml-4"
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
            :disabled="!newSeries_Player_1 || !newSeries_Player_2"
          >
            Create Series
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <!-- Edit Series Modal -->
        <v-dialog v-model="editSeriesDialogOpen" max-width="65vw" persistent>
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
              <v-col cols="6">
                <SimpleDatePicker
                  v-model="selectedDate"
                  label="Scheduled Date"
                />
              </v-col>
              <v-col cols="6">
                <SimpleTimePicker
                  v-model="selectedTime"
                  label="Scheduled Time"
                />
              </v-col>
              <v-col cols="6">
                <v-text-field
                  v-model="selectedSeries.caster"
                  label="Caster:"
                ></v-text-field>
              </v-col>
              <v-col cols="6">
                <v-number-input
                  v-model="selectedSeries.player1_score"
                  :label="`${selectedSeries.player1.name} Score`"
                ></v-number-input>
              </v-col>
              <v-col cols="6">
                <v-number-input
                  v-model="selectedSeries.player2_score"
                  :label="`${selectedSeries.player2.name} Score`"
                ></v-number-input>
              </v-col>
              <v-col cols="6">
                <v-select
                  :items="hostPlayers"
                  label="Choose a Host"
                  v-model="selectedSeries.host_player_id"
                  item-title="battleTag"
                  item-value="id"
                  outlined
                ></v-select>
              </v-col>
              <v-col cols="6">
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

    <!-- Team Rosters Expansion Panel -->
    <v-expansion-panels class="mt-4" v-model="teamRostersPanel">
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
                    hint="Maximum MMR difference for matchmaking"
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
                <v-card-title class="bg-success">
                  <v-icon class="mr-2">mdi-shield</v-icon>
                  {{ team1.name }}
                  <v-chip size="small" class="ml-2" color="white">
                    {{ proposePlayersTeam_1.length }} selected
                  </v-chip>
                </v-card-title>
                <v-card-text class="pa-0">
                  <v-data-table
                    :headers="tablePlayerHeader"
                    :items="team1.player_by_season?.[match.season_id] || []"
                    :custom-filter="customFilter"
                    :search="searchQueryT1"
                    v-model="proposePlayersTeam_1"
                    select-strategy="all"
                    density="comfortable"
                    multi-sort
                    fixed-header
                    hover
                    return-object
                    show-select
                  >
                    <template v-slot:loading>
                      <v-skeleton-loader type="table-row@10"></v-skeleton-loader>
                    </template>
                    <template v-slot:top>
                      <v-toolbar flat density="compact">
                        <v-text-field
                          v-model="searchQueryT1"
                          placeholder="Search players..."
                          prepend-inner-icon="mdi-magnify"
                          variant="outlined"
                          density="compact"
                          hide-details
                          single-line
                          clearable
                        ></v-text-field>
                      </v-toolbar>
                    </template>
                    <template v-slot:[`item.name`]="{ item }">
                      <div class="d-flex align-center">
                        <FlagIcon :countryIdentifier="item.country" class="mr-2" />
                        <span @click.stop="showStats(item)" class="player-name-link">
                          <strong>{{ item.name }}</strong>
                          <span class="text-caption text-grey ml-1">({{ item.discordTag }})</span>
                        </span>
                      </div>
                    </template>
                    <template v-slot:[`item.w3c_mmr`]="{ item }">
                      <v-chip size="small" color="info">
                        {{ getW3CMMR(item) ?? 'N/A' }}
                      </v-chip>
                    </template>
                  </v-data-table>
                </v-card-text>
              </v-card>
            </v-col>

            <v-col cols="12" md="6">
              <v-card elevation="2">
                <v-card-title class="bg-error">
                  <v-icon class="mr-2">mdi-shield</v-icon>
                  {{ team2.name }}
                  <v-chip size="small" class="ml-2" color="white">
                    {{ proposePlayersTeam_2.length }} selected
                  </v-chip>
                </v-card-title>
                <v-card-text class="pa-0">
                  <v-data-table
                    :headers="tablePlayerHeader"
                    :items="team2.player_by_season?.[match.season_id] || []"
                    :custom-filter="customFilter"
                    :search="searchQueryT2"
                    v-model="proposePlayersTeam_2"
                    select-strategy="all"
                    density="comfortable"
                    multi-sort
                    fixed-header
                    hover
                    return-object
                    show-select
                  >
                    <template v-slot:loading>
                      <v-skeleton-loader type="table-row@10"></v-skeleton-loader>
                    </template>
                    <template v-slot:top>
                      <v-toolbar flat density="compact">
                        <v-text-field
                          v-model="searchQueryT2"
                          placeholder="Search players..."
                          prepend-inner-icon="mdi-magnify"
                          variant="outlined"
                          density="compact"
                          hide-details
                          single-line
                          clearable
                        ></v-text-field>
                      </v-toolbar>
                    </template>
                    <template v-slot:[`item.name`]="{ item }">
                      <div class="d-flex align-center">
                        <FlagIcon :countryIdentifier="item.country" class="mr-2" />
                        <span @click.stop="showStats(item)" class="player-name-link">
                          <strong>{{ item.name }}</strong>
                          <span class="text-caption text-grey ml-1">({{ item.discordTag }})</span>
                        </span>
                      </div>
                    </template>
                    <template v-slot:[`item.w3c_mmr`]="{ item }">
                      <v-chip size="small" color="info">
                        {{ getW3CMMR(item) ?? 'N/A' }}
                      </v-chip>
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
    max-width="1400px">
    <v-card>
      <v-card-title class="bg-primary">
        <v-icon class="mr-2">mdi-lightbulb-on</v-icon>
        Proposed Series
      </v-card-title>
      <v-card-subtitle class="pa-3">
        <v-row align="center" justify="center">
          <v-col cols="5" class="text-center">
            <v-chip color="success" size="large">
              <v-icon start>mdi-shield</v-icon>
              {{ team1.name }}
            </v-chip>
          </v-col>        
          <v-col cols="2" class="text-center">
            <v-icon size="large">mdi-sword-cross</v-icon>
          </v-col>        
          <v-col cols="5" class="text-center">
            <v-chip color="error" size="large">
              <v-icon start>mdi-shield</v-icon>
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
          :custom-filter="customFilterSeries"
          :search="searchQuerySeries"
          select-strategy="all"
          density="comfortable"
          v-model="selectedProposedSeries"
          multi-sort
          fixed-header
          hover
          return-object
          show-select
          :row-props="getRowClass"
        >
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
                <div class="d-flex align-center ga-2">
                  <RaceIcon :raceIdentifier="item.player1.race" />
                  <FlagIcon :countryIdentifier="item.player1.country" />
                  <span @click.stop="showStats(item.player1)">{{ item.player1.name }}</span>
                </div>
              </template>
              <template v-slot:[`item.player2.name`]="{ item }">
                <div class="d-flex align-center ga-2">
                  <RaceIcon :raceIdentifier="item.player2.race" />
                  <FlagIcon :countryIdentifier="item.player2.country" />
                  <span @click.stop="showStats(item.player2)">{{ item.player2.name }}</span>
                </div>
              </template>
              <template v-slot:[`item.p1_matchup_history`]="{ item }">
                <div class="d-flex align-center ga-1">
                  <v-avatar
                    v-for="(race, idx) in getOpponentRaceHistory(item.player1)"
                    :key="`p1-${idx}`"
                    size="24"
                    class="race-avatar"
                  >
                    <v-img :src="getRaceIconUrl(race)" :alt="race" cover></v-img>
                  </v-avatar>
                  <span v-if="getOpponentRaceHistory(item.player1).length === 0" class="text-grey text-caption">—</span>
                </div>
              </template>
              <template v-slot:[`item.p2_matchup_history`]="{ item }">
                <div class="d-flex align-center ga-1">
                  <v-avatar
                    v-for="(race, idx) in getOpponentRaceHistory(item.player2)"
                    :key="`p2-${idx}`"
                    size="24"
                    class="race-avatar"
                  >
                    <v-img :src="getRaceIconUrl(race)" :alt="race" cover></v-img>
                  </v-avatar>
                  <span v-if="getOpponentRaceHistory(item.player2).length === 0" class="text-grey text-caption">—</span>
                </div>
              </template>
              <template v-slot:[`item.p1_w3c_mmr`]="{ item }">
                  <td>{{ getW3CMMR(item.player1) ?? 'N/A' }}</td>
              </template>
              <template v-slot:[`item.p1_w3c_high_mmr`]="{ item }">
                  <td>{{ getHighestW3CMMR(item.player1) ?? 'N/A' }}</td>
              </template>
              <template v-slot:[`item.p2_w3c_mmr`]="{ item }">
                  <td>{{ getW3CMMR(item.player2) ?? 'N/A' }}</td>
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
              @click.stop="openDeleteDialog(item.proposedId, removeProposedSeries)"
            ></v-btn>
          </template>
        </v-data-table>
        <v-alert v-else type="info" variant="tonal" class="ma-4">
          No matchups found with current MMR criteria. Try adjusting the MMR difference.
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
    v-model="showPlayerDetails" 
    :player="playerDetails" 
    :seasonId="match?.season_id"
    :w3cSeason="currentW3CSeason"
  />

  <!-- Sync Results Dialog -->
  <v-dialog v-model="syncDialog" persistent max-width="500">
    <v-card>
      <v-card-title class="bg-primary">
        <v-icon class="mr-2">mdi-sync</v-icon>
        Sync Results
      </v-card-title>
      <v-card-text class="pt-4">
        <div class="mb-2">
          <strong>{{ team1.name }}: </strong>
          <span :class="syncError1 ? 'text-error' : 'text-success'">{{ syncMessage1 }}</span>
        </div>
        <div>
          <strong>{{ team2.name }}: </strong>
          <span :class="syncError2 ? 'text-error' : 'text-success'">{{ syncMessage2 }}</span>
        </div>
      </v-card-text>
      <v-card-actions>
        <v-spacer></v-spacer>
        <v-btn color="primary" @click="syncDialog = false" :disabled="isLoading">OK</v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>

  <!-- Delete Confirmation Dialog -->
  <v-dialog v-model="showDeleteDialog" max-width="400">
    <v-card>
      <v-card-title class="bg-error">
        <v-icon class="mr-2">mdi-alert</v-icon>
        Confirm Deletion
      </v-card-title>
      <v-card-text class="pt-4">
        Are you sure you want to delete this item? This action cannot be undone.
      </v-card-text>
      <v-card-actions>
        <v-spacer></v-spacer>
        <v-btn variant="text" @click="cancelDeleteDialog">Cancel</v-btn>
        <v-btn color="error" @click="confirmDelete">Delete</v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>

</template>


<script setup>
import RowActions from '@/components/RowActions.vue';
import bannerImg from '@/assets/media/match-banner.jpg'
import teamDefaultImg from '@/assets/media/GNL_Team_Default.png';
import { useRouter } from 'vue-router';
import { ref, onMounted, computed } from 'vue';
import { DateTime } from "luxon";
import { useMatchStore, useSeriesStore, useTeamStore, useSeasonStore, useConfigStore } from '@/stores';
import { useDate } from 'vuetify';
import { storeToRefs } from 'pinia';
import { fetchWrapper } from '@/helpers';
import FlagIcon from '../components/FlagIcon.vue';
import SimpleTimePicker from '../components/SimpleTimePicker.vue';
import SimpleDatePicker from '../components/SimpleDatePicker.vue';
import PlayerDetailsDialog from '../components/PlayerDetailsDialog.vue';
import { getW3CMMR, getW3CStatsWithFallback } from '@/helpers/w3c-stats';

defineOptions({
  name: 'MatchDetailsView'
})

// Stores initialization
const router = useRouter();
const matchStore = useMatchStore();
const seriesStore = useSeriesStore();
const teamStore = useTeamStore();
const seasonStore = useSeasonStore();
const configStore = useConfigStore();
const { match, matches } = storeToRefs(matchStore);
const { series, draftSeries } = storeToRefs(seriesStore);

// Combined series (published + drafts)
const allSeries = computed(() => {
  const published = (series.value || []).map(s => ({ ...s, isDraft: false }));
  const drafts = (draftSeries.value || []).map(s => ({ ...s, isDraft: true }));
  return [...published, ...drafts];
});

// Week navigation state
const weeklyMatches = ref([]);

const seriesTableHeader = [
  
  { title: 'ID', value: 'id', sortable: true },  
  { title: 'Caster'},  
  { title: 'Date/Time'}, 
  { title: 'Player 1', value: 'player1.name', sortable: true },
  { title: 'MMR', value: 'p1_w3c_mmr', sortable: true, sortRaw: (a, b) => {
    let aValue = getW3CMMR(a?.player1, currentW3CSeason.value) || 0;
    let bValue = getW3CMMR(b?.player1, currentW3CSeason.value) || 0;
    return aValue - bValue;
  } },
  { title: 'P1 Score' },
  { title: 'P2 Score' },
  { title: 'Player 2', value: 'player2.name', sortable: true },
  { title: 'MMR', value: 'p2_w3c_mmr', sortable: true, sortRaw: (a, b) => {
    let aValue = getW3CMMR(a?.player2, currentW3CSeason.value) || 0;
    let bValue = getW3CMMR(b?.player2, currentW3CSeason.value) || 0;
    return aValue - bValue;
  }},
  { title: 'Host' },
  { title: 'Fantasy Match'},  
  { title: '', value: 'actions', sortable: true }
];

const draftSeriesTableHeader = [
  { title: 'ID', value: 'id', sortable: true },  
  { title: 'Player 1', value: 'player1.name', sortable: true },
  { title: 'Matchup History', key: 'p1_matchup_history', sortable: false },
  { title: 'Current MMR', value: 'p1_w3c_mmr', sortable: true, sortRaw: (a, b) => {
    let aValue = getW3CMMR(a?.player1, currentW3CSeason.value) || 0;
    let bValue = getW3CMMR(b?.player1, currentW3CSeason.value) || 0;
    return aValue - bValue;
  } },
  { title: 'Highest MMR', key: 'p1_w3c_high_mmr', sortable: true, sortRaw: (a, b) => {
    let aValue = getHighestW3CMMR(a?.player1) || 0;
    let bValue = getHighestW3CMMR(b?.player1) || 0;
    return aValue - bValue;
  }},
  { title: 'Player 2', value: 'player2.name', sortable: true },
  { title: 'Matchup History', key: 'p2_matchup_history', sortable: false },
  { title: 'Current MMR', value: 'p2_w3c_mmr', sortable: true, sortRaw: (a, b) => {
    let aValue = getW3CMMR(a?.player2, currentW3CSeason.value) || 0;
    let bValue = getW3CMMR(b?.player2, currentW3CSeason.value) || 0;
    return aValue - bValue;
  }},
  { title: 'Highest MMR', key: 'p2_w3c_high_mmr', sortable: true, sortRaw: (a, b) => {
    let aValue = getHighestW3CMMR(a?.player2) || 0;
    let bValue = getHighestW3CMMR(b?.player2) || 0;
    return aValue - bValue;
  }},
  { title: 'Host' },
  { title: 'Fantasy Match'},  
  { title: '', value: 'actions', sortable: true }
];

const proposedSeriesTableHeader = [
  { title: 'Player 1', value: 'player1.name', width:'300px', sortable: true },
  { title: 'GNL Games', value: 'player1.gnl_stats[0].games', sortable: true, align: 'end' },
  { title: 'Matchup History', key: 'p1_matchup_history', sortable: false },
  { title: 'Current MMR', key: 'p1_w3c_mmr', sortable: true, sortRaw: (a, b) => {
    let aValue = getW3CMMR(a?.player1) || 0;
    let bValue = getW3CMMR(b?.player1) || 0;
    return aValue - bValue;
  }},
  { title: 'Highest Race MMR', key: 'p1_w3c_high_mmr', sortable: true, sortRaw: (a, b) => {
    let aValue = getHighestW3CMMR(a?.player1) || 0;
    let bValue = getHighestW3CMMR(b?.player1) || 0;
    return aValue - bValue;
  }},
  { title: 'Player 2', value: 'player2.name', width:'300px', sortable: true },
  { title: 'GNL Games', value: 'player2.gnl_stats[0].games', sortable: true, align: 'end' },
  { title: 'Matchup History', key: 'p2_matchup_history', sortable: false }, 
  { title: 'Current MMR', key: 'p2_w3c_mmr', sortable: true, sortRaw: (a, b) => {
    let aValue = getW3CMMR(a?.player2) || 0;
    let bValue = getW3CMMR(b?.player2) || 0;
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

const tablePlayerHeader = [
  { title: 'Name', value: 'name', sortable: true },
  { title: 'GNL Games', key: 'gnl_stats[0].games', sortable: true },
  { title: 'MMR', key: 'w3c_mmr', value:'item', sortable: true, sortRaw: (a, b) => {
    let aValue = getW3CMMR(a) || 0;
    let bValue = getW3CMMR(b) || 0;
    return aValue - bValue;
  }

}, 
];

// Route params - use computed to get the current route param
const matchId = computed(() => router.currentRoute.value.params.id);

// Component state
const isLoading = ref(false);
const search = ref('');
const date = useDate();

// Team state
const backendUrl = `${import.meta.env.VITE_BACKEND_URL}`;

const team1 = ref({});
const team2 = ref({});
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
const teamImages = ref({});

// Series state
const showNewSeriesModal = ref(false);
const createNewSeriesDialogOpen = ref(false);
const newSeries_Player_1 = ref(null);
const newSeries_Player_2 = ref(null);
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
const selectedProposedSeries = ref([]);

// Search state
const searchQueryT1 = ref('');
const searchQueryT2 = ref('');
const searchQuerySeries = ref('');

// Player details state
const showPlayerDetails = ref(false);
const playerDetails = ref(null);

// Sync state
const syncDialog = ref(false);
const syncMessage1 = ref("");
const syncMessage2 = ref("");
const syncError1 = ref(false);
const syncError2 = ref(false);

// Delete dialog state
const showDeleteDialog = ref(false);
const selectedDeleteItemId = ref(null);
const deleteAction = ref(null);

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
  const formatedDate = DateTime.fromISO(dateToFormat + 'Z', { zone: 'UTC' })
    .setZone('America/New_York')
    .toLocaleString(DateTime.DATETIME_MED);
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
  const isMatchSelected = selectedProposedSeries.value.some(
    sel => sel.player1.id === item.item.player1.id && sel.player2.id === item.item.player2.id
  );
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
  const isPlayerSelected = selectedProposedSeries.value.some(
    sel => sel.player1.id === item.item.player1.id || sel.player2.id === item.item.player2.id
  );
  return {class: isPlayerSelected ? 'highlight-row' : ''};
};


const customSort = (items, sortBy, sortDesc) => {
  console.log(item, sortby, sortDesc);
  if (sortBy === 'w3c_mmr') {
    return [...items].sort((a, b) => {
      let aValue = a.w3c_stats.find(player => player.race === a.race)?.mmr || 0;
      let bValue = b.w3c_stats.find(player => player.race === b.race)?.mmr || 0;
      return sortDesc ? bValue - aValue : aValue - bValue;
    });
  }
  return items; // Uses default sorting for other columns
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



const seriesHeaders = [
  { title: 'ID', value: 'id' },
  { title: 'Player 1', value: 'player1.name' },
  { title: '', value: '' },
  { title: 'Player 2', value: 'player2.name' },
  { title: 'Actions', align: 'center' }
];

const openCreateNewSeries = () => {
  createNewSeriesDialogOpen.value = true;
  newSeries_Player_1.value = null;
  newSeries_Player_2.value = null;
  newSeries_IsDraft.value = false;
  creationSeriesError.value = null;
};

const openCreateNewDraftSeries = () => {
  createNewSeriesDialogOpen.value = true;
  newSeries_Player_1.value = null;
  newSeries_Player_2.value = null;
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
    if (matchStore.match.team1_id && matchStore.match.team2_id) {
      await fetchTeamDetails();
    }
    await seriesStore.getSeriesByMatchId(newMatchId);
    await loadMissingSeriesPlayers();
  } catch (error) {
    console.error('Failed to fetch match details:', error);
  } finally {
    isLoading.value = false;
  }
};

const fetchTeamImage = async (teamId) => {
  if (teamImages.value[teamId]) return; // Already loaded
  
  try {
    const imgResponse = await teamStore.getTeamImage(teamId);
    if (!imgResponse.ok) throw new Error("Image not found");
    const imgBlob = await imgResponse.blob();
    teamImages.value[teamId] = URL.createObjectURL(imgBlob);
  } catch (error) {
    teamImages.value[teamId] = teamDefaultImg;
  }
};

const fetchSeasonMatches = async () => {
  if (!match.value?.season_id) return;
  
  try {
    // Fetch season details to get number of weeks
    const seasonData = await seasonStore.fetchSeason(match.value.season_id);
    const numberOfWeeks = seasonStore.current_season.number_weeks;
    
    // Fetch matches for all weeks
    const allMatchesPromises = [];
    for (let week = 1; week <= numberOfWeeks; week++) {
      allMatchesPromises.push(
        matchStore.searchMatchesBySeasonAndPlayday(match.value.season_id, week)
          .then(() => ({ week, matches: [...matches.value] }))
      );
    }
    
    const weeklyData = await Promise.all(allMatchesPromises);
    
    // Organize matches by week
    weeklyMatches.value = weeklyData.map(data => ({
      weekNumber: data.week,
      matches: data.matches
    })).sort((a, b) => a.weekNumber - b.weekNumber);
    
    // Fetch team images for all matches
    const teamIds = new Set();
    weeklyMatches.value.forEach(week => {
      week.matches.forEach(match => {
        if (match.team1_id) teamIds.add(match.team1_id);
        if (match.team2_id) teamIds.add(match.team2_id);
      });
    });
    
    // Load all team images in parallel
    await Promise.all([...teamIds].map(teamId => fetchTeamImage(teamId)));
    
  } catch (error) {
    console.error('Failed to fetch season matches:', error);
  }
};

const fetchMatchDetails = async () => {
  isLoading.value = true;
  try {
    await matchStore.fetchMatchDetails(matchId.value);
    if (matchStore.match.team1_id && matchStore.match.team2_id) {
      await fetchTeamDetails(); // Fetch team details only after match details are loaded
    }
    await fetchMatchSeries();
    await fetchSeasonMatches(); // Fetch all matches for navigation
  } catch (error) {
    console.error('Failed to fetch match details:', error);
  } finally {
    isLoading.value = false;
  }
};

const fetchTeamDetails = async () => {
  isLoading.value = true;
  try {
    
    team1.value = await teamStore.getTeamDetailsSeason(matchStore.match.team1_id, matchStore.match.season_id);
    team2.value = await teamStore.getTeamDetailsSeason(matchStore.match.team2_id, matchStore.match.season_id);
  } catch (error) {
    console.error('Failed to fetch match details:', error);
  } finally {
    isLoading.value = false;
  }
};

const syncW3CTeams = async () => {
  isLoading.value = true;
  syncError1.value = false;
  syncError2.value = false;
  syncDialog.value = true;
  syncMessage1.value = "Sync Ongoing!";
  syncMessage2.value = "Not started!";

  try {
    await teamStore.syncPlayersW3C(matchStore.match.team1_id, matchStore.match.season_id);
    syncMessage1.value = "Team 1 synced successfully!";
  } catch (error) {
    console.error('Failed to sync Team 1:', error);
    syncError1.value = true;
    syncMessage1.value = error.message;
  }
  
  try {
    syncMessage2.value = "Sync Ongoing!";
    await teamStore.syncPlayersW3C(matchStore.match.team2_id, matchStore.match.season_id);
    syncMessage2.value = "Team 2 synced successfully!";
  } catch (error) {
    console.error('Failed to sync Team 2:', error);
    syncError2.value = true;
    syncMessage2.value = error.message;
  }

  // Always reload team details to get any successfully synced W3C stats
  // This ensures we show updated data even if some players failed to sync
  try {
    await fetchTeamDetails();
  } catch (error) {
    console.error('Failed to refresh team details after sync:', error);
    if (!syncError1.value && !syncError2.value) {
      syncError1.value = true;
      syncMessage1.value = "Failed to refresh team data";
    }
  }

  isLoading.value = false; // Show results
};
          

const showStats = async(player) => {
  showPlayerDetails.value = true;
  playerDetails.value = player;
}

const fetchMatchSeries = async () => {
  isLoading.value = true;
  try {
    // Fetch both published series and draft series
    await Promise.all([
      seriesStore.getSeriesByMatchId(matchId.value),
      seriesStore.getDraftSeriesByMatchId(matchId.value)
    ]);
    await loadMissingSeriesPlayers();
  } catch (error) {
    console.error('Failed to fetch match series:', error);
  } finally {
    isLoading.value = false;
  }
};

const editSeries = async (seriesItem) => {
  const copy_series =  { ...seriesItem };
  // Mark if this is a draft for proper update routing
  copy_series.isDraft = seriesViewTab.value === 'draft';
  updateSeriesError.value = '';
  selectedSeries.value = copy_series;
  if (copy_series.date_time) {
    // Backend stores UTC, convert to ET for display in date picker
    const initialDateTime = DateTime.fromISO(copy_series.date_time + 'Z', { zone: 'UTC' })
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

const removeProposedSeries = (proposedId) => {
  proposedSeries.value = proposedSeries.value.filter(series => series.proposedId !== proposedId);

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
const getRaceIconUrl = (race) => {
  const raceUrls = {
    'HU': 'https://warcraft-gym.com/wp-content/uploads/2021/07/HUMAN.86b68278.png',
    'OC': 'https://warcraft-gym.com/wp-content/uploads/2021/07/ORC.fe8d30a3.png',
    'UD': 'https://warcraft-gym.com/wp-content/uploads/2021/07/UNDEAD.eedab6ad.png',
    'NE': 'https://warcraft-gym.com/wp-content/uploads/2021/07/NIGHT_ELF.58a510d9.png',
    'RANDOM': 'https://warcraft-gym.com/wp-content/uploads/2021/07/RANDOM.f67c1233.png'
  };
  return raceUrls[race] || '';
};

const proposeSeries = async () => {
  isLoading.value = true;
  try {
    proposedSeries.value = []
    let t1_player = proposePlayersTeam_1.value;
    let t2_player = proposePlayersTeam_2.value;

    for(let i = 0; i< t1_player.length; i++) {
      let p1 = t1_player[i];
      let p1_mmr = getW3CMMR(p1) || 0;
      
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
            continue;
          }
        }

        if(selectedProposedSeries.value) {
          let selectedPropSeriesExists = false;
          for (let m = 0; m < selectedProposedSeries.value.length; m++){
            let sPropS = selectedProposedSeries.value[m];
            if(p1.id == sPropS.player1_id && p2.id == sPropS.player2_id){
              proposedSeries.value.push(sPropS);
              selectedPropSeriesExists = true;
              break;
            }
          }
          if(selectedPropSeriesExists){
            continue;
          }
        }

        p2_mmr = getW3CMMR(p2) || 0;
        
        let mmr_diff = p1_mmr - p2_mmr;
        if (mmr_diff<0){
          mmr_diff*=-1
        }
        if(mmr_diff <= proposeSeriesMMRDiff.value){
          const newSeries = {}
          newSeries.proposedId = proposedSeries.value.length+1
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
    if (selectedProposedSeries.value) {
      selectedProposedSeries.value = selectedProposedSeries.value.filter(sps =>
        proposedSeries.value.some(ps => sps.player1_id === ps.player1_id && sps.player2_id === ps.player2_id)
      );
    }
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

    for (const ps of selectedProposedSeries.value) {
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
  newSeries.player1_id = newSeries_Player_1.value[0].id
  newSeries.player2_id = newSeries_Player_2.value[0].id

  // Auto-assign host to keep counts balanced between teams
  const allCurrent = [...(series.value || []), ...(draftSeries.value || [])];
  const { team1Hosts, team2Hosts } = countTeamHosts(allCurrent);
  newSeries.host_player_id = getAutoHostPlayerId(
    newSeries_Player_1.value[0],
    newSeries_Player_2.value[0],
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

const openDeleteDialog = (id, action) => {
  selectedDeleteItemId.value = id;
  deleteAction.value = action; // Store the function dynamically
  showDeleteDialog.value = true;
};

const confirmDelete = () => {
  if (selectedDeleteItemId.value && deleteAction.value) {
    deleteAction.value(selectedDeleteItemId.value); // Call the dynamically stored function
    showDeleteDialog.value = false;
  } else if (deleteAction.value) {
      deleteAction.value(); // Call the dynamically stored function
    showDeleteDialog.value = false;
  }
};

const cancelDeleteDialog = () => {
  showDeleteDialog.value = false;
  selectedDeleteItemId.value = null;
  deleteAction.value = null; // Store the function dynamically
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

// Resolve current W3C season from config
async function resolveCurrentW3CSeason() {
  try {
    const setting = await configStore.fetchSetting('current_wc3_season');
    if (setting && setting.value) {
      const num = Number(setting.value);
      if (!Number.isNaN(num)) {
        currentW3CSeason.value = num;
        return;
      }
    }
  } catch (err) {
    console.warn('Failed to fetch current_wc3_season setting:', err);
  }
  currentW3CSeason.value = null;
}

onMounted(async () => {
  await resolveCurrentW3CSeason();
  fetchMatchDetails();
});
</script>

<style scoped>

.toolbar-btn { margin-right: 12px !important; }

/* Keep action buttons on a single line and prevent wrapping in table cells */
.actions-cell {
  white-space: nowrap;
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

.vs {
  font-family: "Bungee Shade", sans-serif;
  font-weight: 400;
  font-style: normal;
}

.player-cell {
  cursor: pointer;
  transition: color 0.2s;
}

.player-cell:hover {
  color: rgb(var(--v-theme-primary));
}

.player-name-link {
  cursor: pointer;
  transition: color 0.2s;
}

.player-name-link:hover {
  color: rgb(var(--v-theme-primary));
  text-decoration: underline;
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