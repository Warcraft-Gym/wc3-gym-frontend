<!-- One trophy: the team's logo under a gold crown. -->
<template>
  <span class="trophy" :style="{ '--trophy-size': `${size}px` }" :title="trophy.title">
    <img
      class="trophy-logo"
      :src="teamImageUrl({ id: trophy.team_id, icon_url: trophy.team_icon_url })"
      :alt="trophy.team_name ?? ''"
      @error="showDefaultTeamImage"
    >
    <v-icon class="trophy-crown text-amber-darken-2" :size="Math.round(size * 0.55)">mdi-crown</v-icon>
  </span>
</template>

<script setup>
import { teamImageUrl, showDefaultTeamImage } from '@/helpers/team-image';

defineProps({
  trophy: { type: Object, required: true },
  size: { type: Number, default: 44 },
});
</script>

<style scoped>
.trophy {
  position: relative;
  display: inline-flex;
  flex-shrink: 0;
  width: var(--trophy-size);
  height: var(--trophy-size);
  margin-top: calc(var(--trophy-size) * 0.34);
}
.trophy-logo {
  width: 100%;
  height: 100%;
  object-fit: contain;
}
/* the crown sits on the logo's top edge, centred; the margin above reserves its overhang */
.trophy-crown {
  position: absolute;
  top: calc(var(--trophy-size) * -0.34);
  left: 50%;
  transform: translateX(-50%);
}
</style>
