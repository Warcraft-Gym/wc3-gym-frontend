import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  DEFAULT_ORDER,
  matchupRow,
  matchesOf,
  matchupRows,
  moveEarlier,
  newMatchFor,
  pairKey,
  plannerPlayers,
  playsRound,
  pruneSelection,
  rangeHints,
  replacementRows,
  searchPlayers,
  selectItem,
  sortLabel,
  sortMatchups,
  switchAnswer,
  takenPairs,
  topPicks,
  tzGap,
} from './planner.mjs';

const player = (user_id, team_id, mmr, extra = {}) => ({
  user_id,
  team_id,
  mmr,
  race: 'HU',
  played: 0,
  faced: [],
  timezone: 'Europe/Berlin',
  availability_entered: true,
  ...extra,
});

test('the time-zone gap reads both offsets at the instant, so summer time moves it', () => {
  assert.equal(tzGap('Europe/Stockholm', 'Asia/Seoul', '2026-01-05T00:00:00Z'), 8);
  assert.equal(tzGap('Europe/Stockholm', 'Asia/Seoul', '2026-07-06T00:00:00Z'), 7);
  assert.equal(tzGap('Europe/Berlin', 'America/New_York', '2026-01-05T00:00:00Z'), 6);
});

test('a missing or unknown zone has no gap', () => {
  assert.equal(tzGap(null, 'Asia/Seoul'), null);
  assert.equal(tzGap('Europe/Berlin', 'Nowhere/Land'), null);
});

test('a team whose answers are read plays unless its answer is out', () => {
  assert.equal(playsRound({ answer: undefined, answersRead: true, playday: 3 }), true);
  assert.equal(playsRound({ answer: { available: false }, answersRead: true, playday: 3 }), false);
  assert.equal(playsRound({ answer: { blocked_out: true, available: false }, answersRead: true, playday: 3 }), false);
  assert.equal(playsRound({ answer: { available: true }, answersRead: true, playday: 3 }), true);
});

test('the other team plays unless its roster read names the round', () => {
  assert.equal(playsRound({ answersRead: false, outRounds: [2, 3], playday: 3 }), false);
  assert.equal(playsRound({ answersRead: false, outRounds: [2], playday: 3 }), true);
});

test('the switch writes out, clears a captain answer, and overrides the player', () => {
  assert.equal(switchAnswer(undefined, false), false);
  // a captain's own out goes back to no answer
  assert.equal(switchAnswer({ user_id: 7, available: false, set_by_user_id: 1 }, true), null);
  // the player's own out and the derived blocked out need an explicit in
  assert.equal(switchAnswer({ user_id: 7, available: false, set_by_user_id: 7 }, true), true);
  assert.equal(switchAnswer({ user_id: 7, available: false, blocked_out: true }, true), true);
});

test('the players join the board with the roster facts and the round answers', () => {
  const board = {
    players: [
      { user_id: 1, team_id: 10, race: 'HU', mmr: 1500, availability_entered: true },
      { user_id: 2, team_id: 20, race: 'UD', mmr: 1450, availability_entered: false },
    ],
  };
  const rosters = [
    [{ id: 1, name: 'A', country: 'DE', battleTag: 'A#1', timezone: 'Europe/Berlin', record: { games: 2, matchup_history: ['OC', 'UD'] } }],
    [{ id: 2, name: 'B', country: 'KR', timezone: 'Asia/Seoul', record: { games: 1, matchup_history: ['HU'], out_rounds: [3] } }],
  ];
  const answers = { 10: [{ user_id: 1, playday: 3, available: false, set_by_user_id: 9 }] };

  const [a, b] = plannerPlayers({ board, rosters, answers, playday: 3 });

  assert.equal(a.name, 'A');
  assert.deepEqual(a.faced, ['OC', 'UD']);
  assert.equal(a.played, 2);
  assert.equal(a.plays, false);
  assert.equal(a.answersRead, true);
  assert.equal(b.plays, false);
  assert.equal(b.answersRead, false);
  assert.equal(b.timezone, 'Asia/Seoul');
});

test('a row flags the races faced that are the race of this opponent', () => {
  const a = player(1, 10, 1500, { faced: ['HU', 'UD', 'HU', 'UD'] });
  const b = player(2, 20, 1520, { race: 'UD' });
  const row = matchupRow(a, b, { range: 150 });
  assert.deepEqual(row.facedA.map((one) => one.same), [false, true, false, true]);
  assert.equal(row.difference, 20);
  assert.equal(row.outside, false);
});

test('hours count only when both players entered availability', () => {
  const pairOf = () => ({ hours: 96 });
  const known = matchupRow(player(1, 10, 1500), player(2, 20, 1500), { range: 100, pairOf });
  const unknown = matchupRow(player(1, 10, 1500), player(2, 20, 1500, { availability_entered: false }), { range: 100, pairOf });
  assert.equal(known.hoursKnown, true);
  assert.equal(unknown.hoursKnown, false);
  assert.equal(unknown.neitherEntered, false);
});

test('a pair eight hours apart or more warns', () => {
  const at = '2026-01-05T00:00:00Z';
  const far = matchupRow(player(1, 10, 1500, { timezone: 'Europe/Stockholm' }), player(2, 20, 1500, { timezone: 'Asia/Seoul' }), { range: 100, at });
  const near = matchupRow(player(1, 10, 1500), player(2, 20, 1500, { timezone: 'America/New_York' }), { range: 100, at });
  assert.equal(far.tzWarn, true);
  assert.equal(near.tzWarn, false);
});

test('the list holds the pairs inside the range, or every opponent of a focus', () => {
  const side1 = [player(1, 10, 1500), player(2, 10, 1800)];
  const side2 = [player(3, 20, 1520), player(4, 20, 1300)];
  assert.deepEqual(
    matchupRows({ side1, side2, team1Id: 10, range: 100 }).map((row) => row.key),
    ['1-3'],
  );
  const focused = matchupRows({ side1, side2, team1Id: 10, range: 100, focus: side2[1] });
  assert.deepEqual(focused.map((row) => [row.key, row.outside]), [['1-4', true], ['2-4', true]]);
});

test('the default order is fewest games, then MMR difference, then time overlap', () => {
  const rows = [
    matchupRow(player(1, 10, 1500, { played: 2 }), player(3, 20, 1510), { range: 200 }),
    matchupRow(player(2, 10, 1500), player(3, 20, 1600), { range: 200 }),
    matchupRow(player(2, 10, 1500), player(4, 20, 1520), { range: 200 }),
  ];
  assert.deepEqual(sortMatchups(rows).map((row) => row.key), ['2-4', '2-3', '1-3']);
  assert.deepEqual(sortMatchups(rows, [{ key: 'mmr', dir: 1 }]).map((row) => row.key), ['1-3', '2-4', '2-3']);
  assert.deepEqual(sortMatchups(rows, [{ key: 'mmr', dir: -1 }]).map((row) => row.key), ['2-3', '2-4', '1-3']);
});

test('time overlap puts known hours first, then the rest by the smaller time-zone gap', () => {
  const at = '2026-01-05T00:00:00Z';
  const hoursOf = { '1-3': 40, '1-4': 90, '2-3': 120 };
  const pairOf = (x, y) => ({ hours: hoursOf[`${x}-${y}`] });
  const rows = [
    matchupRow(player(1, 10, 1500), player(3, 20, 1500), { range: 100, pairOf, at }),
    matchupRow(player(1, 10, 1500), player(4, 20, 1500), { range: 100, pairOf, at }),
    matchupRow(player(2, 10, 1500, { availability_entered: false }), player(3, 20, 1500, { timezone: 'Asia/Seoul' }), { range: 100, pairOf, at }),
  ];
  assert.deepEqual(sortMatchups(rows, [{ key: 'time', dir: 1 }]).map((row) => row.key), ['1-4', '1-3', '2-3']);
  assert.deepEqual(DEFAULT_ORDER.map((one) => one.key), ['games', 'mmr', 'time']);
});

test('the top picks walk the sorted rows and take no player twice', () => {
  const rows = [
    matchupRow(player(1, 10, 1500), player(3, 20, 1500), { range: 100 }),
    matchupRow(player(1, 10, 1500), player(4, 20, 1500), { range: 100 }),
    matchupRow(player(2, 10, 1500), player(3, 20, 1500), { range: 100 }),
    matchupRow(player(2, 10, 1500), player(4, 20, 1500), { range: 100 }),
  ];
  assert.deepEqual([...topPicks(rows, 2)], ['1-3', '2-4']);
  assert.deepEqual([...topPicks(rows, 1)], ['1-3']);
  // a player who already holds a match is no top pick
  assert.deepEqual([...topPicks(rows, 2, new Set([1]))], ['2-3']);
});

test('a team MMR sort puts the highest player of that team first and a missing MMR last', () => {
  const rows = [
    matchupRow(player(1, 10, 1500), player(3, 20, 1700), { range: 500 }),
    matchupRow(player(2, 10, 1900), player(4, 20, null), { range: 500 }),
    matchupRow(player(5, 10, null), player(6, 20, 1600), { range: 500 }),
  ];
  assert.deepEqual(sortMatchups(rows, [{ key: 'mmr1', dir: 1 }]).map((row) => row.key), ['2-4', '1-3', '5-6']);
  assert.deepEqual(sortMatchups(rows, [{ key: 'mmr2', dir: 1 }]).map((row) => row.key), ['1-3', '5-6', '2-4']);
  assert.deepEqual(sortMatchups(rows, [{ key: 'mmr1', dir: -1 }]).map((row) => row.key).slice(1), ['1-3', '2-4']);
});

test('a criterion moves one place earlier, and the first stays', () => {
  const order = [{ key: 'games', dir: 1 }, { key: 'mmr', dir: 1 }, { key: 'mmr1', dir: -1 }];
  assert.deepEqual(moveEarlier(order, 'mmr1').map((one) => one.key), ['games', 'mmr1', 'mmr']);
  assert.deepEqual(moveEarlier(order, 'mmr').map((one) => one.key), ['mmr', 'games', 'mmr1']);
  assert.equal(moveEarlier(order, 'games'), order);
  assert.equal(moveEarlier(order, 'time'), order);
});

test('a team MMR criterion is named by its team', () => {
  assert.equal(sortLabel('mmr1', 1, { team1: 'CRIT', team2: 'MJM' }), 'CRIT MMR: highest first');
  assert.equal(sortLabel('mmr2', -1, { team1: 'CRIT', team2: 'MJM' }), 'MJM MMR: lowest first');
  assert.equal(sortLabel('games', -1), 'Most games played');
});

test('a pair key is the same whichever player comes first', () => {
  assert.equal(pairKey(7, 3), pairKey(3, 7));
  assert.notEqual(pairKey(3, 7), pairKey(3, 8));
});

test('the list keeps a player who holds a match and drops only the pair already taken', () => {
  const side1 = [player(1, 10, 1500), player(2, 10, 1510)];
  const side2 = [player(3, 20, 1520), player(4, 20, 1490)];
  const taken = takenPairs([{ player1_id: 1, player2_id: 3 }], [{ player1_id: 4, player2_id: 2 }]);
  assert.deepEqual(matchupRows({ side1, side2, team1Id: 10, range: 100, taken }).map((row) => row.key), ['1-4', '2-3']);
  const focused = matchupRows({ side1, side2, team1Id: 10, range: 100, taken, focus: side1[0] });
  assert.deepEqual(focused.map((row) => row.key), ['1-4']);
});

test('each player lists every match they hold this round', () => {
  const matches = matchesOf({
    published: [
      { player1_id: 1, player2_id: 3, player1_score: null, player2_score: null },
      { player1_id: 2, player2_id: 4, player1_score: 2, player2_score: 0 },
    ],
    drafts: [{ player1_id: 1, player2_id: 4 }],
    selection: [{ player1_id: 5, player2_id: 3 }],
  });
  assert.deepEqual(matches.get(1), [{ kind: 'published', opponent: 3 }, { kind: 'draft', opponent: 4 }]);
  assert.deepEqual(matches.get(4), [{ kind: 'played', opponent: 2 }, { kind: 'draft', opponent: 1 }]);
  assert.deepEqual(matches.get(3), [{ kind: 'published', opponent: 1 }, { kind: 'selected', opponent: 5 }]);
  assert.equal(matches.get(6), undefined);
});

test('the selection drops what the draft or the series now hold and what can no longer be moved', () => {
  const published = [
    { id: 1, player1_id: 1, player2_id: 11, player1_score: null, player2_score: null },
    { id: 2, player1_id: 2, player2_id: 12, player1_score: 2, player2_score: 1 },
  ];
  const drafts = [{ id: 9, player1_id: 3, player2_id: 13 }];
  const known = (id) => id !== 99;
  const selection = [
    { player1_id: 13, player2_id: 3 }, // the draft holds it now
    { player1_id: 4, player2_id: 99 }, // a player off the board
    { player1_id: 4, player2_id: 14 }, // stays
    { player1_id: 5, player2_id: 11, replaces_series_id: 1 }, // stays
    { player1_id: 6, player2_id: 12, replaces_series_id: 2 }, // that series holds a result
    { player1_id: 7, player2_id: 13, draft_id: 8 }, // the draft it changes is gone
  ];
  assert.deepEqual(
    pruneSelection(selection, { published, drafts, known }).map((one) => `${one.player1_id}-${one.player2_id}`),
    ['4-14', '5-11'],
  );
  // another draft replaces series 1 now
  const replaced = [...drafts, { id: 10, player1_id: 8, player2_id: 11, replaces_series_id: 1 }];
  assert.deepEqual(
    pruneSelection([{ player1_id: 5, player2_id: 11, replaces_series_id: 1 }], { published, drafts: replaced, known }),
    [],
  );
});

test('selecting switches an item, and one player can be held to one selected match', () => {
  const first = selectItem([], { player1_id: 1, player2_id: 11 });
  assert.equal(first.length, 1);
  assert.equal(selectItem(first, { player1_id: 11, player2_id: 1 }).length, 0);
  const two = selectItem(first, { player1_id: 2, player2_id: 11 });
  assert.equal(two.length, 2);
  const swapped = selectItem(first, { player1_id: 2, player2_id: 11 }, { onePerPlayer: 11 });
  assert.deepEqual(swapped, [{ player1_id: 2, player2_id: 11 }]);
});

test('a player with no opponent inside the range names the nearest', () => {
  const side1 = [player(1, 10, 1800), player(2, 10, 1500), player(5, 10, null)];
  const side2 = [player(3, 20, 1510), player(4, 20, 1590)];
  const hints = rangeHints(side1, side2, 150);
  assert.equal(hints.length, 1);
  assert.equal(hints[0].player.user_id, 1);
  assert.equal(hints[0].nearest.user_id, 4);
  assert.equal(hints[0].difference, 210);
});

test('the search matches the name or the battle tag, whatever the case', () => {
  const players = [
    { name: 'Lukas', battleTag: 'Wolf#2211' },
    { name: 'Anna', battleTag: 'Lukewarm#1200' },
    { name: 'Sven', battleTag: null },
  ];
  assert.deepEqual(searchPlayers(players, '  luk ').map((one) => one.name), ['Lukas', 'Anna']);
  assert.deepEqual(searchPlayers(players, 'WOLF').map((one) => one.name), ['Lukas']);
  assert.equal(searchPlayers(players, '').length, 3);
  assert.equal(searchPlayers(players, null).length, 3);
  assert.deepEqual(searchPlayers(players, 'nobody'), []);
});

const published = [
  { id: 1, player1_id: 1, player2_id: 11, player1_score: null, player2_score: null },
  { id: 2, player1_id: 2, player2_id: 12, player1_score: 2, player2_score: 1 },
];

test('a new match replaces an open published series, with the opponent who leaves it', () => {
  const need = newMatchFor(11, published, []);
  assert.equal(need.kind, 'replace');
  if (need.kind !== 'replace') return;
  assert.equal(need.series.id, 1);
  assert.equal(need.dropId, 1);
  assert.equal(need.replacedBy, null);
  const again = newMatchFor(11, published, [{ id: 9, player1_id: 3, player2_id: 11, replaces_series_id: 1 }]);
  assert.equal(again.kind === 'replace' && again.replacedBy.id, 9);
});

test('a played series, a drafted pairing or none gives a new pairing', () => {
  const played = newMatchFor(2, published, []);
  assert.equal(played.kind === 'new' && played.played.id, 2);
  const drafted = newMatchFor(4, published, [{ id: 5, player1_id: 4, player2_id: 14 }]);
  assert.equal(drafted.kind === 'new' && drafted.drafted.id, 5);
  assert.deepEqual(newMatchFor(6, published, []), { kind: 'new', played: null, drafted: null, leaving: null });
});

test('a player whose series a draft replaces without them gets a new pairing', () => {
  // the draft keeps 1 and drops 11 from series 1
  const need = newMatchFor(11, published, [{ id: 9, player1_id: 1, player2_id: 13, replaces_series_id: 1 }]);
  assert.equal(need.kind, 'new');
  assert.equal(need.kind === 'new' && need.leaving.id, 1);
});

test('a replacement draft already made leaves its own players out of the candidates', () => {
  const drafts = [{ id: 9, player1_id: 3, player2_id: 11, replaces_series_id: 1 }];
  const rows = replacementRows({ selected: [player(11, 20, 1700)], candidates: [player(1, 10, 1690), player(2, 10, 1650), player(3, 10, 1600)], team1Id: 10, range: 100, published, drafts });
  assert.deepEqual(rows.map((one) => one.key), ['2-11']);
});

test('a replacement pairs each selected player with every candidate but the one who leaves', () => {
  // team 20 needs new matches for 11 (an open series against 1) and 13 (no series)
  const selected = [player(11, 20, 1700), player(13, 20, 1500)];
  const candidates = [player(1, 10, 1690), player(2, 10, 2100), player(3, 10, 1520)];
  const rows = replacementRows({ selected, candidates, team1Id: 10, range: 100, published, drafts: [] });
  assert.deepEqual(rows.map((one) => one.key), ['2-11', '3-11', '1-13', '2-13', '3-13']);
  // team 1 stays player a, whichever team needs the match
  assert.ok(rows.every((one) => one.a.team_id === 10 && one.b.team_id === 20));
  // the range only marks, it hides nothing
  assert.equal(rows.find((one) => one.key === '2-11')?.outside, true);
  // a candidate who holds a series is a second pairing
  assert.deepEqual(rows.filter((one) => one.second).map((one) => one.key), ['2-11', '1-13', '2-13']);
  assert.equal(rows.find((one) => one.key === '3-11')?.need.kind, 'replace');
  assert.equal(rows.find((one) => one.key === '3-13')?.need.kind, 'new');
});
