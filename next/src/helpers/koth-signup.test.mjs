import assert from 'node:assert/strict';
import test from 'node:test';
import { bracketName, placeWord, signupPlace } from './koth-signup.mjs';

const seat = (...ids) => ({ rows: ids.map((entrant_id) => ({ entrant_id })) });

const board = {
  brackets: [
    { division_id: 1, name: 'Bracket 1', king: seat(11), queue: [seat(12), seat(13, 14)], left: [], played: [] },
    { division_id: 2, name: null, king: null, defender: { entrant_id: 20 }, queue: [seat(21), seat(22), seat(23)] },
  ],
};

test('the first ten places read as words and the rest as ordinals', () => {
  assert.equal(placeWord(1), 'first');
  assert.equal(placeWord(10), 'tenth');
  assert.equal(placeWord(11), '11th');
  assert.equal(placeWord(13), '13th');
  assert.equal(placeWord(21), '21st');
  assert.equal(placeWord(22), '22nd');
  assert.equal(placeWord(23), '23rd');
  assert.equal(placeWord(111), '111th');
  assert.equal(placeWord(0), null);
});

test('a row in the line names its bracket and its place', () => {
  assert.deepEqual(signupPlace(board, 12), { bracket: 'Bracket 1', placeWord: 'first' });
  // a player with two races takes one seat, so both rows read the same place
  assert.deepEqual(signupPlace(board, 14), { bracket: 'Bracket 1', placeWord: 'second' });
  assert.deepEqual(signupPlace(board, 23), { bracket: 'Bracket 2', placeWord: 'third' });
});

test('a bracket with no name falls back to its position, on the board and on the event row', () => {
  assert.equal(signupPlace(board, 21).bracket, 'Bracket 2');
  assert.equal(bracketName({ id: 2, name: null }, 1), 'Bracket 2');
  assert.equal(bracketName({ id: 1, name: 'Under 1500' }, 0), 'Under 1500');
});

test('a row the bracket holds outside the line names the bracket alone', () => {
  assert.deepEqual(signupPlace(board, 11), { bracket: 'Bracket 1', placeWord: null });
  assert.deepEqual(signupPlace(board, 20), { bracket: 'Bracket 2', placeWord: null });
});

test('a row no bracket holds, and an empty board, answer null', () => {
  assert.equal(signupPlace(board, 99), null);
  assert.equal(signupPlace({ brackets: [] }, 12), null);
  assert.equal(signupPlace(null, 12), null);
});
