<!-- One player's ladder record in one season: the grind (points, record,
     versus race, achievements) and the W3C matches behind it, one page at a time -->
<template>
  <div>
    <StatusAlert v-model="errorMessage" />

    <section class="section">
      <h4 class="text-body-1 font-weight-medium">Ladder grind <span class="text-caption text-medium-emphasis">{{ data?.points ?? 0 }} points</span></h4>
      <div class="tiles">
        <div>
          <ColumnNote title="Ladder points" :note="SCORED_NOTE" class="text-caption text-medium-emphasis" />
          <div class="text-h6">{{ ladderPoints }}</div>
          <div class="text-caption text-medium-emphasis">3 per win, 1 per loss</div>
        </div>
        <div>
          <div class="text-caption text-medium-emphasis">Achievement points</div>
          <div class="text-h6">{{ achievedPoints }}</div>
          <div class="text-caption text-medium-emphasis">{{ earned.length }} earned, {{ locked.length }} locked</div>
        </div>
        <div>
          <div class="text-caption text-medium-emphasis">Record</div>
          <div class="text-h6">
            <span class="text-green">{{ data?.wins ?? 0 }}</span>
            <span class="text-medium-emphasis"> – </span>
            <span class="text-red">{{ data?.losses ?? 0 }}</span>
          </div>
          <div class="text-caption text-medium-emphasis">{{ winrate }} of {{ data?.games ?? 0 }} games</div>
        </div>
        <v-spacer />
        <a v-if="player?.battleTag" :href="w3cStatsUrl" target="_blank" class="text-caption d-inline-flex align-center align-self-start"><W3CIcon :size="14" class="mr-1" />W3Champions</a>
      </div>

      <div class="split">
        <div>
          <div class="text-caption text-medium-emphasis mb-1">Versus race</div>
          <v-table density="compact" class="versus">
            <tbody>
              <tr v-for="row in versusRaces" :key="row.code">
                <td><div class="d-flex align-center ga-2"><RaceIcon :raceIdentifier="row.code" />{{ row.name }}</div></td>
                <td class="text-right text-no-wrap"><span class="text-green">{{ row.w }}</span> – <span class="text-red">{{ row.l }}</span></td>
                <td class="bar"><div class="meter"><div class="fill" :style="{ width: `${row.rate}%` }" /></div></td>
                <td class="text-right text-medium-emphasis">{{ row.rate }}%</td>
              </tr>
            </tbody>
          </v-table>
        </div>
        <div>
          <div class="text-caption text-medium-emphasis mb-1">Achievements</div>
          <div v-for="badge in earned" :key="badge.id" class="d-flex align-center badge-row">
            <AchievementIcon :id="badge.id" class="mr-3 text-amber-darken-2" />
            <span class="text-body-2 font-weight-medium mr-3">{{ badge.name }}</span>
            <span v-if="mdAndUp" class="text-caption text-medium-emphasis">{{ badge.description }}</span>
            <v-spacer />
            <span class="text-caption text-medium-emphasis text-no-wrap ml-3">{{ badgeDate(badge.achieved_at) }}</span>
            <span class="text-body-2 text-amber-darken-2 ml-3">+{{ badge.points }}</span>
          </div>
          <div v-if="!earned.length" class="text-caption text-medium-emphasis">None earned yet.</div>
          <div
            class="text-caption text-medium-emphasis mt-2 mb-1 d-flex align-center locked-toggle"
            @click="showLocked = !showLocked"
          >
            <span>Locked &middot; {{ locked.length }}</span>
            <v-icon size="small" class="ml-1">{{ showLocked ? 'mdi-chevron-up' : 'mdi-chevron-down' }}</v-icon>
          </div>
          <template v-if="showLocked">
            <div v-for="badge in locked" :key="badge.id" class="d-flex align-center badge-row text-medium-emphasis">
              <AchievementIcon :id="badge.id" class="mr-3" />
              <span class="text-body-2 mr-3">{{ badge.name }}</span>
              <span v-if="mdAndUp" class="text-caption">{{ badge.description }}</span>
              <v-spacer />
              <span class="text-body-2 ml-3">+{{ badge.points }}</span>
            </div>
          </template>
        </div>
      </div>
    </section>

    <section class="section">
      <div class="d-flex align-center flex-wrap ga-2 mb-2">
        <h4 class="text-body-1 font-weight-medium">
          W3C ladder matches
          <span class="text-caption text-medium-emphasis">ranked 1v1, not GNL series · {{ matchCount }}</span>
        </h4>
        <v-chip v-if="!isScoredRace" size="x-small" color="warning" variant="tonal">not scored this season</v-chip>
        <v-spacer />
        <v-select
          v-if="raceOptions.length > 1"
          :model-value="shownRace"
          :items="raceOptions"
          density="compact"
          variant="outlined"
          hide-details
          label="Race"
          class="race-pick"
          @update:model-value="pickRace"
        />
      </div>
      <v-data-table-server
        :headers="matchHeaders"
        :items="data?.matches ?? []"
        :items-length="matchCount"
        :items-per-page="itemsPerPage"
        v-model:page="page"
        :loading="isLoading"
        density="compact"
        @update:options="loadPage"
      >
        <template v-slot:[`header.mmr_diff`]><W3CMmr suffix=" +/-" /></template>
        <template v-slot:[`item.start_time`]="{ item }"><span class="text-no-wrap">{{ matchDate(item.start_time) }}</span></template>
        <template v-slot:[`item.map_name`]="{ item }">{{ item.map_name || '—' }}</template>
        <template v-slot:[`item.opp_battletag`]="{ item }">
          <div class="d-flex align-center" style="gap: 6px">
            <RaceIcon v-if="item.opp_race" :raceIdentifier="item.opp_race" />
            <span
              v-if="item.opp_user_id"
              class="opponent-link"
              @click.stop="openPlayer({ id: item.opp_user_id, battleTag: item.opp_battletag })"
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
    </section>
  </div>
</template>

<script setup>
import { computed, ref, watch } from 'vue';
import { DateTime } from 'luxon';
import { useDisplay } from 'vuetify';
import { useLadderStore } from '@/stores';
import RaceIcon from '@/components/RaceIcon.vue';
import W3CIcon from '@/components/W3CIcon.vue';
import { achievementPoints, SCORED_NOTE } from '@/helpers/achievements';
import { openPlayer } from '@/helpers/players';
import { raceTotal } from '@/helpers/all-matches.mjs';
import { raceWrapper } from '@/helpers/races';
import { w3cPlayerUrl } from '@/helpers/w3c-stats';
import AchievementIcon from '@/components/AchievementIcon.vue';
import ColumnNote from '@/components/ColumnNote.vue';
import W3CMmr from '@/components/W3CMmr.vue';
import StatusAlert from '@/components/StatusAlert.vue';
import { useColumns } from '@/helpers/columns';

const props = defineProps({
  player: { type: Object, required: true },
  seasonId: { type: Number, required: true },
});

const { mdAndUp } = useDisplay();
const ladderStore = useLadderStore();

const data = ref(null);
const seasonLadder = ref(null);
const isLoading = ref(false);
const errorMessage = ref(null);
const itemsPerPage = ref(10);
const page = ref(1);
// null until the first answer names the race the season scores him on
const raceFilter = ref(null);
const showLocked = ref(false);

const allMatchHeaders = [
  { title: 'Date (UTC)', key: 'start_time', sortable: false },
  { mobile: false, title: 'Map', key: 'map_name', sortable: false },
  { title: 'Opponent', key: 'opp_battletag', sortable: false },
  { title: 'Result', key: 'won', sortable: false },
  { mobile: false, title: 'Duration', key: 'duration_s', sortable: false },
  { title: 'MMR +/-', key: 'mmr_diff', sortable: false },
];
const matchHeaders = useColumns(allMatchHeaders);

// The list opens on the race the season scores, and holds it until the player
// picks another race he laddered on
const shownRace = computed(() => raceFilter.value ?? data.value?.race ?? null);
const isScoredRace = computed(() => shownRace.value === (data.value?.race ?? null));
const matchCount = computed(() => raceTotal(data.value ?? {}, shownRace.value));

// Most games first. The scored race is always offered, at 0 when he never
// played it, so a player who laddered off it can still reach his games.
const raceOptions = computed(() => {
  const counts = { ...(data.value?.by_race ?? {}) };
  const signup = data.value?.race;
  if (signup && !(signup in counts)) counts[signup] = 0;
  return Object.entries(counts)
    .sort((a, b) => b[1] - a[1])
    .map(([code, games]) => {
      const name = raceWrapper.getRaceObject(code)?.name ?? code;
      const scored = code === signup ? ' · scored' : '';
      return { value: code, title: `${name} · ${games}${scored}` };
    });
});

const pickRace = (code) => {
  raceFilter.value = code;
  page.value = 1;
  loadPage({ page: 1, itemsPerPage: itemsPerPage.value });
};

const w3cStatsUrl = computed(() => `${w3cPlayerUrl(props.player?.battleTag ?? '')}/statistics`);

const winrate = computed(() => {
  const games = data.value?.games ?? 0;
  return games ? `${Math.round((data.value.wins / games) * 100)}%` : '0%';
});

// The earned rules come with the player, the whole catalogue with the season
const earned = computed(() => data.value?.achievements ?? []);
const achievedPoints = computed(() => achievementPoints(earned.value));
const ladderPoints = computed(() => (data.value?.wins ?? 0) * 3 + (data.value?.losses ?? 0));

const locked = computed(() => {
  const won = new Set(earned.value.map(badge => badge.id));
  return (seasonLadder.value?.achievement_rules ?? []).filter(rule => !won.has(rule.id));
});

// Most games first, so the races he meets most sit on top
const versusRaces = computed(() => {
  const vs = data.value?.vs_race ?? {};
  return ['HU', 'OC', 'NE', 'UD', 'RANDOM']
    .map(code => {
      const [w, l] = vs[code] ?? [0, 0];
      const total = w + l;
      return { code, name: raceWrapper.getRaceObject(code).name, w, l, total, rate: total ? Math.round((w / total) * 100) : 0 };
    })
    .sort((a, b) => b.total - a.total);
});

// The team of the season a GNL opponent plays for, for the chip next to his name
const teamOf = (userId) => {
  if (!userId) return null;
  const team = (seasonLadder.value?.teams ?? []).find(t => t.players.some(p => p.id === userId));
  return team?.name ?? null;
};

// A phone column has no room for the year
const matchDate = (iso) => DateTime.fromISO(iso, { zone: 'utc' }).toFormat(mdAndUp.value ? 'yyyy-LL-dd HH:mm' : 'LL-dd HH:mm');
// Stored in UTC, shown in the viewer's own time
const badgeDate = (iso) => DateTime.fromISO(iso, { zone: 'utc' }).toLocal().toFormat('LLL d');
const duration = (seconds) => {
  const total = seconds ?? 0;
  return `${String(Math.floor(total / 60)).padStart(2, '0')}:${String(total % 60).padStart(2, '0')}`;
};
// A placement match carries no MMR at either end, so it has no gain to show
const mmrDiff = (match) =>
  match.mmr_after != null && match.mmr_before != null ? match.mmr_after - match.mmr_before : null;

const loadPage = async ({ page, itemsPerPage: perPage }) => {
  itemsPerPage.value = perPage;
  isLoading.value = true;
  errorMessage.value = null;
  try {
    data.value = await ladderStore.userLadder(props.player.id, {
      seasonId: props.seasonId,
      race: raceFilter.value,
      limit: perPage,
      offset: (page - 1) * perPage,
    });
    // The first answer names the race the season scores; the select opens on it
    if (raceFilter.value === null) raceFilter.value = data.value?.race ?? null;
    seasonLadder.value =
      ladderStore.ladders[props.seasonId] ?? (await ladderStore.seasonLadder(props.seasonId));
  } catch (error) {
    data.value = null;
    errorMessage.value = error.message;
  } finally {
    isLoading.value = false;
  }
};

// A new player or season reopens the tab on its first page
watch(() => [props.player, props.seasonId], () => {
  page.value = 1;
  raceFilter.value = null;
  loadPage({ page: 1, itemsPerPage: itemsPerPage.value });
});
</script>

<style scoped>
.section { padding-bottom: 16px; }
.section h4 { margin-bottom: 8px; }
.race-pick { max-width: 200px; flex: 0 0 auto; }
.tiles { display: flex; flex-wrap: wrap; gap: 12px 40px; align-items: flex-start; margin-bottom: 12px; }
.split { display: grid; grid-template-columns: 1fr 1fr; gap: 24px; }
.versus .bar { width: 120px; }
.meter { height: 6px; border-radius: 3px; background: rgba(var(--v-theme-primary), 0.18); overflow: hidden; }
.fill { height: 100%; background: rgb(var(--v-theme-primary)); border-radius: 3px; }
.badge-row {
  padding: 4px 0;
  border-bottom: 1px solid rgba(var(--v-border-color), var(--v-border-opacity));
}
.locked-toggle {
  cursor: pointer;
  width: fit-content;
}
.opponent-link {
  cursor: pointer;
  text-decoration: underline;
  color: rgb(var(--v-theme-primary));
}
@media (max-width: 959px) {
  .split { grid-template-columns: 1fr; gap: 12px; }
  .versus .bar { width: 72px; }
  .tiles { gap: 12px 24px; }
}
</style>
