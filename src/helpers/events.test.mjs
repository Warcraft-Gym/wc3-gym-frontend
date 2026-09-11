import { test } from 'node:test';
import assert from 'node:assert/strict';
import process from 'node:process';
import { joinableEvents, seasonAction, upcomingEvents } from './events.mjs';

process.env.TZ = 'Australia/Sydney';  // UTC+10, so the player's day and the UTC day differ

const now = new Date('2026-09-11T12:00:00Z');
const seasons = [
  { id: 4, name: 'GNL S18', phase: 'complete', start_date: '2026-07-06' },
  { id: 5, name: 'GNL S19', phase: 'open', start_date: '2026-09-29' },
  { id: 6, name: 'GNL Review Season', phase: 'commenced', start_date: '2026-09-01' },
  { id: 7, name: 'GNL S20', phase: 'overdue', start_date: '2026-01-01' },
];
const kothEvents = [
  { id: 5, name: 'Old KOTH', event_date: '2025-12-27T00:00:00Z', is_active: true },
  { id: 6, name: 'Friday KOTH', event_date: '2026-09-11T19:00:00Z', is_active: true },
  { id: 7, name: 'Off KOTH', event_date: '2026-09-20T19:00:00Z', is_active: false },
];

test('the phase decides the action', () => {
  assert.equal(seasonAction('open'), 'signup');
  assert.equal(seasonAction('commenced'), 'request');
  assert.equal(seasonAction('overdue'), null);
  assert.equal(seasonAction('complete'), null);
});

test('rows key on kind and id, so a season and a KOTH night with one id both show', () => {
  const rows = upcomingEvents({ seasons, kothEvents, joinedSeasonIds: [6], now });
  assert.deepEqual(rows.map((row) => row.key), ['season:6', 'koth:6', 'season:5']);
  assert.deepEqual(rows.map((row) => row.joined), [true, null, false]);
  assert.equal(rows[2].slug, 'gnl-s19');
});

test('the popup offers only open signups the player has not taken', () => {
  const rows = upcomingEvents({ seasons, kothEvents, joinedSeasonIds: [6], now });
  assert.deepEqual(joinableEvents(rows).map((row) => row.key), ['season:5']);
  assert.deepEqual(joinableEvents(upcomingEvents({ seasons, joinedSeasonIds: [5], now })), []);
});

test('a season with no start date sorts last', () => {
  const rows = upcomingEvents({ seasons: [{ id: 1, name: 'A', phase: 'open' }, seasons[1]], now });
  assert.deepEqual(rows.map((row) => row.id), [5, 1]);
});

test("a KOTH night keeps its row through the player's own day, not the UTC day", () => {
  const early = new Date('2026-09-10T19:00:00Z');  // 05:00 on 11 Sep in Sydney
  const nights = [
    { id: 1, name: 'Last night', event_date: '2026-09-10T09:00:00Z', is_active: true },  // 19:00 on 10 Sep
    { id: 2, name: 'Tonight so far', event_date: '2026-09-10T15:00:00Z', is_active: true },  // 01:00 on 11 Sep
  ];
  assert.deepEqual(upcomingEvents({ kothEvents: nights, now: early }).map((row) => row.key), ['koth:2']);
});
