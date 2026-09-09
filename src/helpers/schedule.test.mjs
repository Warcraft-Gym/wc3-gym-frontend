import { test } from 'node:test';
import assert from 'node:assert/strict';
import { DateTime } from 'luxon';
import { scheduleDays } from './schedule.mjs';

const at = (days, hour = 12) => DateTime.utc(2026, 9, 10, hour).plus({ days }).toISO();
// The reader's own day decides the grouping, so the test reads the zone it runs in
const dayOf = (iso) => DateTime.fromISO(iso, { zone: 'UTC' }).toLocal().toISODate();

test('the schedule keeps last week and everything ahead, soonest first', () => {
  const now = DateTime.utc(2026, 9, 10, 12);
  const series = [
    { id: 1, date_time: at(3) },
    { id: 2, date_time: at(-8) }, // older than KEEP_DAYS
    { id: 3, date_time: at(-6), casts: [{ id: 9 }] },
    { id: 4, date_time: null }, // never scheduled
    { id: 5, date_time: at(3, 14) },
  ];
  const days = scheduleDays(series, now);

  assert.deepEqual(days.flatMap((d) => d.rows.map((r) => r.id)), [3, 1, 5]);
  assert.deepEqual(days.map((d) => d.key), [...new Set([at(-6), at(3), at(3, 14)].map(dayOf))]);
  assert.equal(days.find((d) => d.rows.some((r) => r.id === 3)).cast, 1);
  assert.equal(days.find((d) => d.rows.some((r) => r.id === 1)).cast, 0);
});

test('an empty season gives no days', () => {
  assert.deepEqual(scheduleDays([], DateTime.utc(2026, 9, 10)), []);
});
