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
 *  flag, the battle tag, the time zone, the series played this season and the races faced, in order,
 *  the ladder summary per race and the season record.
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
      // the stats panel: the ladder summary per race, the GNL record of the event, the last sync
      race_mmrs: person.race_mmrs ?? [],
      main_race: person.main_race ?? null,
      record: person.record ?? null,
      w3c_synced_at: person.w3c_synced_at ?? null,
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

/** One key for a pair of players, whichever of the two comes first.
 *  @param {number} a @param {number} b */
export const pairKey = (a, b) => (Number(a) < Number(b) ? `${a}~${b}` : `${b}~${a}`);

/** Every pair the draft or the published series already hold, as pair keys.
 *  @param {any[]} published @param {any[]} drafts */
export const takenPairs = (published = [], drafts = []) => new Set([...published, ...drafts].map((row) => pairKey(row.player1_id, row.player2_id)));

/** The pairings to weigh: every pair of the players who play, inside the range, or, with a focus,
 *  every opponent of that one player whatever the range. A pair the draft or the published series
 *  already hold is left out; a player who holds another match stays.
 *  @param {{ side1: any[], side2: any[], team1Id: number, range: number, focus?: any, pairOf?: (player1Id: number, player2Id: number) => any, at?: string | null, taken?: Set<string> }} args */
export function matchupRows({ side1, side2, team1Id, range, focus = null, pairOf, at = null, taken = new Set() }) {
  const row = (a, b) => matchupRow(a, b, { range, pairOf, at });
  const open = (one) => !taken.has(pairKey(one.a.user_id, one.b.user_id));
  if (focus) return (focus.team_id === team1Id ? side2.map((b) => row(focus, b)) : side1.map((a) => row(a, focus))).filter(open);
  return side1.flatMap((a) => side2.map((b) => row(a, b))).filter((one) => !one.outside && open(one));
}

/** Every match a player holds this round, by player: a published series (`played` once it holds a
 *  result), a pairing in the draft, or one the viewer selected in the planner, each with the opponent.
 *  @param {{ published?: any[], drafts?: any[], selection?: any[] }} args
 *  @returns {Map<number, { kind: 'published' | 'played' | 'draft' | 'selected', opponent: number }[]>} */
export function matchesOf({ published = [], drafts = [], selection = [] }) {
  /** @type {Map<number, { kind: 'published' | 'played' | 'draft' | 'selected', opponent: number }[]>} */
  const map = new Map();
  /** @param {any} row @param {'published' | 'played' | 'draft' | 'selected'} kind */
  const add = (row, kind) => {
    for (const [one, other] of [[row.player1_id, row.player2_id], [row.player2_id, row.player1_id]]) {
      if (one == null) continue;
      map.set(one, [...(map.get(one) || []), { kind, opponent: other }]);
    }
  };
  for (const row of published) add(row, row.player1_score != null || row.player2_score != null ? 'played' : 'published');
  for (const row of drafts) add(row, 'draft');
  for (const row of selection) add(row, 'selected');
  return map;
}

/** The selection still worth moving to the draft: an item leaves once the draft or the published
 *  series hold its pair, once a player is off the board, or once the series it replaces is gone,
 *  holds a result, or has another draft replacing it. An item that changes a replacement draft
 *  leaves with that draft.
 *  @param {any[]} selection
 *  @param {{ published?: any[], drafts?: any[], known: (id: number) => boolean }} args */
export function pruneSelection(selection, { published = [], drafts = [], known }) {
  const taken = takenPairs(published, drafts);
  return selection.filter((item) => {
    if (taken.has(pairKey(item.player1_id, item.player2_id)) || !known(item.player1_id) || !known(item.player2_id)) return false;
    if (item.draft_id != null) return drafts.some((row) => row.id === item.draft_id);
    if (item.replaces_series_id == null) return true;
    const series = published.find((row) => Number(row.id) === Number(item.replaces_series_id));
    if (!series || series.player1_score != null || series.player2_score != null) return false;
    return !drafts.some((row) => Number(row.replaces_series_id) === Number(item.replaces_series_id));
  });
}

/** The selection with one item switched: off when it is there, on otherwise. `onePerPlayer` names a
 *  player who takes one selected match, so switching another of theirs on drops the earlier one.
 *  @param {any[]} selection @param {any} item @param {{ onePerPlayer?: number | null }} [options] */
export function selectItem(selection, item, { onePerPlayer = null } = {}) {
  const key = pairKey(item.player1_id, item.player2_id);
  if (selection.some((one) => pairKey(one.player1_id, one.player2_id) === key)) return selection.filter((one) => pairKey(one.player1_id, one.player2_id) !== key);
  const kept = onePerPlayer == null ? selection : selection.filter((one) => one.player1_id !== onePerPlayer && one.player2_id !== onePerPlayer);
  return [...kept, item];
}

export const SORT_KEYS = ['games', 'mmr', 'time', 'mmr1', 'mmr2'];
export const DEFAULT_ORDER = ['games', 'mmr', 'time'].map((key) => ({ key, dir: 1 }));
/** Each criterion in its first direction and turned round; a team's MMR is named by `sortLabel`. */
export const SORT_LABELS = {
  games: ['Fewest games played', 'Most games played'],
  mmr: ['Smallest MMR difference', 'Largest MMR difference'],
  time: ['Most time overlap', 'Least time overlap'],
};

/** A criterion in one direction, a team's MMR named by that team.
 *  @param {string} key @param {1 | -1} dir @param {{ team1?: string, team2?: string }} [teams] */
export const sortLabel = (key, dir, { team1 = 'Team 1', team2 = 'Team 2' } = {}) => {
  if (key === 'mmr1' || key === 'mmr2') return `${key === 'mmr1' ? team1 : team2} MMR: ${dir === 1 ? 'highest first' : 'lowest first'}`;
  return SORT_LABELS[key][dir === 1 ? 0 : 1];
};

/** The order with one criterion moved one place earlier; the first stays where it is.
 *  @param {{ key: string, dir: 1 | -1 }[]} order @param {string} key */
export const moveEarlier = (order, key) => {
  const index = order.findIndex((one) => one.key === key);
  if (index <= 0) return order;
  const next = [...order];
  [next[index - 1], next[index]] = [next[index], next[index - 1]];
  return next;
};

// A missing figure sorts last in the first direction
const byNumber = (x, y) => {
  const missingX = x == null || !Number.isFinite(x);
  const missingY = y == null || !Number.isFinite(y);
  if (missingX || missingY) return missingX === missingY ? 0 : missingX ? 1 : -1;
  return x - y;
};
// Highest first, a missing figure still last
const byNumberDown = (x, y) => {
  const missingX = x == null || !Number.isFinite(x);
  const missingY = y == null || !Number.isFinite(y);
  if (missingX || missingY) return missingX === missingY ? 0 : missingX ? 1 : -1;
  return y - x;
};

const COMPARE = {
  games: (x, y) => x.fewestGames - y.fewestGames || x.gamesSum - y.gamesSum,
  mmr: (x, y) => byNumber(x.difference, y.difference),
  // known hours first, most first; then the pairs whose hours mean nothing, by the smaller time-zone gap
  time: (x, y) => {
    if (x.hoursKnown !== y.hoursKnown) return x.hoursKnown ? -1 : 1;
    return x.hoursKnown ? y.hours - x.hours : byNumber(x.tzGap, y.tzGap);
  },
  // a team's player by MMR, team 1 always `a`
  mmr1: (x, y) => byNumberDown(x.a.mmr, y.a.mmr),
  mmr2: (x, y) => byNumberDown(x.b.mmr, y.b.mmr),
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

/** The first sorted rows inside the range that share no player, up to `count`, skipping the players
 *  in `busy`, who already hold a match this round.
 *  @param {any[]} rows @param {number} count @param {Set<number>} [busy] */
export function topPicks(rows, count, busy = new Set()) {
  const used = new Set(busy);
  const picks = new Set();
  for (const row of rows) {
    if (picks.size >= count) break;
    if (row.outside || used.has(row.a.user_id) || used.has(row.b.user_id)) continue;
    used.add(row.a.user_id);
    used.add(row.b.user_id);
    picks.add(row.key);
  }
  return picks;
}

/** The players whose name or battle tag holds the query, case-insensitive; an empty query keeps all.
 *  @template T
 *  @param {T[]} players
 *  @param {string | null | undefined} query
 *  @returns {T[]} */
export const searchPlayers = (players, query) => {
  const needle = String(query ?? '').trim().toLowerCase();
  if (!needle) return players;
  return players.filter((/** @type {any} */ player) => [player.name, player.battleTag].some((value) => String(value ?? '').toLowerCase().includes(needle)));
};

/** What a new match for one player would be. A published series of theirs that holds no result is
 *  replaced: the opponent leaves it, and `replacedBy` is the draft that already replaces it and keeps
 *  this player. Any other player gets a new pairing, beside the played series or the drafted pairing
 *  they may hold; `leaving` is their open series a draft replaces without them.
 *  @param {number} playerId
 *  @param {any[]} published
 *  @param {any[]} drafts
 *  @returns {{ kind: 'replace', series: any, dropId: number, replacedBy: any } | { kind: 'new', played: any, drafted: any, leaving: any }} */
export function newMatchFor(playerId, published = [], drafts = []) {
  const holds = (row) => row.player1_id === playerId || row.player2_id === playerId;
  const open = published.find((row) => holds(row) && row.player1_score == null && row.player2_score == null);
  const replacedBy = open ? drafts.find((row) => Number(row.replaces_series_id) === Number(open.id)) ?? null : null;
  if (open && (!replacedBy || holds(replacedBy))) {
    return { kind: 'replace', series: open, dropId: open.player1_id === playerId ? open.player2_id : open.player1_id, replacedBy };
  }
  return {
    kind: 'new',
    played: published.find((row) => holds(row) && row !== open) ?? null,
    drafted: drafts.find((row) => holds(row) && !row.replaces_series_id) ?? null,
    leaving: open ?? null,
  };
}

/** The matchups of a replacement: every selected player of one team against every candidate of the
 *  other, whatever the range, team 1 always as `a`. The opponent who leaves a replaced series is no
 *  candidate for it, nor is the one its replacement draft already names; `second` marks a candidate who
 *  already holds a series or a drafted pairing.
 *  @param {{ selected: any[], candidates: any[], team1Id: number, range: number, published?: any[], drafts?: any[], pairOf?: (player1Id: number, player2Id: number) => any, at?: string | null }} args */
export function replacementRows({ selected, candidates, team1Id, range, published = [], drafts = [], pairOf, at = null }) {
  const paired = new Set([...published, ...drafts].flatMap((row) => [row.player1_id, row.player2_id]));
  return selected.flatMap((stay) => {
    const need = newMatchFor(stay.user_id, published, drafts);
    const skip = new Set(need.kind === 'replace' ? [need.dropId, need.replacedBy?.player1_id, need.replacedBy?.player2_id] : []);
    return candidates
      .filter((other) => !skip.has(other.user_id))
      .map((other) => {
        const [a, b] = stay.team_id === team1Id ? [stay, other] : [other, stay];
        return { ...matchupRow(a, b, { range, pairOf, at }), stay, other, need, second: paired.has(other.user_id) };
      });
  });
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
