<script setup>
import { ref, onMounted } from 'vue';
import { storeToRefs } from 'pinia';

import { useAuthStore, useConfigStore } from '@/stores';
import PlayerDashboardView from './PlayerDashboardView.vue';
import PublicSignupView from './PublicSignupView.vue';

const authStore = useAuthStore();
const { me } = storeToRefs(authStore);
const inviteUrl = ref(null);

onMounted(async () => {
    if (me.value?.role !== 'guest') return;
    const settings = await useConfigStore().fetchSettings().catch(() => []);
    inviteUrl.value = settings.find(s => s.key === 'discord_invite_url')?.value || null;
});
</script>

<template>
    <!-- the roles are read from Discord at login, so a new member checks again by logging in again -->
    <v-container v-if="me?.role === 'guest'" fluid class="pa-4 d-flex align-center justify-center" style="min-height: 80vh;">
        <v-card elevation="2" max-width="500" width="100%">
            <v-card-title class="bg-primary">Join the WC3 Gym Discord</v-card-title>
            <v-card-text class="pt-6">
                <v-alert type="error" variant="tonal" border="start">No valid WC3 Gym server membership found for user</v-alert>
                <v-btn v-if="inviteUrl" :href="inviteUrl" target="_blank" color="#5865F2" class="text-white mt-4 mr-2">Join the Discord</v-btn>
                <v-btn color="primary" variant="text" class="mt-4" @click="authStore.logout()">Check again</v-btn>
            </v-card-text>
        </v-card>
    </v-container>
    <!-- a member with no linked users row signs up before the dashboard has anything to show -->
    <PublicSignupView v-else-if="!me?.user" />
    <PlayerDashboardView v-else />
</template>
