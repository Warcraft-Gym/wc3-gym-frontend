import { test } from 'node:test';
import assert from 'node:assert/strict';
import process from 'node:process';
import { actOnEvent, blocksHint, checkInFor, eventActionButton, hideResultsStored, homeCards, joinableEvents, seasonAction, storeHideResults } from './events.mjs';

process.env.TZ = 'Australia/Sydney';  // UTC+10, so the player's day and the UTC day differ

const now = new Date('2026-10-05T12:00:00Z');
// the GNL /events list: the rounds and the round count live here, not on the member read
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
// the KOTH nights of the same member read: a league of nights runs one after another
const nights = [
  row({ kind: 'koth', id: 14, name: 'KOTH Night 14', league_short_name: 'KOTH', start: '2026-10-09', end: '2026-10-09', action: 'sign_up' }),
  row({ kind: 'koth', id: 12, name: 'KOTH Night 13', league_short_name: 'KOTH', start: '2026-10-02', end: '2026-10-02', phase: 'running', signups_open: false, joined: true, action: 'view' }),
  row({ kind: 'koth', id: 11, name: 'KOTH Night 12', league_short_name: 'KOTH', start: '2026-09-25', end: '2026-09-25', phase: 'finished', signups_open: false, action: 'view' }),
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
  const cards = homeCards({ events: [undated, ...events, ...nights], me, seasons, now });
  assert.deepEqual(cards.map((card) => card.key), ['event:4', 'event:14', 'event:9', 'event:5', 'event:11']);
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

test('one KOTH night stands on the home, the newest one still open, as any other card', () => {
  const cards = homeCards({ events: [...events, ...nights], me, seasons, now });
  // night 13 is still running and night 12 is finished: neither takes a card beside night 14
  assert.deepEqual(cards.map((card) => card.key), ['event:4', 'event:14', 'event:9', 'event:5']);
  const night = cards[1];
  assert.equal(night.name, 'KOTH Night 14');  // the name already opens with the league
  assert.equal(night.status, '9 Oct 2026');
  assert.deepEqual(night.primary, { title: 'Sign up', icon: 'mdi-account-plus', color: 'primary', variant: 'elevated', act: 'sign_up' });
  assert.deepEqual(night.links, [{ title: 'Event page', icon: 'mdi-tournament', to: '/events/14' }]);
  assert.deepEqual(joinableEvents(cards).map((card) => card.key), ['event:14', 'event:9']);
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


test('blocks that cover the next round read as a hint with one answer, and nothing else does', () => {
  assert.deepEqual(blocksHint({ availability_hint: 'blocked_by_blocks' }),
    { title: 'Your blocks cover this round', text: 'Sit out' });
  assert.equal(blocksHint({ availability_hint: 'open' }), null);
  assert.equal(blocksHint({ availability_hint: 'answered_yes' }), null);
  assert.equal(blocksHint({ availability_hint: 'answered_no' }), null);
  assert.equal(blocksHint({ availability_hint: null }), null);
  assert.equal(blocksHint(undefined), null);
});

test('the blocked row carries its hint on the card, and answering the round clears it', () => {
  const blocked = row({ phase: 'checkin', signups_open: false, joined: true, entrant_id: 22, action: 'check_in',
    checkin_shape: 'round', checkin_open: true, availability_hint: 'blocked_by_blocks',
    next_round: { id: 3, number: 2, name: null, start_date: '2026-10-12', end_date: '2026-10-13' } });
  const [card] = homeCards({ events: [blocked], me, seasons, now });
  assert.equal(card.hint.title, 'Your blocks cover this round');
  // the answer the button sends is the check-in call with available turned around
  assert.deepEqual({ ...checkInFor(blocked).answer, available: false },
    { season_id: 9, playday: 2, available: false });
  const answered = homeCards({ events: [{ ...blocked, availability_hint: 'answered_no' }], me, seasons, now });
  assert.equal(answered[0].hint, null);
});

test('the shared act withdraws once the reader says so, checks in, and names a failure', async () => {
  const calls = [];
  const store = {
    withdraw: (id, race = null) => calls.push(['withdraw', id, race]),
    checkInRow: (entry) => calls.push(['check_in', entry.id]),
  };
  const reload = () => calls.push(['reload']);
  const ask = globalThis.confirm;

  globalThis.confirm = () => false;
  assert.equal(await actOnEvent('withdraw', { store, eventId: 7, row: null, reload }), null);
  assert.deepEqual(calls, []);  // the reader said no, so nothing was written

  globalThis.confirm = () => true;
  assert.equal(await actOnEvent('withdraw', { store, eventId: 7, row: null, reload }), null);
  assert.equal(await actOnEvent('check_in', { store, eventId: 7, row: { id: 3 }, reload }), null);
  assert.deepEqual(calls, [['withdraw', 7, null], ['reload'], ['check_in', 3], ['reload']]);

  const asked = [];
  globalThis.confirm = (q) => { asked.push(q); return true; };
  calls.length = 0;
  assert.equal(await actOnEvent('withdraw', { store, eventId: 7, row: null, reload, race: 'HU', raceName: 'Human' }), null);
  assert.deepEqual(calls, [['withdraw', 7, 'HU'], ['reload']]);  // one race gives back that race alone
  assert.deepEqual(asked, ['Withdraw Human?']);

  const broken = { withdraw: () => { throw new Error('the server said no'); } };
  assert.equal(await actOnEvent('withdraw', { store: broken, eventId: 7, row: null, reload }),
    'That did not go through: the server said no');
  globalThis.confirm = ask;
});
