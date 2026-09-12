<template>
    <v-tooltip
        v-if="currentRace"
        location="top"
        :text="currentRace.name">
        <template v-slot:activator="{ props }">
            <v-avatar
            v-bind="props"
            rounded="0"
            :size="size">
            <!-- eager: the icon is a bundled file, and a lazy one stays blank inside a
                 scrolling container until the reader scrolls -->
            <v-img :src="currentRace.icon" :alt="currentRace.name" eager />
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
