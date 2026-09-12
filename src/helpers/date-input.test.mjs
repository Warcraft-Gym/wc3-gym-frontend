import { test } from 'node:test';
import assert from 'node:assert/strict';
import { checkDate, dayDate, dayIso } from './date-input.mjs';

const today = new Date(2026, 8, 9);

test('a real date near today passes', () => {
  assert.equal(checkDate('2026-09-15', today), true);
  assert.equal(checkDate('2000-01-01', today), true);
  assert.equal(checkDate('2028-12-31', today), true);
});

test('a year far from today is refused', () => {
  assert.equal(checkDate('1994-06-01', today), 'Year must be between 2000 and 2028.');
  assert.equal(checkDate('9999-06-01', today), 'Year must be between 2000 and 2028.');
});

test('a malformed or impossible date is refused', () => {
  assert.equal(checkDate('1994', today), 'Enter a date.');
  assert.equal(checkDate('', today), 'Enter a date.');
  assert.equal(checkDate('2026-02-30', today), 'Enter a date.');
});

// 9 October is the ninth of October to every reader, not the tenth of September
test('a day round-trips as the day it names', () => {
  const date = dayDate('2026-10-09');
  assert.equal(date.getMonth(), 9);
  assert.equal(date.getDate(), 9);
  assert.equal(dayIso(date), '2026-10-09');
  assert.equal(dayDate(''), null);
  assert.equal(dayIso(null), '');
});
