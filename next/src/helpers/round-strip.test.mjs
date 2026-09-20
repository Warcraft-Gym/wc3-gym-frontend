import { test } from 'node:test';
import assert from 'node:assert/strict';
import { markText, roundMarks, seriesHead, stripLabel, stripPoints, stripRecord } from './round-strip.mjs';

const them = (id, name) => ({ id, name });
// one series of round `playday`, the player on side one unless `mine` is false
const series = (playday, mine, me, them_, opponent, race = 'ne') => (mine
  ? { match: { playday }, player1_id: 7, player2_id: opponent.id, player2: opponent, player2_race: race, player1_score: me, player2_score: them_ }
  : { match: { playday }, player1_id: opponent.id, player2_id: 7, player1: opponent, player1_race: race, player1_score: them_, player2_score: me });

test('a mark names the winner of the round, from either side of the series', () => {
  const rows = [
    series(1, true, 2, 1, them(3, 'Scorch')),
    series(2, false, 0, 2, them(4, 'Markoo')),
    series(3, true, null, null, them(5, 'Taro')),
  ];
  assert.deepEqual(roundMarks(rows, 7, 5).map((mark) => mark.state), ['won', 'lost', 'pending', 'none', 'none']);
});

test('the mark reads the opponent MMR from the side he played, and null where the row names none', () => {
  const rows = [
    { match: { playday: 1 }, player1_id: 7, player2_id: 3, player2: them(3, 'Scorch'), player1_mmr: 1400, player2_mmr: 1320, player1_score: 2, player2_score: 1 },
    { match: { playday: 2 }, player1_id: 4, player2_id: 7, player1: them(4, 'Taro'), player1_score: 2, player2_score: 0 },
  ];
  const marks = roundMarks(rows, 7, 2);
  assert.equal(marks[0].series[0].opponentMmr, 1320);
  assert.equal(marks[1].series[0].opponentMmr, null);
});

test('one won and one lost in the same round is the split square', () => {
  const rows = [series(2, true, 3, 2, them(3, 'Farrow')), series(2, false, 2, 3, them(4, 'Scorch'))];
  assert.equal(roundMarks(rows, 7, 2)[1].state, 'mixed');
  assert.equal(roundMarks(rows, 7, 2)[1].series.length, 2);
});

test('the series of another player, and of another event, never reach the strip', () => {
  const rows = [{ match: { playday: 1 }, player1_id: 8, player2_id: 9, player1_score: 2, player2_score: 0 }];
  assert.deepEqual(roundMarks(rows, 7, 2).map((mark) => mark.state), ['none', 'none']);
  assert.deepEqual(roundMarks([{ player1_id: 7, player2_id: 8 }], 7, 1).map((mark) => mark.state), ['none']);
});

test('the head names the round and the margin, and a round with no series says so', () => {
  const marks = roundMarks([series(1, true, 2, 1, them(3, 'Scorch')), series(2, true, null, null, them(4, 'Taro'))], 7, 3);
  assert.equal(seriesHead(1, marks[0].series[0]), 'Round 1 · Won 2 – 1');
  assert.equal(seriesHead(2, marks[1].series[0]), 'Round 2 · To play');
  assert.equal(markText(marks[0]), 'Round 1 · Won 2 – 1, vs Scorch');
  assert.equal(markText(marks[2]), 'Round 3 · No series');
});

test('a round the player sits out is the crossed mark, and a series of that round wins over it', () => {
  const marks = roundMarks([series(2, true, 2, 1, them(3, 'Scorch'))], 7, 4, [1, 2, 3]);
  assert.deepEqual(marks.map((mark) => mark.state), ['out', 'won', 'out', 'none']);
  assert.equal(markText(marks[0]), 'Round 1 · Sat out');
  assert.equal(markText(marks[3]), 'Round 4 · No series');
  assert.deepEqual(roundMarks([], 7, 2).map((mark) => mark.state), ['none', 'none']);
});

test('the points of a player are the sum the server wrote on his side, and null with no series', () => {
  const rows = [
    { player1_id: 7, player2_id: 3, player1_points: 3, player2_points: 1 },
    { player1_id: 4, player2_id: 7, player1_points: 2, player2_points: 2 },
    { player1_id: 7, player2_id: 5, player1_points: null, player2_points: 4 },
    { player1_id: 8, player2_id: 9, player1_points: 9, player2_points: 9 },
  ];
  assert.equal(stripPoints(rows, 7), 5);
  assert.equal(stripPoints(rows, 4), 2);
  assert.equal(stripPoints(rows, 11), null);
  assert.equal(stripPoints([], 7), null);
});

test('the strip carries one label, counting the rounds with a result', () => {
  const marks = roundMarks([
    series(1, true, 2, 1, them(3, 'Scorch')),
    series(2, true, 2, 0, them(4, 'Markoo')),
    series(3, false, 0, 2, them(5, 'Taro')),
    series(4, true, null, null, them(6, 'Nia')),
  ], 7, 5);
  assert.deepEqual(stripRecord(marks), { wins: 2, losses: 1, played: 3 });
  assert.equal(stripLabel(marks), 'Won 2, lost 1, played 3 of 5 rounds');
  assert.equal(stripLabel([]), 'Won 0, lost 0, played 0 of 0 rounds');
});
