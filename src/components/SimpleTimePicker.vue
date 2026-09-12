<template>
  <div class="simple-time-picker">
    <v-text-field
      :model-value="displayTime"
      @update:model-value="updateTime"
      :label="label"
      placeholder="HH:MM"
      :rules="timeRules"
      :error-messages="errorMessage"
      @blur="validateAndFormat"
    >
      <template v-slot:append-inner>
        <v-icon>mdi-clock-outline</v-icon>
      </template>
    </v-text-field>
  </div>
</template>

<script setup>
import { ref, computed, watch } from 'vue';

const props = defineProps({
  modelValue: {
    type: String,
    default: ''
  },
  label: {
    type: String,
    default: 'Time'
  },
  disabled: {
    type: Boolean,
    default: false
  }
});

const emit = defineEmits(['update:modelValue']);

// Internal time state
const internalTime = ref('');
const errorMessage = ref('');

// Display the time value
const displayTime = computed({
  get: () => internalTime.value,
  set: (value) => {
    internalTime.value = value;
  }
});

// Time validation rules
const timeRules = [
  (value) => {
    if (!value) return true; // Allow empty
    const timePattern = /^([01]?[0-9]|2[0-3]):([0-5][0-9])$/;
    return timePattern.test(value) || 'Invalid time format. Use HH:MM (24-hour format)';
  }
];

// Watch internal time changes and emit
watch(internalTime, (newValue) => {
  // Only emit if it's a valid time format or empty
  if (!newValue || /^([01]?[0-9]|2[0-3]):([0-5][0-9])$/.test(newValue)) {
    emit('update:modelValue', newValue);
  }
});

// Format time string to HH:MM
const formatTime = (timeStr) => {
  if (!timeStr) return '';
  
  // Remove any non-digit characters except colon
  let cleaned = timeStr.replace(/[^\d:]/g, '');
  
  // Handle various input formats
  if (cleaned.length === 4 && !cleaned.includes(':')) {
    // HHMM format -> HH:MM
    cleaned = cleaned.slice(0, 2) + ':' + cleaned.slice(2);
  } else if (cleaned.length === 3 && !cleaned.includes(':')) {
    // HMM format -> H:MM
    cleaned = cleaned.slice(0, 1) + ':' + cleaned.slice(1);
  } else if (cleaned.length === 2 && !cleaned.includes(':')) {
    // HH format -> HH:00
    cleaned = cleaned + ':00';
  } else if (cleaned.length === 1) {
    // H format -> H:00
    cleaned = cleaned + ':00';
  }
  
  return cleaned;
};

// Validate and format the time input
const validateAndFormat = () => {
  if (!internalTime.value) {
    errorMessage.value = '';
    return;
  }
  
  const formatted = formatTime(internalTime.value);
  const timePattern = /^([01]?[0-9]|2[0-3]):([0-5][0-9])$/;
  
  if (timePattern.test(formatted)) {
    // Ensure two-digit formatting
    const [hours, minutes] = formatted.split(':');
    const formattedTime = `${hours.padStart(2, '0')}:${minutes.padStart(2, '0')}`;
    internalTime.value = formattedTime;
    errorMessage.value = '';
    emit('update:modelValue', formattedTime);
  } else {
    errorMessage.value = 'Invalid time format. Use HH:MM (24-hour format)';
  }
};

// Update time when input changes
const updateTime = (value) => {
  internalTime.value = value;
  errorMessage.value = ''; // Clear error on input change
};

// Watch for external model value changes
watch(() => props.modelValue, (newValue) => {
  internalTime.value = newValue || '';
}, { immediate: true });
</script>

<style scoped>
.simple-time-picker {
  display: flex;
  flex-direction: column;
}

/* Make the input field slightly more compact */
:deep(.v-field__input) {
  font-family: 'Roboto Mono', monospace;
  font-size: 16px;
  letter-spacing: 1px;
}
</style>