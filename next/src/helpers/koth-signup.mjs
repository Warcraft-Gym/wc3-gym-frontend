// Where a KOTH signup landed: the bracket of the board that holds the new entrant row, and
// its place in that bracket's line. The dialog reads the board once after the signup.

import { placeWord } from './koth-board.mjs';

// The entrant ids one seat of the line holds: a player takes one seat and one row per race.
const seatIds = (seat) => (seat?.rows ?? []).map((row) => row.entrant_id);
const playerId = (player) => (player?.entrant_id == null ? [] : [player.entrant_id]);

// Every entrant id the bracket holds, wherever the board draws it.
const bracketIds = (bracket) => [
  ...(bracket.queue ?? []).flatMap(seatIds),
  ...seatIds(bracket.king),
  ...playerId(bracket.defender),
  ...(bracket.left ?? []).flatMap(playerId),
  ...playerId(bracket.open_series?.side1),
  ...playerId(bracket.open_series?.side2),
];

// The one name a bracket reads by, on the board and on the event row: its name, else its position.
export const bracketName = (bracket, index) => bracket?.name || `Bracket ${index + 1}`;

/**
 * The bracket and place in line of one entrant on a KOTH board.
 *
 * @param {Object} board - the answer of GET /koth/nights/{id}/board
 * @param {number} entrantId - the entrant the signup answered
 * @returns {{bracket: string, placeWord: string|null}|null} - null when no bracket holds the
 *   row; `placeWord` null when the bracket holds it outside the line
 */
export function signupPlace(board, entrantId) {
  const brackets = board?.brackets ?? [];
  for (const [index, bracket] of brackets.entries()) {
    if (!bracketIds(bracket).includes(entrantId)) continue;
    const at = (bracket.queue ?? []).findIndex((seat) => seatIds(seat).includes(entrantId));
    return { bracket: bracketName(bracket, index), placeWord: at < 0 ? null : placeWord(at + 1) };
  }
  return null;
}
