<template>
  <v-container fluid class="pa-4">
    <v-row class="mb-4">
      <v-col>
        <h1><v-icon class="mr-2">mdi-account-plus</v-icon> Player Signup</h1>
      </v-col>
    </v-row>

    <v-card elevation="2">
      <v-card-title class="bg-primary">
        <v-icon class="mr-2">mdi-clipboard-account</v-icon>
        {{ seasonName ? `Signup for Season: ${seasonName}` : 'Player Registration' }}
      </v-card-title>
      <v-card-text class="pt-4">
        <div v-if="loading">Loading token...</div>
        <div v-else-if="tokenInvalid">
          <v-alert type="error">Token is invalid: {{ tokenInvalidReason }}</v-alert>
        </div>
        <div v-else>
          <v-alert
            v-if="alreadySignedUp"
            type="warning"
            variant="tonal"
            border="start"
            class="mb-4"
            prominent
          >
            <strong>You are already signed up for this season.</strong>
            You can update your details below and resubmit if you need to make changes.
          </v-alert>

          <v-alert type="info" variant="tonal" border="start" class="mb-4">
            <div><strong>Name:</strong> The player name — choose freely (this is how players are shown in the UI).</div>
            <div><strong>BattleTag:</strong> Your BattleNet / W3C ID in the format <code>Name#123456</code>. You can find it on your W3C profile — <a href="https://w3champions.com/" target="_blank" rel="noopener noreferrer">W3Champions</a>.</div>
            <div><strong>Player Country:</strong> Country you live in — this helps with scheduling matches.</div>
            <div><strong>Main race:</strong> The race you plan to play in the league. It can be changed until the league starts; after the draft changes require agreement from your team captain.</div>
            <div><strong>Signup Race MMR:</strong> Current MMR for the selected race on W3Champions.</div>
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
                  prepend-inner-icon="mdi-discord"
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
                  :menu-props="{ scrollStrategy: 'close' }"
                  :items="timezones"
                />
              </v-col>
            </v-row>

            <v-row>
              <v-col>
                <v-btn 
                  color="primary" 
                  variant="elevated"
                  prepend-icon="mdi-check"
                  type="submit" 
                  :disabled="submitting || success || !isFormValid"
                >
                  Complete signup
                </v-btn>
                <v-progress-circular v-if="submitting" indeterminate size="18" class="ml-2" />
              </v-col>
            </v-row>
          </v-form>
          <v-alert type="success" v-if="success" class="mt-4">Signup completed — thank you.</v-alert>
          <v-alert type="error" v-if="submitError" class="mt-4">Error: {{ submitError }}</v-alert>
        </div>
      </v-card-text>
    </v-card>
  </v-container>
</template>

<script setup>
import { ref, onMounted, computed } from 'vue';
import { useRoute, useRouter } from 'vue-router';
// token validation/consumption is handled server-side via backend endpoints
import { useSeasonStore, useConfigStore, usePlayerStore, useAuthStore } from '@/stores';
import { fetchWrapper } from '@/helpers';
import { storeToRefs } from 'pinia';
import CountryCodes from 'country-code-info';

const route = useRoute();
const router = useRouter();
const token = ref(route.query.token || '');
const loading = ref(true);
const tokenInvalid = ref(false);
const tokenInvalidReason = ref('');
const tokenEntry = ref({ discordId: '', discordTag: '' });

// Form fields (match create player dialog except fantasy_tier)
const discordId = ref('');
const discordTag = ref('');
const name = ref('');
const battleTag = ref('');
// the browser's region is the default country, e.g. en-US -> US; empty when it names no country
const country = ref(CountryCodes.findCountry({ a2: new Intl.Locale(navigator.language || 'en').region })?.a2 || '');
const race = ref('');
const timezones = Intl.supportedValuesOf('timeZone');
const timezone = ref(Intl.DateTimeFormat().resolvedOptions().timeZone);
const selectedSignupSeasonId = ref(null);

const submitting = ref(false);
const success = ref(false);
const submitError = ref('');
const seasonName = ref('');
const alreadySignedUp = ref(false);

const isFormValid = computed(() => {
  // require the token-populated discord fields and all user-provided fields
  const discordOk = !!discordId.value && !!discordTag.value;
  const nameOk = !!name.value && String(name.value).trim().length > 0;
  const battleOk = !!battleTag.value && String(battleTag.value).trim().length > 0;
  // enforce BattleTag format like Name#123456
  const battleTagRegex = /^\S+#\d+$/;
  const battleFormatOk = battleOk && battleTagRegex.test(String(battleTag.value));
  const countryOk = !!country.value && String(country.value).trim().length > 0;
  const raceOk = !!race.value && String(race.value).trim().length > 0;
  return discordOk && nameOk && battleOk && countryOk && raceOk && battleFormatOk;
});

// Vuetify field rules for immediate UI feedback
const battleTagRules = [
  v => (!!v && String(v).trim().length > 0) || 'BattleTag is required',
  v => (/^\S+#\d+$/.test(String(v || ''))) || 'BattleTag must be like Name#123456'
];

const authStore = useAuthStore();
const seasonStore = useSeasonStore();
const configStore = useConfigStore();
const playerStore = usePlayerStore();
const { seasons } = storeToRefs(seasonStore);

onMounted(async () => {
  loading.value = true;
  // a Discord session identifies the player instead of a one-shot token
  if (!token.value && authStore.me) {
    discordId.value = authStore.me.discord_id;
    discordTag.value = authStore.me.name;
    // the linked users row prefills the form; /me says which season the signup is for
    const existing = authStore.me.user;
    if (existing) {
      name.value = existing.name || '';
      battleTag.value = existing.battleTag || '';
      country.value = existing.country || country.value;
      race.value = existing.race || '';
      timezone.value = existing.timezone || timezone.value;
    }
    selectedSignupSeasonId.value = authStore.me.season_id || null;
    alreadySignedUp.value = !!authStore.me.signed_up;
    try { await seasonStore.fetchSeasons(); } catch (e) { /* ignore */ }
    seasonName.value = seasons.value.find(x => x.id === selectedSignupSeasonId.value)?.name || '';
    loading.value = false;
    return;
  }
  if (!token.value) {
    tokenInvalid.value = true;
    tokenInvalidReason.value = 'missing_token';
    loading.value = false;
    return;
  }

  try {
    const backend = import.meta.env.VITE_BACKEND_URL || '';
    
    // Check if signups are enabled
    try {
      const setting = await configStore.fetchSetting('signups_enabled');
      if (setting && setting.value && setting.value.toLowerCase() === 'false') {
        tokenInvalid.value = true;
        tokenInvalidReason.value = 'Signups are currently closed. Please check back later.';
        loading.value = false;
        return;
      }
    } catch { /* ignore */ }
    
    // Use the public token endpoint (updated API): /public-token/<token>
    const res = await fetch(`${backend}/public-token/${token.value}`);
    if (!res.ok) {
      tokenInvalid.value = true;
      tokenInvalidReason.value = (await res.text()) || 'not_found';
      loading.value = false;
      return;
    }
    const data = await res.json();
    // expected: { discord_id, discord_tag, season_id }
    tokenEntry.value = {
      discordId: data.discord_id || data.discordId || data.discordId || '',
      discordTag: data.discord_tag || data.discordTag || data.discordTag || '',
      season_id: data.season_id || data.seasonId || null
    };

    // prepopulate readonly fields
    discordId.value = tokenEntry.value.discordId || '';
    discordTag.value = tokenEntry.value.discordTag || '';

    // look up existing user and prefill form if they have already registered
    if (tokenEntry.value.discordId) {
      try {
        const existingUsers = await playerStore.searchByDiscordId(tokenEntry.value.discordId);
        if (existingUsers && existingUsers.length > 0) {
          const existing = existingUsers[0];
          if (existing.name) name.value = existing.name;
          if (existing.battleTag) battleTag.value = existing.battleTag;
          if (existing.country) country.value = existing.country;
          if (existing.race) race.value = existing.race;
          if (existing.timezone) timezone.value = existing.timezone;
        }
      } catch { /* ignore */ }
    }

    // fetch seasons for signup selection
    try { await seasonStore.fetchSeasons(); } catch (e) { /* ignore */ }
    // if token contains a season_id prepopulate selection and seasonName
    if (tokenEntry.value && tokenEntry.value.season_id) {
      const sid = tokenEntry.value.season_id;
      const s = (seasonStore.seasons || []).find(x => String(x.id) === String(sid));
      if (s) {
        seasonName.value = s.name;
        selectedSignupSeasonId.value = s.id;
      } else {
        selectedSignupSeasonId.value = sid;
      }

      // Check if user is already signed up for this season
      if (discordId.value && selectedSignupSeasonId.value) {
        try {
          const signups = await seasonStore.fetchSeasonSignups(selectedSignupSeasonId.value);
          alreadySignedUp.value = Array.isArray(signups) &&
            signups.some(u => String(u.discordId) === String(discordId.value));
        } catch { /* ignore */ }
      }
    }
  } catch (err) {
    tokenInvalid.value = true;
    tokenInvalidReason.value = err.message;
  } finally {
    loading.value = false;
  }
});

async function onSubmit() {
  submitError.value = '';
  // basic client-side validation
  if (!isFormValid.value) {
    submitError.value = 'Please fill all required fields before submitting.';
    return;
  }

  submitting.value = true;
  try {
    // Build payload and call the new public signup endpoint which creates the user
    const payload = {
      token: token.value || undefined,
      name: name.value,
      battleTag: battleTag.value,
      country: country.value,
      race: race.value,
      timezone: timezone.value || undefined,
      // include season id if token had one or it was provided
      season_id: selectedSignupSeasonId.value ? selectedSignupSeasonId.value : undefined
    };
    const backend = import.meta.env.VITE_BACKEND_URL || '';
    await fetchWrapper.post(`${backend}/signup`, payload);

    // user created on backend — end-user flow is complete; they can close the page
    success.value = true;
    // the profile needs the fresh users row and signup before it can show the dashboard
    if (!token.value) {
      await authStore.fetchMe();
      if (route.path === '/signup') router.push('/profile');
    }
  } catch (err) {
    submitError.value = (err && err.message) || (err && err.error) || String(err);
  } finally {
    submitting.value = false;
  }
}
</script>
