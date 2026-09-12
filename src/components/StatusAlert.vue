<template>
  <v-alert
    v-if="modelValue"
    :type="type"
    variant="tonal"
    border="start"
    :border-color="type === 'error' ? 'error' : 'success'"
    class="mb-4"
    :closable="!retry"
    @click:close="emit('update:modelValue', null)"
  >
    {{ modelValue }}
    <!-- A page that can read itself again offers the action its message names -->
    <div v-if="retry" class="mt-2">
      <v-btn variant="outlined" size="small" @click="retry">Try again</v-btn>
    </div>
  </v-alert>
</template>

<script setup>
defineProps({
  modelValue: { type: String, default: null },
  type: { type: String, default: 'error' },
  retry: { type: Function, default: null },
});

const emit = defineEmits(['update:modelValue']);
</script>
