import { test } from 'node:test';
import assert from 'node:assert/strict';
import { eligibilityLines, eveningOf, groupEvents, joinsWaitlist, linePlaces, moveStartBody, moveStartForm, organizerCard, runsEvent, signedUpText, waitlistNote, waitlistOf } from './events-page.mjs';

const event = (id, kind, phase, starts_at = null) => ({ id, kind, phase, starts_at });

test('a finished event is past, and every other phase upcoming, a running one first', () => {
  const rows = [
    event(1, 'cup', 'signups_open', '2026-10-20T18:00:00Z'),
    event(2, 'cup', 'finished'),
    event(3, 'cup', 'running', '2026-10-21T18:00:00Z'),
    event(4, 'cup', 'checkin', '2026-10-19T18:00:00Z'),
    event(5, 'cup', 'draft'),
    event(6, 'cup', 'running', null),
  ];
  const { upcoming, past } = groupEvents(rows);
  assert.deepEqual(past.map((e) => e.id), [2]);
  // the running cups lead, an undated one too, then soonest first with the undated last
  assert.deepEqual(upcoming.map((e) => e.id), [3, 6, 4, 1, 5]);
});

test('the events page holds cups only: no GNL season, sign-up list or KOTH night', () => {
  const rows = [event(1, 'cup', 'running'), event(2, 'gnl', 'running'), event(3, 'gnl', 'finished'), event(4, 'signup', 'signups_open'), event(6, 'koth', 'running'), event(7, 'koth', 'signups_open'), event(8, 'koth', 'finished')];
  const { upcoming, past } = groupEvents(rows);
  assert.deepEqual([upcoming, past].map((list) => list.map((e) => e.id)), [[1], []]);
});

test('two events starting together read by status: check-in, sign-ups, seeded, then a draft', () => {
  const at = '2026-10-20T18:00:00Z';
  const rows = [event(1, 'cup', 'draft', at), event(2, 'cup', 'seeded', at), event(3, 'cup', 'signups_open', at), event(4, 'cup', 'checkin', at), event(5, 'cup', 'signups_open', '2026-10-19T18:00:00Z')];
  assert.deepEqual(groupEvents(rows).upcoming.map((e) => e.id), [5, 4, 3, 2, 1]);
});

test('an organizer reads the players in against the cap, or alone without one', () => {
  assert.equal(signedUpText({ entrant_count: 12, entrant_cap: 16 }), '12 / 16');
  assert.equal(signedUpText({ entrant_count: 5, entrant_cap: null }), '5');
  assert.equal(signedUpText({}), '0');
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
  const evening = eveningOf({ checkin_enabled: true, checkin_open: true, entrant_min: 2 }, rows);
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
  // three are in but two checked in, so while the window is open a minimum of three holds the draw
  const open = eveningOf({ checkin_enabled: true, checkin_open: true, entrant_min: 3 }, rows);
  assert.deepEqual([open.seated, open.byCheckIn, open.belowMin], [2, true, true]);
  // before the window opens the count is the sign-ups
  const shut = eveningOf({ checkin_enabled: true, checkin_open: false, entrant_min: 3 }, rows);
  assert.deepEqual([shut.seated, shut.byCheckIn, shut.belowMin], [3, false, false]);
  // a cup that takes no check-in seats every player still in
  assert.equal(eveningOf({ checkin_enabled: false, checkin_open: true, entrant_min: 3 }, rows).belowMin, false);
});

test('the eligibility reads one line per rule the event names', () => {
  assert.deepEqual(eligibilityLines({}), []);
  assert.deepEqual(eligibilityLines({ eligibility_required: true })[0], 'A battle tag W3Champions rates on the race you sign up with');
  assert.deepEqual(eligibilityLines({ eligibility_required: true, bnet_required: true, mmr_min: 1400, mmr_max: 1800, min_games: 20 }), [
    'A battle tag verified with Battle.net',
    'A battle tag W3Champions rates on the race you sign up with',
    'MMR from 1400 to 1800 on that race',
    'At least 20 games on that race recently',
  ]);
  assert.deepEqual(eligibilityLines({ mmr_max: 1600 }), ['MMR up to 1600 on that race']);
  // verification stands without the rating check
  assert.deepEqual(eligibilityLines({ bnet_required: true }), ['A battle tag verified with Battle.net']);
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
  // the next signup stands behind the waitlist; a withdrawn row stands in no line
  assert.equal(joinsWaitlist(cup, rows, false), true);
  assert.equal(joinsWaitlist(cup, rows.slice(0, 1), false), false);
  assert.equal(joinsWaitlist(cup, rows.slice(0, 1), true), true);
  assert.equal(joinsWaitlist(cup, [{ id: 1 }, { id: 5 }], false), true);
  assert.equal(joinsWaitlist({ kind: 'koth', entrant_cap: 1 }, [{ id: 1 }], true), false);
  // a cup over rounds takes a late player for its later rounds
  assert.equal(joinsWaitlist({ kind: 'cup', cup_legs: [{ id: 1 }] }, [{ id: 1 }], true), false);
});

test('a cup with divisions takes its line a whole division at a time', () => {
  assert.deepEqual([3, 4, 5, 7, 8, 11, 12].map((total) => linePlaces(total, 4, true)), [3, 4, 4, 4, 8, 8, 12]);
  assert.deepEqual([3, 4, 6].map((total) => linePlaces(total, 4, false)), [3, 4, 4]);
  assert.equal(linePlaces(9, null, true), 9);

  const cup = { kind: 'cup', entrant_cap: 4, uses_divisions: true };
  const line = (count) => Array.from({ length: count }, (unused, index) => ({ id: index + 1 }));
  // the fifth to seventh signups wait; the eighth fills the second division and comes in
  assert.deepEqual([3, 4, 5, 6, 7].map((count) => joinsWaitlist(cup, line(count))), [false, true, true, true, false]);
});

test('a waiting player reads when they come in, to check in, and who decides', () => {
  const line = (count) => Array.from({ length: count }, (unused, index) => ({ id: index + 1 }));
  const divisions = waitlistNote({ kind: 'cup', entrant_cap: 4, uses_divisions: true }, line(6));
  assert.match(divisions, /Each division takes 4 players, and the next one opens once 2 more players sign up/);
  assert.match(divisions, /Check in as usual/);
  assert.match(divisions, /final call/);
  assert.match(waitlistNote({ kind: 'cup', entrant_cap: 4, uses_divisions: true, team_size: 2 }, line(7)), /once 1 more team signs up/);
  assert.match(waitlistNote({ kind: 'cup', entrant_cap: 2 }, line(3)), /The first place that frees up goes to the first in line/);
  assert.match(waitlistNote({ kind: 'cup', entrant_cap: 2 }, line(3), true), /swaps you in/);
  // a cup over rounds keeps its line moving after a draw
  assert.match(waitlistNote({ kind: 'cup', entrant_cap: 2, cup_legs: [{ id: 1 }] }, line(3), true), /first in line/);
});
