import { test } from 'node:test';
import assert from 'node:assert/strict';
import { checkDate } from './date-input.mjs';

const today = new Date(2026, 8, 9);

test('a real date near today passes', () => {
  assert.equal(checkDate('09/15/2026', today), true);
  assert.equal(checkDate('01/01/2000', today), true);
  assert.equal(checkDate('12/31/2028', today), true);
});

test('a year far from today is refused', () => {
  assert.equal(checkDate('06/01/1994', today), 'Year must be between 2000 and 2028.');
  assert.equal(checkDate('06/01/9999', today), 'Year must be between 2000 and 2028.');
});

test('a malformed or impossible date is refused', () => {
  assert.equal(checkDate('1994', today), 'Invalid date format. Use MM/DD/YYYY');
  assert.equal(checkDate('13/01/2026', today), 'Invalid date format. Use MM/DD/YYYY');
  assert.equal(checkDate('02/30/2026', today), 'Invalid date. Please enter a valid date.');
});
