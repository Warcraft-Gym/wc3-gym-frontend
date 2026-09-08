<!-- One player: identity, the seasons they signed up for with the signup race, and the ladder record -->
<template>
  <v-container fluid class="pa-4">
    <StatusAlert v-model="errorMessage" />

    <template v-if="player">
      <v-card elevation="2" class="mb-6">
        <v-card-title class="bg-primary d-flex align-center">
          <v-icon class="mr-2">mdi-account-circle</v-icon>
          Player Information
        </v-card-title>
        <v-card-text class="pt-4">
          <div class="d-flex flex-wrap align-center ga-3 text-h6 mb-3">
            <PlayerName :player="player" />
            <a :href="w3cPlayerUrl(player.battleTag)" target="_blank" rel="noopener noreferrer" class="text-body-1 text-decoration-none">
              {{ player.battleTag }} <W3CIcon :size="16" />
            </a>
          </div>
          <div class="d-flex flex-wrap align-center ga-2 mb-3">
            <v-chip color="secondary" prepend-icon="$discord">{{ player.discordTag }}</v-chip>
            <v-chip v-if="player.timezone" size="small" variant="tonal" prepend-icon="mdi-clock-outline">
              {{ player.timezone }}
            </v-chip>
          </div>
          <div class="d-flex flex-wrap align-center ga-2">
            <strong><W3CMmr /></strong>
            <RaceMmrChips :player="player" />
          </div>
        </v-card-text>
      </v-card>

      <v-card elevation="2">
        <v-card-title class="bg-primary d-flex align-center">
          <v-icon class="mr-2">mdi-calendar-account</v-icon>
          Seasons
        </v-card-title>
        <PlayerSeasons :player="player" />
      </v-card>
    </template>
  </v-container>
</template>

<script setup>
import { ref, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { usePlayerStore } from '@/stores';
import { playerPath } from '@/helpers/players';
import { w3cPlayerUrl } from '@/helpers/w3c-stats';
import PlayerSeasons from '@/components/PlayerSeasons.vue';
import RaceMmrChips from '@/components/RaceMmrChips.vue';
import StatusAlert from '@/components/StatusAlert.vue';
import W3CIcon from '@/components/W3CIcon.vue';
import W3CMmr from '@/components/W3CMmr.vue';

const route = useRoute();
const router = useRouter();
const playerStore = usePlayerStore();

const player = ref(null);
const errorMessage = ref(null);

// One read for the whole page; the ladder card reads its own record.
// A typed /player/thanks#11187 arrives as path + hash, so the key rejoins them.
watch(() => route.params.id + route.hash, async (key) => {
  // the rewrite below lands here again with the tag; the player is already loaded
  if (player.value && [String(player.value.id), player.value.battleTag].includes(key)) return;
  player.value = null;
  errorMessage.value = null;
  try {
    player.value = await playerStore.getPlayer(key);
    if (/^\d+$/.test(key)) router.replace(playerPath(player.value));  // the tag is the address
  } catch (error) {
    errorMessage.value = error.message;
  }
}, { immediate: true });
</script>
