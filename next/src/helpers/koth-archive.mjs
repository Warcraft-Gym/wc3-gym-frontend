/**
 * The series of an archived bracket as the rows of the live Results table, newest first. The
 * winner is the side the source page wrote, else the side the order of play infers; the crown
 * mark comes from `throne`. A series with no winner keeps its two sides in source order.
 *
 * @param {Array} history - The bracket's `history` rows, in any order
 * @returns {Array<{series_id: number, winner: Object, loser: Object, throne: string|null, forfeit: boolean, replay: boolean, inferred: boolean, undecided: boolean, review_note: string|null}>}
 */
export function archivedResults(history = []) {
  return (history ?? [])
    .map((row, index) => ({ row, at: row.sequence ?? index }))
    .sort((a, b) => b.at - a.at)
    .map(({ row }) => {
      const side = row.winner_side || row.inferred_winner_side || null;
      const undecided = side !== 1 && side !== 2;
      const [winner, loser] = side === 2 ? [row.side2, row.side1] : [row.side1, row.side2];
      return {
        series_id: row.series_id,
        winner,
        loser,
        // a series with no winner moved no crown, and a row the read names no throne for wears no mark
        throne: undecided ? null : (row.throne ?? null),
        forfeit: !!row.forfeit,
        replay: false,
        inferred: !undecided && !row.winner_side,
        undecided,
        review_note: row.review_note || null,
      };
    });
}
