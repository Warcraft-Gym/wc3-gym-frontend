<!-- Every opponent this player has met in the GNL, and every meeting behind the record -->
<template>
  <v-card v-if="opponents.length" elevation="2" class="mt-6">
    <v-card-title class="bg-primary d-flex justify-space-between align-center">
      <div class="d-flex align-center">
        <v-icon class="mr-2">mdi-sword-cross</v-icon>
        <span>Head to Head, Lifetime</span>
      </div>
      <v-chip color="white" variant="outlined">
        {{ opponents.length }} players faced
      </v-chip>
    </v-card-title>
    <v-table density="comfortable">
      <thead>
        <tr>
          <th>Opponent</th>
          <th>Series record</th>
          <th></th>
        </tr>
      </thead>
      <tbody>
        <template v-for="opp in opponents" :key="opp.id">
          <tr class="opponent-row" @click="openOpponent = openOpponent === opp.id ? null : opp.id">
            <!-- no race here: the row spans every season, and a player is not one race -->
            <td>
              <PlayerName :player="opp" />
              <div class="text-caption text-medium-emphasis">last met {{ lastMet(opp) }}</div>
            </td>
            <td>
              <v-chip :color="recordColor(opp.won, opp.lost)" variant="tonal" size="small">
                {{ opp.won }} to {{ opp.lost }}
              </v-chip>
            </td>
            <td class="text-right">
              <v-icon size="small">{{ openOpponent === opp.id ? 'mdi-chevron-up' : 'mdi-chevron-down' }}</v-icon>
            </td>
          </tr>
          <tr
            v-for="meeting in (openOpponent === opp.id ? opp.meetings : [])"
            :key="meeting.series_id"
            class="meeting-row"
          >
            <td class="text-caption">
              {{ meeting.season_name }}<template v-if="meeting.playday">, week {{ meeting.playday }}</template>
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
      </tbody>
    </v-table>
  </v-card>
</template>

<script setup>
import { ref, watch } from 'vue';
import { usePlayerStore } from '@/stores';
import { formatDateTime } from '@/helpers/datetime';
import PlayerName from '@/components/PlayerName.vue';

const props = defineProps({
  playerId: { type: Number, required: true },
});

const playerStore = usePlayerStore();
const opponents = ref([]);
const openOpponent = ref(null);

// read once per player; the page stands without it
watch(() => props.playerId, async (id) => {
  openOpponent.value = null;
  opponents.value = id ? (await playerStore.playerHistory(id).catch(() => null))?.opponents ?? [] : [];
}, { immediate: true });

const recordColor = (won, lost) => (won > lost ? 'success' : won < lost ? 'error' : undefined);

const lastMet = (opp) => [opp.last_season_name, opp.last_playday ? `week ${opp.last_playday}` : null].filter(Boolean).join(', ');
</script>

<style scoped>
.opponent-row { cursor: pointer; }
.meeting-row { background: rgba(var(--v-theme-on-surface), 0.04); }
</style>
