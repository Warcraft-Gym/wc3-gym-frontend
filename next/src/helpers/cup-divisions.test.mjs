import { test } from 'node:test';
import assert from 'node:assert/strict';
import { divisionGroups, inSeedOrder, movedOrder, seedBody, unplaced } from './cup-divisions.mjs';

const DIVISIONS = [
  { id: 8, position: 2, name: 'Open' },
  { id: 9, position: 1, name: 'Pro' },
];
const rows = [
  { id: 1, division_id: 9, seed: 2, mmr: 1900, user: { name: 'P1' } },
  { id: 2, division_id: 9, seed: 1, mmr: 1800, user: { name: 'P2' } },
  { id: 3, division_id: 8, seed: null, mmr: 1500, user: { name: 'P3' } },
  { id: 4, division_id: null, seed: null, mmr: 1400, user: { name: 'P4' } },
  { id: 5, division_id: 8, withdrawn_at: '2026-10-13T20:00:00Z', user: { name: 'P5' } },
  { id: 6, division_id: null, waitlisted_at: '2026-10-13T20:00:00Z', user: { name: 'P6' } },
];

test('a cup without divisions lists one untitled field of the players who play', () => {
  const groups = divisionGroups(rows, DIVISIONS, false);
  assert.deepEqual(groups.map((group) => group.title), [null]);
  assert.deepEqual(groups[0].rows.map((row) => row.id), [1, 2, 3, 4]);
  assert.equal(unplaced(rows, DIVISIONS, false), false);
});

test('a cup with divisions lists them strongest first and the unplaced last, only while any', () => {
  const groups = divisionGroups(rows, DIVISIONS, true);
  assert.deepEqual(groups.map((group) => [group.title, group.rows.map((row) => row.id)]), [
    ['Pro', [1, 2]],
    ['Open', [3]],
    ['Not in a division', [4]],
  ]);
  assert.equal(unplaced(rows, DIVISIONS, true), true);
  const placed = rows.filter((row) => row.id !== 4);
  assert.deepEqual(divisionGroups(placed, DIVISIONS, true).map((group) => group.title), ['Pro', 'Open']);
  assert.equal(unplaced(placed, DIVISIONS, true), false);
});

test('a group reads in seed order and a move steps one place inside it', () => {
  const pro = inSeedOrder(rows.filter((row) => row.division_id === 9));
  assert.deepEqual(pro.map((row) => row.id), [2, 1]);
  assert.deepEqual(movedOrder(pro, 1, -1), [1, 2]);
  // a move past either end changes nothing
  assert.deepEqual(movedOrder(pro, 2, -1), [2, 1]);
  assert.deepEqual(movedOrder(pro, 1, 1), [2, 1]);
});

test('a seed write names its division, or none on a cup without divisions', () => {
  assert.deepEqual(seedBody('mmr', 9), { source: 'mmr', division_id: 9 });
  assert.deepEqual(seedBody('manual', 8, [3]), { source: 'manual', order: [3], division_id: 8 });
  assert.deepEqual(seedBody('random', null), { source: 'random' });
});
