// The parts of the KOTH board read that are only data; docs/okf/pages/koth.md states the shape

// The brackets weakest first, the way the cards read. The board answers them strongest first.
export const orderedBrackets = (board) =>
  [...(board?.brackets ?? [])].sort((a, b) => (a.lower_bound ?? 0) - (b.lower_bound ?? 0));

/**
 * The name and the MMR band of one bracket. The band runs from the bracket's own bound to
 * one below the next bracket's, and the strongest bracket has no top.
 *
 * @param {Array} brackets - Every bracket of the board
 * @param {Object} bracket - The bracket to name
 * @returns {{name: string, band: string}}
 */
export function bracketLabel(brackets = [], bracket = null) {
  const low = bracket?.lower_bound ?? 0;
  const next = [...new Set((brackets ?? []).map((row) => row.lower_bound ?? 0))]
    .sort((a, b) => a - b)
    .find((bound) => bound > low);
  const band = next === undefined ? `${low} MMR and up` : low ? `${low} to ${next - 1} MMR` : `under ${next} MMR`;
  return { name: bracket?.name || 'Bracket', band };
}

// A seat is named by its first race row, which is the one id it always holds
export const seatKey = (seat) => seat?.rows?.[0]?.entrant_id ?? null;

// The race row a seat plays next: the one the admin picked, else the first he signed up on
export const seatRow = (seat, picks = {}) => {
  const rows = seat?.rows ?? [];
  const wanted = picks[seatKey(seat)];
  return rows.find((row) => row.entrant_id === wanted) ?? rows[0] ?? null;
};

/**
 * The players who left, one seat each: a player who left on two races reads once, holding both
 * rows. A row the board names no user for stands on its own, because nothing folds it.
 *
 * @param {Object} bracket - One bracket of the board
 * @returns {Array} - One seat per player, each with the race rows he left on
 */
export function leftSeats(bracket) {
  const seats = new Map();
  for (const row of bracket?.left ?? []) {
    const key = row.user_id == null ? `row:${row.entrant_id}` : `user:${row.user_id}`;
    const seat = seats.get(key);
    // a player on two races is one player, so the folded seat names neither race nor rating
    if (seat) Object.assign(seat, { race: null, mmr: null, rows: [...seat.rows, row] });
    else seats.set(key, { ...row, rows: [row] });
  }
  return [...seats.values()];
}

// A seat can play when it holds a race row and is not in an open series of another bracket
const free = (seat) => !!seat && !seat.busy && !!(seat.rows ?? []).length;

/**
 * The pair the one filled start button plays: the king against the first seat of the queue
 * that is not busy. With an empty throne the king from the last event defends first, at his
 * own place in the line, and the first two seats play when the bracket has no defender.
 *
 * @param {Object} bracket - One bracket of the board
 * @returns {Array|null} - The two seats, or null when the bracket cannot pair anyone
 */
export function defaultPair(bracket) {
  const waiting = (bracket?.queue ?? []).filter(free);
  if (free(bracket?.king)) return waiting[0] ? [bracket.king, waiting[0]] : null;
  if (waiting.length < 2) return null;
  const defender = bracket?.defender?.user_id ?? null;
  const at = Math.max(0, waiting.findIndex((seat) => defender !== null && seat.user_id === defender));
  return [waiting[at], waiting[at === 0 ? 1 : 0]];
}

// The seat the default pair stepped over, so the admin reads why the first in line waits
export const skippedSeat = (bracket) => {
  const first = (bracket?.queue ?? [])[0];
  return first?.busy ? first : null;
};

/**
 * The one filled start button of a bracket: the pair, its label and the quiet line under it.
 * Two seats the admin picked by hand beat the default pair.
 *
 * @param {Object} bracket - One bracket of the board
 * @param {Array} picked - The seats the admin clicked, at most two
 * @returns {{pair: Array, label: string, note: string|null}|null}
 */
export function startButton(bracket, picked = []) {
  const pair = picked.length === 2 ? picked : defaultPair(bracket);
  if (!pair) return null;
  const king = bracket?.king ?? null;
  // a side game leaves the throne where it stands, which the admin reads before he starts it
  const aside = king && !pair.some((seat) => seat.user_id === king.user_id);
  return {
    pair,
    label: `Start ${pair[0].name} vs ${pair[1].name}`,
    note: aside ? `The crown stays with ${king.name}.` : null,
  };
}

const WORDS = ['', 'first', 'second', 'third', 'fourth', 'fifth', 'sixth', 'seventh', 'eighth', 'ninth', 'tenth'];
const suffix = (n) => (n % 100 >= 11 && n % 100 <= 13 ? 'th' : ['th', 'st', 'nd', 'rd'][n % 10] || 'th');

// A place in the line as a word: first to tenth, then 11th and up
export const placeWord = (n) => WORDS[n] ?? `${n}${suffix(n)}`;

// Where one reader stands in one bracket's line, or null when he holds no place in it
export function placeInQueue(bracket, userId) {
  if (userId == null) return null;
  const at = (bracket?.queue ?? []).findIndex((seat) => seat.user_id === userId);
  return at < 0 ? null : `You are ${placeWord(at + 1)} in line`;
}

// What a played row says about the crown. The bracket's king is the truth; this is the hint.
export const throneWord = (played) =>
  played?.throne === 'moved' ? 'The throne moved' : played?.throne === 'held' ? 'The throne was held' : null;

// The whole line as the queue write names it: every race row of every seat, in seat order
export const queueIds = (queue = []) => queue.flatMap((seat) => (seat.rows ?? []).map((row) => row.entrant_id));

// One seat moved to another place, for the drag and for the two step buttons
export function movedQueue(queue = [], from, to) {
  if (from < 0 || to < 0 || from === to || to >= queue.length || from >= queue.length) return queue;
  const rows = [...queue];
  rows.splice(to, 0, ...rows.splice(from, 1));
  return rows;
}

// The races the reader entered the night on, from the board: his seats and his unplaced rows
export function myRacesOnBoard(board, userId) {
  if (userId == null) return [];
  const seats = orderedBrackets(board).flatMap((bracket) => [bracket.king, ...(bracket.queue ?? [])]);
  const mine = seats.filter((seat) => seat?.user_id === userId).flatMap((seat) => seat.rows ?? []);
  const unplaced = (board?.unplaced ?? []).filter((row) => row.user_id === userId);
  return [...mine, ...unplaced].map((row) => row.race).filter(Boolean);
}

// Every open series the close deletes, named by its bracket and its two sides
export const openSeriesRows = (board) =>
  orderedBrackets(board)
    .filter((bracket) => bracket.open_series)
    .map((bracket) => ({
      division_id: bracket.division_id,
      text: `${bracket.name} · ${bracket.open_series.side1.name} vs ${bracket.open_series.side2.name}`,
    }));
