import { test } from 'node:test';
import assert from 'node:assert/strict';
import { matchProblem } from './match.mjs';

test('a match needs two different teams', () => {
  assert.equal(matchProblem({ team1_id: null, team2_id: null }), 'Pick both teams.');
  assert.equal(matchProblem({ team1_id: 3, team2_id: null }), 'Pick both teams.');
  assert.equal(matchProblem({ team1_id: 3, team2_id: 3 }), 'A team cannot play itself.');
  assert.equal(matchProblem({ team1_id: 3, team2_id: 4 }), null);
  // no match at all is the same miss as an empty one
  assert.equal(matchProblem(null), 'Pick both teams.');
});
