<script setup>
import { computed } from 'vue';
import { storeToRefs } from 'pinia';

import { useAuthStore } from '@/stores';
import { profileState } from '@/helpers/profile.mjs';
import DiscordJoinCard from '@/components/DiscordJoinCard.vue';
import PlayerDashboardView from './PlayerDashboardView.vue';
import PublicSignupView from './PublicSignupView.vue';

const { me } = storeToRefs(useAuthStore());
const state = computed(() => profileState(me.value));
</script>

<template>
    <v-container v-if="state === 'guest'" fluid class="pa-4 d-flex align-center justify-center" style="min-height: 80vh;">
        <DiscordJoinCard />
    </v-container>
    <PublicSignupView v-else-if="state === 'signup'" />
    <PlayerDashboardView v-else-if="state === 'dashboard'" />
</template>
