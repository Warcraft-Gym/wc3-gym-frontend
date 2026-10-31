import { test } from 'node:test';
import assert from 'node:assert/strict';
import { allLegsFinished, legCell, legField, legsOf, legStages, legState, legTitle, openLegIndex, ownEntry } from './cup-rounds.mjs';

const legs = [
  { id: 2, number: 2, name: 'Round 2', stage_ids: [12], checked_in: [], finished_at: null },
  { id: 1, number: 1, name: 'Round 1', stage_ids: [11], checked_in: [5, 6], finished_at: '2026-11-06T22:00:00Z' },
];

test('a cup reads its rounds in order and opens on the first one not finished', () => {
  const event = { cup_legs: legs };
  assert.deepEqual(legsOf(event).map((leg) => leg.id), [1, 2]);
  assert.equal(openLegIndex(legsOf(event)), 1);
  assert.equal(openLegIndex(legsOf({ cup_legs: legs.map((leg) => ({ ...leg, finished_at: 'x' })) })), 1);
  assert.deepEqual(legsOf({}), []);
  assert.equal(openLegIndex([]), 0);
  assert.equal(allLegsFinished(legsOf(event)), false);
});

test('a round plays its own stages and the players checked in for it', () => {
  const stages = [{ id: 12, position: 2 }, { id: 11, position: 1 }];
  assert.deepEqual(legStages(stages, legs[1]).map((stage) => stage.id), [11]);
  assert.deepEqual(legStages(stages, null).map((stage) => stage.id), [11, 12]);
  const entrants = [{ id: 5 }, { id: 6 }, { id: 7 }];
  assert.deepEqual(legField(entrants, legs[1]).map((row) => row.id), [5, 6]);
  assert.equal(legField(entrants, null).length, 3);
});

test('a round names itself and says where it stands', () => {
  assert.equal(legTitle({ number: 3, name: null }), 'Round 3');
  assert.equal(legTitle({ number: 3, name: 'Finale' }), 'Finale');
  assert.equal(legState(legs[1], true), 'finished');
  assert.equal(legState(legs[0], true), 'playing');
  assert.equal(legState(legs[0], false), 'checkin');
});

test('a player finds their own entry, or the cup team they play in', () => {
  const entrants = [
    { id: 1, user: { id: 9 }, withdrawn_at: '2026-11-01' },
    { id: 2, user: { id: 9 } },
    { id: 3, team: { name: 'Pair' }, roster: [{ user: { id: 4 } }] },
  ];
  assert.equal(ownEntry(entrants, 9)?.id, 2);
  assert.equal(ownEntry(entrants, 4)?.id, 3);
  assert.equal(ownEntry(entrants, 8), null);
  assert.equal(ownEntry(entrants, null), null);
  // an entry on the waitlist checks in for a round, so the round picker finds it
  const waiting = [...entrants, { id: 5, user: { id: 7 }, waitlisted_at: '2026-11-02' }];
  assert.equal(ownEntry(waiting, 7), null);
  assert.equal(ownEntry(waiting, 7, { waiting: true })?.id, 5);
});

test('the overall table reads a round a player missed as empty', () => {
  const row = { legs: [{ leg_id: 1, place: 2, points: 8 }] };
  assert.deepEqual(legCell(row, { id: 1 }), { place: 2, points: 8 });
  assert.equal(legCell(row, { id: 2 }), null);
});
