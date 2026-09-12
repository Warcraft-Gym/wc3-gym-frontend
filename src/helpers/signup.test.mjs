import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { withExtras } from './countries.mjs';
import { seasonAction } from './events.mjs';
import { COUNTRY_ZONE, signupState, signupTitles, startZone } from './signup.mjs';

const base = createRequire(import.meta.url)('country-code-info/data/countries.json');

test('the browser zone wins over the country and shows no warning', () => {
  assert.deepEqual(startZone('Europe/Paris', 'US'), { zone: 'Europe/Paris', fallback: null });
});

test('with no browser zone the country gives its main zone and a warning', () => {
  assert.deepEqual(startZone(undefined, 'DE'), { zone: 'Europe/Berlin', fallback: 'country' });
  assert.deepEqual(startZone('', 'gb-sct'), { zone: 'Europe/London', fallback: 'country' });
});

test('a multi-zone country takes its most populous zone', () => {
  assert.equal(startZone(undefined, 'US').zone, 'America/New_York');
  assert.equal(startZone(undefined, 'AU').zone, 'Australia/Sydney');
  assert.equal(startZone(undefined, 'CA').zone, 'America/Toronto');
  assert.equal(startZone(undefined, 'BR').zone, 'America/Sao_Paulo');
  assert.equal(startZone(undefined, 'RU').zone, 'Europe/Moscow');
});

test('with neither a browser zone nor a known country the zone is UTC, with a warning', () => {
  assert.deepEqual(startZone(undefined, ''), { zone: 'UTC', fallback: 'utc' });
  assert.deepEqual(startZone(null, 'ZZ'), { zone: 'UTC', fallback: 'utc' });
});

test('every country the flag picker offers has a zone the browser accepts', () => {
  const codes = withExtras(base).map((c) => c.a2);
  assert.deepEqual(codes.filter((code) => !COUNTRY_ZONE[code]), []);
  for (const code of codes) assert.doesNotThrow(() => new Intl.DateTimeFormat('en', { timeZone: COUNTRY_ZONE[code] }), code);
});

test('the season phase and its signups_open switch pick the state', () => {
  assert.equal(signupState({ phase: 'open' }, false, true), 'signup'); // signups_open absent reads as true
  assert.equal(signupState({ phase: 'open', signups_open: true }, false, true), 'signup');
  assert.equal(signupState({ phase: 'open', signups_open: false }, false, true), 'request');
  assert.equal(signupState({ phase: 'commenced', signups_open: true }, false, true), 'request');
  assert.equal(signupState({ phase: 'overdue' }, false, true), 'request');
  assert.equal(signupState({ phase: 'complete', signups_open: true }, false, true), 'over');
});

test('a member with no users row can save a profile when no season takes a signup', () => {
  assert.equal(signupState({ phase: 'complete' }, false, false), 'profile');
  assert.equal(signupState(null, false, false), 'profile');
  assert.equal(signupState(null, false, true), 'profile');
});

test('a signed-up player sees the entry until the season is over', () => {
  assert.equal(signupState({ phase: 'open' }, true, true), 'joined');
  assert.equal(signupState({ phase: 'commenced' }, true, true), 'joined');
  assert.equal(signupState({ phase: 'complete' }, true, true), 'over');
});

test('/signup offers the same action as the home page for every season', () => {
  const seasons = [{ phase: 'open' }, { phase: 'open', signups_open: false }, { phase: 'open', signups_open: true },
    { phase: 'commenced', signups_open: false }, { phase: 'overdue' }, { phase: 'complete' }];
  for (const season of seasons) {
    const state = signupState(season, false, true);
    assert.equal(seasonAction(season), ['signup', 'request'].includes(state) ? state : null, JSON.stringify(season));
  }
});

test('only a state that still takes a signup names the season', () => {
  assert.equal(signupTitles('signup', 'GNL S18').card, 'Signup for Season: GNL S18');
  assert.equal(signupTitles('request', 'GNL S18').card, 'Signup for Season: GNL S18');
  assert.equal(signupTitles('joined', 'GNL S18').card, 'Signup for Season: GNL S18');
  // the over state says the season is over right below the title, so the title must not offer a signup
  assert.equal(signupTitles('over', 'GNL S18').card, 'Player Registration');
  assert.equal(signupTitles('profile', 'GNL S18').card, 'Player Registration');
  assert.equal(signupTitles('signup', '').card, 'Player Registration');
});

test('the heading follows the state: a profile-only form is not a signup', () => {
  assert.equal(signupTitles('profile', '').heading, 'Player Profile');
  for (const state of ['signup', 'request', 'joined', 'over']) {
    assert.equal(signupTitles(state, 'GNL S18').heading, 'Player Signup', state);
  }
});
