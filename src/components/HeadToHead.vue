<!-- Every opponent this player has met in the GNL, and every meeting behind the record -->
<template>
  <v-card elevation="2" class="mt-6">
    <v-card-title class="bg-primary d-flex flex-wrap ga-2 justify-space-between align-center">
      <div class="d-flex align-center">
        <v-icon class="mr-2">mdi-sword-cross</v-icon>
        <span>Head to head</span>
      </div>
      <v-chip v-if="opponents.length" color="on-primary" variant="outlined">
        {{ opponents.length }} players faced, lifetime
      </v-chip>
    </v-card-title>
    <v-progress-linear v-if="loading" indeterminate />
    <StatusAlert v-model="errorMessage" />
    <!-- no race on the summary row: it spans every season, and a player is not one race -->
    <GroupedTable v-if="!errorMessage && !loading" :columns="columns" :groups="groups" empty="No series played yet.">
      <template #group="{ group }">
        <td>
          <PlayerName :player="group.opponent" />
        </td>
        <td>
          <v-chip :color="recordColor(group.opponent.won, group.opponent.lost)" variant="tonal" size="small">
            {{ group.opponent.won }} to {{ group.opponent.lost }}
          </v-chip>
        </td>
        <td class="text-caption text-medium-emphasis">last met {{ lastMet(group.opponent) }}</td>
      </template>
      <template #rows="{ group }">
        <tr v-for="meeting in group.opponent.meetings" :key="meeting.series_id" class="detail-row">
          <td></td>
          <td class="text-caption">
            {{ meeting.season_name }}<template v-if="meeting.playday">, round {{ meeting.playday }}</template>
          </td>
          <td>
            <v-chip :color="recordColor(meeting.my_score, meeting.their_score)" variant="tonal" size="x-small">
              {{ meeting.my_score }} to {{ meeting.their_score }}
            </v-chip>
            <span class="text-caption text-medium-emphasis ml-1">games</span>
          </td>
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
import GroupedTable from '@/components/GroupedTable.vue';
import PlayerName from '@/components/PlayerName.vue';
import StatusAlert from '@/components/StatusAlert.vue';

const props = defineProps({
  playerId: { type: Number, required: true },
});

const columns = [
  { key: 'opponent', title: 'Opponent' },
  { key: 'record', title: 'Series record' },
  { key: 'when', title: 'When' },
];

const playerStore = usePlayerStore();
const opponents = ref([]);
const loading = ref(false);
const errorMessage = ref(null);

const groups = computed(() => opponents.value.map((opponent) => ({ key: opponent.id, title: opponent.name, opponent })));

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

const lastMet = (opp) => [opp.last_season_name, opp.last_playday ? `round ${opp.last_playday}` : null].filter(Boolean).join(', ');
</script>
