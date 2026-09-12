<!-- Everything a player answers about time: the zone his hours are read in, and
     the hours he cannot play. -->
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

    <v-card elevation="2">
      <v-card-title class="bg-primary d-flex align-center">
        <v-icon class="mr-2">mdi-calendar-remove</v-icon>
        When you can't play
      </v-card-title>
      <v-card-text class="pt-4">
        <BlockedTimesEditor :zone="profileZone" @zone="onZone" />
      </v-card-text>
    </v-card>
  </v-container>
</template>

<script setup>
import { computed, ref } from 'vue';
import { backendUrl, fetchWrapper } from '@/helpers';
import { viewerZone } from '@/helpers/timezone.mjs';
import { useAuthStore } from '@/stores';
import BlockedTimesEditor from '@/components/BlockedTimesEditor.vue';
import StatusAlert from '@/components/StatusAlert.vue';

const authStore = useAuthStore();

const zoneError = ref(null);
const savingZone = ref(false);

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
</script>

<style scoped>
.page { max-width: 900px; }
.zone-field { max-width: 24rem; }
</style>
