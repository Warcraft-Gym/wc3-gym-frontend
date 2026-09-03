<template>
  <v-overlay v-model="isLoading" persistent absolute>
    <v-progress-circular
      indeterminate
      size="64" 
      width="8"
      color="primary"
    ></v-progress-circular>
  </v-overlay>
  
  <v-container fluid class="pa-4">
    <v-row class="mb-4">
      <v-col>
        <h1><v-icon class="mr-2">mdi-cog</v-icon> Configuration Management</h1>
      </v-col>
    </v-row>
    
    <!-- Error Message -->
    <StatusAlert v-model="errorMessage" />

    <!-- Success Message -->
    <StatusAlert v-model="successMessage" type="success" />

    <!-- Application Settings Section -->
    <v-row>
      <v-col cols="12">
        <v-card elevation="2">
          <v-card-title class="bg-primary">
            <v-icon class="mr-2">mdi-cog</v-icon>
            Application Settings
          </v-card-title>
          <v-card-subtitle class="mt-2">
            Manage application configuration settings stored in the database.
          </v-card-subtitle>
          
          <v-card-text>
            <v-form ref="form">
              <v-row>
                <!-- W3Champions Settings -->
                <v-col cols="12">
                  <h3 class="text-h6 mb-2">Warcraft 3 Champions Integration</h3>
                </v-col>
                
                <v-col cols="12" md="6">
                  <v-text-field
                    v-model="settingsMap.current_wc3_season"
                    label="Current WC3 Season"
                    :placeholder="w3cSeasonPlaceholder"
                    hint="Leave blank to follow the latest W3Champions season."
                    persistent-placeholder
                    variant="outlined"
                    prepend-inner-icon="mdi-trophy"
                    type="number"
                  ></v-text-field>
                </v-col>
                
                <v-col cols="12" md="6">
                  <v-text-field
                    v-model="settingsMap.w3c_url"
                    label="W3Champions API URL"
                    :placeholder="w3cUrlPlaceholder"
                    hint="Base URL for W3Champions API. Leave blank to use the default."
                    persistent-placeholder
                    variant="outlined"
                    prepend-inner-icon="mdi-api"
                  ></v-text-field>
                </v-col>

                <!-- GNL Settings -->
                <v-col cols="12" class="mt-4">
                  <h3 class="text-h6 mb-2">GNL League Settings</h3>
                </v-col>

                <v-col cols="12" md="6">
                  <v-select
                    v-model="settingsMap.current_gnl_season"
                    :items="seasons"
                    item-title="name"
                    item-value="id"
                    label="Current GNL Season"
                    hint="Active league season"
                    variant="outlined"
                    prepend-inner-icon="mdi-calendar"
                    clearable
                  ></v-select>
                </v-col>

                <v-col cols="12" md="6">
                  <v-select
                    v-model="settingsMap.score_system"
                    :items="scoreSystemOptions"
                    label="Score System"
                    hint="Scoring method for series: Standard (2:0 = 3pts, 2:1 = 2pts) or Helpstone (2:0 = 4pts, 2:1 = 3pts)"
                    variant="outlined"
                    prepend-inner-icon="mdi-trophy-variant"
                  ></v-select>
                </v-col>

                <!-- Public Access Settings -->
                <v-col cols="12" class="mt-4">
                  <h3 class="text-h6 mb-2">Public Access Settings</h3>
                </v-col>

                <v-col cols="12" md="6">
                  <v-switch
                    v-model="settingsMap.signups_enabled"
                    color="primary"
                    label="Player Signups Enabled"
                    hint="Off closes signups for every season; a commenced season is closed anyway"
                    hide-details="auto"
                    true-value="true"
                    false-value="false"
                  ></v-switch>
                </v-col>

                <v-col cols="12" md="6">
                  <v-switch
                    v-model="settingsMap.fantasy_team_creation_enabled"
                    color="primary"
                    label="Fantasy Team Creation Enabled"
                    hint="Off closes team creation for every season; a commenced season is closed anyway"
                    hide-details="auto"
                    true-value="true"
                    false-value="false"
                  ></v-switch>
                </v-col>

                <!-- Fantasy Betting Settings -->
                <v-col cols="12" class="mt-4">
                  <h3 class="text-h6 mb-2">Fantasy Betting Settings</h3>
                </v-col>

                <v-col cols="12" md="6">
                  <v-switch
                    v-model="settingsMap.fantasy_fixed_bet_points"
                    color="primary"
                    label="Use Fixed Bet Points"
                    hint="If enabled, all bets use a fixed point value instead of user input"
                    hide-details="auto"
                    true-value="true"
                    false-value="false"
                  ></v-switch>
                </v-col>

                <v-col cols="12" md="6">
                  <v-text-field
                    v-model="settingsMap.fantasy_bet_points_value"
                    label="Fixed Bet Points Value"
                    hint="Point value for bets when using fixed bet points"
                    variant="outlined"
                    prepend-inner-icon="mdi-numeric"
                    type="number"
                    :disabled="settingsMap.fantasy_fixed_bet_points !== 'true'"
                  ></v-text-field>
                </v-col>

                <v-col cols="12" md="6">
                  <v-text-field
                    v-model="settingsMap.fantasy_min_bet_points"
                    label="Minimum Bet Points"
                    hint="Minimum point value allowed when using custom bet points"
                    variant="outlined"
                    prepend-inner-icon="mdi-arrow-down"
                    type="number"
                    :disabled="settingsMap.fantasy_fixed_bet_points === 'true'"
                  ></v-text-field>
                </v-col>

                <v-col cols="12" md="6">
                  <v-text-field
                    v-model="settingsMap.fantasy_max_bet_points"
                    label="Maximum Bet Points"
                    hint="Maximum point value allowed when using custom bet points"
                    variant="outlined"
                    prepend-inner-icon="mdi-arrow-up"
                    type="number"
                    :disabled="settingsMap.fantasy_fixed_bet_points === 'true'"
                  ></v-text-field>
                </v-col>

                <!-- Discord Settings -->
                <v-col cols="12" class="mt-4">
                  <h3 class="text-h6 mb-2">Discord Bot Settings</h3>
                </v-col>

                <v-col cols="12" md="6">
                  <v-text-field
                    v-model="settingsMap.captain_coach_role"
                    label="Captain/Coach Role ID"
                    hint="Discord role ID for team captains and coaches"
                    variant="outlined"
                    prepend-inner-icon="mdi-account-star"
                  ></v-text-field>
                </v-col>

                <v-col cols="12" md="6">
                  <v-text-field
                    v-model="settingsMap.admin_role"
                    label="Admin Role ID"
                    hint="Discord role ID for bot commands"
                    variant="outlined"
                    prepend-inner-icon="mdi-shield-account"
                  ></v-text-field>
                </v-col>

                <v-col cols="12" md="4">
                  <v-text-field
                    v-model="settingsMap.signup_channel_id"
                    label="Signup Channel ID"
                    hint="Discord channel for player signup button"
                    variant="outlined"
                    prepend-inner-icon="mdi-account-plus"
                  ></v-text-field>
                </v-col>

                <v-col cols="12" md="4">
                  <v-text-field
                    v-model="settingsMap.dashboard_channel_id"
                    label="Player Dashboard Channel ID"
                    hint="Discord channel for player dashboard button"
                    variant="outlined"
                    prepend-inner-icon="mdi-view-dashboard"
                  ></v-text-field>
                </v-col>

                <v-col cols="12" md="4">
                  <v-text-field
                    v-model="settingsMap.fantasy_dashboard_channel_id"
                    label="Fantasy Dashboard Channel ID"
                    hint="Discord channel for fantasy league dashboard button"
                    variant="outlined"
                    prepend-inner-icon="mdi-dice-multiple"
                  ></v-text-field>
                </v-col>

                <v-col cols="12" md="6">
                  <v-text-field
                    v-model="settingsMap.scheduling_channel_id"
                    label="Scheduling Channel ID"
                    hint="Where match scheduling notifications are posted"
                    variant="outlined"
                    prepend-inner-icon="mdi-calendar-clock"
                  ></v-text-field>
                </v-col>

                <v-col cols="12" md="6">
                  <v-text-field
                    v-model="settingsMap.results_channel_id"
                    label="Results Channel ID"
                    hint="Where match results and replays are posted"
                    variant="outlined"
                    prepend-inner-icon="mdi-trophy-outline"
                  ></v-text-field>
                </v-col>

                <!-- KOTH Integration Settings -->
                <v-col cols="12" class="mt-4">
                  <h3 class="text-h6 mb-2">KOTH Nightbot Integration</h3>
                </v-col>

                <v-col cols="12">
                  <v-card variant="outlined" class="pa-4">
                    <v-row>
                      <v-col cols="12">
                        <div class="d-flex align-center mb-2">
                          <v-icon color="primary" class="mr-2">mdi-robot</v-icon>
                          <span class="text-subtitle-1 font-weight-medium">Nightbot Signup Token</span>
                        </div>
                        <p class="text-body-2 text-medium-emphasis mb-4">
                          This token authenticates Nightbot signup commands. Generate a new token if the current one is compromised.
                        </p>
                      </v-col>

                      <v-col cols="12" md="8">
                        <v-text-field
                          v-model="kothNightbotToken"
                          label="Current Token"
                          variant="outlined"
                          readonly
                          prepend-inner-icon="mdi-key"
                          :append-inner-icon="kothTokenVisible ? 'mdi-eye-off' : 'mdi-eye'"
                          :type="kothTokenVisible ? 'text' : 'password'"
                          @click:append-inner="kothTokenVisible = !kothTokenVisible"
                          hint="Click the eye icon to show/hide the token"
                          persistent-hint
                        >
                          <template v-slot:append>
                            <v-btn
                              icon="mdi-content-copy"
                              variant="text"
                              density="comfortable"
                              @click="copyKothToken"
                              :disabled="!kothNightbotToken"
                            ></v-btn>
                          </template>
                        </v-text-field>
                      </v-col>

                      <v-col cols="12" md="4" class="d-flex align-center">
                        <v-btn
                          color="primary"
                          variant="elevated"
                          prepend-icon="mdi-refresh"
                          @click="generateKothToken"
                          :loading="isGeneratingKothToken"
                          block
                        >
                          Generate New Token
                        </v-btn>
                      </v-col>

                      <v-col cols="12" v-if="kothNightbotToken">
                        <v-alert type="info" variant="tonal" density="compact">
                          <div class="text-body-2">
                            <strong>Nightbot Command Example:</strong><br>
                            <code class="mt-1 d-inline-block">!addcom !kothsignup $(urlfetch $(eval const token='{{kothNightbotToken}}'; const twitch='$(user)'; const race='$(query)'; `https://backend.warcraft-gym.com/koth/signup?token=${token}&twitch=${twitch}&battletag=$(query)${race ? '&race='+race : ''}`; ))</code>
                          </div>
                        </v-alert>
                      </v-col>
                    </v-row>
                  </v-card>
                </v-col>
              </v-row>
            </v-form>
          </v-card-text>

          <v-card-actions class="px-4 pb-4">
            <v-btn
              color="primary"
              variant="elevated"
              prepend-icon="mdi-content-save"
              @click="saveSettings"
              :loading="isSaving"
              :disabled="isSaving"
            >
              Save Settings
            </v-btn>

            <v-btn
              variant="outlined"
              prepend-icon="mdi-reload"
              @click="resetSettings"
              :disabled="isSaving"
            >
              Reset
            </v-btn>
          </v-card-actions>
        </v-card>
      </v-col>
    </v-row>

    <!-- Info Card -->
    <v-row class="mt-4">
      <v-col cols="12">
        <v-card elevation="2">
          <v-card-title class="bg-primary">
            <v-icon class="mr-2">mdi-information</v-icon>
            About Settings
          </v-card-title>
          <v-card-text class="pt-4">
            <ul>
              <li><strong>Database Storage:</strong> Settings are stored in the database and persist across backend restarts.</li>
              <li><strong>Public Access Toggles:</strong> Enable/disable player signups and fantasy team creation independently.</li>
              <li><strong>Discord IDs:</strong> Role and channel IDs can be found by enabling Developer Mode in Discord and right-clicking on roles/channels.</li>
              <li><strong>Current GNL Season:</strong> The current season is used for public player signups, fantasy team registration, and all league operations.</li>
              <li><strong>W3Champions:</strong> The W3C season and URL are used for fetching player statistics and MMR data.</li>
              <li><strong>Player Dashboard Channel:</strong> The channel where the player dashboard button is posted for users to access their dashboard.</li>
              <li><strong>Scheduling Channel:</strong> Where scheduling notifications are posted when players schedule their matches via the dashboard.</li>
              <li><strong>Results Channel:</strong> Where score update notifications and replay files are posted when players submit results via the dashboard.</li>
              <li><strong>Fantasy Dashboard Channel:</strong> The channel where the fantasy league dashboard button is posted.</li>
            </ul>
          </v-card-text>
        </v-card>
      </v-col>
    </v-row>
  </v-container>
</template>

<script setup>
import { ref, onMounted, computed } from 'vue';
import { useConfigStore, useSeasonStore } from '@/stores';
import { storeToRefs } from 'pinia';
import StatusAlert from '@/components/StatusAlert.vue';


const configStore = useConfigStore();
const seasonStore = useSeasonStore();
const { seasons } = storeToRefs(seasonStore);

const isLoading = ref(false);
const isSaving = ref(false);
const errorMessage = ref(null);
const successMessage = ref(null);

// KOTH Token management
const kothNightbotToken = ref('');
const kothTokenVisible = ref(false);
const isGeneratingKothToken = ref(false);

// Score system options
const scoreSystemOptions = [
  { title: 'Standard (3 points max)', value: 'standard' },
  { title: 'Helpstone (4 points max)', value: 'helpstone' }
];

// Map of setting keys to values
const settingsMap = ref({
  current_wc3_season: '',
  w3c_url: '',
  current_gnl_season: '',
  score_system: 'standard',
  signups_enabled: 'false',
  fantasy_team_creation_enabled: 'false',
  fantasy_fixed_bet_points: 'false',
  fantasy_bet_points_value: '',
  fantasy_min_bet_points: '',
  fantasy_max_bet_points: '',
  captain_coach_role: '',
  admin_role: '',
  signup_channel_id: '',
  dashboard_channel_id: '',
  scheduling_channel_id: '',
  results_channel_id: '',
  fantasy_dashboard_channel_id: ''
});

// Fetch settings on mount
const fetchSettings = async () => {
  isLoading.value = true;
  errorMessage.value = null;
  try {
    const settings = await configStore.fetchSettings();
    // Convert settings array to map
    settings.forEach(setting => {
      if (Object.hasOwn(settingsMap.value, setting.key)) {
        // Convert season settings to number for proper v-select matching
        if (setting.key === 'current_gnl_season' && setting.value) {
          settingsMap.value[setting.key] = parseInt(setting.value, 10);
        } 
        // Keep boolean settings as strings "true"/"false" for v-switch
        else if (setting.key === 'signups_enabled' || 
                 setting.key === 'fantasy_team_creation_enabled' || 
                 setting.key === 'fantasy_fixed_bet_points') {
          settingsMap.value[setting.key] = setting.value || 'false';
        }
        else {
          settingsMap.value[setting.key] = setting.value || '';
        }
      }
    });
  } catch (error) {
    errorMessage.value = 'Failed to load settings: ' + error.message;
  } finally {
    isLoading.value = false;
  }
};

// What the backend uses while these two fields are blank
const w3cConfig = ref(null);

const fetchW3cConfig = async () => {
  try {
    w3cConfig.value = await configStore.fetchW3cConfig();
  } catch (error) {
    w3cConfig.value = null;
  }
};

const w3cUrlPlaceholder = computed(() => w3cConfig.value?.w3c_url ?? '');

const w3cSeasonPlaceholder = computed(() => {
  const season = w3cConfig.value?.current_season;
  return season == null ? '' : String(season);
});

// Save settings
const saveSettings = async () => {
  isSaving.value = true;
  errorMessage.value = null;
  successMessage.value = null;
  try {
    // Convert empty strings to null for cleaner database storage
    const settingsToSave = {};
    Object.keys(settingsMap.value).forEach(key => {
      const value = settingsMap.value[key];
      settingsToSave[key] = (value === '' || value === null) ? null : String(value);
    });

    await configStore.updateSettings(settingsToSave);
    successMessage.value = 'Settings saved successfully!';
  } catch (error) {
    errorMessage.value = 'Failed to save settings: ' + error.message;
  } finally {
    isSaving.value = false;
  }
};

// Reset settings
const resetSettings = async () => {
  await fetchSettings();
  successMessage.value = null;
  errorMessage.value = null;
};

// Fetch KOTH Nightbot token
const fetchKothToken = async () => {
  try {
    const response = await configStore.fetchKothNightbotToken();
    kothNightbotToken.value = response.token || '';
  } catch (error) {
    console.error('Failed to fetch KOTH token:', error);
    kothNightbotToken.value = '';
  }
};

// Generate new KOTH token
const generateKothToken = async () => {
  if (!confirm('Are you sure you want to generate a new token? The old token will stop working immediately.')) {
    return;
  }

  isGeneratingKothToken.value = true;
  errorMessage.value = null;
  successMessage.value = null;
  try {
    const response = await configStore.generateKothNightbotToken();
    kothNightbotToken.value = response.token;
    successMessage.value = 'New KOTH Nightbot token generated successfully!';
    kothTokenVisible.value = true; // Show the new token
  } catch (error) {
    errorMessage.value = 'Failed to generate KOTH token: ' + error.message;
  } finally {
    isGeneratingKothToken.value = false;
  }
};

// Copy KOTH token to clipboard
const copyKothToken = async () => {
  try {
    await navigator.clipboard.writeText(kothNightbotToken.value);
    successMessage.value = 'Token copied to clipboard!';
  } catch (error) {
    errorMessage.value = 'Failed to copy token to clipboard';
  }
};

onMounted(async () => {
  await Promise.all([
    fetchSettings(),
    fetchW3cConfig(),
    seasonStore.fetchSeasons(),
    fetchKothToken()
  ]);
});
</script>

<style scoped>
ul {
  padding-left: 20px;
}

ul li {
  margin-bottom: 8px;
}
</style>
