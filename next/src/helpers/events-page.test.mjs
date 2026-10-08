import { test } from 'node:test';
import assert from 'node:assert/strict';
import { eligibilityLines, eveningOf, fill, groupEvents, organizerCard, runsEvent } from './events-page.mjs';

const event = (id, kind, phase, starts_at = null) => ({ id, kind, phase, starts_at });

test('a running event is live, a finished one past, and every other phase still to come', () => {
  const rows = [
    event(1, 'cup', 'running'),
    event(2, 'cup', 'finished'),
    event(3, 'cup', 'signups_open'),
    event(4, 'cup', 'checkin'),
    event(5, 'cup', 'draft'),
    event(6, 'koth', 'running'),
  ];
  const { live, upcoming, past } = groupEvents(rows, 'cup');
  assert.deepEqual(live.map((e) => e.id), [1]);
  assert.deepEqual(past.map((e) => e.id), [2]);
  assert.deepEqual(upcoming.map((e) => e.id).sort(), [3, 4, 5]);
  assert.deepEqual(groupEvents(rows, 'all').live.map((e) => e.id), [6, 1]);
});

test('upcoming reads soonest first with the undated last; past reads newest first', () => {
  const rows = [
    event(1, 'cup', 'signups_open', '2026-10-20T18:00:00Z'),
    event(2, 'cup', 'signups_open', null),
    event(3, 'cup', 'signups_open', '2026-10-11T18:00:00Z'),
    event(4, 'cup', 'finished', '2026-09-01T18:00:00Z'),
    event(5, 'cup', 'finished', '2026-10-02T18:00:00Z'),
  ];
  const { upcoming, past } = groupEvents(rows);
  assert.deepEqual(upcoming.map((e) => e.id), [3, 1, 2]);
  assert.deepEqual(past.map((e) => e.id), [5, 4]);
});

test('the organizer card follows the session: organizer, pending, ask, or none', () => {
  assert.equal(organizerCard(null), null);
  assert.equal(organizerCard({ role: 'guest' }), null);
  assert.equal(organizerCard({ role: 'admin' }), 'organizer');
  assert.equal(organizerCard({ role: 'member', organizer: true }), 'organizer');
  assert.equal(organizerCard({ role: 'captain', organizer: false, organizer_request: 'pending' }), 'pending');
  assert.equal(organizerCard({ role: 'member', organizer: false, organizer_request: null }), 'ask');
});

test('a capped cup reads its count over its cap; no cap reads the count alone', () => {
  assert.deepEqual(fill({ entrant_count: 9, entrant_cap: 16 }), { count: 9, label: '9 / 16', percent: 56 });
  assert.deepEqual(fill({ entrant_count: 20, entrant_cap: 16 }).percent, 100);
  assert.deepEqual(fill({ entrant_count: 3 }), { count: 3, label: '3 signed up', percent: null });
});

test('an admin runs every event; a member runs the ones whose organizer list names it', () => {
  const list = [{ discord_id: '50' }];
  assert.equal(runsEvent(null, list), false);
  assert.equal(runsEvent({ role: 'admin', discord_id: '1' }, []), true);
  assert.equal(runsEvent({ role: 'member', discord_id: '50' }, list), true);
  assert.equal(runsEvent({ role: 'captain', discord_id: '50', actual_role: 'captain' }, list), true);
  assert.equal(runsEvent({ role: 'member', discord_id: '51' }, list), false);
  assert.equal(runsEvent({ role: 'guest', discord_id: '50' }, list), false);
  // an admin viewing as a member runs nothing it does not hold a row of
  assert.equal(runsEvent({ role: 'member', discord_id: '50', actual_role: 'admin' }, list), false);
});

test('the evening counts the entrants still in, the check-ins, the no-shows and the minimum', () => {
  const rows = [
    { id: 1, checked_in_at: 't' },
    { id: 2, checked_in_at: 't' },
    { id: 3, checked_in_at: null },
    { id: 4, checked_in_at: null, withdrawn_at: 't' },
  ];
  const evening = eveningOf({ checkin_enabled: true, entrant_min: 3 }, rows);
  assert.deepEqual([evening.live, evening.checkedIn, evening.noShows.map((r) => r.id), evening.belowMin, evening.afterNoShows], [3, 2, [3], false, 2]);
  assert.equal(eveningOf({ checkin_enabled: true, entrant_min: 4 }, rows).belowMin, true);
  // with no check-in nobody is a no-show, and no minimum is never short
  const open = eveningOf({ checkin_enabled: false, entrant_min: null }, rows);
  assert.deepEqual([open.noShows.length, open.belowMin], [0, false]);
});

test('the eligibility reads one line per rule the event names', () => {
  assert.deepEqual(eligibilityLines({}), []);
  assert.deepEqual(eligibilityLines({ eligibility_required: true })[0], 'A battle tag W3Champions rates on the race you sign up with');
  assert.deepEqual(eligibilityLines({ eligibility_required: true, bnet_required: true, mmr_min: 1400, mmr_max: 1800, min_games: 20 }), [
    'A battle tag linked to Battle.net, rated by W3Champions on the race you sign up with',
    'MMR from 1400 to 1800 on that race',
    'At least 20 games on that race recently',
  ]);
  assert.deepEqual(eligibilityLines({ mmr_max: 1600 }), ['MMR up to 1600 on that race']);
  assert.deepEqual(eligibilityLines({ mmr_min: 1200 }), ['MMR 1200 or more on that race']);
});
