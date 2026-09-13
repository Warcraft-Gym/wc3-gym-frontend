import { test } from 'node:test';
import assert from 'node:assert/strict';
import { seasonRank, roundResults, seriesRecord, seasonTabs } from './team-record.mjs';

const team = (id, final_score, points_against) => ({ id, seasons_info: [{ season_id: 4, final_score, points_against }] });

test('rank orders by points, then fewest against, then team id', () => {
  const teams = [team(21, 108, 112), team(18, 121, 99), team(8, 116, 104), team(3, 108, 110), team(2, 0, 0), team(1, 0, 0)];
  assert.deepEqual(seasonRank(teams, 18, 4), { rank: 1, of: 6 });
  assert.deepEqual(seasonRank(teams, 3, 4), { rank: 3, of: 6 });
  assert.deepEqual(seasonRank(teams, 21, 4), { rank: 4, of: 6 });
  assert.deepEqual(seasonRank(teams, 1, 4), { rank: 5, of: 6 });
  assert.equal(seasonRank(teams, 99, 4), null);
});

const match = (id, playday, team1_id, team2_id) => ({ playday, team1_id, team2_id, team1: { id: team1_id }, team2: { id: team2_id } });
const series = (match_id, m, p1, p2, pts1, pts2) => ({ match_id, match: m, player1_score: p1, player2_score: p2, player1_points: pts1, player2_points: pts2 });

test('round results take the team side of each series and count the unscored ones as still to play', () => {
  const r1 = match(10, 1, 6, 8);
  const r2 = match(11, 2, 5, 6);
  const other = match(12, 1, 5, 7);
  const rows = roundResults([
    series(11, r2, 2, 1, 3, 1),
    series(10, r1, 2, 0, 4, 0),
    series(10, r1, 1, 2, 1, 3),
    series(10, r1, 0, 0, 0, 0),
    series(10, r1, null, null, null, null),
    series(12, other, 2, 0, 4, 0),
  ], 6);
  assert.deepEqual(rows.map(r => [r.playday, r.opponent.id, r.wins, r.losses, r.toPlay, r.pointsFor, r.pointsAgainst]), [
    [1, 8, 1, 1, 1, 5, 3],
    [2, 5, 0, 1, 0, 1, 3],
  ]);
  assert.deepEqual(seriesRecord(rows), { wins: 1, losses: 2 });
});

test('a round with nothing scored yet keeps its row, with every series still to play', () => {
  const rows = roundResults([
    series(10, match(10, 1, 6, 8), null, null, null, null),
    series(10, match(10, 1, 6, 8), null, null, null, null),
  ], 6);
  assert.deepEqual(rows.map(r => [r.playday, r.opponent.id, r.wins, r.losses, r.toPlay]), [[1, 8, 0, 0, 2]]);
  assert.deepEqual(seriesRecord(rows), { wins: 0, losses: 0 });
});

test('a tab reads the league and the event name the team route carries, newest first', () => {
  const tabs = seasonTabs([
    { season_id: 17, name: 'Season 17', league_short_name: 'GNL' },
    { season_id: 18, name: 'Season 18', league_short_name: 'GNL' },
  ]);
  assert.deepEqual(tabs, [
    { id: 18, label: 'GNL \u00b7 Season 18' },
    { id: 17, label: 'GNL \u00b7 Season 17' },
  ]);
});

test('a backend that names no event falls back to the season list', () => {
  const tabs = seasonTabs(
    [{ season_id: 18, final_score: 12 }],
    [{ id: 18, name: 'Season 18' }],
  );
  assert.deepEqual(tabs, [{ id: 18, label: 'Season 18' }]);
});

test('a row with no season id is not a tab', () => {
  assert.deepEqual(seasonTabs([{ season_id: null, name: 'Season 18' }]), []);
});
