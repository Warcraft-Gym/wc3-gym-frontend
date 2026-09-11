<template>
  <v-container fluid class="pa-4">
    <div class="d-flex align-center flex-wrap ga-3 mb-4">
      <h1>
        <v-icon class="mr-2">mdi-account-group</v-icon>
        Players
      </h1>
      <v-spacer />
      <v-btn v-if="auth.isAdmin" variant="elevated" color="primary" prepend-icon="mdi-plus" @click="openCreateNew">
        Add Player
      </v-btn>
    </div>

    <FilterPanel
      v-model:searchName="searchName"
      v-model:searchRace="searchRace"
      v-model:selectedSeasonFilter="selectedSeasonFilter"
      v-model:rangeValues="rangeValues"
      :seasons="seasons"
      :extra-active="selectedFlags.length"
      @reset="clearFilters"
    >
      <template #after>
        <v-col cols="12" md="3">
          <v-select
            v-model="selectedFlags"
            :items="flagOptions"
            placeholder="Show only"
            aria-label="Show only"
            prepend-inner-icon="mdi-alert-outline"
            multiple
            chips
            closable-chips
            clearable
            variant="outlined"
            density="compact"
            hide-details
          />
        </v-col>
      </template>
      <template #summary>
        <span class="text-body-2 text-medium-emphasis">{{ countLabel }}</span>
      </template>
    </FilterPanel>

    <v-card elevation="1">
      <v-alert v-if="errorMessage" type="error" variant="tonal" class="ma-4">{{ errorMessage }}</v-alert>
      <v-data-table
        v-else
        :headers="tableHeader"
        :items="filteredRows"
        item-value="key"
        :loading="isLoading"
        v-model:sort-by="sortBy"
        must-sort
        :items-per-page="25"
        no-data-text="No players match these filters"
        class="tabular"
        hover
      >
        <template #loading>
          <v-skeleton-loader type="table-row@10" />
        </template>

        <template #[`header.best_mmr`]="{ column, isSorted, getSortIcon }">
          <W3CMmr
            :suffix="currentW3CSeason ? ` (S${currentW3CSeason})` : ''"
            :sort-icon="isSorted(column) ? getSortIcon(column) : null"
          />
        </template>

        <template #item="{ item }">
          <tr class="text-no-wrap" :class="{ 'player-row': item.id != null }" @click="go(item)">
            <td>
              <PlayerName v-if="item.id != null" :player="item" @click.stop="go(item)">
                <template v-if="!hasW3CStatsTwoSeasons(item, currentW3CSeason, item.race)">
                  <v-tooltip>
                    <template #activator="{ props }">
                      <v-icon v-bind="props" small color="red">mdi-alert</v-icon>
                    </template>
                    <span>No W3C stats found for {{ item.race }}</span>
                  </v-tooltip>
                </template>
                <template v-else-if="hasLowGamesTwoSeasons(item, currentW3CSeason, item.race)">
                  <v-tooltip>
                    <template #activator="{ props }">
                      <v-icon v-bind="props" small color="orange">mdi-alert</v-icon>
                    </template>
                    <span>Less than 20 games ({{ getW3CGamesCount(item, currentW3CSeason, item.race) }} games) for {{ item.race }}</span>
                  </v-tooltip>
                </template>
              </PlayerName>
              <span v-else class="text-medium-emphasis">{{ item.name }}</span>
            </td>
            <td class="d-none d-md-table-cell">
              <RaceMmrChips v-if="item.id != null" :player="item" :w3cSeason="currentW3CSeason" :max="2" />
            </td>
            <td class="text-end">{{ item.rating ?? '—' }}</td>
            <td class="text-end">
              <template v-if="item.career">
                {{ item.career.series_won }}-{{ item.career.series_lost }}
                <span class="text-medium-emphasis ml-1">{{ item.career.series_winrate }}%</span>
              </template>
              <template v-else>—</template>
            </td>
            <td class="text-end d-none d-md-table-cell">
              <template v-if="item.career">
                {{ item.career.games_won }}-{{ item.career.games_lost }}
                <span class="text-medium-emphasis ml-1">{{ item.career.games_winrate }}%</span>
              </template>
              <template v-else>—</template>
            </td>
            <td class="text-end d-none d-md-table-cell">{{ item.seasons_played ?? '—' }}</td>
            <td class="d-none d-md-table-cell">
              <div v-if="item.signup_seasons && item.signup_seasons.length > 0">
                <template v-for="s in item.signup_seasons.slice().sort((a,b) => b.id - a.id).slice(0,1)" :key="s.id">
                  <v-chip small class="ma-1 event-chip" :title="s.name">{{ s.name }}</v-chip>
                </template>
                <v-menu v-if="item.signup_seasons.length > 1" offset-y>
                  <template #activator="{ props }">
                    <v-chip v-bind="props" class="ma-1" small @click.stop>+{{ item.signup_seasons.length - 1 }}</v-chip>
                  </template>
                  <v-list>
                    <v-list-item v-for="s in item.signup_seasons.slice().sort((a,b) => b.id - a.id)" :key="s.id">
                      <v-list-item-title>{{ s.name }}</v-list-item-title>
                    </v-list-item>
                  </v-list>
                </v-menu>
              </div>
              <div v-else>—</div>
            </td>
            <td v-if="auth.isAdmin" @click.stop>
              <RowActions :actions="rowActions(item)" />
            </td>
          </tr>
        </template>
      </v-data-table>
    </v-card>

    <!-- Add New Player Dialog -->
    <v-dialog v-model="showNewPlayerModal" max-width="800">
      <v-card>
        <v-card-title class="bg-primary">
          <v-icon class="mr-2">mdi-account-plus</v-icon>
          Add New Player
        </v-card-title>

        <v-alert
          v-if="creationError"
          type="error"
          variant="tonal"
          border="start"
          border-color="red"
          class="mx-4 my-2"
          closable
          @click:close="creationError = null"
        >
          {{ creationError }}
        </v-alert>

        <v-card-text class="pt-4">
          <v-row>
            <v-col cols="12" md="6">
              <v-text-field
                v-model="newPlayer.name"
                label="Player Name"
                variant="outlined"
                prepend-inner-icon="mdi-account"
                density="comfortable"
              ></v-text-field>
            </v-col>
            <v-col cols="12" md="6">
              <v-text-field
                v-model="newPlayer.battleTag"
                label="BattleTag"
                variant="outlined"
                prepend-inner-icon="mdi-shield-account"
                density="comfortable"
              ></v-text-field>
            </v-col>
          </v-row>
          <v-row>
            <v-col cols="12" md="6">
              <CountrySelect v-model="newPlayer.country" />
            </v-col>
            <v-col cols="12" md="6">
              <v-text-field
                v-model="newPlayer.discordTag"
                label="Discord Tag"
                variant="outlined"
                prepend-inner-icon="$discord"
                density="comfortable"
              ></v-text-field>
            </v-col>
          </v-row>
          <v-row>
            <v-col cols="12" md="6">
              <v-text-field
                v-model="newPlayer.discordId"
                label="Discord ID"
                hint="Numeric Discord user ID (required)"
                variant="outlined"
                prepend-inner-icon="mdi-identifier"
                density="comfortable"
              ></v-text-field>
            </v-col>
          </v-row>
          <v-row>
            <v-col cols="12" md="6">
              <RaceSelect v-model="newPlayer.race" />
            </v-col>
          </v-row>
        </v-card-text>

        <v-card-actions>
          <v-spacer />
          <v-btn @click="cancelAddNewPlayer">Cancel</v-btn>
          <v-btn
            v-if="auth.isAdmin"
            @click="createNewPlayer"
            color="primary"
            variant="elevated"
            prepend-icon="mdi-plus"
            :loading="isCreating"
            :disabled="isCreating"
          >
            Add Player
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <EditPlayerDialog
      ref="editPlayerDialog"
      :can-save="auth.isAdmin"
      :refresh="load"
    />

    <SeasonSignupDialog ref="signupDialog" @added="load" />

    <CareerStatsDialog v-if="auth.isAdmin" ref="careerDialog" :players="players" @changed="load" />

    <ConfirmDeleteDialog
      v-model="showDeleteDialog"
      message="Are you sure you want to delete this player? This action cannot be undone."
      delete-icon="mdi-delete"
      :can-delete="auth.isAdmin"
      @confirm="confirmDelete"
      @cancel="cancelDeleteDialog"
    />
  </v-container>
</template>
<script setup>
import RowActions from '@/components/RowActions.vue';
import { useAuthStore, usePlayerStore, useSeasonStore } from '@/stores';
import { usePlayerCareerStatsStore } from '@/stores/player_career_stats.store';
import { storeToRefs } from 'pinia';
import { onMounted, ref, computed, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { findSeason } from '@/helpers/season-slug.mjs';
import EditPlayerDialog from '@/components/EditPlayerDialog.vue';
import SeasonSignupDialog from '@/components/SeasonSignupDialog.vue';
import CareerStatsDialog from '@/components/CareerStatsDialog.vue';
import ConfirmDeleteDialog from '@/components/ConfirmDeleteDialog.vue';
import FilterPanel from '@/components/FilterPanel.vue';
import { useDeleteDialog } from '@/helpers/delete-dialog';
import { resolveCurrentW3CSeason } from '@/helpers/current-season';
import {
  getAllRaceStats,
  getW3CGamesCount,
  hasW3CStatsTwoSeasons,
  hasLowGamesTwoSeasons
} from '@/helpers/w3c-stats';
import RaceMmrChips from '@/components/RaceMmrChips.vue';
import W3CMmr from '@/components/W3CMmr.vue';
import { matchesPlayerSearch, filterByMmrRange, playerPath, playersWithCareers } from '@/helpers/players';
import { useColumns } from '@/helpers/columns';

const editPlayerDialog = ref(null);
const signupDialog = ref(null);
const careerDialog = ref(null);
const isLoading = ref(false);
const isCreating = ref(false);
const errorMessage = ref(null);
const creationError = ref(null);
const showNewPlayerModal = ref(false);
const newPlayer = ref({
  name: '',
  battleTag: '',
  country: '',
  discordTag: '',
  discordId: '',
  race: '',
});
const router = useRouter();
const route = useRoute();
const playerStore = usePlayerStore();
const careerStore = usePlayerCareerStatsStore();
const seasonStore = useSeasonStore();
const auth = useAuthStore();
const { players } = storeToRefs(playerStore);
const { stats: careers } = storeToRefs(careerStore);
const { seasons } = storeToRefs(seasonStore);
const { showDeleteDialog, openDeleteDialog, confirmDelete, cancelDeleteDialog } = useDeleteDialog();

// Filters
const searchName = ref('');
const searchRace = ref(null);
const selectedSeasonFilter = ref(null);
const rangeValues = ref([0, 3000]);
const selectedFlags = ref([]);

// Current W3C season number (for stats fallback logic)
const currentW3CSeason = ref(null);

// The best raced MMR, so the range filter matches a player on any race they play
const bestMmr = (player) => Math.max(0, ...getAllRaceStats(player, currentW3CSeason.value)
  .filter((stat) => (stat.games || 0) > 0)
  .map((stat) => stat.mmr || 0));

const FLAGS = {
  no_stats: row => row.id != null && !hasW3CStatsTwoSeasons(row, currentW3CSeason.value, row.race),
  low_games: row => row.id != null && hasLowGamesTwoSeasons(row, currentW3CSeason.value, row.race),
  unlinked: row => row.id == null && row.career?.id != null,
};
const flagOptions = computed(() => [
  { title: 'No W3C stats', value: 'no_stats' },
  { title: 'Less than 20 games', value: 'low_games' },
  ...(auth.isAdmin ? [{ title: 'Unlinked players', value: 'unlinked' }] : []),
]);

const rows = computed(() => playersWithCareers(players.value || [], careers.value || [])
  .map(row => ({ ...row, best_mmr: row.id != null ? bestMmr(row) || null : null })));

// Career rows no player claims stay out until an admin asks for them to link them
const baseRows = computed(() => selectedFlags.value.includes('unlinked')
  ? rows.value
  : rows.value.filter(row => row.id != null));

const filteredRows = computed(() => {
  let list = baseRows.value;
  if (searchName.value && searchName.value.trim().length > 0) {
    list = list.filter(row => matchesPlayerSearch(row, searchName.value));
  }
  if (searchRace.value) {
    list = list.filter(row => row.race === searchRace.value);
  }
  if (selectedSeasonFilter.value) {
    list = list.filter(row => (row.signup_seasons || []).some(s => s.id === selectedSeasonFilter.value));
  }
  list = filterByMmrRange(list, rangeValues.value, row => row.best_mmr ?? 0);
  if (selectedFlags.value.length > 0) {
    list = list.filter(row => selectedFlags.value.some(flag => FLAGS[flag](row)));
  }
  return list;
});

const countLabel = computed(() => filteredRows.value.length === baseRows.value.length
  ? `${baseRows.value.length} players`
  : `${filteredRows.value.length} of ${baseRows.value.length} players`);

// Rows without career totals sort last, because Vuetify orders empty values first on ascending
const sortBy = ref([{ key: 'rating', order: 'desc' }]);

const allTableHeader = computed(() => [
  { title: 'Name', key: 'name' },
  { mobile: false, title: 'W3C MMR', key: 'best_mmr' },
  { title: 'Rating', key: 'rating', align: 'end' },
  { title: 'Series', key: 'series_winrate', align: 'end' },
  { mobile: false, title: 'Games', key: 'games_winrate', align: 'end' },
  { mobile: false, title: 'Seasons', key: 'seasons_played', align: 'end' },
  { mobile: false, title: 'Events', key: 'events', sortable: false },
  ...(auth.isAdmin ? [{ title: '', key: 'actions', align: 'end', sortable: false }] : []),
]);
const tableHeader = useColumns(allTableHeader);

// A history row has no player page to open
const go = (row) => {
  if (row.id != null) router.push(playerPath(row));
};

const openCareer = (row) => careerDialog.value.open(row.career);
const rowActions = (row) => row.id == null
  ? [{ icon: 'mdi-history', label: 'Career stats', onClick: () => openCareer(row) }]
  : [
    { icon: 'mdi-pencil', label: 'Edit', onClick: () => editPlayerDialog.value.open(row) },
    { icon: 'mdi-account-check', label: 'Add to season', onClick: () => signupDialog.value.open({ player: row }) },
    { icon: syncIcon(row.id), label: syncLabel(row.id), color: syncColor(row.id), loading: syncState(row.id) === 'loading', onClick: () => syncW3CPlayer(row.id) },
    ...(row.career?.id != null ? [{ icon: 'mdi-history', label: 'Career stats', onClick: () => openCareer(row) }] : []),
    { icon: 'mdi-delete', label: 'Delete', color: 'error', onClick: () => openDeleteDialog(row.id, removePlayer) },
  ];

const load = async () => {
  isLoading.value = true;
  errorMessage.value = null;
  try {
    await Promise.all([playerStore.fetchPlayers(), careerStore.fetchAll()]);
  } catch (error) {
    console.error('Failed to load players:', error);
    errorMessage.value = 'Failed to load players. Please try again later.';
  } finally {
    isLoading.value = false;
  }
};

const clearFilters = () => {
  searchName.value = '';
  searchRace.value = null;
  selectedSeasonFilter.value = null;
  rangeValues.value = [0, 3000];
  selectedFlags.value = [];
};

// ?season= carries the events filter across a reload and a link; no key shows every season
watch(selectedSeasonFilter, (id) => {
  const season = id ? seasonStore.slugOf(id) : undefined;
  if (route.query.season !== season) router.replace({ query: { ...route.query, season } });
});

onMounted(async () => {
  // Seasons feed the events filter
  try {
    await seasonStore.fetchSeasons();
  } catch (err) {
    console.error('Failed to fetch seasons:', err);
  }
  selectedSeasonFilter.value = findSeason(seasons.value, route.query.season)?.id ?? null;
  await load();
  currentW3CSeason.value = await resolveCurrentW3CSeason();
});

// per-player sync status map: { [playerId]: { state: 'loading'|'success'|'error', message?: string } }
const perPlayerSyncStatus = ref({});

const openCreateNew = () => {
  newPlayer.value = {
    name: '',
    battleTag: '',
    country: '',
    discordTag: '',
    discordId: '',
    mmr: 0,
    race: '',
  };
  creationError.value = '';
  showNewPlayerModal.value = true;
};

const createNewPlayer = async () => {
  creationError.value = '';
  isCreating.value = true;
  try {
    // send newPlayer directly — fields use backend schema names
    await playerStore.createPlayer(newPlayer.value);
    await load();
    cancelAddNewPlayer();
  } catch (error) {
    console.error('Error creating user:', error);
    creationError.value = 'Error creating user: ' + error.message;
  } finally {
    isCreating.value = false;
  }
};

const removePlayer = async (playerId) => {
  try {
    await playerStore.deletePlayer(playerId);
    await load();
  } catch (error) {
    console.error('Error deleting player:', error);
  }
};

const syncState = (playerId) => perPlayerSyncStatus.value[playerId]?.state;
const syncIcon = (playerId) => ({ success: 'mdi-check-circle', error: 'mdi-alert-circle' }[syncState(playerId)] ?? 'mdi-sync');
const syncLabel = (playerId) => ({ success: 'Synced', error: 'Retry Sync' }[syncState(playerId)] ?? 'Sync W3C');
const syncColor = (playerId) => ({ success: 'success', error: 'error' }[syncState(playerId)]);

const syncW3CPlayer = async (playerId) => {
  if (!playerId) return;
  perPlayerSyncStatus.value = { ...perPlayerSyncStatus.value, [playerId]: { state: 'loading' } };
  try {
    await playerStore.syncW3CPlayer(playerId);
    perPlayerSyncStatus.value = { ...perPlayerSyncStatus.value, [playerId]: { state: 'success' } };
  } catch (error) {
    console.error('Error syncing player:', playerId, error);
    perPlayerSyncStatus.value = { ...perPlayerSyncStatus.value, [playerId]: { state: 'error', message: error.message } };
  }
};

const cancelAddNewPlayer = () => {
  showNewPlayerModal.value = false;
  newPlayer.value = {
    name: '',
    battleTag: '',
    country: '',
    discordTag: '',
    discordId: '',
    race: '',
  };
};
</script>

<style scoped>
.player-row {
  cursor: pointer;
}
/* Fixed-width digits, so ratings and records line up down a column */
.tabular :deep(td) {
  font-variant-numeric: tabular-nums;
}
/* Eight columns fit a 1440px screen with the admin menu; phones keep base.css padding */
@media (min-width: 960px) {
  .tabular :deep(.v-table__wrapper > table > tbody > tr > td),
  .tabular :deep(.v-table__wrapper > table > thead > tr > th) {
    padding-inline: 12px;
  }
}
/* A long event name ends in an ellipsis rather than push the table off the card */
.event-chip {
  max-width: 120px;
}
.event-chip :deep(.v-chip__content) {
  overflow: hidden;
  text-overflow: ellipsis;
}
</style>
