<template>
  <div class="simple-date-picker">
    <v-text-field
      :model-value="displayDate"
      @update:model-value="updateDate"
      :label="label"
      placeholder="MM/DD/YYYY"
      :rules="dateRules"
      :error-messages="errorMessage"
      @blur="validateAndFormat"
      hint="Date format: MM/DD/YYYY"
      persistent-hint
      :disabled="disabled"
    >
      <template v-slot:append-inner>
        <v-btn
          icon
          variant="text"
          size="small"
          @click="showCalendar = true"
          :disabled="disabled"
        >
          <v-icon>mdi-calendar</v-icon>
        </v-btn>
      </template>
    </v-text-field>

    <!-- Calendar Popup -->
    <v-dialog v-model="showCalendar" max-width="400px">
      <v-card>
        <v-card-title class="text-center">
          Select Date
        </v-card-title>
        <v-card-text>
          <v-date-picker
            v-model="selectedDate"
            @update:model-value="selectDateFromCalendar"
            full-width
            show-adjacent-months
          />
        </v-card-text>
        <v-card-actions>
          <v-spacer />
          <v-btn @click="showCalendar = false" color="primary">
            Close
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>
  </div>
</template>

<script setup>
import { ref, computed, watch } from 'vue';

const props = defineProps({
  modelValue: {
    type: [String, Date],
    default: null
  },
  label: {
    type: String,
    default: 'Date'
  },
  disabled: {
    type: Boolean,
    default: false
  }
});

const emit = defineEmits(['update:modelValue']);

// Internal state
const internalDate = ref('');
const errorMessage = ref('');
const showCalendar = ref(false);
const selectedDate = ref(null);

// Display the date value
const displayDate = computed({
  get: () => internalDate.value,
  set: (value) => {
    internalDate.value = value;
  }
});

// Date validation rules
const dateRules = [
  (value) => {
    if (!value) return true; // Allow empty
    const datePattern = /^(0[1-9]|1[0-2])\/(0[1-9]|[12]\d|3[01])\/\d{4}$/;
    if (!datePattern.test(value)) {
      return 'Invalid date format. Use MM/DD/YYYY';
    }
    
    // Check if it's a valid date
    const [month, day, year] = value.split('/').map(Number);
    const date = new Date(year, month - 1, day);
    if (date.getFullYear() !== year || date.getMonth() !== month - 1 || date.getDate() !== day) {
      return 'Invalid date. Please enter a valid date.';
    }
    
    return true;
  }
];

// Format date string to MM/DD/YYYY
const formatDate = (dateStr) => {
  if (!dateStr) return '';
  
  // Remove any non-digit characters except slash
  let cleaned = dateStr.replace(/[^\d/]/g, '');
  
  // Handle various input formats
  if (cleaned.length === 8 && !cleaned.includes('/')) {
    // MMDDYYYY format -> MM/DD/YYYY
    cleaned = cleaned.slice(0, 2) + '/' + cleaned.slice(2, 4) + '/' + cleaned.slice(4);
  } else if (cleaned.length === 6 && !cleaned.includes('/')) {
    // MDDYY format -> M/DD/YY (assume 20YY for years)
    cleaned = cleaned.slice(0, 1) + '/' + cleaned.slice(1, 3) + '/20' + cleaned.slice(3);
  }
  
  return cleaned;
};

// Validate and format the date input
const validateAndFormat = () => {
  if (!internalDate.value) {
    errorMessage.value = '';
    selectedDate.value = null;
    return;
  }
  
  const formatted = formatDate(internalDate.value);
  const datePattern = /^(0[1-9]|1[0-2])\/(0[1-9]|[12]\d|3[01])\/\d{4}$/;
  
  if (datePattern.test(formatted)) {
    const [month, day, year] = formatted.split('/').map(Number);
    const date = new Date(year, month - 1, day);
    
    if (date.getFullYear() === year && date.getMonth() === month - 1 && date.getDate() === day) {
      // Ensure two-digit formatting for month and day
      const formattedDate = `${month.toString().padStart(2, '0')}/${day.toString().padStart(2, '0')}/${year}`;
      internalDate.value = formattedDate;
      selectedDate.value = date;
      errorMessage.value = '';
      emit('update:modelValue', date);
    } else {
      errorMessage.value = 'Invalid date. Please enter a valid date.';
      selectedDate.value = null;
    }
  } else {
    errorMessage.value = 'Invalid date format. Use MM/DD/YYYY';
    selectedDate.value = null;
  }
};

// Update date when input changes
const updateDate = (value) => {
  internalDate.value = value;
  errorMessage.value = ''; // Clear error on input change
};

// Handle calendar date selection
const selectDateFromCalendar = (date) => {
  if (date) {
    selectedDate.value = date;
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const day = date.getDate().toString().padStart(2, '0');
    const year = date.getFullYear();
    internalDate.value = `${month}/${day}/${year}`;
    emit('update:modelValue', date);
    showCalendar.value = false;
  }
};

// Watch for external model value changes
watch(() => props.modelValue, (newValue) => {
  if (newValue) {
    const date = newValue instanceof Date ? newValue : new Date(newValue);
    if (!isNaN(date.getTime())) {
      const month = (date.getMonth() + 1).toString().padStart(2, '0');
      const day = date.getDate().toString().padStart(2, '0');
      const year = date.getFullYear();
      internalDate.value = `${month}/${day}/${year}`;
      selectedDate.value = date;
    } else {
      internalDate.value = '';
      selectedDate.value = null;
    }
  } else {
    internalDate.value = '';
    selectedDate.value = null;
  }
}, { immediate: true });

// Watch internal date changes and emit
watch(internalDate, (newValue) => {
  if (!newValue) {
    emit('update:modelValue', null);
  }
});
</script>

<style scoped>
.simple-date-picker {
  display: flex;
  flex-direction: column;
}

/* Make the input field slightly more compact */
:deep(.v-field__input) {
  font-family: 'Roboto Mono', monospace;
  font-size: 16px;
  letter-spacing: 1px;
}

:deep(.v-btn--icon) {
  width: 32px;
  height: 32px;
}
</style>