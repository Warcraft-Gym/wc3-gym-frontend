import { test } from 'node:test';
import assert from 'node:assert/strict';
import { DateTime } from 'luxon';
import { currentRound, roundCards, roundLabel, roundLine, roundOver } from './rounds.mjs';

test('a round is labelled by its window', () => {
  assert.equal(roundLabel({ playday: 1, start_date: '2026-09-13', end_date: '2026-09-19' }), '13 to 19 Sep');
  assert.equal(roundLabel({ playday: 3, start_date: '2026-09-28', end_date: '2026-10-04' }), '28 Sep to 4 Oct');
  assert.equal(roundLabel({ playday: 1, start_date: '2026-09-13', end_date: null }), '13 Sep');
  assert.equal(roundLabel({ playday: 1, start_date: '2026-09-13', end_date: '2026-09-13' }), '13 Sep');
  assert.equal(roundLabel({ playday: 4 }), 'Round 4');
});

test('a round is over the day after its window closes', () => {
  const today = DateTime.fromISO('2026-09-20T10:00');
  assert.equal(roundOver({ start_date: '2026-09-13', end_date: '2026-09-19' }, today), true);
  assert.equal(roundOver({ start_date: '2026-09-13', end_date: '2026-09-20' }, today), false);
  assert.equal(roundOver({ start_date: '2026-09-19', end_date: null }, today), true);
  assert.equal(roundOver({ start_date: '2026-09-20', end_date: null }, today), false);
  assert.equal(roundOver({ playday: 2 }, today), false);
});

const ROUNDS = [
  { playday: 1, start_date: '2026-09-13', end_date: '2026-09-19' },
  { playday: 2, start_date: '2026-09-20', end_date: '2026-09-26' },
  { playday: 3, start_date: '2026-09-27', end_date: '2026-10-03' },
];
const TODAY = DateTime.fromISO('2026-09-22T10:00');

test('a card carries the round, its series and the team faced', () => {
  const cards = roundCards({
    rounds: ROUNDS,
    series: [{ id: 7, match: { playday: 1 }, player1_score: 2, player2_score: 1 }],
    matches: [{ playday: 1, team1_id: 5, team2_id: 6, team1: { name: 'Alpha' }, team2: { name: 'Beta' } }],
    teamId: 5,
    answers: [{ playday: 2, available: false }],
  }, TODAY);

  assert.deepEqual(cards.map(c => [c.playday, c.label, c.over, c.current]), [
    [1, '13 to 19 Sep', true, false],
    [2, '20 to 26 Sep', false, true],
    [3, '27 Sep to 3 Oct', false, false],
  ]);
  assert.equal(cards[0].series.id, 7);
  assert.equal(cards[0].opponentTeam.name, 'Beta');
  assert.equal(cards[1].answer, false);
  assert.equal(cards[2].series, null);
  assert.equal(cards[2].opponentTeam, null);
});

test('a season with no rounds falls back to the weeks of its unplayed series', () => {
  const cards = roundCards({
    series: [
      { id: 1, match: { playday: 2 }, player1_score: null, player2_score: null },
      { id: 2, match: { playday: 1 }, player1_score: 2, player2_score: 0 },
    ],
  }, TODAY);

  assert.deepEqual(cards.map(c => [c.playday, c.label, c.over]), [[2, 'Round 2', false]]);
});

test('the current round is the first one not over, and a round is not a week', () => {
  // three 14-day rounds; the 9th day of the season is still round 1
  const rounds = [
    { playday: 1, start_date: '2026-09-01', end_date: '2026-09-14' },
    { playday: 2, start_date: '2026-09-15', end_date: '2026-09-28' },
    { playday: 3, start_date: '2026-09-29', end_date: '2026-10-12' },
  ];
  assert.equal(currentRound(rounds, DateTime.fromISO('2026-09-09T10:00')).playday, 1);
  assert.equal(currentRound(rounds, DateTime.fromISO('2026-09-16T10:00')).playday, 2);
  assert.equal(currentRound(rounds, DateTime.fromISO('2026-10-13T10:00')), null);
  assert.equal(currentRound([], DateTime.fromISO('2026-09-09T10:00')), null);
});

const ME = 7;
const line = (series, over = false) => roundLine({ series, over }, ME, 'Sat 4 Oct, 20:00');

test('a round line reads the result, the fixture, or nothing while the question is open', () => {
  assert.equal(line({ player1_id: ME, player2: { name: 'Markoo' }, player1_score: 2, player2_score: 1 }), 'Played · won vs Markoo');
  assert.equal(line({ player2_id: ME, player1: { name: 'Scorch' }, player1_score: 2, player2_score: 0 }), 'Played · lost vs Scorch');
  assert.equal(line({ player1_id: ME, player2: { name: 'Markoo' }, player1_score: 1, player2_score: 1 }), 'Played · drew vs Markoo');
  assert.equal(line({ player1_id: ME, player2: { name: 'Markoo' }, player1_score: null, player2_score: null }), 'vs Markoo · Sat 4 Oct, 20:00');
  assert.equal(roundLine({ series: null, over: true }, ME), 'Not paired');
  assert.equal(roundLine({ series: null, over: false }, ME), null);
});
