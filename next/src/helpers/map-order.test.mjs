import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mapsByGame, picksOf, scoreOf, gameSlots, gamesReported, fixedMapOf, deciderOf, vetoOffers } from './map-order.mjs';

const PICKS = { A: 11, B: 22 };

test('a cup series plays the decider first, then each loser takes their next pick', () => {
  const steps = [
    { step_no: 1, side: 'A', action: 'ban', map_id: 9 },
    { step_no: 2, side: 'A', action: 'pick', map_id: 11 },
    { step_no: 3, side: 'B', action: 'pick', map_id: 21 },
    { step_no: 4, side: 'A', action: 'pick', map_id: 12 },
    { step_no: 5, side: 'B', action: 'pick', map_id: 22 },
  ];
  const veto = { steps, pool: [9, 11, 12, 21, 22, 30], complete: true };
  const offers = vetoOffers('decider,loser,loser,loser,loser', veto);
  assert.deepEqual(offers, { queue: { A: [11, 12], B: [21, 22] }, decider: 30 });
  // B wins two, then A loses no more: A picks games 2 and 3, B games 4 and 5
  assert.deepEqual(mapsByGame('decider,loser,loser,loser,loser', null, {}, ['B', 'B', 'A', 'A'], offers), [30, 11, 12, 21, 22]);
  // an unfinished veto names no decider, and a GNL series reads no queue
  assert.equal(deciderOf(veto.pool, steps, false), null);
  assert.deepEqual(vetoOffers('fixed,loser,loser', veto), {});
});

test('a fixed game takes the round map and a loser game waits for a winner', () => {
  assert.deepEqual(mapsByGame('fixed,loser,loser', 7, PICKS, []), [7, null, null]);
});

test('the loser of a game picks the next map', () => {
  assert.deepEqual(mapsByGame('fixed,loser,loser', 7, PICKS, ['A']), [7, 22, null]);
  assert.deepEqual(mapsByGame('fixed,loser,loser', 7, PICKS, ['A', 'B']), [7, 22, 11]);
});

test('a rule that is not fixed or loser names no map', () => {
  assert.deepEqual(mapsByGame('veto,veto,veto', 7, PICKS, ['A', 'B']), [null, null, null]);
});

test('a season without rules plays the GNL format', () => {
  assert.deepEqual(mapsByGame(null, 7, PICKS, ['B']), [7, 11, null]);
});

test('a side owns its first pick of the veto', () => {
  const steps = [
    { step_no: 3, action: 'pick', side: 'A', map_id: 11 },
    { step_no: 1, action: 'ban', side: 'B', map_id: 99 },
    { step_no: 4, action: 'pick', side: 'B', map_id: 22 },
    { step_no: 5, action: 'pick', side: 'A', map_id: 33 },
  ];
  assert.deepEqual(picksOf(steps), { A: 11, B: 22 });
  assert.deepEqual(picksOf(null), {});
});

test('the score counts the games each side won', () => {
  assert.deepEqual(scoreOf([]), [0, 0]);
  assert.deepEqual(scoreOf(['A', 'B', 'A']), [2, 1]);
  // a game left blank ends the count, so a later tap cannot be read as played
  assert.deepEqual(scoreOf(['A', null, 'B']), [1, 0]);
});

test('a row opens for the next game until the series is won', () => {
  assert.equal(gameSlots(3, []), 1);
  assert.equal(gameSlots(3, ['A']), 2);
  assert.equal(gameSlots(3, ['A', 'B']), 3);
  // 2-0 ends a Bo3, so the third row stays shut
  assert.equal(gameSlots(3, ['A', 'A']), 2);
  assert.equal(gameSlots(3, ['A', 'B', 'A']), 3);
  // a stage hands over its best_of the same way a season hands over its game count
  assert.equal(gameSlots(5, ['A', 'A']), 3);
});

test('the report names one game per map played', () => {
  const maps = { 1: 7, 2: 22 };
  assert.deepEqual(gamesReported(['A', 'B', null], (game) => maps[game]), [
    { game_no: 1, winner_side: 'A', map_id: 7 },
    { game_no: 2, winner_side: 'B', map_id: 22 },
  ]);
  // a game with no map named is reported without one
  assert.deepEqual(gamesReported(['B'], () => undefined), [{ game_no: 1, winner_side: 'B', map_id: null }]);
});

test('a fixed game takes the round map, and nothing else does', () => {
  assert.equal(fixedMapOf('fixed,loser,loser', { playday: 1, map_id: 7 }), 7);
  // the round is the only source: a round with no map leaves the game empty
  assert.equal(fixedMapOf('fixed,loser,loser', { playday: 1, map_id: null }), null);
  assert.equal(fixedMapOf('fixed,loser,loser', undefined), null);
  // no fixed rule, so the round map is not played
  assert.equal(fixedMapOf('veto,veto,veto', { playday: 1, map_id: 7 }), null);
  // no rules at all means the GNL default, which starts on the fixed map
  assert.equal(fixedMapOf(null, { playday: 1, map_id: 7 }), 7);
});
