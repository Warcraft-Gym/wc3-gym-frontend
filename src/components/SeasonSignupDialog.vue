<template>
  <v-dialog v-model="show" max-width="600">
    <v-card>
      <v-card-title class="bg-primary">
        <v-icon class="mr-2">mdi-account-check</v-icon>
        Add signup
      </v-card-title>

      <v-alert
        v-if="addError"
        type="error"
        variant="tonal"
        border="start"
        border-color="error"
        class="mx-4 my-2"
        closable
        @click:close="addError = null"
      >
        {{ addError }}
      </v-alert>

      <v-card-text class="pt-4">
        <v-select
          v-model="seasonId"
          :items="seasonStore.seasons"
          item-title="name"
          item-value="id"
          label="Season"
          variant="outlined"
          density="comfortable"
          :readonly="!!presetSeason"
        ></v-select>

        <v-autocomplete
          v-model="playerId"
          :items="playerStore.players"
          item-title="name"
          item-value="id"
          label="Player"
          variant="outlined"
          density="comfortable"
          :readonly="!!presetPlayer"
        >
          <template #selection="{ item }">
            <PlayerName :player="item.raw" @click.stop.prevent />
          </template>
          <template #item="{ props: itemProps, item }">
            <v-list-item v-bind="itemProps" :title="null">
              <PlayerName :player="item.raw" @click.prevent />
            </v-list-item>
          </template>
        </v-autocomplete>

        <RaceSelect v-model="race" variant="outlined" density="comfortable" />

        <div class="d-flex align-center ga-2">
          <W3CMmr />
          <span>{{ mmr ?? '—' }}</span>
        </div>
      </v-card-text>

      <v-card-actions>
        <v-spacer />
        <v-btn @click="close">Cancel</v-btn>
        <v-btn
          color="primary"
          variant="elevated"
          prepend-icon="mdi-plus"
          :loading="isAdding"
          :disabled="!seasonId || !playerId || !race"
          @click="addSignup"
        >
          Add signup
        </v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>

<script setup>
import { computed, ref, watch } from 'vue';
import { usePlayerStore, useSeasonStore } from '@/stores';
import W3CMmr from '@/components/W3CMmr.vue';
import { resolveCurrentSeasonId, resolveCurrentW3CSeason } from '@/helpers/current-season';
import { getW3CGames, getW3CMMR } from '@/helpers/w3c-stats';
import { defaultSignupRace } from '@/helpers/players.mjs';

const emit = defineEmits(['added']);

const playerStore = usePlayerStore();
const seasonStore = useSeasonStore();

const show = ref(false);
const isAdding = ref(false);
const addError = ref(null);
const seasonId = ref(null);
const playerId = ref(null);
const race = ref(null);
const presetSeason = ref(null);
const presetPlayer = ref(null);
const currentW3CSeason = ref(null);

const selectedPlayer = computed(() => (playerStore.players || []).find(p => p.id === playerId.value));
const mmr = computed(() =>
  selectedPlayer.value && race.value ? getW3CMMR(selectedPlayer.value, currentW3CSeason.value, race.value) : null
);

// The signup opens on the race the player last registered on, or the race he
// plays most on the ladder. Picking another player moves it.
watch([selectedPlayer, currentW3CSeason], ([player], [previousPlayer]) => {
  if (player !== previousPlayer || race.value === null) {
    race.value = defaultSignupRace(player, r => getW3CGames(player, currentW3CSeason.value, r));
  }
});

const open = async ({ season = null, player = null } = {}) => {
  presetSeason.value = season;
  presetPlayer.value = player;
  seasonId.value = season?.id ?? null;
  playerId.value = player?.id ?? null;
  race.value = null;
  addError.value = null;
  show.value = true;
  try {
    if (!seasonStore.seasons.length) await seasonStore.fetchSeasons();
    if (!playerStore.players.length) await playerStore.fetchPlayers();
    if (!seasonId.value) seasonId.value = await resolveCurrentSeasonId();
    currentW3CSeason.value = await resolveCurrentW3CSeason();
  } catch (err) {
    console.error('Failed to load the signup dialog lists:', err);
  }
};

const addSignup = async () => {
  addError.value = null;
  isAdding.value = true;
  try {
    await seasonStore.addUserSignup(seasonId.value, [playerId.value], race.value);
    emit('added');
    close();
  } catch (error) {
    console.error('Error adding signup:', error);
    addError.value = 'Error adding signup: ' + error.message;
  } finally {
    isAdding.value = false;
  }
};

const close = () => {
  show.value = false;
};

defineExpose({ open });
</script>
