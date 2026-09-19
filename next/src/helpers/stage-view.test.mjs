import assert from 'node:assert';
import test from 'node:test';

import {
  advancingRows, blocks, buchholz, chainChallengers, chainOrder, columns, drawsByRound,
  generateFields, inDivision, isByeSide, isLobby, layout, lobbySeats, lobbyTargets,
  nextRound, pendingChainSeries, ranking, seriesState, shownPlayer, shownTeam, sideName,
  standingsGroups, standsOn, winnerSide,
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

test('a double elimination draws the upper ladder, the lower ladder and the final apart', () => {
  const made = blocks(columns(DE8, DE8_ROUNDS));
  assert.deepStrictEqual(made.map((block) => block.side), ['upper', 'lower', 'upper']);
  assert.deepStrictEqual(made.map((block) => block.columns.map((column) => column.name)), [
    ['Upper bracket round 1', 'Upper bracket round 2', 'Upper bracket final'],
    ['Lower bracket round 1', 'Lower bracket round 2', 'Lower bracket round 3', 'Lower bracket final'],
    ['Grand final'],
  ]);
  // every block fits a 1136 px card, so no column of the bracket sits off the screen
  assert.ok(made.every((block) => layout(block.columns).width <= 1136));
  // a line is drawn inside a block only, so none of them crosses the column between
  assert.deepStrictEqual(made.map((block) => layout(block.columns).lines.length), [6, 5, 0]);
});

test('a single elimination is one block, third place included', () => {
  const withThird = [...SE9, S(9, 4, 2, ['l', 6], ['l', 7])];
  assert.strictEqual(blocks(columns(SE9, SE9_ROUNDS)).length, 1);
  assert.strictEqual(blocks(columns(withThird, SE9_ROUNDS)).length, 1);
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
  assert.strictEqual(isByeSide(S(1, 1, 1, 7, null), 2), true);
  assert.strictEqual(isByeSide(S(1, 1, 1, 7, null), 1), false);
  // the series read names no side at all, which is a thin payload and not a bye
  assert.strictEqual(isByeSide({ id: 1, player1_score: 2, player2_score: 1 }, 1), false);
});

test('hiding the results takes the name off a fed side, and leaves a first round side alone', () => {
  // the semi final once its quarter final ran: side 1 holds the winner it fed, side 2 an entrant
  const semi = { ...S(9, 2, 1, ['w', 1], 4), player1_id: 1, player1: { id: 1, name: 'P1' } };
  assert.strictEqual(shownPlayer(semi, 1, false).id, 1);
  assert.strictEqual(shownPlayer(semi, 1, true), null);
  assert.strictEqual(shownPlayer(semi, 2, true).id, 4);
  assert.strictEqual(isByeSide(S(1, 1, 1, 7, 2), 2), false);
  assert.strictEqual(isByeSide(S(1, 2, 1, ['w', 1], ['w', 2]), 1), false);
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

test('a stage split into groups reads one table a group, under its division', () => {
  const groups = standingsGroups(
    [{ division_id: 1, division_name: 'Gold', group_no: 2, group_name: 'Group B', rows: [{ position: 1 }] },
      { division_id: 1, division_name: 'Gold', group_no: 1, group_name: 'Group A', rows: [] }],
    [{ id: 1, position: 1 }],
  );
  assert.deepStrictEqual(groups.map((group) => group.label), ['Gold \u00b7 Group A', 'Gold \u00b7 Group B']);
  assert.deepStrictEqual(groups.map((group) => group.key), ['1:1', '1:2']);
  assert.deepStrictEqual(groups.map((group) => group.group_no), [1, 2]);
  // a stage that plays no group keys on the division alone and reads its name
  assert.deepStrictEqual(
    standingsGroups([{ division_id: null, rows: [] }], []).map((group) => [group.key, group.label]),
    [['all:0', 'All entrants']],
  );
});

test('a Swiss stage ranks on Buchholz where it names no rule of its own', () => {
  assert.strictEqual(drawsByRound({ format: 'swiss' }), true);
  assert.strictEqual(drawsByRound({ format: 'round_robin' }), false);
  assert.deepStrictEqual(
    ranking({ format: 'swiss', ranking_rule: 'points,game_diff,head_to_head' }),
    ['points', 'buchholz', 'game_diff', 'head_to_head'],
  );
  // a rule the stage names of its own is read as it stands, on any format
  assert.deepStrictEqual(ranking({ format: 'swiss', ranking_rule: 'points' }), ['points']);
  assert.deepStrictEqual(
    ranking({ format: 'round_robin', ranking_rule: 'points,game_diff,head_to_head' }),
    ['points', 'game_diff', 'head_to_head'],
  );
});

// A Swiss round of four entrants: two pairs, and a bye that names one side only
const SW = (id, round_id, a, b, scores = null) => ({
  id, round_id, sequence: 1, division_id: null, entrant1_id: a, entrant2_id: b,
  player1_score: scores?.[0] ?? null, player2_score: scores?.[1] ?? null,
});

test('Buchholz adds the opponents points, and a bye adds nothing', () => {
  const standings = [{ division_id: 1, rows: [
    { entrant_id: 1, points: 2 }, { entrant_id: 2, points: 1 },
    { entrant_id: 3, points: 1 }, { entrant_id: 4, points: 0 },
  ] }];
  const series = [
    SW(1, 10, 1, 2, [2, 0]), SW(2, 10, 3, 4, [2, 1]),
    SW(3, 11, 1, 3, [2, 1]), SW(4, 11, 2, null, [2, 0]),
  ];
  const sums = buchholz(standings, series);
  // 1 met 2 and 3, 2 met 1 and the bye, 3 met 4 and 1, 4 met 3 alone
  assert.deepStrictEqual([1, 2, 3, 4].map((id) => sums.get(id)), [2, 2, 2, 1]);
  // an unscored series counts for nobody yet
  assert.strictEqual(buchholz(standings, [SW(5, 12, 1, 4)]).get(1), 0);
});

test('the next Swiss round waits for the round before it', () => {
  const stage = { format: 'swiss', swiss_rounds: 3 };
  const drawn = [SW(1, 10, 1, 2, [2, 0]), SW(2, 10, 3, 4, [2, 1])];
  assert.deepStrictEqual(nextRound(stage, [], []), { number: 1, done: false, blocked: null });
  assert.deepStrictEqual(nextRound(stage, drawn, []), { number: 2, done: false, blocked: null });
  const open = [...drawn, SW(3, 11, 1, 3), SW(4, 11, 2, 4)];
  assert.strictEqual(
    nextRound(stage, open, []).blocked,
    'Round 2 is not finished: 2 series carry no result.',
  );
  assert.strictEqual(nextRound(stage, [SW(3, 11, 1, 3)], []).blocked,
    'Round 1 is not finished: 1 series carries no result.');
  // the stage stops once it has drawn every round it plays
  const three = [...drawn, SW(3, 11, 1, 3, [2, 0]), SW(4, 12, 1, 4, [2, 0])];
  assert.strictEqual(nextRound(stage, three, []).done, true);
  assert.strictEqual(nextRound({ format: 'swiss' }, three, []).done, false);
  // a division draws its own rounds, so the count is the rounds the busiest one has drawn
  const split = [{ ...SW(5, 10, 1, 2, [2, 0]), division_id: 1 },
    { ...SW(6, 11, 1, 3, [2, 0]), division_id: 1 },
    { ...SW(7, 10, 5, 6, [2, 0]), division_id: 2 }];
  assert.strictEqual(nextRound(stage, split, [{ id: 1 }, { id: 2 }]).number, 3);
});

test('a division reads only its own series', () => {
  const mixed = [...RR5, { ...S(99, 1, 3, 1, 2), division_id: 2 }];
  assert.strictEqual(inDivision(mixed, 1).length, 10);
  assert.strictEqual(inDivision(mixed, 2).length, 1);
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

test('closing a night takes the unplayed tail of every chain', () => {
  const played = { player1_score: 1, player2_score: 0 };
  const rows = [
    { id: 1, division_id: 7, sequence: 1, ...played },
    { id: 2, division_id: 7, sequence: 2, ...played },
    { id: 3, division_id: 7, sequence: 3 },
    { id: 4, division_id: 8, sequence: 1 },
    { id: 5, division_id: 8, sequence: 2 },
  ];
  const bands = [{ id: 7, position: 1 }, { id: 8, position: 2 }];
  assert.deepStrictEqual(pendingChainSeries(rows, bands).map((row) => row.id), [3, 4, 5]);
  assert.strictEqual(pendingChainSeries(rows.slice(0, 2), bands).length, 0);
  // an event with no divisions closes its one chain
  assert.deepStrictEqual(
    pendingChainSeries([{ id: 9, division_id: null, sequence: 1 }], []).map((row) => row.id),
    [9],
  );
});

test('a challenger is an entrant no series names yet', () => {
  const entrants = [
    { id: 1, user: { id: 11 } },
    { id: 2, user: { id: 12 } },
    { id: 3, user: { id: 13 } },
    { id: 4, user: { id: 14 }, withdrawn_at: '2026-09-14T00:00:00Z' },
  ];
  const rows = [{ id: 1, player1_id: 11, player2_id: null }, { id: 2, player1_id: null, player2_id: 12 }];
  assert.deepStrictEqual(chainChallengers(entrants, rows).map((row) => row.id), [3]);
  assert.deepStrictEqual(chainChallengers(entrants, []).map((row) => row.id), [1, 2, 3]);
});

// A four-team 2v2 cup: every side is a team entrant, so no series names a player.
// The shape follows StageSeriesRow on the backend branch that adds the entrant ids.
const team = (id, name) => ({ id, name });
const T4 = [
  {
    id: 1, round_id: 1, sequence: 1, division_id: 1, result_kind: 'played', side_size: 2,
    entrant1_id: 11, entrant2_id: 14, team1: team(1, 'Night Owls'), team2: team(4, 'Frost Giants'),
    player1_score: 2, player2_score: 1,
  },
  {
    id: 2, round_id: 1, sequence: 2, division_id: 1, result_kind: 'played', side_size: 2,
    entrant1_id: 12, entrant2_id: 13, team1: team(2, 'Ash Wolves'), team2: team(3, 'Sea Kings'),
  },
  {
    id: 3, round_id: 2, sequence: 1, division_id: 1, result_kind: 'played', side_size: 2,
    entrant1_id: 11, team1: team(1, 'Night Owls'),
    slot1_from_series_id: 1, slot2_from_series_id: 2,
  },
];

test('a team side stands on its entrant, so the state of a 2v2 series reads without a player', () => {
  assert.strictEqual(standsOn(T4[0], 1), 11);
  assert.strictEqual(standsOn(T4[0], 2), 14);
  assert.strictEqual(standsOn(T4[2], 2), null);
  // a GNL row names players and no entrant, and reads the same way
  assert.strictEqual(standsOn({ player1_id: 7 }, 1), 7);

  assert.strictEqual(seriesState(T4[0]), 'played');
  assert.strictEqual(seriesState(T4[1]), 'open');
  assert.strictEqual(seriesState(T4[2]), 'pending');
});

test('a padded team side is a bye, and a fed one waits', () => {
  const padded = { id: 4, entrant1_id: 15, team1: team(5, 'Stormcrows') };
  assert.strictEqual(isByeSide(padded, 2), true);
  // side 2 of the final has a feeder, so it is not a bye
  assert.strictEqual(isByeSide(T4[2], 2), false);
});

test('a side is named by its team, and a hidden fed side names nobody', () => {
  assert.strictEqual(sideName(T4[0], 1), 'Night Owls');
  assert.strictEqual(sideName(T4[2], 2), '');
  // a solo side keeps naming its player
  assert.strictEqual(sideName({ player1: { name: 'Grubbstep' } }, 1), 'Grubbstep');
  assert.strictEqual(sideName(null, 1), '');

  assert.deepStrictEqual(shownTeam(T4[0], 1), team(1, 'Night Owls'));
  assert.strictEqual(shownTeam(T4[2], 1, true), null);
  assert.deepStrictEqual(shownTeam(T4[2], 1, false), team(1, 'Night Owls'));
  assert.strictEqual(shownPlayer(T4[0], 1), null);
});

test('a 2v2 bracket draws two columns and joins the final to both first-round series', () => {
  const cols = columns(T4, named('Round 1', 'Final'));
  assert.deepStrictEqual(cols.map((column) => column.name), ['Round 1', 'Final']);
  assert.deepStrictEqual(cols[0].series.map((row) => row.id), [1, 2]);
  const drawn = layout(cols, { boxH: 128 });
  assert.strictEqual(drawn.lines.length, 2);
  assert.strictEqual(drawn.boxes.length, 3);
});

// One free for all lobby: four seats, each an entrant, with the place he took
const seat = (side_no, entrant_id, place = null) => ({
  side_no, entrant_id, user_id: entrant_id, place,
  user: { id: entrant_id, name: `P${entrant_id}`, country: 'de' },
});
const LOBBY = { id: 70, round_id: 1, sides: [seat(1, 11, 3), seat(2, 12, 1), seat(3, 13, 4), seat(4, 14, 2)] };

test('a lobby is a series that seats more than two, a plain series is not', () => {
  assert.equal(isLobby(LOBBY), true);
  assert.equal(isLobby(S(1, 1, 1, 5, 6)), false);
  assert.equal(isLobby({ id: 1, sides: [] }), false);
});

test('a lobby box reads its seats winner first, by the place each took', () => {
  const rows = lobbySeats(LOBBY);
  assert.deepEqual(rows.map((row) => row.side_no), [2, 4, 1, 3]);
  assert.deepEqual(rows.map((row) => row.place), [1, 2, 3, 4]);
  assert.deepEqual(rows.map((row) => row.result), ['won', 'lost', 'lost', 'lost']);
});

test('a lobby nobody placed keeps its seat order and wears no mark', () => {
  const open = { id: 71, sides: [seat(1, 21), seat(2, 22), seat(3, 23)] };
  const rows = lobbySeats(open);
  assert.deepEqual(rows.map((row) => row.side_no), [1, 2, 3]);
  assert.deepEqual(rows.map((row) => row.result), [null, null, null]);
});

test('hidden results give no place away, and the seats stay in seat order', () => {
  const rows = lobbySeats(LOBBY, true);
  assert.deepEqual(rows.map((row) => row.side_no), [1, 2, 3, 4]);
  assert.deepEqual(rows.map((row) => row.place), [null, null, null, null]);
  assert.deepEqual(rows.map((row) => row.result), [null, null, null, null]);
});

test('a lobby is to play once every seat names an entrant, and waits while one is empty', () => {
  assert.equal(seriesState({ id: 72, sides: [seat(1, 31), seat(2, 32)] }), 'open');
  assert.equal(seriesState({ id: 73, sides: [seat(1, 31), { side_no: 2, entrant_id: null }] }), 'pending');
  assert.equal(seriesState({ ...LOBBY, player1_score: 1, player2_score: 0 }), 'played');
});

test('a hidden lobby of a later round names nobody: its seats are the round before it', () => {
  const rows = lobbySeats(LOBBY, true, true);
  assert.deepEqual(rows.map((row) => row.side_no), [1, 2, 3, 4]);
  assert.deepEqual(rows.map((row) => row.user), [null, null, null, null]);
  assert.deepEqual(lobbySeats(LOBBY, true, false).map((row) => row.user?.name),
    ['P11', 'P12', 'P13', 'P14']);
});

test('the move picker holds the division of the lobby, and numbers its lobbies from one', () => {
  const lobby = (id, division_id, sequence) => ({
    id, division_id, round_id: 1, sequence, sides: [seat(1, id * 10), seat(2, id * 10 + 1)],
  });
  const rows = [lobby(1, 7, 1), lobby(2, 7, 2), lobby(3, 8, 1), lobby(4, 8, 2)];
  const targets = lobbyTargets(rows, rows[0]);
  assert.deepEqual(targets.map((item) => item.id), [2]);
  assert.equal(targets[0].label.startsWith('Lobby 2: '), true);
  assert.deepEqual(lobbyTargets(rows, rows[2]).map((item) => item.id), [4]);
  assert.deepEqual(lobbyTargets(rows, rows[2])[0].label.startsWith('Lobby 2: '), true);
});

test('the move picker drops a lobby that is already played', () => {
  const played = {
    id: 9, division_id: null, round_id: 1, sequence: 2, player1_score: 1, player2_score: 0,
    sides: [seat(1, 91, 1), seat(2, 92, 2)],
  };
  const open = { id: 8, division_id: null, round_id: 1, sequence: 1, sides: [seat(1, 81), seat(2, 82)] };
  assert.deepEqual(lobbyTargets([open, played], open), []);
});
