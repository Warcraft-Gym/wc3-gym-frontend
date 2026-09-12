<template>
  <div class="koth-dashboard-wrapper">
    <v-container fluid class="pa-6 koth-dashboard">
      <v-overlay v-model="initialLoad" persistent class="loading-overlay align-center justify-center">
        <v-progress-circular indeterminate size="64" width="8" color="primary" />
      </v-overlay>

      <!-- No event, or the load failed: this page has no app bar, so it must say so -->
      <div v-if="loadError || (!event && !initialLoad)" class="text-center py-8 text-body-1 text-medium-emphasis">
        {{ loadError || 'No King of the Hill night is running right now.' }}
      </div>

      <!-- Event Header -->
      <div v-if="event" class="text-center mb-8">
        <h1 class="text-h5 text-md-h2 font-weight-bold mb-2">
          <v-icon size="48" color="primary" class="mr-3">mdi-crown</v-icon>
          {{ event.name }}
        </h1>
        <p v-if="event.description" class="text-h6 text-medium-emphasis">{{ event.description }}</p>
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
        <v-btn
          v-if="mySignups.length"
          color="error"
          variant="tonal"
          size="large"
          class="ml-3"
          :loading="isWithdrawing"
          @click="showWithdrawConfirm = true"
        >
          <v-icon start>mdi-account-minus</v-icon>
          Withdraw
        </v-btn>
      </div>

    <!-- Brackets Grid -->
    <v-row v-if="event" class="mb-8">
      <v-col v-for="bracket in [1, 2, 3]" :key="bracket" cols="12" md="4">
        <v-card elevation="8" class="bracket-card">
          <v-card-title class="bracket-header text-center py-4">
            <div class="d-flex align-center justify-center">
              <img :src="getBracketIcon(bracket)" alt="Bracket Icon" style="width: 60px; height: 60px;" class="mr-3" />
              <div class="text-h5 font-weight-bold">{{ kothStore.getBracketThresholdText(event)[bracket] || '' }}</div>
            </div>
          </v-card-title>
          
          <v-card-text class="pa-4">
            <!-- Kings Section -->
            <div v-if="kothStore.getBracketKings(bracket).length > 0" class="mb-4">
              <v-card 
                v-for="king in kothStore.getBracketKings(bracket)" 
                :key="king.id" 
                variant="outlined" 
                class="king-card mb-3 pa-4"
              >
                <v-row align="center" no-gutters>
                  <v-col>
                    <PlayerName class="text-h5 font-weight-bold" :player="kingPlayer(king)" :race="king.race" />
                    <div class="text-subtitle-1 text-medium-emphasis">{{ king.mmr }} MMR</div>
                  </v-col>
                  <v-col cols="auto">
                    <v-icon color="primary" size="56">mdi-crown</v-icon>
                  </v-col>
                </v-row>
              </v-card>
            </div>
            <div v-else class="text-center py-4 text-medium-emphasis">
              <v-icon size="56" class="text-disabled">mdi-crown-outline</v-icon>
              <div class="mt-2 text-body-1">No King Yet</div>
            </div>

            <v-divider class="my-4"></v-divider>

            <!-- Signed Up Players -->
            <div class="players-section">
              <div v-if="kothStore.getBracketPlayers(bracket).length > 0" class="players-list">
                <div
                  v-for="player in kothStore.getBracketPlayers(bracket)"
                  :key="player.battleTag"
                  class="player-item mb-2 pa-3"
                >
                  <PlayerName class="text-h6" :player="player" />
                  <div v-for="signup in player.signups" :key="signup.id" class="race-row d-flex align-center ga-2">
                    <RaceIcon v-if="signup.race" :raceIdentifier="signup.race" />
                    <span class="text-body-1 text-medium-emphasis">{{ signup.mmr }} MMR</span>
                  </div>
                </div>
              </div>
              <div v-else class="text-center py-4 text-medium-emphasis text-body-1">
                No players signed up
              </div>
            </div>
          </v-card-text>
        </v-card>
      </v-col>
    </v-row>

    <!-- Signup Dialog -->
    <ConfirmDeleteDialog
      v-model="showWithdrawConfirm"
      message="Withdraw all your signups from this event?"
      @confirm="withdraw"
      @cancel="showWithdrawConfirm = false"
    />

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
import { storeToRefs } from 'pinia';
import { useRoute } from 'vue-router';
import { kingPlayer } from '@/helpers/players.mjs';
import ConfirmDeleteDialog from '@/components/ConfirmDeleteDialog.vue';
import bracketSilverIcon from '@/assets/media/bracket-silver.png';
import bracketGoldIcon from '@/assets/media/bracket-gold.png';
import bracketDiamondIcon from '@/assets/media/bracket-diamond.png';


const route = useRoute();
const isCleanMode = computed(() => route.query.mode === 'clean');

const kothStore = useKothStore();
const authStore = useAuthStore();
const { activeEvent: event } = storeToRefs(kothStore);

// A logged-in player whose row carries a battle tag signs up from his profile
const profileBattleTag = computed(() => authStore.me?.user?.battleTag || null);

// the caller's own active signups on this event, by folded battle tag
const fold = (tag) => String(tag || '').trim().toLowerCase();
const mySignups = computed(() => (kothStore.signups || []).filter(
  (s) => s.is_active && profileBattleTag.value && fold(s.battle_tag) === fold(profileBattleTag.value)
));
const isWithdrawing = ref(false);
const showWithdrawConfirm = ref(false);

async function withdraw() {
  showWithdrawConfirm.value = false;
  isWithdrawing.value = true;
  try {
    await kothStore.withdrawMe();
    await loadDashboardData();
  } catch (error) {
    console.error('Failed to withdraw:', error);
  } finally {
    isWithdrawing.value = false;
  }
}

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
const loadError = ref(null);

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
    // The active event is the one the signup and the withdraw write to
    await kothStore.fetchActiveEvent();
    loadError.value = null;
  } catch (error) {
    // 404 means no event is active; anything else is a failure the 30 s retry may clear
    const noEvent = error.status === 404;
    loadError.value = noEvent ? null : 'Could not load the event — retrying.';
    if (noEvent) kothStore.$patch({ activeEvent: null, signups: [] });
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

    await kothStore.createPublicSignup({
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
  background: rgb(var(--v-theme-background));
  min-height: 100vh;
}

.koth-dashboard {
  min-height: 100vh;
}

.loading-overlay {
  z-index: 999;
}

.bracket-card {
  background: rgba(var(--v-theme-surface), 0.95) !important;
  border-radius: 16px !important;
  overflow: hidden;
  transition: transform 0.2s;
}

.bracket-card:hover {
  transform: translateY(-4px);
}

.bracket-header {
  background: rgb(var(--v-theme-primary));
  color: rgb(var(--v-theme-on-primary));
}

.king-card {
  background: rgba(var(--v-theme-surface), 0.8) !important;
  border: 2px solid rgb(var(--v-theme-primary)) !important;
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
  background: rgba(var(--v-theme-surface), 0.5);
  border-radius: 6px;
  transition: background 0.2s;
}

.player-item:hover {
  background: rgba(var(--v-theme-surface), 0.7);
}

.player-item {
  padding: 4px 8px;
  border-radius: 4px;
  background: rgba(var(--v-theme-surface), 0.6);
}

.race-row {
  padding-left: 26px;
}

</style>
