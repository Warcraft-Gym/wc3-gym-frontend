<script setup>
import { ref, onMounted } from 'vue';

import { useAuthStore, useConfigStore } from '@/stores';

const NO_MEMBERSHIP = 'No valid WC3 Gym server membership found for user';

const authStore = useAuthStore();
const inviteUrl = ref(null);
const message = ref(NO_MEMBERSHIP);
const checking = ref(false);

onMounted(async () => {
    const settings = await useConfigStore().fetchSettings().catch(() => []);
    inviteUrl.value = settings.find(s => s.key === 'discord_invite_url')?.value || null;
});

// the backend reads the Discord role on every request, so /me alone re-checks the membership
const checkAgain = async () => {
    checking.value = true;
    message.value = null;
    try {
        await authStore.fetchMe();  // a member answer unmounts this card
        message.value = NO_MEMBERSHIP;
    } catch (e) {
        message.value = e.message;
    } finally {
        checking.value = false;
    }
};
</script>

<template>
    <v-card elevation="2" max-width="500" width="100%">
        <v-card-title class="bg-primary">Join the WC3 Gym Discord</v-card-title>
        <v-card-text class="pt-6">
            <v-alert v-if="message" type="error" variant="tonal" border="start">{{ message }}</v-alert>
            <v-btn v-if="inviteUrl" :href="inviteUrl" target="_blank" color="#5865F2" class="text-white mt-4 mr-2">Join the Discord</v-btn>
            <v-btn color="primary" variant="text" class="mt-4" :loading="checking" @click="checkAgain">Check again</v-btn>
        </v-card-text>
    </v-card>
</template>
