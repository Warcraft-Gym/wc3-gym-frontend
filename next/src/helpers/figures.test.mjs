import { test } from 'node:test';
import assert from 'node:assert/strict';
import { record } from './figures.mjs';

test('a record of ten games or more carries its share', () => {
  assert.equal(record(19, 11), '19 – 11 (63%)');
  assert.equal(record(10, 0), '10 – 0 (100%)');
  assert.equal(record(0, 12), '0 – 12 (0%)');
});

test('under ten the record stands alone', () => {
  assert.equal(record(3, 1), '3 – 1');
  assert.equal(record(9, 0), '9 – 0');
});

test('nothing counted answers nothing, so the cell prints its own dash', () => {
  assert.equal(record(0, 0), null);
  assert.equal(record(0, undefined), null);
  assert.equal(record(null, null), null);
});
