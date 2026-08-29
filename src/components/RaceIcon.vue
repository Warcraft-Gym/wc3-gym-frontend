<template>
    <v-tooltip
        v-if="currentRace"
        location="top"
        :text="currentRace.name">
        <template v-slot:activator="{ props }">
            <v-avatar
            v-bind="props"
            :image="currentRace.icon"
            rounded="0"
            :size="size">
            </v-avatar>
        </template>
    </v-tooltip>
</template>

<script setup>
import { computed } from 'vue'
import { raceWrapper } from '@/helpers/races.js'

const props = defineProps({
    raceIdentifier: String,
    size: { type: [String, Number], default: 'x-small' },
})
const currentRace = computed(() => raceWrapper.getRaceObject(props.raceIdentifier))
</script>
