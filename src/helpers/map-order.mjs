// Which map each game of a series is played on, mirroring app/core/map_order.py.
// A fixed game takes the round's map. A loser game takes the map picked by the
// side that lost the game before, so it is only known once the games are won.
// Every other rule leaves the game without a map and the reporter names it.
import { DEFAULT_RULES, gamesOf, winsOf } from './best-of.mjs';

export const otherSide = (side) => (side === 'A' ? 'B' : 'A');

export const rulesOf = (mapRules) => (mapRules || DEFAULT_RULES).split(',').map((rule) => rule.trim()).filter(Boolean);

// The map to offer for each game, in game order. A game nobody can work out yet answers null.
export const mapsByGame = (mapRules, fixedMapId, picks, winners = []) =>
  rulesOf(mapRules).map((rule, index) => {
    if (rule === 'fixed') return fixedMapId || null;
    if (rule !== 'loser') return null;
    const before = winners[index - 1];
    return before ? picks[otherSide(before)] || null : null;
  });

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

// How many game rows to show: every game answered, plus the next while the series is open
export const gameSlots = (mapRules, winners) => {
  const [a, b] = scoreOf(winners);
  const wins = winsOf(mapRules);
  if (a >= wins || b >= wins) return a + b;
  return Math.min(gamesOf(mapRules), a + b + 1);
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
