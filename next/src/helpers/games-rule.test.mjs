import test from 'node:test';
import assert from 'node:assert/strict';

import { gamesWarning, getW3CGamesCount, hasLowGamesTwoSeasons, hasW3CStatsTwoSeasons, noStatsWarning } from './games-rule.mjs';

const stat = (race, wc3_season, wins, losses) => ({ race, wc3_season, wins, losses });

test('the games count adds the current and the previous season of one race', () => {
  const player = { w3c_stats: [stat('HU', 25, 4, 3), stat('HU', 24, 2, 1), stat('HU', 23, 40, 40), stat('NE', 25, 9, 9)] };
  assert.equal(getW3CGamesCount(player, 25, 'HU'), 10);
  assert.equal(getW3CGamesCount(player, 25, 'ne'), 18);
  assert.equal(getW3CGamesCount(player, 25, null), 0);
});

test('gamesWarning marks a race W3C holds no stats for in error', () => {
  const player = { w3c_stats: [stat('HU', 25, 30, 10)] };
  assert.deepEqual(gamesWarning(player, 25, 'NE'), { colour: 'error', text: 'No W3C stats found for NE' });
  assert.equal(gamesWarning({ w3c_stats: [] }, 25, 'HU').colour, 'error');
  assert.equal(hasW3CStatsTwoSeasons(player, 25, 'HU'), true);
});

test('the no-stats mark drops the race on a line that names none', () => {
  assert.deepEqual(noStatsWarning('NE'), { colour: 'error', text: 'No W3C stats found for NE' });
  assert.deepEqual(noStatsWarning(), { colour: 'error', text: 'No W3C stats found' });
  assert.deepEqual(noStatsWarning(null), { colour: 'error', text: 'No W3C stats found' });
});

test('gamesWarning marks a player under the rule in warning, with the count', () => {
  const player = { w3c_stats: [stat('HU', 25, 4, 3), stat('HU', 24, 2, 1)] };
  assert.deepEqual(gamesWarning(player, 25, 'HU'), { colour: 'warning', text: 'Less than 20 games (10 games) for HU' });
  assert.equal(hasLowGamesTwoSeasons(player, 25, 'HU'), true);
});

test('gamesWarning takes the threshold the event sets', () => {
  const player = { w3c_stats: [stat('HU', 25, 20, 5)] };
  assert.equal(gamesWarning(player, 25, 'HU'), null);
  assert.equal(gamesWarning(player, 25, 'HU', 40).colour, 'warning');
});

test('gamesWarning stays quiet without a race or a season', () => {
  const player = { w3c_stats: [stat('HU', 25, 1, 1)] };
  assert.equal(gamesWarning(player, 25, null), null);
  assert.equal(gamesWarning(player, null, 'HU'), null);
});
