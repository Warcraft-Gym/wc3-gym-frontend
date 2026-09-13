import test from 'node:test';
import assert from 'node:assert/strict';
import process from 'node:process';

import { dateRange, ENTRANT_KINDS, eventLabel, leaguePayload, stateOf, titleOf } from './event-labels.mjs';

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
  assert.equal('stream_url' in body, false);
});

test('an event name carries its league, and drops it when the name already opens with it', () => {
  const gnl = { name: 'GNL', short_name: 'GNL' };
  assert.equal(eventLabel({ name: 'Season 18', league_short_name: 'GNL' }), 'GNL \u00b7 Season 18');
  assert.equal(eventLabel({ name: 'GNL S18', league_short_name: 'GNL' }), 'GNL S18');
  assert.equal(eventLabel({ name: 'Season 18' }), 'Season 18');
  assert.equal(eventLabel({ season_name: 'Season 18', league_short_name: 'GNL' }), 'GNL \u00b7 Season 18');
  assert.equal(eventLabel({ name: 'Season 18' }, gnl), 'GNL \u00b7 Season 18');
  assert.equal(eventLabel({ name: 'Autumn cup' }, { name: 'Gym Cups' }), 'Gym Cups \u00b7 Autumn cup');
  assert.equal(eventLabel(null), '');
  assert.equal(eventLabel({ league_short_name: 'GNL' }), 'GNL');
});
