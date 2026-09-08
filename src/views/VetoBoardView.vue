<template>
  <v-container fluid class="pa-4">
    <VetoBoard :series-id="route.params.id">
      <h1 class="d-flex align-center ga-2">
        <v-icon>mdi-map-outline</v-icon>
        Map Veto
      </h1>
    </VetoBoard>
  </v-container>
</template>

<script setup>
import { useRoute } from 'vue-router';
import VetoBoard from '@/components/VetoBoard.vue';

const route = useRoute();
</script>
