<template>
  <div v-if="visible.length" class="d-flex justify-end" @click.stop>
    <v-menu v-if="!inline && visible.length >= 3">
      <template #activator="{ props: menu }">
        <v-btn v-bind="menu" icon variant="text" size="small">
          <v-icon>mdi-dots-vertical</v-icon>
        </v-btn>
      </template>
      <v-list density="compact">
        <v-list-item
          v-for="action in visible"
          :key="action.label"
          :disabled="action.disabled"
          :href="action.href"
          @click="action.onClick?.()"
        >
          <template #prepend>
            <v-icon :color="action.color">{{ action.icon }}</v-icon>
          </template>
          <v-list-item-title>{{ action.label }}</v-list-item-title>
        </v-list-item>
      </v-list>
    </v-menu>
    <template v-else>
      <v-btn
        v-for="action in visible"
        :key="action.label"
        icon
        variant="text"
        size="small"
        :color="action.color"
        :disabled="action.disabled"
        :loading="action.loading"
        :href="action.href"
        @click="action.onClick?.()"
      >
        <v-icon>{{ action.icon }}</v-icon>
        <v-tooltip activator="parent" location="top" open-on-click>{{ action.label }}</v-tooltip>
      </v-btn>
    </template>
  </div>
</template>

<script setup>
import { computed } from 'vue';

import { useAuthStore } from '@/stores';

const auth = useAuthStore();  // an action writes unless marked public, so only an admin sees it
// action: { icon, label, onClick | href, color?, disabled?, loading?, public? }
const props = defineProps({
  actions: { type: Array, required: true },
  // inline renders the icon buttons whatever the count, instead of folding three or more into a menu
  inline: { type: Boolean, default: false }
});
const visible = computed(() => props.actions.filter((a) => auth.isAdmin || a.public));
</script>
