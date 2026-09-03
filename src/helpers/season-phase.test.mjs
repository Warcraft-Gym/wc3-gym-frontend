import { test } from 'node:test';
import assert from 'node:assert/strict';
import { PHASE_LABEL, isUnscored } from './season-phase.mjs';

test('every phase has a label', () => {
  assert.deepEqual(Object.keys(PHASE_LABEL), ['open', 'commenced', 'overdue', 'complete']);
});

test('a series is unscored until both sides carry a score', () => {
  assert.equal(isUnscored({ player1_score: null, player2_score: null }), true);
  assert.equal(isUnscored({ player1_score: 2, player2_score: null }), true);
  assert.equal(isUnscored({ player1_score: 0, player2_score: 2 }), false);
  assert.equal(isUnscored({ player1_score: 0, player2_score: 0 }), false);
});
