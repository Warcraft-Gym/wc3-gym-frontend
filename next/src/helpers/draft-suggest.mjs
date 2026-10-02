// The round draft of a fixture: the figures the planner reads off the board read.

/** The MMR distance of two board players. A player with no MMR is never inside a difference. */
export const mmrGap = (a, b) => (a?.mmr == null || b?.mmr == null ? Infinity : Math.abs(a.mmr - b.mmr));

/** The drafts that take a place of the round; a replacement takes the place of the series it replaces. */
export const placeTakers = (drafted = []) => drafted.filter((row) => !row.replaces_series_id);

/** The board answers one row per possible pairing; this reads one of them by the two ids. */
export function pairIndex(board) {
  const map = new Map();
  for (const pair of board?.pairs || []) map.set(`${pair.player1_id}-${pair.player2_id}`, pair);
  return (player1Id, player2Id) => map.get(`${player1Id}-${player2Id}`);
}
