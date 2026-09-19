import assert from 'node:assert/strict';
import { test } from 'node:test';

import {
  fixtureRosters, fixtureRows, fixtureScore, modeLabel, pickLabel, rosterSides, sideRoster,
  takesRoster,
} from './fixture.mjs';
import { isLobby } from './stage-view.mjs';

const player = (id, name) => ({ id, name });

// The Clan War template of the Altar of Champions: a drafted 1v1, a drafted 2v2, a 4v4 on
// any pick, a drafted 1v1 and a 1v1 on any pick.
const CLAN_WAR = [
  { id: 11, match_id: 7, sequence: 1, side_size: 1, pick_rule: 'drafted', entrant1_id: 1, entrant2_id: 2, player1_score: 2, player2_score: 0 },
  {
    id: 12, match_id: 7, sequence: 2, side_size: 2, pick_rule: 'drafted', entrant1_id: 1, entrant2_id: 2,
    player1_score: 0, player2_score: 2,
    sides: [
      { side_no: 1, user_id: 51, user: player(51, 'thanks') },
      { side_no: 1, user_id: 52, user: player(52, 'Peterian') },
      { side_no: 2, user_id: 61, user: player(61, 'Barren') },
      { side_no: 2, user_id: 62, user: player(62, 'Shibby') },
    ],
  },
  { id: 13, match_id: 7, sequence: 3, side_size: 4, pick_rule: 'any', entrant1_id: 1, entrant2_id: 2 },
  { id: 14, match_id: 7, sequence: 4, side_size: 1, pick_rule: 'drafted', entrant1_id: 1, entrant2_id: 2 },
  { id: 15, match_id: 7, sequence: 5, side_size: 1, pick_rule: 'any', entrant1_id: 1, entrant2_id: 2 },
];

test('a fixture lists its series in play order with the mode and the pick rule', () => {
  const rows = fixtureRows([...CLAN_WAR].reverse());
  assert.deepEqual(rows.map((row) => row.number), [1, 2, 3, 4, 5]);
  assert.deepEqual(rows.map((row) => row.mode), ['1v1', '2v2', '4v4', '1v1', '1v1']);
  assert.deepEqual(
    rows.map((row) => row.pick),
    ['Drafted', 'Drafted', 'Any pick', 'Drafted', 'Any pick'],
  );
  assert.deepEqual(rows.map((row) => row.scored), [true, true, false, false, false]);
  assert.deepEqual(rows.map((row) => row.winner), [1, 2, null, null, null]);
});

test('a series with no sequence keeps the order it arrives in', () => {
  const rows = fixtureRows([{ id: 3 }, { id: 1 }]);
  assert.deepEqual(rows.map((row) => [row.id, row.number]), [[1, 1], [3, 2]]);
});

test('the mode and the pick rule read a default where the row names none', () => {
  assert.equal(modeLabel(undefined), '1v1');
  assert.equal(modeLabel(4), '4v4');
  assert.equal(pickLabel(null), 'Any pick');
  assert.equal(pickLabel('drafted'), 'Drafted');
});

test('a side names the players it fields, and nobody before a captain writes them', () => {
  assert.deepEqual(sideRoster(CLAN_WAR[1], 1).map((one) => one.name), ['thanks', 'Peterian']);
  assert.deepEqual(sideRoster(CLAN_WAR[1], 2).map((one) => one.name), ['Barren', 'Shibby']);
  assert.deepEqual(sideRoster(CLAN_WAR[2], 1), []);
});

test('the fixture score counts the series each side took', () => {
  assert.deepEqual(fixtureScore(CLAN_WAR), [1, 1]);
  assert.deepEqual(fixtureScore([]), [0, 0]);
});

test('a fixture series that fields more than one player a side takes a roster', () => {
  assert.equal(takesRoster(CLAN_WAR[1]), false, 'a played series is settled');
  assert.equal(takesRoster(CLAN_WAR[2]), true);
  assert.equal(takesRoster(CLAN_WAR[3]), false, 'a 1v1 is drafted, not rostered');
  assert.equal(takesRoster({ side_size: 2 }), false, 'a series outside a fixture takes none');
});

test('a captain names his own side, and an admin either', () => {
  const rosters = {
    1: [{ player: player(51, 'thanks'), captain: true }, { player: player(52, 'Peterian'), captain: false }],
    2: [{ player: player(61, 'Barren'), captain: true }],
  };
  assert.deepEqual(rosterSides(CLAN_WAR[2], rosters, 51, false), [1]);
  assert.deepEqual(rosterSides(CLAN_WAR[2], rosters, 61, false), [2]);
  assert.deepEqual(rosterSides(CLAN_WAR[2], rosters, 52, false), [], 'a member is not a captain');
  assert.deepEqual(rosterSides(CLAN_WAR[2], rosters, null, true), [1, 2]);
  assert.deepEqual(rosterSides(CLAN_WAR[3], rosters, null, true), [], 'a 1v1 takes no roster');
});

test('the roster of each side comes off the team the series names', () => {
  const series = [{ entrant1_id: 1, team1: { id: 8 }, entrant2_id: 2, team2: { id: 9 } }];
  const teams = [
    { id: 8, player_by_season: { 4: [player(51, 'thanks')] }, captains_by_season: { 4: [player(51, 'thanks')] } },
    { id: 9, player_by_season: { 4: [player(61, 'Barren')] }, captains_by_season: { 4: [] } },
  ];
  const rosters = fixtureRosters(series, teams, 4);
  assert.deepEqual(rosters[1].map((seat) => [seat.player.name, seat.captain]), [['thanks', true]]);
  assert.deepEqual(rosters[2].map((seat) => [seat.player.name, seat.captain]), [['Barren', false]]);
});

test('a fixture side roster is not read as a free for all lobby', () => {
  assert.equal(isLobby(CLAN_WAR[1]), false, 'the series names an entrant on each side');
  assert.equal(isLobby({ sides: [{ side_no: 1 }, { side_no: 2 }] }), true, 'a lobby names none');
  assert.equal(isLobby(CLAN_WAR[0]), false, 'a 1v1 writes no side row');
});
