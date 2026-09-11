<!-- One player: identity, every event they entered with the rounds of the one
     running, the ladder record, and the lifetime head to head. The page at
     /player/:id and the panel that opens over any other page both render this. -->
<template>
  <StatusAlert v-model="errorMessage" />

  <template v-if="player">
    <v-card elevation="2" class="mb-6">
      <v-card-title class="bg-primary d-flex align-center">
        <v-icon class="mr-2">mdi-account-circle</v-icon>
        Player Information
        <v-spacer />
        <v-btn
          v-if="auth.isAdmin"
          variant="text"
          size="small"
          prepend-icon="mdi-pencil"
          @click="editPlayerDialog.open(player)"
        >
          Edit
        </v-btn>
      </v-card-title>
      <v-card-text class="pt-4">
        <div class="d-flex flex-wrap align-center ga-3 text-h6 mb-3">
          <PlayerName :player="player" @click.stop.prevent />
          <a :href="w3cPlayerUrl(player.battleTag)" target="_blank" rel="noopener noreferrer" class="text-body-1 text-decoration-none">
            {{ player.battleTag }} <W3CIcon :size="16" />
          </a>
        </div>
        <div class="d-flex flex-wrap align-center ga-2 mb-3">
          <v-chip color="secondary" prepend-icon="$discord">{{ player.discordTag }}</v-chip>
          <v-chip v-if="player.timezone" size="small" variant="tonal" prepend-icon="mdi-clock-outline">
            {{ zoneLabel(player.timezone) }}
          </v-chip>
        </div>
        <div class="d-flex flex-wrap align-center ga-2">
          <strong><W3CMmr /></strong>
          <RaceMmrChips :player="player" :w3cSeason="currentW3CSeason" />
        </div>
        <div class="text-caption text-medium-emphasis mt-2">{{ syncCaption }}</div>
        <PlayerTrophies :trophies="player.trophies" />
      </v-card-text>
    </v-card>

    <v-card elevation="2">
      <v-card-title class="bg-primary d-flex align-center">
        <v-icon class="mr-2">mdi-calendar-account</v-icon>
        Events
      </v-card-title>
      <!-- The event still running opens onto its rounds; the others onto their series -->
      <PlayerSeasons :player="player">
        <template #current="{ row }">
          <RoundCards :player="player" :season="row.season" :series="row.series" :teamId="row.stat?.team_id" />
        </template>
      </PlayerSeasons>
    </v-card>

    <HeadToHead :playerId="player.id" />

    <EditPlayerDialog ref="editPlayerDialog" :can-save="auth.isAdmin" :refresh="reload" />
  </template>
</template>

<script setup>
import { computed, ref, watch } from 'vue';
import { usePlayerStore, useAuthStore } from '@/stores';
import { syncedAgo, w3cPlayerUrl } from '@/helpers/w3c-stats';
import { resolveCurrentW3CSeason } from '@/helpers/current-season';
import { zoneLabel } from '@/helpers/timezone.mjs';
import EditPlayerDialog from '@/components/EditPlayerDialog.vue';
import HeadToHead from '@/components/HeadToHead.vue';
import PlayerSeasons from '@/components/PlayerSeasons.vue';
import PlayerTrophies from '@/components/PlayerTrophies.vue';
import RaceMmrChips from '@/components/RaceMmrChips.vue';
import RoundCards from '@/components/RoundCards.vue';
import StatusAlert from '@/components/StatusAlert.vue';
import W3CIcon from '@/components/W3CIcon.vue';
import W3CMmr from '@/components/W3CMmr.vue';

// a battle tag, or an id for a row that carries none
const props = defineProps({ playerKey: { type: String, required: true } });
const emit = defineEmits(['loaded']);

const playerStore = usePlayerStore();
const auth = useAuthStore();

const player = ref(null);
// a stat from an older W3C season names its own season on the chip
const currentW3CSeason = ref(null);
resolveCurrentW3CSeason().then(season => { currentW3CSeason.value = season; });
const editPlayerDialog = ref(null);
const errorMessage = ref(null);

// One read for the whole profile; the ladder card reads its own record.
watch(() => props.playerKey, async (key) => {
  // the caller may rewrite the address to the tag, which lands here again
  if (player.value && [String(player.value.id), player.value.battleTag].includes(key)) return;
  player.value = null;
  errorMessage.value = null;
  try {
    player.value = await playerStore.getPlayer(key);
    emit('loaded', player.value);
  } catch (error) {
    errorMessage.value = error.message;
  }
}, { immediate: true });

// e.g. "synced 2 hours ago"; syncedAgo already words the never case
const syncCaption = computed(() => {
  const ago = syncedAgo(player.value);
  return ago === 'never synced' ? ago : `synced ${ago}`;
});

// after a save the battle tag may have changed, and the tag is the address
const reload = async () => {
  player.value = await playerStore.getPlayer(String(player.value.id));
  emit('loaded', player.value);
};
</script>
