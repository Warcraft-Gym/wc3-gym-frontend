<!-- One player's ladder record in one season: points, record, versus race and
     achievements. The matches themselves stay on W3Champions, linked beside the tiles -->
<template>
  <div>
    <StatusAlert v-model="errorMessage" />

    <section class="section">
      <h4 class="text-body-1 font-weight-medium">Ladder grind <span class="text-caption text-medium-emphasis">{{ data?.points ?? 0 }} points</span></h4>
      <div class="tiles">
        <div>
          <ColumnNote title="Ladder points" :note="SCORED_NOTE" class="text-caption text-medium-emphasis" />
          <div class="text-h6">{{ ladderPoints }}</div>
          <div class="text-caption text-medium-emphasis">3 per win, 1 per loss</div>
        </div>
        <div>
          <div class="text-caption text-medium-emphasis">Achievement points</div>
          <div class="text-h6">{{ achievedPoints }}</div>
          <div class="text-caption text-medium-emphasis">{{ earned.length }} earned, {{ locked.length }} locked</div>
        </div>
        <div>
          <div class="text-caption text-medium-emphasis">Record</div>
          <div class="text-h6">
            <span class="text-win">{{ data?.wins ?? 0 }}</span>
            <span class="text-medium-emphasis"> – </span>
            <span class="text-loss">{{ data?.losses ?? 0 }}</span>
          </div>
          <div class="text-caption text-medium-emphasis">{{ winrate }} of {{ data?.games ?? 0 }} games</div>
        </div>
        <v-spacer />
        <a v-if="player?.battleTag" :href="w3cStatsUrl" target="_blank" class="text-caption d-inline-flex align-center align-self-start"><W3CIcon :size="14" class="mr-1" />W3Champions</a>
      </div>

      <div class="split">
        <div>
          <div class="text-caption text-medium-emphasis mb-1">Versus race</div>
          <v-table density="compact" class="versus">
            <tbody>
              <tr v-if="!versusRaces.length"><td class="text-caption text-medium-emphasis">No ladder games yet.</td></tr>
              <tr v-for="row in versusRaces" :key="row.code">
                <td><div class="d-flex align-center ga-2"><RaceIcon :raceIdentifier="row.code" />{{ row.name }}</div></td>
                <td class="text-right text-no-wrap"><span class="text-win">{{ row.w }}</span> – <span class="text-loss">{{ row.l }}</span></td>
                <td class="bar"><div class="meter"><div class="fill" :style="{ width: `${row.rate}%` }" /></div></td>
                <td class="text-right text-medium-emphasis">{{ row.rate }}%</td>
              </tr>
            </tbody>
          </v-table>
        </div>
        <div>
          <div class="text-caption text-medium-emphasis mb-1">Achievements</div>
          <div v-for="badge in earned" :key="badge.id" class="d-flex align-center badge-row">
            <AchievementIcon :id="badge.id" class="mr-3 text-primary" />
            <span class="text-body-2 font-weight-medium mr-3">{{ badge.name }}</span>
            <span v-if="mdAndUp" class="text-caption text-medium-emphasis">{{ badge.description }}</span>
            <v-spacer />
            <span class="text-caption text-medium-emphasis text-no-wrap ml-3">{{ badgeDate(badge.achieved_at) }}</span>
            <span class="text-body-2 text-primary-text ml-3">+{{ badge.points }}</span>
          </div>
          <div v-if="!earned.length" class="text-caption text-medium-emphasis">None earned yet.</div>
          <div
            class="text-caption text-medium-emphasis mt-2 mb-1 d-flex align-center locked-toggle"
            @click="showLocked = !showLocked"
          >
            <span>Locked &middot; {{ locked.length }}</span>
            <v-icon size="small" class="ml-1">{{ showLocked ? 'mdi-chevron-up' : 'mdi-chevron-down' }}</v-icon>
          </div>
          <template v-if="showLocked">
            <div v-for="badge in locked" :key="badge.id" class="d-flex align-center badge-row text-medium-emphasis">
              <AchievementIcon :id="badge.id" class="mr-3" />
              <span class="text-body-2 mr-3">{{ badge.name }}</span>
              <span v-if="mdAndUp" class="text-caption">{{ badge.description }}</span>
              <v-spacer />
              <span class="text-body-2 ml-3">+{{ badge.points }}</span>
            </div>
          </template>
        </div>
      </div>
    </section>
  </div>
</template>

<script setup>
import { computed, ref, watch } from 'vue';
import { DateTime } from 'luxon';
import { useDisplay } from 'vuetify';
import { useLadderStore } from '@/stores';
import RaceIcon from '@/components/RaceIcon.vue';
import W3CIcon from '@/components/W3CIcon.vue';
import { achievementPoints, SCORED_NOTE } from '@/helpers/achievements';
import { raceWrapper } from '@/helpers/races';
import { w3cPlayerUrl } from '@/helpers/w3c-stats';
import AchievementIcon from '@/components/AchievementIcon.vue';
import ColumnNote from '@/components/ColumnNote.vue';
import StatusAlert from '@/components/StatusAlert.vue';

const props = defineProps({
  player: { type: Object, required: true },
  seasonId: { type: Number, required: true },
});

const { mdAndUp } = useDisplay();
const ladderStore = useLadderStore();

const data = ref(null);
const seasonLadder = ref(null);
const errorMessage = ref(null);
const showLocked = ref(false);

const w3cStatsUrl = computed(() => `${w3cPlayerUrl(props.player?.battleTag ?? '')}/statistics`);

const winrate = computed(() => {
  const games = data.value?.games ?? 0;
  return games ? `${Math.round((data.value.wins / games) * 100)}%` : '0%';
});

// The earned rules come with the player, the whole catalogue with the season
const earned = computed(() => data.value?.achievements ?? []);
const achievedPoints = computed(() => achievementPoints(earned.value));
const ladderPoints = computed(() => (data.value?.wins ?? 0) * 3 + (data.value?.losses ?? 0));

const locked = computed(() => {
  const won = new Set(earned.value.map(badge => badge.id));
  return (seasonLadder.value?.achievement_rules ?? []).filter(rule => !won.has(rule.id));
});

// Most games first, so the races he meets most sit on top
const versusRaces = computed(() => {
  const vs = data.value?.vs_race ?? {};
  return ['HU', 'OC', 'NE', 'UD', 'RANDOM']
    .map(code => {
      const [w, l] = vs[code] ?? [0, 0];
      const total = w + l;
      return { code, name: raceWrapper.getRaceObject(code).name, w, l, total, rate: total ? Math.round((w / total) * 100) : 0 };
    })
    .filter(row => row.total > 0)
    .sort((a, b) => b.total - a.total);
});

// Stored in UTC, shown in the viewer's own time
const badgeDate = (iso) => DateTime.fromISO(iso, { zone: 'utc' }).toLocal().toFormat('LLL d');

const load = async () => {
  errorMessage.value = null;
  try {
    data.value = await ladderStore.userLadder(props.player.id, { seasonId: props.seasonId });
    seasonLadder.value =
      ladderStore.ladders[props.seasonId] ?? (await ladderStore.seasonLadder(props.seasonId));
  } catch (error) {
    data.value = null;
    errorMessage.value = error.message;
  }
};

watch(() => [props.player, props.seasonId], load, { immediate: true });
</script>

<style scoped>
.section { padding-bottom: 16px; }
.section h4 { margin-bottom: 8px; }
.tiles { display: flex; flex-wrap: wrap; gap: 12px 40px; align-items: flex-start; margin-bottom: 12px; }
.split { display: grid; grid-template-columns: 1fr 1fr; gap: 24px; }
.versus .bar { width: 120px; }
.meter { height: 6px; border-radius: 3px; background: rgba(var(--v-theme-on-surface), 0.12); overflow: hidden; }
.fill { height: 100%; background: rgb(var(--v-theme-win)); border-radius: 3px; }
.badge-row {
  padding: 4px 0;
  border-bottom: 1px solid rgba(var(--v-border-color), var(--v-border-opacity));
}
.locked-toggle {
  cursor: pointer;
  width: fit-content;
}
@media (max-width: 959px) {
  .split { grid-template-columns: 1fr; gap: 12px; }
  .versus .bar { width: 72px; }
  .tiles { gap: 12px 24px; }
}
</style>
