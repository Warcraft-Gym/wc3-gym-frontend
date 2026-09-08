<template>
    <v-tooltip
        v-if="currentCountry"
        location="top"
        :text="currentCountry.name">
        <template v-slot:activator="{ props }">
            <span v-bind="props" :class="'fp '+ currentCountry.a2.toLowerCase()"></span>
        </template>
    </v-tooltip>
</template>

<script setup>
import { computed } from 'vue'
import { findCountry } from '@/helpers/countries.js'

const props = defineProps({ countryIdentifier: String })
const currentCountry = computed(() => findCountry(props.countryIdentifier))
</script>
