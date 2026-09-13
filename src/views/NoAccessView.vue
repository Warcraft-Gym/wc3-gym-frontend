<!-- The page a signed-in member or captain lands on when a route needs a higher role -->
<template>
  <v-container class="pa-4" style="max-width: 560px">
    <h1 class="mb-4">
      <v-icon class="mr-2">mdi-lock-outline</v-icon>
      You Need {{ captain ? 'Captain' : 'Admin' }} Access
    </h1>
    <p class="mb-6">
      <template v-if="captain">This page is for team captains and gym admins. A captain is named on the team's season page.</template>
      <template v-else>This page is for gym admins. If you should have access, ask an admin to grant it on the access page.</template>
    </p>
    <div class="d-flex flex-wrap ga-3">
      <v-btn color="primary" variant="elevated" to="/">Go home</v-btn>
      <v-btn variant="tonal" to="/profile">Your profile</v-btn>
    </div>
  </v-container>
</template>

<script setup>
import { computed } from 'vue';
import { useRoute } from 'vue-router';

const route = useRoute();
const captain = computed(() => route.query.role === 'captain');
</script>
