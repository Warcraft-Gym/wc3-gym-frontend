import { test } from 'node:test';
import assert from 'node:assert/strict';
import { dayText, ruleFrom, ruleLine, ruleProblem, upcomingRows } from './cup-recurrence.mjs';

test('a rule reads every week or the nth weekday of the month', () => {
  assert.equal(ruleLine({ weekday: 4, nth: null, start_time: '20:00' }), 'Every Friday at 20:00');
  assert.equal(ruleLine({ weekday: 4, nth: 1, start_time: '20:00' }), 'The first Friday of the month at 20:00');
  assert.equal(ruleLine({ weekday: 6, nth: -1, start_time: '18:30', ends_on: '2030-06-30' }), 'The last Sunday of the month at 18:30 until Sun 30 Jun 2030');
});

test('a day reads with its weekday', () => {
  assert.equal(dayText('2030-01-11'), 'Fri 11 Jan 2030');
  assert.equal(dayText(''), '');
});

test('a cup suggests its own weekday, time and name', () => {
  const rule = ruleFrom({ name: 'Friday Night Cup #13', starts_at: '2030-01-04T19:00:00Z' }, 'UTC');
  assert.deepEqual(rule, { name: 'Friday Night Cup', weekday: 4, nth: null, start_time: '19:00', zone: 'UTC', ends_on: null });
  // the zone decides the day: 23:30 UTC on a Friday is Saturday in Berlin
  assert.equal(ruleFrom({ name: 'Late', starts_at: '2030-01-04T23:30:00Z' }, 'Europe/Berlin').weekday, 5);
  // a cup made from a rule drops its date
  assert.equal(ruleFrom({ name: 'Friday Cup 11 Jan 2030', starts_at: '2030-01-11T19:00:00Z' }, 'UTC').name, 'Friday Cup');
});

test('a rule needs a name and a start time', () => {
  assert.equal(ruleProblem({ name: ' ', start_time: '20:00' }), 'Name the recurring cup.');
  assert.equal(ruleProblem({ name: 'Cup', start_time: '25:00' }), 'Pick the start time.');
  assert.equal(ruleProblem({ name: 'Cup', start_time: '20:00' }), null);
});

test('a coming day carries the cup made on it', () => {
  const rows = upcomingRows({ upcoming: [{ on: '2030-01-04', event_id: 7 }, { on: '2030-01-11', event_id: null }], occurrences: [{ event_id: 7, name: 'Cup' }] });
  assert.equal(rows[0].occurrence.name, 'Cup');
  assert.equal(rows[1].occurrence, null);
});
