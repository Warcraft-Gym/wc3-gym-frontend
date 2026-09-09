import test from 'node:test';
import assert from 'node:assert/strict';
import { defaultSignupRace, openPlayer, panelPlayerKey, playerPath } from './players.mjs';

// The panel and the page must address the same player, and a row without a
// battle tag (a ladder opponent, a leaderboard row) still has to open.
test('the panel opens on the battle tag, like the page address does', () => {
  openPlayer({ id: 152, battleTag: 'Itsjustagame#11493' });
  assert.equal(panelPlayerKey.value, 'Itsjustagame#11493');
  assert.equal(playerPath({ id: 152, battleTag: 'Itsjustagame#11493' }), '/player/Itsjustagame%2311493');
});

test('a row with no battle tag opens on the id', () => {
  openPlayer({ id: 152 });
  assert.equal(panelPlayerKey.value, '152');
  assert.equal(playerPath({ id: 152 }), '/player/152');
});

test('null closes the panel', () => {
  openPlayer({ id: 152 });
  panelPlayerKey.value = null;
  assert.equal(panelPlayerKey.value, null);
});

// A signup needs the race of THIS season, and the profile race cannot carry
// that for a player who plays two. The last signup is his own answer; the
// ladder speaks for a player who has never signed up here.
test('the signup race comes from the last season he registered on', () => {
  const player = {
    signup_seasons: [{ id: 4, signup_race: 'UD' }, { id: 6, signup_race: 'NE' }],
    w3c_stats: [{ race: 'HU' }],
  };
  assert.equal(defaultSignupRace(player, () => 500), 'NE');
});

test('a player with no signup falls back to his most played ladder race', () => {
  const player = { w3c_stats: [{ race: 'HU' }, { race: 'OC' }] };
  const games = { HU: 12, OC: 80 };
  assert.equal(defaultSignupRace(player, race => games[race]), 'OC');
});

test('a signup with no race and a ladder with no games prefill nothing', () => {
  assert.equal(defaultSignupRace({ signup_seasons: [{ id: 6 }], w3c_stats: [{ race: 'HU' }] }, () => 0), null);
  assert.equal(defaultSignupRace(null, () => 99), null);
});
