<!-- When a player cannot play: repeating weekly hours and runs of busy days.
     Both are hints for the scheduling tools; neither answers a round. -->
<template>
  <div>
    <StatusAlert v-model="errorMessage" />
    <v-progress-linear v-if="isLoading" indeterminate color="primary" class="mb-4" />

    <p class="text-body-2 text-medium-emphasis mb-6">
      Open hours are a starting point, not a promise. Agree the time with your opponent.
    </p>

    <section class="mb-8">
      <h3 class="text-subtitle-1 font-weight-medium mb-1">Repeating</h3>
      <p class="text-caption text-medium-emphasis mb-3">Hours you cannot play, every round, in {{ zone }}.</p>

      <p v-if="!isLoading && !blocks.length" class="text-body-2 text-medium-emphasis mb-3">No repeating blocks yet.</p>

      <v-card v-for="(row, index) in blocks" :key="row.key" variant="outlined" class="mb-3">
        <v-card-text class="pb-2">
          <div class="d-flex flex-wrap ga-2 mb-3">
            <v-chip
              v-for="(name, day) in DAY_NAMES"
              :key="name"
              class="day-chip"
              size="large"
              :color="row.days.includes(day + 1) ? 'primary' : undefined"
              :variant="row.days.includes(day + 1) ? 'flat' : 'outlined'"
              @click="toggleDay(row, day + 1)"
            >
              {{ name }}
            </v-chip>
          </div>
          <v-row dense>
            <v-col cols="6" md="3"><SimpleTimePicker v-model="row.start" label="From" /></v-col>
            <v-col cols="6" md="3"><SimpleTimePicker v-model="row.end" label="To" /></v-col>
            <v-col cols="12" md="6">
              <v-text-field v-model="row.label" label="Label (optional)" maxlength="40" density="comfortable" hide-details />
            </v-col>
          </v-row>
          <p class="text-caption text-medium-emphasis mt-2">{{ blockPreview(row) }}</p>
        </v-card-text>
        <v-card-actions class="px-4 pb-3 pt-0">
          <v-btn class="row-btn" variant="text" color="error" prepend-icon="mdi-delete" :loading="busyKey === row.key" @click="removeBlock(index)">Delete</v-btn>
          <v-spacer />
          <v-btn
            v-if="blockDirty(row)"
            class="row-btn"
            color="primary"
            variant="elevated"
            prepend-icon="mdi-content-save"
            :disabled="!blockValid(row)"
            :loading="busyKey === row.key"
            @click="saveBlock(row)"
          >
            Save
          </v-btn>
        </v-card-actions>
      </v-card>

      <v-btn class="row-btn" color="primary" :variant="blocks.length ? 'outlined' : 'elevated'" prepend-icon="mdi-plus" @click="addBlock">
        Add repeating block
      </v-btn>

      <div v-if="stored.length" class="mt-6">
        <h4 class="text-subtitle-2 font-weight-medium mb-2">What a round leaves open</h4>
        <div v-for="day in week" :key="day.day" class="preview-row text-body-2">
          <span class="text-medium-emphasis">{{ day.name }}</span>
          <span>{{ day.line }}</span>
        </div>
      </div>
    </section>

    <section>
      <h3 class="text-subtitle-1 font-weight-medium mb-1">Busy days</h3>
      <p class="text-caption text-medium-emphasis mb-3">Whole days you are away. Both ends count.</p>

      <p v-if="!isLoading && !busy.length" class="text-body-2 text-medium-emphasis mb-3">No busy days yet.</p>

      <v-card v-for="(row, index) in busy" :key="row.key" variant="outlined" class="mb-3">
        <v-card-text class="pb-2">
          <v-row dense>
            <v-col cols="12" md="4"><SimpleDatePicker v-model="row.first" label="First day" /></v-col>
            <v-col cols="12" md="4"><SimpleDatePicker v-model="row.last" label="Last day" /></v-col>
            <v-col cols="12" md="4">
              <v-text-field v-model="row.label" label="Label (optional)" maxlength="40" density="comfortable" hide-details />
            </v-col>
          </v-row>
          <p class="text-caption text-medium-emphasis mt-2">{{ busyPreview(row) }}</p>
        </v-card-text>
        <v-card-actions class="px-4 pb-3 pt-0">
          <v-btn class="row-btn" variant="text" color="error" prepend-icon="mdi-delete" :loading="busyKey === row.key" @click="removeBusy(index)">Delete</v-btn>
          <v-spacer />
          <v-btn
            v-if="busyDirty(row)"
            class="row-btn"
            color="primary"
            variant="elevated"
            prepend-icon="mdi-content-save"
            :disabled="!busyValid(row)"
            :loading="busyKey === row.key"
            @click="saveBusy(row)"
          >
            Save
          </v-btn>
        </v-card-actions>
      </v-card>

      <v-btn class="row-btn" color="primary" :variant="busy.length ? 'outlined' : 'elevated'" prepend-icon="mdi-plus" @click="addBusy">
        Add busy days
      </v-btn>
    </section>
  </div>
</template>

<script setup>
import { computed, onMounted, ref } from 'vue';
import { backendUrl, fetchWrapper } from '@/helpers';
import { DAY_NAMES, bitsOf, blockLine, busyLine, daysOf, weekFree } from '@/helpers/blocks.mjs';
import { viewerZone } from '@/helpers/timezone.mjs';
import SimpleDatePicker from '@/components/SimpleDatePicker.vue';
import SimpleTimePicker from '@/components/SimpleTimePicker.vue';
import StatusAlert from '@/components/StatusAlert.vue';

const emit = defineEmits(['change']);

const isLoading = ref(true);
const errorMessage = ref(null);
const blocks = ref([]);
const busy = ref([]);
const busyKey = ref(null);  // the row a save or delete is out for
const zone = viewerZone();

let nextKey = 0;
const key = () => `row-${nextKey++}`;

// The rows the backend holds, so the week preview and the dirty check read saved work only
const stored = computed(() => blocks.value.filter(row => row.id).map(asBlock));
const week = computed(() => weekFree(stored.value));

const clock = (value) => String(value ?? '').slice(0, 5);
const isoDay = (date) => (date instanceof Date
  ? `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
  : null);
const asDate = (iso) => { const [y, m, d] = String(iso).split('-').map(Number); return new Date(y, m - 1, d); };

const blockRow = (row) => ({ key: key(), id: row?.id ?? null, label: row?.label ?? '', days: daysOf(row?.weekdays), start: clock(row?.start_local), end: clock(row?.end_local) });
const busyRow = (row) => ({ key: key(), id: row?.id ?? null, label: row?.label ?? '', first: row ? asDate(row.first_day) : null, last: row ? asDate(row.last_day) : null });

const asBlock = (row) => ({ label: row.label || null, weekdays: bitsOf(row.days), start_local: row.start, end_local: row.end });
const asBusy = (row) => ({ label: row.label || null, first_day: isoDay(row.first), last_day: isoDay(row.last) });

const blockValid = (row) => row.days.length > 0 && !!row.start && !!row.end && row.start !== row.end;
const busyValid = (row) => !!row.first && !!row.last && isoDay(row.last) >= isoDay(row.first);
const blockDirty = (row) => !row.id || JSON.stringify(asBlock(row)) !== row.saved;
const busyDirty = (row) => !row.id || JSON.stringify(asBusy(row)) !== row.saved;

const blockPreview = (row) => (blockValid(row) ? blockLine(asBlock(row)) : 'Pick the days and the hours.');
const busyPreview = (row) => (busyValid(row) ? busyLine(asBusy(row)) : 'Pick the first and last day.');

const toggleDay = (row, day) => {
  row.days = row.days.includes(day) ? row.days.filter(d => d !== day) : [...row.days, day].sort((a, b) => a - b);
};

// A row remembers what the backend holds, so an untouched row shows no Save
const mark = (row, shape) => Object.assign(row, { saved: JSON.stringify(shape(row)) });

const load = async () => {
  try {
    const data = await fetchWrapper.get(`${backendUrl}/player-blocks`);
    blocks.value = (data.repeating || []).map(row => mark(blockRow(row), asBlock));
    busy.value = (data.busy || []).map(row => mark(busyRow(row), asBusy));
    emit('change', blocks.value.length + busy.value.length);
  } catch (error) {
    errorMessage.value = error.message || 'Could not load your blocked times.';
  } finally {
    isLoading.value = false;
  }
};

// One write, then the row carries what the backend stored
const write = async (row, url, body, list) => {
  busyKey.value = row.key;
  errorMessage.value = null;
  try {
    const saved = row.id
      ? await fetchWrapper.put(`${url}/${row.id}`, body)
      : await fetchWrapper.post(url, body);
    const shape = list === blocks.value ? asBlock : asBusy;
    Object.assign(row, list === blocks.value ? blockRow(saved) : busyRow(saved), { key: row.key });
    mark(row, shape);
    emit('change', blocks.value.length + busy.value.length);
  } catch (error) {
    errorMessage.value = error.message || 'Could not save the block.';
  } finally {
    busyKey.value = null;
  }
};

const saveBlock = (row) => write(row, `${backendUrl}/player-blocks/repeating`, asBlock(row), blocks);
const saveBusy = (row) => write(row, `${backendUrl}/player-blocks/busy`, asBusy(row), busy);

// A row never written has nothing to delete on the backend
const drop = async (list, index, path) => {
  const row = list.value[index];
  if (!row.id) return void list.value.splice(index, 1);
  busyKey.value = row.key;
  errorMessage.value = null;
  try {
    await fetchWrapper.delete(`${backendUrl}/player-blocks/${path}/${row.id}`);
    list.value.splice(index, 1);
    emit('change', blocks.value.length + busy.value.length);
  } catch (error) {
    errorMessage.value = error.message || 'Could not delete the block.';
  } finally {
    busyKey.value = null;
  }
};

const removeBlock = (index) => drop(blocks, index, 'repeating');
const removeBusy = (index) => drop(busy, index, 'busy');

const addBlock = () => blocks.value.push(blockRow(null));
const addBusy = () => busy.value.push(busyRow(null));

onMounted(load);
</script>

<style scoped>
.preview-row {
  display: grid;
  grid-template-columns: 3rem 1fr;
  gap: 0.5rem;
  padding: 2px 0;
}

/* Phone: every chip and button meets the 48 px minimum */
@media (max-width: 600px) {
  .day-chip { min-height: 48px; min-width: 48px; }
  .row-btn { min-height: 48px; }
}
</style>
