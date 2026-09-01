import { test } from 'node:test';
import assert from 'node:assert/strict';
import { bandOf, domainOf, moveCut, quantileCuts, rangeText } from './divisions.mjs';

test('quantile cuts split twelve players into six bands of two', () => {
  const mmrs = [1200, 100, 700, 300, 1100, 500, 900, 200, 800, 400, 1000, 600];
  const cuts = quantileCuts(mmrs, 6);
  assert.deepEqual(cuts, [300, 500, 700, 900, 1100]);
  const counts = [0, 0, 0, 0, 0, 0];
  mmrs.forEach((m) => counts[bandOf(m, cuts)]++);
  assert.deepEqual(counts, [2, 2, 2, 2, 2, 2]);
});

test('ties share a band and no-MMR players are left out of the cuts', () => {
  const cuts = quantileCuts([0, null, 1500, 1500, 1500, 1600, 1700, 1800], 3);
  assert.deepEqual(cuts, [1500, 1700]);
  assert.equal(bandOf(1500, cuts), 1);
  assert.equal(bandOf(0, cuts), 0);
});

test('a cut cannot cross its neighbours or leave the domain', () => {
  const cuts = [1300, 1500, 1700];
  assert.deepEqual(moveCut(cuts, 1, 1800, [1000, 2000]), [1300, 1699, 1700]);
  assert.deepEqual(moveCut(cuts, 0, 900, [1000, 2000]), [1001, 1500, 1700]);
  assert.deepEqual(moveCut(cuts, 2, 2500, [1000, 2000]), [1300, 1500, 2000]);
});

test('the domain pads to whole hundreds and the ranges read from the cuts', () => {
  assert.deepEqual(domainOf([1234, 1876, 0]), [1200, 1900]);
  assert.equal(rangeText(0, [1300, 1500]), 'below 1300');
  assert.equal(rangeText(1, [1300, 1500]), '1300 to 1499');
  assert.equal(rangeText(2, [1300, 1500]), '1500 and above');
});
