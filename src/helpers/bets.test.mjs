import assert from 'node:assert/strict';
import test from 'node:test';

import { sides } from './bets.mjs';

test('each side faces the race the other player signed up on', () => {
  const series = {
    player1: { id: 1, signup_race: 'HU' },
    player2: { id: 2, signup_race: 'OC' },
  };
  assert.deepEqual(sides(series), [
    { player: series.player1, vsRace: 'OC' },
    { player: series.player2, vsRace: 'HU' },
  ]);
});

test('a missing player leaves the other side without an opponent race', () => {
  assert.deepEqual(sides({ player1: { id: 1, signup_race: 'NE' } }), [
    { player: { id: 1, signup_race: 'NE' }, vsRace: undefined },
    { player: undefined, vsRace: 'NE' },
  ]);
});
