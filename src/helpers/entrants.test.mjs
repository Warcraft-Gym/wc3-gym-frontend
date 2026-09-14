import { test } from 'node:test';
import assert from 'node:assert/strict';
import { bandNames, bySeed, bySignup, cutsOf, divisionsPayload, entrantMmr, entrantName, groupByDivision, mergeSeeds, rostersByEntrant, seedPayload, signupCount, teamRoster, warningLabel } from './entrants.mjs';

const DIVISIONS = [
  { id: 9, position: 1, name: 'Pro', lower_bound: 1600 },
  { id: 8, position: 2, name: 'Open', lower_bound: null },
];
const rows = [
  { id: 1, seed: 2, mmr: 1700, division_id: 9, user: { name: 'Grubbstep' } },
  { id: 2, seed: 1, mmr: 1650, division_id: 9, user: { name: 'Kaelthas' } },
  { id: 3, seed: null, mmr: 1400, division_id: 8, user: { name: 'Wispy' } },
  { id: 4, seed: null, mmr: 1500, division_id: null, team: { name: 'Wolves' } },
];

test('a warning reads as the reason, with the number the event set', () => {
  assert.equal(warningLabel('under_min_games', { min_games: 20 }), 'under 20 games');
  assert.equal(warningLabel('under_min_games', {}), 'under the game count');
  assert.equal(warningLabel('over_mmr_max', { mmr_max: 1800 }), 'over the MMR cap');
  assert.equal(warningLabel('banned'), 'banned');
});

test('a team entrant reads by its team, a player by his name', () => {
  assert.equal(entrantName(rows[3]), 'Wolves');
  assert.equal(entrantName(rows[0]), 'Grubbstep');
});

test('seeded entrants come first in seed order, the rest strongest first', () => {
  assert.deepEqual(bySeed(rows).map((row) => row.id), [2, 1, 4, 3]);
});

test('the groups follow the division order and the unplaced entrants come last', () => {
  const groups = groupByDivision(rows, DIVISIONS);
  assert.deepEqual(groups.map((group) => group.title), ['Pro', 'Open', 'No division']);
  assert.deepEqual(groups[0].rows.map((row) => row.id), [2, 1]);
  assert.deepEqual(groups[2].rows.map((row) => row.id), [4]);
});

test('a division that holds nobody stays, and no group is added when every entrant is placed', () => {
  const groups = groupByDivision([rows[0]], DIVISIONS);
  assert.deepEqual(groups.map((group) => group.rows.length), [1, 0]);
  assert.equal(groups.length, 2);
});

test('the manual seed body names every entrant, division by division', () => {
  assert.deepEqual(seedPayload(groupByDivision(rows, DIVISIONS)), { source: 'manual', order: [2, 1, 3, 4] });
});

test('the manual seed body leaves a withdrawn entrant out of the order', () => {
  const withDrawn = [...rows, { id: 5, seed: null, mmr: 1550, division_id: 9, withdrawn_at: '2026-09-13T00:00:00Z', user: { name: 'Gone' } }];
  assert.deepEqual(seedPayload(groupByDivision(withDrawn, DIVISIONS)), { source: 'manual', order: [2, 1, 3, 4] });
});

test('the seed answer merges in, so a withdrawn entrant keeps its row and loses its seed', () => {
  const withDrawn = [...rows, { id: 5, seed: 3, mmr: 1550, division_id: 9, withdrawn_at: '2026-09-13T00:00:00Z', user: { name: 'Gone' } }];
  const seeded = [{ id: 1, seed: 1 }, { id: 2, seed: 2 }, { id: 3, seed: 1 }, { id: 4, seed: 1 }];
  const merged = mergeSeeds(withDrawn, seeded);
  assert.deepEqual(merged.map((row) => row.id), [1, 2, 3, 4, 5]);
  assert.deepEqual(merged.map((row) => row.seed), [1, 2, 1, 1, null]);
  assert.equal(merged[4].user.name, 'Gone');
});

test('the ascending cuts write divisions strongest first, the weakest without a bound', () => {
  assert.deepEqual(divisionsPayload([1450, 1600], ['Open', 'Pro']), [
    { name: 'Pro', lower_bound: 1600 },
    { name: 'Open', lower_bound: 1450 },
    { name: 'Division 3', lower_bound: null },
  ]);
});

test('the strip reads the stored divisions back as ascending cuts and names', () => {
  assert.deepEqual(cutsOf(DIVISIONS), [1600]);
  assert.deepEqual(bandNames(DIVISIONS), ['Open', 'Pro']);
  assert.deepEqual(cutsOf([{ lower_bound: null }, { lower_bound: null }]), []);
});

const WOLVES = {
  id: 5,
  captains_by_season: { 31: [{ id: 4, name: 'Alpha' }] },
  player_by_season: {
    31: [{ id: 4, name: 'Alpha', signup_race: 'HU' }, { id: 7, name: 'Bravo' }],
  },
};

test('a team entrant draws its roster, the captain marked and each on his race', () => {
  const roster = teamRoster(WOLVES, 31);
  assert.deepEqual(roster.map((seat) => seat.player.name), ['Alpha', 'Bravo']);
  assert.deepEqual(roster.map((seat) => seat.captain), [true, false]);
  assert.deepEqual(roster.map((seat) => seat.race), ['HU', undefined]);
});

test('a team with no roster for this event draws none', () => {
  assert.deepEqual(teamRoster(WOLVES, 30), []);
  assert.deepEqual(teamRoster(undefined, 31), []);
});

test('a row is rated by the read, and by the seed once the read rates it no longer', () => {
  assert.equal(entrantMmr({ mmr: 1700, mmr_at_seed: 1650 }), 1700);
  assert.equal(entrantMmr({ mmr: null, mmr_at_seed: 1650 }), 1650);
  assert.equal(entrantMmr({}), null);
});

// a coaching session: no seed, no MMR order, a note on two of the rows and one withdrawal
const signups = [
  { id: 12, mmr: 1400, note: 'Human vs orc openings', user: { name: 'Wispy' } },
  { id: 9, mmr: 1900, note: null, user: { name: 'Grubbstep' }, checked_in_at: '2026-09-14T09:00:00Z' },
  { id: 14, mmr: 1600, note: 'Late game micro', user: { name: 'Kaelthas' }, withdrawn_at: '2026-09-13T10:00:00Z' },
];

test('a sign-up list reads in the order people entered, not by MMR', () => {
  assert.deepEqual(bySignup(signups).map((row) => row.user.name), ['Grubbstep', 'Wispy', 'Kaelthas']);
  assert.deepEqual(bySeed(signups).map((row) => row.user.name), ['Grubbstep', 'Kaelthas', 'Wispy']);
  assert.deepEqual(bySignup([]), []);
});

test('the sign-up count reads against the cap, and a withdrawal gives its place back', () => {
  assert.equal(signupCount({ entrant_cap: 8 }, signups), '2 of 8 signed up');
  assert.equal(signupCount({ entrant_cap: 2 }, signups), '2 of 2 signed up');
  assert.equal(signupCount({ entrant_cap: null }, signups), '2 signed up');
  assert.equal(signupCount({ entrant_cap: 8 }, []), '0 of 8 signed up');
  assert.equal(signupCount(null), '0 signed up');
});

test('a team entrant carries the roster its team fields for that event', () => {
  const teams = [
    {
      id: 4,
      player_by_season: { 77: [{ id: 1, name: 'Wispy', signup_race: 'NE' }, { id: 2, name: 'Grubbstep', signup_race: 'OC' }] },
      captains_by_season: { 77: [{ id: 2, name: 'Grubbstep' }] },
    },
    { id: 5, player_by_season: { 88: [{ id: 3, name: 'Kaelthas', signup_race: 'HU' }] } },
  ];
  const entrants = [
    { id: 90, team: { id: 4 } },
    { id: 91, team: { id: 5 } },
    { id: 92, user: { id: 9 } },
  ];
  const rosters = rostersByEntrant(entrants, teams, 77);
  assert.deepEqual(Object.keys(rosters), ['90']);
  assert.deepEqual(rosters[90].map((seat) => [seat.player.name, seat.race, seat.captain]),
    [['Wispy', 'NE', false], ['Grubbstep', 'OC', true]]);
  // the same team rosters again for another event, and reads nobody for one it never entered
  assert.deepEqual(Object.keys(rostersByEntrant(entrants, teams, 88)), ['91']);
  assert.deepEqual(rostersByEntrant([], [], 77), {});
  assert.deepEqual(rostersByEntrant(), {});
});
