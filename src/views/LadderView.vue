<template>
  <v-overlay v-model="isLoading" persistent contained class="align-center justify-center">
    <v-progress-circular indeterminate size="64" width="8" color="primary"></v-progress-circular>
  </v-overlay>

  <v-container fluid class="pa-4">
    <!-- Page Header -->
    <v-row class="mb-4">
      <v-col>
        <h1 class="d-inline-flex">
          <img :src="w3championsLogo" style="height: 1.35em" alt="W3Champions">
        </h1>
      </v-col>
    </v-row>

    <!-- Season picker and the sync of that season -->
    <v-row align="center" class="mb-2 flex-wrap">
      <v-col cols="12" sm="4" md="3">
        <SeasonSelect />
      </v-col>
      <v-spacer />
      <v-col cols="auto" class="text-right" style="min-width: 240px">
        <SyncProgress :caption="syncCaption" :stamp="syncStamp" />
      </v-col>
      <v-col cols="auto">
        <v-btn
          variant="elevated"
          color="primary"
          prepend-icon="mdi-sync"
          :loading="isSyncing"
          :disabled="isSyncing || !selectedSeasonId"
          v-if="auth.isAdmin"
          @click="syncLadder"
        >
          <span class="d-inline-flex align-baseline">Sync<img :src="w3cLogoWhite" style="height: 1.4em; transform: translateY(3%)" alt="W3C" class="ml-1"></span>
          <v-tooltip activator="parent" location="top">MMR and ladder matches</v-tooltip>
        </v-btn>
      </v-col>
    </v-row>

    <StatusAlert v-model="errorMessage" />

    <!-- Empty State -->
    <v-card v-if="ladder && !ladder.total_games" elevation="2">
      <v-card-text class="text-center pa-8">
        <W3CIcon :size="64" style="opacity: 0.35" />
        <div class="text-h6 text-grey mt-4 mb-2">No ladder games synced for {{ seasonName }}</div>
        <p class="text-grey-darken-1 mb-4">Sync the season to fetch its W3Champions matches</p>
        <v-btn
          variant="elevated"
          color="primary"
          prepend-icon="mdi-sync"
          :loading="isSyncing"
          :disabled="isSyncing"
          v-if="auth.isAdmin"
          @click="syncLadder"
        >
          <span class="d-inline-flex align-baseline">Sync<img :src="w3cLogoWhite" style="height: 1.4em; transform: translateY(3%)" alt="W3C" class="ml-1"></span>
          <v-tooltip activator="parent" location="top">MMR and ladder matches</v-tooltip>
        </v-btn>
        <SyncProgress class="mt-4 mx-auto" style="max-width: 320px" />
      </v-card-text>
    </v-card>

    <template v-if="ladder && ladder.total_games">
      <!-- Team Standings -->
      <v-card elevation="2" class="mb-4">
        <v-card-title class="bg-primary d-flex align-center">
          <v-icon class="mr-2">mdi-trophy</v-icon>
          <span>Team Standings</span>
        </v-card-title>
        <v-toolbar flat height="auto">
          <v-row align="center" class="flex-wrap ma-0 pa-2" style="gap: 8px">
            <span class="text-caption text-medium-emphasis">{{ seasonDates }}</span>
            <v-spacer />
          </v-row>
        </v-toolbar>
        <v-table density="comfortable" class="standings-table">
          <thead>
            <tr>
              <th>Team</th>
              <th class="text-center">
                <ColumnNote title="Total Points" :note="SCORED_NOTE" />
              </th>
              <th class="text-center">Games</th>
              <th class="text-center">Players</th>
            </tr>
          </thead>
          <tbody>
            <tr
              v-for="(team, idx) in ladder.teams"
              :key="team.id"
              :class="idx === 0 ? 'standings-first' : ''"
            >
              <td>
                <div class="d-flex align-center">
                  <v-avatar size="24" rounded="sm" class="mr-2" style="flex-shrink:0">
                    <img class="team-icon" :src="teamImageUrl(team)" @error="showDefaultTeamImage">
                  </v-avatar>
                  <RouterLink :to="`/team/${team.id}/season/${seasonStore.slugOf(selectedSeasonId)}`">{{ team.long_name || team.name }}</RouterLink>
                </div>
              </td>
              <td class="text-center font-weight-bold">{{ team.points }}</td>
              <td class="text-center">{{ team.games }}</td>
              <td class="text-center">{{ team.players.length }}</td>
            </tr>
          </tbody>
          <tfoot>
            <tr class="standings-total">
              <td class="text-medium-emphasis">{{ ladder.teams.length }} teams</td>
              <td class="text-center font-weight-bold">{{ seasonPoints }}</td>
              <td class="text-center">{{ ladder.total_games }}</td>
              <td class="text-center">{{ seasonPlayers }}</td>
            </tr>
          </tfoot>
        </v-table>
      </v-card>

      <!-- Filters (reusable) -->
      <FilterPanel
        v-model:searchName="searchName"
        v-model:searchRace="searchRace"
        :showName="true"
        :showRace="true"
        :showSeason="false"
        :showMMR="false"
        :showReset="true"
        @reset="resetFilters"
      >
        <template #after>
          <v-col cols="12" md="6">
            <v-select
              v-model="searchTeam"
              :items="teamOptions"
              item-title="name"
              item-value="id"
              label="Team"
              clearable
              variant="outlined"
              density="comfortable"
              prepend-inner-icon="mdi-shield-account"
            ></v-select>
          </v-col>
        </template>
      </FilterPanel>

      <!-- Players -->
      <v-card elevation="2">
        <v-card-title class="bg-primary d-flex align-center">
          <v-icon class="mr-2">mdi-account-group</v-icon>
          <span>Players</span>
        </v-card-title>
        <v-card-text class="pa-0">
          <v-data-table
            v-model:expanded="expanded"
            :headers="tableHeader"
            :items="filteredPlayers"
            :sort-by="[{ key: 'points', order: 'desc' }]"
            item-value="id"
            show-expand
            expand-on-click
            fixed-header
            hover
          >
            <template v-slot:[`header.points`]="{ column, isSorted, getSortIcon }">
              <ColumnNote :title="column.title" :note="SCORED_NOTE"
                :sort-icon="isSorted(column) ? getSortIcon(column) : null" />
            </template>
            <template v-slot:[`header.ladder_points`]="{ column, isSorted, getSortIcon }">
              <ColumnNote :title="column.title" :note="LADDER_NOTE"
                :sort-icon="isSorted(column) ? getSortIcon(column) : null" />
            </template>
            <template v-slot:[`header.achievements`]="{ column }">
              <ColumnNote :title="column.title" :note="ACHIEVEMENTS_NOTE" />
            </template>
            <template v-slot:[`item.achievements`]="{ item }">
              <AchievementChip :badges="item.achievements" />
            </template>
            <template v-slot:[`item.ladder_points`]="{ item }">{{ item.ladder_points }}</template>
            <template v-slot:[`header.mmr`]="{ column, isSorted, getSortIcon }">
              <W3CMmr :sort-icon="isSorted(column) ? getSortIcon(column) : null" />
            </template>
            <template v-slot:[`header.mmrDiff`]="{ column, isSorted, getSortIcon }">
              <W3CMmr suffix=" +/-" :sort-icon="isSorted(column) ? getSortIcon(column) : null" />
            </template>
            <template v-slot:[`item.race`]="{ item }">
              <RaceIcon v-if="item.race" :raceIdentifier="item.race" />
            </template>
            <template v-slot:[`item.name`]="{ item }">
              <PlayerName :player="item" @click.stop="openPlayerDetails(item)">
                <span v-if="!item.synced_at" class="d-inline-flex">
                  <v-icon size="x-small" color="amber-darken-2">mdi-sync-alert</v-icon>
                  <v-tooltip activator="parent" location="top">not fully synced</v-tooltip>
                </span>
              </PlayerName>
            </template>
            <template v-slot:[`item.teamName`]="{ item }">
              <div class="d-flex align-center">
                <v-avatar size="20" rounded="sm" class="mr-2" style="flex-shrink:0">
                  <img class="team-icon" :src="teamImageUrl(item.teamId)" @error="showDefaultTeamImage">
                </v-avatar>
                <span>{{ item.teamName }}</span>
              </div>
            </template>
            <template v-slot:[`item.points`]="{ item }">
              <span class="font-weight-bold">{{ item.points }}</span>
            </template>
            <template v-slot:[`item.wins`]="{ item }">
              <span class="text-green">{{ item.wins }}</span>
            </template>
            <template v-slot:[`item.losses`]="{ item }">
              <span class="text-red">{{ item.losses }}</span>
            </template>
            <template v-slot:[`item.mmr`]="{ item }">{{ item.mmr ?? '—' }}</template>
            <template v-slot:[`item.mmrDiff`]="{ item }">
              <span v-if="item.mmrDiff == null">—</span>
              <span v-else :class="item.mmrDiff > 0 ? 'text-green' : item.mmrDiff < 0 ? 'text-red' : ''">
                {{ item.mmrDiff > 0 ? `+${item.mmrDiff}` : item.mmrDiff }}
              </span>
            </template>
            <template v-slot:expanded-row="{ columns, item }">
              <tr>
                <td :colspan="columns.length" class="pa-0">
                  <!-- sticky: stays in view when the summary row scrolls sideways on a narrow window -->
                  <div class="pa-4 expanded-details">
                    <div v-if="!fullPlayers[item.id]" class="text-center pa-4">
                      <v-progress-circular indeterminate color="primary" />
                    </div>
                    <PlayerLadderTab
                      v-else
                      :player="fullPlayers[item.id]"
                      :seasonId="selectedSeasonId"
                      @open-player="openOpponent"
                    />
                  </div>
                </td>
              </tr>
            </template>
          </v-data-table>
        </v-card-text>
      </v-card>
    </template>

    <PlayerDetailsDialog
      ref="playerDetailsDialog"
      :seasonId="selectedSeasonId"
      :seasonName="seasonName"
      :w3cSeason="currentW3CSeason"
    />

    <W3CSyncResultDialog v-model="syncDialog" :entries="syncEntries" />
  </v-container>
</template>

<script setup>
import { computed, onMounted, ref, watch } from 'vue';
import { storeToRefs } from 'pinia';
import { useAuthStore, useLadderStore, usePlayerStore, useSeasonStore } from '@/stores';
import { resolveCurrentW3CSeason } from '@/helpers/current-season';
import { agoFromIso, localFromIso } from '@/helpers/w3c-stats';
import W3CIcon from '@/components/W3CIcon.vue';
import w3championsLogo from '@/assets/media/w3champions-logo.png';
import w3cLogoWhite from '@/assets/media/w3c-logo-white.png';
import { teamImageUrl, showDefaultTeamImage } from '@/helpers/team-image';
import { SCORED_NOTE, ACHIEVEMENTS_NOTE, LADDER_NOTE } from '@/helpers/achievements';
import ColumnNote from '@/components/ColumnNote.vue';
import W3CMmr from '@/components/W3CMmr.vue';
import FilterPanel from '@/components/FilterPanel.vue';
import PlayerDetailsDialog from '@/components/PlayerDetailsDialog.vue';
import PlayerLadderTab from '@/components/PlayerLadderTab.vue';
import AchievementChip from '@/components/AchievementChip.vue';
import W3CSyncResultDialog from '@/components/W3CSyncResultDialog.vue';
import SyncProgress from '@/components/SyncProgress.vue';
import SeasonSelect from '@/components/SeasonSelect.vue';
import StatusAlert from '@/components/StatusAlert.vue';
import { useColumns } from '@/helpers/columns';

const ladderStore = useLadderStore();
const seasonStore = useSeasonStore();
const playerStore = usePlayerStore();
const auth = useAuthStore();

const { seasons, selectedSeasonId } = storeToRefs(seasonStore);

const ladder = ref(null);
const currentW3CSeason = ref(null);
const isLoading = ref(false);
const isSyncing = ref(false);
const errorMessage = ref(null);

const searchName = ref('');
const searchRace = ref(null);
const searchTeam = ref(null);

const syncDialog = ref(false);
const syncEntries = ref([]);
const playerDetailsDialog = ref(null);
const expanded = ref([]);
const fullPlayers = ref({});

// The ladder row carries no gnl_stats, so an expanding row reads the full player once
watch(expanded, async (ids) => {
  for (const id of ids) {
    if (fullPlayers.value[id]) continue;
    try {
      fullPlayers.value[id] = await playerStore.getPlayer(id);
    } catch (error) {
      errorMessage.value = error.message;
    }
  }
});

// Points and Achievements sit together because the first is the sum of the second and the ladder
const allTableHeader = computed(() => [
  { title: '', key: 'data-table-expand', sortable: false, width: 48 },
  { mobile: false, title: 'Race', key: 'race', sortable: true, width: 64 },
  { title: 'Name', key: 'name', sortable: true },
  { mobile: false, title: 'Team', key: 'teamName', sortable: true },
  { mobile: false, title: 'Ladder Points', key: 'ladder_points', sortable: true },
  { mobile: false, title: 'Achievements', key: 'achievements', sortable: false },
  { title: 'Total Points', key: 'points', sortable: true },
  { mobile: false, title: 'Wins', key: 'wins', sortable: true },
  { mobile: false, title: 'Losses', key: 'losses', sortable: true },
  { mobile: false, title: 'MMR', key: 'mmr', sortable: true },
  { mobile: false, title: 'MMR +/-', key: 'mmrDiff', sortable: true },
]);
const tableHeader = useColumns(allTableHeader);

const seasonName = computed(() =>
  seasons.value.find(s => s.id === selectedSeasonId.value)?.name ?? ''
);

const seasonDates = computed(() => {
  const season = ladder.value?.season;
  return season?.start_date && season?.end_date ? `${season.start_date} to ${season.end_date}` : '';
});

const seasonPoints = computed(() =>
  (ladder.value?.teams ?? []).reduce((sum, team) => sum + team.points, 0)
);

const seasonPlayers = computed(() =>
  (ladder.value?.teams ?? []).reduce((sum, team) => sum + team.players.length, 0)
);

// A season counts as synced only while every player of it carries a stamp
const syncCaption = computed(() => {
  const players = allPlayers.value;
  const synced = players.filter(player => player.synced_at).length;
  if (!synced) return 'never synced';
  if (synced < players.length) return `partly synced \u00b7 ${synced} of ${players.length} players`;
  return `synced ${agoFromIso(ladder.value?.season?.synced_at)}`;
});

const syncStamp = computed(() => localFromIso(ladder.value?.season?.synced_at));

const teamOptions = computed(() =>
  (ladder.value?.teams ?? []).map(team => ({ id: team.id, name: team.name }))
);

// One row per player of the season, carrying the team he plays for
const allPlayers = computed(() =>
  (ladder.value?.teams ?? []).flatMap(team =>
    team.players.map(player => ({
      ...player,
      teamId: team.id,
      teamName: team.name,
      mmr: player.mmr?.current ?? null,
      // A player still in his placement games has no MMR, so there is no span to subtract
      mmrDiff: player.mmr?.current != null && player.mmr?.start != null
        ? player.mmr.current - player.mmr.start
        : null,
    }))
  )
);

const filteredPlayers = computed(() => {
  let list = allPlayers.value;
  const term = (searchName.value || '').trim().toLowerCase();
  if (term) {
    list = list.filter(p =>
      (p.name || '').toLowerCase().includes(term) || (p.battleTag || '').toLowerCase().includes(term)
    );
  }
  if (searchRace.value) list = list.filter(p => p.race === searchRace.value);
  if (searchTeam.value) list = list.filter(p => p.teamId === searchTeam.value);
  return list;
});

const resetFilters = () => {
  searchName.value = '';
  searchRace.value = null;
  searchTeam.value = null;
};

const loadLadder = async () => {
  if (!selectedSeasonId.value) return;
  expanded.value = [];
  isLoading.value = true;
  errorMessage.value = null;
  try {
    ladder.value = await ladderStore.seasonLadder(selectedSeasonId.value);
  } catch (error) {
    ladder.value = null;
    errorMessage.value = error.message;
  } finally {
    isLoading.value = false;
  }
};

const syncLadder = async () => {
  isSyncing.value = true;
  errorMessage.value = null;
  try {
    const result = await ladderStore.syncSeason(selectedSeasonId.value);
    syncEntries.value = [{ title: seasonName.value, result }];
    syncDialog.value = true;
    await loadLadder();
  } catch (error) {
    errorMessage.value = error.message;
  } finally {
    isSyncing.value = false;
  }
};

const openPlayerDetails = (player) => {
  playerDetailsDialog.value.open({ id: player.id, name: player.name, battleTag: player.battleTag, race: player.race });
};

// An opponent clicked inside an expanded panel; the dialog fetches the rest itself
const openOpponent = (userId) => {
  playerDetailsDialog.value.open({ id: userId });
};

watch(selectedSeasonId, loadLadder, { immediate: true });

onMounted(async () => {
  currentW3CSeason.value = await resolveCurrentW3CSeason();
});
</script>

<style scoped>
/* The season totals, under the column each one belongs to */
.standings-total td {
  border-top: 1px solid rgba(var(--v-border-color), var(--v-border-opacity));
}
.team-icon {
  width: 100%;
  height: 100%;
  object-fit: contain;
}
.standings-table thead tr th {
  font-size: 0.75rem;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  color: rgba(var(--v-theme-on-surface), 0.6) !important;
}
.standings-first {
  background: rgba(var(--v-theme-primary), 0.06);
}
.expanded-details {
  position: sticky;
  left: 0;
  max-width: calc(100vw - 48px);
}
</style>
