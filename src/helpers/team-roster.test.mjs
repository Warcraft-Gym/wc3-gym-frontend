import assert from 'node:assert/strict';
import { test } from 'node:test';

import { rosterOf } from './team-roster.mjs';

const team = {
  captains_by_season: { 18: [{ id: 4, name: 'Alpha' }] },
  player_by_season: { 18: [{ id: 4, name: 'Alpha' }, { id: 7, name: 'Bravo', signup_race: 'HU' }] },
};

test('the rows of one event are its captains and its members', () => {
  const { captains, members } = rosterOf(team, 18);
  assert.deepEqual(captains.map((row) => row.id), [4]);
  assert.deepEqual(members.map((row) => row.id), [4, 7]);
});

test('a number and the text of that number read the same event', () => {
  assert.deepEqual(rosterOf(team, '18'), rosterOf(team, 18));
});

test('an event the team did not play reads two empty lists', () => {
  assert.deepEqual(rosterOf(team, 17), { captains: [], members: [] });
});

test('a team that is not loaded yet reads two empty lists', () => {
  assert.deepEqual(rosterOf(null, 18), { captains: [], members: [] });
  assert.deepEqual(rosterOf(team, null), { captains: [], members: [] });
});
