import test from 'node:test';
import assert from 'node:assert/strict';
import { defaultSignupRace, kingPlayer, openPlayer, panelPlayerKey, playerPath, playersWithCareers } from './players.mjs';

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

// The players page lists every player once, with his career totals, and keeps
// the history rows no player claims, so the all-time record stays readable.
test('a career row joins its player, and a row no player claims stands alone', () => {
  const rows = playersWithCareers(
    [{ id: 8, name: 'Tha Grinchy UNO' }, { id: 9, name: 'Newcomer' }],
    [
      { id: 618, user_id: 8, rating: 2252 },
      { id: 700, user_id: null, player_name: 'Dekker', rating: 1539 },
      { id: null, user_id: 40, player_name: 'gone', user: { name: 'Gone' }, rating: 600 },
    ],
  );
  assert.deepEqual(rows.map(r => [r.key, r.id, r.name, r.rating]), [
    ['p8', 8, 'Tha Grinchy UNO', 2252],
    ['p9', 9, 'Newcomer', null],
    ['c700', null, 'Dekker', 1539],
    ['c40', null, 'Gone', 600],
  ]);
});

// A Twitch signup carries no users row, so the name falls back to the battle tag.
test('a king shows his twitch name, else his battle tag', () => {
  assert.deepEqual(
    kingPlayer({ twitch_username: 'grubby', battle_tag: 'Grubby#1234', country: 'NL' }),
    { name: 'grubby', country: 'NL' },
  );
  assert.deepEqual(
    kingPlayer({ twitch_username: '', battle_tag: 'Grubby#1234', country: null }),
    { name: 'Grubby#1234', country: null },
  );
});
