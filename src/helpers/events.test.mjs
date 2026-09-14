import { test } from 'node:test';
import assert from 'node:assert/strict';
import process from 'node:process';
import { dismissKoth, eventActionButton, hideResultsStored, homeCards, joinableEvents, kothCards, kothDismissed, seasonAction, storeHideResults } from './events.mjs';

process.env.TZ = 'Australia/Sydney';  // UTC+10, so the player's day and the UTC day differ

const now = new Date('2026-10-05T12:00:00Z');
// the /seasons list: the rounds and the round count live here, not on /me
const seasons = [
  { id: 3, name: 'GNL S17', phase: 'complete', start_date: '2026-03-02' },
  { id: 4, name: 'GNL Review Season', phase: 'commenced', start_date: '2026-09-01', scheduling_enabled: true, round_count: 8, rounds: [
    { playday: 4, start_date: '2026-09-28', end_date: '2026-10-04' },
    { playday: 5, start_date: '2026-10-05', end_date: '2026-10-11' },
  ] },
  { id: 5, name: 'GNL Review Season 2', phase: 'open', start_date: '2026-11-02', signups_open: false, rounds: [] },
];
// /me: what the account is to each season that is not complete
const me = {
  user: { id: 7, battleTag: 'thanks#11187' },
  seats: [{ team_id: 2, season_id: 4 }],
  seasons: [
    { id: 4, name: 'GNL Review Season', phase: 'commenced', scheduling_enabled: true, start_date: '2026-09-01', signed_up: true, captain: true, team: { id: 2, name: 'GNLB' } },
    { id: 5, name: 'GNL Review Season 2', phase: 'open', signups_open: false, start_date: '2026-11-02', signed_up: false, captain: false, team: null },
  ],
};
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

test('one card per season on /me, the complete season left out', () => {
  const cards = homeCards({ me, seasons, now });
  assert.deepEqual(cards.map((card) => card.key), ['season:4', 'season:5']);
  assert.equal(cards[0].slug, 'gnl-review-season');
  assert.equal(cards[0].date.toISOString(), '2026-09-01T00:00:00.000Z');
});

test('the season the captain plays reads the round in play and carries every link', () => {
  const [card] = homeCards({ me, seasons, now });
  assert.equal(card.status, 'Round 5 of 8 · 5 to 11 Oct');
  assert.deepEqual(card.chips.map((chip) => chip.title), ['Signed up', 'Captain · GNLB']);
  assert.deepEqual(card.primary, { title: 'Your series', to: '/player/thanks%2311187', variant: 'elevated' });
  assert.deepEqual(card.links.map((link) => link.title), ['GNLB', 'Season report', 'Upcoming series', 'Ladder', 'Players', 'My fantasy team', 'Availability']);
});

test('a season the player is not in asks to join and shows the two open reads', () => {
  const card = homeCards({ me, seasons, now })[1];
  assert.equal(card.status, 'Signups are closed. An admin may add you.');
  assert.deepEqual(card.chips, []);
  assert.deepEqual(card.primary, { title: 'Ask to join', to: '/signup?season=gnl-review-season-2', variant: 'outlined' });
  assert.deepEqual(card.links.map((link) => link.title), ['Season report', 'Players']);
  assert.deepEqual(joinableEvents(homeCards({ me, seasons, now })), []);
});

test('an open season with signups open offers Sign up, and the popup takes that row', () => {
  const open = { ...me, seasons: [{ ...me.seasons[1], signups_open: true }] };
  const cards = homeCards({ me: open, seasons, now });
  assert.equal(cards[0].status, 'Signups are open');
  assert.deepEqual(cards[0].primary, { title: 'Sign up', to: '/signup?season=gnl-review-season-2', variant: 'elevated' });
  assert.deepEqual(joinableEvents(cards).map((card) => card.key), ['season:5']);
});

test('a KOTH night still to come follows the season cards; a past or inactive one is gone', () => {
  const cards = homeCards({ me, seasons, kothEvents, now });
  assert.deepEqual(cards.map((card) => card.key), ['season:4', 'season:5', 'koth:4']);
  const koth = cards[2];
  assert.match(koth.status, /^King of the Hill · /);
  assert.deepEqual(koth.primary, { title: 'Sign up', to: '/koth/dashboard', variant: 'elevated' });
  assert.deepEqual(koth.links, []);
  assert.deepEqual(joinableEvents(cards), []);  // a KOTH row carries no own signup answer
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
    assert.deepEqual(homeCards({ me, seasons, kothEvents, now }).map((card) => card.key), ['season:4', 'season:5']);
  } finally {
    delete globalThis.localStorage;
  }
});

test('an account with no seasons gets no cards', () => {
  assert.deepEqual(homeCards({ me: { seasons: [] }, seasons, now }), []);
  assert.deepEqual(homeCards({ me: null, seasons, now }), []);
});

test('an admin without a player row gets cards without the sign-up ask', () => {
  const open = { ...me, user: null, superadmin: true, seasons: [{ ...me.seasons[1], signups_open: true }] };
  const cards = homeCards({ me: open, seasons, now });
  assert.equal(cards[0].status, 'Signups are open');
  assert.ok(!cards[0].primary);
  assert.deepEqual(cards[0].links.map((link) => link.title), ['Season report', 'Players']);
  assert.deepEqual(joinableEvents(cards), []);  // the popup button reads primary, so such a row stays out
});

test('a player with no row yet keeps the sign-up ask', () => {
  const fresh = { ...me, user: null, superadmin: false, seasons: [{ ...me.seasons[1], signups_open: true }] };
  const cards = homeCards({ me: fresh, seasons, now });
  assert.deepEqual(cards[0].primary, { title: 'Sign up', to: '/signup?season=gnl-review-season-2', variant: 'elevated' });
  assert.deepEqual(joinableEvents(cards).map((card) => card.key), ['season:5']);
});

test('a signed-up player of an open season reads the start, not the signups sentence', () => {
  const early = { ...me, seasons: [{ ...me.seasons[1], signed_up: true, captain: true, team: { id: 3, name: 'GNLA' } }] };
  const [card] = homeCards({ me: early, seasons, now });
  assert.equal(card.status, 'Starts 2 Nov');
  assert.deepEqual(card.chips.map((chip) => chip.title), ['Signed up', 'Captain · GNLA']);
  assert.deepEqual(card.primary, { title: 'Your series', to: '/player/thanks%2311187', variant: 'elevated' });
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
