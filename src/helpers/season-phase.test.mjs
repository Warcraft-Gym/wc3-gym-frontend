import { test } from 'node:test';
import assert from 'node:assert/strict';
import { asSeason, PHASE_LABEL, isUnscored, seasonPhase } from './season-phase.mjs';

test('every phase has a label', () => {
  assert.deepEqual(Object.keys(PHASE_LABEL), ['open', 'commenced', 'overdue', 'complete']);
});

test('the common event phases read in the season lifecycle', () => {
  assert.equal(seasonPhase({ phase: 'draft' }), 'open');
  assert.equal(seasonPhase({ phase: 'signups_open' }), 'open');
  assert.equal(seasonPhase({ phase: 'checkin' }), 'open');
  assert.equal(seasonPhase({ phase: 'seeded' }), 'open');
  assert.equal(seasonPhase({ phase: 'running' }), 'commenced');
  assert.equal(seasonPhase({ phase: 'finished', unscored_series: 2 }), 'overdue');
  assert.equal(seasonPhase({ phase: 'finished', unscored_series: 0 }), 'complete');
});

test('a season-shaped copy keeps its fields and translates only the phase', () => {
  assert.deepEqual(
    asSeason({ id: 18, name: 'Season 18', phase: 'running', rounds: [{ playday: 1 }] }),
    { id: 18, name: 'Season 18', phase: 'commenced', rounds: [{ playday: 1 }] },
  );
  assert.equal(seasonPhase({ phase: 'overdue', unscored_series: 1 }), 'overdue');
});

test('a series is unscored until both sides carry a score', () => {
  assert.equal(isUnscored({ player1_score: null, player2_score: null }), true);
  assert.equal(isUnscored({ player1_score: 2, player2_score: null }), true);
  assert.equal(isUnscored({ player1_score: 0, player2_score: 2 }), false);
  assert.equal(isUnscored({ player1_score: 0, player2_score: 0 }), false);
});
