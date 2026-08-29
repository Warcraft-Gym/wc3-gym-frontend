<script setup>
import { ref } from 'vue';

import { useAuthStore } from '@/stores';

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

<template>
    <v-container fluid class="pa-4 d-flex align-center justify-center" style="min-height: 80vh;">
        <v-card elevation="2" max-width="500" width="100%">
            <v-card-title class="bg-primary">
                <v-icon class="mr-2">mdi-lock</v-icon>
                Admin Login
            </v-card-title>

            <v-card-text class="pt-6">
                <form novalidate @submit.prevent="onSubmit">
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
