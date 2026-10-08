// The parts of the KOTH board read that are only data; docs/okf/pages/koth.md states the shape
import { archivedBrackets } from './koth-archive.mjs';

// The brackets weakest first, the way the cards read. The board answers them strongest first.
export const orderedBrackets = (board) =>
  board?.historical ? archivedBrackets(board.brackets) : [...(board?.brackets ?? [])].sort((a, b) => (a.lower_bound ?? 0) - (b.lower_bound ?? 0));

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

// The cuts the bracketing strip draws: the lower bound of every bracket but the weakest, ascending
export const cutsOf = (board) => orderedBrackets(board).slice(1).map((bracket) => bracket.lower_bound ?? 0);

/**
 * The bounds write of one night from the strip's cuts: the weakest bracket keeps 0 and each
 * stronger bracket opens at its cut, in the shape `setKothBounds` sends.
 *
 * @param {Object|null} board - The board read
 * @param {Array} cuts - Ascending, one per bracket but the weakest
 * @returns {Array<{division_id: number, lower_bound: number}>} - weakest first
 */
export const boundsOf = (board, cuts = []) =>
  orderedBrackets(board).map((bracket, index) => ({
    division_id: bracket.division_id,
    lower_bound: index === 0 ? 0 : cuts[index - 1] ?? bracket.lower_bound ?? 0,
  }));

/**
 * Every signup with a rating, one per race row: the kings, the lines, the open series and the
 * unplaced strip. A row the board names no rating for stays off the strip.
 *
 * @param {Object|null} board - The board read
 * @returns {Array<{entrant_id: number, user_id: number|null, name: string, race: string|null, mmr: number}>}
 */
export function ratedPlayers(board) {
  const rows = new Map();
  const add = (row, seat = row) => {
    if (row?.mmr == null || rows.has(row.entrant_id)) return;
    rows.set(row.entrant_id, { entrant_id: row.entrant_id, user_id: seat.user_id ?? null, name: seat.name, race: row.race ?? null, mmr: row.mmr });
  };
  for (const bracket of orderedBrackets(board)) {
    for (const seat of [bracket.king, ...(bracket.queue ?? [])]) for (const row of seat?.rows ?? []) add(row, seat);
    add(bracket.open_series?.side1);
    add(bracket.open_series?.side2);
  }
  for (const row of board?.unplaced ?? []) add(row);
  return [...rows.values()];
}

// A seat is named by its first race row, which is the one id it always holds
export const seatKey = (seat) => seat?.rows?.[0]?.entrant_id ?? null;

// The race row a seat plays next: the one the admin picked, else the first he signed up on
export const seatRow = (seat, picks = {}) => {
  const rows = seat?.rows ?? [];
  const wanted = picks[seatKey(seat)];
  return rows.find((row) => row.entrant_id === wanted) ?? rows[0] ?? null;
};

// The players who hold a place on the card: the king and every seat of the line
const seatedUsers = (bracket) => new Set([bracket?.king, ...(bracket?.queue ?? [])].filter(Boolean).map((seat) => seat.user_id));

// The races a seated player left tonight in this bracket; his seat shows them
export const seatLeft = (bracket, seat) => (seat?.user_id == null ? [] : (bracket?.left ?? []).filter((row) => row.user_id === seat.user_id));

/**
 * The players who left and hold no place on the card, one seat each: a player who left on two
 * races reads once, holding both rows. A row the board names no user for stands on its own,
 * because nothing folds it. A player still seated here shows his left races in his seat.
 *
 * @param {Object} bracket - One bracket of the board
 * @returns {Array} - One seat per player, each with the race rows he left on
 */
export function leftSeats(bracket) {
  const seated = seatedUsers(bracket);
  const seats = new Map();
  for (const row of bracket?.left ?? []) {
    if (row.user_id != null && seated.has(row.user_id)) continue;
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
  played?.throne === 'moved' ? 'Took the crown' : played?.throne === 'held' ? 'Defended the crown' : null;

// The whole line as the queue write names it: every race row of every seat, in seat order
export const queueIds = (queue = []) => queue.flatMap((seat) => (seat.rows ?? []).map((row) => row.entrant_id));

// One seat moved to another place, for the drag and for the two step buttons
export function movedQueue(queue = [], from, to) {
  if (from < 0 || to < 0 || from === to || to >= queue.length || from >= queue.length) return queue;
  const rows = [...queue];
  rows.splice(to, 0, ...rows.splice(from, 1));
  return rows;
}

// The races the reader entered the night on, from the board: his seats, his sides at the table and his unplaced rows, once each
export function myRacesOnBoard(board, userId) {
  if (userId == null) return [];
  const seats = orderedBrackets(board).flatMap((bracket) => [bracket.king, ...(bracket.queue ?? [])]);
  const mine = seats.filter((seat) => seat?.user_id === userId).flatMap((seat) => seat.rows ?? []);
  const playing = tableSides(board).filter((side) => side.user_id === userId);
  const unplaced = (board?.unplaced ?? []).filter((row) => row.user_id === userId);
  return [...new Set([...mine, ...playing, ...unplaced].map((row) => row.race).filter(Boolean))];
}

// Both sides of every series on the table
const tableSides = (board) =>
  orderedBrackets(board).flatMap((bracket) => [bracket.open_series?.side1, bracket.open_series?.side2]).filter(Boolean);

// Whether a race row of the king wears the crown: the crowned row, or every row of his when the board names none of them
export function wearsTheCrown(bracket, entrantId) {
  const rows = bracket?.king?.rows ?? [];
  const crowned = rows.find((row) => row.entrant_id === bracket.king_entrant_id);
  return rows.some((row) => row.entrant_id === entrantId) && (!crowned || crowned.entrant_id === entrantId);
}

/**
 * Whether a withdraw costs the king his next match: it takes the crowned row and leaves him no
 * other row in that bracket, which would take the crown with no forfeit. No race named takes
 * every row. A board that names none of his rows counts any race of a king.
 *
 * @param {Object|null} board - The board read
 * @param {number|null} userId - The reader
 * @param {string|null} [race] - The race withdrawn, or null for all of them
 * @returns {boolean}
 */
export function withdrawForfeitsCrown(board, userId, race = null) {
  if (userId == null) return false;
  return orderedBrackets(board).some((bracket) => {
    if (bracket.king?.user_id !== userId) return false;
    const rows = bracket.king.rows ?? [];
    if (race === null) return true;
    const crowned = rows.find((row) => row.entrant_id === bracket.king_entrant_id);
    if (!crowned) return rows.some((row) => row.race === race);
    return crowned.race === race && rows.every((row) => row.race === race);
  });
}

// Whether a withdraw forfeits a series on the table: the race named, or with no race named any race of his, is a side of one
/** @type {(board: Object|null, userId: number|null, race?: string|null) => boolean} */
export const withdrawForfeitsSeries = (board, userId, race = null) =>
  userId != null && tableSides(board).some((side) => side.user_id === userId && (race === null || side.race === race));

// A return to the tab reads the board again only once the edge copy can be newer than the last read
const REREAD_MS = 15000;
export const shouldReread = (lastReadMs, nowMs) => nowMs - lastReadMs >= REREAD_MS;

// Whether the reader sees "Sign up": a visitor only on a night open to anyone, a signed-in reader while a race is left to enter
export function canSignUp({ signedIn, signupsOpen, policy, signedUp, multiEntry, heldCount, raceCount }) {
  if (!signupsOpen) return false;
  if (!signedIn) return policy === 'anyone';
  return !signedUp || (!!multiEntry && heldCount < raceCount);
}

// Whether a race row is a side of a series tonight, open or played, in any bracket; such a row stays on the record
export const hasSeries = (board, entrantId) =>
  orderedBrackets(board).some((bracket) =>
    [bracket.open_series?.side1, bracket.open_series?.side2, ...(bracket.played ?? []).flatMap((played) => [played.winner, played.loser])]
      .some((side) => side?.entrant_id === entrantId));

/**
 * The status the run page's header reads: closed once the admin closed the night, not started
 * while no series exists and the start lies ahead, else running.
 *
 * @param {Object|null} board - The board read
 * @param {number} now - Milliseconds since the epoch
 * @returns {'closed'|'not_started'|'running'}
 */
export function nightStatus(board, now) {
  if (board?.closed) return 'closed';
  const start = board?.starts_at ? Date.parse(board.starts_at) : NaN;
  return !board?.series_count && start > now ? 'not_started' : 'running';
}

// Every open series the close deletes, named by its bracket and its two sides
export const openSeriesRows = (board) =>
  orderedBrackets(board)
    .filter((bracket) => bracket.open_series)
    .map((bracket) => ({
      division_id: bracket.division_id,
      name: bracket.name,
      side1: bracket.open_series.side1,
      side2: bracket.open_series.side2,
    }));

// What one result did to the crown, as the fix dialog says it
const CROWN_VERB = { moved: "takes the crown", held: "holds the crown", none: "doesn't touch the crown" };

// What a fix changes beyond the series itself, read off the board before it and the board its preview
// answers: the throne, the crown mark of every other series, and who goes to the end of the line.
// Empty when nothing else moves.
export function fixChanges(before, after, divisionId, seriesId) {
  const was = before?.brackets?.find((row) => row.division_id === divisionId);
  const now = after?.brackets?.find((row) => row.division_id === divisionId);
  if (!was || !now) return [];
  const lines = [];
  const order = [...(was.played ?? [])].reverse().map((row) => row.series_id);
  for (const row of [...(now.played ?? [])].reverse()) {
    const old = (was.played ?? []).find((item) => item.series_id === row.series_id);
    if (row.series_id === seriesId || !old || old.throne === row.throne) continue;
    lines.push({
      text: `Series ${order.indexOf(row.series_id) + 1}, ${row.winner.name} beat ${row.loser.name}`,
      was: CROWN_VERB[old.throne],
      now: CROWN_VERB[row.throne],
    });
  }
  // A king who loses the throne goes back in line where his seat stood, and a beaten player to the end
  const queue = (bracket) => (bracket.queue ?? []).map((seat) => seat.user_id);
  const [lineWas, lineNow] = [queue(was), queue(now)];
  (now.queue ?? []).forEach((seat, index) => {
    const last = index === lineNow.length - 1;
    if (!lineWas.includes(seat.user_id)) {
      lines.push({ text: last ? `${seat.name} goes to the end of the queue.` : `${seat.name} goes back in the queue at place ${index + 1}.` });
    } else if (last && lineWas.at(-1) !== seat.user_id) {
      lines.push({ text: `${seat.name} goes to the end of the queue.` });
    }
  });
  const [king, crowned] = [was.king, now.king];
  if (king?.user_id !== crowned?.user_id) {
    const text = !crowned ? `The throne is left empty.` : king ? `The throne passes from ${king.name} to ${crowned.name}.` : `${crowned.name} takes the empty throne.`;
    lines.unshift({ text });
  } else if (lines.length && king) {
    lines.unshift({ text: `The throne stays with ${king.name}.` });
  }
  return lines;
}

// Who an empty throne can go to in one tap: the winner of the bracket's newest result, while one of his
// race rows still stands in its line. A king on the throne, or no result tonight, offers nobody.
export function heirOf(bracket) {
  const latest = bracket?.king ? null : bracket?.played?.[0];
  const winner = latest?.winner;
  const standing = (bracket?.queue ?? []).some((seat) => (seat.rows ?? []).some((row) => row.entrant_id === winner?.entrant_id));
  return standing ? winner : null;
}

// Every race row a bracket holds tonight, for "Add result": the king, the line and the rows that left,
// since a player who left played before he went. `several` marks a player on more than one race here.
export function resultSides(bracket) {
  const seats = [bracket?.king, ...(bracket?.queue ?? []), ...leftSeats(bracket ?? {})].filter(Boolean);
  const rows = seats.flatMap((seat) => (seat.rows ?? []).map((row) => ({ entrant_id: row.entrant_id, user_id: seat.user_id, name: seat.name, race: row.race })));
  const unique = [...new Map(rows.map((row) => [row.entrant_id, row])).values()];
  return unique.map((row) => ({ ...row, several: unique.filter((one) => one.user_id === row.user_id).length > 1 }));
}

// The race row each king plays next until an admin picks another: the row the board says wears the
// crown, so a reload never shows a two-race king on his first race instead
export const crownedPicks = (board) =>
  Object.fromEntries((board?.brackets ?? []).filter((bracket) => bracket.king && bracket.king_entrant_id != null).map((bracket) => [seatKey(bracket.king), bracket.king_entrant_id]));

// How long the stream view waits before it reads the board again, or null once it stops: 30 s while the
// night has a series, 5 min before the first one (enough to notice the start), and never once the night
// is closed or a day past its start, so a forgotten tab stops costing reads
const STREAM_PLAY_MS = 30000;
const STREAM_WAIT_MS = 300000;
const STREAM_DAY_MS = 24 * 3600 * 1000;
export function streamPollMs(board, nowMs) {
  if (!board || board.closed) return null;
  const start = board.starts_at ? Date.parse(board.starts_at) : NaN;
  if (Number.isFinite(start) && nowMs > start + STREAM_DAY_MS) return null;
  return board.series_count > 0 ? STREAM_PLAY_MS : STREAM_WAIT_MS;
}

// The queue and the results a viewer folds away, as "<bracket name>:<part>". The key holds past a
// reload, a logout and the next event, so a stream set up once stays set up, and it stays out of
// SESSION_KEYS: the choice is the viewer's
const FOLDED_KEY = 'kothFolded';
export function foldedStored(part, store = globalThis.localStorage) {
  try {
    return JSON.parse(store.getItem(FOLDED_KEY) || '[]').includes(part);
  } catch {
    return false; // a browser with storage blocked shows every part
  }
}
export function storeFolded(part, on, store = globalThis.localStorage) {
  try {
    const kept = JSON.parse(store.getItem(FOLDED_KEY) || '[]').filter((one) => one !== part);
    store.setItem(FOLDED_KEY, JSON.stringify(on ? [...kept, part] : kept));
  } catch {
    // a browser with storage blocked forgets the choice on the next load
  }
}
