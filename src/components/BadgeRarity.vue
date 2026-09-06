<!-- Every badge the season pays, with its price and how many players earned it -->
<template>
  <v-card elevation="2" class="mb-4">
    <v-card-title class="d-flex align-center text-body-1 pb-1">
      <v-icon size="small" class="mr-2">mdi-medal-outline</v-icon>
      <span>Badges</span>
      <span class="text-caption text-medium-emphasis ml-2">{{ tiles.length }} rules &middot; rarest pay most</span>
    </v-card-title>
    <v-card-text class="pt-0 pb-2">
      <div class="tiles">
        <div v-for="tile in shown" :key="tile.id" class="tile">
          <AchievementIcon :id="tile.id" :size="22" class="text-amber-darken-2 mr-2" />
          <div class="text">
            <div class="d-flex align-baseline" style="gap: 6px">
              <span class="text-body-2 font-weight-medium name">{{ tile.name }}</span>
              <span class="text-body-2 text-amber-darken-2">+{{ tile.points }}</span>
            </div>
            <div class="share"><span class="fill" :style="{ width: `${100 * tile.share}%` }" /></div>
            <div class="text-caption text-medium-emphasis">{{ tile.caption }}</div>
          </div>
          <v-tooltip activator="parent" location="top" max-width="320">{{ tile.description }}</v-tooltip>
        </div>
      </div>
      <div class="text-caption text-medium-emphasis mt-2 toggle" @click="showAll = !showAll">
        {{ showAll ? 'Fewer' : `All ${tiles.length} badges` }}
        <v-icon size="small" class="ml-1">{{ showAll ? 'mdi-chevron-up' : 'mdi-chevron-down' }}</v-icon>
      </div>
    </v-card-text>
  </v-card>
</template>

<script setup>
import { computed, ref } from 'vue';
import AchievementIcon from '@/components/AchievementIcon.vue';

const props = defineProps({
  rules: { type: Array, default: () => [] },
  teamRules: { type: Array, default: () => [] },
  players: { type: Array, default: () => [] },
  teams: { type: Array, default: () => [] },
  first: { type: Number, default: 12 },
});
const showAll = ref(false);

// A per-map badge (`map_win:<map>`) counts for its rule once per player
const earners = (rows, rule) => rows.filter(r => r.achievements.some(a => a.id.split(':')[0] === rule.id)).length;
const tile = (rule, rows, unit) => {
  const n = earners(rows, rule);
  const share = rows.length ? n / rows.length : 0;
  return { ...rule, share, caption: `${n} of ${rows.length} ${unit} · ${Math.round(100 * share)}%` };
};
const tiles = computed(() => {
  const active = props.players.filter(p => p.games > 0);
  return [
    ...props.rules.map(rule => tile(rule, active, 'players')),
    ...props.teamRules.map(rule => tile(rule, props.teams, 'teams')),
  ].sort((a, b) => b.points - a.points || a.share - b.share);
});
const shown = computed(() => (showAll.value ? tiles.value : tiles.value.slice(0, props.first)));
</script>

<style scoped>
.tiles {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(230px, 1fr));
  gap: 8px 16px;
}
.tile {
  display: flex;
  align-items: flex-start;
  padding: 6px 0;
  border-bottom: 1px solid rgba(var(--v-border-color), var(--v-border-opacity));
}
.text { min-width: 0; flex: 1; }
.name { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
/* One hue: the width is the share of players who earned it */
.share { height: 4px; margin: 4px 0 2px; background: rgba(var(--v-theme-on-surface), 0.08); border-radius: 2px; }
.fill { display: block; height: 100%; background: #ff8f00; border-radius: 0 2px 2px 0; min-width: 0; }
.toggle { cursor: pointer; width: fit-content; }
</style>
