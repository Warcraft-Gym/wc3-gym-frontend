// The pick order over a season's signups: MMR ascending, a moved player at the
// slot he was moved to, and the players an admin took out left out entirely.
export const draftOrder = (players, mmrOf) => {
  const all = (players || []).filter(p => !p.draft_excluded);
  const order = all.filter(p => p.draft_position == null).sort((a, b) => mmrOf(a) - mmrOf(b));
  for (const p of all.filter(p => p.draft_position != null).sort((a, b) => a.draft_position - b.draft_position)) {
    order.splice(Math.min(p.draft_position, order.length), 0, p);
  }
  return order;
};
