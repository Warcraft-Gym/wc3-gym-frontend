// Which map each game of a series is played on, mirroring app/core/map_order.py.
// A fixed game takes the round's map. A loser game takes the map picked by the
// side that lost the game before, so it is only known once the games are won.
// Every other rule leaves the game without a map and the reporter names it.
import { DEFAULT_RULES, winsFor } from './best-of.mjs';

export const otherSide = (side) => (side === 'A' ? 'B' : 'A');

export const rulesOf = (mapRules) => (mapRules || DEFAULT_RULES).split(',').map((rule) => rule.trim()).filter(Boolean);

// The map to offer for each game, in game order. A game nobody can work out yet answers null.
// A series that vetoes by its best-of hands over `queue`, every pick of each side in veto order,
// so a side that loses twice plays its second pick, and `decider`, the map game 1 plays.
/** @param {string | null | undefined} mapRules @param {number | null | undefined} fixedMapId
 *  @param {any} picks @param {(string | null | undefined)[]} winners
 *  @param {{ queue?: Record<string, number[]> | null, decider?: number | null }} [offers] */
export const mapsByGame = (mapRules, fixedMapId, picks, winners = [], { queue = null, decider = null } = {}) => {
  /** @type {Record<string, number>} */
  const used = { A: 0, B: 0 };
  return rulesOf(mapRules).map((rule, index) => {
    if (rule === 'fixed') return fixedMapId || null;
    if (rule === 'decider') return decider || null;
    if (rule !== 'loser') return null;
    const before = winners[index - 1];
    if (!before) return null;
    const loser = otherSide(before);
    if (!queue) return picks[loser] || null;
    const own = queue[loser] || [];
    return own[used[loser]++] ?? null;
  });
};

// Every pick of each side, in veto order: a series of five games takes two a side
/** @param {any[] | null | undefined} steps @returns {Record<string, number[]>} */
export const pickQueueOf = (steps) => {
  /** @type {Record<string, number[]>} */
  const queue = { A: [], B: [] };
  for (const step of [...(steps || [])].sort((a, b) => a.step_no - b.step_no)) {
    if (step.action === 'pick' && step.side in queue) queue[step.side].push(step.map_id);
  }
  return queue;
};

// The map game 1 plays once the veto is done: the one nobody banned or picked
/** @param {number[] | null | undefined} pool @param {any[] | null | undefined} steps @param {boolean | null | undefined} complete
 *  @returns {number | null} */
export const deciderOf = (pool, steps, complete) => {
  if (!complete) return null;
  const used = new Set((steps || []).map((step) => step.map_id));
  const left = (pool || []).filter((id) => !used.has(id));
  return left.length === 1 ? left[0] : null;
};

// What the offers of a series read off its veto board: a series that vetoes by its best-of
// carries the decider rule, and only it reads the queue and the decider
/** @param {string | null | undefined} mapRules @param {any} veto
 *  @returns {{ queue?: Record<string, number[]>, decider?: number | null }} */
export const vetoOffers = (mapRules, veto) =>
  rulesOf(mapRules).includes('decider')
    ? { queue: pickQueueOf(veto?.steps), decider: deciderOf(veto?.pool, veto?.steps, veto?.complete) }
    : {};

// The map each side picked in the veto, taking a side's first pick as its own
export const picksOf = (steps) => {
  const picks = {};
  for (const step of [...(steps || [])].sort((a, b) => a.step_no - b.step_no)) {
    if (step.action === 'pick' && !(step.side in picks)) picks[step.side] = step.map_id;
  }
  return picks;
};

// The games answered so far: the run of winners before the first game left blank
const answered = (winners) => {
  const blank = winners.findIndex((side) => !side);
  return blank === -1 ? winners.length : blank;
};

// The series score the tapped winners add up to
export const scoreOf = (winners) => {
  const played = winners.slice(0, answered(winners));
  return ['A', 'B'].map((side) => played.filter((won) => won === side).length);
};

// How many game rows to show over a best-of of this many games: every game answered, plus
// the next while the series is open. A season counts its games off its map rules and a
// stage carries its best_of, so both hand over a count.
export const gameSlots = (games, winners) => {
  const [a, b] = scoreOf(winners);
  const wins = winsFor(games);
  if (a >= wins || b >= wins) return a + b;
  return Math.min(games, a + b + 1);
};

// The games to report: one entry per game played, as the backend checks them
export const gamesReported = (winners, mapOf) =>
  winners.slice(0, answered(winners)).map((side, index) => ({
    game_no: index + 1,
    winner_side: side,
    map_id: mapOf(index + 1) || null,
  }));

// The map a fixed game plays: the round's map, the one column the veto reads
export const fixedMapOf = (mapRules, round) => (rulesOf(mapRules).includes('fixed') ? round?.map_id ?? null : null);
