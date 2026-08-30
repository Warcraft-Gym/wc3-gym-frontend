<template>
  <div v-if="visible.length" class="d-flex justify-end">
    <v-btn
      v-for="action in visible"
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
import { computed } from 'vue';

import { useAuthStore } from '@/stores';

const auth = useAuthStore();  // an action writes unless marked public, so only an admin sees it
// action: { icon, label, onClick, color?, disabled?, loading?, public? }
const props = defineProps({ actions: { type: Array, required: true } });
const visible = computed(() => props.actions.filter((a) => auth.isAdmin || a.public));
</script>
