<!-- A day, typed and shown in the viewer's own locale by the native date input.
     The model stays a Date at local midnight, as every caller reads it. -->
<template>
  <v-text-field
    type="date"
    :model-value="day"
    @update:model-value="pick"
    :label="label"
    :min="minDay"
    :max="maxDay"
    :rules="dateRules"
    :disabled="disabled"
    :style="{ colorScheme: theme.current.value.dark ? 'dark' : 'light' }"
    persistent-placeholder
  />
</template>

<script setup>
import { computed, ref, watch } from 'vue';
import { useTheme } from 'vuetify';
import { MIN_YEAR, maxYear, checkDate, dayDate, dayIso } from '@/helpers/date-input.mjs';

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

// the native calendar button is drawn by the browser: it follows the app's theme, not the OS
const theme = useTheme();

// What the field holds, "yyyy-mm-dd"
const day = ref('');

watch(() => props.modelValue, (value) => {
  day.value = value ? dayIso(value instanceof Date ? value : new Date(value)) : '';
}, { immediate: true });

// The calendar itself refuses a year the season can never be in
const minDay = `${MIN_YEAR}-01-01`;
const maxDay = computed(() => `${maxYear()}-12-31`);
const dateRules = [(value) => (value ? checkDate(value) : true)];

// A day the field cannot read clears the model, so no caller keeps the last good one
const pick = (value) => {
  day.value = value;
  emit('update:modelValue', dayDate(value));
};
</script>
