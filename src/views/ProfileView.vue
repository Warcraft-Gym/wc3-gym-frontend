<script setup>
import { computed, watch } from 'vue';
import { useRouter } from 'vue-router';
import { storeToRefs } from 'pinia';

import { useAuthStore } from '@/stores';
import { profileState } from '@/helpers/profile.mjs';
import { playerPath } from '@/helpers/players';
import DiscordJoinCard from '@/components/DiscordJoinCard.vue';
import PublicSignupView from './PublicSignupView.vue';

const router = useRouter();
const { me } = storeToRefs(useAuthStore());
const state = computed(() => profileState(me.value));
// a member with a player row reads his profile at his own player page
watch(state, (now) => { if (now === 'dashboard') router.replace(playerPath(me.value.user)); }, { immediate: true });
</script>

<template>
    <v-container v-if="state === 'guest'" fluid class="pa-4 d-flex align-center justify-center" style="min-height: 80vh;">
        <DiscordJoinCard />
    </v-container>
    <PublicSignupView v-else-if="state === 'signup'" />
</template>
