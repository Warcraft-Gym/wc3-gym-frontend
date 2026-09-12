import assert from 'node:assert/strict';
import test from 'node:test';

import { DateTime } from 'luxon';

import { betsOpen, sides } from './bets.mjs';

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

test('bets close on the series start time, not on its score', () => {
  const now = DateTime.fromISO('2026-09-12T18:00:00Z', { zone: 'UTC' });
  // started an hour ago and nobody has reported a score yet
  assert.equal(betsOpen({ date_time: '2026-09-12T17:00:00', player1_score: 0, player2_score: 0 }, now), false);
  assert.equal(betsOpen({ date_time: '2026-09-12T19:00:00' }, now), true);
});

test('a series with no time keeps its bets open', () => {
  assert.equal(betsOpen({}), true);
});
