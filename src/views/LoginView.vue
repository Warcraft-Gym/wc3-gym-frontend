<template>
    <v-container fluid class="pa-4 d-flex flex-column align-center justify-center" style="min-height: 80vh;">
        <v-card elevation="2" max-width="500" width="100%">
            <v-card-title class="bg-primary">
                <v-icon class="mr-2">mdi-lock</v-icon>
                GNL Login
            </v-card-title>

            <v-card-text class="pt-6">
                <!-- Discord's consent page comes back to /sso-callback, which Clerk finishes here -->
                <div v-if="isCallback" class="text-center py-4">
                    <v-progress-circular indeterminate color="primary" class="mb-3" />
                    <div>Signing you in…</div>
                    <AuthenticateWithRedirectCallback sign-in-fallback-redirect-url="/#/login" />
                </div>
                <v-btn
                    v-else-if="route.query.legacy !== '1'"
                    color="#5865F2"
                    class="text-white"
                    variant="elevated"
                    block
                    size="large"
                    prepend-icon="mdi-discord"
                    :loading="isRedirecting"
                    @click="loginWithDiscord"
                >
                    Log in with Discord
                </v-btn>

                <form v-else novalidate @submit.prevent="onSubmit">
                    <v-text-field
                        ref="passwordField"
                        v-model="password"
                        name="password"
                        label="Password"
                        type="password"
                        variant="outlined"
                        prepend-inner-icon="mdi-lock-outline"
                        :rules="passwordRules"
                    />

                    <v-btn
                        type="submit"
                        color="primary"
                        variant="elevated"
                        block
                        size="large"
                        prepend-icon="mdi-login"
                        :loading="isSubmitting"
                        :disabled="isSubmitting"
                        class="mt-4"
                    >
                        Login
                    </v-btn>

                    <v-alert
                        v-if="apiError"
                        type="error"
                        variant="tonal"
                        border="start"
                        border-color="red"
                        class="mt-4"
                    >
                        {{ apiError }}
                    </v-alert>
                </form>
            </v-card-text>
        </v-card>

        <!-- a signed-in session with no guild membership is a guest, and reads why here -->
        <DiscordJoinCard v-if="me?.role === 'guest'" class="mt-4" />
    </v-container>
</template>

<script setup>
import { ref } from 'vue';
import { useRoute } from 'vue-router';
import { AuthenticateWithRedirectCallback, useSignIn } from '@clerk/vue';
import { storeToRefs } from 'pinia';

import { useAuthStore } from '@/stores';
import DiscordJoinCard from '@/components/DiscordJoinCard.vue';

const { me } = storeToRefs(useAuthStore());
const route = useRoute();  // ?legacy=1 shows the admin-token form as a break-glass login
const { signIn } = useSignIn();
const isCallback = window.location.pathname === '/sso-callback';
const isRedirecting = ref(false);  // stays on until the browser leaves for Discord
const loginWithDiscord = () => {
    isRedirecting.value = true;
    return signIn.value.authenticateWithRedirect({
        strategy: 'oauth_discord',
        redirectUrl: `${window.location.origin}/sso-callback`,
        redirectUrlComplete: `${window.location.origin}/#/login`,
    }).catch(() => { isRedirecting.value = false; });
};
const password = ref('');
const passwordField = ref(null);
const apiError = ref(null);
const isSubmitting = ref(false);
const passwordRules = [value => !!value || 'Password is required'];

async function onSubmit() {
    const authStore = useAuthStore();

    const errors = await passwordField.value.validate();
    if (errors.length) return;

    isSubmitting.value = true;
    try {
        await authStore.login(password.value);
    } catch (error) {
        apiError.value = error.message;
    } finally {
        isSubmitting.value = false;
    }
}
</script>
