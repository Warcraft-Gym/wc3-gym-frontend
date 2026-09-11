<!-- One trophy: the team's crest, or a cup for a win with no team, over a plate that names the event, under a gold crown. -->
<template>
  <span class="trophy" :style="{ '--trophy-size': `${size}px` }" :title="title">
    <v-icon class="trophy-crown" :size="Math.round(size * 0.55)">mdi-crown</v-icon>
    <img
      v-if="trophy.team_id != null"
      class="trophy-crest"
      :src="teamImageUrl({ id: trophy.team_id, icon_url: trophy.team_icon_url })"
      :alt="trophy.team_name ?? ''"
      @error="showDefaultTeamImage"
    >
    <span v-else class="trophy-crest trophy-cup">
      <v-icon :size="Math.round(size * 0.62)">mdi-trophy</v-icon>
    </span>
    <span v-if="plate" class="trophy-plate">{{ trophy.season_name }}</span>
  </span>
</template>

<script setup>
import { computed } from 'vue';
import { teamImageUrl, showDefaultTeamImage } from '@/helpers/team-image';

const props = defineProps({
  trophy: { type: Object, required: true },
  size: { type: Number, default: 44 },
});

// Below this the engraved season is too small to read, so the mark shows the crest alone
const plate = computed(() => props.size >= 40);
// e.g. "GNL S18 champion · CRIT"
const title = computed(() => {
  const event = `${props.trophy.season_name} champion`;
  return props.trophy.team_name ? `${event} · ${props.trophy.team_name}` : event;
});
</script>

<style scoped>
/* A trophy is gold in both themes, so these are the object's own colours, not the theme's */
.trophy {
  --gold: #c9962f;
  --gold-hi: #f0d27a;
  --gold-lo: #7c5a11;
  position: relative;
  display: inline-flex;
  flex-direction: column;
  align-items: center;
  flex-shrink: 0;
  /* the plate is a little wider than the crest, the way a trophy stands on its base */
  width: max-content;
  /* the crown overhangs the top edge; this reserves its height */
  margin-top: calc(var(--trophy-size) * 0.34);
}
.trophy-crest {
  width: var(--trophy-size);
  height: var(--trophy-size);
  object-fit: contain;
  box-sizing: border-box;
  background: #0c0c0c;
  /* most crests are dark art on black, so the rule is what gives the mark an edge */
  border: 1px solid var(--gold);
  border-bottom: 0;
}
.trophy-cup {
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--gold);
}
/* the crest keeps its own edge when no plate closes the object */
.trophy:not(:has(.trophy-plate)) .trophy-crest {
  border-bottom: 1px solid var(--gold);
}
.trophy-plate {
  min-width: 100%;
  box-sizing: border-box;
  padding: calc(var(--trophy-size) * 0.055) calc(var(--trophy-size) * 0.09);
  border-radius: 0 0 2px 2px;
  background: linear-gradient(180deg, var(--gold-hi), var(--gold) 55%, var(--gold-lo));
  box-shadow: inset 0 -1px 0 rgb(0 0 0 / 30%), inset 0 1px 0 rgb(255 255 255 / 45%);
  color: #3a2a06;
  font-size: calc(var(--trophy-size) * 0.185);
  font-weight: 700;
  letter-spacing: 0.045em;
  line-height: 1;
  text-align: center;
  white-space: nowrap;
}
.trophy-crown {
  position: absolute;
  top: calc(var(--trophy-size) * -0.34);
  left: 50%;
  transform: translateX(-50%);
  color: var(--gold);
}
</style>
