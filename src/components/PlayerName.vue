<template>
  <span class="player-name" :class="{ link: !!$attrs.onClick }">
    <RaceIcon v-if="race" :raceIdentifier="race" />
    <FlagIcon v-if="player.country" :countryIdentifier="player.country" />
    {{ player.name }}
    <v-chip v-if="host" size="x-small" variant="tonal" color="primary">Host</v-chip>
    <slot />
  </span>
</template>

<script setup>
defineProps({
  player: { type: Object, required: true }, // needs name, country
  race: String, // the race for this (race, player) pair; omit to show none
  host: Boolean,
})
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
