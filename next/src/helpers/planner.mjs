// The captain round planner: who plays the round, the matchups a range allows, their facts and their order.
import { DateTime } from 'luxon';
import { checkInStatus } from './check-in.mjs';
import { mmrGap } from './draft-suggest.mjs';

/** Two players this many hours apart or more rarely find a time to play. */
export const TZ_WARN_HOURS = 8;

/** The hours between two IANA zones' UTC offsets at one instant; null when a zone is missing or unknown. */
export const tzGap = (zoneA, zoneB, at = null) => {
  if (!zoneA || !zoneB) return null;
  const when = at ? DateTime.fromISO(String(at), { zone: 'UTC' }) : DateTime.utc();
  const a = when.setZone(zoneA);
  const b = when.setZone(zoneB);
  if (!a.isValid || !b.isValid) return null;
  return Math.abs(a.offset - b.offset) / 60;
};

/** Does a player play the round? A team whose answers the caller reads decides by the answer, where no
 *  answer plays; the other team's roster read names only the rounds its players sit out. */
export const playsRound = ({ answer, answersRead, outRounds = [], playday }) =>
  answersRead ? checkInStatus(answer).short !== 'Out' : !outRounds.includes(playday);

/** The value the own-team switch writes: off writes an "Out"; on clears a captain's "Out" back to no
 *  answer, and overrides the player's own "Out" or blocked times with an explicit "In". */
export const switchAnswer = (answer, on) => {
  if (!on) return false;
  if (answer?.blocked_out) return true;
  if (answer?.available === false && answer.set_by_user_id === answer.user_id) return true;
  return null;
};

/** The board's players, each with the roster facts the board read does not carry: the name, the
 *  flag, the battle tag, the time zone, the series played this season and the races faced, in order.
 *  `answers` holds the round answers of the teams the caller reads them for, by team id.
 *  @param {{ board: any, rosters?: any[][], answers?: Record<number, any[]>, playday?: number }} args */
export function plannerPlayers({ board, rosters = [], answers = {}, playday }) {
  const byId = new Map(rosters.flat().map((person) => [person.id, person]));
  return (board?.players || []).map((row) => {
    const person = byId.get(row.user_id) || {};
    const teamAnswers = answers[row.team_id];
    const answer = teamAnswers?.find((one) => one.user_id === row.user_id && one.playday === playday);
    return {
      ...row,
      id: row.user_id,
      name: person.name ?? '',
      country: person.country ?? null,
      battleTag: person.battleTag ?? null,
      timezone: person.timezone ?? null,
      signup_race: row.race,
      played: person.record?.games ?? 0,
      faced: person.record?.matchup_history ?? [],
      answer,
      answersRead: !!teamAnswers,
      plays: playsRound({ answer, answersRead: !!teamAnswers, outRounds: person.record?.out_rounds, playday }),
    };
  });
}

// The races a player faced this season, in order, each flagged when it is the race of this opponent
const facedOf = (player, race) => (player.faced || []).map((one, index) => ({ key: index, race: one, same: !!one && one === race }));

/** One possible pairing, player `a` of team 1 and player `b` of team 2, with every fact the list shows.
 *  @param {any} a
 *  @param {any} b
 *  @param {{ range: number, pairOf?: (player1Id: number, player2Id: number) => any, at?: string | null }} options */
export function matchupRow(a, b, { range, pairOf, at = null }) {
  const difference = mmrGap(a, b);
  const pair = pairOf?.(a.user_id, b.user_id) ?? null;
  const hours = pair?.hours ?? null;
  const gap = tzGap(a.timezone, b.timezone, at);
  return {
    key: `${a.user_id}-${b.user_id}`,
    a,
    b,
    difference,
    outside: !(difference <= range),
    fewestGames: Math.min(a.played, b.played),
    gamesSum: a.played + b.played,
    hours,
    // no blocked times count as free all week, so hours mean something only when both entered theirs
    hoursKnown: hours != null && !!a.availability_entered && !!b.availability_entered,
    neitherEntered: !a.availability_entered && !b.availability_entered,
    tzGap: gap,
    tzWarn: gap != null && gap >= TZ_WARN_HOURS,
    recordA: a.vs_race?.[b.race] ?? null,
    recordB: b.vs_race?.[a.race] ?? null,
    facedA: facedOf(a, b.race),
    facedB: facedOf(b, a.race),
    pair,
  };
}

/** The pairings to weigh: every pair of free players inside the range, or, with a focus, every free
 *  opponent of that one player whatever the range.
 *  @param {{ side1: any[], side2: any[], team1Id: number, range: number, focus?: any, pairOf?: (player1Id: number, player2Id: number) => any, at?: string | null }} args */
export function matchupRows({ side1, side2, team1Id, range, focus = null, pairOf, at = null }) {
  const row = (a, b) => matchupRow(a, b, { range, pairOf, at });
  if (focus) return focus.team_id === team1Id ? side2.map((b) => row(focus, b)) : side1.map((a) => row(a, focus));
  return side1.flatMap((a) => side2.map((b) => row(a, b))).filter((one) => !one.outside);
}

export const SORT_KEYS = ['games', 'mmr', 'time'];
export const DEFAULT_ORDER = SORT_KEYS.map((key) => ({ key, dir: 1 }));
/** Each criterion in its first direction and turned round. */
export const SORT_LABELS = {
  games: ['Fewest games played', 'Most games played'],
  mmr: ['Smallest MMR difference', 'Largest MMR difference'],
  time: ['Most time overlap', 'Least time overlap'],
};

// A missing figure sorts last in the first direction
const byNumber = (x, y) => {
  const missingX = x == null || !Number.isFinite(x);
  const missingY = y == null || !Number.isFinite(y);
  if (missingX || missingY) return missingX === missingY ? 0 : missingX ? 1 : -1;
  return x - y;
};

const COMPARE = {
  games: (x, y) => x.fewestGames - y.fewestGames || x.gamesSum - y.gamesSum,
  mmr: (x, y) => byNumber(x.difference, y.difference),
  // known hours first, most first; then the pairs whose hours mean nothing, by the smaller time-zone gap
  time: (x, y) => {
    if (x.hoursKnown !== y.hoursKnown) return x.hoursKnown ? -1 : 1;
    return x.hoursKnown ? y.hours - x.hours : byNumber(x.tzGap, y.tzGap);
  },
};

/** The rows in the order the chips name, each key with its direction; ties keep a fixed order. */
export const sortMatchups = (rows, order = DEFAULT_ORDER) =>
  [...rows].sort((x, y) => {
    for (const { key, dir } of order) {
      const c = COMPARE[key](x, y) * dir;
      if (c) return c;
    }
    return x.key < y.key ? -1 : x.key > y.key ? 1 : 0;
  });

/** The first sorted rows inside the range that share no player, one per open place. */
export function topPicks(rows, open) {
  const used = new Set();
  const picks = new Set();
  for (const row of rows) {
    if (picks.size >= open) break;
    if (row.outside || used.has(row.a.user_id) || used.has(row.b.user_id)) continue;
    used.add(row.a.user_id);
    used.add(row.b.user_id);
    picks.add(row.key);
  }
  return picks;
}

/** The rated players with no opponent inside the range, each with the nearest one and how far away. */
export function rangeHints(side1, side2, range) {
  const hints = [];
  for (const [mine, theirs] of [[side1, side2], [side2, side1]]) {
    for (const player of mine) {
      const gaps = theirs.map((other) => ({ other, difference: mmrGap(player, other) })).filter((one) => Number.isFinite(one.difference));
      if (!gaps.length || gaps.some((one) => one.difference <= range)) continue;
      const nearest = gaps.reduce((best, one) => (one.difference < best.difference ? one : best));
      hints.push({ player, nearest: nearest.other, difference: nearest.difference });
    }
  }
  return hints;
}
