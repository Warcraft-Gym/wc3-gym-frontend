<template>
  <v-dialog v-model="show" max-width="800">
    <v-card v-if="selectedPlayer">
      <v-card-title class="bg-primary">
        <v-icon class="mr-2">mdi-pencil</v-icon>
        Edit Player: {{ selectedPlayer.name }}
      </v-card-title>

      <v-alert
        v-if="updateError"
        type="error"
        variant="tonal"
        border="start"
        border-color="red"
        class="mx-4 my-2"
        closable
        @click:close="updateError = null"
      >
        {{ updateError }}
      </v-alert>

      <v-card-text class="pt-4">
        <v-row>
          <v-col cols="12" md="6">
            <v-text-field
              v-model="selectedPlayer.name"
              label="Player Name"
              variant="outlined"
              prepend-inner-icon="mdi-account"
              density="comfortable"
            ></v-text-field>
          </v-col>
          <v-col cols="12" md="6">
            <v-text-field
              v-model="selectedPlayer.battleTag"
              label="BattleTag"
              variant="outlined"
              prepend-inner-icon="mdi-shield-account"
              density="comfortable"
            ></v-text-field>
          </v-col>
        </v-row>
        <v-row>
          <v-col cols="12" md="6">
            <CountrySelect v-model="selectedPlayer.country" />
          </v-col>
          <v-col cols="12" md="6">
            <v-text-field
              v-model="selectedPlayer.discordTag"
              label="Discord Tag"
              variant="outlined"
              prepend-inner-icon="mdi-discord"
              density="comfortable"
            ></v-text-field>
          </v-col>
        </v-row>
        <v-row>
          <v-col cols="12" md="6">
            <v-text-field
              v-model="selectedPlayer.discordId"
              label="Discord ID"
              hint="Numeric Discord user ID (required)"
              variant="outlined"
              prepend-inner-icon="mdi-identifier"
              density="comfortable"
            ></v-text-field>
          </v-col>
        </v-row>
        <v-row>
          <v-col cols="12" md="6">
            <RaceSelect v-model="selectedPlayer.race" />
          </v-col>
          <v-col cols="12" md="6">
            <v-text-field
              v-model="selectedPlayer.fantasy_tier"
              label="Fantasy Tier"
              variant="outlined"
              prepend-inner-icon="mdi-trophy"
              density="comfortable"
            ></v-text-field>
          </v-col>
        </v-row>
        <v-row>
          <v-col cols="12">
            <v-select
              v-model="selectedSignupSeasonIds"
              :items="seasons"
              item-title="name"
              item-value="id"
              multiple
              chips
              label="Signed-up Seasons"
              variant="outlined"
              prepend-inner-icon="mdi-calendar-check"
              density="comfortable"
            ></v-select>
          </v-col>
        </v-row>
      </v-card-text>

      <v-card-actions>
        <v-spacer />
        <v-btn @click="cancelEdit">Cancel</v-btn>
        <v-btn v-if="canSave" @click="updatePlayer" color="primary" variant="elevated" prepend-icon="mdi-content-save">
          Save Changes
        </v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>

<script setup>
import { ref } from 'vue';
import { usePlayerStore, useSeasonStore } from '@/stores';

const props = defineProps({
  // The season list of the "Signed-up Seasons" select
  seasons: { type: Array, default: () => [] },
  canSave: { type: Boolean, default: true },
  // Awaited after a successful save so the dialog closes once the caller's list is fresh
  refresh: { type: Function, default: null },
});

const playerStore = usePlayerStore();
const seasonStore = useSeasonStore();

const show = ref(false);
const selectedPlayer = ref(null);
const updateError = ref(null);
const selectedSignupSeasonIds = ref([]);
let originalSignupSeasonIds = [];

const open = async (player) => {
  try {
    if (seasonStore && seasonStore.fetchSeasons) await seasonStore.fetchSeasons();
  } catch (err) {
    console.error('Failed to fetch seasons before opening edit player dialog:', err);
  }
  selectedPlayer.value = { ...player };
  updateError.value = '';
  const signup = selectedPlayer.value.signup_seasons || [];
  originalSignupSeasonIds = signup.map(s => s.id);
  selectedSignupSeasonIds.value = [...originalSignupSeasonIds];
  show.value = true;
};

const updatePlayer = async () => {
  updateError.value = '';
  try {
    await playerStore.updatePlayer(selectedPlayer.value);
    const playerId = selectedPlayer.value.id;
    const newSignupIds = selectedSignupSeasonIds.value || [];
    const toAdd = newSignupIds.filter(id => !originalSignupSeasonIds.includes(id));
    const toRemove = originalSignupSeasonIds.filter(id => !newSignupIds.includes(id));

    try {
      await Promise.all(toAdd.map(sid => seasonStore.addUserSignup(sid, [playerId])));
      await Promise.all(toRemove.map(sid => seasonStore.removeUserSignup(sid, [playerId])));
    } catch (err) {
      console.error('Failed to sync signup seasons:', err);
    }

    if (props.refresh) await props.refresh();
    cancelEdit();
  } catch (error) {
    console.error('Error updating user:', error);
    updateError.value = 'Error updating user: ' + error.message;
  }
};

const cancelEdit = () => {
  show.value = false;
  selectedPlayer.value = null;
  updateError.value = null;
};

defineExpose({ open });
</script>
