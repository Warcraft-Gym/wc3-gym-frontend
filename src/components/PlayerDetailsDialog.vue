<template>
  <v-dialog v-model="internalShow" max-width="65vw">
    <v-card>
      <v-card-title>Player Details</v-card-title>
      <v-tabs v-model="tab" bg-color="surface" class="flex-0-0">
        <v-tab value="details">Details</v-tab>
        <v-tab value="ladder">Ladder</v-tab>
      </v-tabs>
      <v-card-text>
        <v-tabs-window v-model="tab">
        <v-tabs-window-item value="details">
        <v-table border density="compact" class="pb-2">
          <tbody>
            <tr>
              <th class="text-left"></th>
              <th class="text-right"><W3CMmr /></th>
              <th class="text-right">Wins</th>
              <th class="text-right">Losses</th>
              <th class="text-right">Total</th>
              <th class="text-right">Winrate</th>
            </tr>
          </tbody>
          <tbody>
            <tr>
              <td class="text-left text-overline">{{ seasonName || 'N/A' }} <RaceIcon v-if="fullPlayer" :raceIdentifier="fullPlayer.race" /></td>
              <td class="text-left text-overline">
                {{ playerW3CMMR }}
                <span v-if="mmrSeasonLabel(fullPlayer, w3cSeason)" class="text-caption ml-1">{{ mmrSeasonLabel(fullPlayer, w3cSeason) }}</span>
              </td>
              <td class="text-right text-green">{{ selectedGnl?.wins || 0 }}</td>
              <td class="text-right text-red">{{ selectedGnl?.losses || 0 }}</td>
              <td class="text-right">{{ selectedGnl?.games || 0 }}</td>
              <td class="text-right">{{ selectedGnl && selectedGnl.games ? (Math.round( selectedGnl.wins / selectedGnl.games * 100 ) + '%') : '0%' }}</td>
            </tr>
            <tr>
              <td>W3Champion Stats: 
                <a v-if="fullPlayer" :href="`https://w3champions.com/player/${encodeURIComponent(fullPlayer.battleTag)}`" target="_blank">
                  <img src="https://w3champions.com/assets/logos/small-logo-full-black.png" alt="W3Champions" width="100" style="margin-left: 10px;">
                </a>
              </td>
            </tr>
            <tr v-for="stat in w3cStatsToDisplay" :key="`${stat.race}-${stat.wc3_season}`">
              <td class="text-left text-overline">
                <RaceIcon :raceIdentifier="stat.race" />
                <span v-if="stat.wc3_season" class="text-caption ml-2">(Season {{ stat.wc3_season }})</span>
              </td>
              <td class="text-left text-overline">{{ stat.mmr }}</td>
              <td class="text-right text-green">{{ stat.wins }}</td>
              <td class="text-right text-red">{{ stat.losses }}</td>
              <td class="text-right">{{ stat.games }}</td>
              <td class="text-right">{{ stat.winrate!=null ? Math.round( stat.winrate * 100 ): 0   + '%' }}</td>
            </tr>
          </tbody>
        </v-table>
        </v-tabs-window-item>
        <v-tabs-window-item value="ladder">
          <PlayerLadderTab
            v-if="tab === 'ladder' && fullPlayer"
            :player="fullPlayer"
            :seasonId="seasonId"
            @open-player="openPlayer"
          />
        </v-tabs-window-item>
        </v-tabs-window>
      </v-card-text>
    </v-card>
  </v-dialog>
</template>

<script setup>
import { computed, ref, watch } from 'vue';
import RaceIcon from '@/components/RaceIcon.vue';
import PlayerLadderTab from '@/components/PlayerLadderTab.vue';
import W3CMmr from '@/components/W3CMmr.vue';
import { usePlayerStore } from '@/stores';
import { getAllRaceStats, getW3CMMR, mmrSeasonLabel } from '@/helpers/w3c-stats';

const props = defineProps({
  modelValue: {
    type: Boolean,
    required: true
  },
  player: {
    type: Object,
    default: null
  },
  seasonId: {
    type: Number,
    default: null
  },
  seasonName: {
    type: String,
    default: ''
  },
  w3cSeason: {
    type: Number,
    default: null
  },
  openTab: {
    type: String,
    default: 'details'
  }
});

const emit = defineEmits(['update:modelValue']);

const playerStore = usePlayerStore();

const tab = ref(props.openTab);

// The player list has no gnl_stats, so the open dialog reads the full player
const loadedPlayer = ref(null);
const fullPlayer = computed(() => loadedPlayer.value || props.player);

// A GNL opponent of the Ladder tab replaces the player the dialog shows
const openPlayer = async (userId) => {
  try {
    loadedPlayer.value = await playerStore.getPlayer(userId);
  } catch (error) {
    console.error('Failed to load the opponent:', error);
  }
};

watch(() => [props.modelValue, props.player?.id], async ([open, playerId]) => {
  loadedPlayer.value = null;
  if (open) tab.value = props.openTab;
  if (!open || !playerId || props.player?.gnl_stats) return;
  try {
    loadedPlayer.value = await playerStore.getPlayer(playerId);
  } catch (error) {
    console.error('Failed to load the player details:', error);
  }
}, { immediate: true });

const internalShow = computed({
  get: () => props.modelValue,
  set: (value) => emit('update:modelValue', value)
});

const selectedGnl = computed(() => {
  const stats = fullPlayer.value?.gnl_stats;
  if (!stats || !props.seasonId) {
    return null;
  }
  return stats.find(stat => stat.season_id === props.seasonId);
});

// Get W3C stats - shows stats for current W3C season if provided
const w3cStatsToDisplay = computed(() => {
  if (!fullPlayer.value) return [];

  // Pass w3cSeason to filter stats to current season
  return getAllRaceStats(fullPlayer.value, props.w3cSeason);
});

// Get W3C MMR with fallback for display
const playerW3CMMR = computed(() => {
  if (!fullPlayer.value) return 0;
  return getW3CMMR(fullPlayer.value, props.w3cSeason);
});
</script>
