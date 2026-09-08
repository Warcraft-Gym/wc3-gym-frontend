<!-- Who casts a series: one chip per cast with its platform icon, linking to the channel, or to the VOD with a play icon; red while the series is on now. A member claims, or adds the VOD once the series is over; the owner or an admin edits, pastes a VOD or unclaims -->
<template>
  <div class="d-flex align-center flex-wrap ga-1" @click.stop>
    <template v-for="cast in casts" :key="cast.id">
      <v-menu v-if="canEdit(cast)">
        <template #activator="{ props: menu }">
          <v-chip v-bind="{ ...menu, ...chipProps(cast) }" size="small">{{ cast.name }}<template v-if="live"> · on now</template></v-chip>
        </template>
        <v-list density="compact">
          <v-list-item v-if="cast.vod_url" :href="cast.vod_url" target="_blank" prepend-icon="mdi-play" title="Watch VOD" />
          <v-list-item :href="cast.channel_url" target="_blank" prepend-icon="mdi-open-in-new" title="Open channel" />
          <v-list-item prepend-icon="mdi-pencil" title="Change channel" @click="edit(cast, 'channel')" />
          <v-list-item prepend-icon="mdi-movie-open" title="Change VOD" @click="edit(cast, 'vod')" />
          <v-list-item prepend-icon="mdi-close" title="Unclaim" @click="unclaim(cast)" />
        </v-list>
      </v-menu>
      <v-chip v-else size="small" v-bind="chipProps(cast)" :href="cast.vod_url || cast.channel_url" target="_blank">
        {{ cast.name }}<template v-if="live"> · on now</template>
        <v-tooltip activator="parent" location="top">{{ cast.vod_url || cast.channel_url }}</v-tooltip>
      </v-chip>
    </template>
    <v-btn v-if="canClaim" class="cast-add" size="x-small" variant="tonal" :prepend-icon="scored ? 'mdi-movie-plus' : 'mdi-video-plus'" @click="claim">{{ scored ? 'Add your VOD' : 'Cast this' }}</v-btn>
    <span v-else-if="!casts.length" class="text-medium-emphasis">&mdash;</span>

    <v-dialog v-model="dialog" max-width="480">
      <v-card :title="copy.title" rounded="lg">
        <v-card-text class="pt-2 pb-1">
          <!-- A textarea, so a long link wraps and stays readable instead of scrolling out of the field -->
          <v-textarea
            v-model="url"
            :label="copy.label"
            :placeholder="copy.placeholder"
            :prepend-inner-icon="platformIcon"
            :hint="advice"
            :error-messages="error"
            rows="1"
            auto-grow
            persistent-hint
            autofocus
            @keydown.enter.prevent="save"
          />
        </v-card-text>
        <v-card-actions class="px-6 pb-4">
          <v-spacer />
          <v-btn variant="text" @click="dialog = false">Cancel</v-btn>
          <v-btn color="primary" variant="flat" :loading="saving" :disabled="!editing && !url.trim()" @click="save">{{ copy.confirm }}</v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>
  </div>
</template>

<script setup>
import { computed, ref, watch } from 'vue';

import { useAuthStore, useSeriesStore } from '@/stores';
import { PLATFORM_ICONS, linkAdvice, onNow, platformOf } from '@/helpers/casts.mjs';
import { isUnscored } from '@/helpers/season-phase.mjs';

const CHANNEL_LABEL = 'Channel or stream link';
const CHANNEL_PLACEHOLDER = 'twitch.tv/you';
const VIDEO_LABEL = 'Video link';
const VIDEO_PLACEHOLDER = 'twitch.tv/videos/123456789';
// The title names the action and the button repeats it; neither says "Save" alone
const COPY = {
  claim: { title: 'Cast this series', confirm: 'Cast series', label: CHANNEL_LABEL, placeholder: CHANNEL_PLACEHOLDER },
  channel: { title: 'Change your channel', confirm: 'Save channel', label: CHANNEL_LABEL, placeholder: CHANNEL_PLACEHOLDER },
  vod: { title: 'Change your VOD', confirm: 'Save VOD', label: VIDEO_LABEL, placeholder: VIDEO_PLACEHOLDER },
  addVod: { title: 'Add your VOD', confirm: 'Add VOD', label: VIDEO_LABEL, placeholder: VIDEO_PLACEHOLDER },
};

const props = defineProps({
  series: { type: Object, required: true }, // id, casts
});

const auth = useAuthStore();
const seriesStore = useSeriesStore();

const casts = ref([]);
watch(() => props.series.casts, (rows) => { casts.value = [...(rows || [])]; }, { immediate: true });

const myId = computed(() => auth.me?.user?.id);
// Read once per page load: the window is hours wide, so a stale minute changes nothing
const live = computed(() => onNow({ ...props.series, casts: casts.value }));
const chipProps = (cast) => ({
  color: live.value ? 'red' : 'purple',
  variant: live.value ? 'flat' : 'tonal',
  prependIcon: PLATFORM_ICONS[platformOf(cast.channel_url)] || 'mdi-video',
  appendIcon: cast.vod_url ? 'mdi-play' : undefined,
});
// A guest, and a member with no player row, cannot claim
const canClaim = computed(() => myId.value && auth.me?.role !== 'guest' && !casts.value.some((c) => c.user_id === myId.value));
// A series with a result has nothing left to stream, so it takes a VOD instead of a claim
const scored = computed(() => !isUnscored(props.series));
const canEdit = (cast) => auth.isAdmin || cast.user_id === myId.value;

const dialog = ref(false);
const editing = ref(null); // the cast being edited; null on a claim
const field = ref('channel'); // 'channel', 'vod' or 'addVod'
const url = ref('');
const error = ref('');
const saving = ref(false);
// The dialog reads the platform off what is typed, as a phone field reads its prefix
const platformIcon = computed(() => PLATFORM_ICONS[platformOf(url.value)] || 'mdi-link-variant');
const copy = computed(() => (editing.value ? COPY[field.value] : scored.value ? COPY.addVod : COPY.claim));
const advice = computed(() => {
  if (editing.value && field.value === 'vod' && !url.value.trim()) return 'Leave this blank to remove your VOD.';
  return linkAdvice(url.value, field.value !== 'channel');
});

async function claim() {
  editing.value = null;
  field.value = scored.value ? 'addVod' : 'channel';
  error.value = '';
  url.value = scored.value ? '' : (await seriesStore.lastCastChannel().catch(() => null)) || '';
  dialog.value = true;
}

function edit(cast, which) {
  editing.value = cast;
  field.value = which;
  error.value = '';
  url.value = cast[which === 'vod' ? 'vod_url' : 'channel_url'] || '';
  dialog.value = true;
}

async function save() {
  saving.value = true;
  error.value = '';
  try {
    const { id } = props.series;
    // A VOD claim streams nothing, so the video page is its channel too
    if (!editing.value) casts.value = await seriesStore.claimSeries(id, url.value, scored.value ? url.value : null);
    else if (field.value === 'vod') casts.value = await seriesStore.setCastVod(id, editing.value.id, url.value.trim() || null);
    else casts.value = await seriesStore.updateCast(id, editing.value.id, url.value);
    dialog.value = false;
  } catch (e) {
    error.value = e.message;
  } finally {
    saving.value = false;
  }
}

async function unclaim(cast) {
  await seriesStore.unclaimSeries(props.series.id, cast.id);
  casts.value = casts.value.filter((c) => c.id !== cast.id);
}
</script>

<!-- Unscoped, because the rule reads the row above the component. Every selector
     is anchored on .cast-add, which no other component renders -->
<style>
/* Five people cast a season, so a table row keeps the button quiet until it is
   pointed at or tabbed into. A card, which is not a row, always shows it. */
@media (hover: hover) {
  tr .cast-add {
    opacity: 0;
    transition: opacity 120ms ease;
  }
  tr:hover .cast-add,
  tr:focus-within .cast-add {
    opacity: 1;
  }
}
</style>
