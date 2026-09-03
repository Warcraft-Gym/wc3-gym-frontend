<!-- The shared grouped table: one tinted, clickable header row per group opens its
     detail rows. Detail rows share the column grid, so their numbers line up under
     the header's and visibly sum to it. `#group` fills the header cells, `#rows`
     yields whole `<tr class="detail-row">` rows; `#head.<key>` replaces a title. -->
<template>
  <v-table density="compact" class="grouped-table">
    <thead>
      <tr>
        <th style="width: 40px"></th>
        <th
          v-for="col in columns"
          :key="col.key"
          :class="{ 'text-right': col.align === 'right' }"
          :style="col.width ? { width: col.width } : {}"
        >
          <slot :name="`head.${col.key}`">{{ col.title }}</slot>
        </th>
      </tr>
    </thead>
    <tbody>
      <template v-for="group in groups" :key="group.key">
        <tr class="group-row" @click="toggle(group.key)">
          <td><v-icon size="small">{{ open.has(group.key) ? 'mdi-chevron-up' : 'mdi-chevron-down' }}</v-icon></td>
          <slot name="group" :group="group" :open="open.has(group.key)" />
        </tr>
        <template v-if="open.has(group.key)">
          <slot name="rows" :group="group" />
        </template>
      </template>
      <tr v-if="!groups.length">
        <td :colspan="columns.length + 1" class="text-grey">{{ empty }}</td>
      </tr>
    </tbody>
  </v-table>
</template>

<script setup>
import { ref, watch } from 'vue';

const props = defineProps({
  columns: { type: Array, required: true }, // [{ key, title, align?: 'right', width? }]
  groups: { type: Array, required: true }, // each needs a unique `key`
  empty: { type: String, default: 'No data' },
  defaultOpen: Boolean, // every group starts open, later groups too
});

const open = ref(new Set());
watch(() => props.groups, (groups) => {
  if (props.defaultOpen) open.value = new Set([...open.value, ...groups.map((g) => g.key)]);
}, { immediate: true });
const toggle = (key) => {
  open.value.has(key) ? open.value.delete(key) : open.value.add(key);
  open.value = new Set(open.value);
};
</script>

<style scoped>
.group-row {
  cursor: pointer;
}
.group-row > :deep(td),
.grouped-table :deep(.detail-row > td:first-child) {
  background: rgba(0, 0, 0, 0.04);
}
</style>
