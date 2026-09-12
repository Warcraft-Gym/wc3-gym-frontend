import { test } from 'node:test';
import assert from 'node:assert/strict';
import { ALL_NAMES, tierChanges, tierSelectionError } from './tiers.mjs';

const NAMES = ALL_NAMES.slice(-3); // Gold, Platinum, Diamond: two cuts

test('cuts and pins that match the stored ones are no change', () => {
  assert.deepEqual(tierChanges([1100, 1500], [1100, 1500], NAMES, { 7: 2 }, { 7: 2 }), []);
});

test('a moved cut is named with its old and new MMR', () => {
  assert.deepEqual(tierChanges([1100, 1450], [1100, 1500], NAMES, {}, {}), ['Platinum to Diamond: 1500 → 1450']);
});

test('a different tier count is one line, not one line per cut', () => {
  assert.deepEqual(tierChanges([1200], [1100, 1500], NAMES, {}, {}), ['3 tiers → 2 tiers']);
});

test('an added, a dropped and a retiered pin all count as moved', () => {
  const changes = tierChanges([1100, 1500], [1100, 1500], NAMES, { 7: 1, 8: 3 }, { 7: 2, 9: 1 });
  assert.deepEqual(changes, ['3 players moved by hand']);
});

test('nothing stored yet reads as a count change from one tier', () => {
  assert.deepEqual(tierChanges([1100, 1500], [], NAMES, {}, {}), ['1 tiers → 3 tiers']);
});

test('a season with no cut tiers takes no fantasy team', () => {
  assert.equal(tierSelectionError(0, {}), 'The player tiers for this season are not cut yet.');
});

test('the empty tier slots are named', () => {
  assert.equal(tierSelectionError(3, { 1: 7, 3: 9 }), 'Please select players for tier(s): 2');
});

test('a player in every tier saves', () => {
  assert.equal(tierSelectionError(3, { 1: 7, 2: 8, 3: 9 }), null);
});
