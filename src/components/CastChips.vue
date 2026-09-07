<!-- Who casts a series: one chip per cast with its platform icon, linking to the channel; red while the series is on now. A member claims; the owner or an admin edits or unclaims -->
<template>
  <div class="d-flex align-center flex-wrap ga-1" @click.stop>
    <template v-for="cast in casts" :key="cast.id">
      <v-menu v-if="canEdit(cast)">
        <template #activator="{ props: menu }">
          <v-chip v-bind="{ ...menu, ...chipProps(cast) }" size="small">{{ cast.name }}<template v-if="live"> · on now</template></v-chip>
        </template>
        <v-list density="compact">
          <v-list-item :href="cast.channel_url" target="_blank" prepend-icon="mdi-open-in-new" title="Open channel" />
          <v-list-item prepend-icon="mdi-pencil" title="Channel URL" @click="edit(cast)" />
          <v-list-item prepend-icon="mdi-close" title="Unclaim" @click="unclaim(cast)" />
        </v-list>
      </v-menu>
      <v-chip v-else size="small" v-bind="chipProps(cast)" :href="cast.channel_url" target="_blank">
        {{ cast.name }}<template v-if="live"> · on now</template>
        <v-tooltip activator="parent" location="top">{{ cast.channel_url }}</v-tooltip>
      </v-chip>
    </template>
    <v-btn v-if="canClaim" size="x-small" variant="tonal" prepend-icon="mdi-video-plus" @click="claim">Claim</v-btn>
    <span v-else-if="!casts.length" class="text-medium-emphasis">&mdash;</span>

    <v-dialog v-model="dialog" max-width="420">
      <v-card :title="editing ? 'Channel URL' : 'Claim to cast'">
        <v-card-text>
          <v-text-field
            v-model="url"
            label="Channel URL"
            placeholder="https://www.twitch.tv/yourname"
            hint="Twitch: your channel. YouTube: the stream's video URL, which becomes the VOD"
            persistent-hint
            autofocus
            :error-messages="error"
            @keyup.enter="save"
          />
        </v-card-text>
        <v-card-actions>
          <v-spacer />
          <v-btn @click="dialog = false">Cancel</v-btn>
          <v-btn color="primary" :loading="saving" @click="save">Save</v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>
  </div>
</template>

<script setup>
import { computed, ref, watch } from 'vue';

import { useAuthStore, useSeriesStore } from '@/stores';
import { PLATFORM_ICONS, onNow, platformOf } from '@/helpers/casts.mjs';

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
});
// A guest, and a member with no player row, cannot claim
const canClaim = computed(() => myId.value && auth.me?.role !== 'guest' && !casts.value.some((c) => c.user_id === myId.value));
const canEdit = (cast) => auth.isAdmin || cast.user_id === myId.value;

const dialog = ref(false);
const editing = ref(null);
const url = ref('');
const error = ref('');
const saving = ref(false);

async function claim() {
  editing.value = null;
  error.value = '';
  url.value = (await seriesStore.lastCastChannel().catch(() => null)) || '';
  dialog.value = true;
}

function edit(cast) {
  editing.value = cast;
  error.value = '';
  url.value = cast.channel_url;
  dialog.value = true;
}

async function save() {
  saving.value = true;
  error.value = '';
  try {
    casts.value = editing.value
      ? await seriesStore.updateCast(props.series.id, editing.value.id, url.value)
      : await seriesStore.claimSeries(props.series.id, url.value);
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
