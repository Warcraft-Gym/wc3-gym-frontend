import { test } from 'node:test';
import assert from 'node:assert/strict';
import { bandRange, cutChanged, divisionGroups, inSeedOrder, placedOrder, previewDivisions, seedBody, unplaced } from './cup-divisions.mjs';

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

test('a group reads in seed order', () => {
  const pro = inSeedOrder(rows.filter((row) => row.division_id === 9));
  assert.deepEqual(pro.map((row) => row.id), [2, 1]);
});

test('a seed write names its division, or none on a cup without divisions', () => {
  assert.deepEqual(seedBody('mmr', 9), { source: 'mmr', division_id: 9 });
  assert.deepEqual(seedBody('manual', 8, [3]), { source: 'manual', order: [3], division_id: 8 });
  assert.deepEqual(seedBody('random', null), { source: 'random' });
});

test('a player dragged or typed to a seed lands there, and the rest close up', () => {
  const field = [{ id: 1 }, { id: 2 }, { id: 3 }, { id: 4 }, { id: 5 }];
  assert.deepEqual(placedOrder(field, 5, 2), [1, 5, 2, 3, 4]);
  assert.deepEqual(placedOrder(field, 1, 4), [2, 3, 4, 1, 5]);
  // a place past either end is the end, and its own place changes nothing
  assert.deepEqual(placedOrder(field, 3, 99), [1, 2, 4, 5, 3]);
  assert.deepEqual(placedOrder(field, 3, 0), [3, 1, 2, 4, 5]);
  assert.equal(placedOrder(field, 3, 3), null);
  assert.equal(placedOrder(field, 3, NaN), null);
  assert.equal(placedOrder(field, 9, 1), null);
});

test('the cut differs from the saved divisions by its count or a threshold', () => {
  const saved = [
    { id: 9, position: 1, name: 'Pro', lower_bound: 1700 },
    { id: 8, position: 2, name: 'Open', lower_bound: null },
  ];
  assert.equal(cutChanged([1700], saved), false);
  assert.equal(cutChanged([1650], saved), true);
  assert.equal(cutChanged([1400, 1700], saved), true);
  assert.equal(cutChanged([1700], []), true);
});

test('the preview places every player by MMR, strongest division first, and names who moves', () => {
  const saved = [
    { id: 9, position: 1, name: 'Division 1', lower_bound: 1850 },
    { id: 8, position: 2, name: 'Division 2', lower_bound: null },
  ];
  const field = [
    ...rows,
    // unrated: the weakest division takes it
    { id: 7, division_id: null, mmr: null, user: { name: 'P7' } },
  ];
  const groups = previewDivisions(field, [1450, 1700], ['Division 3', 'Division 2', 'Division 1'], saved);
  assert.deepEqual(groups.map((group) => [group.title, bandRange(group), group.rows.map((row) => row.id)]), [
    ['Division 1', '1700+', [1, 2]],
    ['Division 2', '1450–1699', [3]],
    ['Division 3', 'below 1450', [4, 7]],
  ]);
  // P2 stood in Division 1 already; P3 stays in Division 2; P4 had none
  assert.deepEqual(groups.flatMap((group) => group.rows.map((row) => [row.id, row.from])), [
    [1, null],
    [2, null],
    [3, null],
    [4, 'no division'],
    [7, 'no division'],
  ]);
  // before anything is saved, nobody moves from anywhere
  assert.ok(previewDivisions(rows, [1700], ['Division 2', 'Division 1'], []).every((group) => group.rows.every((row) => row.from === null)));
});
