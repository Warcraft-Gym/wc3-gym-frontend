import assert from 'node:assert';
import test from 'node:test';

import { ladderModeOf, missing, myTeam, teamIdsOf, teamState } from './cup-teams.mjs';

const player = (id, captain = false) => ({ user: { id, name: `P${id}` }, captain });
const BLUE = { id: 10, team: { id: 1, name: 'Blue' }, roster: [player(1, true)], invited: [{ id: 2 }] };
const RED = { id: 11, team: { id: 2, name: 'Red' }, roster: [player(3, true), player(4)], invited: [] };

test('the caller finds their own team, as captain, player or invited', () => {
  assert.deepStrictEqual(myTeam([BLUE, RED], 1), { entrant: BLUE, captain: true, invited: false });
  assert.deepStrictEqual(myTeam([BLUE, RED], 2), { entrant: BLUE, captain: false, invited: true });
  assert.deepStrictEqual(myTeam([BLUE, RED], 4), { entrant: RED, captain: false, invited: false });
  assert.strictEqual(myTeam([BLUE, RED], 9), null);
  // a withdrawn team is nobody's any more
  assert.strictEqual(myTeam([{ ...RED, withdrawn_at: '2026-10-08' }], 3), null);
});

test('a team says what it still waits for', () => {
  assert.strictEqual(missing(BLUE, 2), 1);
  assert.strictEqual(teamState(BLUE, 2), 'Waiting for 1 of 1 to accept');
  assert.strictEqual(teamState({ ...BLUE, invited: [{ id: 2, name: 'P2' }] }, 2), 'Waiting for P2 to accept');
  assert.strictEqual(teamState({ ...BLUE, invited: [{ id: 2, name: 'A' }, { id: 3, name: 'B' }] }, 3), 'Waiting for 2 of 2 to accept');
  assert.strictEqual(teamState({ ...BLUE, invited: [] }, 2), '1 player missing');
  assert.strictEqual(teamState(RED, 2), 'Complete');
});

test('a cup reads the ladder pool of its size, and a 3v3 cup none', () => {
  assert.strictEqual(ladderModeOf(null), '1v1');
  assert.strictEqual(ladderModeOf(2), '2v2');
  assert.strictEqual(ladderModeOf(3), null);
  assert.strictEqual(ladderModeOf(4), '4v4');
  assert.deepStrictEqual(teamIdsOf([BLUE, RED], 4), [2]);
});
