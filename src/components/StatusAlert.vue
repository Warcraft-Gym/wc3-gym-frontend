<template>
  <v-alert
    v-if="modelValue"
    :type="type"
    variant="tonal"
    border="start"
    :border-color="type === 'error' ? 'red' : 'green'"
    class="mb-4"
    closable
    @click:close="emit('update:modelValue', null)"
  >
    {{ modelValue }}
  </v-alert>
</template>

<script setup>
defineProps({
  modelValue: { type: String, default: null },
  type: { type: String, default: 'error' },
});

const emit = defineEmits(['update:modelValue']);
</script>
