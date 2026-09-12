import test from 'node:test';
import assert from 'node:assert/strict';

import { bracketColumns, callerAction, isHidden, reveal, roundGroups, seriesState } from './events-public.mjs';

test('the caller signs up while signups are open, then withdraws, then checks in', () => {
  assert.equal(callerAction({ phase: 'signups' }, null), 'signup');
  assert.equal(callerAction({ phase: 'signups', signups_open: false }, null), null);
  assert.equal(callerAction({ phase: 'signups' }, { id: 1 }), 'withdraw');
  assert.equal(callerAction({ phase: 'checkin' }, { id: 1 }), 'checkin');
  // an entrant who has checked in still gets out while the window runs
  assert.equal(callerAction({ phase: 'checkin' }, { id: 1, checked_in_at: 'now' }), 'withdraw');
  // a withdrawn entrant may sign up again while signups are open
  assert.equal(callerAction({ phase: 'signups' }, { id: 1, withdrawn_at: 'then' }), 'signup');
  assert.equal(callerAction({ phase: 'running' }, { id: 1 }), null);
});

test('a series is complete with a result, open with two sides, and pending without', () => {
  assert.equal(seriesState({ player1_id: 1, player1_score: 2, player2_score: 1 }), 'complete');
  assert.equal(seriesState({ player1_id: 1, player1_score: null, player2_score: null }), 'open');
  assert.equal(seriesState({}), 'pending');
});

test('a round with every result is complete, one with none is pending', () => {
  const rounds = [{ id: 2, number: 2 }, { id: 1, number: 1, name: 'Opening' }];
  const series = [
    { id: 5, round_id: 1, player1_score: 2, player2_score: 0 },
    { id: 6, round_id: 1, player1_id: 3, player1_score: null, player2_score: null },
  ];
  const groups = roundGroups(rounds, series);
  assert.deepEqual(groups.map((g) => [g.label, g.state, g.rows.length]), [['Opening', 'open', 2], ['Round 2', 'pending', 0]]);
});

test('the bracket holds one box in the last round and twice as many in each round before', () => {
  const rounds = [{ id: 1, number: 1 }, { id: 2, number: 2, name: 'Semifinals' }, { id: 3, number: 3, name: 'Final' }];
  const columns = bracketColumns(rounds, [{ id: 9, round_id: 2, bracket_order: 1, player1_score: 2, player2_score: 0 }]);
  assert.deepEqual(columns.map((c) => c.boxes.length), [4, 2, 1]);
  assert.equal(columns[2].boxes[0].series, null);
  // an empty box names the two boxes that feed it
  assert.deepEqual(columns[2].boxes[0].feeders, ['Winner of Semifinals, series 1', 'Winner of Semifinals, series 2']);
  assert.equal(columns[1].boxes[1].series.id, 9);
});

test('a bracket short of a full round places its series on their own slots', () => {
  // six entrants: round 1 plays slots 0 and 2, the other two slots are byes
  const rounds = [{ id: 1, number: 1 }, { id: 2, number: 2, name: 'Semifinals' }, { id: 3, number: 3, name: 'Final' }];
  const series = [
    { id: 1, round_id: 1, bracket_order: 0, player1_score: 2, player2_score: 0 },
    { id: 2, round_id: 1, bracket_order: 2, player1_score: null, player2_score: null },
  ];
  const columns = bracketColumns(rounds, series);
  assert.deepEqual(columns.map((c) => c.boxes.map((b) => b.series?.id ?? null)), [[1, null, 2, null], [null, null], [null]]);
  assert.deepEqual(columns[0].boxes[1].feeders, ['Bye', 'Bye']);
  assert.deepEqual(columns[1].boxes[0].feeders, ['Winner of Round 1, series 1', 'Bye']);
  assert.deepEqual(columns[1].boxes[1].feeders, ['Winner of Round 1, series 3', 'Bye']);
});

test('a spoiler-free board blinds the side whose feeder result is held back', () => {
  const rounds = [{ id: 1, number: 1 }, { id: 2, number: 2, name: 'Final' }];
  const series = [
    { id: 1, round_id: 1, bracket_order: 0, player1_score: 2, player2_score: 0 },
    { id: 2, round_id: 2, bracket_order: 0, player1_score: null, player2_score: null },
  ];
  const columns = bracketColumns(rounds, series, (row) => row.id === 1);
  assert.deepEqual(columns[1].boxes[0].blind, [true, false]);
  assert.deepEqual(bracketColumns(rounds, series)[1].boxes[0].blind, [false, false]);
});

test('a revealed series stops being hidden, and only for its own event', () => {
  const scored = { id: 7, player1_id: 1, player1_score: 2, player2_score: 1 };
  const state = { hide: true, revealed: {} };
  assert.equal(isHidden(state, 3, scored), true);
  assert.equal(isHidden({ hide: false, revealed: {} }, 3, scored), false);
  // an open series has no result to hide
  assert.equal(isHidden(state, 3, { id: 8, player1_id: 1 }), false);
  const next = reveal(state, 3, 7);
  assert.equal(isHidden(next, 3, scored), false);
  assert.equal(isHidden(next, 4, scored), true);
});
