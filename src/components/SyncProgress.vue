<template>
  <div>
    <v-progress-linear
      v-if="syncProgress?.total"
      :model-value="(syncProgress.done / syncProgress.total) * 100"
      color="primary"
      height="20"
      rounded
    >
      <span class="text-caption">syncing {{ syncProgress.done }} of {{ syncProgress.total }} players</span>
    </v-progress-linear>
    <div v-else-if="caption" class="text-caption text-medium-emphasis">
      {{ caption }}
      <v-tooltip activator="parent" location="top">{{ stamp }}</v-tooltip>
    </div>
  </div>
</template>

<script setup>
import { storeToRefs } from 'pinia';
import { useLadderStore } from '@/stores';

defineProps({
  // what the page shows while no season sync runs, with its stamp in a tooltip
  caption: { type: String, default: '' },
  stamp: { type: String, default: '' },
});

const { syncProgress } = storeToRefs(useLadderStore());
</script>
