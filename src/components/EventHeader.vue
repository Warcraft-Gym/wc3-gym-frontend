<!-- The top of an event page: the league it is a run of, its name and state, when it
     runs, where it is played and the links to read it or watch it. -->
<template>
  <div class="d-flex flex-wrap align-center ga-3">
    <h1 class="text-h5 text-md-h3 font-weight-bold">
      <span v-if="prefix" class="text-medium-emphasis">{{ prefix }} · </span>{{ event.name }}
    </h1>
    <v-chip v-if="state" size="small" variant="tonal" :color="STATE_COLOR[state]">{{ STATE_LABEL[state] || state }}</v-chip>
  </div>
  <div class="d-flex flex-wrap align-center id-links mt-2">
    <span v-if="when" class="id-link text-medium-emphasis">
      <v-icon size="18" icon="mdi-calendar-month" /><span>{{ when }}</span>
    </span>
    <span v-if="event.region" class="id-link text-medium-emphasis">
      <v-icon size="18" icon="mdi-earth" /><span>{{ event.region }}</span>
    </span>
    <a v-if="event.page_url" class="id-link" :href="event.page_url" target="_blank" rel="noopener noreferrer">
      <v-icon size="18" icon="mdi-open-in-new" /><span>Page</span>
    </a>
    <a v-if="event.stream_url" class="id-link" :href="event.stream_url" target="_blank" rel="noopener noreferrer">
      <v-icon size="18" icon="mdi-twitch" /><span>Stream</span>
    </a>
  </div>
</template>

<script setup>
import { computed } from 'vue';

import { dateRange, leaguePrefix, STATE_COLOR, STATE_LABEL, stateOf } from '@/helpers/event-labels.mjs';

const props = defineProps({
  event: { type: Object, required: true },
  league: { type: Object, default: null },
});

// The short name is what a header has room for, and it is dropped when the event name repeats it
const prefix = computed(() => leaguePrefix(props.event, props.league));
const state = computed(() => stateOf(props.event));
const when = computed(() => dateRange(props.event));
</script>

<style scoped>
/* One gap for every icon-and-text pair, and one nudge that centres the icon on the
   x-height of the text beside it. */
.id-links { gap: 4px 20px; }
.id-link {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  text-decoration: none;
  white-space: nowrap;
  color: inherit;
}
.id-link :deep(.v-icon) { transform: translateY(-3%); }
a.id-link:hover span { text-decoration: underline; }
</style>
