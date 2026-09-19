import test from 'node:test';
import assert from 'node:assert/strict';
import { DateTime } from 'luxon';
import { actsForSeries, needsVeto, seriesContext, seriesSteps } from './series-actions.mjs';

const ME = 9;
const OPEN = { id: 12, player1_id: ME, player2_id: 4, player1_score: null, player2_score: null };
const NOW = DateTime.fromISO('2026-09-20T10:00:00Z');
const stateOf = (series, viewer = { id: ME }) =>
  Object.fromEntries(seriesSteps(series, viewer, NOW).steps.map((step) => [step.step, step.state]));

test('the steps run schedule, veto, report and name the next one', () => {
  assert.deepEqual(stateOf(OPEN), { schedule: 'next', veto: 'later', report: 'later' });
  assert.equal(seriesSteps(OPEN, { id: ME }, NOW).next, 'schedule');
});

test('a booked time offers the veto step next', () => {
  const booked = { ...OPEN, date_time: '2026-09-22T18:00:00Z' };
  assert.deepEqual(stateOf(booked), { schedule: 'done', veto: 'next', report: 'later' });
  assert.equal(seriesSteps(booked, { id: ME }, NOW).next, 'veto');
});

test('a time that has passed asks for the result, veto or no veto', () => {
  const played = { ...OPEN, date_time: '2026-09-19T18:00:00Z' };
  assert.equal(seriesSteps(played, { id: ME }, NOW).next, 'report');
  assert.deepEqual(stateOf(played), { schedule: 'done', veto: 'later', report: 'next' });
});

test('both picks finish the veto step', () => {
  const vetoed = { ...OPEN, date_time: '2026-09-22T18:00:00Z', player1_pick_map: 'Echo Isles', player2_pick_map: 'Terenas' };
  assert.deepEqual(stateOf(vetoed), { schedule: 'done', veto: 'done', report: 'next' });
  // a step it has taken keeps its own button word, so no button is named after a date or a state
  assert.deepEqual(seriesSteps(vetoed, { id: ME }, NOW).steps.map((step) => step.label), ['Schedule', 'Veto maps', 'Report result']);
});

test('a reported series has no step left to take', () => {
  const scored = { ...OPEN, player1_score: 2, player2_score: 1 };
  assert.equal(seriesSteps(scored, { id: ME }, NOW).next, null);
  assert.equal(seriesSteps(scored, { id: ME }, NOW).steps.find((step) => step.step === 'report').label, 'Edit result');
  assert.deepEqual(stateOf(scored), { schedule: 'not needed', veto: 'not needed', report: 'done' });
  // a step it did take keeps its state, so the bar still names the time it was played at
  assert.deepEqual(stateOf({ ...scored, date_time: '2026-09-22T18:00:00Z' }),
    { schedule: 'done', veto: 'not needed', report: 'done' });
});

test('the veto step is needed whenever a game draws its map from the board', () => {
  assert.equal(needsVeto({}), true); // the default rules pick with the loser rule
  assert.equal(needsVeto({ rules: { map_rules: 'fixed,loser,loser' } }), true);
  assert.equal(needsVeto({ rules: { map_rules: 'veto,veto,veto' } }), true);
  assert.equal(needsVeto({ rules: { map_rules: 'fixed,host,host' } }), false);
  assert.deepEqual(stateOf({ ...OPEN, rules: { map_rules: 'fixed,host,host' } }), {
    schedule: 'next', veto: 'not needed', report: 'later',
  });
});

test('the two players, a captain of a side and an admin may act', () => {
  assert.equal(actsForSeries(OPEN, { id: ME }), true);
  assert.equal(actsForSeries(OPEN, { id: 4 }), true);
  assert.equal(actsForSeries(OPEN, { id: 77 }), false);
  // an admin who plays no side acts, on the same routes as the two players
  assert.equal(actsForSeries(OPEN, { id: 77, isAdmin: true }), true);
  assert.equal(actsForSeries(OPEN, {}), false);
  // a side that names no player is its team, so the API answers for the member of the roster
  assert.equal(actsForSeries({ id: 3, entrant1_id: 8 }, { id: 77 }), true);
  assert.equal(actsForSeries({ id: 3, entrant1_id: 8 }, {}), false);
  // both sides named: the captain of the team that fields one acts, a member of it does not
  const named = { id: 3, match: { id: 5 }, player1_id: 1, player2_id: 2, entrant1_id: 8, team1: { id: 21 } };
  assert.equal(actsForSeries(named, { id: 77 }), false);
  assert.equal(actsForSeries(named, { id: 77, seats: [{ team_id: 21, season_id: 19 }] }), true);
  assert.equal(actsForSeries(named, { id: 77, seats: [{ team_id: 22, season_id: 19 }] }), false);
});

test('a captain of a fixture team acts for the side his team fields, in that event alone', () => {
  const fixture = { ...OPEN, match: { id: 5, team1_id: 21, team2_id: 22, season_id: 19 } };
  assert.equal(actsForSeries(fixture, { id: 77, seats: [{ team_id: 21, season_id: 19 }] }), true);
  assert.equal(actsForSeries(fixture, { id: 77, seats: [{ team_id: 22, season_id: 19 }] }), true);
  // a seat of the same team in another event reaches nothing, and neither does a seat of a third team
  assert.equal(actsForSeries(fixture, { id: 77, seats: [{ team_id: 21, season_id: 18 }] }), false);
  assert.equal(actsForSeries(fixture, { id: 77, seats: [{ team_id: 23, season_id: 19 }] }), false);
  assert.equal(actsForSeries(fixture, { id: 77 }), false);
});

test('the context label skips a part the series names no value for', () => {
  const series = { ...OPEN, player2: { name: 'Scorch' }, match: { playday: 2, season: { league_short_name: 'GNL', name: 'Season 19' } } };
  assert.equal(seriesContext(series, { playerId: ME }), 'GNL - Season 19 - Round 2 - vs Scorch');
  assert.equal(seriesContext(series, { playerId: ME, stage: { name: 'Regular season' } }),
    'GNL - Season 19 - Regular season - Round 2 - vs Scorch');
  assert.equal(seriesContext(series), 'GNL - Season 19 - Round 2');
  // the series page titles the event, so its eyebrow leaves the event out
  assert.equal(seriesContext(series, { event: false, playerId: ME }), 'Round 2 - vs Scorch');
  // an event named after its own league says it once
  assert.equal(seriesContext({ match: { playday: 2, season: { league_short_name: 'GNL', name: 'GNL S18' } } }), 'GNL S18 - Round 2');
  assert.equal(seriesContext(series, { playerId: 77 }), 'GNL - Season 19 - Round 2');
  assert.equal(seriesContext({ ...OPEN, player2: { name: 'Scorch' } }, { playerId: ME, round: 4 }), 'Round 4 - vs Scorch');
  assert.equal(seriesContext(OPEN, { playerId: ME, round: 4 }), 'Round 4 - vs your opponent');
});
