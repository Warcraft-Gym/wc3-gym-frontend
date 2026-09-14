<!-- Every KOTH night, newest first. A night is one event of the KOTH league, so this page
     only opens tonight's and hands the run over to the event run page. -->
<template>
  <v-container fluid class="pa-4">
    <div class="d-flex flex-wrap align-center ga-3">
      <h1 class="text-h5 text-md-h3 font-weight-bold">
        <v-icon class="mr-2" size="large">mdi-crown</v-icon>
        KOTH Nights
      </h1>
      <v-spacer />
      <v-btn variant="outlined" color="primary" prepend-icon="mdi-eye-outline" to="/koth/dashboard">Public page</v-btn>
      <v-btn color="primary" prepend-icon="mdi-plus" :disabled="loading" @click="openDialog">Open tonight</v-btn>
    </div>

    <StatusAlert v-model="error" class="mt-4" />

    <v-card elevation="2" class="mt-4">
      <v-progress-linear v-if="loading" indeterminate />
      <v-table density="comfortable" hover>
        <thead>
          <tr>
            <th>Night</th>
            <th class="d-none d-md-table-cell">Date</th>
            <th>State</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="night in nights" :key="night.id">
            <td class="py-3">
              <RouterLink :to="`/events/${night.id}/admin`"><strong>{{ night.name }}</strong></RouterLink>
              <!-- a phone drops the date column, so the date rides under the name -->
              <div class="d-md-none text-caption text-medium-emphasis">{{ dateRange(night) }}</div>
            </td>
            <td class="d-none d-md-table-cell text-no-wrap">{{ dateRange(night) || '—' }}</td>
            <td>
              <v-chip size="small" variant="tonal" :color="STATE_COLOR[stateOf(night)]">
                {{ STATE_LABEL[stateOf(night)] || '—' }}
              </v-chip>
            </td>
          </tr>
          <tr v-if="!nights.length && !loading">
            <td colspan="3" class="text-medium-emphasis py-6 text-center">No night has run yet.</td>
          </tr>
        </tbody>
      </v-table>
    </v-card>

    <!-- Tonight's night: when it starts, and where its three brackets cut -->
    <v-dialog v-model="dialogOpen" max-width="520">
      <v-card>
        <v-card-title class="bg-primary">Open tonight</v-card-title>
        <v-card-text class="pt-4">
          <StatusAlert v-model="dialogError" />
          <v-text-field v-model="form.starts_at" type="datetime-local" label="Starts at"
            variant="outlined" density="comfortable" class="mb-2" />
          <div class="text-subtitle-2 mb-2">The MMR each bracket opens at</div>
          <v-row dense>
            <v-col v-for="(bound, index) in form.lower_bounds" :key="index" cols="12" sm="4">
              <v-text-field :model-value="bound" type="number" :label="`Bracket ${index + 1}`"
                variant="outlined" density="comfortable" hide-details
                @update:model-value="form.lower_bounds[index] = Number($event)" />
            </v-col>
          </v-row>
        </v-card-text>
        <v-card-actions>
          <v-spacer />
          <v-btn variant="text" @click="dialogOpen = false">Cancel</v-btn>
          <v-btn color="primary" variant="elevated" :disabled="!form.starts_at || saving"
            :loading="saving" @click="openNight">Open tonight</v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>
  </v-container>
</template>

<script setup>
import { DateTime } from 'luxon';
import { onMounted, ref } from 'vue';
import { useRouter } from 'vue-router';

import StatusAlert from '@/components/StatusAlert.vue';
import { dateRange, STATE_COLOR, STATE_LABEL, stateOf } from '@/helpers/event-labels.mjs';
import { useEventStore } from '@/stores';

// The bracket cuts a first night takes, weakest first, the way the module names them
const DEFAULT_BOUNDS = [0, 1450, 1600];

const router = useRouter();
const store = useEventStore();

const nights = ref([]);
const loading = ref(true);
const saving = ref(false);
const error = ref(null);
const dialogError = ref(null);
const dialogOpen = ref(false);
const form = ref({ starts_at: '', lower_bounds: [...DEFAULT_BOUNDS] });

const load = async () => {
  loading.value = true;
  try {
    nights.value = await store.fetchEvents(null, 'koth');
  } catch (e) {
    error.value = `The nights did not load: ${e.message}`;
  } finally {
    loading.value = false;
  }
};

onMounted(load);

// Tonight at the hour the last night started, and its bracket cuts, weakest first.
// The list read carries no divisions, so the last night is read in full for them.
const openDialog = async () => {
  dialogError.value = null;
  const last = nights.value[0]
    ? await store.fetchEvent(nights.value[0].id).catch(() => null)
    : null;
  const started = last?.starts_at ? DateTime.fromISO(last.starts_at, { zone: 'utc' }).toLocal() : null;
  const start = DateTime.now().set({
    hour: started?.hour ?? 20, minute: started?.minute ?? 0, second: 0, millisecond: 0,
  });
  const bounds = [...(last?.divisions || [])]
    .sort((a, b) => b.position - a.position)
    .map((band) => band.lower_bound ?? 0);
  form.value = {
    starts_at: start.toFormat("yyyy-LL-dd'T'HH:mm"),
    lower_bounds: bounds.length === 3 ? bounds : [...DEFAULT_BOUNDS],
  };
  dialogOpen.value = true;
};

const openNight = async () => {
  saving.value = true;
  dialogError.value = null;
  try {
    const night = await store.openNight({
      starts_at: DateTime.fromISO(form.value.starts_at).toUTC().toISO(),
      lower_bounds: form.value.lower_bounds,
    });
    dialogOpen.value = false;
    router.push(`/events/${night.id}/admin`);
  } catch (e) {
    dialogError.value = e.message;
  } finally {
    saving.value = false;
  }
};
</script>
