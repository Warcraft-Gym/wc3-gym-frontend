import test from 'node:test';
import assert from 'node:assert/strict';
import {
  boundsOf, bracketLabel, cutsOf, defaultPair, leftSeats, movedQueue, myRacesOnBoard, openSeriesRows,
  orderedBrackets, placeInQueue, placeWord, queueIds, ratedPlayers, seatRow, skippedSeat, startButton,
  throneWord,
} from './koth-board.mjs';

const seat = (user_id, name, rows, extra = {}) => ({ user_id, name, country: null, rows, busy: false, ...extra });
const row = (entrant_id, race, mmr = 1200) => ({ entrant_id, race, mmr });

const BRACKETS = [
  { division_id: 7, name: 'Bracket 3', lower_bound: 1600 },
  { division_id: 8, name: 'Bracket 2', lower_bound: 1450 },
  { division_id: 9, name: 'Bracket 1', lower_bound: 0 },
];

test('the cards read weakest bracket first', () => {
  assert.deepEqual(orderedBrackets({ brackets: BRACKETS }).map((b) => b.name), ['Bracket 1', 'Bracket 2', 'Bracket 3']);
  assert.deepEqual(orderedBrackets(null), []);
});

test('a bracket band runs to one below the next bracket, and the strongest has no top', () => {
  assert.deepEqual(bracketLabel(BRACKETS, BRACKETS[2]), { name: 'Bracket 1', band: 'under 1450 MMR' });
  assert.deepEqual(bracketLabel(BRACKETS, BRACKETS[1]), { name: 'Bracket 2', band: '1450 to 1599 MMR' });
  assert.deepEqual(bracketLabel(BRACKETS, BRACKETS[0]), { name: 'Bracket 3', band: '1600 MMR and up' });
});

test('a bracket with no name still reads a band', () => {
  assert.deepEqual(bracketLabel([{ lower_bound: 0 }], { lower_bound: 0 }), { name: 'Bracket', band: '0 MMR and up' });
});

test('a seat plays the race the admin picked, else the first he signed up on', () => {
  const two = seat(1, 'Kaldris', [row(11, 'OC', 1402), row(12, 'UD', 1188)]);
  assert.equal(seatRow(two).entrant_id, 11);
  assert.equal(seatRow(two, { 11: 12 }).entrant_id, 12);
  assert.equal(seatRow({ rows: [] }), null);
});

test('the default pair is the king against the first seat that is not busy', () => {
  const bracket = {
    king: seat(1, 'Duskrell', [row(1, 'OC')]),
    queue: [seat(2, 'Kaldris', [row(2, 'OC')], { busy: true }), seat(3, 'Ashvane', [row(3, 'HU')])],
  };
  assert.deepEqual(defaultPair(bracket).map((s) => s.name), ['Duskrell', 'Ashvane']);
  assert.equal(skippedSeat(bracket).name, 'Kaldris');
});

test('an empty throne pairs the first two seats, and one seat alone pairs nobody', () => {
  const two = { king: null, queue: [seat(2, 'Kaldris', [row(2, 'OC')]), seat(3, 'Ashvane', [row(3, 'HU')])] };
  assert.deepEqual(defaultPair(two).map((s) => s.name), ['Kaldris', 'Ashvane']);
  assert.equal(defaultPair({ king: null, queue: [seat(2, 'Kaldris', [row(2, 'OC')])] }), null);
  assert.equal(defaultPair({ king: seat(1, 'Duskrell', [row(1, 'OC')]), queue: [] }), null);
  assert.equal(skippedSeat(two), null);
});

test('an empty throne with a defender pairs him first, wherever he stands in the line', () => {
  const bracket = {
    king: null,
    defender: { user_id: 4, name: 'Duskrell' },
    queue: [seat(2, 'Kaldris', [row(2, 'OC')]), seat(3, 'Ashvane', [row(3, 'HU')]), seat(4, 'Duskrell', [row(4, 'UD')])],
  };
  assert.deepEqual(defaultPair(bracket).map((s) => s.name), ['Duskrell', 'Kaldris']);
  // a defender who is playing in another bracket waits like anyone else
  bracket.queue[2].busy = true;
  assert.deepEqual(defaultPair(bracket).map((s) => s.name), ['Kaldris', 'Ashvane']);
});

test('the start button names the pair, and a side game says the crown stays', () => {
  const king = seat(1, 'Ashvane', [row(1, 'HU')]);
  const grimsel = seat(2, 'Grimsel', [row(2, 'OC')]);
  const nettleby = seat(3, 'Nettleby', [row(3, 'HU')]);
  const bracket = { king, queue: [grimsel, nettleby] };
  assert.deepEqual(startButton(bracket), { pair: [king, grimsel], label: 'Start Ashvane vs Grimsel', note: null });
  assert.equal(startButton(bracket, [grimsel, nettleby]).label, 'Start Grimsel vs Nettleby');
  assert.equal(startButton(bracket, [grimsel, nettleby]).note, 'The crown stays with Ashvane.');
  assert.equal(startButton({ king: null, queue: [] }), null);
});

test('a place in line reads as a word, and past ten as a number', () => {
  assert.equal(placeWord(1), 'first');
  assert.equal(placeWord(10), 'tenth');
  assert.equal(placeWord(11), '11th');
  assert.equal(placeWord(22), '22nd');
  assert.equal(placeWord(13), '13th');
});

test('a reader reads his own place in the line, and nothing in a bracket he is not in', () => {
  const bracket = { queue: [seat(2, 'Kaldris', [row(2, 'OC')]), seat(3, 'Ashvane', [row(3, 'HU')]), seat(4, 'Fennow', [row(4, 'UD')])] };
  assert.equal(placeInQueue(bracket, 4), 'You are third in line');
  assert.equal(placeInQueue(bracket, 9), null);
  assert.equal(placeInQueue(bracket, null), null);
});

test('a played row says what the throne did', () => {
  assert.equal(throneWord({ throne: 'moved' }), 'The throne moved');
  assert.equal(throneWord({ throne: 'held' }), 'The throne was held');
  assert.equal(throneWord({ throne: 'none' }), null);
});

test('the queue write names every race row of every seat, in seat order', () => {
  const queue = [seat(1, 'Kaldris', [row(11, 'OC'), row(12, 'UD')]), seat(2, 'Ashvane', [row(13, 'HU')])];
  assert.deepEqual(queueIds(queue), [11, 12, 13]);
  assert.deepEqual(queueIds(movedQueue(queue, 1, 0)), [13, 11, 12]);
  assert.equal(movedQueue(queue, 0, 5), queue);
  assert.equal(movedQueue(queue, 0, 0), queue);
});

test('the reader reads back every race he entered on, placed or not', () => {
  const board = {
    brackets: [{ lower_bound: 0, king: seat(4, 'Fennow', [row(4, 'UD')]), queue: [seat(5, 'Me', [row(5, 'HU'), row(6, 'OC')])] }],
    unplaced: [{ entrant_id: 7, user_id: 5, race: 'NE', mmr: null }],
  };
  assert.deepEqual(myRacesOnBoard(board, 5), ['HU', 'OC', 'NE']);
  assert.deepEqual(myRacesOnBoard(board, null), []);
});

test('the close names each open series it deletes', () => {
  const board = {
    brackets: [
      { division_id: 9, name: 'Bracket 1', lower_bound: 0, open_series: null },
      { division_id: 8, name: 'Bracket 2', lower_bound: 1450, open_series: { series_id: 3, side1: { name: 'Kestrin' }, side2: { name: 'Sablefen' } } },
    ],
  };
  assert.deepEqual(openSeriesRows(board), [
    { division_id: 8, name: 'Bracket 2', side1: { name: 'Kestrin' }, side2: { name: 'Sablefen' } },
  ]);
});

test('the strip cuts are the bounds of every bracket but the weakest, ascending', () => {
  assert.deepEqual(cutsOf({ brackets: BRACKETS }), [1450, 1600]);
  assert.deepEqual(cutsOf({ brackets: [BRACKETS[2]] }), []);
  assert.deepEqual(cutsOf(null), []);
});

test('the bounds write keeps 0 on the weakest bracket and opens each other at its cut', () => {
  assert.deepEqual(boundsOf({ brackets: BRACKETS }, [1400, 1700]), [
    { division_id: 9, lower_bound: 0 },
    { division_id: 8, lower_bound: 1400 },
    { division_id: 7, lower_bound: 1700 },
  ]);
  // the cuts read back from the board write the board unchanged
  const board = { brackets: BRACKETS };
  assert.deepEqual(boundsOf(board, cutsOf(board)).map((b) => b.lower_bound), [0, 1450, 1600]);
});

test('the strip holds one dot per rated race row, from every seat, series and the unplaced strip', () => {
  const board = {
    unplaced: [{ entrant_id: 50, user_id: 5, name: 'Eve', race: 'HU', mmr: null }, { entrant_id: 60, user_id: 6, name: 'Fay', race: 'NE', mmr: 1300 }],
    brackets: [
      {
        division_id: 9, lower_bound: 0,
        king: seat(1, 'Ann', [row(10, 'HU', 1400)]),
        queue: [seat(2, 'Bob', [row(20, 'OC', 1100), row(21, 'UD', null)])],
        open_series: { side1: { entrant_id: 10, user_id: 1, name: 'Ann', race: 'HU', mmr: 1400 }, side2: { entrant_id: 30, user_id: 3, name: 'Cid', race: 'NE', mmr: 1200 } },
      },
      { division_id: 7, lower_bound: 1600, king: null, queue: [seat(4, 'Dan', [row(40, 'HU', 1700)])], open_series: null },
    ],
  };
  assert.deepEqual(ratedPlayers(board).map((p) => [p.entrant_id, p.user_id, p.name, p.mmr]), [
    [10, 1, 'Ann', 1400],
    [20, 2, 'Bob', 1100],
    [30, 3, 'Cid', 1200],
    [40, 4, 'Dan', 1700],
    [60, 6, 'Fay', 1300],
  ]);
  assert.deepEqual(ratedPlayers(null), []);
});

test('a player who left on two races reads one row, holding both of them', () => {
  const left = [
    { entrant_id: 21, user_id: 3, name: 'Kaldris', race: 'OC', mmr: 1402 },
    { entrant_id: 22, user_id: 3, name: 'Kaldris', race: 'UD', mmr: 1188 },
    { entrant_id: 23, user_id: 4, name: 'Sablefen', race: 'HU', mmr: 1310 },
    { entrant_id: 24, user_id: null, name: 'Guest', race: 'NE', mmr: null },
  ];
  const seats = leftSeats({ left });
  assert.deepEqual(seats.map((seat) => seat.name), ['Kaldris', 'Sablefen', 'Guest']);
  assert.deepEqual(seats[0].rows.map((row) => row.entrant_id), [21, 22]);
  assert.equal(seats[0].race, null);
  assert.equal(seats[0].mmr, null);
  assert.equal(seats[1].race, 'HU');
  assert.deepEqual(seats[2].rows.map((row) => row.entrant_id), [24]);
  assert.deepEqual(leftSeats(null), []);
});


test('historical brackets preserve source order and categorical labels', () => {
  const brackets = [{ name: 'Platinum to 1700 MMR', lower_bound: null }, { name: '1500 to ~1700 MMR', lower_bound: 1500 }, { name: 'Gold and below', lower_bound: null }];
  assert.deepEqual(orderedBrackets({ historical: true, brackets }), brackets);
});
