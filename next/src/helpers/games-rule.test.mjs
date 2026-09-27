import test from 'node:test';
import assert from 'node:assert/strict';

import { gamesWarning, getRaceMmr, getW3CGamesCount, hasLowGamesTwoSeasons, hasW3CStatsTwoSeasons, noStatsWarning } from './games-rule.mjs';

// One race_mmrs entry: window games over the current and the previous season, stale for an older row
const entry = (race, wc3_season, mmr, games, stale = false) => ({ race, wc3_season, mmr, games, wins: null, losses: null, stale });

test('the games count reads the window entry of one race', () => {
  const player = { race_mmrs: [entry('HU', 25, 1600, 10), entry('NE', 24, 1500, 18)] };
  assert.equal(getW3CGamesCount(player, 'HU'), 10);
  assert.equal(getW3CGamesCount(player, 'ne'), 18);
  assert.equal(getW3CGamesCount(player, null), 0);
});

test('gamesWarning marks a race W3C holds no stats for in error', () => {
  const player = { race_mmrs: [entry('HU', 25, 1600, 40)] };
  assert.deepEqual(gamesWarning(player, 'NE'), { colour: 'error', text: 'No W3C stats found for NE' });
  assert.equal(gamesWarning({ race_mmrs: [] }, 'HU').colour, 'error');
  assert.equal(gamesWarning({}, 'HU').colour, 'error');
  assert.equal(hasW3CStatsTwoSeasons(player, 'HU'), true);
  assert.equal(getRaceMmr(player, 'NE'), null);
});

test('a stale entry shows its season but counts as no window stats', () => {
  const player = { race_mmrs: [entry('HU', 25, 1600, 40), entry('UD', 21, 1800, 90, true)] };
  assert.equal(getRaceMmr(player, 'UD').wc3_season, 21);
  assert.equal(hasW3CStatsTwoSeasons(player, 'UD'), false);
  assert.equal(getW3CGamesCount(player, 'UD'), 0);
  assert.deepEqual(gamesWarning(player, 'UD'), { colour: 'error', text: 'No W3C stats found for UD' });
});

test('the no-stats mark drops the race on a line that names none', () => {
  assert.deepEqual(noStatsWarning('NE'), { colour: 'error', text: 'No W3C stats found for NE' });
  assert.deepEqual(noStatsWarning(), { colour: 'error', text: 'No W3C stats found' });
  assert.deepEqual(noStatsWarning(null), { colour: 'error', text: 'No W3C stats found' });
});

test('gamesWarning marks a player under the rule in warning, with the count', () => {
  const player = { race_mmrs: [entry('HU', 25, 1600, 10)] };
  assert.deepEqual(gamesWarning(player, 'HU'), { colour: 'warning', text: 'Less than 20 games (10 games) for HU' });
  assert.equal(hasLowGamesTwoSeasons(player, 'HU'), true);
});

test('gamesWarning takes the threshold the event sets', () => {
  const player = { race_mmrs: [entry('HU', 25, 1600, 25)] };
  assert.equal(gamesWarning(player, 'HU'), null);
  assert.equal(gamesWarning(player, 'HU', 40).colour, 'warning');
});

test('gamesWarning stays quiet without a race', () => {
  const player = { race_mmrs: [entry('HU', 25, 1600, 2)] };
  assert.equal(gamesWarning(player, null), null);
});
