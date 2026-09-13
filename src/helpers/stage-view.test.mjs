import assert from 'node:assert';
import test from 'node:test';

import {
  advancingRows, chainOrder, columns, generateFields, inDivision, isBye, isByeSide,
  layout, seriesState, standingsGroups, winnerSide, winsFor,
} from './stage-view.mjs';

// One planned series. A side is an entrant id, ['w', id] for a feeder's winner,
// ['l', id] for its loser, or null for a padded side that can never fill.
const side = (row, n, value) => {
  if (Array.isArray(value)) {
    row[`slot${n}_from_series_id`] = value[1];
    row[`slot${n}_takes_loser`] = value[0] === 'l';
  } else if (value != null) {
    row[`player${n}_id`] = value;
    row[`player${n}`] = { id: value, name: `P${value}`, country: 'de' };
  }
};
const S = (id, round_id, sequence, slot1, slot2) => {
  const row = { id, round_id, sequence, division_id: 1, result_kind: 'played' };
  side(row, 1, slot1);
  side(row, 2, slot2);
  return row;
};
const named = (...names) => names.map((name, index) => ({ id: index + 1, number: index + 1, name }));

// 9 entrants: one play-in series, then a full eight-slot bracket
const SE9 = [
  S(1, 1, 1, 9, 8),
  S(2, 2, 1, 1, ['w', 1]), S(3, 2, 2, 5, 4), S(4, 2, 3, 3, 6), S(5, 2, 4, 7, 2),
  S(6, 3, 1, ['w', 2], ['w', 3]), S(7, 3, 2, ['w', 4], ['w', 5]),
  S(8, 4, 1, ['w', 6], ['w', 7]),
];
const SE9_ROUNDS = named('Play-in', 'Quarterfinals', 'Semifinals', 'Final');

// 8 entrants, upper then lower then the grand final
const DE8 = [
  S(1, 1, 1, 1, 8), S(2, 1, 2, 5, 4), S(3, 1, 3, 3, 6), S(4, 1, 4, 7, 2),
  S(5, 2, 1, ['w', 1], ['w', 2]), S(6, 2, 2, ['w', 3], ['w', 4]),
  S(7, 3, 1, ['w', 5], ['w', 6]),
  S(8, 4, 1, ['l', 1], ['l', 2]), S(9, 4, 2, ['l', 3], ['l', 4]),
  S(10, 5, 1, ['w', 8], ['l', 5]), S(11, 5, 2, ['w', 9], ['l', 6]),
  S(12, 6, 1, ['w', 10], ['w', 11]),
  S(13, 7, 1, ['w', 12], ['l', 7]),
  S(14, 8, 1, ['w', 7], ['w', 13]),
];
const DE8_ROUNDS = named(
  'Upper bracket round 1', 'Upper bracket round 2', 'Upper bracket final',
  'Lower bracket round 1', 'Lower bracket round 2', 'Lower bracket round 3',
  'Lower bracket final', 'Grand final',
);

// A KOTH chain of 4: the king holds the throne against each challenger in turn
const CHAIN4 = [S(1, 1, 1, 1, 2), S(2, 1, 2, ['w', 1], 3), S(3, 1, 3, ['w', 2], 4)];

// A round robin of 5: five rounds of two series, every pair once
const RR5 = [
  S(1, 1, 1, 2, 5), S(2, 1, 2, 3, 4),
  S(3, 2, 1, 1, 5), S(4, 2, 2, 2, 3),
  S(5, 3, 1, 1, 4), S(6, 3, 2, 5, 3),
  S(7, 4, 1, 1, 3), S(8, 4, 2, 4, 2),
  S(9, 5, 1, 1, 2), S(10, 5, 2, 4, 5),
];
const RR5_ROUNDS = named('Round 1', 'Round 2', 'Round 3', 'Round 4', 'Round 5');

test('single elimination of 9 opens on a play-in column', () => {
  const cols = columns(SE9, SE9_ROUNDS);
  assert.deepStrictEqual(cols.map((column) => column.name),
    ['Play-in', 'Quarterfinals', 'Semifinals', 'Final']);
  assert.deepStrictEqual(cols.map((column) => column.series.length), [1, 4, 2, 1]);
  // the seeds that skipped the play-in enter the quarterfinals with no feeder above them
  assert.strictEqual(SE9[1].slot1_from_series_id, undefined);
  assert.strictEqual(SE9[1].slot2_from_series_id, 1);
  assert.ok(SE9.filter((row) => row.round_id === 2 && !row.slot2_from_series_id).length === 3);
});

test('a bracket draws one line per feeder and keeps the final to the right', () => {
  const drawn = layout(columns(SE9, SE9_ROUNDS));
  assert.strictEqual(drawn.lines.length, 7);
  assert.strictEqual(drawn.boxes.length, 8);
  const final = drawn.boxes.find((box) => box.row.id === 8);
  const semis = drawn.boxes.filter((box) => [6, 7].includes(box.row.id));
  assert.strictEqual(final.x, 3 * 244);
  // the final sits on the middle of the two semifinals it takes
  assert.strictEqual(final.cy, (semis[0].cy + semis[1].cy) / 2);
  // no two boxes of one column overlap
  const first = drawn.boxes.filter((box) => box.column === 1).map((box) => box.cy);
  first.forEach((cy, index) => index && assert.ok(cy - first[index - 1] >= 100));
});

test('double elimination of 8 runs upper, lower and the grand final', () => {
  const cols = columns(DE8, DE8_ROUNDS);
  assert.strictEqual(cols.length, 8);
  assert.deepStrictEqual(cols.map((column) => column.series.length), [4, 2, 1, 2, 2, 1, 1, 1]);
  assert.strictEqual(cols.at(-1).name, 'Grand final');
  const drawn = layout(cols);
  assert.strictEqual(drawn.lines.length, 20);
  // the grand final takes the upper final and the lower final
  const grand = drawn.boxes.find((box) => box.row.id === 14);
  assert.strictEqual(grand.column, 7);
  assert.strictEqual(grand.cy, (drawn.boxes.find((b) => b.row.id === 7).cy
    + drawn.boxes.find((b) => b.row.id === 13).cy) / 2);
});

test('a chain of 4 reads in play order whatever order it arrives in', () => {
  assert.deepStrictEqual(chainOrder([...CHAIN4].reverse()).map((row) => row.id), [1, 2, 3]);
  // every series after the first takes the standing king on side one
  assert.ok(CHAIN4.slice(1).every((row) => row.slot1_from_series_id));
});

test('a round robin of 5 plays every pair once over five rounds', () => {
  const cols = columns(RR5, RR5_ROUNDS);
  assert.strictEqual(cols.length, 5);
  assert.ok(cols.every((column) => column.series.length === 2));
  const pairs = RR5.map((row) => [row.player1_id, row.player2_id].sort().join('v'));
  assert.strictEqual(new Set(pairs).size, 10);
  // a table needs no feeders, so nothing is drawn between its columns
  assert.strictEqual(layout(cols).lines.length, 0);
});

test('the state of a series follows its sides, its score and its kind', () => {
  assert.strictEqual(seriesState(S(1, 1, 1, 1, 2)), 'open');
  assert.strictEqual(seriesState(S(1, 1, 1, ['w', 9], ['w', 8])), 'pending');
  assert.strictEqual(seriesState({ ...S(1, 1, 1, 1, 2), player1_score: 2, player2_score: 0 }), 'played');
  assert.strictEqual(seriesState({
    ...S(1, 1, 1, 1, 2), player1_score: 1, player2_score: 0, result_kind: 'walkover',
  }), 'walkover');
  assert.strictEqual(winnerSide({ ...S(1, 1, 1, 1, 2), player1_score: 0, player2_score: 2 }), 2);
  assert.strictEqual(winnerSide(S(1, 1, 1, 1, 2)), null);
});

test('a padded pair is a bye and passes its one side through', () => {
  assert.strictEqual(isBye(S(1, 1, 1, 7, null)), true);
  assert.strictEqual(isByeSide(S(1, 1, 1, 7, null), 2), true);
  assert.strictEqual(isByeSide(S(1, 1, 1, 7, null), 1), false);
  assert.strictEqual(isBye(S(1, 1, 1, 7, 2)), false);
  assert.strictEqual(isBye(S(1, 2, 1, ['w', 1], ['w', 2])), false);
});

test('standings group by division in division order', () => {
  const groups = standingsGroups(
    [{ division_id: 2, division_name: 'Silver', rows: [{ position: 1 }] },
      { division_id: 1, division_name: 'Gold', rows: [] }],
    [{ id: 1, position: 1 }, { id: 2, position: 2 }],
  );
  assert.deepStrictEqual(groups.map((group) => group.label), ['Gold', 'Silver']);
  assert.strictEqual(groups[1].rows.length, 1);
});

test('a division reads only its own series, and a best-of names its wins', () => {
  const mixed = [...RR5, { ...S(99, 1, 3, 1, 2), division_id: 2 }];
  assert.strictEqual(inDivision(mixed, 1).length, 10);
  assert.strictEqual(inDivision(mixed, 2).length, 1);
  assert.deepStrictEqual([winsFor(1), winsFor(3), winsFor(5)], [1, 2, 3]);
});

// One entrant row of the field the generate dialog counts
const E = (id, division_id, extra = {}) => ({ id, division_id, seed: null, withdrawn_at: null, ...extra });

test('the generate field drops withdrawn entrants and pads only a bracket', () => {
  const rows = [E(1, 1), E(2, 1), E(3, 1), E(4, 1), E(5, 1), E(6, 1, { withdrawn_at: '2026-09-13T00:00:00Z' })];
  const bracket = generateFields(rows, [{ id: 1, position: 1, name: 'Gold' }], 'single_elimination');
  assert.deepStrictEqual(bracket, [{ key: 1, name: 'Gold', entrants: 5, byes: 3 }]);
  assert.strictEqual(generateFields(rows, [], 'round_robin')[0].byes, null);
  assert.strictEqual(generateFields(rows, [], 'koth')[0].byes, null);
  assert.strictEqual(generateFields([], [], 'single_elimination')[0].byes, null);
});

test('the generate field counts the seeded alone once any entrant carries a seed', () => {
  const bands = [{ id: 1, position: 1, name: 'Gold' }, { id: 2, position: 2, name: 'Silver' }];
  const rows = [
    E(1, 1, { seed: 1 }), E(2, 1, { seed: 2 }), E(3, 1), E(4, 1),
    E(5, 2, { seed: 1 }), E(6, 2), E(7, 2), E(8, 2),
  ];
  assert.deepStrictEqual(
    generateFields(rows, bands, 'single_elimination').map((row) => [row.entrants, row.byes]),
    [[2, 0], [1, 0]],
  );
  const unseeded = rows.map((row) => ({ ...row, seed: null }));
  assert.deepStrictEqual(
    generateFields(unseeded, bands, 'single_elimination').map((row) => [row.entrants, row.byes]),
    [[4, 0], [4, 0]],
  );
});

test('a stage with no advance count carries the whole table', () => {
  const table = [{ rows: [{ position: 1 }, { position: 2 }] }, { rows: [{ position: 1 }] }];
  assert.strictEqual(advancingRows(table, null).length, 3);
  assert.strictEqual(advancingRows(table, 1).length, 2);
  assert.strictEqual(advancingRows([{ rows: [] }], null).length, 0);
});
