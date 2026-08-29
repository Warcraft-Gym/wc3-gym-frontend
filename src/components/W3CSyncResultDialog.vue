<template>
  <v-dialog :model-value="modelValue" @update:model-value="emit('update:modelValue', $event)" max-width="560">
    <v-card>
      <v-card-title class="bg-primary">
        <v-icon class="mr-2">mdi-sync</v-icon>
        W3C Sync Results
      </v-card-title>
      <v-card-text class="pt-4">
        <div v-for="(entry, i) in entries" :key="i" class="mb-3">
          <strong>{{ entry.title }}</strong>
          <div v-if="entry.error" class="text-error">{{ entry.error.message }}</div>
          <div v-else-if="entry.result">
            <div>{{ syncLine(entry.result) }}</div>
            <div v-for="f in entry.result.failed ?? []" :key="f.id" class="text-caption text-error">
              {{ f.name }} ({{ f.battleTag || 'no BattleTag' }}): {{ f.reason }}
            </div>
          </div>
          <div v-else class="text-medium-emphasis">Sync ongoing</div>
        </div>
      </v-card-text>
      <v-card-actions>
        <v-spacer></v-spacer>
        <v-btn color="primary" @click="emit('update:modelValue', false)">OK</v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>

<script setup>
defineProps({
  modelValue: { type: Boolean, default: false },
  // one entry per team or season: { title, result } or { title, error }
  entries: { type: Array, default: () => [] },
});

// The total counts every player the run touched, so a failure does not look like a missing sync
const syncLine = (result) => {
  const synced = result.synced?.length ?? 0;
  const skipped = result.skipped?.length ?? 0;
  const failed = result.failed?.length ?? 0;
  const total = result.total ?? synced + skipped + failed;
  return `${synced} of ${total} synced \u00b7 ${skipped} skipped \u00b7 ${failed} failed`;
};

const emit = defineEmits(['update:modelValue']);
</script>
