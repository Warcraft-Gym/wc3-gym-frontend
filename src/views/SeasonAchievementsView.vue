<template>
  <v-overlay v-model="isLoading" persistent contained class="align-center justify-center">
    <v-progress-circular indeterminate size="64" width="8" color="primary"></v-progress-circular>
  </v-overlay>

  <v-container fluid class="pa-4">
    <!-- Page Header -->
    <v-row class="mb-2" align="center">
      <v-col>
        <h1>
          <v-icon class="mr-2">mdi-trophy-variant-outline</v-icon>
          Season achievements
        </h1>
        <div class="text-subtitle-1 text-grey">{{ season?.name }}</div>
      </v-col>
      <v-col cols="auto" class="d-flex align-center ga-2">
        <v-btn variant="text" prepend-icon="mdi-arrow-left" :to="`/seasons/${route.params.id}`">Back to season</v-btn>
        <v-btn color="primary" variant="elevated" prepend-icon="mdi-content-save" :disabled="!isDirty" @click="save">
          Save
        </v-btn>
      </v-col>
    </v-row>

    <StatusAlert v-model="errorMessage" />

    <v-row align="center" class="mb-1">
      <v-col cols="12" sm="4" md="3">
        <v-select
          v-model="importSource"
          :items="importItems"
          label="Import from"
          variant="outlined"
          density="compact"
          hide-details
          @update:modelValue="runImport"
        />
      </v-col>
      <v-col class="text-caption text-grey">Imported prices are the source season's. Edit them before you save.</v-col>
    </v-row>

    <v-row>
      <v-col v-for="card in CARDS" :key="card.key" cols="12" md="6">
        <v-card elevation="2">
          <v-card-title class="bg-primary d-flex align-center">
            <v-icon class="mr-2">{{ card.icon }}</v-icon>
            <span>{{ card.title }}</span>
            <v-spacer />
            <v-chip size="small" variant="outlined" class="mr-2">{{ rowsOf(card.team).length }} rules</v-chip>
            <v-btn size="small" variant="outlined" @click="addOpen[card.key] = !addOpen[card.key]">Add</v-btn>
          </v-card-title>

          <v-expand-transition>
            <div v-if="addOpen[card.key]" class="add-panel">
              <div class="d-flex align-center px-4 pt-2 text-caption text-grey">
                <span>Rules not in this season</span>
                <v-spacer />
                <span>{{ notAdded(card.team).length }} available</span>
              </div>
              <v-list density="compact" bg-color="transparent" max-height="220" class="overflow-y-auto">
                <v-list-item v-for="rule in notAdded(card.team)" :key="rule.rule_id" @click="addRule(rule)">
                  <template #prepend>
                    <AchievementIcon :id="rule.rule_id" :size="22" class="mr-3" />
                  </template>
                  <v-list-item-title class="text-body-2">{{ rule.name }}</v-list-item-title>
                  <template #append>
                    <v-chip size="x-small" label>{{ rule.points }}</v-chip>
                  </template>
                </v-list-item>
                <v-list-item v-if="!notAdded(card.team).length" class="text-caption text-grey">Every rule is already in this season</v-list-item>
              </v-list>
            </div>
          </v-expand-transition>

          <v-list max-height="560" class="overflow-y-auto">
            <v-list-item v-for="row in rowsOf(card.team)" :key="row.rule_id" class="py-2">
              <template #prepend>
                <AchievementIcon :id="row.rule_id" :size="28" class="mr-4" />
              </template>
              <v-list-item-title class="font-weight-medium">{{ row.name }}</v-list-item-title>
              <v-list-item-subtitle class="text-wrap">{{ fill(row.description, row.params) }}</v-list-item-subtitle>
              <template #append>
                <v-text-field
                  v-model.number="row.points"
                  type="number"
                  min="0"
                  label="Points"
                  variant="outlined"
                  density="compact"
                  hide-details
                  class="num-field ml-2"
                />
                <v-text-field
                  v-for="key in Object.keys(row.params)"
                  :key="key"
                  v-model.number="row.params[key]"
                  type="number"
                  min="1"
                  :label="key"
                  variant="outlined"
                  density="compact"
                  hide-details
                  class="num-field ml-2"
                />
                <v-btn icon="mdi-close" variant="text" size="small" color="error" @click="removeRow(row)" />
              </template>
            </v-list-item>
            <v-list-item v-if="!rowsOf(card.team).length" class="text-grey">No rules yet. Add one or import a season.</v-list-item>
          </v-list>
        </v-card>
      </v-col>
    </v-row>
  </v-container>
</template>

<script setup>
import { computed, onMounted, ref } from 'vue';
import { storeToRefs } from 'pinia';
import { useRoute } from 'vue-router';

import { useSeasonStore } from '@/stores';
import StatusAlert from '@/components/StatusAlert.vue';
import AchievementIcon from '@/components/AchievementIcon.vue';

const CARDS = [
  { key: 'player', title: 'Player achievements', icon: 'mdi-account-outline', team: false },
  { key: 'team', title: 'Team achievements', icon: 'mdi-account-group-outline', team: true },
];

// Put each rule's current numbers into its description template
const fill = (template, params) => (template || '').replace(/\{(\w+)\}/g, (whole, key) => params?.[key] ?? whole);

const route = useRoute();
const seasonStore = useSeasonStore();
const { seasons } = storeToRefs(seasonStore);

const seasonId = computed(() => seasonStore.seasonIdOf(route.params.id));
const season = computed(() => seasons.value.find((s) => s.id === seasonId.value));
const isLoading = ref(false);
const errorMessage = ref(null);
const addOpen = ref({});
const importSource = ref(null);

const catalogue = ref([]);
const rows = ref([]);  // the working list, saved as a whole
const baseline = ref('');

// What the PUT sends, and what dirty compares
const payload = (list) => list.map((row) => ({ rule_id: row.rule_id, points: Number(row.points) || 0, params: row.params }));
const toRow = (rule) => ({ ...rule, params: { ...(rule.params || {}) } });
const isDirty = computed(() => JSON.stringify(payload(rows.value)) !== baseline.value);

const rowsOf = (team) => rows.value.filter((row) => !!row.team === team);
const notAdded = (team) => catalogue.value.filter((rule) => !!rule.team === team && !rows.value.some((row) => row.rule_id === rule.rule_id));

const importItems = computed(() => [
  { title: 'Catalogue defaults', value: 'catalogue' },
  ...seasons.value
    .filter((s) => s.id !== seasonId.value)
    .sort((a, b) => b.id - a.id)
    .map((s) => ({ title: s.name, value: s.id })),
]);

const run = async (action) => {
  errorMessage.value = null;
  isLoading.value = true;
  try {
    await action();
  } catch (err) {
    console.error('Season achievements action failed', err);
    errorMessage.value = err.error?.message || err.message;
  } finally {
    isLoading.value = false;
  }
};

const addRule = (rule) => rows.value.push(toRow(rule));
const removeRow = (row) => rows.value.splice(rows.value.indexOf(row), 1);

// The select is an action, not a setting: it reads a source and drops back to empty
const runImport = (source) => {
  importSource.value = null;
  if (!source) return;
  if (isDirty.value && !window.confirm('Replace the unsaved list?')) return;
  return run(async () => {
    const list = source === 'catalogue' ? catalogue.value : await seasonStore.fetchSeasonAchievements(source);
    rows.value = list.map(toRow);
  });
};

const save = () => run(async () => {
  rows.value = (await seasonStore.saveSeasonAchievements(seasonId.value, payload(rows.value))).map(toRow);
  baseline.value = JSON.stringify(payload(rows.value));
});

onMounted(() => run(async () => {
  await seasonStore.ensureSeasons();
  const [rules, current] = await Promise.all([
    seasonStore.fetchAchievementCatalogue(),
    seasonStore.fetchSeasonAchievements(seasonId.value),
  ]);
  catalogue.value = rules;
  rows.value = current.map(toRow);
  baseline.value = JSON.stringify(payload(rows.value));
}));
</script>

<style scoped>
.add-panel {
  background: rgba(var(--v-theme-primary), 0.04);
  border-bottom: 1px solid rgba(var(--v-border-color), var(--v-border-opacity));
}

.num-field {
  width: 104px;
  flex: none;
}

/* The description wraps beside the number fields instead of ending in an ellipsis */
:deep(.v-list-item-subtitle) {
  display: block;
  -webkit-line-clamp: unset;
  white-space: normal;
}
</style>
