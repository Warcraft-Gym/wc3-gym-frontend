<script setup>
import { storeToRefs } from 'pinia';

import { useAuthStore } from '@/stores';
import DiscordJoinCard from '@/components/DiscordJoinCard.vue';
import PlayerDashboardView from './PlayerDashboardView.vue';
import PublicSignupView from './PublicSignupView.vue';

const { me } = storeToRefs(useAuthStore());
</script>

<template>
    <v-container v-if="me?.role === 'guest'" fluid class="pa-4 d-flex align-center justify-center" style="min-height: 80vh;">
        <DiscordJoinCard />
    </v-container>
    <!-- a member with no linked users row signs up before the dashboard has anything to show -->
    <PublicSignupView v-else-if="me && !me.user" />
    <PlayerDashboardView v-else-if="me" />
</template>
