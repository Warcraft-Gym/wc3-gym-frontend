<template>
  <v-dialog v-model="show" max-width="800px">
    <v-card v-if="stat">
      <v-card-title class="text-h5">Career stats: {{ stat.player_name }}</v-card-title>
      <v-card-text>
        <v-alert v-if="error" type="error" variant="tonal" class="mb-4" closable @click:close="error = null">
          {{ error }}
        </v-alert>
        <v-row>
          <v-col cols="12" md="6">
            <v-text-field :model-value="stat.player_name" label="Name in the history" variant="outlined" disabled />
          </v-col>
          <v-col cols="12" md="6">
            <v-autocomplete
              v-model="stat.user_id"
              :items="players"
              item-title="name"
              item-value="id"
              label="Linked player"
              variant="outlined"
              clearable
              hint="The player this history belongs to"
              persistent-hint
            >
              <template #item="{ props, item }">
                <v-list-item v-bind="props" :subtitle="item.raw.battleTag" />
              </template>
            </v-autocomplete>
          </v-col>
        </v-row>

        <div class="text-subtitle-1 mt-4 mb-2">Historical baseline</div>
        <v-row dense>
          <v-col v-for="[key, label] in BASELINE" :key="key" cols="6" md="4">
            <v-text-field v-model.number="stat[`historical_${key}`]" :label="label" type="number" variant="outlined" density="comfortable" />
          </v-col>
        </v-row>

        <div class="text-subtitle-1 mt-2 mb-1">Totals with the app's results</div>
        <p class="text-body-2 text-medium-emphasis">
          Rating {{ stat.rating }}. Series {{ stat.series_won }}-{{ stat.series_lost }} ({{ stat.series_winrate }}%).
          Games {{ stat.games_won }}-{{ stat.games_lost }} ({{ stat.games_winrate }}%). {{ stat.seasons_played }} seasons.
        </p>
      </v-card-text>
      <v-card-actions>
        <v-btn color="error" variant="text" prepend-icon="mdi-delete" @click="confirmDelete = true">Delete</v-btn>
        <v-spacer />
        <v-btn variant="text" @click="show = false">Cancel</v-btn>
        <v-btn color="primary" variant="flat" :loading="saving" @click="save">Save</v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>

  <ConfirmDeleteDialog
    v-model="confirmDelete"
    :message="`Delete the career stats of ${stat?.player_name}? This cannot be undone.`"
    delete-icon="mdi-delete"
    @confirm="remove"
    @cancel="confirmDelete = false"
  />
</template>

<script setup>
import { ref } from 'vue';
import { usePlayerCareerStatsStore } from '@/stores/player_career_stats.store';
import ConfirmDeleteDialog from '@/components/ConfirmDeleteDialog.vue';

defineProps({
  players: { type: Array, default: () => [] }, // the "Linked player" choices
});
const emit = defineEmits(['changed']);

const BASELINE = [
  ['rating', 'Rating'],
  ['seasons_played', 'Seasons'],
  ['series_won', 'Series won'],
  ['series_lost', 'Series lost'],
  ['games_won', 'Games won'],
  ['games_lost', 'Games lost'],
];

const store = usePlayerCareerStatsStore();
const show = ref(false);
const stat = ref(null);
const error = ref(null);
const saving = ref(false);
const confirmDelete = ref(false);

const open = (career) => {
  stat.value = {
    ...career,
    user_id: career.user?.id ?? career.user_id ?? null,
    ...Object.fromEntries(BASELINE.map(([key]) => [`historical_${key}`, career[`historical_${key}`] ?? 0])),
  };
  error.value = null;
  show.value = true;
};

const save = async () => {
  saving.value = true;
  error.value = null;
  try {
    await store.update(stat.value.id, stat.value);
    show.value = false;
    emit('changed');
  } catch (e) {
    error.value = e.message || 'Failed to save the career stats';
  } finally {
    saving.value = false;
  }
};

const remove = async () => {
  confirmDelete.value = false;
  try {
    await store.delete(stat.value.id);
    show.value = false;
    emit('changed');
  } catch (e) {
    error.value = e.message || 'Failed to delete the career stats';
  }
};

defineExpose({ open });
</script>
