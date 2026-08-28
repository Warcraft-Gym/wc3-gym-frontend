<!-- The w3champions crown, their own artwork, marking what comes from w3champions
     rather than from the GNL series. Source in src/assets/media/README.md. -->
<template>
  <img :src="w3cLogo" :width="size" :height="size" alt="W3Champions" class="w3c-icon">
</template>

<script setup>
import w3cLogo from '@/assets/media/w3champions.png';

defineProps({
  size: { type: [Number, String], default: 24 },
});
</script>

<style scoped>
.w3c-icon {
  object-fit: contain;
  vertical-align: middle;
  flex-shrink: 0;
}
</style>
