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
