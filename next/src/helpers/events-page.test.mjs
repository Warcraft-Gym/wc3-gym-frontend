import { test } from 'node:test';
import assert from 'node:assert/strict';
import { eligibilityLines, eveningOf, groupEvents, joinsWaitlist, moveStartBody, moveStartForm, organizerCard, runsEvent, waitlistOf } from './events-page.mjs';

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
  const evening = eveningOf({ checkin_enabled: true, entrant_min: 2 }, rows);
  assert.deepEqual([evening.live, evening.checkedIn, evening.noShows.map((r) => r.id), evening.seated, evening.belowMin], [3, 2, [3], 2, false]);
  // with no check-in nobody is a no-show, and no minimum is never short
  const open = eveningOf({ checkin_enabled: false, entrant_min: null }, rows);
  assert.deepEqual([open.noShows.length, open.belowMin], [0, false]);
});

test('a cup that takes check-in is short of its minimum by the players who checked in, as the draw seats them', () => {
  const rows = [
    { id: 1, checked_in_at: 't' },
    { id: 2, checked_in_at: 't' },
    { id: 3, checked_in_at: null },
  ];
  // three are in but two checked in, so a minimum of three holds the draw
  assert.equal(eveningOf({ checkin_enabled: true, entrant_min: 3 }, rows).belowMin, true);
  // a cup that takes no check-in seats every player still in
  assert.equal(eveningOf({ checkin_enabled: false, entrant_min: 3 }, rows).belowMin, false);
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

// 09:00 UTC is 20:00 in Sydney in October (UTC+11)
const cup = { start_date: '2026-10-16', starts_at: '2026-10-16T09:00:00' };
const zone = 'Australia/Sydney';

test('Move the start opens on the stored start in the zone, or the stored day and no time', () => {
  assert.deepEqual(moveStartForm(cup, zone), { date: new Date(2026, 9, 16), time: '20:00' });
  assert.deepEqual(moveStartForm({ start_date: '2026-10-16', starts_at: null }, zone), { date: new Date(2026, 9, 16), time: '' });
});

test('Move the start writes no end date and keeps the time of day when no time is picked', () => {
  const later = new Date(2026, 9, 18);
  assert.deepEqual(moveStartBody(cup, later, '', zone), { start_date: '2026-10-18', end_date: null, starts_at: '2026-10-18T09:00:00' });
  assert.deepEqual(moveStartBody(cup, later, '19:30', zone), { start_date: '2026-10-18', end_date: null, starts_at: '2026-10-18T08:30:00' });
  assert.equal(moveStartBody(cup, '2026-10-18', '', zone).starts_at, '2026-10-18T09:00:00');
  assert.deepEqual(moveStartBody({ start_date: '2026-10-16', starts_at: null }, later, '', zone), { start_date: '2026-10-18', end_date: null, starts_at: null });
  assert.deepEqual(moveStartBody(cup, null, '20:00', zone), { start_date: null, end_date: null, starts_at: null });
});

test('a cup that counts races by their games reads the best of the races played', () => {
  assert.deepEqual(eligibilityLines({ race_games_min: 20, eligibility_required: true, mmr_max: 1000, min_games: 10 }), [
    'A battle tag W3Champions rates',
    'Highest MMR of the races with 20 games or more up to 1000',
    'At least 10 games recently, over all races',
  ]);
  assert.deepEqual(eligibilityLines({ race_games_min: 20, eligibility_required: true }), ['A battle tag W3Champions rates', 'At least 20 games on one race']);
});

test('a signup on the waitlist stands in no field, and a drawn or full cup takes the next one there', () => {
  const cup = { kind: 'cup', entrant_cap: 2 };
  const rows = [{ id: 1 }, { id: 2, waitlisted_at: '2026-10-12T10:00:00Z' }, { id: 3, waitlisted_at: '2026-10-12T09:00:00Z' }, { id: 4, waitlisted_at: '2026-10-12T08:00:00Z', withdrawn_at: '2026-10-12T08:30:00Z' }];
  assert.equal(eveningOf(cup, rows).live, 1);
  assert.deepEqual(waitlistOf(rows).map((row) => row.id), [3, 2]);
  assert.equal(joinsWaitlist(cup, rows, false), false);
  assert.equal(joinsWaitlist(cup, rows, true), true);
  assert.equal(joinsWaitlist(cup, [{ id: 1 }, { id: 5 }], false), true);
  assert.equal(joinsWaitlist({ kind: 'koth', entrant_cap: 1 }, [{ id: 1 }], true), false);
  // a cup over rounds takes a late player for its later rounds
  assert.equal(joinsWaitlist({ kind: 'cup', cup_legs: [{ id: 1 }] }, [{ id: 1 }], true), false);
});
