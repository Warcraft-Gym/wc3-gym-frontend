<template>
  <v-dialog v-model="show" max-width="800">
    <v-card v-if="selectedPlayer">
      <v-card-title class="bg-primary">
        <v-icon class="mr-2">mdi-pencil</v-icon>
        {{ self ? 'Edit Profile' : `Edit Player: ${selectedPlayer.name}` }}
      </v-card-title>

      <v-alert
        v-if="updateError"
        type="error"
        variant="tonal"
        border="start"
        border-color="error"
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
          <v-col v-if="self" cols="12" md="6">
            <v-autocomplete v-model="selectedPlayer.timezone" :items="timezones" label="Timezone" variant="outlined" prepend-inner-icon="mdi-clock-outline" density="comfortable" />
          </v-col>
          <v-col v-if="!self" cols="12" md="6">
            <v-text-field
              v-model="selectedPlayer.discordTag"
              label="Discord Tag"
              variant="outlined"
              prepend-inner-icon="$discord"
              density="comfortable"
            ></v-text-field>
          </v-col>
        </v-row>
        <v-row v-if="!self">
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
        </v-row>
        <v-row>
          <v-col cols="12" md="6">
            <v-text-field
              v-model="selectedPlayer.twitch_url"
              label="Twitch channel"
              hint="twitch.tv/you"
              persistent-hint
              variant="outlined"
              prepend-inner-icon="mdi-twitch"
              :error-messages="twitchChannel.error"
              density="comfortable"
            ></v-text-field>
          </v-col>
          <v-col cols="12" md="6">
            <v-text-field
              v-model="selectedPlayer.youtube_url"
              label="YouTube channel"
              hint="youtube.com/@you"
              persistent-hint
              variant="outlined"
              prepend-inner-icon="mdi-youtube"
              :error-messages="youtubeChannel.error"
              density="comfortable"
            ></v-text-field>
          </v-col>
        </v-row>
        <v-row>
          <v-col cols="12">
            <div class="text-subtitle-2 mb-1">Seasons</div>
            <div v-if="signupSeasons.length" class="d-flex flex-wrap ga-1">
              <v-chip v-for="s in signupSeasons" :key="s.id" size="small">
                <RaceIcon v-if="s.signup_race" :raceIdentifier="s.signup_race" class="mr-1" />
                {{ s.name }}
              </v-chip>
            </div>
            <div v-else class="text-medium-emphasis">Not signed up for a season.</div>
          </v-col>
        </v-row>
      </v-card-text>

      <v-card-actions>
        <v-spacer />
        <v-btn @click="cancelEdit">Cancel</v-btn>
        <v-btn v-if="canSave" @click="updatePlayer" color="primary" variant="elevated" prepend-icon="mdi-content-save" :disabled="!!(twitchChannel.error || youtubeChannel.error)">
          Save Changes
        </v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>

<script setup>
import { computed, ref } from 'vue';
import { backendUrl, fetchWrapper } from '@/helpers';
import { useAuthStore, usePlayerStore } from '@/stores';
import { channelInput } from '@/helpers/casts.mjs';
import RaceIcon from '@/components/RaceIcon.vue';

const props = defineProps({
  // the player editing his own row: fewer fields, and his own route
  self: Boolean,
  canSave: { type: Boolean, default: true },
  // Awaited after a successful save so the dialog closes once the caller's list is fresh
  refresh: { type: Function, default: null },
});

const auth = useAuthStore();
const playerStore = usePlayerStore();
const timezones = Intl.supportedValuesOf('timeZone');

const show = ref(false);
const selectedPlayer = ref(null);
const updateError = ref(null);

// Newest season first; signups are managed on the draft page
const signupSeasons = computed(() =>
  (selectedPlayer.value?.signup_seasons ?? []).slice().sort((a, b) => b.id - a.id)
);

// The stored channel is the URL the field normalised, so the admin saves what the profile shows
const twitchChannel = computed(() => channelInput('twitch', selectedPlayer.value?.twitch_url));
const youtubeChannel = computed(() => channelInput('youtube', selectedPlayer.value?.youtube_url));

const open = (player) => {
  selectedPlayer.value = { ...player };
  updateError.value = '';
  show.value = true;
};

const updatePlayer = async () => {
  updateError.value = '';
  const edited = {
    ...selectedPlayer.value,
    twitch_url: twitchChannel.value.url,
    youtube_url: youtubeChannel.value.url,
  };
  try {
    if (props.self) {
      const { name, battleTag, race, country, timezone, twitch_url, youtube_url } = edited;
      const { user } = await fetchWrapper.put(`${backendUrl}/user-info`, { name, battleTag, race, country, timezone, twitch_url, youtube_url });
      // the cast dialog reads the channels off the session payload, which loads once per visit
      if (auth.me?.user) auth.me.user = { ...auth.me.user, ...user };
    } else {
      await playerStore.updatePlayer(edited);
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
