<!-- A member entering one event: the race he plays it on, a note on a signup-only event, a
     battle tag when the event takes anyone and the caller has no linked account, and the
     eligibility warnings the API answered. On an event that takes one entry per race a
     member already in enters another race, and the races he holds are not offered again.
     A warning never blocks: the entrant is in, and the chips say what an admin will look at. -->
<template>
  <v-dialog v-model="show" max-width="520">
    <v-card>
      <v-card-title class="bg-primary">
        <v-icon class="mr-2" icon="mdi-account-plus" />
        {{ another ? 'Enter another race' : `Sign up for ${eventLabel(event)}` }}
      </v-card-title>

      <StatusAlert v-model="error" class="mx-4 mt-3" />

      <v-card-text class="pt-4">
        <template v-if="!entrant">
          <div v-if="another" class="d-flex align-center flex-wrap ga-2 mb-3">
            <span class="text-medium-emphasis">You are in on</span>
            <span v-for="held in taken" :key="held" class="d-inline-flex align-center ga-1">
              <RaceIcon :raceIdentifier="held" />{{ raceName(held) }}
            </span>
          </div>
          <RaceSelect v-model="race" :exclude="taken" variant="outlined" density="comfortable" label="Race" />
          <v-text-field v-if="takesNote" v-model="note" variant="outlined" density="comfortable"
            label="Note" counter="200" maxlength="200" hint="What you want to work on"
            persistent-hint class="mb-2" />
          <v-text-field v-if="needsTag" v-model="battleTag" variant="outlined" density="comfortable"
            label="Battle tag" hint="Your w3champions name, as Name#1234" persistent-hint />
        </template>

        <template v-else>
          <p class="mb-2">You are in. See you on the ladder.</p>
          <div v-if="warnings.length" class="d-flex flex-wrap ga-2">
            <v-chip v-for="code in warnings" :key="code" size="small" color="warning" variant="tonal"
              prepend-icon="mdi-alert-outline">
              {{ warningLabel(code, event) }}
            </v-chip>
          </div>
          <p v-if="warnings.length" class="text-caption text-medium-emphasis mt-2 mb-0">
            An admin reads these before the draw. Your signup stands.
          </p>
        </template>
      </v-card-text>

      <v-card-actions>
        <v-spacer />
        <v-btn v-if="!entrant" @click="show = false">Cancel</v-btn>
        <v-btn color="primary" variant="elevated" :loading="saving" :disabled="!entrant && !ready"
          @click="entrant ? (show = false) : submit()">
          {{ entrant ? 'Done' : (another ? 'Enter' : 'Sign up') }}
        </v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>

<script setup>
import { computed, ref } from 'vue';

import RaceIcon from '@/components/RaceIcon.vue';
import RaceSelect from '@/components/RaceSelect.vue';
import StatusAlert from '@/components/StatusAlert.vue';
import { warningLabel } from '@/helpers/entrants.mjs';
import { eventLabel } from '@/helpers/event-labels.mjs';
import { defaultSignupRace } from '@/helpers/players.mjs';
import { raceWrapper } from '@/helpers/races.js';
import { useAuthStore, useEventStore } from '@/stores';

const props = defineProps({
  event: { type: Object, required: true },
  held: { type: Array, default: () => [] }, // the races the caller already entered on
});
const emit = defineEmits(['signed-up']);

const auth = useAuthStore();
const store = useEventStore();

const show = ref(false);
const saving = ref(false);
const error = ref(null);
const race = ref(null);
const battleTag = ref('');
const note = ref('');
const entrant = ref(null);

// An event open to anyone takes a battle tag from a caller whose account names no player
const needsTag = computed(() => props.event.signup_policy === 'anyone' && !auth.me?.user);
// A signup-only event is a list of what people want to work on, so it asks for the note
const takesNote = computed(() => props.event.kind === 'signup');
const ready = computed(() => !!race.value && (!needsTag.value || battleTag.value.trim().length > 2));
const warnings = computed(() => entrant.value?.warnings ?? []);
// The races the dialog leaves out: only an event that takes one entry per race holds any
const taken = computed(() => (props.event.multi_entry ? props.held : []));
const another = computed(() => taken.value.length > 0);
const raceName = (race) => raceWrapper.getRaceObject(race)?.name || race;

const open = () => {
  entrant.value = null;
  error.value = null;
  battleTag.value = '';
  note.value = '';
  const usual = defaultSignupRace(auth.me?.user, () => 0);
  race.value = taken.value.includes(usual) ? null : usual;
  show.value = true;
};

const submit = async () => {
  error.value = null;
  saving.value = true;
  try {
    entrant.value = await store.signUp(props.event.id, {
      race: race.value,
      note: note.value.trim() || null,
      battle_tag: needsTag.value ? battleTag.value.trim() : null,
    });
    emit('signed-up', entrant.value);
  } catch (e) {
    error.value = `The signup did not go through: ${e.message}`;
  } finally {
    saving.value = false;
  }
};

defineExpose({ open });
</script>
