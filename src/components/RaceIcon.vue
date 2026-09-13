<template>
    <v-tooltip
        v-if="currentRace"
        location="top"
        :text="currentRace.name">
        <template v-slot:activator="{ props }">
            <v-avatar
            v-bind="props"
            role="img"
            :aria-label="currentRace.name"
            rounded="0"
            :size="size">
                <!-- eager: v-avatar's own image prop waits for an intersection, so the printed report loses the icons -->
                <v-img :src="currentRace.icon" alt="" cover eager />
            </v-avatar>
        </template>
    </v-tooltip>
</template>

<script setup>
import { computed } from 'vue'
import { raceWrapper } from '@/helpers/races.js'

// 1.4em keeps the icon in step with the flag sprite, which also scales with the font
const props = defineProps({
    raceIdentifier: String,
    size: { type: [String, Number], default: '1.4em' },
})
const currentRace = computed(() => raceWrapper.getRaceObject(props.raceIdentifier))
</script>
