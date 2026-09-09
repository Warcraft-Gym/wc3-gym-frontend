<!-- The player profile as a sheet on the right edge, over whatever page you are
     on. It is a dialog, not a navigation drawer, so it also opens above the
     Report Result dialog and the Propose Series dialog. -->
<template>
  <v-dialog
    class="player-panel"
    transition="dialog-right-transition"
    :model-value="open"
    @update:model-value="value => { if (!value) panelPlayerKey = null; }"
  >
    <v-card v-if="open" class="d-flex flex-column">
      <v-toolbar density="compact" flat>
        <v-btn icon="mdi-close" variant="text" aria-label="Close" @click="panelPlayerKey = null" />
        <v-spacer />
        <v-btn variant="text" size="small" append-icon="mdi-open-in-new" :to="fullPage" @click="panelPlayerKey = null">
          Open full page
        </v-btn>
      </v-toolbar>
      <div class="flex-grow-1 overflow-y-auto pa-4">
        <PlayerProfile :playerKey="panelPlayerKey" />
      </div>
    </v-card>
  </v-dialog>
</template>

<script setup>
import { computed, watch } from 'vue';
import { useRouter } from 'vue-router';
import { storeToRefs } from 'pinia';
import { useAuthStore } from '@/stores';
import { canSeeRole } from '@/helpers';
import { panelPlayerKey } from '@/helpers/players';
import PlayerProfile from '@/components/PlayerProfile.vue';

const router = useRouter();
const { me } = storeToRefs(useAuthStore());

// the key is already the address, whether it is a battle tag or an id
const fullPage = computed(() => `/player/${encodeURIComponent(panelPlayerKey.value || '')}`);

// A profile is member-only, and the route guard reads a missing session, not a
// role. Anyone the panel refuses goes to the page instead, where that guard
// sends him to the login, exactly as a name click did before the panel.
const mayRead = computed(() => !!me.value && canSeeRole(me.value.role, 'member'));
const open = computed(() => !!panelPlayerKey.value && mayRead.value);
watch(panelPlayerKey, (key) => {
  if (!key || mayRead.value) return;
  panelPlayerKey.value = null;
  router.push(fullPage.value);
});
</script>

<style>
.player-panel {
  justify-content: flex-end;
}
.player-panel:not(.v-dialog--fullscreen) > .v-overlay__content {
  margin: 0;
  width: 560px;
  max-width: 100%;
  height: 100%;
  max-height: 100%;
}
.player-panel:not(.v-dialog--fullscreen) > .v-overlay__content > .v-card {
  border-radius: 0;
  height: 100%;
}
.player-panel.v-dialog--fullscreen > .v-overlay__content > .v-card {
  height: 100%;
}

/* Mirrors Vuetify's own dialog-bottom-transition, sliding from the right edge */
.dialog-right-transition-enter-active,
.dialog-right-transition-leave-active {
  transition-property: transform !important;
  pointer-events: none;
}
.dialog-right-transition-enter-active {
  transition-duration: 225ms !important;
  transition-timing-function: cubic-bezier(0, 0, 0.2, 1) !important;
}
.dialog-right-transition-leave-active {
  transition-duration: 125ms !important;
  transition-timing-function: cubic-bezier(0.4, 0, 1, 1) !important;
}
.dialog-right-transition-enter-from,
.dialog-right-transition-leave-to {
  transform: translateX(100%);
}
@media (prefers-reduced-motion: reduce) {
  .dialog-right-transition-enter-from,
  .dialog-right-transition-leave-to {
    transform: none;
  }
}
</style>
