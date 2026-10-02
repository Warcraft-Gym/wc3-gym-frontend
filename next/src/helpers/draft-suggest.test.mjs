import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mmrGap, pairIndex, placeTakers } from './draft-suggest.mjs';

const BOARD = {
  pairs: [
    { player1_id: 11, player2_id: 21, hours: 4, wins: 2, losses: 1, last_event: 'Season 18' },
    { player1_id: 12, player2_id: 22, hours: 3, wins: null, losses: null, last_event: null },
  ],
};

test('a player with no MMR is at no distance from anyone', () => {
  assert.equal(mmrGap({ mmr: 1500 }, { mmr: 1620 }), 120);
  assert.equal(mmrGap({ mmr: 1500 }, { mmr: null }), Infinity);
});

test('the pair index reads a pairing by its two ids', () => {
  const pairOf = pairIndex(BOARD);
  assert.equal(pairOf(11, 21).hours, 4);
  assert.equal(pairOf(21, 11), undefined);
});

test('a draft that replaces a published series takes no place of the round', () => {
  const drafted = [{ player1_id: 12, player2_id: 22, replaces_series_id: 7 }];
  assert.deepEqual(placeTakers(drafted), []);
  // a plain draft still takes a place
  assert.equal(placeTakers([...drafted, { player1_id: 11, player2_id: 21 }]).length, 1);
});
