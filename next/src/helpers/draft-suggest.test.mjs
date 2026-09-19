import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mmrGap, pairIndex, suggestPairings } from './draft-suggest.mjs';

const player = (user_id, team_id, mmr) => ({ user_id, team_id, mmr });

// team 1 holds 1500, 1600 and a player with no MMR; team 2 holds 1520, 1640 and 1900
const BOARD = {
  team1_id: 1,
  team2_id: 2,
  series_per_round: 5,
  players: [
    player(11, 1, 1500),
    player(12, 1, 1600),
    player(13, 1, null),
    player(21, 2, 1520),
    player(22, 2, 1640),
    player(23, 2, 1900),
  ],
  pairs: [
    { player1_id: 11, player2_id: 21, hours: 4, wins: 2, losses: 1, last_event: 'Season 18' },
    { player1_id: 11, player2_id: 22, hours: 0, wins: null, losses: null, last_event: null },
    { player1_id: 12, player2_id: 21, hours: 6, wins: null, losses: null, last_event: null },
    { player1_id: 12, player2_id: 22, hours: 3, wins: null, losses: null, last_event: null },
  ],
};

const keys = (pairs) => pairs.map((p) => `${p.player1_id}-${p.player2_id}`).sort();

test('the suggestion takes the set with the smallest total difference, not the greedy pick', () => {
  // greedy takes 11 vs 21 (20) first and leaves 12 vs 22 (40) for a total of 60, which is also the best set
  const { pairs } = suggestPairings(BOARD, 100);
  assert.deepEqual(keys(pairs), ['11-21', '12-22']);
});

test('a player with no MMR is never suggested', () => {
  const { pairs, rest } = suggestPairings(BOARD, 500);
  assert.ok(!pairs.some((p) => p.player1_id === 13));
  assert.ok(rest.some((p) => p.user_id === 13));
});

test('no suggested pairing is wider than the working difference', () => {
  const { pairs } = suggestPairings(BOARD, 25);
  assert.deepEqual(keys(pairs), ['11-21']);
});

test('the pairings already drafted stay and only the open places fill', () => {
  const drafted = [{ player1_id: 12, player2_id: 22 }];
  const { pairs, open } = suggestPairings({ ...BOARD, series_per_round: 2 }, 100, drafted);
  assert.equal(open, 1);
  assert.deepEqual(keys(pairs), ['11-21']);
});

test('fills names the difference at which one more place would fill', () => {
  const { pairs, fills } = suggestPairings(BOARD, 25);
  assert.equal(pairs.length, 1);
  assert.equal(fills[0].difference, 40); // 12 vs 22
  assert.equal(fills[0].pairs, 2);
});

test('a board with no open place suggests nothing', () => {
  const { pairs, open } = suggestPairings({ ...BOARD, series_per_round: 1 }, 100, [{ player1_id: 11, player2_id: 21 }]);
  assert.equal(open, 0);
  assert.deepEqual(pairs, []);
});

test('a player with no MMR is at no distance from anyone', () => {
  assert.equal(mmrGap({ mmr: 1500 }, { mmr: 1620 }), 120);
  assert.equal(mmrGap({ mmr: 1500 }, { mmr: null }), Infinity);
});

test('the pair index reads a pairing by its two ids', () => {
  const pairOf = pairIndex(BOARD);
  assert.equal(pairOf(11, 21).hours, 4);
  assert.equal(pairOf(21, 11), undefined);
});
