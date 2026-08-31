<template>
  <v-expansion-panels class="mb-4">
    <v-expansion-panel>
      <v-expansion-panel-title class="bg-primary">
        <v-icon class="mr-2">mdi-filter</v-icon>
        <span>Filters</span>
      </v-expansion-panel-title>
      <v-expansion-panel-text class="pt-4">
        <!-- First Row: Name, Race, MMR -->
        <v-row>
          <v-col v-if="showName" cols="12" md="4">
            <v-text-field
              v-model="localSearchName"
              label="Search Player Name"
              variant="outlined"
              prepend-inner-icon="mdi-magnify"
              density="comfortable"
              clearable
            ></v-text-field>
          </v-col>

          <v-col v-if="showRace" cols="12" md="2">
            <RaceSelect v-model="localSearchRace" />
          </v-col>

          <v-col v-if="showMMR" cols="12" md="6">
            <div class="text-subtitle-1 font-weight-medium mb-2">
              <v-icon class="mr-1" size="small">mdi-numeric</v-icon>
              MMR Range
            </div>
            <v-range-slider
              v-model="localRangeValues"
              :min="min"
              :max="max"
              strict
              :step="step"
              color="primary"
              class="align-center"
              hide-details
            >
              <template v-slot:prepend>
                <v-text-field
                  v-model.number="localRangeValues[0]"
                  density="compact"
                  type="number"
                  hide-details
                  single-line
                  variant="outlined"
                  style="width: 80px"
                  hide-spin-buttons
                ></v-text-field>
              </template>
              <template v-slot:append>
                <v-text-field
                  v-model.number="localRangeValues[1]"
                  density="compact"
                  type="number"
                  hide-details
                  single-line
                  variant="outlined"
                  style="width: 80px"
                  hide-spin-buttons
                ></v-text-field>
              </template>
            </v-range-slider>
          </v-col>
        </v-row>

        <!-- Second Row: Season Filter and After Slot (W3C Stats) -->
        <v-row v-if="showSeason || $slots.after">
          <v-col v-if="showSeason" cols="12" md="6">
            <v-select
              v-model="localSelectedSeasonFilter"
              :items="seasons"
              item-title="name"
              item-value="id"
              clearable
              label="Filter by Season"
              variant="outlined"
              prepend-inner-icon="mdi-calendar"
              density="comfortable"
            ></v-select>
          </v-col>

          <slot name="after"></slot>
        </v-row>

        <!-- Reset Button Row -->
        <v-row v-if="showReset" justify="center" class="mt-2">
          <v-col cols="auto">
            <v-btn @click="$emit('reset')" variant="elevated" prepend-icon="mdi-refresh" color="primary">Reset Filters</v-btn>
          </v-col>
        </v-row>
      </v-expansion-panel-text>
    </v-expansion-panel>
  </v-expansion-panels>
</template>

<script setup>
import { ref, watch } from 'vue';
import RaceSelect from '@/components/RaceSelect.vue';

const props = defineProps({
  searchName: { type: String, default: '' },
  searchRace: { type: [String, null], default: null },
  selectedSeasonFilter: { type: [String, Number, null], default: null },
  rangeValues: { type: Array, default: () => [0, 3000] },
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

const emit = defineEmits(['update:searchName', 'update:searchRace', 'update:selectedSeasonFilter', 'update:rangeValues', 'reset']);

// local copies so v-model bindings work with primitives/arrays
const localSearchName = ref('');
const localSearchRace = ref(null);
const localSelectedSeasonFilter = ref(null);
const localRangeValues = ref([0, 3000]);

// keep parent -> local in sync, seeding the locals on setup
watch(() => props.searchName, v => { localSearchName.value = v; }, { immediate: true });
watch(() => props.searchRace, v => { localSearchRace.value = v; }, { immediate: true });
watch(() => props.selectedSeasonFilter, v => { localSelectedSeasonFilter.value = v; }, { immediate: true });
watch(() => props.rangeValues, v => { localRangeValues.value = Array.isArray(v) ? [...v] : [v, v]; }, { deep: true, immediate: true });

// helper to avoid recursive emit loops by checking equality
function isEqual(a, b) {
  if (Array.isArray(a) && Array.isArray(b)) {
    if (a.length !== b.length) return false;
    for (let i = 0; i < a.length; i++) {
      if (a[i] !== b[i]) return false;
    }
    return true;
  }
  return a === b;
}

// emit local changes up to parent, but only when they differ from props (prevents recursive loops)
watch(localSearchName, v => {
  if (!isEqual(v, props.searchName)) emit('update:searchName', v);
});
watch(localSearchRace, v => {
  if (!isEqual(v, props.searchRace)) emit('update:searchRace', v);
});
watch(localSelectedSeasonFilter, v => {
  if (!isEqual(v, props.selectedSeasonFilter)) emit('update:selectedSeasonFilter', v);
});
watch(localRangeValues, v => {
  if (!isEqual(v, props.rangeValues)) emit('update:rangeValues', v);
}, { deep: true });
</script>
