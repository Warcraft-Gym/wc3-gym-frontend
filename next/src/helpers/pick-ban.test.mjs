import { test } from 'node:test';
import assert from 'node:assert/strict';
import { DEFAULT_PICK_BAN, orderOf, orderProblem, vetoLimits } from './pick-ban.mjs';

test('the order splits on the bar and drops empty steps', () => {
  assert.deepEqual(orderOf('Ban_A|Pick_B'), ['Ban_A', 'Pick_B']);
  assert.deepEqual(orderOf(''), []);
  assert.deepEqual(orderOf(null), []);
});

test('the default rules take two picks and keep the fixed map out of the veto', () => {
  assert.deepEqual(vetoLimits(null, 9), { picksMax: 2, bansMax: 6, vetoPool: 8 });
  assert.deepEqual(vetoLimits('veto,veto,veto', 3), { picksMax: 3, bansMax: 0, vetoPool: 3 });
  assert.deepEqual(vetoLimits('fixed,loser,loser', 0), { picksMax: 2, bansMax: 0, vetoPool: 0 });
});

test('the default order needs nine maps under the default rules', () => {
  const order = orderOf(DEFAULT_PICK_BAN);
  assert.equal(orderProblem(order, null, 9), null);
  assert.equal(orderProblem(order, null, 8), 'The pool allows 5 bans after 2 picks, the order has 6');
});

test('an order refused by the backend is refused here in its words', () => {
  assert.equal(orderProblem(['Pick_A', 'Pick_B', 'Pick_A'], 'fixed,loser,loser', 9), 'The games take 2 picks, the order has 3');
  assert.match(orderProblem(['Ban_C'], null, 9), /'Ban_C' is not a veto step/);
  assert.equal(orderProblem([], null, 0), null);
});
