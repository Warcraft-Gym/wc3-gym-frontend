import test from 'node:test';
import assert from 'node:assert/strict';

import { assignFromMmr, divisionOf, eventPayload, ladderPool, moveSeed, wizardProblem } from './events-admin.mjs';

const MAPS = [{ id: 1, name: 'Amazonia' }, { id: 2, name: 'Concealed Hill' }, { id: 3, name: 'Autumn Leaves v1' }];

test('the ladder import matches on either name or the lineage, and names what it could not', () => {
  const rows = [
    { w3c_name: 'Amazonia', matched_name: 'Amazonia', status: 'new' },
    { w3c_name: 'concealed hill', matched_name: 'Concealed Hill', status: 'known' },
    // the app holds this one under an older version of the same lineage
    { w3c_name: 'Autumn Leaves v2', matched_name: 'Autumn Leaves v2', status: 'known' },
    { w3c_name: 'Twisted Meadows', matched_name: null, status: 'no_match' },
    { w3c_name: 'Turtle Rock', matched_name: 'Turtle Rock', status: 'off_ladder' },
  ];
  assert.deepEqual(ladderPool(MAPS, rows), { ids: [1, 2, 3], missing: ['Twisted Meadows'] });
});

test('an MMR falls in the last division it reaches, and no MMR in the lowest', () => {
  const divisions = [{ id: 7, lower_bound: null }, { id: 8, lower_bound: 1500 }, { id: 9, lower_bound: 1800 }];
  assert.equal(divisionOf(1900, divisions), 9);
  assert.equal(divisionOf(1500, divisions), 8);
  assert.equal(divisionOf(900, divisions), 7);
  assert.equal(divisionOf(null, divisions), 7);
  assert.equal(divisionOf(1900, []), null);
});

test('assign from MMR seeds each division from the top', () => {
  const divisions = [{ id: 1, lower_bound: null }, { id: 2, lower_bound: 1800 }];
  const rows = assignFromMmr([
    { id: 10, mmr: 1700 }, { id: 11, mmr: 2000 }, { id: 12, mmr: 1400 }, { id: 13, mmr: 1900 },
  ], divisions);
  assert.deepEqual(rows.map((row) => [row.id, row.division_id, row.seed]), [
    [10, 1, 1], [11, 2, 1], [12, 1, 2], [13, 2, 2],
  ]);
});

test('a seed move renumbers only its own division and stops at the ends', () => {
  const rows = [
    { id: 1, division_id: 1, seed: 1 }, { id: 2, division_id: 1, seed: 2 },
    { id: 3, division_id: 2, seed: 1 },
  ];
  assert.deepEqual(moveSeed(rows, 2, -1).map((r) => [r.id, r.seed]), [[1, 2], [2, 1], [3, 1]]);
  assert.deepEqual(moveSeed(rows, 1, -1), rows);
});

test('the wizard payload numbers the stages and takes the best-of from the map rules', () => {
  const body = eventPayload({
    league_id: 3,
    name: '  Autumn cup ',
    kind: 'cup',
    start_date: '2026-10-01',
    entrant_cap: '',
    min_games: '20',
    map_ids: [1, 2],
    stages: [
      { name: 'Group stage', format: 'round_robin', map_rules: 'fixed,loser,loser', points_series_won: 1, points_series_drawn: 0, points_game_won: 0, advance_count: '8' },
      { name: '', format: 'single_elimination', map_rules: 'veto', points_series_won: 1, points_series_drawn: 0, points_game_won: 0, advance_count: '' },
    ],
  });
  assert.equal(body.name, 'Autumn cup');
  assert.equal(body.entrant_cap, null);
  assert.equal(body.min_games, 20);
  assert.equal(body.starts_at, null);
  assert.deepEqual(body.stages.map((s) => [s.position, s.name, s.best_of, s.advance_count]), [
    [1, 'Group stage', 3, 8],
    [2, 'Stage 2', 1, null],
  ]);
});

test('the wizard names what is still missing', () => {
  assert.equal(wizardProblem({ name: 'Cup', stages: [{}] }), 'Pick a league');
  assert.equal(wizardProblem({ league_id: 1, name: ' ', stages: [{}] }), 'Name the event');
  assert.equal(wizardProblem({ league_id: 1, name: 'Cup', stages: [] }), 'Add a stage');
  assert.equal(wizardProblem({ league_id: 1, name: 'Cup', stages: [{}] }), null);
});
