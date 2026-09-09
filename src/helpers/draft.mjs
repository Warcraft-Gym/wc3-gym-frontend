// The pick order over a season's signups: MMR ascending, a moved player at the
// slot he was moved to, and the players an admin took out left out entirely.
export const draftOrder = (players, mmrOf, excluded = new Set()) => {
  const all = (players || []).filter(p => !excluded.has(p.id));
  const order = all.filter(p => p.draft_position == null).sort((a, b) => mmrOf(a) - mmrOf(b));
  for (const p of all.filter(p => p.draft_position != null).sort((a, b) => a.draft_position - b.draft_position)) {
    order.splice(Math.min(p.draft_position, order.length), 0, p);
  }
  return order;
};

// Who is out of the pick list. This browser only, one entry per season.
const key = (seasonId) => `draftExcluded.${seasonId}`;

export const loadExcluded = (seasonId) => {
  try {
    return new Set(JSON.parse(localStorage.getItem(key(seasonId)) || '[]'));
  } catch {
    return new Set();
  }
};

export const saveExcluded = (seasonId, ids) => localStorage.setItem(key(seasonId), JSON.stringify([...ids]));
