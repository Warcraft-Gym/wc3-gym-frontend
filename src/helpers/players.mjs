import { ref } from 'vue';

// Shared player list filters used by the player, team assign and team detail grids.

export const matchesPlayerSearch = (player, query) => {
  const q = query.trim().toLowerCase();
  return (player.name || '').toLowerCase().includes(q)
    || (player.battleTag || '').toLowerCase().includes(q)
    || (player.discordTag || '').toLowerCase().includes(q);
};

// The row-props of a player grid
export const playerRowProps = () => ({ class: 'player-row' });

// Only applies once the user moved a slider handle off the 0-3000 defaults.
export const filterByMmrRange = (list, range, getMmr) => {
  if (!Array.isArray(range) || range.length !== 2) return list;
  const mmrMin = Number(range[0]);
  const mmrMax = Number(range[1]);
  if (mmrMin === 0 && mmrMax === 3000) return list;
  return list.filter(p => {
    const mmr = getMmr(p);
    return mmr >= mmrMin && mmr <= mmrMax;
  });
};

// The player page path. The battle tag is the key, like w3champions; the id
// serves rows that carry none, and old links.
export const playerPath = (player) =>
  `/player/${player.battleTag ? encodeURIComponent(player.battleTag) : player.id}`;

// The player panel opens over whatever page you are on, so reading a profile
// never costs a captain his roster ticks or a player his typed scores.
// null means closed; the value is a battle tag, or an id for a row without one.
export const panelPlayerKey = ref(null);

export const openPlayer = (player) =>
  panelPlayerKey.value = player.battleTag ? String(player.battleTag) : String(player.id);
