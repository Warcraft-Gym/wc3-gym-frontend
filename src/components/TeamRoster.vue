<!-- The roster of one team in one event: its captains, then its members. Both team
     pages draw these two cards; a page that edits the roster fills the slots with
     its own controls and keeps the plain lists everywhere else. -->
<template>
  <v-card elevation="2" class="mb-4">
    <v-card-title class="bg-primary d-flex align-center">
      <v-icon class="mr-2">mdi-shield-star</v-icon>
      <span>Captains</span>
    </v-card-title>
    <slot name="captains-actions" />
    <v-card-text>
      <slot name="captains" :captains="captains">
        <div v-if="captains.length" class="d-flex flex-wrap ga-3">
          <PlayerName v-for="captain in captains" :key="captain.id" :player="captain" />
        </div>
        <div v-else class="text-medium-emphasis">No captains recorded for this season.</div>
      </slot>
    </v-card-text>
  </v-card>

  <v-card elevation="2">
    <v-card-title class="bg-primary d-flex align-center">
      <v-icon class="mr-2">mdi-account-group</v-icon>
      <span>Members</span>
    </v-card-title>
    <slot name="members" :members="members">
      <v-card-text>
        <div v-if="members.length" class="d-flex flex-wrap ga-3">
          <PlayerName v-for="member in members" :key="member.id" :player="member" :race="member.signup_race" />
        </div>
        <div v-else class="text-medium-emphasis">No members recorded for this season.</div>
      </v-card-text>
    </slot>
  </v-card>
</template>

<script setup>
defineProps({
  captains: { type: Array, default: () => [] },
  members: { type: Array, default: () => [] },
});
</script>
