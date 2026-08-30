<template>
  <div v-if="auth.isAdmin" class="d-flex justify-end">
    <v-btn
      v-for="action in actions"
      :key="action.label"
      icon
      variant="text"
      size="small"
      :color="action.color"
      :disabled="action.disabled"
      :loading="action.loading"
      @click.stop="action.onClick()"
    >
      <v-icon>{{ action.icon }}</v-icon>
      <v-tooltip activator="parent" location="top">{{ action.label }}</v-tooltip>
    </v-btn>
  </div>
</template>

<script setup>
import { useAuthStore } from '@/stores';

const auth = useAuthStore();  // every row action writes, so only an admin sees them
// action: { icon, label, onClick, color?, disabled?, loading? }
defineProps({ actions: { type: Array, required: true } });
</script>
