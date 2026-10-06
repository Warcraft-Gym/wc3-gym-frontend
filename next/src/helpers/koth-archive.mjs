/**
 * The series of an archived bracket as the rows of the live Results table, newest first. The
 * winner is the side the source page wrote, else the side the order of play infers; the crown
 * mark comes from `throne`. A series with no winner keeps its two sides in source order.
 * `winner_left` is true when neither side plays the next series: with a winner, he withdrew after
 * it; with none, the winner is not known. An older row's `forfeit` reads as `winner_left`.
 *
 * @param {Array} history - The bracket's `history` rows, in any order
 * @returns {Array<{series_id: number, winner: Object, loser: Object, throne: string|null, winner_left: boolean, replay: boolean, inferred: boolean, undecided: boolean, review_note: string|null}>}
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
        winner_left: !!row.winner_left || (!!row.forfeit && undecided),
        replay: false,
        inferred: !undecided && !row.winner_side,
        undecided,
        review_note: row.review_note || null,
      };
    });
}

/**
 * The brackets of an archived night weakest first, as a live night orders them. A bracket with no
 * `lower_bound` comes before any number; among brackets with the same or no bound, the one the
 * source page lists later comes first.
 *
 * @param {Array} brackets - The board's `brackets`, in source page order
 * @returns {Array} - The same brackets, weakest first
 */
export const archivedBrackets = (brackets = []) =>
  (brackets ?? [])
    .map((bracket, index) => ({ bracket, index, bound: bracket.lower_bound ?? -Infinity }))
    .sort((a, b) => a.bound - b.bound || b.index - a.index)
    .map(({ bracket }) => bracket);
