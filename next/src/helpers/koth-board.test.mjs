import test from 'node:test';
import assert from 'node:assert/strict';
import {
  boundsOf, bracketLabel, canSignUp, foldedStored, storeFolded, streamPollMs, crownedPicks, fixChanges, heirOf, resultSides, cutsOf, defaultPair, hasSeries, leftSeats, movedQueue, myRacesOnBoard, nightStatus, openSeriesRows,
  orderedBrackets, placeInQueue, placeWord, queueIds, ratedPlayers, seatLeft, seatRow, shouldReread, skippedSeat,
  startButton, throneWord, wearsTheCrown, withdrawForfeitsCrown, withdrawForfeitsSeries,
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
  assert.equal(throneWord({ throne: 'moved' }), 'Took the crown');
  assert.equal(throneWord({ throne: 'held' }), 'Defended the crown');
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

test('a race the reader plays at the table stays his, on either side, once each', () => {
  const side = (entrant_id, user_id, race) => ({ entrant_id, user_id, name: 'P', race, mmr: 1200 });
  const board = {
    brackets: [
      { lower_bound: 0, king: seat(5, 'Me', [row(5, 'HU')]), queue: [], open_series: { side1: side(5, 5, 'HU'), side2: side(4, 4, 'UD') } },
      { lower_bound: 1450, king: null, queue: [seat(5, 'Me', [row(8, 'NE')])], open_series: { side1: side(9, 9, 'OC'), side2: side(6, 5, 'OC') } },
    ],
  };
  assert.deepEqual(myRacesOnBoard(board, 5), ['HU', 'NE', 'OC']);
  assert.deepEqual(myRacesOnBoard(board, 4), ['UD']);
});

test('a withdraw forfeits a series only for a race he plays at the table, or with no race named', () => {
  const side = (entrant_id, user_id, race) => ({ entrant_id, user_id, name: 'P', race, mmr: 1200 });
  const board = {
    brackets: [
      { lower_bound: 0, queue: [], open_series: { side1: side(5, 5, 'HU'), side2: side(4, 4, 'UD') } },
      { lower_bound: 1450, queue: [seat(5, 'Me', [row(8, 'NE')]), seat(6, 'Other', [row(9, 'HU')])], open_series: { side1: side(7, 7, 'OC'), side2: side(10, 6, 'OC') } },
    ],
  };
  assert.equal(withdrawForfeitsSeries(board, 5, 'HU'), true); // side1
  assert.equal(withdrawForfeitsSeries(board, 6, 'OC'), true); // side2
  assert.equal(withdrawForfeitsSeries(board, 5, 'NE'), false); // another race of his, in a queue
  assert.equal(withdrawForfeitsSeries(board, 5), true); // no race named, one of his at the table
  assert.equal(withdrawForfeitsSeries(board, 6, 'HU'), false);
  assert.equal(withdrawForfeitsSeries({ brackets: [board.brackets[1]] }, 5), false); // no race named, none at the table
  assert.equal(withdrawForfeitsSeries(board, null), false);
});

test('only the crowned race of the king asks before a move, and every race when the board names none', () => {
  const bracket = { king: seat(5, 'Me', [row(51, 'HU'), row(52, 'OC')]), king_entrant_id: 51, queue: [seat(6, 'Other', [row(61, 'NE')])] };
  assert.equal(wearsTheCrown(bracket, 51), true);
  assert.equal(wearsTheCrown(bracket, 52), false);
  assert.equal(wearsTheCrown(bracket, 61), false); // not the king
  const older = { ...bracket, king_entrant_id: undefined };
  assert.equal(wearsTheCrown(older, 51), true);
  assert.equal(wearsTheCrown(older, 52), true);
  assert.equal(wearsTheCrown({ ...bracket, king: null }, 51), false);
});

test('a withdraw costs the king his next match only when the crowned race leaves him no other race there', () => {
  const night = (king, extra = {}) => ({
    brackets: [
      { lower_bound: 0, king, queue: [], ...extra },
      { lower_bound: 1450, king: null, queue: [seat(5, 'Me', [row(58, 'NE')])] },
    ],
  });
  const alone = night(seat(5, 'Me', [row(51, 'HU')]), { king_entrant_id: 51 });
  assert.equal(withdrawForfeitsCrown(alone, 5, 'HU'), true); // the crowned race alone
  assert.equal(withdrawForfeitsCrown(alone, 5, 'NE'), false); // a race in another bracket
  assert.equal(withdrawForfeitsCrown(alone, 5), true); // no race named takes every row
  const two = night(seat(5, 'Me', [row(51, 'HU'), row(52, 'OC')]), { king_entrant_id: 51 });
  assert.equal(withdrawForfeitsCrown(two, 5, 'HU'), false); // the crown passes to his Orc row
  assert.equal(withdrawForfeitsCrown(two, 5, 'OC'), false); // the other race
  assert.equal(withdrawForfeitsCrown(two, 5), true);
  const older = night(seat(5, 'Me', [row(51, 'HU'), row(52, 'OC')]));
  assert.equal(withdrawForfeitsCrown(older, 5, 'HU'), true); // no crowned row named: any race of a king
  assert.equal(withdrawForfeitsCrown(older, 5, 'OC'), true);
  assert.equal(withdrawForfeitsCrown(older, 5, 'NE'), false);
  assert.equal(withdrawForfeitsCrown(two, 6, 'HU'), false);
  assert.equal(withdrawForfeitsCrown(two, null), false);
});

test('a return to the tab reads the board again only 15 seconds after the last read', () => {
  assert.equal(shouldReread(1000, 1000 + 14000), false);
  assert.equal(shouldReread(1000, 1000 + 16000), true);
});

test('a visitor signs up only while signups stand open on a night open to anyone', () => {
  const visitor = { signedIn: false, signupsOpen: true, policy: 'anyone', signedUp: false, multiEntry: true, heldCount: 0, raceCount: 5 };
  assert.equal(canSignUp(visitor), true);
  assert.equal(canSignUp({ ...visitor, signupsOpen: false }), false);
  assert.equal(canSignUp({ ...visitor, policy: 'members' }), false);
});

test('a signed-in player signs up while a race is left to enter', () => {
  const player = { signedIn: true, signupsOpen: true, policy: 'anyone', signedUp: true, multiEntry: true, heldCount: 5, raceCount: 5 };
  assert.equal(canSignUp(player), false);
  assert.equal(canSignUp({ ...player, heldCount: 1 }), true);
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

test('a row that is a side of a series tonight, open or played, in any bracket, stays on the record', () => {
  const side = (entrant_id, user_id, name) => ({ entrant_id, user_id, name, race: 'HU', mmr: 1200 });
  const board = {
    brackets: [
      {
        division_id: 9, lower_bound: 0, queue: [], open_series: null,
        played: [{ series_id: 1, winner: side(10, 1, 'Ann'), loser: side(20, 2, 'Bob'), winner_side: 1, throne: 'moved' }],
        left: [side(20, 2, 'Bob'), side(40, 4, 'Dan')],
      },
      { division_id: 8, lower_bound: 1450, queue: [], played: [], open_series: { series_id: 2, side1: side(30, 3, 'Cid'), side2: side(50, 5, 'Eve') } },
    ],
  };
  assert.equal(hasSeries(board, 20), true); // the loser of a played series, now under Left tonight
  assert.equal(hasSeries(board, 10), true); // the winner of a played series
  assert.equal(hasSeries(board, 50), true); // a side of the open series in another bracket
  assert.equal(hasSeries(board, 40), false); // left before any series
  assert.equal(hasSeries({ brackets: [] }, 20), false);
  assert.equal(hasSeries(null, 20), false);
});

test('a night reads closed once closed, not started while no series exists before its start, else running', () => {
  const now = Date.parse('2026-10-03T12:00:00Z');
  const night = (extra) => ({ closed: false, starts_at: '2026-10-04T00:00:00Z', series_count: 0, ...extra });
  assert.equal(nightStatus(night({ closed: true }), now), 'closed');
  assert.equal(nightStatus(night(), now), 'not_started');
  assert.equal(nightStatus(night({ series_count: 1 }), now), 'running'); // a series before the start
  assert.equal(nightStatus(night({ starts_at: '2026-10-03T08:00:00Z' }), now), 'running'); // the start has passed
  assert.equal(nightStatus(night({ starts_at: null }), now), 'running');
  assert.equal(nightStatus(null, now), 'running');
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

test('a race that left while the player still stands here shows in his seat, not in the list', () => {
  const bracket = {
    king: seat(1, 'Duskrell', [row(10, 'HU')]),
    queue: [seat(3, 'Kaldris', [row(21, 'OC')]), seat(4, 'Sablefen', [row(23, 'HU')])],
    left: [
      { entrant_id: 22, user_id: 3, name: 'Kaldris', race: 'UD', mmr: 1188 },
      { entrant_id: 11, user_id: 1, name: 'Duskrell', race: 'NE', mmr: 1300 },
      { entrant_id: 25, user_id: 5, name: 'Fennow', race: 'OC', mmr: 1250 },
      { entrant_id: 26, user_id: 5, name: 'Fennow', race: 'HU', mmr: 1240 },
    ],
  };
  assert.deepEqual(leftSeats(bracket).map((one) => one.name), ['Fennow']);
  assert.deepEqual(leftSeats(bracket)[0].rows.map((one) => one.race), ['OC', 'HU']);
  assert.deepEqual(seatLeft(bracket, bracket.queue[0]).map((one) => one.entrant_id), [22]);
  assert.deepEqual(seatLeft(bracket, bracket.king).map((one) => one.entrant_id), [11]);
  assert.deepEqual(seatLeft(bracket, bracket.queue[1]), []);
  assert.deepEqual(seatLeft(bracket, null), []);
});

test('a player seated in one bracket still reads in the list of another bracket he left', () => {
  const one = { queue: [seat(3, 'Kaldris', [row(21, 'OC')])], left: [] };
  const two = { queue: [], left: [{ entrant_id: 22, user_id: 3, name: 'Kaldris', race: 'UD', mmr: 1188 }] };
  assert.deepEqual(leftSeats(one), []);
  assert.deepEqual(leftSeats(two).map((one) => one.rows.map((r) => r.entrant_id)), [[22]]);
  assert.deepEqual(seatLeft(one, one.queue[0]), []);
});


test('historical brackets preserve source order and categorical labels', () => {
  const brackets = [{ name: 'Platinum to 1700 MMR', lower_bound: null }, { name: '1500 to ~1700 MMR', lower_bound: 1500 }, { name: 'Gold and below', lower_bound: null }];
  assert.deepEqual(orderedBrackets({ historical: true, brackets }), brackets);
});

const fixSeat = (user_id, name) => ({ user_id, name, rows: [] });
const result = (series_id, winner, loser, throne) => ({ series_id, winner: { name: winner }, loser: { name: loser }, throne });
const fixBoard = (king, queue, played) => ({ brackets: [{ division_id: 7, king, queue, played }] });

test("fixChanges names a throne that passes and the loser sent to the end", () => {
  const shibby = fixSeat(1, "EAShibby"), thanks = fixSeat(2, "thanks"), third = fixSeat(3, "Degrand");
  const before = fixBoard(shibby, [thanks, third], [result(12, "EAShibby", "thanks", "moved"), result(11, "thanks", "EAShibby", "moved")]);
  const after = fixBoard(thanks, [third, shibby], [result(12, "thanks", "EAShibby", "held"), result(11, "thanks", "EAShibby", "moved")]);
  assert.deepEqual(fixChanges(before, after, 7, 12).map((line) => line.text), [
    "The throne passes from EAShibby to thanks.",
    "EAShibby goes to the end of the queue.",
  ]);
});

test("fixChanges lists the crown marks a removal turns and keeps a throne that stays", () => {
  const shibby = fixSeat(1, "EAShibby"), thanks = fixSeat(2, "thanks");
  const before = fixBoard(shibby, [thanks], [result(13, "EAShibby", "thanks", "moved"), result(12, "thanks", "EAShibby", "held"), result(11, "thanks", "EAShibby", "moved"), result(10, "EAShibby", "thanks", "moved")]);
  const after = fixBoard(shibby, [thanks], [result(13, "EAShibby", "thanks", "moved"), result(12, "thanks", "EAShibby", "moved"), result(10, "EAShibby", "thanks", "moved")]);
  assert.deepEqual(fixChanges(before, after, 7, 11), [
    { text: "The throne stays with EAShibby." },
    { text: "Series 3, thanks beat EAShibby", was: "holds the crown", now: "takes the crown" },
  ]);
});

test("fixChanges answers nothing when the fix moves nothing else", () => {
  const shibby = fixSeat(1, "EAShibby"), thanks = fixSeat(2, "thanks");
  const before = fixBoard(shibby, [thanks], [result(11, "thanks", "EAShibby", "moved"), result(10, "EAShibby", "thanks", "moved")]);
  const after = fixBoard(shibby, [thanks], [result(11, "thanks", "EAShibby", "moved")]);
  assert.deepEqual(fixChanges(before, after, 7, 10), []);
  assert.deepEqual(fixChanges(before, after, 99, 10), []);
});

test("heirOf offers the newest winner an empty throne, while he stands in line", () => {
  const winner = { entrant_id: 41, name: "EAShibby" };
  const bracket = { king: null, played: [{ winner }, { winner: { entrant_id: 9, name: "thanks" } }], queue: [{ rows: [{ entrant_id: 40 }, { entrant_id: 41 }] }] };
  assert.equal(heirOf(bracket), winner);
  assert.equal(heirOf({ ...bracket, king: { user_id: 1 } }), null);
  assert.equal(heirOf({ ...bracket, queue: [{ rows: [{ entrant_id: 40 }] }] }), null);
  assert.equal(heirOf({ ...bracket, played: [] }), null);
});

test("resultSides lists every race row of the king and the line once, marking a player on two races", () => {
  const bracket = {
    king: { user_id: 1, name: "EAShibby", rows: [{ entrant_id: 10, race: "OC" }, { entrant_id: 11, race: "RDM" }] },
    queue: [{ user_id: 2, name: "thanks", rows: [{ entrant_id: 20, race: "NE" }] }],
  };
  assert.deepEqual(resultSides(bracket).map((row) => [row.entrant_id, row.name, row.several]), [
    [10, "EAShibby", true],
    [11, "EAShibby", true],
    [20, "thanks", false],
  ]);
  assert.deepEqual(resultSides(null), []);
});

test("fixChanges names the place a deposed king takes back in the queue", () => {
  const king = fixSeat(1, "ThePeasant"), happy = fixSeat(2, "Happy"), moon = fixSeat(3, "Moon"), elder = fixSeat(4, "Elder");
  const before = fixBoard(king, [happy, moon, elder], []);
  const after = fixBoard(happy, [moon, king, elder], [result(9, "Happy", "ThePeasant", "moved")]);
  assert.deepEqual(fixChanges(before, after, 7, -1).map((line) => line.text), [
    "The throne passes from ThePeasant to Happy.",
    "ThePeasant goes back in the queue at place 2.",
  ]);
});

test("crownedPicks plays each king on the race row that wears the crown", () => {
  const king = { user_id: 5, name: "Fortitude", rows: [{ entrant_id: 7, race: "HU" }, { entrant_id: 8, race: "UD" }] };
  const board = { brackets: [{ king, king_entrant_id: 8 }, { king: null, king_entrant_id: null }] };
  const picks = crownedPicks(board);
  assert.equal(seatRow(king, picks).entrant_id, 8);
  assert.equal(Object.keys(picks).length, 1);
  assert.deepEqual(crownedPicks(null), {});
});

test("streamPollMs reads every 30 s in play, every 5 min before the first series, and stops", () => {
  const start = Date.parse("2026-10-04T02:00:00Z");
  const night = { closed: false, starts_at: "2026-10-04T02:00:00Z", series_count: 0 };
  assert.equal(streamPollMs(night, start - 3600000), 300000);
  assert.equal(streamPollMs({ ...night, series_count: 4 }, start + 3600000), 30000);
  assert.equal(streamPollMs({ ...night, series_count: 4 }, start + 25 * 3600000), null);
  assert.equal(streamPollMs({ ...night, closed: true, series_count: 4 }, start), null);
  assert.equal(streamPollMs({ ...night, starts_at: null, series_count: 1 }, start), 30000);
  assert.equal(streamPollMs(null, start), null);
});

test('a folded part holds alone, and a blocked storage shows every part', () => {
  const kept = new Map();
  const fake = { getItem: (k) => kept.get(k) ?? null, setItem: (k, v) => kept.set(k, v) };
  storeFolded('Bracket 1:queue', true, fake);
  storeFolded('Bracket 2:results', true, fake);
  assert.equal(foldedStored('Bracket 1:queue', fake), true);
  assert.equal(foldedStored('Bracket 1:results', fake), false);
  storeFolded('Bracket 1:queue', false, fake);
  assert.equal(foldedStored('Bracket 1:queue', fake), false);
  assert.equal(foldedStored('Bracket 2:results', fake), true);
  const blocked = { getItem: () => { throw new Error('blocked'); }, setItem: () => { throw new Error('blocked'); } };
  assert.equal(foldedStored('Bracket 1:queue', blocked), false);
  assert.doesNotThrow(() => storeFolded('Bracket 1:queue', true, blocked));
});
