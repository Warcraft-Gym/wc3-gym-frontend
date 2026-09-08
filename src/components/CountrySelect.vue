<template>
    <v-autocomplete
        v-model="model"
        :menu-props="{ scrollStrategy: 'close'}"
        :items="countries"
        item-title="name"
        item-value="a2"
        label="Player Country"
        @focus="selectAll"
        @click="selectAll"
        >
        <template v-slot:prepend-inner>
            <span v-if="model" class="flag-affix">
                <FlagIcon :countryIdentifier="model" />
            </span>
        </template>
        <template v-slot:item="{ props: props, item }">
        <v-list-item
            v-bind="props"
            :title="item.raw.name">
            <template v-slot:prepend>
                <span style="margin-right: 5px">
                    <FlagIcon :countryIdentifier="item.raw.a2" />
                </span>
            </template>
        </v-list-item>
        </template>
    </v-autocomplete>
</template>

<script setup>
import { nextTick } from 'vue'
import { countries } from '@/helpers/countries.js'

const model = defineModel();

// the selected name fills the search box on focus; select it so typing replaces it
const selectAll = (e) => nextTick(() => e.target.select());
</script>

<style scoped>
/* the flag sits on the text line: the same padding the field gives its input */
.flag-affix {
    align-self: stretch;
    display: flex;
    align-items: center;
    padding-top: var(--v-field-input-padding-top);
    padding-bottom: var(--v-field-input-padding-bottom);
}
</style>
