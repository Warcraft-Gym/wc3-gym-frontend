import { test } from 'node:test';
import assert from 'node:assert/strict';
import { gamesOf, winsFor, isValidResult, replaysNeeded, resultProblem, neverPlayed, moveTargets, moveMessage } from './best-of.mjs';

test('the games are the rules a season lists', () => {
  assert.equal(gamesOf('veto,veto,veto'), 3);
  assert.equal(gamesOf('veto,fixed,loser,veto,veto'), 5);
  assert.equal(gamesOf('veto'), 1);
});

test('a season without rules is a Bo3', () => {
  assert.equal(gamesOf(''), 3);
  assert.equal(gamesOf(null), 3);
  assert.equal(gamesOf(undefined), 3);
  assert.equal(gamesOf(',,'), 3);
});

test('the wins are half the games plus one, off a game count', () => {
  assert.deepEqual([winsFor(1), winsFor(3), winsFor(5)], [1, 2, 3]);
  // a season asks off its map rules and a stage off its best_of; both hand over a count
  assert.equal(winsFor(gamesOf('veto,veto,veto')), 2);
  assert.equal(winsFor(undefined), 2);  // an unnamed best-of is a Bo3
});

test('a Bo3 takes the four scorelines it always took', () => {
  for (const [p1, p2] of [[2, 0], [0, 2], [2, 1], [1, 2]]) assert.equal(isValidResult(p1, p2, 2), true);
  for (const [p1, p2] of [[0, 0], [1, 1], [2, 2], [3, 0], [1, 0], [-1, 2]]) assert.equal(isValidResult(p1, p2, 2), false);
});

test('a Bo5 takes three wins', () => {
  assert.equal(isValidResult(3, 2, 3), true);
  assert.equal(isValidResult(0, 3, 3), true);
  assert.equal(isValidResult(2, 1, 3), false);
});

test('every map played leaves a replay', () => {
  assert.equal(replaysNeeded(2, 0), 2);
  assert.equal(replaysNeeded(2, 1), 3);
  assert.equal(replaysNeeded(3, 2), 5);
});

test('a replay moves to any other game the series played', () => {
  assert.deepEqual(moveTargets(3, 1), [2, 3]);
  assert.deepEqual(moveTargets(3, 3), [1, 2]);
  assert.deepEqual(moveTargets(2, 2), [1]);
  // one game played offers nothing, and so does a series nobody reported
  assert.deepEqual(moveTargets(1, 1), []);
  assert.deepEqual(moveTargets(0, 1), []);
  assert.deepEqual(moveTargets(undefined, 1), []);
});

test('a move onto a game that holds a replay says both moved', () => {
  assert.equal(moveMessage(1, 2, false), 'Replay moved to game 2');
  assert.equal(moveMessage(1, 2, true), 'Replay moved to game 2; the replay of game 2 moved to game 1');
});

test('a pair that is not a result says why', () => {
  assert.equal(resultProblem(2, 1, 'veto,veto,veto'), null);
  assert.equal(resultProblem(0, 2, null), null);
  assert.equal(resultProblem(17, 0, null), 'A Bo3 ends when one player wins 2 maps, or 0-0 when it was never played');
  assert.equal(resultProblem(1, 0, null), 'A Bo3 ends when one player wins 2 maps, or 0-0 when it was never played');
  assert.equal(resultProblem(2, 2, null), 'A Bo3 ends when one player wins 2 maps, or 0-0 when it was never played');
  assert.equal(resultProblem(2, 1, 'veto,veto,veto,veto,veto'), 'A Bo5 ends when one player wins 3 maps, or 0-0 when it was never played');
  assert.equal(resultProblem(NaN, 2, null), 'Enter both map scores');
});

test('0-0 is a result, a series that was never played', () => {
  assert.equal(neverPlayed(0, 0), true);
  assert.equal(neverPlayed(1, 0), false);
  assert.equal(resultProblem(0, 0, null), null);
  assert.equal(resultProblem(0, 0, 'veto,veto,veto,veto,veto'), null);
  // a player reports through isValidResult, which never admits 0-0
  assert.equal(isValidResult(0, 0, 2), false);
});
