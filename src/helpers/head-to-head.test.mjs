import { test } from 'node:test';
import assert from 'node:assert/strict';
import { opponentRows } from './head-to-head.mjs';

const meeting = (season_id, season_name, my_score, their_score, my_race, their_race) => ({
  series_id: `${season_id}-${my_score}-${their_score}-${my_race}`,
  season_id, season_name, my_score, their_score, my_race, their_race,
});

test('the record and the games skip a meeting with no score', () => {
  const [row] = opponentRows([{
    id: 52, name: 'Peterian', last_season_name: 'GNL S19', last_playday: 4,
    meetings: [
      meeting(4, 'GNL S19', 2, 0, 'HU', 'OC'),
      meeting(4, 'GNL S19', 1, 2, 'HU', 'OC'),
      meeting(3, 'GNL S18', null, null, 'HU', 'OC'),
    ],
  }]);
  assert.deepEqual(row.record, { won: 1, lost: 1 });
  assert.deepEqual(row.games, { mine: 3, theirs: 2 });
  assert.equal(row.lastMet, 'GNL S19, round 4');
});

test('matchups aggregate by race pair and sort by count', () => {
  const [row] = opponentRows([{
    meetings: [
      meeting(4, 'GNL S19', 2, 0, 'HU', 'OC'),
      meeting(4, 'GNL S19', 0, 2, 'NE', 'OC'),
      meeting(4, 'GNL S19', 2, 1, 'NE', 'OC'),
    ],
  }]);
  assert.deepEqual(row.matchups, [
    { mine: 'NE', theirs: 'OC', count: 2 },
    { mine: 'HU', theirs: 'OC', count: 1 },
  ]);
});

test('a meeting that carries no race adds no matchup', () => {
  const [row] = opponentRows([{
    meetings: [
      meeting(4, 'GNL S19', 2, 0, null, null),
      meeting(4, 'GNL S19', 2, 1, 'HU', null),
      meeting(4, 'GNL S19', 2, 1, 'HU', 'OC'),
    ],
  }]);
  assert.deepEqual(row.matchups, [{ mine: 'HU', theirs: 'OC', count: 1 }]);
});

test('seasons keep the season id order and carry their count', () => {
  const [row] = opponentRows([{
    meetings: [
      meeting(4, 'GNL S19', 2, 0, 'HU', 'OC'),
      meeting(3, 'GNL S18', 1, 2, 'HU', 'OC'),
      meeting(4, 'GNL S19', 2, 1, 'NE', 'OC'),
    ],
  }]);
  assert.deepEqual(row.seasons, [
    { id: 3, name: 'GNL S18', count: 1 },
    { id: 4, name: 'GNL S19', count: 2 },
  ]);
});

test('an opponent with no meeting reads as an empty row', () => {
  const [row] = opponentRows([{ id: 9, name: 'Nobody' }]);
  assert.deepEqual(row.record, { won: 0, lost: 0 });
  assert.deepEqual(row.games, { mine: 0, theirs: 0 });
  assert.deepEqual(row.matchups, []);
  assert.deepEqual(row.seasons, []);
  assert.equal(row.lastMet, '');
});
