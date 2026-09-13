<!-- Every opponent this player has met, in events of every kind, and every meeting behind the record -->
<template>
  <v-card elevation="2" class="mt-6">
    <v-card-title class="bg-primary d-flex flex-wrap ga-2 justify-space-between align-center">
      <div class="d-flex align-center">
        <v-icon class="mr-2">mdi-sword-cross</v-icon>
        <span>Head to head</span>
      </div>
      <v-chip v-if="opponents.length" color="on-primary" variant="outlined">
        {{ opponents.length }} player{{ opponents.length === 1 ? '' : 's' }} faced in
        {{ eventCount }} event{{ eventCount === 1 ? '' : 's' }}, lifetime
      </v-chip>
    </v-card-title>
    <v-progress-linear v-if="loading" indeterminate />
    <StatusAlert v-model="errorMessage" />
    <!-- no race beside the name: a player is not one race, the matchups column carries the races per meeting -->
    <GroupedTable v-if="!errorMessage && !loading" :columns="columns" :groups="groups" empty="No series played yet.">
      <template #group="{ group }">
        <td>
          <PlayerName :player="group.row.opponent" />
        </td>
        <td>
          <div class="d-flex align-center ga-2">
            <span class="record-bar d-none d-md-flex" aria-hidden="true">
              <span v-if="group.row.record.won" class="record-seg won" :style="{ flexGrow: group.row.record.won }" />
              <span v-if="group.row.record.lost" class="record-seg lost" :style="{ flexGrow: group.row.record.lost }" />
            </span>
            <span class="record-label" :title="`${group.row.record.won} won, ${group.row.record.lost} lost`">
              {{ group.row.record.won }}&ndash;{{ group.row.record.lost }}
            </span>
          </div>
        </td>
        <td class="text-caption text-medium-emphasis d-none d-md-table-cell">
          {{ group.row.games.mine }}&ndash;{{ group.row.games.theirs }}
        </td>
        <td>
          <div class="d-flex align-center flex-wrap ga-2">
            <span v-for="matchup in group.row.matchups" :key="`${matchup.mine}-${matchup.theirs}`" class="matchup">
              <RaceIcon :raceIdentifier="matchup.mine" size="1.1em" />
              <span class="text-caption text-medium-emphasis">v</span>
              <RaceIcon :raceIdentifier="matchup.theirs" size="1.1em" />
              <span v-if="matchup.count > 1" class="text-caption text-medium-emphasis">&times;{{ matchup.count }}</span>
            </span>
          </div>
        </td>
        <td class="d-none d-md-table-cell">
          <div class="d-flex flex-wrap ga-1">
            <v-chip
              v-for="event in group.row.events"
              :key="event.id"
              size="x-small"
              variant="outlined"
              :prepend-icon="KIND_ICON[event.kind]"
              :title="titleOf(EVENT_KINDS, event.kind)"
            >
              {{ event.name }}<template v-if="event.count > 1">&nbsp;&times;{{ event.count }}</template>
            </v-chip>
          </div>
        </td>
        <td class="text-caption text-medium-emphasis">{{ group.row.lastMet }}</td>
      </template>
      <template #rows="{ group }">
        <tr v-for="meeting in group.row.opponent.meetings" :key="meeting.series_id" class="detail-row">
          <td></td>
          <td class="text-caption">
            <v-icon v-if="KIND_ICON[meeting.kind]" size="x-small" class="mr-1"
              :title="titleOf(EVENT_KINDS, meeting.kind)">{{ KIND_ICON[meeting.kind] }}</v-icon>
            {{ eventLabel(meeting) }}<template v-if="meeting.playday">, round {{ meeting.playday }}</template>
          </td>
          <td>
            <template v-if="meeting.my_score != null && meeting.their_score != null">
              <v-chip :color="recordColor(meeting.my_score, meeting.their_score)" variant="tonal" size="x-small">
                {{ meeting.my_score }}&ndash;{{ meeting.their_score }}
              </v-chip>
              <span class="text-caption text-medium-emphasis ml-1">games</span>
            </template>
            <span v-else class="text-caption text-medium-emphasis">not played yet</span>
          </td>
          <td class="d-none d-md-table-cell"></td>
          <td>
            <span v-if="meeting.my_race && meeting.their_race" class="matchup">
              <RaceIcon :raceIdentifier="meeting.my_race" size="1.1em" />
              <span class="text-caption text-medium-emphasis">v</span>
              <RaceIcon :raceIdentifier="meeting.their_race" size="1.1em" />
            </span>
          </td>
          <td class="d-none d-md-table-cell"></td>
          <td class="text-caption text-medium-emphasis">
            <template v-if="meeting.maps?.length">{{ meeting.maps.join(', ') }} · </template>
            {{ meeting.date_time ? formatDateTime(meeting.date_time) : '' }}
          </td>
        </tr>
      </template>
    </GroupedTable>
  </v-card>
</template>

<script setup>
import { computed, ref, watch } from 'vue';
import { usePlayerStore } from '@/stores';
import { formatDateTime } from '@/helpers/datetime';
import { eventLabel, EVENT_KINDS, titleOf } from '@/helpers/event-labels.mjs';
import { opponentRows } from '@/helpers/head-to-head';
import GroupedTable from '@/components/GroupedTable.vue';
import PlayerName from '@/components/PlayerName.vue';
import RaceIcon from '@/components/RaceIcon.vue';
import StatusAlert from '@/components/StatusAlert.vue';

const props = defineProps({
  playerId: { type: Number, required: true },
});

// A GNL season needs no mark; every other kind of event wears its own
const KIND_ICON = { cup: 'mdi-tournament', koth: 'mdi-crown', signup: 'mdi-clipboard-text-outline' };

// games and events cost the most width, so a phone drops them first
const columns = [
  { key: 'opponent', title: 'Opponent' },
  { key: 'record', title: 'Series', width: '200px' },
  { key: 'games', title: 'Games', phone: false, width: '80px' },
  { key: 'matchups', title: 'Matchups' },
  { key: 'events', title: 'Events', phone: false },
  { key: 'when', title: 'Last met' },
];

const playerStore = usePlayerStore();
const opponents = ref([]);
const loading = ref(false);
const errorMessage = ref(null);

const groups = computed(() => opponentRows(opponents.value)
  .map((row) => ({ key: row.opponent.id, label: `Meetings with ${row.opponent.name}`, row })));

// Every event of every kind the player met anyone in
const eventCount = computed(() => new Set(
  opponents.value.flatMap((o) => (o.meetings ?? []).map((m) => m.season_id)),
).size);

// read once per player; a failed read says so rather than leaving an empty card
watch(() => props.playerId, async (id) => {
  opponents.value = [];
  errorMessage.value = null;
  if (!id) return;
  loading.value = true;
  try {
    opponents.value = (await playerStore.playerHistory(id))?.opponents ?? [];
  } catch {
    errorMessage.value = 'Could not load the head to head record.';
  } finally {
    loading.value = false;
  }
}, { immediate: true });

const recordColor = (won, lost) => (won > lost ? 'win' : won < lost ? 'loss' : undefined);
</script>

<style scoped>
/* one thin stacked bar per opponent: won, a surface gap, then lost */
.record-bar {
  gap: 2px;
  width: 120px;
  max-width: 120px;
  height: 8px;
  flex: none;
}
.record-seg {
  border-radius: 4px;
  min-width: 4px;
}
.record-seg.won {
  background: rgb(var(--v-theme-win));
}
.record-seg.lost {
  background: rgb(var(--v-theme-loss));
}
.record-label {
  font-variant-numeric: tabular-nums;
}
.matchup {
  display: inline-flex;
  align-items: center;
  gap: 3px;
}
</style>
