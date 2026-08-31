<template>
  <div class="koth-dashboard-wrapper">
    <v-container fluid class="pa-6 koth-dashboard">
      <v-overlay v-model="initialLoad" persistent class="loading-overlay">
        <v-progress-circular indeterminate size="64" width="8" color="primary" />
      </v-overlay>

      <!-- Event Header -->
      <div v-if="event" class="text-center mb-8">
        <h1 class="text-h2 font-weight-bold mb-2">
          <v-icon size="48" color="warning" class="mr-3">mdi-crown</v-icon>
          {{ event.name }}
        </h1>
        <p v-if="event.description" class="text-h6 text-grey-darken-1">{{ event.description }}</p>
      </div>

      <!-- Signup Button -->
      <div v-if="event && !isCleanMode" class="text-center mb-6">
        <v-btn
          color="primary"
          size="x-large"
          class="signup-btn"
          elevation="8"
          @click="showSignupDialog = true"
        >
          <v-icon start>mdi-account-plus</v-icon>
          Sign Up to Compete
        </v-btn>
      </div>

    <!-- Brackets Grid -->
    <v-row v-if="event" class="mb-8">
      <v-col v-for="bracket in [1, 2, 3]" :key="bracket" cols="12" md="4">
        <v-card elevation="8" class="bracket-card" :class="`bracket-${bracket}`">
          <v-card-title class="bracket-header text-center py-4">
            <div class="d-flex align-center justify-center">
              <img :src="getBracketIcon(bracket)" alt="Bracket Icon" style="width: 60px; height: 60px;" class="mr-3" />
              <div class="text-h5 font-weight-bold">{{ getBracketThresholdText(bracket) }}</div>
            </div>
          </v-card-title>
          
          <v-card-text class="pa-4">
            <!-- Kings Section -->
            <div v-if="kings[bracket] && kings[bracket].length > 0" class="mb-4">
              <v-card 
                v-for="king in kings[bracket]" 
                :key="king.id" 
                variant="outlined" 
                class="king-card mb-3 pa-4"
              >
                <v-row align="center" no-gutters>
                  <v-col>
                    <PlayerName class="text-h5 font-weight-bold" :player="{ name: king.twitch_username || king.battle_tag, country: king.country }" :race="king.race" />
                    <div class="text-subtitle-1 text-grey-darken-2">{{ king.mmr }} MMR</div>
                  </v-col>
                  <v-col cols="auto">
                    <v-icon color="warning" size="56">mdi-crown</v-icon>
                  </v-col>
                </v-row>
              </v-card>
            </div>
            <div v-else class="text-center py-4 text-grey">
              <v-icon size="56" color="grey-lighten-1">mdi-crown-outline</v-icon>
              <div class="mt-2 text-body-1">No King Yet</div>
            </div>

            <v-divider class="my-4"></v-divider>

            <!-- Signed Up Players -->
            <div class="players-section">
              <div v-if="getActivePlayers(bracket).length > 0" class="players-list">
                <div
                  v-for="player in getActivePlayers(bracket)"
                  :key="player.battleTag"
                  class="player-item mb-2 pa-3"
                >
                  <PlayerName class="text-h6" :player="player" />
                  <div v-for="signup in player.signups" :key="signup.id" class="race-row d-flex align-center ga-2">
                    <RaceIcon v-if="signup.race" :raceIdentifier="signup.race" />
                    <span class="text-body-1 text-grey-darken-2">{{ signup.mmr }} MMR</span>
                  </div>
                </div>
              </div>
              <div v-else class="text-center py-4 text-grey-lighten-1 text-body-1">
                No players signed up
              </div>
            </div>
          </v-card-text>
        </v-card>
      </v-col>
    </v-row>

    <!-- Signup Dialog -->
    <v-dialog v-model="showSignupDialog" max-width="500px" persistent>
      <v-card>
        <v-card-title class="bg-primary">
          <v-icon class="mr-2">mdi-account-plus</v-icon>
          Sign Up for {{ event?.name }}
        </v-card-title>
        
        <v-card-text class="pt-4">
          <v-row dense>
            <template v-if="!profileBattleTag">
              <v-col cols="12">
                <v-text-field
                  v-model="signupForm.battle_tag"
                  label="BattleTag"
                  variant="outlined"
                  density="comfortable"
                  prepend-inner-icon="mdi-shield-account"
                  hint="Required. Format: Name#1234"
                  persistent-hint
                  :rules="[v => !!v || 'BattleTag is required']"
                />
              </v-col>
              <v-col cols="12">
                <v-text-field
                  v-model="signupForm.twitch_username"
                  label="Twitch Username"
                  variant="outlined"
                  density="comfortable"
                  prepend-inner-icon="mdi-twitch"
                  hint="Required. Your Twitch username"
                  persistent-hint
                  :rules="[v => !!v || 'Twitch username is required']"
                />
              </v-col>
              <v-col cols="12">
                <RaceSelect v-model="signupForm.race" />
              </v-col>
            </template>
            <template v-else>
              <v-col cols="12" class="text-body-1 mb-2">
                Signing up as <strong>{{ profileBattleTag }}</strong>
              </v-col>
              <v-col cols="12">
                <RaceSelect
                  v-model="signupForm.races"
                  multiple
                  chips
                  label="Races"
                  hint="One signup per race, each in the bracket its MMR cuts into"
                  persistent-hint
                />
              </v-col>
            </template>
          </v-row>
          
          <v-alert v-if="signupError" type="error" variant="tonal" class="mt-4" closable @click:close="signupError = null">
            {{ signupError }}
          </v-alert>
          <v-alert v-if="signupSuccess" type="success" variant="tonal" class="mt-4" closable @click:close="signupSuccess = null">
            {{ signupSuccess }}
          </v-alert>
        </v-card-text>
        
        <v-card-actions class="px-4 py-3">
          <v-spacer></v-spacer>
          <v-btn variant="text" @click="closeSignupDialog">Cancel</v-btn>
          <v-btn 
            color="primary" 
            prepend-icon="mdi-check" 
            @click="submitSignup"
            :disabled="!profileBattleTag && (!signupForm.battle_tag || !signupForm.twitch_username)"
          >
            Sign Up
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>
    </v-container>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted } from 'vue';
import { useKothStore } from '@/stores';
import { useAuthStore } from '@/stores';
import { useConfigStore } from '@/stores';
import { storeToRefs } from 'pinia';
import { useRoute } from 'vue-router';
import bracketSilverIcon from '@/assets/media/bracket-silver.png';
import bracketGoldIcon from '@/assets/media/bracket-gold.png';
import bracketDiamondIcon from '@/assets/media/bracket-diamond.png';


const route = useRoute();
const isCleanMode = computed(() => route.query.mode === 'clean');

const kothStore = useKothStore();
const authStore = useAuthStore();
const { events, kings } = storeToRefs(kothStore);

// A logged-in player whose row carries a battle tag signs up from his profile
const profileBattleTag = computed(() => authStore.me?.user?.battleTag || null);

const event = ref(null);
const showSignupDialog = ref(false);
const signupError = ref(null);
const signupSuccess = ref(null);
const signupForm = ref({
  battle_tag: '',
  twitch_username: '',
  race: null,
  races: []
});
let refreshInterval = null;
const initialLoad = ref(true);

onMounted(async () => {
  await loadDashboardData();
  initialLoad.value = false;
  // Auto-refresh every 30 seconds
  refreshInterval = setInterval(loadDashboardData, 30000);
});

onUnmounted(() => {
  if (refreshInterval) {
    clearInterval(refreshInterval);
  }
});

async function loadDashboardData() {
  try {
    // Fetch all events using store
    await kothStore.fetchAllEvents();
    
    // Find the newest event (highest ID or most recent date)
    if (events.value && events.value.length > 0) {
      // Sort by ID descending to get newest
      const sortedEvents = [...events.value].sort((a, b) => b.id - a.id);
      event.value = sortedEvents[0];
      
      // Load data for this event using store methods
      await Promise.all([
        kothStore.fetchSignups(event.value.id),
        kothStore.fetchBracketKings(event.value.id),
      ]);
    }
  } catch (error) {
    console.error('Failed to load dashboard data:', error);
  }
}



function getBracketIcon(bracket) {
  const icons = { 
    1: bracketSilverIcon,   // Silver shield for lowest bracket
    2: bracketGoldIcon,     // Gold shield for middle bracket
    3: bracketDiamondIcon   // Diamond shield for highest bracket
  };
  return icons[bracket] || bracketSilverIcon;
}

function getBracketThresholdText(bracket) {
  if (!event.value) return '';
  const thresholds = kothStore.getBracketThresholdText(event.value);
  return thresholds[bracket] || '';
}

function getActivePlayers(bracket) {
  return kothStore.getBracketPlayers(bracket);
}

function closeSignupDialog() {
  showSignupDialog.value = false;
  signupForm.value = {
    battle_tag: '',
    twitch_username: '',
    race: null
  };
  signupError.value = null;
  signupSuccess.value = null;
}

async function submitSignup() {
  if (!event.value) return;
  
  try {
    signupError.value = null;
    signupSuccess.value = null;

    if (profileBattleTag.value) {
      const newSignups = await kothStore.signupMe(signupForm.value.races);
      signupSuccess.value = `Successfully signed up! ${newSignups.length} bracket entr${newSignups.length === 1 ? 'y' : 'ies'} added.`;
      await loadDashboardData();
      setTimeout(closeSignupDialog, 2000);
      return;
    }

    // Fetch the KOTH_NIGHTBOT_TOKEN from backend
    const configStore = useConfigStore();
    const tokenSetting = await configStore.fetchSetting('KOTH_NIGHTBOT_TOKEN');
    
    if (!tokenSetting || !tokenSetting.value) {
      signupError.value = 'Signup is currently unavailable. Please contact an administrator.';
      return;
    }
    
    await kothStore.createPublicSignup({
      token: tokenSetting.value,
      twitch_username: signupForm.value.twitch_username || null,
      battle_tag: signupForm.value.battle_tag,
      race: signupForm.value.race || null,
    });
    
    signupSuccess.value = 'Successfully signed up! You have been added to the brackets.';
    
    // Refresh data to show new signup
    await loadDashboardData();
    
    // Close dialog after 2 seconds
    setTimeout(() => {
      closeSignupDialog();
    }, 2000);
  } catch (error) {
    signupError.value = error.message || 'Failed to sign up. Please try again.';
  }
}
</script>

<style scoped>
.koth-dashboard-wrapper {
  background: #f5f5f5;
  min-height: 100vh;
}

.koth-dashboard {
  min-height: 100vh;
}

.loading-overlay {
  z-index: 999;
}

.bracket-card {
  background: rgba(255, 255, 255, 0.95) !important;
  border-radius: 16px !important;
  overflow: hidden;
  transition: transform 0.2s;
}

.bracket-card:hover {
  transform: translateY(-4px);
}

.bracket-1 .bracket-header {
  background: linear-gradient(135deg, #4caf50 0%, #66bb6a 100%);
  color: white;
}

.bracket-2 .bracket-header {
  background: linear-gradient(135deg, #2196f3 0%, #42a5f5 100%);
  color: white;
}

.bracket-3 .bracket-header {
  background: linear-gradient(135deg, #ff9800 0%, #ffa726 100%);
  color: white;
}

.king-card {
  background: rgba(255, 255, 255, 0.8) !important;
  border: 2px solid #ffc107 !important;
  border-radius: 8px !important;
}

.players-section {
  max-height: 500px;
  overflow-y: auto;
}

.players-list {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.player-item {
  background: rgba(255, 255, 255, 0.5);
  border-radius: 6px;
  transition: background 0.2s;
}

.player-item:hover {
  background: rgba(255, 255, 255, 0.7);
}

.player-item {
  padding: 4px 8px;
  border-radius: 4px;
  background: rgba(255, 255, 255, 0.6);
}

.race-row {
  padding-left: 26px;
}

.signup-btn {
  font-size: 1.1rem !important;
  padding: 28px 40px !important;
  border-radius: 50px !important;
  font-weight: 600;
  letter-spacing: 0.5px;
  transition: all 0.3s ease;
  display: inline-flex !important;
  align-items: center !important;
  justify-content: center !important;
}

.signup-btn:hover {
  transform: translateY(-3px);
  box-shadow: 0 12px 32px rgba(0, 0, 0, 0.35) !important;
}
</style>
