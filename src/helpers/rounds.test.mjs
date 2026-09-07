import { test } from 'node:test';
import assert from 'node:assert/strict';
import { DateTime } from 'luxon';
import { roundLabel, roundOver } from './rounds.mjs';

test('a round is labelled by its window', () => {
  assert.equal(roundLabel({ playday: 1, start_date: '2026-09-13', end_date: '2026-09-19' }), '13 to 19 Sep');
  assert.equal(roundLabel({ playday: 3, start_date: '2026-09-28', end_date: '2026-10-04' }), '28 Sep to 4 Oct');
  assert.equal(roundLabel({ playday: 1, start_date: '2026-09-13', end_date: null }), '13 Sep');
  assert.equal(roundLabel({ playday: 1, start_date: '2026-09-13', end_date: '2026-09-13' }), '13 Sep');
  assert.equal(roundLabel({ playday: 4 }), 'Week 4');
});

test('a round is over the day after its window closes', () => {
  const today = DateTime.fromISO('2026-09-20T10:00');
  assert.equal(roundOver({ start_date: '2026-09-13', end_date: '2026-09-19' }, today), true);
  assert.equal(roundOver({ start_date: '2026-09-13', end_date: '2026-09-20' }, today), false);
  assert.equal(roundOver({ start_date: '2026-09-19', end_date: null }, today), true);
  assert.equal(roundOver({ start_date: '2026-09-20', end_date: null }, today), false);
  assert.equal(roundOver({ playday: 2 }, today), false);
});
