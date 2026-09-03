<template>
  <span class="player-name" :class="{ link: !!$attrs.onClick || linked }" @click="linked && $router.push(`/player/${player.id}`)">
    <RaceIcon v-if="race" :raceIdentifier="race" />
    <FlagIcon v-if="player.country" :countryIdentifier="player.country" />
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
.link {
  cursor: pointer;
  transition: color 0.2s;
}
.link:hover {
  color: rgb(var(--v-theme-primary));
  text-decoration: underline;
}
</style>
