<template>
    <v-autocomplete
        v-model="model"
        :label="label"
        :menu-props="{ scrollStrategy: 'close'}"
        item-title="name"
        item-value="id"
        :items="items">
        <template v-slot:selection="{ item }">            
        <span>            
            <RaceIcon :raceIdentifier="item.raw.id" />
            {{ item.raw.name }}
        </span>     
        </template>
        <template v-slot:item="{ props: itemProps, item }">
        <v-list-item
            v-bind="itemProps"
            :title="item.raw.name">
            <template v-slot:prepend>
                <RaceIcon :raceIdentifier="item.raw.id" />
            </template>                         
        </v-list-item>
        </template>
    </v-autocomplete>
</template>

<script setup>
import { computed } from 'vue'
import { raceWrapper } from '@/helpers/races.js'

const model = defineModel();
const props = defineProps({
  label: { type: String, default: 'Race' },
  exclude: { type: Array, default: () => [] }, // race ids the list leaves out
});
const items = computed(() => raceWrapper.races.filter((race) => !props.exclude.includes(race.id)));
</script>