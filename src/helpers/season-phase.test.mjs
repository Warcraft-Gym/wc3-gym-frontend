import { test } from 'node:test';
import assert from 'node:assert/strict';
import { seasonPhase } from './season-phase.mjs';

const season = { start_date: '2026-07-06', end_date: '2026-08-09' };

test('the phase follows the season dates', () => {
  assert.equal(seasonPhase(season, '2026-07-05'), 'upcoming');
  assert.equal(seasonPhase(season, '2026-07-06'), 'running');
  assert.equal(seasonPhase(season, '2026-08-09'), 'running');
  assert.equal(seasonPhase(season, '2026-08-10'), 'ended');
  assert.equal(seasonPhase({ start_date: '2026-07-06' }, '2027-01-01'), 'running');
  assert.equal(seasonPhase(null, '2026-07-06'), 'upcoming');
});

test('the season ends with its last scheduled series', async () => {
  const { seasonEnded } = await import('./season-phase.mjs');
  const now = Date.parse('2026-09-03T12:00:00Z');
  assert.equal(seasonEnded([], now), false);
  assert.equal(seasonEnded([{ date_time: '2026-08-01T17:00:00Z' }], now), true);
  assert.equal(seasonEnded([{ date_time: '2026-08-01T17:00:00Z' }, { date_time: '2026-09-10T17:00:00Z' }], now), false);
  assert.equal(seasonEnded([{ date_time: '2026-08-01T17:00:00Z' }, { date_time: null }], now), false);
  assert.equal(seasonEnded([{ date_time: null, player1_score: 2, player2_score: 0 }], now), true);
});
