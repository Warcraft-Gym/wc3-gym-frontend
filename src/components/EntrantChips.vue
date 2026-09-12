<!-- What is worth knowing about an entrant beside his name: the eligibility warnings
     the signup recorded, and whether he has checked in. A warning never blocks him. -->
<template>
  <span>
    <v-chip v-for="warning in entrant.warnings || []" :key="warning" size="x-small" color="warning" variant="tonal" class="mr-1">
      {{ WARNING_LABEL[warning] || warning }}
    </v-chip>
    <v-chip v-if="entrant.checked_in_at" size="x-small" color="success" variant="tonal">Checked in</v-chip>
  </span>
</template>

<script setup>
const WARNING_LABEL = { under_min_games: 'Too few games', over_mmr_max: 'MMR too high' };

defineProps({ entrant: { type: Object, required: true } });
</script>
