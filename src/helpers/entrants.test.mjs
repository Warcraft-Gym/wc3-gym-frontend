import { test } from 'node:test';
import assert from 'node:assert/strict';
import { bandNames, bySeed, cutsOf, divisionsPayload, entrantName, groupByDivision, seedPayload, warningLabel } from './entrants.mjs';

const DIVISIONS = [
  { id: 9, position: 1, name: 'Pro', lower_bound: 1600 },
  { id: 8, position: 2, name: 'Open', lower_bound: null },
];
const rows = [
  { id: 1, seed: 2, mmr: 1700, division_id: 9, user: { name: 'Grubbstep' } },
  { id: 2, seed: 1, mmr: 1650, division_id: 9, user: { name: 'Kaelthas' } },
  { id: 3, seed: null, mmr: 1400, division_id: 8, user: { name: 'Wispy' } },
  { id: 4, seed: null, mmr: 1500, division_id: null, team: { name: 'Wolves' } },
];

test('a warning reads as the reason, with the number the event set', () => {
  assert.equal(warningLabel('under_min_games', { min_games: 20 }), 'under 20 games');
  assert.equal(warningLabel('under_min_games', {}), 'under the game count');
  assert.equal(warningLabel('over_mmr_max', { mmr_max: 1800 }), 'over the MMR cap');
  assert.equal(warningLabel('banned'), 'banned');
});

test('a team entrant reads by its team, a player by his name', () => {
  assert.equal(entrantName(rows[3]), 'Wolves');
  assert.equal(entrantName(rows[0]), 'Grubbstep');
});

test('seeded entrants come first in seed order, the rest strongest first', () => {
  assert.deepEqual(bySeed(rows).map((row) => row.id), [2, 1, 4, 3]);
});

test('the groups follow the division order and the unplaced entrants come last', () => {
  const groups = groupByDivision(rows, DIVISIONS);
  assert.deepEqual(groups.map((group) => group.title), ['Pro', 'Open', 'No division']);
  assert.deepEqual(groups[0].rows.map((row) => row.id), [2, 1]);
  assert.deepEqual(groups[2].rows.map((row) => row.id), [4]);
});

test('a division that holds nobody stays, and no group is added when every entrant is placed', () => {
  const groups = groupByDivision([rows[0]], DIVISIONS);
  assert.deepEqual(groups.map((group) => group.rows.length), [1, 0]);
  assert.equal(groups.length, 2);
});

test('the manual seed body names every entrant, division by division', () => {
  assert.deepEqual(seedPayload(groupByDivision(rows, DIVISIONS)), { source: 'manual', order: [2, 1, 3, 4] });
});

test('the ascending cuts write divisions strongest first, the weakest without a bound', () => {
  assert.deepEqual(divisionsPayload([1450, 1600], ['Open', 'Pro']), [
    { name: 'Pro', lower_bound: 1600 },
    { name: 'Open', lower_bound: 1450 },
    { name: 'Division 3', lower_bound: null },
  ]);
});

test('the strip reads the stored divisions back as ascending cuts and names', () => {
  assert.deepEqual(cutsOf(DIVISIONS), [1600]);
  assert.deepEqual(bandNames(DIVISIONS), ['Open', 'Pro']);
  assert.deepEqual(cutsOf([{ lower_bound: null }, { lower_bound: null }]), []);
});
