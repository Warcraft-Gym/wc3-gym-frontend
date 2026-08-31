<template>
  <v-dialog :model-value="modelValue" @update:model-value="emit('update:modelValue', $event)" max-width="400">
    <v-card>
      <v-card-title class="bg-error">
        <v-icon class="mr-2">mdi-alert</v-icon>
        Confirm Deletion
      </v-card-title>
      <v-card-text class="pt-4">{{ message }}</v-card-text>
      <v-card-actions>
        <v-spacer></v-spacer>
        <v-btn variant="text" @click="emit('cancel')">Cancel</v-btn>
        <v-btn v-if="canDelete" color="error" :prepend-icon="deleteIcon" @click="emit('confirm')">Delete</v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>

<script setup>
defineProps({
  modelValue: { type: Boolean, default: false },
  message: { type: String, required: true },
  deleteIcon: { type: String, default: undefined },
  canDelete: { type: Boolean, default: true },
});

const emit = defineEmits(['update:modelValue', 'confirm', 'cancel']);
</script>
