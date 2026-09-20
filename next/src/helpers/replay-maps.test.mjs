import assert from 'node:assert/strict';
import test from 'node:test';
import { mapMismatch, mapMismatches, reportWarning } from './replay-maps.mjs';

// Game 1 plays the round's fixed map 7, games 2 and 3 the maps the veto picked
const VETO = [7, 8, 9];

test('a replay on the map its game plays is silent', () => {
  assert.equal(mapMismatch(1, [7, 8, null], VETO), null);
  assert.deepEqual(mapMismatches([7, 8, null], VETO), []);
  assert.equal(reportWarning(false, mapMismatches([7, 8, null], VETO)), null);
});

test('a replay on another game\'s map names that game', () => {
  assert.deepEqual(mapMismatch(1, [8, 7, null], VETO), { game: 1, to: 2 });
  assert.deepEqual(mapMismatches([8, 7, null], VETO), [{ game: 1, to: 2 }, { game: 2, to: 1 }]);
  assert.equal(
    reportWarning(false, mapMismatches([8, 7, null], VETO)),
    'The replay of games 1, 2 was played on another map than the veto gives it.',
  );
});

test('a replay on a map the veto gives nobody names no game to move to', () => {
  assert.deepEqual(mapMismatch(1, [42], VETO), { game: 1, to: null });
  assert.equal(reportWarning(false, mapMismatches([42], VETO)), 'The replay of game 1 was played on another map than the veto gives it.');
});

test('a series that plays a veto and records none warns once and names no game', () => {
  assert.deepEqual(mapMismatches([7, 8], [null, null, null]), []);
  assert.equal(reportWarning(true, []), 'No map veto is recorded for this series, so nothing says which map each game plays.');
  // a series whose rules play no veto has nothing to ask about
  assert.equal(reportWarning(false, []), null);
});

test('a game with no replay is silent', () => {
  assert.equal(mapMismatch(2, [7, null, null], VETO), null);
  assert.deepEqual(mapMismatches([null, null, null], VETO), []);
});

test('a fixed map game is checked like every other game', () => {
  // the round's map is known before any veto, so game 1 still warns
  assert.deepEqual(mapMismatch(1, [9], [7, null, null]), { game: 1, to: null });
  assert.equal(mapMismatch(1, [7], [7, null, null]), null);
});
