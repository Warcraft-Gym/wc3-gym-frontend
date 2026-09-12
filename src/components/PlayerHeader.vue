<!-- Who the player is, at the top of his page: the picture, the name and race, the
     battle tag at w3champions, the seasons he is in, the channels he plays on, his
     clock and his W3C MMR. The owner also gets his Availability and Edit buttons. -->
<template>
  <div class="d-flex flex-wrap align-center ga-4">
    <v-avatar size="64" color="primary">
      <v-img v-if="avatar" :src="avatar" alt="" @error="avatarBroken = true" />
      <span v-else class="text-h6">{{ initials }}</span>
    </v-avatar>
    <div class="flex-grow-1 min-w-0">
      <div class="text-h5">
        <PlayerName :player="player" :race="signupRace" plain />
      </div>
      <a
        v-if="player.battleTag"
        :href="w3cPlayerUrl(player.battleTag)"
        target="_blank"
        rel="noopener noreferrer"
        class="id-link text-medium-emphasis"
      >
        <W3CIcon :size="16" /><span>{{ player.battleTag }}</span>
      </a>
      <div v-if="seasonChips.length" class="d-flex flex-wrap ga-2 mt-2">
        <v-chip
          v-for="chip in seasonChips"
          :key="chip.key"
          size="small"
          variant="tonal"
          :color="chip.captain ? 'primary' : undefined"
          :prepend-icon="chip.captain ? 'mdi-shield-star' : undefined"
        >
          {{ chip.text }}
        </v-chip>
      </div>
    </div>
    <div v-if="owner || editable" class="d-flex flex-wrap ga-2">
      <v-btn v-if="owner" color="primary" variant="outlined" size="small" prepend-icon="mdi-calendar-month" to="/availability">
        Availability
      </v-btn>
      <v-btn v-if="editable" color="primary" variant="text" size="small" prepend-icon="mdi-pencil" @click="emit('edit')">Edit</v-btn>
    </div>
  </div>

  <div class="d-flex flex-wrap align-center id-links mt-3">
    <a v-if="player.discordId" class="id-link" :href="`https://discord.com/users/${player.discordId}`" target="_blank" rel="noopener noreferrer">
      <v-icon size="18" icon="$discord" /><span>{{ player.discordTag || 'Discord' }}</span>
    </a>
    <a v-if="player.twitch_url" class="id-link" :href="player.twitch_url" target="_blank" rel="noopener noreferrer">
      <v-icon size="18" icon="mdi-twitch" /><span>{{ handle(player.twitch_url) }}</span>
    </a>
    <a v-if="player.youtube_url" class="id-link" :href="player.youtube_url" target="_blank" rel="noopener noreferrer">
      <v-icon size="18" icon="mdi-youtube" /><span>{{ handle(player.youtube_url) }}</span>
    </a>
    <span v-if="zone" class="id-link text-medium-emphasis">
      <v-icon size="18" icon="mdi-clock-outline" /><span>{{ zone }}</span>
    </span>
  </div>

  <div class="d-flex flex-wrap align-center ga-2 mt-4">
    <strong><W3CMmr /></strong>
    <RaceMmrChips :player="player" :w3cSeason="w3cSeason" />
  </div>
  <div class="text-caption text-medium-emphasis mt-1">{{ syncCaption }}</div>
  <PlayerTrophies :trophies="player.trophies" />
</template>

<script setup>
import { computed, ref } from 'vue';
import { useSeasonStore, useTeamStore } from '@/stores';
import { syncedAgo, w3cPlayerUrl } from '@/helpers/w3c-stats';
import { viewerZone, zoneLabel } from '@/helpers/timezone.mjs';
import PlayerName from '@/components/PlayerName.vue';
import PlayerTrophies from '@/components/PlayerTrophies.vue';
import RaceMmrChips from '@/components/RaceMmrChips.vue';
import W3CIcon from '@/components/W3CIcon.vue';
import W3CMmr from '@/components/W3CMmr.vue';

const props = defineProps({
  player: { type: Object, required: true },  // the full user row
  me: { type: Object, default: null },  // the session, for the owner's own seasons
  owner: Boolean,  // the viewer is this player, and may act
  editable: Boolean,  // the viewer may open the edit dialog: the player himself, or an admin
  w3cSeason: { type: Number, default: null },
});
const emit = defineEmits(['edit']);

const seasonStore = useSeasonStore();
const teamStore = useTeamStore();

// The season chips read both lists, so the header loads them and does not wait on a sibling.
seasonStore.ensureSeasons().catch(() => {});
if (!teamStore.teams.length) teamStore.fetchTeams().catch(() => {});

// a picture Discord no longer serves falls back to the initials
const avatarBroken = ref(false);
const avatar = computed(() => (avatarBroken.value ? null : props.player.avatar_url));
const initials = computed(() => (props.player.name || '?').slice(0, 2).toUpperCase());

// the race of his newest signup; the profile race is one self-declared value
const signupRace = computed(() =>
  (props.player.signup_seasons ?? []).slice().sort((a, b) => b.id - a.id).find(s => s.signup_race)?.signup_race
    ?? props.player.race);

// The seasons still running that he is in: his own from /me, another player's from
// his signups, the team from the roster row of that season.
const seasonChips = computed(() => {
  if (props.owner) {
    return (props.me?.seasons ?? [])
      .filter(season => season.team)
      .map(season => ({ key: season.id, captain: season.captain, text: chipText(season.captain, season.team.name, season.name) }));
  }
  return (props.player.signup_seasons ?? [])
    .map(signup => seasonStore.seasons.find(s => s.id === signup.id) ?? signup)
    .filter(season => season.phase && season.phase !== 'complete')
    .sort((a, b) => b.id - a.id)
    .map((season) => {
      const teamId = (props.player.gnl_stats ?? []).find(stat => stat.season_id === season.id)?.team_id;
      const team = teamStore.teams.find(t => t.id === teamId);
      return team && { key: season.id, captain: false, text: chipText(false, team.name, season.name) };
    })
    .filter(Boolean);
});
const chipText = (captain, team, season) => `${captain ? 'Captain · ' : ''}${team} · ${season}`;

// the handle a channel link ends on: thanks_tv, @thanks
const handle = (url) => (url || '').replace(/\/+$/, '').split('/').pop();

const zone = computed(() => zoneLabel(props.player.timezone, viewerZone()));

// e.g. "synced 2 hours ago"; syncedAgo already words the never case
const syncCaption = computed(() => {
  const ago = syncedAgo(props.player);
  return ago === 'never synced' ? ago : `synced ${ago}`;
});
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
.id-link :deep(.v-icon),
.id-link img {
  transform: translateY(-3%);
}
a.id-link:hover span { text-decoration: underline; }
</style>
