<script setup>
import { Form, Field } from 'vee-validate';
import * as Yup from 'yup';

import { useAuthStore } from '@/stores';

const schema = Yup.object().shape({
    password: Yup.string().required('Password is required')
});

function onSubmit(values, { setErrors }) {
    const authStore = useAuthStore();
    const { password } = values;

    return authStore.login(password)
        .catch(error => setErrors({ apiError: error.message }));
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
                <Form @submit="onSubmit" :validation-schema="schema" v-slot="{ errors, isSubmitting }">
                    <Field name="password" v-slot="{ field, errors: fieldErrors }">
                        <v-text-field
                            v-bind="field"
                            label="Password"
                            type="password"
                            variant="outlined"
                            prepend-inner-icon="mdi-lock-outline"
                            :error-messages="fieldErrors"
                        />
                    </Field>
                    
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
                        v-if="errors.apiError"
                        type="error"
                        variant="tonal"
                        border="start"
                        border-color="red"
                        class="mt-4"
                    >
                        {{ errors.apiError }}
                    </v-alert>
                </Form>
            </v-card-text>
        </v-card>
    </v-container>
</template>
