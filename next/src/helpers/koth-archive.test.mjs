import test from 'node:test';
import assert from 'node:assert/strict';
import { archivedResults } from './koth-archive.mjs';

const side = (name) => ({ name });
const series = (series_id, sequence, extra = {}) => ({
  series_id, sequence, side1: side('Ada'), side2: side('Bo'), winner_side: null, inferred_winner_side: null, forfeit: false, review_note: null, result_unavailable: false, ...extra,
});

test('the rows read newest first, by play order', () => {
  const rows = archivedResults([series(1, 1), series(3, 3), series(2, 2)]);
  assert.deepEqual(rows.map((row) => row.series_id), [3, 2, 1]);
});

test('rows with no play order keep the source order, newest last', () => {
  const rows = archivedResults([series(1, null), series(2, null)]);
  assert.deepEqual(rows.map((row) => row.series_id), [2, 1]);
});

test('a written winner wins over the order of play and wears its mark as it stands', () => {
  const [row] = archivedResults([series(1, 1, { winner_side: 2, inferred_winner_side: 1, throne: 'moved' })]);
  assert.equal(row.winner.name, 'Bo');
  assert.equal(row.loser.name, 'Ada');
  assert.equal(row.throne, 'moved');
  assert.equal(row.inferred, false);
  assert.equal(row.undecided, false);
});

test('a winner read from the order of play is marked inferred', () => {
  const [moved, held] = archivedResults([series(1, 2, { inferred_winner_side: 2, throne: 'moved' }), series(2, 1, { inferred_winner_side: 1, throne: 'held' })]);
  assert.deepEqual([moved.winner.name, moved.throne, moved.inferred], ['Bo', 'moved', true]);
  assert.deepEqual([held.winner.name, held.throne, held.inferred], ['Ada', 'held', true]);
});

test('a series with no winner keeps both sides in source order and no crown mark', () => {
  const [row] = archivedResults([series(1, 1, { forfeit: true, throne: 'moved' })]);
  assert.deepEqual([row.winner.name, row.loser.name], ['Ada', 'Bo']);
  assert.equal(row.undecided, true);
  assert.equal(row.inferred, false);
  assert.equal(row.throne, null);
  assert.equal(row.forfeit, true);
});

test('a review note rides on the row', () => {
  const [row] = archivedResults([series(1, 1, { review_note: 'Listed twice' })]);
  assert.equal(row.review_note, 'Listed twice');
  assert.equal(row.forfeit, false);
});

test('a row the read names no throne for wears no mark', () => {
  const [row] = archivedResults([series(1, 1, { winner_side: 1 })]);
  assert.equal(row.throne, null);
  assert.equal(row.winner.name, 'Ada');
});

test('no history reads as no rows', () => {
  assert.deepEqual(archivedResults(undefined), []);
  assert.deepEqual(archivedResults(null), []);
});
