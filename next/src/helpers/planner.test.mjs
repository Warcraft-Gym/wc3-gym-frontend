import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  DEFAULT_ORDER,
  matchupRow,
  matchupRows,
  plannerPlayers,
  playsRound,
  rangeHints,
  sortMatchups,
  switchAnswer,
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
