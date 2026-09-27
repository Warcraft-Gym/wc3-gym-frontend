import { test } from 'node:test';
import assert from 'node:assert/strict';
import { DateTime } from 'luxon';
import { achievementSummary, gnlSeasons, seasonScore, seasonsPlayed } from './player-summary.mjs';
import { creationOpen, fantasyState, openBets } from './fantasy-panel.mjs';

const history = { events: [
  { season_id: 20, kind: 'gnl' },
  { season_id: 44, kind: 'koth' },
  { season_id: 19, kind: 'gnl' },
] };

test('only the GNL seasons of the history count', () => {
  assert.deepEqual(gnlSeasons(history).map((e) => e.season_id), [20, 19]);
  assert.equal(seasonsPlayed(history), 2);
  assert.equal(seasonsPlayed(null), 0);
});

const badge = (id, points, name = id) => ({ id, name, points });

test('the achievements count this season and overall, and the best three sort by points then name', () => {
  const summary = achievementSummary([
    { seasonId: 20, ladder: { achievements: [badge('a', 5), badge('b', 10), badge('c', 5, 'Zeal'), badge('d', 1)] } },
    { seasonId: 19, ladder: { achievements: [badge('e', 3)] } },
  ], 20);
  assert.equal(summary.thisSeason, 4);
  assert.equal(summary.overall, 5);
  assert.deepEqual(summary.top3.map((b) => b.id), ['b', 'a', 'c']);
  assert.equal(summary.complete, true);
});

test('a failed season read adds nothing and marks the count as possibly short', () => {
  const summary = achievementSummary([
    { seasonId: 20, ladder: null },
    { seasonId: 19, ladder: { achievements: [badge('e', 3)] } },
  ], 20);
  assert.equal(summary.thisSeason, null);
  assert.equal(summary.overall, 1);
  assert.deepEqual(summary.top3, []);
  assert.equal(summary.complete, false);
});

test('the season score sums the player\'s own series points', () => {
  const series = [
    { player1_id: 7, player2_id: 8, player1_points: 3, player2_points: 0 },
    { player1_id: 9, player2_id: 7, player1_points: 1, player2_points: 2 },
    { player1_id: 9, player2_id: 8, player1_points: 3, player2_points: 0 },
  ];
  assert.equal(seasonScore(series, 7), 5);
  assert.equal(seasonScore([], 7), null);
});

test('team creation reads open only from a true setting', () => {
  assert.equal(creationOpen({ value: 'true' }), true);
  assert.equal(creationOpen({ value: 'TRUE' }), true);
  assert.equal(creationOpen({ value: 'false' }), false);
  assert.equal(creationOpen(null), false);
});

test('the panel offers bets with a team, creation without one, and nothing when closed', () => {
  assert.equal(fantasyState({ open: false, team: { id: 1 } }), 'bets');
  assert.equal(fantasyState({ open: true, team: { id: 1 } }), 'bets');
  assert.equal(fantasyState({ open: true, team: null }), 'create');
  assert.equal(fantasyState({ open: false, team: null }), null);
});

test('only fantasy series still open for bets show, soonest first, with the member\'s bet', () => {
  const now = DateTime.fromISO('2026-09-26T12:00:00', { zone: 'UTC' });
  const series = [
    { id: 1, is_fantasy_match: true, date_time: '2026-09-28T19:00:00' },
    { id: 2, is_fantasy_match: true, date_time: '2026-09-27T19:00:00' },
    { id: 3, is_fantasy_match: false, date_time: '2026-09-27T19:00:00' },
    { id: 4, is_fantasy_match: true, date_time: '2026-09-25T19:00:00' },
    { id: 5, is_fantasy_match: true, date_time: null },
    { id: 6, is_fantasy_match: true, date_time: '2026-09-29T19:00:00', player1_score: 2 },
  ];
  const rows = openBets(series, [{ id: 90, series_id: 1, winner_id: 7 }], now);
  assert.deepEqual(rows.map((row) => row.id), [2, 1, 5]);
  assert.equal(rows.find((row) => row.id === 1).myBet.id, 90);
  assert.equal(rows.find((row) => row.id === 2).myBet, null);
});
