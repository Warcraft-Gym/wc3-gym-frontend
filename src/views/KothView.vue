<template>
  <v-container fluid class="pa-4">
    <v-row class="mb-4">
      <v-col>
        <h1 class="text-h3 font-weight-bold">
          <v-icon class="mr-2" size="large">mdi-crown</v-icon>
          King of the Hill Management
        </h1>
      </v-col>
    </v-row>

    <v-overlay v-model="isLoading" persistent class="loading-overlay">
      <v-progress-circular indeterminate size="64" width="8" color="primary" />
    </v-overlay>

    <!-- Error Message -->
    <v-alert v-if="errorMessage" type="error" variant="tonal" class="mb-4" closable @click:close="errorMessage = null">
      {{ errorMessage }}
    </v-alert>

    <!-- Success Message -->
    <v-alert v-if="successMessage" type="success" variant="tonal" class="mb-4" closable @click:close="successMessage = null">
      {{ successMessage }}
    </v-alert>

    <!-- Event Selection and Info -->
    <v-expansion-panels class="mb-4">
      <v-expansion-panel elevation="2">
        <v-expansion-panel-title class="bg-primary">
          <v-icon class="mr-2">mdi-trophy</v-icon>
          Event Management
        </v-expansion-panel-title>
        
        <v-expansion-panel-text class="pa-4">
          <v-row>
            <v-col cols="12" md="6">
              <v-select
                v-model="selectedEventId"
                :items="events"
                item-title="name"
                item-value="id"
                label="Select Event"
                variant="outlined"
                density="comfortable"
                prepend-inner-icon="mdi-calendar"
                @update:model-value="loadEventData"
              >
                <template #item="{ props, item }">
                  <v-list-item v-bind="props">
                    <template #prepend>
                      <v-icon v-if="item.raw.is_active" color="success">mdi-check-circle</v-icon>
                      <v-icon v-else color="grey">mdi-circle-outline</v-icon>
                    </template>
                  </v-list-item>
                </template>
              </v-select>
            </v-col>
            <v-col cols="12" md="6" class="d-flex gap-2 flex-wrap">
              <v-btn variant="elevated" color="primary" prepend-icon="mdi-plus" @click="openCreateEventDialog">
                New Event
              </v-btn>
              <v-btn v-if="selectedEvent" variant="outlined" color="secondary" prepend-icon="mdi-pencil" @click="openEditEventDialog">
                Edit Event
              </v-btn>
              <v-btn v-if="selectedEvent && !selectedEvent.is_active" variant="outlined" color="success" prepend-icon="mdi-check" @click="activateEvent">
                Activate
              </v-btn>
              <v-btn v-if="selectedEvent && selectedEvent.is_active" variant="outlined" color="warning" prepend-icon="mdi-pause" @click="deactivateEvent">
                Deactivate
              </v-btn>
              <v-btn v-if="selectedEvent" variant="outlined" color="error" prepend-icon="mdi-delete" @click="confirmDeleteEvent">
                Delete
              </v-btn>
            </v-col>
          </v-row>

          <v-divider v-if="selectedEvent" class="my-4"></v-divider>

          <v-row v-if="selectedEvent">
            <v-col cols="12" md="4">
              <div class="text-subtitle-2 text-grey">Event Date</div>
              <div class="mt-2">{{ formatEventDate(selectedEvent.event_date) }}</div>
            </v-col>
            <v-col cols="12" md="4">
              <div class="text-subtitle-2 text-grey">Bracket Thresholds</div>
              <div class="mt-2">
                <div><strong>Bracket 1:</strong> &lt; {{ selectedEvent.bracket_1_threshold }} MMR</div>
                <div><strong>Bracket 2:</strong> {{ selectedEvent.bracket_1_threshold }} - {{ selectedEvent.bracket_2_threshold - 1 }} MMR</div>
                <div><strong>Bracket 3:</strong> ≥ {{ selectedEvent.bracket_2_threshold }} MMR</div>
              </div>
            </v-col>
            <v-col cols="12" md="4">
              <div class="text-subtitle-2 text-grey">Total Signups</div>
              <div class="text-h4 mt-2">{{ activeSignups.length }}</div>
            </v-col>
          </v-row>
        </v-expansion-panel-text>
      </v-expansion-panel>
    </v-expansion-panels>

    <!-- Add Signup Button -->
    <div v-if="selectedEvent" class="text-center mb-6">
      <v-btn
        color="primary"
        size="large"
        class="signup-btn"
        elevation="4"
        @click="openAddSignupDialog"
      >
        <v-icon start>mdi-account-plus</v-icon>
        Add Player Signup
      </v-btn>
    </div>

    <!-- Brackets View -->
    <template v-if="selectedEvent">
      <v-row>
        <v-col v-for="bracket in [1, 2, 3]" :key="bracket" cols="12" md="4">
          <v-card elevation="2" class="bracket-card">
            <v-card-title :class="`bg-${getBracketColor(bracket)} text-white`">
              <v-icon class="mr-2">mdi-trophy</v-icon>
              Bracket {{ bracket }}
            </v-card-title>
            
            <v-card-subtitle class="pa-3 text-subtitle-2">
              {{ getBracketThresholdText(bracket) }}
            </v-card-subtitle>
            
            <v-divider></v-divider>
            
            <v-card-text class="pa-3">
              <!-- Kings Section -->
              <div v-if="kings[bracket] && kings[bracket].length > 0" class="mb-4 pa-3 king-section">
                <div class="d-flex align-center mb-2">
                  <v-icon color="warning" class="mr-2">mdi-crown</v-icon>
                  <span class="text-subtitle-2 font-weight-bold">King{{ kings[bracket].length > 1 ? 's' : '' }}</span>
                </div>
                <div v-for="king in kings[bracket]" :key="king.id" class="king-item pa-2 mb-2">
                  <div class="d-flex align-center justify-space-between">
                    <div class="flex-grow-1">
                      <PlayerName class="font-weight-bold" :player="{ name: king.twitch_username || king.battle_tag, country: king.country }" :race="king.race" />
                      <div class="text-caption text-grey">{{ king.mmr }} MMR</div>
                    </div>
                    <v-btn size="small" variant="tonal" color="error" @click="removeKing(king.id)" title="Remove King">
                      <v-icon>mdi-close-circle</v-icon>
                    </v-btn>
                  </div>
                </div>
              </div>
              <div v-else class="text-center pa-3 mb-4 no-king-section">
                <v-icon size="32" color="grey-lighten-1">mdi-crown-outline</v-icon>
                <div class="text-caption text-grey mt-1">No King Yet</div>
              </div>
              
              <v-divider class="my-3"></v-divider>
              
              <!-- Players List -->
              <div class="text-subtitle-2 mb-2 d-flex align-center justify-space-between">
                <span>Players ({{ getBracketSignups(bracket).filter(s => !s.is_king).length }})</span>
              </div>
              
              <div v-if="getBracketSignups(bracket).filter(s => !s.is_king).length > 0" class="players-list">
                <div
                  v-for="signup in getBracketSignups(bracket).filter(s => !s.is_king)"
                  :key="signup.id"
                  class="player-item pa-2 mb-1"
                >
                  <div class="d-flex align-center justify-space-between">
                    <div class="flex-grow-1">
                      <PlayerName class="text-body-2 font-weight-medium" :player="{ name: signup.twitch_username || signup.battle_tag, country: signup.country }" :race="signup.race" />
                      <div class="text-caption text-grey">{{ signup.mmr }} MMR</div>
                    </div>
                    <div class="d-flex gap-1">
                      <v-btn icon="mdi-crown" size="x-small" variant="tonal" color="warning" @click="setAsKing(signup.id)" title="Make King"></v-btn>
                      <v-btn icon="mdi-delete" size="x-small" variant="tonal" color="error" @click="deleteSignup(signup.id)" title="Remove from bracket"></v-btn>
                    </div>
                  </div>
                </div>
              </div>
              <div v-else class="text-center pa-4 text-grey-lighten-1">
                <v-icon size="40">mdi-account-off</v-icon>
                <div class="text-caption mt-2">No players signed up</div>
              </div>
            </v-card-text>
          </v-card>
        </v-col>
      </v-row>
    </template>

    <div v-else class="text-center pa-8">
      <v-icon size="80" color="grey-lighten-1">mdi-trophy-outline</v-icon>
      <div class="text-h5 mt-4 text-grey">No Event Selected</div>
      <div class="text-body-2 text-grey mt-2">Create or select an event to manage brackets and players</div>
      <v-btn color="primary" variant="elevated" class="mt-4" prepend-icon="mdi-plus" @click="openCreateEventDialog">
        Create Event
      </v-btn>
    </div>

    <!-- Create/Edit Event Dialog -->
    <v-dialog v-model="showEventDialog" max-width="600px" persistent>
      <v-card>
        <v-card-title class="bg-primary">
          <v-icon class="mr-2">{{ editingEvent ? 'mdi-pencil' : 'mdi-plus-circle' }}</v-icon>
          {{ editingEvent ? 'Edit Event' : 'Create Event' }}
        </v-card-title>
        
        <v-card-text class="pt-4">
          <v-row dense>
            <v-col cols="12">
              <v-text-field
                v-model="eventForm.name"
                label="Event Name"
                variant="outlined"
                density="comfortable"
                prepend-inner-icon="mdi-trophy"
              />
            </v-col>
            <v-col cols="12">
              <v-textarea
                v-model="eventForm.description"
                label="Description"
                variant="outlined"
                density="comfortable"
                rows="3"
                prepend-inner-icon="mdi-text"
              />
            </v-col>
            <v-col cols="12">
              <v-text-field
                v-model="eventForm.event_date"
                label="Event Date"
                type="date"
                variant="outlined"
                density="comfortable"
                prepend-inner-icon="mdi-calendar"
                hint="Date of the event"
                persistent-hint
              />
            </v-col>
            <v-col cols="12" md="6">
              <v-text-field
                v-model.number="eventForm.bracket_1_threshold"
                label="Bracket 1 Threshold"
                type="number"
                variant="outlined"
                density="comfortable"
                hint="MMR below this value"
                persistent-hint
              />
            </v-col>
            <v-col cols="12" md="6">
              <v-text-field
                v-model.number="eventForm.bracket_2_threshold"
                label="Bracket 2 Threshold"
                type="number"
                variant="outlined"
                density="comfortable"
                hint="MMR below this value (Bracket 3 is above)"
                persistent-hint
              />
            </v-col>
          </v-row>
        </v-card-text>
        
        <v-card-actions class="px-4 py-3">
          <v-spacer></v-spacer>
          <v-btn variant="text" @click="closeEventDialog">Cancel</v-btn>
          <v-btn color="primary" prepend-icon="mdi-check" @click="saveEvent">
            {{ editingEvent ? 'Update' : 'Create' }}
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <!-- Add Signup Dialog -->
    <v-dialog v-model="showAddSignupDialog" max-width="500px" persistent>
      <v-card>
        <v-card-title class="bg-primary">
          <v-icon class="mr-2">mdi-account-plus</v-icon>
          Add Player Signup
        </v-card-title>
        
        <v-card-text class="pt-4">
          <v-row dense>
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
                hint="Optional. Player's Twitch username"
                persistent-hint
              />
            </v-col>
            <v-col cols="12">
              <RaceSelect v-model="signupForm.race" />
            </v-col>
          </v-row>
          
          <v-alert v-if="signupError" type="error" variant="tonal" class="mt-4" closable @click:close="signupError = null">
            {{ signupError }}
          </v-alert>
        </v-card-text>
        
        <v-card-actions class="px-4 py-3">
          <v-spacer></v-spacer>
          <v-btn variant="text" @click="closeAddSignupDialog">Cancel</v-btn>
          <v-btn 
            color="primary" 
            prepend-icon="mdi-check" 
            @click="saveSignup"
            :disabled="!signupForm.battle_tag"
          >
            Add Signup
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <!-- Delete Event Confirmation Dialog -->
    <v-dialog v-model="showDeleteDialog" max-width="500px" persistent>
      <v-card>
        <v-card-title class="bg-error text-white">
          <v-icon class="mr-2" color="white">mdi-alert</v-icon>
          Confirm Delete Event
        </v-card-title>
        
        <v-card-text class="pt-4">
          <p class="text-h6 mb-2">Are you sure you want to delete this event?</p>
          <p class="text-body-2 text-grey">
            This will permanently delete:
          </p>
          <ul class="text-body-2 text-grey mt-2">
            <li>Event: <strong>{{ selectedEvent?.name }}</strong></li>
            <li>All signups ({{ activeSignups.length }})</li>
          </ul>
          <v-alert type="warning" variant="tonal" class="mt-4">
            <strong>This action cannot be undone!</strong>
          </v-alert>
        </v-card-text>
        
        <v-card-actions class="px-4 py-3">
          <v-spacer></v-spacer>
          <v-btn variant="text" @click="showDeleteDialog = false">Cancel</v-btn>
          <v-btn 
            color="error" 
            prepend-icon="mdi-delete" 
            @click="deleteEvent"
          >
            Delete Event
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>
  </v-container>
</template>

<script setup>
import { DateTime } from 'luxon';
import { ref, computed, onMounted } from 'vue';
import { useKothStore } from '@/stores';
import { storeToRefs } from 'pinia';


const kothStore = useKothStore();
const { events, signups, kings, isLoading } = storeToRefs(kothStore);

const errorMessage = ref(null);
const successMessage = ref(null);
const selectedEventId = ref(null);

// Event dialog
const showEventDialog = ref(false);
const editingEvent = ref(false);
const eventForm = ref({
  name: '',
  description: '',
  event_date: '',
  bracket_1_threshold: 1450,
  bracket_2_threshold: 1600,
});

// Add signup dialog
const showAddSignupDialog = ref(false);
const signupForm = ref({
  battle_tag: '',
  twitch_username: '',
  race: null,
});
const signupError = ref(null);

// Delete confirmation dialog
const showDeleteDialog = ref(false);

const selectedEvent = computed(() => {
  return events.value.find(e => e.id === selectedEventId.value);
});

const activeSignups = computed(() => {
  return signups.value.filter(s => s.is_active === 1);
});

onMounted(async () => {
  await loadEvents();
});

async function loadEvents() {
  try {
    errorMessage.value = null;
    await kothStore.fetchAllEvents();
    
    // Auto-select active event if exists
    const activeEvent = events.value.find(e => e.is_active);
    if (activeEvent) {
      selectedEventId.value = activeEvent.id;
      await loadEventData();
    }
  } catch (error) {
    errorMessage.value = `Failed to load events: ${error.message}`;
  }
}

async function loadEventData() {
  if (!selectedEventId.value) return;
  
  try {
    errorMessage.value = null;
    await Promise.all([
      kothStore.fetchSignups(selectedEventId.value),
      kothStore.fetchBracketKings(selectedEventId.value),
    ]);
  } catch (error) {
    errorMessage.value = `Failed to load event data: ${error.message}`;
  }
}

function openCreateEventDialog() {
  editingEvent.value = false;
  const today = new Date().toISOString().slice(0, 10);
  
  eventForm.value = {
    name: '',
    description: '',
    event_date: today,
    bracket_1_threshold: 1450,
    bracket_2_threshold: 1600,
  };
  showEventDialog.value = true;
}

function openEditEventDialog() {
  if (!selectedEvent.value) return;
  
  editingEvent.value = true;
  let eventDateLocal = '';
  if (selectedEvent.value.event_date) {
    eventDateLocal = selectedEvent.value.event_date.split('T')[0].split(' ')[0];
  }
  
  eventForm.value = {
    name: selectedEvent.value.name,
    description: selectedEvent.value.description,
    event_date: eventDateLocal,
    is_active: selectedEvent.value.is_active,
    bracket_1_threshold: selectedEvent.value.bracket_1_threshold,
    bracket_2_threshold: selectedEvent.value.bracket_2_threshold,
  };
  showEventDialog.value = true;
}

function closeEventDialog() {
  showEventDialog.value = false;
  eventForm.value = {
    name: '',
    description: '',
    event_date: '',
    bracket_1_threshold: 1450,
    bracket_2_threshold: 1600,
  };
}

async function saveEvent() {
  try {
    const eventData = { ...eventForm.value };
    // A blank date is left out; an explicit null is refused, the backend default applies
    if (eventForm.value.event_date) {
      eventData.event_date = eventForm.value.event_date + ' 00:00:00';
    } else {
      delete eventData.event_date;
    }
    
    if (!editingEvent.value && eventData.is_active === undefined) {
      eventData.is_active = false;
    }
    
    if (editingEvent.value) {
      await kothStore.updateEvent(selectedEventId.value, eventData);
      successMessage.value = 'Event updated successfully!';
    } else {
      const newEvent = await kothStore.createEvent(eventData);
      selectedEventId.value = newEvent.id;
      successMessage.value = 'Event created successfully!';
    }
    closeEventDialog();
    await loadEvents();
    
    if (selectedEventId.value) {
      await loadEventData();
    }
  } catch (error) {
    errorMessage.value = `Failed to save event: ${error.message}`;
  }
}

async function activateEvent() {
  try {
    await kothStore.activateEvent(selectedEventId.value);
    successMessage.value = 'Event activated successfully!';
    await loadEvents();
  } catch (error) {
    errorMessage.value = `Failed to activate event: ${error.message}`;
  }
}

async function deactivateEvent() {
  try {
    const eventData = {
      name: selectedEvent.value.name,
      description: selectedEvent.value.description,
      event_date: selectedEvent.value.event_date,
      bracket_1_threshold: selectedEvent.value.bracket_1_threshold,
      bracket_2_threshold: selectedEvent.value.bracket_2_threshold,
      is_active: false
    };
    await kothStore.updateEvent(selectedEventId.value, eventData);
    successMessage.value = 'Event deactivated successfully!';
    await loadEvents();
  } catch (error) {
    errorMessage.value = `Failed to deactivate event: ${error.message}`;
  }
}

function confirmDeleteEvent() {
  showDeleteDialog.value = true;
}

async function deleteEvent() {
  try {
    await kothStore.deleteEvent(selectedEventId.value);
    selectedEventId.value = null;
    showDeleteDialog.value = false;
    successMessage.value = 'Event deleted successfully!';
    await loadEvents();
  } catch (error) {
    errorMessage.value = `Failed to delete event: ${error.message}`;
  }
}

async function setAsKing(signupId) {
  try {
    // Find the signup to determine which bracket we're working with
    const newKingSignup = signups.value.find(s => s.id === signupId);
    if (!newKingSignup) return;
    
    const bracket = newKingSignup.bracket;
    
    // Find current king(s) in this bracket
    const currentKings = signups.value.filter(s => s.bracket === bracket && s.is_king === 1);
    
    // Set the new king
    await kothStore.setKing(signupId);
    
    // Delete the previous king(s) from the bracket
    for (const oldKing of currentKings) {
      if (oldKing.id !== signupId) {
        await kothStore.deleteSignup(oldKing.id);
      }
    }
    
    successMessage.value = 'Player set as King! Previous king removed from bracket.';
    await loadEventData();
  } catch (error) {
    errorMessage.value = `Failed to set king: ${error.message}`;
  }
}

async function removeKing(signupId) {
  try {
    await kothStore.unsetKing(signupId);
    successMessage.value = 'King status removed successfully!';
    await loadEventData();
  } catch (error) {
    errorMessage.value = `Failed to remove king: ${error.message}`;
  }
}

async function deleteSignup(signupId) {
  if (!confirm('Are you sure you want to remove this player from the bracket?')) return;
  
  try {
    await kothStore.deleteSignup(signupId);
    successMessage.value = 'Player removed from bracket successfully!';
    await loadEventData();
  } catch (error) {
    errorMessage.value = `Failed to delete signup: ${error.message}`;
  }
}

function openAddSignupDialog() {
  if (!selectedEventId.value) {
    errorMessage.value = 'Please select an event first';
    return;
  }
  
  signupForm.value = {
    battle_tag: '',
    twitch_username: '',
    race: null,
  };
  signupError.value = null;
  showAddSignupDialog.value = true;
}

function closeAddSignupDialog() {
  showAddSignupDialog.value = false;
  signupForm.value = {
    battle_tag: '',
    twitch_username: '',
    race: null,
  };
  signupError.value = null;
}

async function saveSignup() {
  if (!signupForm.value.battle_tag) {
    signupError.value = 'BattleTag is required';
    return;
  }
  
  try {
    signupError.value = null;
    
    const raceMap = {
      'HU': 'human',
      'OC': 'orc',
      'UD': 'undead',
      'NE': 'nightelf',
      'RANDOM': 'random'
    };
    
    await kothStore.createSignup({
      event_id: selectedEventId.value,
      battle_tag: signupForm.value.battle_tag,
      twitch_username: signupForm.value.twitch_username || null,
      race: signupForm.value.race ? raceMap[signupForm.value.race] : null,
    });
    closeAddSignupDialog();
    successMessage.value = 'Player signup added successfully!';
    await loadEventData();
  } catch (error) {
    signupError.value = error.message || 'Failed to add signup';
  }
}

function getBracketColor(bracket) {
  const colors = { 1: 'success', 2: 'info', 3: 'warning' };
  return colors[bracket] || 'grey';
}

function getBracketThresholdText(bracket) {
  if (!selectedEvent.value) return '';
  const thresholds = kothStore.getBracketThresholdText(selectedEvent.value);
  return thresholds[bracket] || '';
}

function getBracketSignups(bracket) {
  return kothStore.getSignupsByBracket(bracket);
}

function formatEventDate(dateString) {
  if (!dateString) return 'Not set';
  return DateTime.fromISO(dateString, { zone: 'UTC' }).toFormat('ccc, LLL d, yyyy');
}
</script>

<style scoped>
.loading-overlay {
  z-index: 999;
}

.bracket-card {
  height: 100%;
  display: flex;
  flex-direction: column;
}

.king-section {
  background-color: rgba(255, 193, 7, 0.1);
  border-left: 4px solid #FFC107;
  border-radius: 4px;
}

.king-item {
  background: rgba(255, 255, 255, 0.9);
  border-radius: 4px;
  transition: background 0.2s;
}

.king-item:hover {
  background: rgba(255, 255, 255, 1);
}

.no-king-section {
  background-color: rgba(0, 0, 0, 0.02);
  border-radius: 4px;
}

.players-list {
  max-height: 500px;
  overflow-y: auto;
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


.player-item {
  background: rgba(0, 0, 0, 0.02);
  border-radius: 4px;
  transition: background 0.2s, transform 0.1s;
}

.player-item:hover {
  background: rgba(0, 0, 0, 0.04);
  transform: translateX(2px);
}
</style>
