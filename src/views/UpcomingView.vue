<!-- Every scheduled series of the current season in time order: what is on tonight,
     what a caster can still claim, and where last week's VODs go. -->
<template>
  <v-container>
    <v-card elevation="2">
      <v-card-title class="bg-primary d-flex align-center">
        <v-icon class="mr-2">mdi-calendar-clock</v-icon>
        Upcoming games
        <v-chip v-if="season?.name" class="ml-3" size="small" color="white" variant="outlined">{{ season.name }}</v-chip>
      </v-card-title>
      <v-card-text class="pa-0">
        <v-progress-linear v-if="loading" indeterminate />
        <StatusAlert v-model="error" />
        <GroupedTable v-if="!error && !smAndDown" :columns="columns" :groups="days" default-open empty="No series is scheduled yet">
          <template #group="{ group }">
            <td :colspan="columns.length">
              <strong>{{ group.title }}</strong>
              <span class="text-medium-emphasis ml-2">{{ group.rows.length }} series, {{ group.cast }} cast</span>
            </td>
          </template>
          <template #rows="{ group }">
            <tr v-for="row in group.rows" :key="row.id" class="detail-row">
              <td></td>
              <td class="text-no-wrap">{{ timeOf(row.date_time) }}</td>
              <td class="text-no-wrap">
                <RouterLink :to="`/match/${row.match_id}`">Wk {{ row.match?.playday ?? '?' }}</RouterLink>
                <div class="text-caption text-medium-emphasis">{{ row.match?.team1?.name }} vs {{ row.match?.team2?.name }}</div>
              </td>
              <td><PlayerName :player="row.player1" :race="row.player1_race" /></td>
              <td><PlayerName :player="row.player2" :race="row.player2_race" /></td>
              <td class="text-no-wrap">{{ scoreOf(row) }}</td>
              <td><CastChips :series="row" /></td>
            </tr>
          </template>
        </GroupedTable>
        <!-- A phone has no room for six columns, and the cast is the last of them -->
        <div v-else-if="!error">
          <template v-for="group in days" :key="group.key">
            <div class="px-3 py-2 day-row">
              <strong>{{ group.title }}</strong>
              <span class="text-medium-emphasis ml-2">{{ group.rows.length }} series, {{ group.cast }} cast</span>
            </div>
            <SeriesCard v-for="row in group.rows" :key="row.id" :series="row">
              <template #title>
                {{ timeOf(row.date_time) }} ·
                <RouterLink :to="`/match/${row.match_id}`">Wk {{ row.match?.playday ?? '?' }}</RouterLink>
              </template>
              <template #actions><CastChips :series="row" /></template>
              <template #side="{ n, won }">
                <v-chip v-if="!isUnscored(row)" size="small" :color="won ? 'success' : 'default'">
                  {{ n ? row.player2_score : row.player1_score }}
                </v-chip>
              </template>
            </SeriesCard>
          </template>
          <div v-if="!days.length" class="pa-4 text-grey">No series is scheduled yet</div>
        </div>
      </v-card-text>
    </v-card>
  </v-container>
</template>

<script setup>
import { computed, onMounted, ref } from 'vue';
import { DateTime } from 'luxon';
import { useDisplay } from 'vuetify';

import CastChips from '@/components/CastChips.vue';
import GroupedTable from '@/components/GroupedTable.vue';
import PlayerName from '@/components/PlayerName.vue';
import SeriesCard from '@/components/SeriesCard.vue';
import StatusAlert from '@/components/StatusAlert.vue';
import { resolveCurrentSeason } from '@/helpers/current-season';
import { isUnscored } from '@/helpers/season-phase.mjs';
import { useSeriesStore } from '@/stores';

// A played series stays on the page this long, because its caster still has a VOD to add
const KEEP_DAYS = 7;

const columns = [
  { key: 'time', title: 'Time' },
  { key: 'round', title: 'Round' },
  { key: 'player1', title: 'Player 1' },
  { key: 'player2', title: 'Player 2' },
  { key: 'score', title: 'Score' },
  { key: 'cast', title: 'Cast' },
];

const { smAndDown } = useDisplay();
const season = ref(null);
const series = ref([]);
const loading = ref(true);
const error = ref(null);

// A bare value is UTC; a zoned one carries its own offset, as formatDateTime reads it
const local = (value) => DateTime.fromISO(value, { zone: 'UTC' }).toLocal();
const timeOf = (value) => local(value).toFormat('HH:mm');
const scoreOf = (row) => (isUnscored(row) ? '—' : `${row.player1_score}-${row.player2_score}`);

// Scheduled series only, the played ones of the last week and everything ahead
const shown = computed(() => {
  const from = DateTime.utc().minus({ days: KEEP_DAYS });
  return series.value
    .filter((row) => row.date_time && local(row.date_time) >= from)
    .sort((a, b) => local(a.date_time) - local(b.date_time));
});

// One group per day in the reader's own zone: a caster plans an evening, not a round
const days = computed(() => {
  const groups = new Map();
  for (const row of shown.value) {
    const day = local(row.date_time);
    const key = day.toISODate();
    if (!groups.has(key)) groups.set(key, { key, title: day.toFormat('cccc, d LLLL'), rows: [], cast: 0 });
    const group = groups.get(key);
    group.rows.push(row);
    if (row.casts?.length) group.cast += 1;
  }
  return [...groups.values()];
});

onMounted(async () => {
  try {
    season.value = await resolveCurrentSeason();
    if (!season.value) throw new Error('No current season');
    series.value = (await useSeriesStore().searchSeriesBySeason(season.value.id, null)) || [];
  } catch (e) {
    error.value = 'Failed to load the schedule.';
    console.error('Failed to load the schedule:', e);
  } finally {
    loading.value = false;
  }
});
</script>

<style scoped>
.day-row {
  background: rgba(var(--v-theme-on-surface), 0.04);
}
</style>
