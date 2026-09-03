<!-- One player, opened from his name anywhere in the app: who he is, the seasons
     he signed up for and the race he registered on, then his W3C ladder record. -->
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
            <v-chip color="secondary" prepend-icon="mdi-discord">{{ player.discordTag }}</v-chip>
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

      <v-card elevation="2" class="mb-6">
        <v-card-title class="bg-primary d-flex align-center">
          <v-icon class="mr-2">mdi-calendar-account</v-icon>
          Seasons
        </v-card-title>
        <v-table density="compact">
          <thead>
            <tr>
              <th class="text-left">Season</th>
              <th class="text-left">Race</th>
              <th class="text-right"><W3CMmr /></th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="season in signups" :key="season.id">
              <td>{{ season.name }}</td>
              <td><RaceIcon v-if="season.signup_race" :raceIdentifier="season.signup_race" /><span v-else>—</span></td>
              <td class="text-right">
                {{ raceMmr(season.signup_race) ?? '—' }}
                <span v-if="raceMmrSeason(season.signup_race)" class="text-caption text-medium-emphasis ml-1">
                  S{{ raceMmrSeason(season.signup_race) }}
                </span>
              </td>
            </tr>
            <tr v-if="!signups.length">
              <td colspan="3" class="text-medium-emphasis">Not signed up for a season.</td>
            </tr>
          </tbody>
        </v-table>
      </v-card>

      <v-card elevation="2">
        <v-card-title class="bg-primary d-flex align-center">
          <v-icon class="mr-2">mdi-chart-line</v-icon>
          Ladder
        </v-card-title>
        <v-card-text class="pt-4">
          <PlayerLadderTab :player="player" @open-player="openPlayer" />
        </v-card-text>
      </v-card>
    </template>
  </v-container>
</template>

<script setup>
import { computed, ref, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { usePlayerStore } from '@/stores';
import { getW3CMMR, getW3CMMRSeason, w3cPlayerUrl } from '@/helpers/w3c-stats';
import PlayerLadderTab from '@/components/PlayerLadderTab.vue';
import RaceIcon from '@/components/RaceIcon.vue';
import RaceMmrChips from '@/components/RaceMmrChips.vue';
import StatusAlert from '@/components/StatusAlert.vue';
import W3CIcon from '@/components/W3CIcon.vue';
import W3CMmr from '@/components/W3CMmr.vue';

const route = useRoute();
const router = useRouter();
const playerStore = usePlayerStore();

const player = ref(null);
const errorMessage = ref(null);

// Newest season first; the signup carries the race, the MMR comes off the w3c stats
const signups = computed(() =>
  (player.value?.signup_seasons ?? []).slice().sort((a, b) => b.id - a.id)
);
const raceMmr = (race) => (race ? getW3CMMR(player.value, null, race) : null);
const raceMmrSeason = (race) => (race ? getW3CMMRSeason(player.value, null, race) : null);

const openPlayer = (userId) => router.push(`/player/${userId}`);

// One read for the whole page; the ladder card reads its own record
watch(() => route.params.id, async (id) => {
  player.value = null;
  errorMessage.value = null;
  try {
    player.value = await playerStore.getPlayer(id);
  } catch (error) {
    errorMessage.value = error.message;
  }
}, { immediate: true });
</script>
