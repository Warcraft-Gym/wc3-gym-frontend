<template>
  <v-container fluid class="pa-4">
    <v-row class="mb-4">
      <v-col>
        <h1><v-icon class="mr-2">mdi-account-plus</v-icon> Player Signup</h1>
      </v-col>
    </v-row>

    <v-card elevation="2">
      <v-card-title class="bg-primary text-wrap">
        <v-icon class="mr-2">mdi-clipboard-account</v-icon>
        {{ seasonName && state !== 'profile' ? `Signup for Season: ${seasonName}` : 'Player Registration' }}
      </v-card-title>
      <v-card-text class="pt-4">
        <div v-if="loading">Loading...</div>

        <template v-else-if="state === 'over'">
          <v-alert type="info" variant="tonal" border="start" class="mb-4" prominent>
            <strong>{{ seasonName }} is over.</strong> It takes no signups and no requests.
          </v-alert>
          <v-btn color="primary" variant="elevated" prepend-icon="mdi-home" to="/">Go to home</v-btn>
        </template>

        <template v-else-if="state === 'joined' && !editing">
          <v-alert type="success" variant="tonal" border="start" class="mb-4" prominent>
            <strong>You are signed up</strong> for {{ seasonName }}.
          </v-alert>
          <dl v-if="entry" class="entry mb-4">
            <dt>Player</dt>
            <dd><PlayerName :player="entry" /></dd>
            <dt>BattleTag</dt>
            <dd>{{ entry.battleTag }}</dd>
            <dt>Race</dt>
            <dd><RaceIcon :raceIdentifier="entry.race" size="1.2em" />{{ raceName(entry.race) }}</dd>
            <dt>Timezone</dt>
            <dd>{{ zoneLabel(entry.timezone) || '—' }}</dd>
          </dl>
          <v-btn variant="outlined" prepend-icon="mdi-pencil" @click="editing = true">Change my details</v-btn>
          <v-card v-if="schedulingEnabled" variant="tonal" color="primary" class="mt-6" to="/player-dashboard">
            <v-card-item prepend-icon="mdi-calendar-remove" append-icon="mdi-chevron-right">
              <v-card-title class="text-wrap">Mark the rounds you cannot play</v-card-title>
              <v-card-subtitle>On your player dashboard</v-card-subtitle>
            </v-card-item>
          </v-card>
        </template>

        <div v-else>
          <v-alert v-if="state === 'request'" type="warning" variant="tonal" border="start" class="mb-4" prominent>
            <strong>Signups for {{ seasonName }} are closed.</strong>
            Your profile still saves, and an admin may add you. There is no guarantee.
          </v-alert>

          <v-alert type="info" variant="tonal" border="start" class="mb-4">
            Your BattleTag is your
            <a href="https://w3champions.com/" target="_blank" rel="noopener noreferrer">W3Champions</a>
            ID, as <code>Name#12345</code>.
          </v-alert>
          <v-form ref="formRef" @submit.prevent="onSubmit">
            <v-row :dense="true">
              <v-col cols="12" md="6">
                <v-text-field
                  disabled
                  v-model="discordId"
                  label="Discord ID"
                  variant="outlined"
                  required
                  prepend-inner-icon="mdi-identifier"
                  readonly
                />
              </v-col>
              <v-col cols="12" md="6">
                <v-text-field
                  disabled
                  v-model="discordTag"
                  label="Discord Tag"
                  variant="outlined"
                  required
                  prepend-inner-icon="$discord"
                  readonly
                />
              </v-col>
            </v-row>

            <v-row :dense="true">
              <v-col cols="12" md="6">
                <v-text-field
                  v-model="name"
                  label="Player name (EAShibby)"
                  variant="outlined"
                  prepend-inner-icon="mdi-account"
                  required
                />
              </v-col>
              <v-col cols="12" md="6">
                <v-text-field
                  v-model="battleTag"
                  label="Player BattleTag (EAShibby#12342)"
                  variant="outlined"
                  prepend-inner-icon="mdi-pound"
                  :rules="battleTagRules"
                  required
                />
              </v-col>
            </v-row>

            <v-row :dense="true">
              <v-col cols="12" md="4">
                <CountrySelect v-model="country" required />
              </v-col>
              <v-col cols="12" md="4">
                <RaceSelect v-model="race" label="Main race" required />
              </v-col>
              <v-col cols="12" md="4">
                <v-autocomplete
                  v-model="timezone"
                  label="Timezone"
                  prepend-inner-icon="mdi-earth"
                  :menu-props="{ scrollStrategy: 'close' }"
                  :items="timezones"
                  :rules="[v => !!v || 'Timezone is required']"
                />
              </v-col>
            </v-row>

            <v-alert v-if="zoneWarning" type="warning" variant="tonal" density="compact" class="mb-4">
              {{ zoneWarning }}
            </v-alert>

            <v-row>
              <v-col class="d-flex align-center ga-2 flex-wrap">
                <v-btn
                  color="primary"
                  variant="elevated"
                  :prepend-icon="state === 'request' ? 'mdi-account-question' : 'mdi-check'"
                  type="submit"
                  :disabled="submitting || success || !isFormValid"
                >
                  {{ submitLabel }}
                </v-btn>
                <v-btn v-if="editing" variant="text" @click="editing = false">Cancel</v-btn>
                <v-progress-circular v-if="submitting" indeterminate size="18" />
              </v-col>
            </v-row>
          </v-form>
          <v-alert type="warning" v-if="closedMessage" class="mt-4">{{ closedMessage }}</v-alert>
          <v-alert type="error" v-if="submitError" class="mt-4">Error: {{ submitError }}</v-alert>
        </div>
        <v-alert v-if="saved" type="success" variant="tonal" density="compact" class="mt-4">Your details are saved.</v-alert>
      </v-card-text>
    </v-card>
  </v-container>
</template>

<script setup>
import { ref, onMounted, computed } from 'vue';
import { useSeasonStore, useAuthStore } from '@/stores';
import { backendUrl, fetchWrapper } from '@/helpers';
import { storeToRefs } from 'pinia';
import { findCountry } from '@/helpers/countries.js';
import { raceWrapper } from '@/helpers/races.js';
import { signupState, startZone } from '@/helpers/signup.mjs';
import { viewerZone, zoneLabel } from '@/helpers/timezone.mjs';

const loading = ref(true);

// Form fields (match the create player dialog)
const discordId = ref('');
const discordTag = ref('');
const name = ref('');
const battleTag = ref('');
// the browser's region is the default country, e.g. en-US -> US; empty when it names no country
const country = ref(findCountry(new Intl.Locale(navigator.language || 'en').region)?.a2 || '');
const race = ref('');
// the player's own pick or saved zone; empty while the start zone applies
const zonePick = ref('');
const start = computed(() => startZone(viewerZone(), country.value));
const timezone = computed({
  get: () => zonePick.value || start.value.zone,
  set: (zone) => { zonePick.value = zone || ''; },
});
const zoneWarning = computed(() => {
  if (zonePick.value || !start.value.fallback) return '';
  return start.value.fallback === 'country'
    ? `Your browser gave no timezone. This is the main timezone of ${findCountry(country.value)?.name}. Check it.`
    : 'Your browser gave no timezone and no country is chosen. This is UTC. Pick your timezone.';
});
// a fallback zone may be an alias the browser list does not carry, e.g. Asia/Kolkata in Chromium
const timezones = computed(() => [...new Set([...Intl.supportedValuesOf('timeZone'), timezone.value])]);
const selectedSignupSeasonId = ref(null);

const submitting = ref(false);
const success = ref(false);
const saved = ref(false);
const editing = ref(false);
// The backend's answer when the season was not open: the profile is saved, the signup is not
const closedMessage = ref('');
const submitError = ref('');

const authStore = useAuthStore();
const seasonStore = useSeasonStore();
const { me } = storeToRefs(authStore);
const { seasons } = storeToRefs(seasonStore);

const season = computed(() => seasons.value.find(x => String(x.id) === String(selectedSignupSeasonId.value)) ?? null);
const seasonName = computed(() => season.value?.name || '');
const state = computed(() => signupState(season.value, !!me.value?.signed_up, !!me.value?.user));
const schedulingEnabled = computed(() => season.value?.scheduling_enabled ?? true);
const entry = computed(() => me.value?.user);
const submitLabel = computed(() => {
  if (editing.value) return 'Save my details';
  return { request: 'Ask to join', profile: 'Save my profile' }[state.value] ?? 'Complete signup';
});
const raceName = (id) => raceWrapper.getRaceObject(id)?.name ?? id;

const isFormValid = computed(() => {
  // require the session's discord fields and all user-provided fields
  const discordOk = !!discordId.value && !!discordTag.value;
  const nameOk = !!name.value && String(name.value).trim().length > 0;
  const battleOk = !!battleTag.value && String(battleTag.value).trim().length > 0;
  // enforce BattleTag format like Name#123456
  const battleTagRegex = /^\S+#\d+$/;
  const battleFormatOk = battleOk && battleTagRegex.test(String(battleTag.value));
  const countryOk = !!country.value && String(country.value).trim().length > 0;
  const raceOk = !!race.value && String(race.value).trim().length > 0;
  return discordOk && nameOk && battleOk && countryOk && raceOk && battleFormatOk && !!timezone.value;
});

// Vuetify field rules for immediate UI feedback
const battleTagRules = [
  v => (!!v && String(v).trim().length > 0) || 'BattleTag is required',
  v => (/^\S+#\d+$/.test(String(v || ''))) || 'BattleTag must be like Name#123456'
];

onMounted(async () => {
  loading.value = true;
  // the Discord session identifies the player
  discordId.value = authStore.me.discord_id;
  discordTag.value = authStore.me.name;
  // the linked users row prefills the form; /me says which season the signup is for
  const existing = authStore.me.user;
  if (existing) {
    name.value = existing.name || '';
    battleTag.value = existing.battleTag || '';
    country.value = existing.country || country.value;
    race.value = existing.race || '';
    zonePick.value = existing.timezone || '';
  }
  selectedSignupSeasonId.value = authStore.me.season_id || null;
  try { await seasonStore.fetchSeasons(); } catch (e) { /* ignore */ }
  loading.value = false;
});

async function onSubmit() {
  submitError.value = '';
  saved.value = false;
  // basic client-side validation
  if (!isFormValid.value) {
    submitError.value = 'Please fill all required fields before submitting.';
    return;
  }

  submitting.value = true;
  try {
    const payload = {
      name: name.value,
      battleTag: battleTag.value,
      country: country.value,
      race: race.value,
      timezone: timezone.value || undefined,
      season_id: selectedSignupSeasonId.value ? selectedSignupSeasonId.value : undefined
    };
    const created = await fetchWrapper.post(`${backendUrl}/signup`, payload);

    // only a season action can be refused; an edit or a profile-only save is saved whatever the season takes
    if (created?.signup === 'closed' && ['signup', 'request'].includes(state.value)) {
      success.value = true;
      closedMessage.value = created.message;
      return;
    }
    // the fresh users row and signup turn the page into the signed-up view, which confirms itself
    await authStore.fetchMe();
    saved.value = editing.value || state.value !== 'joined';
    editing.value = false;
  } catch (err) {
    submitError.value = (err && err.message) || (err && err.error) || String(err);
  } finally {
    submitting.value = false;
  }
}
</script>

<style scoped>
.entry {
  display: grid;
  grid-template-columns: max-content 1fr;
  gap: 8px 24px;
  align-items: center;
}
.entry dt {
  color: rgba(var(--v-theme-on-surface), var(--v-medium-emphasis-opacity));
}
.entry dd {
  display: flex;
  align-items: center;
  gap: 6px;
}
</style>
