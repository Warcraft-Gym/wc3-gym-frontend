import { test } from 'node:test';
import assert from 'node:assert/strict';
import { gamesOf, winsOf, isValidResult, replaysNeeded } from './best-of.mjs';

test('the games are the rules a season lists', () => {
  assert.equal(gamesOf('veto,veto,veto'), 3);
  assert.equal(gamesOf('veto,week,loser,veto,veto'), 5);
  assert.equal(gamesOf('veto'), 1);
});

test('a season without rules is a Bo3', () => {
  assert.equal(gamesOf(''), 3);
  assert.equal(gamesOf(null), 3);
  assert.equal(gamesOf(undefined), 3);
  assert.equal(gamesOf(',,'), 3);
});

test('the wins are half the games plus one', () => {
  assert.equal(winsOf('veto'), 1);
  assert.equal(winsOf('veto,veto,veto'), 2);
  assert.equal(winsOf('veto,veto,veto,veto,veto'), 3);
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
