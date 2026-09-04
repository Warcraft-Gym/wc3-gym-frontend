<template>
    <v-container fluid class="pa-4 d-flex flex-column align-center justify-center" style="min-height: 80vh;">
        <v-card elevation="2" max-width="500" width="100%">
            <v-card-title class="bg-primary">
                <v-icon class="mr-2">mdi-lock</v-icon>
                GNL Login
            </v-card-title>

            <v-card-text class="pt-6">
                <!-- Discord's consent page comes back to /sso-callback, which Clerk finishes here;
                     a session that /me has not answered yet waits here too, so the button never flashes -->
                <div v-if="isCallback || isSignedIn" class="text-center py-4">
                    <v-progress-circular indeterminate color="primary" class="mb-3" />
                    <div>Signing you in…</div>
                    <AuthenticateWithRedirectCallback v-if="isCallback" sign-in-fallback-redirect-url="/login" sign-up-fallback-redirect-url="/login" />
                </div>
                <v-alert v-else-if="error || loginError" type="error" variant="tonal" border="start" class="mb-4">
                    {{ error || loginError }}
                    <template #append>
                        <v-btn variant="text" size="small" @click="reset">Reset and retry</v-btn>
                    </template>
                </v-alert>
                <v-btn
                    v-if="!isCallback && !isSignedIn"
                    class="discord-btn text-none"
                    variant="flat"
                    block
                    size="large"
                    :loading="isRedirecting || !isLoaded"
                    @click="loginWithDiscord"
                >
                    <svg class="discord-mark mr-3" viewBox="0 0 24 24" aria-hidden="true">
                        <path fill="currentColor" d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057 19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028c.462-.63.874-1.295 1.226-1.994a.076.076 0 0 0-.041-.106 13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.292.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.892.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03zM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.956-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.956 2.418-2.157 2.418zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.955-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.946 2.418-2.157 2.418z"/>
                    </svg>
                    Sign in with Discord
                </v-btn>
            </v-card-text>
        </v-card>

        <!-- a signed-in session with no guild membership is a guest, and reads why here -->
        <DiscordJoinCard v-if="me?.role === 'guest'" class="mt-4" />
    </v-container>
</template>

<script setup>
import { ref } from 'vue';
import { AuthenticateWithRedirectCallback, useAuth, useSignIn } from '@clerk/vue';
import { storeToRefs } from 'pinia';

import { useAuthStore } from '@/stores';
import DiscordJoinCard from '@/components/DiscordJoinCard.vue';

const authStore = useAuthStore();
const { me, loginError } = storeToRefs(authStore);
const { signIn } = useSignIn();
const { isLoaded, isSignedIn } = useAuth();
const onCallbackPath = () => window.location.pathname === '/sso-callback';
const isCallback = ref(onCallbackPath());
window.addEventListener('popstate', () => { isCallback.value = onCallbackPath(); });
const isRedirecting = ref(false);  // stays on until the browser leaves for Discord
const error = ref(null);
const REDIRECT_TIMEOUT = 15000;  // Discord not reached by then is a failure, not a slow network

const loginWithDiscord = async () => {
    isRedirecting.value = true;
    error.value = null;
    const timer = setTimeout(() => fail('Discord did not answer.'), REDIRECT_TIMEOUT);
    try {
        await signIn.value.authenticateWithRedirect({
            strategy: 'oauth_discord',
            redirectUrl: `${window.location.origin}/sso-callback`,
            redirectUrlComplete: `${window.location.origin}/login`,
        });
    } catch (e) {
        clearTimeout(timer);
        fail(e?.errors?.[0]?.longMessage || e?.message || 'Sign-in failed.');
    }
};
const fail = (message) => {
    isRedirecting.value = false;
    error.value = message;
};
// drop the session Clerk still holds, so the button comes back
const reset = () => {
    error.value = null;
    loginError.value = null;
    authStore.logout();
};
</script>

<style scoped>
/* Discord brand: blurple, white Clyde mark, sentence case */
.discord-btn {
    background-color: #5865F2;
    color: #fff;
    font-weight: 500;
    font-size: 16px;
    letter-spacing: 0;
    border-radius: 4px;
}
.discord-btn:hover {
    background-color: #4752C4;
}
.discord-mark {
    width: 24px;
    height: 24px;
}
</style>
