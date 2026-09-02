<template>
  <v-overlay v-model="isLoading" persistent contained class="align-center justify-center">
    <v-progress-circular indeterminate size="64" width="8" color="primary"></v-progress-circular>
  </v-overlay>

  <v-container fluid class="pa-4">
    <!-- Page Header -->
    <v-row class="mb-2" align="center">
      <v-col>
        <h1>
          <v-icon class="mr-2">mdi-map-outline</v-icon>
          Series maps
        </h1>
        <div class="text-subtitle-1 text-grey">{{ season.name }}</div>
      </v-col>
      <v-col cols="auto" class="d-flex align-center ga-2">
        <v-chip size="small" variant="tonal">{{ rules.length }} games</v-chip>
        <v-btn variant="text" prepend-icon="mdi-arrow-left" :to="`/seasons/${route.params.id}`">Back to season</v-btn>
        <v-btn color="primary" variant="elevated" prepend-icon="mdi-content-save" :disabled="!isDirty" @click="saveSettings">
          Save
        </v-btn>
      </v-col>
    </v-row>

    <StatusAlert v-model="errorMessage" />

    <v-row>
      <!-- Map pool -->
      <v-col cols="12" md="5">
        <v-card elevation="2">
          <v-card-title class="bg-primary d-flex align-center">
            <v-icon class="mr-2">mdi-map</v-icon>
            <span>Map pool</span>
            <v-spacer />
            <v-chip size="small" variant="outlined" class="mr-2">{{ pool.length }} maps</v-chip>
            <v-btn size="small" variant="outlined" @click="addOpen = !addOpen">Add map</v-btn>
          </v-card-title>

          <v-expand-transition>
            <div v-if="addOpen" class="add-panel">
              <div class="d-flex align-center px-4 pt-2 text-caption text-grey">
                <span>Maps not in this season</span>
                <v-spacer />
                <span>{{ notInPool.length }} available</span>
              </div>
              <v-list density="compact" bg-color="transparent" max-height="220" class="overflow-y-auto">
                <v-list-item v-for="m in notInPool" :key="m.id" @click="addMap(m.id)">
                  <template #prepend>
                    <span class="map-thumb thumb-sm mr-3"><img :src="mapImageUrl(m.id)" :alt="m.name" @error="hideMissingImage"></span>
                  </template>
                  <v-list-item-title class="text-body-2">{{ m.name }}</v-list-item-title>
                  <template #append>
                    <v-chip size="x-small" label>{{ m.shortname }}</v-chip>
                  </template>
                </v-list-item>
                <v-list-item v-if="!notInPool.length" class="text-caption text-grey">Every map is already in this season</v-list-item>
              </v-list>
              <div class="d-flex justify-end ga-2 px-4 py-2">
                <v-btn size="small" variant="outlined" color="primary" @click="openImport">Import ladder pool</v-btn>
                <v-btn size="small" variant="outlined" color="primary" @click="newMapOpen = true">New map</v-btn>
              </div>
            </div>
          </v-expand-transition>

          <v-list max-height="560" class="overflow-y-auto">
            <v-list-item v-for="(m, i) in pool" :key="m.id" class="py-2">
              <template #prepend>
                <span class="map-thumb thumb-lg mr-4"><img :src="mapImageUrl(m.id)" :alt="m.name" @error="hideMissingImage"></span>
              </template>
              <v-list-item-title class="font-weight-medium">{{ m.name }}</v-list-item-title>
              <template #append>
                <v-chip size="x-small" label class="mr-2">{{ m.shortname }}</v-chip>
                <v-btn icon="mdi-arrow-up" variant="text" size="small" :disabled="i === 0" @click="moveMap(i, -1)" />
                <v-btn icon="mdi-arrow-down" variant="text" size="small" :disabled="i === pool.length - 1" @click="moveMap(i, 1)" />
                <v-btn icon="mdi-close" variant="text" size="small" color="error" @click="removeMap(m.id)" />
              </template>
            </v-list-item>
            <v-list-item v-if="!pool.length" class="text-grey">No maps in this season yet</v-list-item>
          </v-list>
        </v-card>
      </v-col>

      <!-- Rules and week maps -->
      <v-col cols="12" md="3">
        <v-card elevation="2" class="mb-4">
          <v-card-title class="bg-primary d-flex align-center">
            <v-icon class="mr-2">mdi-format-list-numbered</v-icon>
            <span>Map rule per game</span>
          </v-card-title>
          <v-card-text class="pt-4">
            <v-select
              v-for="(rule, i) in rules"
              :key="i"
              :model-value="rule"
              :items="RULES"
              item-title="label"
              item-value="value"
              :label="`Game ${i + 1}`"
              variant="outlined"
              density="compact"
              hide-details
              class="mb-3"
              @update:modelValue="rules[i] = $event"
            />
          </v-card-text>
        </v-card>

        <v-card v-if="usesWeekMap" elevation="2">
          <v-card-title class="bg-primary d-flex align-center">
            <v-icon class="mr-2">mdi-calendar-week</v-icon>
            <span>Week maps</span>
          </v-card-title>
          <v-card-text class="pt-4">
            <v-select
              v-for="week in weekNumbers"
              :key="week"
              :model-value="weekMapId(week)"
              :items="pool"
              item-title="name"
              item-value="id"
              :label="`Week ${week}`"
              variant="outlined"
              density="compact"
              hide-details
              clearable
              class="mb-3"
              @update:modelValue="setWeekMap(week, $event ?? null)"
            >
              <template #item="{ props: itemProps, item }">
                <v-list-item v-bind="itemProps">
                  <template #prepend>
                    <span class="map-thumb thumb-sm mr-3"><img :src="mapImageUrl(item.raw.id)" :alt="item.raw.name" @error="hideMissingImage"></span>
                  </template>
                  <template #append>
                    <v-chip size="x-small" label>{{ item.raw.shortname }}</v-chip>
                  </template>
                </v-list-item>
              </template>
            </v-select>
            <div v-if="!weekNumbers.length" class="text-caption text-grey">This season has no playdays</div>
          </v-card-text>
        </v-card>
      </v-col>

      <!-- Pick and ban order -->
      <v-col cols="12" md="4">
        <v-card elevation="2" class="mb-4">
          <v-card-title class="bg-primary d-flex align-center">
            <v-icon class="mr-2">mdi-gavel</v-icon>
            <span>Pick and ban order</span>
          </v-card-title>
          <v-card-text class="pt-4">
            <div class="order-string mb-3">{{ order.join('|') || 'No order set' }}</div>
            <div class="d-flex flex-wrap ga-2 mb-3">
              <v-btn v-for="step in STEPS" :key="step.value" size="small" variant="outlined" :color="step.color" @click="order.push(step.value)">
                {{ step.label }}
              </v-btn>
              <v-btn size="small" variant="outlined" :disabled="!order.length" @click="order.pop()">Delete last</v-btn>
            </div>
            <v-divider class="mb-2" />
            <div v-for="count in counts" :key="count.label" class="d-flex justify-space-between py-1">
              <span class="text-caption text-grey">{{ count.label }}</span>
              <span class="text-body-2 font-weight-medium" :class="{ 'text-error': count.negative }">{{ count.value }}</span>
            </div>
          </v-card-text>
        </v-card>

        <v-card elevation="2">
          <v-card-title class="bg-primary d-flex align-center">
            <v-icon class="mr-2">mdi-help-circle-outline</v-icon>
            <span>What fills each game</span>
          </v-card-title>
          <v-list density="compact">
            <v-list-item v-for="fill in fills" :key="fill.label">
              <v-list-item-title class="text-body-2">{{ fill.label }}</v-list-item-title>
              <template #append>
                <v-chip size="small" variant="tonal" :color="fill.short ? 'error' : 'primary'">{{ fill.source }}</v-chip>
              </template>
            </v-list-item>
          </v-list>
        </v-card>
      </v-col>
    </v-row>

    <!-- New Map Dialog -->
    <v-dialog v-model="newMapOpen" max-width="560">
      <v-card>
        <v-card-title class="bg-primary">
          <v-icon class="mr-2">mdi-map-plus</v-icon>
          New Map
        </v-card-title>
        <v-card-text class="pt-4">
          <v-row>
            <v-col cols="12" md="8">
              <v-text-field v-model="newMap.name" label="Map Name" variant="outlined" density="comfortable" prepend-inner-icon="mdi-map" />
            </v-col>
            <v-col cols="12" md="4">
              <v-text-field v-model="newMap.shortname" label="Short Name" variant="outlined" density="comfortable" prepend-inner-icon="mdi-text-short" />
            </v-col>
          </v-row>
          <div class="d-flex align-center ga-4">
            <span class="map-thumb thumb-lg"><img v-if="newMapPreview" :src="newMapPreview" alt="Preview"></span>
            <v-file-input
              v-model="newMapFile"
              label="Map Image"
              accept=".png,.jpg"
              variant="outlined"
              density="comfortable"
              prepend-icon=""
              prepend-inner-icon="mdi-image"
              hide-details
            />
          </div>
        </v-card-text>
        <v-card-actions>
          <v-spacer />
          <v-btn @click="closeNewMap">Cancel</v-btn>
          <v-btn color="primary" variant="elevated" prepend-icon="mdi-plus" :disabled="!newMap.name" @click="createNewMap">
            Add to pool
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <!-- Ladder Import Dialog -->
    <v-dialog v-model="importOpen" max-width="760">
      <v-card>
        <v-card-title class="bg-primary d-flex align-center">
          <v-icon class="mr-2">mdi-download</v-icon>
          <span>Import ladder pool</span>
          <v-spacer />
          <v-chip size="small" variant="outlined">{{ importRows.length }} maps on the 1v1 ladder</v-chip>
        </v-card-title>
        <v-card-text class="pa-0">
          <v-progress-linear v-if="importLoading" indeterminate color="primary" />
          <v-list max-height="500" class="overflow-y-auto">
            <v-list-item
              v-for="row in importRows"
              :key="row.w3c_name"
              :class="{ 'row-in-pool': row.status === 'in_pool' }"
              @click="toggleSkip(row)"
            >
              <template #prepend>
                <span class="import-name text-body-2 font-weight-medium mr-3">{{ row.w3c_name }}</span>
                <span class="map-thumb thumb-sm mr-3"><img v-if="row.image_url" :src="row.image_url" :alt="row.matched_name" @error="hideMissingImage"></span>
              </template>
              <v-list-item-title class="text-body-2">{{ row.matched_name || '—' }}</v-list-item-title>
              <template #append>
                <v-chip v-if="row.shortname" size="x-small" label class="mr-3">{{ row.shortname }}</v-chip>
                <v-chip size="x-small" :color="statusColor(row)" variant="tonal">{{ statusLabel(row) }}</v-chip>
              </template>
            </v-list-item>
          </v-list>
        </v-card-text>
        <v-card-actions>
          <v-spacer />
          <v-btn @click="importOpen = false">Cancel</v-btn>
          <v-btn color="primary" variant="elevated" prepend-icon="mdi-plus" :disabled="!importNames.length" @click="confirmImport">
            Add {{ importNames.length }} new maps
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>
  </v-container>
</template>

<script setup>
import { computed, onMounted, ref } from 'vue';
import { storeToRefs } from 'pinia';
import { useRoute } from 'vue-router';

import { useMapStore, useSeasonStore } from '@/stores';
import { hideMissingImage } from '@/helpers/team-image';
import StatusAlert from '@/components/StatusAlert.vue';

const backendUrl = `${import.meta.env.VITE_BACKEND_URL}`;
const RULES = [
  { value: 'veto', label: 'Veto' },
  { value: 'loser', label: 'Loser picks' },
  { value: 'host', label: 'Host picks' },
  { value: 'week', label: 'Week map' },
];
const STEPS = [
  { value: 'Ban_A', label: '+ Ban A', color: 'error' },
  { value: 'Ban_B', label: '+ Ban B', color: 'error' },
  { value: 'Pick_A', label: '+ Pick A', color: 'success' },
  { value: 'Pick_B', label: '+ Pick B', color: 'success' },
];
const DEFAULT_RULES = 'veto,veto,veto';

const route = useRoute();
const seasonStore = useSeasonStore();
const mapStore = useMapStore();
const { current_season: season } = storeToRefs(seasonStore);
const { maps } = storeToRefs(mapStore);

const seasonId = computed(() => seasonStore.seasonIdOf(route.params.id));
const isLoading = ref(false);
const errorMessage = ref(null);
const addOpen = ref(false);

// The two settings edited here, saved together
const rules = ref([]);
const order = ref([]);
const savedRules = ref('');
const savedOrder = ref('');

const newMapOpen = ref(false);
const newMap = ref({ name: '', shortname: '' });
const newMapFile = ref(null);
const newMapPreview = computed(() => (newMapFile.value ? URL.createObjectURL(newMapFile.value) : null));

const importOpen = ref(false);
const importLoading = ref(false);
const importRows = ref([]);
const importSkipped = ref([]);

const mapImageUrl = (mapId) => `${backendUrl}/maps/${mapId}/image`;

const pool = computed(() => season.value.maps || []);
const notInPool = computed(() => maps.value.filter((m) => !pool.value.some((p) => p.id === m.id)));
const usesWeekMap = computed(() => rules.value.includes('week'));
const weekNumbers = computed(() => Array.from({ length: season.value.number_weeks || 0 }, (_, i) => i + 1));
const weekMapId = (playday) => (season.value.week_maps || []).find((w) => w.playday === playday)?.map_id ?? null;

const isDirty = computed(() => rules.value.join(',') !== savedRules.value || order.value.join('|') !== savedOrder.value);

// A game whose rule names its own map takes that map out of the veto
const vetoPool = computed(() => pool.value.length - (usesWeekMap.value ? 1 : 0));
const leftOver = computed(() => vetoPool.value - order.value.length);
const counts = computed(() => {
  const bans = order.value.filter((step) => step.startsWith('Ban')).length;
  return [
    { label: 'Steps', value: order.value.length },
    { label: 'Bans', value: bans },
    { label: 'Picks', value: order.value.length - bans },
    { label: 'Maps in the veto', value: vetoPool.value },
    { label: 'Left over', value: leftOver.value, negative: leftOver.value < 0 },
  ];
});

// Which outcome of the order fills each game: veto games take the picks in order, then the maps left over
const fills = computed(() => {
  const pickSides = order.value.filter((step) => step.startsWith('Pick')).map((step) => step.slice(-1));
  let nextPick = 0;
  let usedLeftOver = 0;
  return rules.value.map((rule, i) => {
    let source = RULES.find((r) => r.value === rule)?.label || rule;
    let short = false;
    if (rule === 'veto') {
      if (nextPick < pickSides.length) {
        source = `Pick ${pickSides[nextPick]}`;
        nextPick += 1;
      } else if (usedLeftOver < leftOver.value) {
        source = 'Left over';
        usedLeftOver += 1;
      } else {
        source = 'Nothing left';
        short = true;
      }
    } else if (rule === 'loser') {
      source = pickSides.length ? 'Declared pick' : 'Chosen at play time';
    } else if (rule === 'host') {
      source = 'Chosen at play time';
    }
    return { label: `Game ${i + 1}`, source, short };
  });
});

const refresh = async () => {
  await Promise.all([seasonStore.fetchSeason(seasonId.value), mapStore.fetchMaps()]);
};

// Run a write, then reread the season; the editors keep whatever is unsaved
const apply = async (action) => {
  errorMessage.value = null;
  isLoading.value = true;
  try {
    await action();
    await refresh();
  } catch (err) {
    console.error('Season maps action failed', err);
    errorMessage.value = err.message;
  } finally {
    isLoading.value = false;
  }
};

const addMap = (mapId) => apply(() => seasonStore.addMapsToSeason(seasonId.value, [mapId]));
const removeMap = (mapId) => apply(() => seasonStore.removeMapsFromSeason(seasonId.value, [mapId]));
const setWeekMap = (playday, mapId) => apply(() => seasonStore.setSeasonWeekMap(seasonId.value, playday, mapId));

const moveMap = (index, step) => {
  const ids = pool.value.map((m) => m.id);
  ids.splice(index + step, 0, ids.splice(index, 1)[0]);
  return apply(() => seasonStore.setSeasonMapOrder(seasonId.value, ids));
};

const saveSettings = () => apply(async () => {
  await seasonStore.updateSeason({ ...season.value, map_rules: rules.value.join(','), pick_ban: order.value.join('|') });
  savedRules.value = rules.value.join(',');
  savedOrder.value = order.value.join('|');
});

const closeNewMap = () => {
  newMapOpen.value = false;
  newMap.value = { name: '', shortname: '' };
  newMapFile.value = null;
};

const createNewMap = () => apply(async () => {
  const created = await mapStore.createMap(newMap.value);
  if (newMapFile.value) await mapStore.uploadMapImage(created.id, newMapFile.value);
  await seasonStore.addMapsToSeason(seasonId.value, [created.id]);
  closeNewMap();
});

const isSkipped = (row) => importSkipped.value.includes(row.w3c_name);
const statusLabel = (row) => (row.status === 'in_pool' ? 'In pool' : isSkipped(row) ? 'Skipped' : row.status === 'no_match' ? 'No match' : 'New');
const statusColor = (row) => (row.status === 'in_pool' || isSkipped(row) ? 'grey' : 'primary');
const importNames = computed(() => importRows.value.filter((r) => r.status !== 'in_pool' && !isSkipped(r)).map((r) => r.w3c_name));

const toggleSkip = (row) => {
  if (row.status === 'in_pool') return;
  const at = importSkipped.value.indexOf(row.w3c_name);
  if (at === -1) importSkipped.value.push(row.w3c_name);
  else importSkipped.value.splice(at, 1);
};

const openImport = async () => {
  importOpen.value = true;
  importLoading.value = true;
  importRows.value = [];
  importSkipped.value = [];
  try {
    importRows.value = await seasonStore.fetchLadderMapImport(seasonId.value);
  } catch (err) {
    console.error('Failed to read the ladder pool', err);
    errorMessage.value = err.message;
    importOpen.value = false;
  } finally {
    importLoading.value = false;
  }
};

const confirmImport = () => apply(async () => {
  await seasonStore.importLadderMaps(seasonId.value, importNames.value);
  importOpen.value = false;
});

onMounted(async () => {
  isLoading.value = true;
  try {
    await refresh();
    rules.value = (season.value.map_rules || DEFAULT_RULES).split(',');
    order.value = season.value.pick_ban ? season.value.pick_ban.split('|') : [];
    savedRules.value = season.value.map_rules || '';
    savedOrder.value = season.value.pick_ban || '';
  } catch (err) {
    console.error('Failed to load the season maps', err);
    errorMessage.value = 'Failed to load the season. Please try again later.';
  } finally {
    isLoading.value = false;
  }
});
</script>

<style scoped>
.map-thumb {
  display: block;
  background: #263238;
  border-radius: 3px;
  overflow: hidden;
  flex-shrink: 0;
}

.map-thumb img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  display: block;
}

.thumb-sm {
  width: 40px;
  height: 27px;
}

.thumb-lg {
  width: 100px;
  height: 64px;
}

.add-panel {
  background: rgba(var(--v-theme-primary), 0.04);
  border-bottom: 1px solid rgba(var(--v-border-color), var(--v-border-opacity));
}

.order-string {
  padding: 9px 11px;
  border-radius: 4px;
  background: rgba(var(--v-border-color), 0.06);
  font-family: ui-monospace, Menlo, Consolas, monospace;
  font-size: 0.75rem;
  line-height: 1.6;
  word-break: break-word;
}

.import-name {
  width: 170px;
  flex-shrink: 0;
}

.row-in-pool {
  opacity: 0.55;
}
</style>
