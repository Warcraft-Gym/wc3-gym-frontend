import { test } from 'node:test';
import assert from 'node:assert/strict';
import { PHASE_LABEL } from './season-phase.mjs';

test('every phase has a label', () => {
  assert.deepEqual(Object.keys(PHASE_LABEL), ['open', 'commenced', 'overdue', 'complete']);
});
