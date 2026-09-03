import { test } from 'node:test';
import assert from 'node:assert/strict';
import { PHASE_LABEL, startOverdue } from './season-phase.mjs';

test('an open season past its start date is overdue', () => {
  const season = { phase: 'open', start_date: '2026-07-06' };
  assert.equal(startOverdue(season, '2026-07-06'), false);
  assert.equal(startOverdue(season, '2026-07-07'), true);
  assert.equal(startOverdue({ ...season, phase: 'commenced' }, '2026-07-07'), false);
  assert.equal(startOverdue({ phase: 'open' }, '2026-07-07'), false);
  assert.equal(startOverdue(null, '2026-07-07'), false);
});

test('every phase has a label', () => {
  assert.deepEqual(Object.keys(PHASE_LABEL), ['open', 'commenced', 'complete']);
});
