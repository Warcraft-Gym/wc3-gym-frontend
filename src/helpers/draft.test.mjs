import { test } from 'node:test';
import assert from 'node:assert/strict';
import { draftOrder } from './draft.mjs';

const mmrOf = (p) => p.mmr;
const names = (players) => players.map(p => p.name);

const SIGNUPS = [
  { id: 1, name: 'low', mmr: 1000, draft_position: null },
  { id: 2, name: 'mid', mmr: 1500, draft_position: null },
  { id: 3, name: 'high', mmr: 2000, draft_position: null },
  { id: 4, name: 'moved', mmr: 2500, draft_position: 1 },
];

test('the order is MMR ascending and a moved player keeps his slot', () => {
  assert.deepEqual(names(draftOrder(SIGNUPS, mmrOf)), ['low', 'moved', 'mid', 'high']);
});

test('an excluded player leaves the order, so the players after him move up', () => {
  assert.deepEqual(names(draftOrder(SIGNUPS, mmrOf, new Set([2]))), ['low', 'moved', 'high']);
});

test('excluding a moved player drops him, not his slot', () => {
  assert.deepEqual(names(draftOrder(SIGNUPS, mmrOf, new Set([4]))), ['low', 'mid', 'high']);
});

test('a slot past the end of the list puts the player last', () => {
  const one = [{ id: 9, name: 'only', mmr: 1200, draft_position: 7 }];
  assert.deepEqual(names(draftOrder(one, mmrOf)), ['only']);
});
