import { test } from 'node:test';
import assert from 'node:assert/strict';
import process from 'node:process';
import { checkInFor, dismissKoth, eventActionButton, hideResultsStored, homeCards, joinableEvents, kothCards, kothDismissed, seasonAction, storeHideResults } from './events.mjs';

process.env.TZ = 'Australia/Sydney';  // UTC+10, so the player's day and the UTC day differ

const now = new Date('2026-10-05T12:00:00Z');
// the /seasons list: the rounds and the round count live here, not on the member read
const seasons = [
  { id: 4, name: 'GNL Review Season', start_date: '2026-09-01', scheduling_enabled: true, round_count: 8, rounds: [
    { playday: 4, start_date: '2026-09-28', end_date: '2026-10-04' },
    { playday: 5, start_date: '2026-10-05', end_date: '2026-10-11' },
  ] },
  { id: 5, name: 'GNL Review Season 2', start_date: '2026-11-02', rounds: [] },
];
// /me: the seat and the team of the account, which the member read does not carry
const me = {
  user: { id: 7, battleTag: 'thanks#11187' },
  seasons: [
    { id: 4, captain: true, team: { id: 2, name: 'GNLB' } },
    { id: 5, captain: false, team: null },
  ],
};
// one row of GET /me/events; the caller's own state rides on it
const row = (over) => ({
  kind: 'cup', id: 9, name: 'Autumn Cup', league_short_name: 'GYM', start: '2026-10-12', end: '2026-10-13',
  phase: 'signups_open', signups_open: true, joined: false, entrant_id: null, checked_in_at: null,
  checkin_shape: null, checkin_open: false, next_round: null, action: 'sign_up', ...over,
});
// the member read, newest event first, one finished event among them
const events = [
  row({}),
  row({ kind: 'gnl', id: 5, name: 'GNL Review Season 2', league_short_name: 'GNL', start: '2026-11-02', end: null, phase: 'seeded', signups_open: false, action: 'closed' }),
  row({ kind: 'gnl', id: 4, name: 'GNL Review Season', league_short_name: 'GNL', start: '2026-09-01', end: null, phase: 'running', signups_open: false, joined: true, action: 'view' }),
  row({ id: 3, name: 'Spring Cup', start: '2026-03-02', end: '2026-03-03', phase: 'finished', signups_open: false, action: 'view' }),
];
const kothEvents = [
  { id: 1, name: 'Old KOTH', event_date: '2026-09-27T09:00:00Z', is_active: true },
  { id: 4, name: 'KOTH Night 14', event_date: '2026-10-09T18:00:00Z', is_active: true },
  { id: 7, name: 'Off KOTH', event_date: '2026-10-20T18:00:00Z', is_active: false },
];

test('the phase and signups_open decide the action', () => {
  assert.equal(seasonAction({ phase: 'open' }), 'signup');
  assert.equal(seasonAction({ phase: 'open', signups_open: true }), 'signup');
  assert.equal(seasonAction({ phase: 'open', signups_open: false }), 'request');
  assert.equal(seasonAction({ phase: 'commenced' }), 'request');
  assert.equal(seasonAction({ phase: 'overdue' }), 'request');
  assert.equal(seasonAction({ phase: 'complete' }), null);
  assert.equal(seasonAction(null), null);
});

test('one card per event of any kind, the finished one left out, soonest start first', () => {
  const cards = homeCards({ events, me, seasons, now });
  assert.deepEqual(cards.map((card) => card.key), ['event:4', 'event:9', 'event:5']);
  assert.equal(cards[1].name, 'GYM · Autumn Cup');
  assert.equal(cards[1].date.toISOString(), '2026-10-12T00:00:00.000Z');
  assert.equal(cards[2].slug, 'gnl-review-season-2');
});

test('an event without a start date falls last', () => {
  const undated = row({ id: 11, name: 'Undated Cup', start: null, end: null });
  const cards = homeCards({ events: [undated, ...events], me, seasons, kothEvents, now });
  assert.deepEqual(cards.map((card) => card.key), ['event:4', 'koth:4', 'event:9', 'event:5', 'event:11']);
});

test('the season the captain plays reads the round in play and carries every link', () => {
  const card = homeCards({ events, me, seasons, now })[0];
  assert.equal(card.status, 'Round 5 of 8 · 5 to 11 Oct');
  assert.deepEqual(card.chips.map((chip) => chip.title), ['Running', 'Signed up', 'Captain · GNLB']);
  assert.deepEqual(card.primary, { title: 'Your series', to: '/player/thanks%2311187', variant: 'elevated' });
  assert.deepEqual(card.links.map((link) => link.title), ['GNLB', 'Season report', 'Upcoming series', 'Ladder', 'Players', 'My fantasy team', 'Availability']);
});

test('a season the player is not in asks to join and shows the two open reads', () => {
  const card = homeCards({ events, me, seasons, now })[2];
  assert.equal(card.status, '2 Nov 2026');
  assert.deepEqual(card.chips.map((chip) => chip.title), ['Seeded']);
  assert.deepEqual(card.primary, { title: 'Ask to join', to: '/signup?season=gnl-review-season-2', variant: 'outlined' });
  assert.deepEqual(card.links.map((link) => link.title), ['Season report', 'Players']);
});

test('a season with signups open links to the GNL signup form, and the popup takes that row', () => {
  const open = [row({ kind: 'gnl', id: 5, name: 'GNL Review Season 2', start: '2026-11-02', end: null, phase: 'signups_open', action: 'sign_up' })];
  const cards = homeCards({ events: open, me, seasons, now });
  assert.deepEqual(cards[0].primary, { title: 'Sign up', to: '/signup?season=gnl-review-season-2', variant: 'elevated' });
  assert.deepEqual(joinableEvents(cards).map((card) => card.key), ['event:5']);
});

test('a cup with signups open offers the signup dialog, and the popup takes that row', () => {
  const cards = homeCards({ events, me, seasons, now });
  assert.equal(cards[1].status, '12 Oct 2026 – 13 Oct 2026');
  assert.deepEqual(cards[1].chips.map((chip) => chip.title), ['Signups open']);
  assert.deepEqual(cards[1].primary, { title: 'Sign up', icon: 'mdi-account-plus', color: 'primary', variant: 'elevated', act: 'sign_up' });
  assert.deepEqual(cards[1].links.map((link) => link.to), ['/events/9']);
  assert.deepEqual(joinableEvents(cards).map((card) => card.key), ['event:9']);
});

test('an entrant who is in reads the withdraw, and the popup leaves him alone', () => {
  const cards = homeCards({ events: [row({ joined: true, entrant_id: 22, action: 'withdraw' })], me, seasons, now });
  assert.deepEqual(cards[0].chips.map((chip) => chip.title), ['Signups open', 'Signed up']);
  assert.deepEqual(cards[0].primary, { title: 'Withdraw', icon: 'mdi-account-remove', color: 'error', variant: 'outlined', act: 'withdraw' });
  assert.deepEqual(joinableEvents(cards), []);
});

test('an open check-in names the round it takes, and the button checks in', () => {
  const open = row({ phase: 'checkin', signups_open: false, joined: true, entrant_id: 22, action: 'check_in',
    checkin_shape: 'round', checkin_open: true, next_round: { id: 3, number: 2, name: null, start_date: '2026-10-12', end_date: '2026-10-13', best_of: null } });
  const [card] = homeCards({ events: [open], me, seasons, now });
  assert.equal(card.status, 'Check-in is open for round 2');
  assert.deepEqual(card.primary, { title: 'Check in', icon: 'mdi-check', color: 'success', variant: 'elevated', act: 'check_in' });
});

test('an event that checks in to itself says so without a round number', () => {
  const open = row({ phase: 'checkin', signups_open: false, joined: true, entrant_id: 22, action: 'check_in', checkin_shape: 'event', checkin_open: true });
  assert.equal(homeCards({ events: [open], me, seasons, now })[0].status, 'Check-in is open');
});

test('a caller who checked in reads a chip and no button', () => {
  const done = row({ phase: 'checkin', signups_open: false, joined: true, entrant_id: 22, action: 'checked_in',
    checked_in_at: '2026-10-11T09:00:00Z', checkin_shape: 'event', checkin_open: true });
  const [card] = homeCards({ events: [done], me, seasons, now });
  assert.deepEqual(card.chips.map((chip) => chip.title), ['Check-in', 'Checked in']);
  assert.equal(card.primary, null);
});

test('a running cup opens its own page, and a closed one offers nothing', () => {
  const running = row({ phase: 'running', signups_open: false, action: 'view' });
  assert.deepEqual(homeCards({ events: [running], me, seasons, now })[0].primary,
    { title: 'View the stage', icon: 'mdi-tournament', color: 'primary', variant: 'outlined', to: '/events/9' });
  const shut = row({ phase: 'seeded', signups_open: false, action: 'closed' });
  assert.equal(homeCards({ events: [shut], me, seasons, now })[0].primary, null);
});

test('a KOTH night still to come takes its date place; a past or inactive one is gone', () => {
  const cards = homeCards({ events, me, seasons, kothEvents, now });
  assert.deepEqual(cards.map((card) => card.key), ['event:4', 'koth:4', 'event:9', 'event:5']);
  const koth = cards[1];
  assert.match(koth.status, /^King of the Hill · /);
  assert.deepEqual(koth.primary, { title: 'Sign up', to: '/koth/dashboard', variant: 'elevated' });
  assert.deepEqual(koth.links, []);
  assert.deepEqual(joinableEvents(cards).map((card) => card.key), ['event:9']);  // a KOTH row carries no own signup answer
});

test("a KOTH night keeps its card through the player's own day, not the UTC day", () => {
  const early = new Date('2026-09-10T19:00:00Z');  // 05:00 on 11 Sep in Sydney
  const nights = [
    { id: 1, name: 'Last night', event_date: '2026-09-10T09:00:00Z', is_active: true },  // 19:00 on 10 Sep
    { id: 2, name: 'Tonight so far', event_date: '2026-09-10T15:00:00Z', is_active: true },  // 01:00 on 11 Sep
  ];
  assert.deepEqual(homeCards({ kothEvents: nights, now: early }).map((card) => card.key), ['koth:2']);
});

// localStorage over a Map, so the test never needs a browser
const mapStore = () => {
  const rows = new Map();
  return { getItem: (key) => rows.get(key) ?? null, setItem: (key, value) => rows.set(key, value) };
};

test('a dismissed night is written once and read back, and a broken store answers no', () => {
  const store = mapStore();
  assert.equal(kothDismissed(4, store), false);
  dismissKoth(4, store);
  assert.equal(kothDismissed(4, store), true);
  assert.equal(kothDismissed(7, store), false);
  assert.equal(kothDismissed(4, null), false);  // storage blocked
  assert.doesNotThrow(() => dismissKoth(4, null));
});

test('a dismissed night drops out of kothCards and out of homeCards', () => {
  const store = mapStore();
  assert.deepEqual(kothCards({ kothEvents, now, store }).map((card) => card.key), ['koth:4']);
  dismissKoth(4, store);
  assert.deepEqual(kothCards({ kothEvents, now, store }), []);
  globalThis.localStorage = store;
  try {
    assert.deepEqual(homeCards({ events, me, seasons, kothEvents, now }).map((card) => card.key), ['event:4', 'event:9', 'event:5']);
  } finally {
    delete globalThis.localStorage;
  }
});

test('an account with no events gets no cards', () => {
  assert.deepEqual(homeCards({ events: [], me, seasons, now }), []);
  assert.deepEqual(homeCards({ me: null, seasons, now }), []);
});

test('an admin without a player row gets cards without the sign-up ask', () => {
  const admin = { user: null, superadmin: true, seasons: [] };
  const open = [row({ kind: 'gnl', id: 5, name: 'GNL Review Season 2', start: '2026-11-02', end: null, phase: 'signups_open', action: 'sign_up' })];
  const cards = homeCards({ events: open, me: admin, seasons, now });
  assert.deepEqual(cards[0].chips.map((chip) => chip.title), ['Signups open']);
  assert.ok(!cards[0].primary);
  assert.deepEqual(cards[0].links.map((link) => link.title), ['Season report', 'Players']);
  assert.deepEqual(joinableEvents(cards), []);  // the popup button reads primary, so such a row stays out
});

test('every action word the member read answers picks one button, or none', () => {
  assert.equal(eventActionButton('sign_up').text, 'Sign up');
  assert.equal(eventActionButton('withdraw').text, 'Withdraw');
  assert.equal(eventActionButton('check_in').text, 'Check in');
  assert.equal(eventActionButton('view').text, 'View the stage');
  // a checked-in caller reads a chip and a closed event offers nothing
  assert.equal(eventActionButton('checked_in'), null);
  assert.equal(eventActionButton('closed'), null);
  assert.equal(eventActionButton(undefined), null);
});

test('the check-in shape picks the call: the entrant row, or the next round availability', () => {
  const perEvent = row({ joined: true, entrant_id: 22, action: 'check_in', checkin_shape: 'event', checkin_open: true });
  assert.deepEqual(checkInFor(perEvent), { shape: 'event', event_id: 9, entrant_id: 22 });
  const perRound = row({ joined: true, entrant_id: 22, action: 'check_in', checkin_shape: 'round', checkin_open: true,
    next_round: { id: 3, number: 2, name: null, start_date: '2026-10-12', end_date: '2026-10-13' } });
  assert.deepEqual(checkInFor(perRound), { shape: 'round', answer: { season_id: 9, playday: 2, available: true } });
  // a row with no shape yet reads as the event shape, which is what the API answered before
  assert.deepEqual(checkInFor(row({ entrant_id: 22 })), { shape: 'event', event_id: 9, entrant_id: 22 });
  assert.deepEqual(checkInFor(undefined), { shape: 'event', event_id: undefined, entrant_id: undefined });
});

test('a season past its end date keeps its card while the member is still in it', () => {
  const over = row({ kind: 'gnl', id: 4, name: 'GNL Review Season', start: '2026-09-01', end: '2026-10-01',
    phase: 'finished', signups_open: false, joined: true, action: 'view' });
  const gone = row({ id: 3, name: 'Spring Cup', start: '2026-03-02', end: '2026-03-03', phase: 'finished', action: 'view' });
  // /me lists season 4 and not cup 3, so only the season the member still plays stays
  assert.deepEqual(homeCards({ events: [over, gone], me, seasons, now }).map((card) => card.key), ['event:4']);
  assert.deepEqual(homeCards({ events: [over, gone], me: null, seasons, now }), []);
});

test('the spoiler switch is off until the viewer turns it on, and forgets on the way back', () => {
  const store = new Map();
  const fake = {
    getItem: (key) => store.get(key) ?? null,
    setItem: (key, value) => store.set(key, value),
    removeItem: (key) => store.delete(key),
  };
  assert.equal(hideResultsStored(fake), false);
  storeHideResults(true, fake);
  assert.equal(hideResultsStored(fake), true);
  storeHideResults(false, fake);
  assert.equal(hideResultsStored(fake), false);
  assert.equal(store.size, 0);
});

test('a browser with storage blocked shows the results and swallows the write', () => {
  const blocked = {
    getItem: () => { throw new Error('blocked'); },
    setItem: () => { throw new Error('blocked'); },
    removeItem: () => { throw new Error('blocked'); },
  };
  assert.equal(hideResultsStored(blocked), false);
  assert.doesNotThrow(() => storeHideResults(true, blocked));
});
