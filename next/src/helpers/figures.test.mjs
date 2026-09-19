import { test } from 'node:test';
import assert from 'node:assert/strict';
import { record } from './figures.mjs';

test('ten played or more carries the percent', () => {
  assert.equal(record(19, 11), '19 – 11 (63%)');
  assert.equal(record(10, 0), '10 – 0 (100%)');
  assert.equal(record(0, 12), '0 – 12 (0%)');
});

test('under ten the two numbers stand alone', () => {
  assert.equal(record(3, 1), '3 – 1');
  assert.equal(record(2, 1), '2 – 1');
  assert.equal(record(0, 9), '0 – 9');
});

test('nothing played answers nothing, so the cell prints its own dash', () => {
  assert.equal(record(0, 0), null);
  assert.equal(record(0, undefined), null);
  assert.equal(record(undefined, undefined), null);
});

test('a missing side counts as zero', () => {
  assert.equal(record(3, undefined), '3 – 0');
  assert.equal(record(null, 2), '0 – 2');
});
