<!-- The player profile at its own address. The same profile opens as a panel
     over any other page, so this page serves typed and shared links. -->
<template>
  <v-container fluid class="pa-4">
    <PlayerProfile :playerKey="playerKey" @loaded="addressTheTag" />
  </v-container>
</template>

<script setup>
import { computed } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { playerPath } from '@/helpers/players';
import PlayerProfile from '@/components/PlayerProfile.vue';

const route = useRoute();
const router = useRouter();

// A typed /player/thanks#11187 arrives as path + hash, so the key rejoins them
const playerKey = computed(() => route.params.id + route.hash);

// The tag is the address: an id link, and a saved tag change, rewrite it
const addressTheTag = (player) => {
  const path = playerPath(player);
  if (route.fullPath !== path) router.replace(path);
};
</script>
