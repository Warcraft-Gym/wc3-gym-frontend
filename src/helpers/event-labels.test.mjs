import test from 'node:test';
import assert from 'node:assert/strict';
import process from 'node:process';

import { dateRange, ENTRANT_KINDS, eventPayload, leaguePayload, stateOf, titleOf } from './event-labels.mjs';

process.env.TZ = 'Australia/Sydney';  // UTC+10, so a wall time and its stored instant differ

test('an event shows its start time, its two dates, one date, or nothing', () => {
  assert.equal(dateRange({ starts_at: '2026-10-01T09:00:00' }), '1 Oct 2026, 19:00');
  assert.equal(dateRange({ start_date: '2026-10-01', end_date: '2026-11-30' }), '1 Oct 2026 – 30 Nov 2026');
  assert.equal(dateRange({ start_date: '2026-10-01' }), '1 Oct 2026');
  assert.equal(dateRange({}), '');
});

test('the state reads off phase, and a word falls back to the stored value', () => {
  assert.equal(stateOf({ phase: 'running' }), 'running');
  assert.equal(stateOf({ state: 'checkin', phase: 'running' }), 'checkin');
  assert.equal(stateOf(null), null);
  assert.equal(titleOf(ENTRANT_KINDS, 'drafted_teams'), 'Drafted teams');
  assert.equal(titleOf(ENTRANT_KINDS, 'squads'), 'squads');
});

test('a blank field is sent as nothing, not as an empty string', () => {
  const body = leaguePayload({ name: '  Autumn league ', short_name: '', kind: 'custom', entrant_kind: 'solo', page_url: ' https://gnl.gg ' });
  assert.equal(body.name, 'Autumn league');
  assert.equal(body.short_name, null);
  assert.equal(body.page_url, 'https://gnl.gg');
  assert.equal(body.stream_url, null);
});

test('a start date and a typed time are stored as the UTC instant they name', () => {
  const body = eventPayload({
    league_id: 3,
    name: ' Autumn cup ',
    kind: 'cup',
    start_date: new Date(2026, 9, 1),
    end_date: null,
    start_time: '19:00',
    description: '',
    checkin_enabled: true,
  });
  assert.equal(body.name, 'Autumn cup');
  assert.equal(body.start_date, '2026-10-01');
  assert.equal(body.end_date, null);
  assert.equal(body.starts_at, '2026-10-01T09:00:00');
  assert.equal(body.description, null);
  assert.equal(body.checkin_enabled, true);
});
