<!-- The "W3C MMR" column label: the W3Champions W3C mark ahead of the word MMR.
     Source of the mark in src/assets/media/README.md. -->
<template>
  <span class="d-inline-flex align-baseline text-no-wrap">
    <img :src="w3cLogo" alt="W3C" class="w3c-mmr-logo mr-1">
    <span>MMR{{ suffix }}</span>
    <v-icon v-if="sortIcon" size="x-small" class="ml-1">{{ sortIcon }}</v-icon>
  </span>
</template>

<script setup>
import w3cLogo from '@/assets/media/w3c-logo.png';

defineProps({
  suffix: { type: String, default: '' },
  sortIcon: { type: String, default: null },
});
</script>

<style scoped>
.w3c-mmr-logo {
  height: 1.4em;
  object-fit: contain;
  vertical-align: baseline;
  flex-shrink: 0;
}
</style>
