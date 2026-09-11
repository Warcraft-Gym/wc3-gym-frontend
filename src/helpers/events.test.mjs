import { test } from 'node:test';
import assert from 'node:assert/strict';
import process from 'node:process';
import { joinableEvents, seasonAction, upcomingEvents } from './events.mjs';

process.env.TZ = 'Australia/Sydney';  // UTC+10, so the player's day and the UTC day differ

const now = new Date('2026-09-11T12:00:00Z');
const seasons = [
  { id: 3, name: 'GNL S17', phase: 'complete', start_date: '2026-03-02' },
  { id: 4, name: 'GNL S18', phase: 'commenced', start_date: '2026-07-06' },
  { id: 5, name: 'GNL S19', phase: 'open', start_date: '2026-09-29' },
  { id: 7, name: 'GNL S20', phase: 'overdue', start_date: '2026-01-01' },
];
const kothEvents = [
  { id: 1, name: 'Old KOTH', event_date: '2025-12-27T00:00:00Z', is_active: true },
  { id: 4, name: 'Friday KOTH', event_date: '2026-09-11T19:00:00Z', is_active: true },
  { id: 7, name: 'Off KOTH', event_date: '2026-09-20T19:00:00Z', is_active: false },
];
const view = (rows) => rows.map(({ key, action, joined }) => ({ key, action, joined }));

test('the phase and signups_open decide the action', () => {
  assert.equal(seasonAction({ phase: 'open' }), 'signup');
  assert.equal(seasonAction({ phase: 'open', signups_open: true }), 'signup');
  assert.equal(seasonAction({ phase: 'open', signups_open: false }), 'request');
  assert.equal(seasonAction({ phase: 'commenced' }), 'request');
  assert.equal(seasonAction({ phase: 'overdue' }), 'request');
  assert.equal(seasonAction({ phase: 'complete' }), null);
  assert.equal(seasonAction(null), null);
});

test('the home page asks to join a current season an admin closed early or one that is overdue', () => {
  const closed = seasons.map((season) => (season.id === 5 ? { ...season, signups_open: false } : season));
  const rows = upcomingEvents({ seasons: closed, currentSeasonId: 5, now });
  assert.equal(rows.find((row) => row.key === 'season:5').action, 'request');
  assert.deepEqual(joinableEvents(rows), []);
  assert.equal(upcomingEvents({ seasons, currentSeasonId: 7, now }).find((row) => row.key === 'season:7').action, 'request');
});

test('with S19 open as the current season, only S19 acts; S18 is information only', () => {
  const rows = upcomingEvents({ seasons, currentSeasonId: 5, kothEvents, now });
  assert.deepEqual(view(rows), [
    { key: 'season:4', action: null, joined: null },
    { key: 'koth:4', action: 'signup', joined: null },
    { key: 'season:5', action: 'signup', joined: false },
  ]);
  assert.deepEqual(joinableEvents(rows).map((row) => row.key), ['season:5']);
  assert.equal(rows[2].slug, 'gnl-s19');
});

test('with S18 commenced as the current season, only S18 acts; S19 is information only', () => {
  const rows = upcomingEvents({ seasons, currentSeasonId: 4, signedUp: true, now });
  assert.deepEqual(view(rows), [
    { key: 'season:4', action: 'request', joined: true },
    { key: 'season:5', action: null, joined: null },
  ]);
  assert.deepEqual(joinableEvents(rows), []);
  assert.deepEqual(view(upcomingEvents({ seasons, currentSeasonId: 4, now })).at(0), { key: 'season:4', action: 'request', joined: false });
});

test('the popup offers nothing once the player has taken the current signup', () => {
  assert.deepEqual(joinableEvents(upcomingEvents({ seasons, currentSeasonId: 5, signedUp: true, now })), []);
});

test('a season with no start date sorts last', () => {
  const rows = upcomingEvents({ seasons: [{ id: 1, name: 'A', phase: 'open' }, seasons[2]], now });
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
