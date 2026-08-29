<template>
    <v-container fluid class="pa-4 d-flex align-center justify-center" style="min-height: 80vh;">
        <v-card elevation="2" max-width="500" width="100%">
            <v-card-title class="bg-primary">
                <v-icon class="mr-2">mdi-lock</v-icon>
                GNL Login
            </v-card-title>

            <v-card-text class="pt-6">
                <!-- Clerk's sign-in draws the strategies the dashboard enables; Discord is the only one -->
                <v-btn
                    v-if="route.query.legacy !== '1'"
                    color="#5865F2"
                    class="text-white"
                    variant="elevated"
                    block
                    size="large"
                    prepend-icon="mdi-discord"
                    @click="clerk?.openSignIn()"
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
    </v-container>
</template>

<script setup>
import { ref } from 'vue';
import { useRoute } from 'vue-router';
import { useClerk } from '@clerk/vue';

import { useAuthStore } from '@/stores';

const route = useRoute();  // ?legacy=1 shows the admin-token form as a break-glass login
const clerk = useClerk();
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
