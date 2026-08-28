<template>
  <div>
    <v-alert
      v-if="errorMessage"
      type="error"
      variant="tonal"
      border="start"
      border-color="red"
      class="mb-4"
      closable
      @click:close="errorMessage = null"
    >
      {{ errorMessage }}
    </v-alert>

    <v-row align="center" class="my-2">
      <v-spacer />
      <v-col cols="12" sm="4" md="3">
        <v-select
          v-model="scope"
          :items="scopeOptions"
          item-title="name"
          item-value="id"
          label="Season"
          variant="outlined"
          density="compact"
          hide-details
          @update:modelValue="reload"
        />
      </v-col>
    </v-row>

    <!-- One row of figures rather than four cards; the tab has a lot below it -->
    <v-card variant="outlined" class="mb-4">
      <v-card-text class="d-flex flex-wrap align-center py-2" style="gap: 28px">
        <div v-if="scoped">
          <ColumnNote title="Points" :note="SCORED_NOTE" class="text-caption text-medium-emphasis" />
          <div class="text-h6">{{ data?.points ?? 0 }} <span class="text-caption text-medium-emphasis">{{ ladderPointsLine }}</span></div>
        </div>
        <div>
          <div class="text-caption text-medium-emphasis">Record</div>
          <div class="text-h6">
            <span class="text-green">{{ data?.wins ?? 0 }}</span>
            <span class="text-medium-emphasis"> - </span>
            <span class="text-red">{{ data?.losses ?? 0 }}</span>
            <span class="text-caption text-medium-emphasis"> {{ winrate }} of {{ data?.games ?? 0 }} games</span>
          </div>
        </div>
        <div>
          <ColumnNote title="MMR" :note="MMR_NOTE" class="text-caption text-medium-emphasis" />
          <div class="text-h6">
            {{ data?.mmr?.current ?? '—' }}
            <span class="text-caption text-medium-emphasis">{{ mmrRange }}</span>
          </div>
        </div>
        <v-spacer />
        <a v-if="player?.battleTag" :href="w3cStatsUrl" target="_blank" class="text-caption d-inline-flex align-center"><W3CIcon :size="14" class="mr-1" />W3Champions</a>
      </v-card-text>
    </v-card>

    <!-- Versus race: five short entries side by side, the record and the rate only -->
    <v-card variant="outlined" class="mb-4">
      <v-card-title class="text-body-2">Versus race</v-card-title>
      <v-card-text class="race-grid pt-0">
        <div v-for="row in versusRaces" :key="row.code" class="d-flex align-center text-body-2" style="gap: 8px">
          <RaceIcon :raceIdentifier="row.code" />
          <span class="text-no-wrap">{{ row.name }}</span>
          <span class="text-no-wrap">
            <span class="text-green">{{ row.w }}</span>
            <span class="text-medium-emphasis"> - </span>
            <span class="text-red">{{ row.l }}</span>
          </span>
          <span class="text-medium-emphasis text-no-wrap">{{ row.rate }}%</span>
        </div>
      </v-card-text>
    </v-card>

    <!-- Achievements: what the season paid out, then the rules still open -->
    <v-card v-if="scoped" variant="outlined" class="mb-4">
      <v-card-title class="text-body-2 d-flex align-center">
        <span>Achievements</span>
        <v-spacer />
        <span class="text-caption text-medium-emphasis">{{ achievedPoints }} pts</span>
      </v-card-title>
      <v-card-text class="pt-0">
        <div v-for="badge in earned" :key="badge.id" class="d-flex align-center badge-row">
          <v-icon size="small" color="amber-darken-2" class="mr-3">{{ badge.icon }}</v-icon>
          <span class="text-body-2 font-weight-medium mr-3">{{ badge.name }}</span>
          <span class="text-caption text-medium-emphasis">{{ badge.description }}</span>
          <v-spacer />
          <span class="text-body-2 text-amber-darken-2 ml-3">+{{ badge.points }}</span>
        </div>
        <div
          class="text-caption text-medium-emphasis mt-4 mb-1 d-flex align-center locked-toggle"
          @click="showLocked = !showLocked"
        >
          <span>Locked &middot; {{ locked.length }}</span>
          <v-icon size="small" class="ml-1">{{ showLocked ? 'mdi-chevron-up' : 'mdi-chevron-down' }}</v-icon>
        </div>
        <template v-if="showLocked">
          <div v-for="badge in locked" :key="badge.id" class="d-flex align-center badge-row text-medium-emphasis">
            <v-icon size="small" class="mr-3">{{ badge.icon }}</v-icon>
            <span class="text-body-2 mr-3">{{ badge.name }}</span>
            <span class="text-caption">{{ badge.description }}</span>
            <v-spacer />
            <span class="text-body-2 ml-3">+{{ badge.points }}</span>
          </div>
        </template>
      </v-card-text>
    </v-card>

    <!-- Ladder matches, one page of the route at a time -->
    <v-card variant="outlined">
      <v-card-title class="text-body-2 d-flex align-center">
        <span>W3C ladder matches</span>
        <span class="text-caption text-medium-emphasis ml-2">ranked 1v1, not GNL series</span>
        <v-spacer />
        <span class="text-caption text-medium-emphasis">{{ data?.games ?? 0 }}</span>
      </v-card-title>
      <v-data-table-server
        :headers="matchHeaders"
        :items="data?.matches ?? []"
        :items-length="data?.games ?? 0"
        :items-per-page="itemsPerPage"
        v-model:page="page"
        :loading="isLoading"
        density="compact"
        @update:options="loadPage"
      >
        <template v-slot:[`item.start_time`]="{ item }">{{ matchDate(item.start_time) }}</template>
        <template v-slot:[`item.map_name`]="{ item }">{{ item.map_name || '—' }}</template>
        <template v-slot:[`item.opp_battletag`]="{ item }">
          <div class="d-flex align-center" style="gap: 6px">
            <RaceIcon v-if="item.opp_race" :raceIdentifier="item.opp_race" />
            <span
              v-if="item.opp_user_id"
              class="opponent-link"
              @click.stop="emit('open-player', item.opp_user_id)"
            >{{ item.opp_battletag }}</span>
            <span v-else>{{ item.opp_battletag }}</span>
            <v-chip v-if="teamOf(item.opp_user_id)" size="x-small">{{ teamOf(item.opp_user_id) }}</v-chip>
          </div>
        </template>
        <template v-slot:[`item.won`]="{ item }">
          <span :class="item.won ? 'text-green' : 'text-red'">{{ item.won ? 'W' : 'L' }}</span>
        </template>
        <template v-slot:[`item.duration_s`]="{ item }">{{ duration(item.duration_s) }}</template>
        <template v-slot:[`item.mmr_diff`]="{ item }">
          <span v-if="mmrDiff(item) == null">—</span>
          <span v-else :class="mmrDiff(item) > 0 ? 'text-green' : mmrDiff(item) < 0 ? 'text-red' : ''">
            {{ mmrDiff(item) > 0 ? `+${mmrDiff(item)}` : mmrDiff(item) }}
          </span>
        </template>
      </v-data-table-server>
    </v-card>
  </div>
</template>

<script setup>
import { computed, ref, watch } from 'vue';
import { DateTime } from 'luxon';
import { useLadderStore, useSeasonStore } from '@/stores';
import RaceIcon from '@/components/RaceIcon.vue';
import W3CIcon from '@/components/W3CIcon.vue';
import { achievementPoints, SCORED_NOTE, MMR_NOTE } from '@/helpers/achievements';
import ColumnNote from '@/components/ColumnNote.vue';

const props = defineProps({
  player: { type: Object, default: null },
  seasonId: { type: Number, default: null },
});

const emit = defineEmits(['open-player']);

const ladderStore = useLadderStore();
const seasonStore = useSeasonStore();

const scope = ref(props.seasonId ?? 'all');
const data = ref(null);
const seasonLadder = ref(null);
const isLoading = ref(false);
const errorMessage = ref(null);
const itemsPerPage = ref(10);
const page = ref(1);
const showLocked = ref(false);

const scoped = computed(() => scope.value !== 'all');

const scopeOptions = computed(() => [
  ...(seasonStore.seasons || []).map(season => ({ id: season.id, name: season.name })),
  { id: 'all', name: 'All time' },
]);

const matchHeaders = [
  { title: 'Date (UTC)', key: 'start_time', sortable: false },
  { title: 'Map', key: 'map_name', sortable: false },
  { title: 'Opponent', key: 'opp_battletag', sortable: false },
  { title: 'Result', key: 'won', sortable: false },
  { title: 'Duration', key: 'duration_s', sortable: false },
  { title: 'MMR +/-', key: 'mmr_diff', sortable: false },
];

const w3cStatsUrl = computed(
  () => `https://www.w3champions.com/player/${encodeURIComponent(props.player?.battleTag ?? '')}/statistics`
);

const winrate = computed(() => {
  const games = data.value?.games ?? 0;
  return games ? `${Math.round((data.value.wins / games) * 100)}%` : '0%';
});

const mmrRange = computed(() => {
  const mmr = data.value?.mmr;
  return mmr?.min != null && mmr?.max != null ? `${mmr.min} - ${mmr.max}` : '';
});

// The earned rules come with the player, the whole catalogue with the season
const earned = computed(() => data.value?.achievements ?? []);
const achievedPoints = computed(() => achievementPoints(earned.value));

// The tile total is the two halves added, so the caption names both
const ladderPointsLine = computed(() => {
  const ladder = (data.value?.wins ?? 0) * 3 + (data.value?.losses ?? 0);
  return `${ladder} ladder + ${achievedPoints.value} achievements`;
});

const locked = computed(() => {
  const won = new Set(earned.value.map(badge => badge.id));
  return (seasonLadder.value?.achievement_rules ?? []).filter(rule => !won.has(rule.id));
});

const versusRaces = computed(() => {
  const names = { HU: 'Human', OC: 'Orc', NE: 'Night Elf', UD: 'Undead', RANDOM: 'Random' };
  const vs = data.value?.vs_race ?? {};
  return Object.keys(names).map(code => {
    const [w, l] = vs[code] ?? [0, 0];
    const total = w + l;
    return { code, name: names[code], w, l, total, rate: total ? Math.round((w / total) * 100) : 0 };
  });
});

// The team of the season a GNL opponent plays for, for the chip next to his name
const teamOf = (userId) => {
  if (!userId) return null;
  const team = (seasonLadder.value?.teams ?? []).find(t => t.players.some(p => p.id === userId));
  return team?.name ?? null;
};

const matchDate = (iso) => DateTime.fromISO(iso, { zone: 'utc' }).toFormat('yyyy-LL-dd HH:mm');
const duration = (seconds) => {
  const total = seconds ?? 0;
  return `${String(Math.floor(total / 60)).padStart(2, '0')}:${String(total % 60).padStart(2, '0')}`;
};
// A placement match carries no MMR at either end, so it has no gain to show
const mmrDiff = (match) =>
  match.mmr_after != null && match.mmr_before != null ? match.mmr_after - match.mmr_before : null;

const loadPage = async ({ page, itemsPerPage: perPage }) => {
  if (!props.player?.id) return;
  itemsPerPage.value = perPage;
  isLoading.value = true;
  errorMessage.value = null;
  try {
    data.value = await ladderStore.userLadder(props.player.id, {
      seasonId: scoped.value ? scope.value : null,
      limit: perPage,
      offset: (page - 1) * perPage,
    });
    seasonLadder.value = scoped.value
      ? ladderStore.ladders[scope.value] ?? (await ladderStore.seasonLadder(scope.value))
      : null;
  } catch (error) {
    data.value = null;
    errorMessage.value = error.message;
  } finally {
    isLoading.value = false;
  }
};

const reload = () => {
  page.value = 1;
  return loadPage({ page: 1, itemsPerPage: itemsPerPage.value });
};

// A new player, or a new season, reopens the tab on its first page
watch(() => [props.player?.id, props.seasonId], () => {
  scope.value = props.seasonId ?? 'all';
  reload();
});
</script>

<style scoped>
.badge-row {
  padding: 4px 0;
  border-bottom: 1px solid rgba(var(--v-border-color), var(--v-border-opacity));
}
.locked-toggle {
  cursor: pointer;
  width: fit-content;
}
.race-grid {
  display: grid;
  grid-template-columns: repeat(5, minmax(0, 1fr));
  gap: 20px;
}
@media (max-width: 900px) {
  .race-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}
.opponent-link {
  cursor: pointer;
  text-decoration: underline;
  color: rgb(var(--v-theme-primary));
}
</style>
