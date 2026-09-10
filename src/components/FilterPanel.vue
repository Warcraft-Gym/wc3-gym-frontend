<template>
  <v-sheet class="mb-4 pa-3" border rounded="lg">
    <v-row dense align="center">
      <v-col v-if="showName" cols="12" md>
        <v-text-field
          v-model="searchName"
          placeholder="Search name, battle tag or Discord"
          aria-label="Search players"
          prepend-inner-icon="mdi-magnify"
          variant="outlined"
          density="compact"
          hide-details
          clearable
        />
      </v-col>

      <v-col v-if="showSeason" cols="12" md="3">
        <v-select
          v-model="selectedSeasonFilter"
          :items="events"
          item-title="name"
          item-value="id"
          placeholder="Filter by events"
          aria-label="Filter by events"
          prepend-inner-icon="mdi-calendar"
          variant="outlined"
          density="compact"
          hide-details
          clearable
        />
      </v-col>

      <slot name="after" />
    </v-row>

    <v-row v-if="showRace || showMMR || showReset" dense align="center" class="mt-1">
      <v-col v-if="showRace" cols="12" sm="auto">
        <v-btn-toggle v-model="searchRace" variant="outlined" density="compact" divided rounded="lg" color="primary" aria-label="Race">
          <v-btn v-for="race in raceWrapper.races" :key="race.id" :value="race.id" :title="race.name" :aria-label="race.name" min-width="48">
            <img :src="race.icon" :alt="race.name" class="race-toggle" />
          </v-btn>
        </v-btn-toggle>
      </v-col>

      <v-col v-if="showMMR" cols="12" md class="d-flex align-center ga-3">
        <span class="text-body-2 text-medium-emphasis">MMR</span>
        <v-text-field
          :model-value="rangeValues[0]"
          @update:model-value="v => setRange(0, v)"
          aria-label="Lowest MMR"
          type="number"
          variant="outlined"
          density="compact"
          hide-details
          hide-spin-buttons
          class="mmr-input"
        />
        <v-range-slider
          v-model="rangeValues"
          :min="min"
          :max="max"
          :step="step"
          strict
          color="primary"
          hide-details
          class="flex-grow-1 mmr-slider"
        />
        <v-text-field
          :model-value="rangeValues[1]"
          @update:model-value="v => setRange(1, v)"
          aria-label="Highest MMR"
          type="number"
          variant="outlined"
          density="compact"
          hide-details
          hide-spin-buttons
          class="mmr-input"
        />
      </v-col>
      <v-col v-if="showReset" cols="auto" class="d-flex align-center ga-3 ms-auto">
        <slot name="summary" />
        <v-btn variant="text" prepend-icon="mdi-filter-remove-outline" @click="$emit('reset')">Clear filters</v-btn>
      </v-col>
    </v-row>
  </v-sheet>
</template>

<script setup>
import { computed } from 'vue';
import { raceWrapper } from '@/helpers/races.js';

const props = defineProps({
  seasons: { type: Array, default: () => [] },
  showName: { type: Boolean, default: true },
  showRace: { type: Boolean, default: true },
  showSeason: { type: Boolean, default: true },
  showMMR: { type: Boolean, default: true },
  showReset: { type: Boolean, default: true },
  min: { type: Number, default: 0 },
  max: { type: Number, default: 3000 },
  step: { type: Number, default: 10 },
});
defineEmits(['reset']);

const searchName = defineModel('searchName', { type: String, default: '' });
const searchRace = defineModel('searchRace', { type: [String, null], default: null });
const selectedSeasonFilter = defineModel('selectedSeasonFilter', { type: [String, Number, null], default: null });
const rangeValues = defineModel('rangeValues', { type: Array, default: () => [0, 3000] });

const events = computed(() => [...(props.seasons || [])].sort((a, b) => b.id - a.id));

const setRange = (i, value) => {
  const next = [...rangeValues.value];
  next[i] = Number(value) || 0;
  rangeValues.value = next;
};
</script>

<style scoped>
.race-toggle {
  width: 22px;
  height: 22px;
}
/* A race off the filter reads grey, so the chosen one stands out in its own colours */
.v-btn:not(.v-btn--active) .race-toggle {
  filter: grayscale(1);
  opacity: 0.6;
}
.mmr-input {
  min-width: 64px;
  max-width: 88px;
}
.mmr-input :deep(.v-field__input) {
  padding-inline: 8px;
}
.mmr-slider {
  min-width: 100px;
}
</style>
