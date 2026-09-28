// The pick order over a season's signups: the MMR the draft reads, ascending,
// with the players an admin took out left out entirely. A draft MMR the admin
// gives a player stands in for the live one, so it moves the player earlier or
// later; it lives on the draft page only.
/** @template {Record<string, any>} T
 *  @param {T[]} players @param {(p: T) => number} mmrOf @param {Record<number, number>} [draftMmr] @returns {T[]} */
export const pickOrder = (players, mmrOf, draftMmr = {}) => {
  const mmr = (p) => draftMmr[p.id] ?? mmrOf(p);
  return (players || [])
    .filter(p => !p.draft_excluded)
    .sort((a, b) => mmr(a) - mmr(b) || (a.name || '').localeCompare(b.name || ''));
};

// One pick set is one player for each team: the first set is the next one to
// draft, the rest come later.
/** @template T @param {T[]} order @param {number} teamCount @returns {{ next: T[], later: T[] }} */
export const pickSets = (order, teamCount) => ({
  next: order.slice(0, Math.max(0, teamCount)),
  later: order.slice(Math.max(0, teamCount)),
});

// A team card's average MMR, so the admins see the gaps while they balance the
// teams. A player with no MMR is left out; a roster with none has no average.
/** @template T @param {T[]} players @param {(p: T) => number} mmrOf @returns {number | null} */
export const averageMmr = (players, mmrOf) => {
  const known = (players || []).map(mmrOf).filter(mmr => mmr > 0);
  return known.length ? Math.round(known.reduce((sum, mmr) => sum + mmr, 0) / known.length) : null;
};

// How many players of the next set each team holds a pending pick for, so the
// team chips show which teams still need a player in this set.
/** @param {Record<number, number | null>} selection @param {number[]} nextIds @returns {Record<number, number>} */
export const pendingPerTeam = (selection, nextIds) => {
  /** @type {Record<number, number>} */
  const counts = {};
  for (const id of nextIds) {
    const teamId = selection[id];
    if (teamId != null) counts[teamId] = (counts[teamId] || 0) + 1;
  }
  return counts;
};
