<template>
  <v-dialog :model-value="modelValue" max-width="760" @update:modelValue="$emit('update:modelValue', $event)">
    <v-card>
      <v-card-title class="bg-primary d-flex align-center">
        <v-icon class="mr-2">mdi-download</v-icon>
        <span>Import W3C map pool</span>
        <v-spacer />
        <v-chip size="small" variant="outlined">{{ poolRows.length }} maps in the W3C 1v1 pool</v-chip>
      </v-card-title>
      <v-card-text class="pa-0">
        <v-progress-linear v-if="loading" indeterminate color="primary" />
        <v-list max-height="500" class="overflow-y-auto">
          <template v-for="row in rows" :key="row.w3c_name">
          <v-list-subheader v-if="row === offLadderRows[0]">Not in the W3C pool, picture found</v-list-subheader>
          <v-list-item
            :class="{ 'row-skipped': isSkipped(row) }"
            @click="toggleSkip(row)"
          >
            <template #prepend>
              <span class="import-name text-body-2 font-weight-medium mr-3">{{ row.w3c_name }}</span>
              <span class="map-thumb mr-3"><img v-if="row.image_url" :src="row.image_url" :alt="row.matched_name" @error="hideMissingImage"></span>
            </template>
            <v-list-item-title class="text-body-2">{{ row.matched_name || '—' }}</v-list-item-title>
            <template #append>
              <v-chip v-if="row.shortname" size="x-small" label class="mr-3">{{ row.shortname }}</v-chip>
              <v-chip size="x-small" :color="isSkipped(row) ? 'grey' : 'primary'" variant="tonal">{{ statusLabel(row) }}</v-chip>
            </template>
          </v-list-item>
          </template>
        </v-list>
      </v-card-text>
      <v-card-actions>
        <v-spacer />
        <v-btn @click="$emit('update:modelValue', false)">Cancel</v-btn>
        <v-btn color="primary" variant="elevated" prepend-icon="mdi-plus" :disabled="!names.length" @click="$emit('confirm', names)">
          Import {{ names.length }} maps
        </v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>

<script setup>
import { computed, ref, watch } from 'vue';

import { hideMissingImage } from '@/helpers/team-image';

const props = defineProps({
  modelValue: { type: Boolean, default: false },
  rows: { type: Array, default: () => [] },
  loading: { type: Boolean, default: false },
});
defineEmits(['update:modelValue', 'confirm']);

const STATUS = { in_pool: 'In pool', known: 'Known', no_match: 'No match', new: 'New', off_ladder: 'Not in pool' };

// a known map is imported too: that is what renames a drifted map to the ladder name and fills a
// picture it never had. Click a row to leave it out.
const offLadderRows = computed(() => props.rows.filter((row) => row.status === 'off_ladder'));
const poolRows = computed(() => props.rows.filter((row) => row.status !== 'off_ladder'));
const skipped = ref([]);
watch(() => props.rows, () => { skipped.value = []; });
const isSkipped = (row) => skipped.value.includes(row.w3c_name);
const statusLabel = (row) => (isSkipped(row) ? 'Skipped' : STATUS[row.status] || row.status);
const names = computed(() => props.rows.filter((row) => !isSkipped(row)).map((row) => row.w3c_name));
const toggleSkip = (row) => {
  const at = skipped.value.indexOf(row.w3c_name);
  if (at === -1) skipped.value.push(row.w3c_name);
  else skipped.value.splice(at, 1);
};
</script>

<style scoped>
.map-thumb {
  display: block;
  width: 40px;
  height: 27px;
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

.import-name {
  width: 170px;
  flex-shrink: 0;
}

.row-skipped {
  opacity: 0.55;
}
</style>
