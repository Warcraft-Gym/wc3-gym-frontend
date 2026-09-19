import { test } from 'node:test';
import assert from 'node:assert/strict';
import { countShare } from './figures.mjs';

test('a count of ten or more carries its share', () => {
  assert.equal(countShare(19, 30), '19/30 (63%)');
  assert.equal(countShare(10, 10), '10/10 (100%)');
  assert.equal(countShare(0, 12), '0/12 (0%)');
});

test('under ten the count stands alone', () => {
  assert.equal(countShare(3, 4), '3/4');
  assert.equal(countShare(9, 9), '9/9');
});

test('nothing counted answers nothing, so the cell prints its own dash', () => {
  assert.equal(countShare(0, 0), null);
  assert.equal(countShare(0, undefined), null);
});
