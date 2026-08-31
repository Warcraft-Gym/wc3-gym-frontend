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
