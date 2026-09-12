<!-- When a player cannot play: repeating weekly hours and runs of busy days.
     Each saved row reads as one line until the player opens it to edit. -->
<template>
  <div>
    <StatusAlert v-model="errorMessage" />
    <v-progress-linear v-if="isLoading" indeterminate color="primary" class="mb-4" />

    <div class="rows">
      <template v-for="(row, index) in blocks" :key="row.key">
        <v-card v-if="row.editing" variant="outlined" class="mb-3">
          <v-card-text class="pb-2">
            <v-chip-group v-model="row.days" multiple filter column class="mb-3">
              <v-chip v-for="(name, day) in DAY_NAMES" :key="name" class="day-chip" size="large" :value="day + 1" color="primary" variant="outlined">
                {{ name }}
              </v-chip>
            </v-chip-group>
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
            <v-spacer />
            <v-btn class="row-btn" variant="text" :disabled="busyKey === row.key" @click="cancel(blocks, index)">Cancel</v-btn>
            <v-btn
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
        <div v-else class="row text-body-2">
          <span class="text-medium-emphasis">{{ row.label || 'Recurring' }}</span>
          <span>{{ blockLine(asBlock(row)) }}</span>
          <span class="ops">
            <v-btn icon="mdi-pencil" variant="text" size="small" aria-label="Edit" @click="edit(row)" />
            <v-btn icon="mdi-delete" variant="text" size="small" color="error" aria-label="Delete" :loading="busyKey === row.key" @click="removeBlock(index)" />
          </span>
        </div>
      </template>

      <template v-for="(row, index) in busy" :key="row.key">
        <v-card v-if="row.editing" variant="outlined" class="mb-3">
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
            <v-spacer />
            <v-btn class="row-btn" variant="text" :disabled="busyKey === row.key" @click="cancel(busy, index)">Cancel</v-btn>
            <v-btn
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
        <div v-else class="row text-body-2">
          <span class="text-medium-emphasis">{{ row.label || 'Once-off' }}</span>
          <span>{{ busyLine(asBusy(row)) }}</span>
          <span class="ops">
            <v-btn icon="mdi-pencil" variant="text" size="small" aria-label="Edit" @click="edit(row)" />
            <v-btn icon="mdi-delete" variant="text" size="small" color="error" aria-label="Delete" :loading="busyKey === row.key" @click="removeBusy(index)" />
          </span>
        </div>
      </template>
      <p v-if="!isLoading && !blocks.length && !busy.length" class="text-body-2 text-medium-emphasis">
        You have not blocked any time — every hour is open.
      </p>
    </div>

    <div class="d-flex flex-wrap ga-2 mt-3">
      <v-btn class="row-btn" color="primary" variant="outlined" prepend-icon="mdi-plus" @click="addBlock">Recurring</v-btn>
      <v-btn class="row-btn" color="primary" variant="outlined" prepend-icon="mdi-plus" @click="addBusy">Once-off</v-btn>
    </div>

    <div class="mt-6">
      <h3 class="text-subtitle-1 font-weight-medium mb-2">What a round leaves open</h3>
      <div v-for="day in week" :key="day.day" class="preview-row text-body-2">
        <span class="text-medium-emphasis">{{ day.name }}</span>
        <span>{{ day.line }}</span>
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed, onMounted, ref } from 'vue';
import { backendUrl, fetchWrapper } from '@/helpers';
import { DAY_NAMES, asBlock, asBusy, blockFields, blockLine, busyFields, busyLine, mark, weekFree, zoneBody } from '@/helpers/blocks.mjs';
import { viewerZone } from '@/helpers/timezone.mjs';
import SimpleDatePicker from '@/components/SimpleDatePicker.vue';
import SimpleTimePicker from '@/components/SimpleTimePicker.vue';
import StatusAlert from '@/components/StatusAlert.vue';

const props = defineProps({ zone: { type: String, default: null } });  // the profile zone the backend resolves blocks against
const emit = defineEmits(['zone']);

const isLoading = ref(true);
const errorMessage = ref(null);
const blocks = ref([]);
const busy = ref([]);
const busyKey = ref(null);  // the row a save or delete is out for
const browserZone = viewerZone();
const wroteZone = ref(null);  // the zone this editor wrote, before the page reads the player again

let nextKey = 0;
const key = () => `row-${nextKey++}`;

// Every row that reads as a block, saved or not, so the preview follows what is on screen
const preview = computed(() => blocks.value.filter(blockValid).map(asBlock));
const week = computed(() => weekFree(preview.value));

const blockRow = (row) => ({ key: key(), editing: false, ...blockFields(row) });
const busyRow = (row) => ({ key: key(), editing: false, ...busyFields(row) });

const blockValid = (row) => row.days.length > 0 && !!row.start && !!row.end && row.start !== row.end;
const busyValid = (row) => !!row.first && !!row.last && row.last >= row.first;

const blockPreview = (row) => (blockValid(row) ? blockLine(asBlock(row)) : 'Pick the days and the hours.');
const busyPreview = (row) => (busyValid(row) ? busyLine(asBusy(row)) : 'Pick the first and last day.');

// A row opened for edit remembers what it looked like, so Cancel puts it back
const edit = (row) => Object.assign(row, { was: { ...row }, editing: true });
const cancel = (list, index) => {
  const row = list[index];
  if (!row.id) return void list.splice(index, 1);
  Object.assign(row, row.was, { editing: false });
};

const load = async () => {
  try {
    const data = await fetchWrapper.get(`${backendUrl}/player-blocks`);
    blocks.value = (data.repeating || []).map(row => mark(blockRow(row), asBlock));
    busy.value = (data.busy || []).map(row => mark(busyRow(row), asBusy));
  } catch {
    errorMessage.value = 'Could not load your blocked times.';
  } finally {
    isLoading.value = false;
  }
};

// The backend refuses every block while the profile has no zone, so the browser zone goes first
const ensureZone = async () => {
  const body = zoneBody(props.zone || wroteZone.value, browserZone);
  if (!body) return;
  const { user } = await fetchWrapper.put(`${backendUrl}/user-info`, body);
  wroteZone.value = user?.timezone || browserZone;
  emit('zone', wroteZone.value);
};

// One write, then the row carries what the backend stored and closes
const write = async (row, url, fields, shape) => {
  busyKey.value = row.key;
  errorMessage.value = null;
  const body = shape(row);
  try {
    await ensureZone();
    const saved = row.id
      ? await fetchWrapper.put(`${url}/${row.id}`, body)
      : await fetchWrapper.post(url, body);
    Object.assign(row, fields(saved), { editing: false });
    mark(row, shape);
  } catch (error) {
    errorMessage.value = error.message || 'Could not save the block.';
  } finally {
    busyKey.value = null;
  }
};

const saveBlock = (row) => write(row, `${backendUrl}/player-blocks/repeating`, blockFields, asBlock);
const saveBusy = (row) => write(row, `${backendUrl}/player-blocks/busy`, busyFields, asBusy);

// A row never written has nothing to delete on the backend
const drop = async (list, index, path) => {
  const row = list.value[index];
  if (!row.id) return void list.value.splice(index, 1);
  busyKey.value = row.key;
  errorMessage.value = null;
  try {
    await fetchWrapper.delete(`${backendUrl}/player-blocks/${path}/${row.id}`);
    list.value.splice(index, 1);
  } catch (error) {
    errorMessage.value = error.message || 'Could not delete the block.';
  } finally {
    busyKey.value = null;
  }
};

const removeBlock = (index) => drop(blocks, index, 'repeating');
const removeBusy = (index) => drop(busy, index, 'busy');

const addBlock = () => blocks.value.push({ ...blockRow(null), editing: true });
const addBusy = () => busy.value.push({ ...busyRow(null), editing: true });

onMounted(load);
</script>

<style scoped>
.row {
  display: grid;
  grid-template-columns: minmax(5rem, 8rem) 1fr auto;
  gap: 0.75rem;
  align-items: center;
  padding: 4px 0;
  border-bottom: 1px solid rgba(var(--v-border-color), var(--v-border-opacity));
}

.ops {
  display: flex;
  gap: 0.25rem;
}

.preview-row {
  display: grid;
  grid-template-columns: 3rem 1fr;
  gap: 0.5rem;
  padding: 2px 0;
}

/* Phone: the label wraps above its line, and every chip and button meets the 48 px minimum */
@media (max-width: 600px) {
  .row { grid-template-columns: 1fr auto; }
  .row > span:first-child { grid-column: 1 / -1; }
  .day-chip { min-height: 48px; min-width: 48px; }
  .row-btn { min-height: 48px; }
}
</style>
