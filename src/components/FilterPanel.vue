<template>
  <v-sheet class="mb-4 pa-3" border rounded="lg">
    <v-row dense align="center">
      <v-col v-if="showName">
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

      <!-- A phone keeps the search in view and folds the rest behind this button -->
      <v-col v-if="!mdAndUp" cols="auto">
        <v-btn variant="tonal" prepend-icon="mdi-tune-variant" :aria-expanded="open" @click="open = !open">
          Filters
          <v-badge v-if="activeCount" :content="activeCount" color="primary" inline />
        </v-btn>
      </v-col>

      <template v-if="expanded">
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
      </template>
    </v-row>

    <v-row v-if="showRace || showMMR || showReset" dense align="center" class="mt-1">
      <v-col v-if="showRace && expanded" cols="12" sm="auto">
        <v-btn-toggle v-model="searchRace" variant="outlined" density="compact" divided rounded="lg" color="primary" aria-label="Race">
          <v-btn v-for="race in raceWrapper.races" :key="race.id" :value="race.id" :title="race.name" :aria-label="race.name" min-width="48">
            <img :src="race.icon" :alt="race.name" class="race-toggle" />
            <span v-if="searchRace === race.id" class="ml-2">{{ race.name }}</span>
          </v-btn>
        </v-btn-toggle>
      </v-col>

      <v-col v-if="showMMR && expanded" cols="12" md class="d-flex align-center ga-3">
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
import { computed, ref } from 'vue';
import { useDisplay } from 'vuetify';
import { raceWrapper } from '@/helpers/races.js';

const props = defineProps({
  seasons: { type: Array, default: () => [] },
  extraActive: { type: Number, default: 0 }, // filters the after slot holds, counted on the phone button
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

const { mdAndUp } = useDisplay();
const open = ref(false);
const expanded = computed(() => mdAndUp.value || open.value);
const activeCount = computed(() => [
  searchRace.value,
  selectedSeasonFilter.value,
  rangeValues.value[0] !== props.min || rangeValues.value[1] !== props.max,
].filter(Boolean).length + props.extraActive);

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
