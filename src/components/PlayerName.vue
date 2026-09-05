<template>
  <span class="player-name" :class="{ link: !!$attrs.onClick || linked }" @click="linked && $router.push(`/player/${player.id}`)">
    <RaceIcon v-if="race" :raceIdentifier="race" />
    <span v-else-if="race !== undefined" class="fp race-gap" />
    <FlagIcon v-if="player.country" :countryIdentifier="player.country" />
    <span v-else class="fp" />
    {{ player.name }}
    <v-chip v-if="host" size="x-small" variant="tonal" color="primary">Host</v-chip>
    <slot />
  </span>
</template>

<script setup>
import { computed, useAttrs } from 'vue'

const props = defineProps({
  player: { type: Object, required: true }, // needs name, country
  race: String, // the race for this (race, player) pair; omit to show none
  host: Boolean,
})

// The name opens the player page, unless the view handles the click itself
const attrs = useAttrs()
const linked = computed(() => !attrs.onClick && props.player.id != null)
</script>

<style scoped>
.player-name {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  white-space: nowrap;
}
/* A missing icon leaves an empty flag box (same size and baseline), so names line up in a column. */
.race-gap { width: 1.4em; }
.link {
  cursor: pointer;
  transition: color 0.2s;
}
.link:hover {
  color: rgb(var(--v-theme-primary));
  text-decoration: underline;
}
</style>
