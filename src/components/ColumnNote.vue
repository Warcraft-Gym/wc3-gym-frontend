<!-- A column heading that carries a help note.

     The sort click belongs to the <th> Vuetify already binds it on, so this
     only draws the arrow it is handed; handling the click here as well would
     toggle the sort twice. -->
<template>
  <span class="d-inline-flex align-center">
    <span>
      {{ title }}
      <v-icon v-if="sortIcon" size="x-small" class="ml-1">{{ sortIcon }}</v-icon>
    </span>
    <span class="note-icon ml-1" @click.stop>
      <v-icon size="x-small">mdi-help-circle-outline</v-icon>
      <v-tooltip activator="parent" location="top" max-width="320">{{ note }}</v-tooltip>
    </span>
  </span>
</template>

<script setup>
defineProps({
  title: { type: String, required: true },
  note: { type: String, required: true },
  sortIcon: { type: String, default: null },
});
</script>

<style scoped>
.note-icon {
  cursor: help;
  opacity: 0.6;
}
.note-icon:hover {
  opacity: 1;
}
</style>
