import test from 'node:test';
import assert from 'node:assert/strict';
import { defaultSignupRace, kingPlayer, matchesPlayerSearch, myProfilePath, playersWithCareers, runEach, signupGroups, toggleIds } from './players.mjs';

// A signup needs the race of THIS season, and the profile race cannot carry
// that for a player who plays two. The last signup is his own answer; the
// ladder speaks for a player who has never signed up here.
test('the signup race comes from the last season he registered on', () => {
  const player = {
    signup_seasons: [{ id: 4, signup_race: 'UD' }, { id: 6, signup_race: 'NE' }],
    main_race: 'HU',
  };
  assert.equal(defaultSignupRace(player), 'NE');
});

test('a player with no signup falls back to his main ladder race', () => {
  assert.equal(defaultSignupRace({ main_race: 'OC', race_mmrs: [{ race: 'HU' }, { race: 'OC' }] }), 'OC');
});

test('a signup with no race and no main race prefill nothing', () => {
  assert.equal(defaultSignupRace({ signup_seasons: [{ id: 6 }], main_race: null, race_mmrs: [{ race: 'HU' }] }), null);
  assert.equal(defaultSignupRace(null), null);
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

test('the account menu points at the own player page, or the signup page', () => {
  assert.equal(myProfilePath({ user: { id: 7, battleTag: 'thanks#11187' } }), '/player/thanks%2311187');
  assert.equal(myProfilePath({ user: { id: 7 } }), '/player/7');
  assert.equal(myProfilePath({ role: 'member' }), '/profile');
  assert.equal(myProfilePath(null), '/profile');
});

// A person is found by any tag he holds, not only the active one
test('the player search matches a tag the person holds besides the active one', () => {
  const player = { name: 'FattsRussell', battleTag: 'BeLit#11855', tags: [{ tag: 'BeLit#11855' }, { tag: 'MangoIsNice#1230' }] };
  assert.equal(matchesPlayerSearch(player, 'mango'), true);
  assert.equal(matchesPlayerSearch(player, 'nobody'), false);
});

// The Discord handle is served only on the player read, so the search never matches it
test('the player search ignores a Discord handle', () => {
  const player = { name: 'FattsRussell', battleTag: 'BeLit#11855', discordTag: 'fatts' };
  assert.equal(matchesPlayerSearch(player, 'fatts'), true);
  assert.equal(matchesPlayerSearch({ ...player, name: 'Other' }, 'fatts'), false);
});

// The row and the header checkboxes of the players page tick and untick ids
// without touching the set the page holds.
test('ticking and unticking ids answers a new set', () => {
  const selected = new Set([1, 2]);
  assert.deepEqual([...toggleIds(selected, [3, 4], true)], [1, 2, 3, 4]);
  assert.deepEqual([...toggleIds(selected, [2, 5], false)], [1]);
  assert.deepEqual([...selected], [1, 2]);
});

// The signup call takes one race for all its players, so a bulk signup sends
// one call per race and leaves out who is already in the season.
test('a bulk signup groups the players by race and skips the signed up', () => {
  const players = [
    { id: 1, signup_seasons: [] },
    { id: 2, signup_seasons: [{ id: 7 }] },
    { id: 3 },
    { id: 4, signup_seasons: [{ id: 6 }] },
  ];
  const { groups, skipped, missingRace } = signupGroups(players, { 1: 'HU', 2: 'OC', 3: 'OC', 4: 'HU' }, 7);
  assert.deepEqual(groups, [{ race: 'HU', ids: [1, 4] }, { race: 'OC', ids: [3] }]);
  assert.deepEqual(skipped.map((player) => player.id), [2]);
  assert.deepEqual(missingRace, []);
});

test('a player with no race holds the bulk signup back', () => {
  const { groups, missingRace } = signupGroups([{ id: 1 }, { id: 2 }], { 1: 'NE' }, 7);
  assert.deepEqual(groups, [{ race: 'NE', ids: [1] }]);
  assert.deepEqual(missingRace.map((player) => player.id), [2]);
});

// A failed sync or delete must not stop the rest, and the page keeps the
// failed players ticked for a retry.
test('a bulk run goes one item after another and collects the failures', async () => {
  const order = [];
  const steps = [];
  const { done, failed } = await runEach([1, 2, 3], async (id) => {
    order.push(id);
    if (id === 2) throw new Error('down');
    return id * 10;
  }, (index) => steps.push(index));
  assert.deepEqual(order, [1, 2, 3]);
  assert.deepEqual(steps, [0, 1, 2]);
  assert.deepEqual(done, [{ item: 1, result: 10 }, { item: 3, result: 30 }]);
  assert.equal(failed.length, 1);
  assert.equal(failed[0].item, 2);
  assert.equal(failed[0].error.message, 'down');
});
