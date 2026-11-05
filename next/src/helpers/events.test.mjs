import { test } from 'node:test';
import assert from 'node:assert/strict';
import { actOnEvent, blocksHint, cardButton, checkInFor, eventActionButton, leaveWord, hideResultsStored, seasonAction, storeHideResults } from './events.mjs';

// one row of GET /me/events; the caller's own state rides on it
const row = (over) => ({
  kind: 'cup', id: 9, name: 'Autumn Cup', league_short_name: 'GYM', start: '2026-10-12', end: '2026-10-13',
  phase: 'signups_open', signups_open: true, joined: false, entrant_id: null, checked_in_at: null,
  checkin_shape: null, checkin_open: false, next_round: null, action: 'sign_up', ...over,
});

test('the phase and signups_open decide the action', () => {
  assert.equal(seasonAction({ phase: 'open' }), 'signup');
  assert.equal(seasonAction({ phase: 'open', signups_open: true }), 'signup');
  assert.equal(seasonAction({ phase: 'open', signups_open: false }), 'request');
  assert.equal(seasonAction({ phase: 'commenced' }), 'request');
  assert.equal(seasonAction({ phase: 'overdue' }), 'request');
  assert.equal(seasonAction({ phase: 'complete' }), null);
  assert.equal(seasonAction(null), null);
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

test('an Events card names where the caller stands from their own row', () => {
  assert.deepEqual(cardButton(row()), { text: 'Sign up', outline: false });
  assert.deepEqual(cardButton(row({ joined: true, action: 'withdraw' })), { text: 'Signed up', outline: true });
  assert.deepEqual(cardButton(row({ joined: true, action: 'view', phase: 'running' })), { text: 'Signed up', outline: true });
  assert.deepEqual(cardButton(row({ joined: true, action: 'check_in' })), { text: 'Check in', outline: false });
  assert.deepEqual(cardButton(row({ joined: true, action: 'checked_in' })), { text: 'Checked in', outline: true });
  assert.deepEqual(cardButton(row({ joined: true, action: 'waitlisted' })), { text: 'On the waitlist', outline: true });
  // an event closed to the caller, or running without them, reads View
  assert.deepEqual(cardButton(row({ action: 'closed', phase: 'checkin' }), 'checkin'), { text: 'View', outline: true });
  assert.deepEqual(cardButton(row({ action: 'view', phase: 'running' }), 'running'), { text: 'View', outline: true });
  // a guest reads the phase: Sign up while sign-ups stand open, else View, since only an entrant checks in
  assert.deepEqual(cardButton(undefined, 'signups_open'), { text: 'Sign up', outline: false });
  assert.deepEqual(cardButton(undefined, 'checkin'), { text: 'View', outline: true });
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

test('a cup player leaves beside check-in, and off the waitlist while waiting', () => {
  const cup = { kind: 'cup' };
  assert.equal(leaveWord({ action: 'check_in' }, cup), 'withdraw');
  assert.equal(leaveWord({ action: 'checked_in' }, cup), 'withdraw');
  assert.equal(leaveWord({ action: 'check_in', waitlisted: true }, cup), 'waitlisted');
  assert.equal(leaveWord({ action: 'checked_in', waitlisted: true }, cup), 'waitlisted');
});

test('the second button stays off where the one action already leaves or nothing may', () => {
  const cup = { kind: 'cup' };
  for (const action of ['withdraw', 'waitlisted', 'sign_up', 'view', 'closed']) assert.equal(leaveWord({ action }, cup), null, action);
  assert.equal(leaveWord(null, cup), null);
  // a team leaves on its own panel, and no other kind of event changes
  assert.equal(leaveWord({ action: 'check_in' }, { kind: 'cup', team_size: 2 }), null);
  for (const kind of ['gnl', 'koth', 'signup']) assert.equal(leaveWord({ action: 'check_in' }, { kind }), null, kind);
});
