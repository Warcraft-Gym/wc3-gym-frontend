import test from 'node:test';
import assert from 'node:assert/strict';
import { archivedBrackets, archivedResults } from './koth-archive.mjs';

const side = (name) => ({ name });
const series = (series_id, sequence, extra = {}) => ({
  series_id, sequence, side1: side('Ada'), side2: side('Bo'), winner_side: null, inferred_winner_side: null, winner_left: false, review_note: null, result_unavailable: false, ...extra,
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
  const [row] = archivedResults([series(1, 1, { throne: 'moved' })]);
  assert.deepEqual([row.winner.name, row.loser.name], ['Ada', 'Bo']);
  assert.equal(row.undecided, true);
  assert.equal(row.inferred, false);
  assert.equal(row.throne, null);
  assert.equal(row.winner_left, false);
});

test('a winner who withdrew after the series is a decided row that left', () => {
  const [row] = archivedResults([series(1, 1, { winner_left: true, inferred_winner_side: 2, throne: 'held' })]);
  assert.deepEqual([row.winner.name, row.loser.name, row.throne], ['Bo', 'Ada', 'held']);
  assert.equal(row.undecided, false);
  assert.equal(row.inferred, true);
  assert.equal(row.winner_left, true);
});

test('a winner who withdrew with no winner known keeps both sides and no crown mark', () => {
  const [row] = archivedResults([series(1, 1, { winner_left: true, throne: 'none' })]);
  assert.deepEqual([row.winner.name, row.loser.name], ['Ada', 'Bo']);
  assert.equal(row.undecided, true);
  assert.equal(row.throne, null);
  assert.equal(row.winner_left, true);
});

test('an older row marked forfeit with no winner reads as a winner who withdrew', () => {
  const [row] = archivedResults([series(1, 1, { forfeit: true, throne: 'moved' })]);
  assert.equal(row.undecided, true);
  assert.equal(row.throne, null);
  assert.equal(row.winner_left, true);
  assert.equal('forfeit' in row, false);
});

test('a review note rides on the row', () => {
  const [row] = archivedResults([series(1, 1, { review_note: 'Listed twice' })]);
  assert.equal(row.review_note, 'Listed twice');
  assert.equal(row.winner_left, false);
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

const order = (...brackets) => archivedBrackets(brackets.map(([name, lower_bound]) => ({ name, lower_bound }))).map((bracket) => bracket.name);

test('the standard three brackets read weakest first', () => {
  assert.deepEqual(order(['1600 to the mooon', 1600], ['1450 to 1600', 1450], ['1450 and Below', null]), ['1450 and Below', '1450 to 1600', '1600 to the mooon']);
});

test('a night with two brackets puts the one with no bound first', () => {
  assert.deepEqual(order(['1600 to the mooon', 1600], ['1450 and Below', null]), ['1450 and Below', '1600 to the mooon']);
});

test('rank labels with no bound read in reverse page order', () => {
  assert.deepEqual(order(['Platinum to 1700 MMR', null], ['Gold and below', null]), ['Gold and below', 'Platinum to 1700 MMR']);
});

test('a 2000+ Games bracket listed last sorts by its bound', () => {
  assert.deepEqual(
    order(['1600 to the mooon', 1600], ['1450 to 1600', 1450], ['1450 and Below', null], ['2000+ Games', 2000]),
    ['1450 and Below', '1450 to 1600', '1600 to the mooon', '2000+ Games'],
  );
});

test('brackets with the same bound read in reverse page order', () => {
  assert.deepEqual(order(['A', 1500], ['B', 1500]), ['B', 'A']);
});
