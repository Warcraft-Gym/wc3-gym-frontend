import assert from 'node:assert/strict';
import test from 'node:test';

import { sides } from './bets.mjs';

test('each side carries the race it played and the race it met', () => {
  const series = {
    player1: { id: 1 },
    player2: { id: 2 },
    player1_race: 'HU',
    player2_race: 'OC',
  };
  assert.deepEqual(sides(series), [
    { player: series.player1, race: 'HU', vsRace: 'OC' },
    { player: series.player2, race: 'OC', vsRace: 'HU' },
  ]);
});

test('a side the season holds no signup for carries no race', () => {
  assert.deepEqual(sides({ player1: { id: 1 }, player1_race: 'NE' }), [
    { player: { id: 1 }, race: 'NE', vsRace: undefined },
    { player: undefined, race: undefined, vsRace: 'NE' },
  ]);
});
