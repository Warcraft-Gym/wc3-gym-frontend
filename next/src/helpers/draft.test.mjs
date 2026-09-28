import { test } from 'node:test';
import assert from 'node:assert/strict';
import { averageMmr, pendingPerTeam, pickOrder, pickSets } from './draft.mjs';

const mmrOf = (p) => p.mmr;
const names = (players) => players.map(p => p.name);

const SIGNUPS = [
  { id: 1, name: 'low', mmr: 1000 },
  { id: 2, name: 'mid', mmr: 1500 },
  { id: 3, name: 'high', mmr: 2000 },
  { id: 4, name: 'top', mmr: 2500 },
];

const without = (id) => SIGNUPS.map(p => p.id === id ? { ...p, draft_excluded: true } : p);

test('the order is MMR ascending', () => {
  assert.deepEqual(names(pickOrder(SIGNUPS, mmrOf)), ['low', 'mid', 'high', 'top']);
});

test('a player out of the pick list leaves the order, so the players after them move up', () => {
  assert.deepEqual(names(pickOrder(without(2), mmrOf)), ['low', 'high', 'top']);
});

// The admin pushes a player to a later set, or pulls one into the next set, by
// giving them the MMR the draft should read.
test('a draft MMR stands in for the live one', () => {
  assert.deepEqual(names(pickOrder(SIGNUPS, mmrOf, { 1: 2200 })), ['mid', 'high', 'low', 'top']);
  assert.deepEqual(names(pickOrder(SIGNUPS, mmrOf, { 4: 900 })), ['top', 'low', 'mid', 'high']);
});

test('two players on one MMR keep a steady order by name', () => {
  const tied = [{ id: 1, name: 'b', mmr: 1000 }, { id: 2, name: 'a', mmr: 1000 }];
  assert.deepEqual(names(pickOrder(tied, mmrOf)), ['a', 'b']);
});

test('the order leaves the signups it was given untouched', () => {
  const rows = [...SIGNUPS].reverse();
  pickOrder(rows, mmrOf);
  assert.deepEqual(names(rows), ['top', 'high', 'mid', 'low']);
});

test('the next set holds one player for each team', () => {
  const { next, later } = pickSets(pickOrder(SIGNUPS, mmrOf), 3);
  assert.deepEqual(names(next), ['low', 'mid', 'high']);
  assert.deepEqual(names(later), ['top']);
});

test('a draft MMR moves a player out of the next set and the next one in', () => {
  const { next, later } = pickSets(pickOrder(SIGNUPS, mmrOf, { 2: 3000 }), 3);
  assert.deepEqual(names(next), ['low', 'high', 'top']);
  assert.deepEqual(names(later), ['mid']);
});

test('a season with no team has no next set', () => {
  const { next, later } = pickSets(pickOrder(SIGNUPS, mmrOf), 0);
  assert.deepEqual(next, []);
  assert.equal(later.length, 4);
});

test('the pending picks count per team, over the next set only', () => {
  assert.deepEqual(pendingPerTeam({ 1: 10, 2: 10, 3: 11, 4: 12, 5: null }, [1, 2, 3, 5]), { 10: 2, 11: 1 });
});

// The team cards show the average, so the admins see the MMR gaps while they balance the teams
test('a team average is the rounded mean MMR of its players', () => {
  assert.equal(averageMmr([{ mmr: 1500 }, { mmr: 1600 }, { mmr: 1701 }], mmrOf), 1600);
});

test('a player with no MMR stays out of the team average', () => {
  assert.equal(averageMmr([{ mmr: 1500 }, { mmr: 0 }], mmrOf), 1500);
});

test('a team with no player, or none with an MMR, has no average', () => {
  assert.equal(averageMmr([], mmrOf), null);
  assert.equal(averageMmr([{ mmr: 0 }], mmrOf), null);
});
