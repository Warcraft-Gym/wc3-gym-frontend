import assert from 'node:assert';
import test from 'node:test';

import { bestOfLine, largestBestOf, parsePlan, partsOf, planText, poolProblem } from './best-of-plan.mjs';

test('each format names the parts of its bracket, latest last', () => {
  assert.deepStrictEqual(partsOf('single_elimination').map((part) => part.role), ['quarterfinal', 'semifinal', 'final']);
  assert.deepStrictEqual(partsOf('double_elimination').map((part) => part.role).at(-1), 'grand_final');
  assert.deepStrictEqual(partsOf('round_robin'), []);
});

test('the plan reads and writes the text the stage stores', () => {
  assert.deepStrictEqual(parsePlan('semifinal:3,final:5'), { semifinal: 3, final: 5 });
  assert.deepStrictEqual(parsePlan(null), {});
  // a part of the other format, or one that plays the early best-of, is not stored
  assert.strictEqual(planText({ semifinal: 3, grand_final: 5, final: 1 }, 'single_elimination', 1), 'semifinal:3');
  assert.strictEqual(planText({}, 'double_elimination', 1), null);
});

test('one line names the early rounds and every part with its own best-of', () => {
  assert.strictEqual(bestOfLine(3, {}, 'single_elimination'), 'Bo3');
  assert.strictEqual(
    bestOfLine(1, { upper_final: 3, grand_final: 5 }, 'double_elimination'),
    'Bo1 early · upper final Bo3 · grand final Bo5',
  );
});

test('the pool holds a map for every game of the longest series', () => {
  assert.strictEqual(largestBestOf(1, { final: 5 }), 5);
  assert.strictEqual(poolProblem(5, 1, { final: 5 }), null);
  assert.strictEqual(poolProblem(4, 1, { final: 5 }), 'A Bo5 needs at least 5 maps in the pool; it holds 4.');
  assert.strictEqual(poolProblem(0, 1, {}), 'A Bo1 needs at least 1 map in the pool; it holds 0.');
});
