import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { withExtras } from './countries.mjs';
import { COUNTRY_ZONE, signupState, startZone } from './signup.mjs';

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
  assert.equal(signupState({ phase: 'open' }, false), 'signup'); // signups_open absent reads as true
  assert.equal(signupState({ phase: 'open', signups_open: true }, false), 'signup');
  assert.equal(signupState({ phase: 'open', signups_open: false }, false), 'request');
  assert.equal(signupState({ phase: 'commenced', signups_open: true }, false), 'request');
  assert.equal(signupState({ phase: 'overdue' }, false), 'request');
  assert.equal(signupState({ phase: 'complete', signups_open: true }, false), 'over');
  assert.equal(signupState(null, false), 'signup');
});

test('a signed-up player sees the entry until the season is over', () => {
  assert.equal(signupState({ phase: 'open' }, true), 'joined');
  assert.equal(signupState({ phase: 'commenced' }, true), 'joined');
  assert.equal(signupState({ phase: 'complete' }, true), 'over');
});
