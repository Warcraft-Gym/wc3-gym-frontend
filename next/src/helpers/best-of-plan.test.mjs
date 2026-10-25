import assert from 'node:assert';
import test from 'node:test';

import { bestOfLine, freeParts, largestBestOf, listedParts, parsePlan, partsOf, planText, poolProblem, stepFrom } from './best-of-plan.mjs';

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
  assert.strictEqual(largestBestOf(1, { final: 5 }, 'single_elimination'), 5);
  assert.strictEqual(poolProblem(5, 1, { final: 5 }, 'single_elimination'), null);
  assert.strictEqual(poolProblem(4, 1, { final: 5 }, 'single_elimination'), 'A Bo5 needs at least 5 maps in the pool; it holds 4.');
  assert.strictEqual(poolProblem(0, 1, {}, 'single_elimination'), 'A Bo1 needs at least 1 map in the pool; it holds 0.');
});

test('the editor lists the parts the plan names and offers the rest, in bracket order', () => {
  const plan = { final: 5, semifinal: 3, upper_final: 3 };
  assert.deepStrictEqual(listedParts(plan, 'single_elimination').map((part) => part.role), ['semifinal', 'final']);
  assert.deepStrictEqual(freeParts(plan, 'single_elimination').map((part) => part.role), ['quarterfinal']);
  // a part another format left in the plan is neither listed nor free
  assert.deepStrictEqual(listedParts(plan, 'double_elimination').map((part) => part.role), ['upper_final']);
  assert.deepStrictEqual(listedParts({}, 'swiss'), []);
  assert.deepStrictEqual(freeParts({}, 'swiss'), []);
});

test('a newly listed part starts one step longer, or shorter from the longest', () => {
  assert.strictEqual(stepFrom(1), 3);
  assert.strictEqual(stepFrom(3), 5);
  assert.strictEqual(stepFrom(5), 3);
});

test('a stored plan opens with its parts listed and saves back the same text', () => {
  const stored = 'semifinal:3,final:5';
  const plan = parsePlan(stored);
  assert.deepStrictEqual(listedParts(plan, 'single_elimination').map((part) => part.role), ['semifinal', 'final']);
  assert.strictEqual(planText(plan, 'single_elimination', 1), stored);
  // a listed part that plays the cup's best-of is not stored
  assert.strictEqual(planText({ ...plan, quarterfinal: 1 }, 'single_elimination', 1), stored);
});

test('the longest series counts only the parts the format plays', () => {
  // a single elimination final left in the plan plays no game of a double elimination
  assert.strictEqual(largestBestOf(1, { upper_final: 3, final: 5 }, 'double_elimination'), 3);
  assert.strictEqual(poolProblem(3, 1, { upper_final: 3, final: 5 }, 'double_elimination'), null);
  // a format with no parts plays its own best-of alone
  assert.strictEqual(largestBestOf(3, { final: 5 }, 'round_robin'), 3);
});
