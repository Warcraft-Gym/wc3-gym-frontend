<template>
  <component
    :is="to ? RouterLink : 'span'"
    :to="to"
    class="player-name"
    :class="{ link: !!$attrs.onClick || clickable, 'panel-link': opensPanel }"
    :title="opensPanel ? 'Opens in a side panel' : undefined"
    @click="opensPanel && openPlayer(player)"
  >
    <RaceIcon v-if="race" :raceIdentifier="race" />
    <span v-else-if="race !== undefined" class="fp race-gap" />
    <FlagIcon v-if="player.country" :countryIdentifier="player.country" />
    <span v-else class="fp" />
    {{ player.name }}
    <v-icon v-if="opensPanel" class="panel-cue" size="16" aria-label="Opens in a side panel">mdi-dock-right</v-icon>
    <v-chip v-if="offRace" size="x-small" variant="tonal" color="warning" :title="offRaceHint">off-race</v-chip>
    <v-chip v-if="host" size="x-small" variant="tonal" color="primary">Host</v-chip>
    <slot />
  </component>
</template>

<script setup>
import { computed, inject, useAttrs } from 'vue'
import { RouterLink } from 'vue-router'
import { openPlayer, panelLinks, playerPath } from '@/helpers/players'
import { raceWrapper } from '@/helpers/races.js'

const props = defineProps({
  player: { type: Object, required: true }, // needs name, country
  race: String, // the race for this (race, player) pair; omit to show none
  host: Boolean,
})

// A series where the player played another race marks him, so a reader on a
// phone sees the exception without hovering anything
const offRace = computed(
  () => !!props.race && !!props.player.signup_race && props.race !== props.player.signup_race
)
const offRaceHint = computed(
  () => `Signed up as ${raceWrapper.getRaceObject(props.player.signup_race)?.name || props.player.signup_race}`
)

// The name links to the player page, unless the view handles the click. On a
// drafting page and inside the panel it opens the panel instead, and the dock
// icon says so before the click.
const attrs = useAttrs()
const inPanelMode = inject(panelLinks, false)
const clickable = computed(() => !attrs.onClick && props.player.id != null)
const opensPanel = computed(() => clickable.value && inPanelMode)
const to = computed(() => (clickable.value && !inPanelMode ? playerPath(props.player) : null))
</script>

<style scoped>
.player-name {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  white-space: nowrap;
  color: inherit;
  text-decoration: none;
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
/* the cue is always coloured, so a reader knows before the click that the page stays */
.panel-cue {
  color: rgb(var(--v-theme-primary));
  margin-left: -2px;
}
</style>
