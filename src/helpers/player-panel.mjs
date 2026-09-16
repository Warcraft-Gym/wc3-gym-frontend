import { ref } from 'vue';

// The player panel opens over whatever page you are on, so reading a profile
// never costs a captain his roster ticks or a player his typed scores.
// null means closed; the value is a battle tag, or an id for a row without one.
export const panelPlayerKey = ref(null);

export const openPlayer = (player) =>
  panelPlayerKey.value = player.battleTag ? String(player.battleTag) : String(player.id);
