<!-- Everything a player answers about time: the zone his hours are read in, the
     hours he cannot play, and the Can play question of every round he is in. -->
<template>
  <v-container fluid class="pa-4 page">
    <h1>Availability</h1>
    <p class="text-body-2 text-medium-emphasis mt-1 mb-3">
      Open hours are a starting point, not a promise. Agree the time with your opponent.
    </p>

    <StatusAlert v-model="zoneError" />
    <v-autocomplete
      v-model="zone"
      label="Times are in"
      prepend-inner-icon="mdi-clock-outline"
      density="compact"
      variant="outlined"
      hide-details
      class="zone-field mb-6"
      :items="zones"
      :menu-props="{ scrollStrategy: 'close' }"
      :loading="savingZone"
      @update:modelValue="saveZone"
    />

    <v-card elevation="2" class="mb-6">
      <v-card-title class="bg-primary d-flex align-center">
        <v-icon class="mr-2">mdi-calendar-remove</v-icon>
        When you can't play
      </v-card-title>
      <v-card-text class="pt-4">
        <BlockedTimesEditor :zone="profileZone" @zone="onZone" />
      </v-card-text>
    </v-card>

    <v-card elevation="2">
      <v-card-title class="bg-primary d-flex align-center">
        <v-icon class="mr-2">mdi-calendar-account</v-icon>
        Rounds
      </v-card-title>
      <v-card-text class="pt-4">
        <StatusAlert v-model="errorMessage" />
        <p v-if="!seasons.length" class="text-body-2 text-medium-emphasis">No rounds to answer yet.</p>
        <section v-for="season in seasons" :key="season.id" class="mb-6">
          <h2 class="text-subtitle-1 font-weight-medium mb-2">{{ season.name }}</h2>
          <p v-if="rounds[season.id] && !cards(season.id).length && !errorMessage" class="text-body-2 text-medium-emphasis">No rounds to answer yet.</p>
          <div v-for="card in cards(season.id)" :key="card.playday" class="round">
            <span class="text-medium-emphasis">Round {{ card.playday }}</span>
            <span class="text-medium-emphasis">{{ card.label }}</span>
            <span v-if="line(season.id, card)">{{ line(season.id, card) }}</span>
            <span v-else class="answer">
              <span class="d-flex flex-wrap ga-2">
                <v-btn
                  color="success"
                  size="small"
                  :variant="card.answer === true ? 'flat' : 'outlined'"
                  :loading="saving === `${season.id}-${card.playday}`"
                  :disabled="saving !== null && saving !== `${season.id}-${card.playday}`"
                  @click="setWeek(season.id, card.playday, true)"
                >
                  Can play
                </v-btn>
                <v-btn
                  color="error"
                  size="small"
                  :variant="card.answer === false ? 'flat' : 'outlined'"
                  :loading="saving === `${season.id}-${card.playday}`"
                  :disabled="saving !== null && saving !== `${season.id}-${card.playday}`"
                  @click="setWeek(season.id, card.playday, false)"
                >
                  Can't play
                </v-btn>
              </span>
              <span class="text-caption text-medium-emphasis">{{ setByLine(season.id, card.playday) }}</span>
            </span>
          </div>
        </section>
      </v-card-text>
    </v-card>
  </v-container>
</template>

<script setup>
import { computed, ref, watch } from 'vue';
import { PAGE_LIMIT, backendUrl, fetchWrapper, pageQuery } from '@/helpers';
import { formatDateTime } from '@/helpers/datetime';
import { roundCards, roundLine } from '@/helpers/rounds.mjs';
import { viewerZone } from '@/helpers/timezone.mjs';
import { useAuthStore, useAvailabilityStore } from '@/stores';
import BlockedTimesEditor from '@/components/BlockedTimesEditor.vue';
import StatusAlert from '@/components/StatusAlert.vue';

const authStore = useAuthStore();
const availabilityStore = useAvailabilityStore();

const errorMessage = ref(null);
const zoneError = ref(null);
const savingZone = ref(false);
const saving = ref(null);  // the "<season>-<round>" answer a write is out for

// The backend reads the blocks against the profile zone; the editor writes it when the profile carries none
const profileZone = computed(() => authStore.me?.user?.timezone ?? null);
const zone = ref(profileZone.value || viewerZone());
const zones = computed(() => [...new Set([...Intl.supportedValuesOf('timeZone'), zone.value])]);

// The editor wrote the browser zone, so the field and the profile follow it
const onZone = (timezone) => {
  zone.value = timezone;
  if (authStore.me?.user) authStore.me.user = { ...authStore.me.user, timezone };
};

const saveZone = async (timezone) => {
  savingZone.value = true;
  zoneError.value = null;
  try {
    const { user } = await fetchWrapper.put(`${backendUrl}/user-info`, { timezone });
    if (authStore.me?.user) authStore.me.user = { ...authStore.me.user, ...user };
  } catch (error) {
    zoneError.value = error.message || 'Could not save your timezone.';
  } finally {
    savingZone.value = false;
  }
};

// Only a season the player is in, and that runs the scheduling tools, asks him anything
const seasons = computed(() => (authStore.me?.seasons ?? []).filter(s => s.signed_up && s.scheduling_enabled));

const rounds = ref({});  // season id -> the /player-series payload

const load = async (seasonId) => {
  rounds.value = { ...rounds.value, [seasonId]: null };  // claims the season, so a second /me does not read it again
  const url = `${backendUrl}/player-series?${pageQuery({ limit: PAGE_LIMIT, offset: 0 })}&season_id=${seasonId}`;
  const { items } = await fetchWrapper.getPage(url).catch(() => {
    errorMessage.value = 'Could not load your rounds.';
    return { items: null };
  });
  rounds.value = { ...rounds.value, [seasonId]: items ?? {} };
};

// A fresh /me can land after the view mounts, so every new season reads its rounds then
watch(seasons, list => list.forEach(s => { if (!(s.id in rounds.value)) load(s.id); }), { immediate: true });

const cards = (seasonId) => {
  const data = rounds.value[seasonId];
  if (!data?.rounds?.length) return [];
  return roundCards({ rounds: data.rounds, series: data.series ?? [], answers: data.availability ?? [] });
};

const line = (seasonId, card) => roundLine(card, rounds.value[seasonId]?.player?.id, card.series?.date_time ? formatDateTime(card.series.date_time) : '');

const rowOf = (seasonId, playday) => rounds.value[seasonId]?.availability?.find(row => row.playday === playday);

const setByLine = (seasonId, playday) => {
  const row = rowOf(seasonId, playday);
  if (!row || row.available == null) return 'No answer';
  return `Set by ${row.set_by_user_id === rounds.value[seasonId]?.player?.id ? 'You' : row.set_by_name} · tap again to clear`;
};

// A second click on the state already set clears the round back to no answer
const setWeek = async (seasonId, playday, want) => {
  saving.value = `${seasonId}-${playday}`;
  errorMessage.value = null;
  try {
    const available = rowOf(seasonId, playday)?.available === want ? null : want;
    const availability = await availabilityStore.setPlayerAvailability({ season_id: seasonId, playday, available });
    rounds.value = { ...rounds.value, [seasonId]: { ...rounds.value[seasonId], availability } };
  } catch (error) {
    errorMessage.value = error.message || 'Error saving availability.';
  } finally {
    saving.value = null;
  }
};
</script>

<style scoped>
.page { max-width: 900px; }
.zone-field { max-width: 24rem; }

.round {
  display: grid;
  grid-template-columns: 6rem 10rem 1fr;
  gap: 0.75rem;
  align-items: center;
  padding: 6px 0;
  border-bottom: 1px solid rgba(var(--v-border-color), var(--v-border-opacity));
}

.answer {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 0.25rem 0.75rem;
}

/* Phone: the round and its window share a line, the answer takes the next */
@media (max-width: 600px) {
  .round { grid-template-columns: 6rem 1fr; }
  .round > span:nth-child(3) { grid-column: 1 / -1; }
}
</style>
