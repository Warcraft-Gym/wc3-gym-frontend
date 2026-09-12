<!-- The player sets the time of one of his series, in his own clock. The hours both
     sides are open are a hint under the pickers, never a reason to refuse a save. -->
<template>
  <v-dialog v-model="show" max-width="500px">
    <v-card>
      <v-card-title class="bg-primary">
        <v-icon class="mr-2">mdi-calendar-edit</v-icon>
        Edit Schedule
      </v-card-title>
      <v-card-text class="pt-4">
        <StatusAlert v-model="errorMessage" />
        <v-alert type="info" variant="tonal" density="compact" class="mb-4">
          Enter time in your local timezone ({{ zoneLabel(userTimezone, userTimezone, chosen) }}).
        </v-alert>
        <v-form>
          <v-container>
            <v-row>
              <v-col cols="12" md="6">
                <SimpleDatePicker v-model="series.date" label="Date" />
              </v-col>
              <v-col cols="12" md="6">
                <SimpleTimePicker v-model="series.time" :label="`Time (${userTimezone})`" />
              </v-col>
            </v-row>
            <v-row v-if="opponentZone">
              <v-col cols="12" class="pt-0">
                <div class="d-flex flex-wrap align-center ga-2">
                  <PlayerName :player="series.opponent" plain />
                  <strong v-if="opponentTime" class="text-no-wrap">{{ opponentTime }}</strong>
                </div>
                <div class="text-caption text-medium-emphasis">{{ opponentZone }}</div>
              </v-col>
            </v-row>
            <v-row v-if="freeTime">
              <v-col cols="12" class="pt-0">
                <div class="text-body-2 font-weight-medium">{{ commonHours(freeTime.hours) }}</div>
                <div v-for="line in sharedLines" :key="line" class="text-caption text-medium-emphasis">{{ line }}</div>
                <div v-if="moreLines" class="text-caption text-medium-emphasis">+{{ moreLines }} more</div>
                <div class="text-caption text-medium-emphasis mt-2">
                  Open hours are a starting point, not a promise. Agree the time with your opponent.
                </div>
              </v-col>
            </v-row>
          </v-container>
        </v-form>
      </v-card-text>
      <v-card-actions>
        <v-spacer />
        <v-btn variant="text" :disabled="saving" @click="show = false">Cancel</v-btn>
        <v-btn color="primary" variant="elevated" prepend-icon="mdi-content-save" :disabled="!isValid || saving" :loading="saving" @click="save">Save</v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>

<script setup>
import { computed, ref } from 'vue';
import { backendUrl, fetchWrapper } from '@/helpers';
import { authHeader } from '@/helpers/fetch-wrapper';
import { commonHours, freeLines } from '@/helpers/blocks.mjs';
import { pickedInstant, pickerParts, viewerZone, zoneLabel } from '@/helpers/timezone.mjs';
import PlayerName from '@/components/PlayerName.vue';
import SimpleDatePicker from '@/components/SimpleDatePicker.vue';
import SimpleTimePicker from '@/components/SimpleTimePicker.vue';
import StatusAlert from '@/components/StatusAlert.vue';

const props = defineProps({ playerId: { type: Number, default: null } });
const emit = defineEmits(['saved']);

const show = ref(false);
const saving = ref(false);
const errorMessage = ref(null);
const series = ref({});
const userTimezone = viewerZone();

// The hours both players are open this round; a hint only
const freeTime = ref(null);
const HINT_LINES = 6;
const sharedLines = computed(() => freeLines(freeTime.value?.ranges ?? [], userTimezone).slice(0, HINT_LINES));
const moreLines = computed(() => Math.max((freeTime.value?.ranges?.length ?? 0) - HINT_LINES, 0));

// A season with the tools off, or a series the backend will not answer for, shows nothing
const readFreeTime = async (seriesId) => {
  const found = await fetchWrapper.get(`${backendUrl}/player-series/${seriesId}/free-time`).catch(() => null);
  if (series.value.id === seriesId) freeTime.value = found;
};

const open = (item) => {
  errorMessage.value = null;
  const mine = item.player1_id === props.playerId;
  series.value = {
    id: item.id,
    ...(item.date_time ? pickerParts(item.date_time, userTimezone) : { date: null, time: '' }),
    opponent: (mine ? item.player2 : item.player1) ?? { name: 'your opponent' },
  };
  freeTime.value = null;
  show.value = true;
  readFreeTime(item.id);
};

// the instant the dialog's date and time name, read in the player's zone
const chosen = computed(() => {
  const { date, time } = series.value;
  return date instanceof Date && time ? pickedInstant(date, time, userTimezone) : null;
});
// the opponent's zone and the chosen time on their clock; their availability stays private
const opponentZone = computed(() => zoneLabel(series.value.opponent?.timezone, userTimezone, chosen.value));
const opponentTime = computed(() =>
  opponentZone.value && chosen.value ? chosen.value.setZone(series.value.opponent.timezone).toFormat('ccc d LLL, HH:mm') : '',
);

const isValid = computed(() => !!(series.value.date && series.value.time));

const save = async () => {
  saving.value = true;
  try {
    const formData = new FormData();
    const utcDateTime = chosen.value?.toUTC().toFormat('yyyy-MM-dd HH:mm:ss') ?? null;
    if (utcDateTime) formData.append('date_time', utcDateTime);
    formData.append('action', 'scheduled');

    const url = `${backendUrl}/player-series/${series.value.id}`;
    const response = await fetch(url, { method: 'PUT', headers: await authHeader('PUT', url), body: formData });
    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || 'Update failed');
    }
    show.value = false;
    emit('saved', 'Schedule updated successfully!');
  } catch (error) {
    errorMessage.value = error.message || 'Error saving schedule.';
  } finally {
    saving.value = false;
  }
};

defineExpose({ open });
</script>
