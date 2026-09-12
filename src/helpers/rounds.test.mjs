import { test } from 'node:test';
import assert from 'node:assert/strict';
import { DateTime } from 'luxon';
import { currentRound, roundCards, roundLabel, roundLine, roundOver, roundStateChip, waitingLines } from './rounds.mjs';

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

// The "Waiting for you" card: one line per job the player still owes, over every season
const CARDS = [
  { playday: 1, label: '1 to 7 Sep', over: true, answer: true, series: { id: 11, player1_id: ME, player2: { name: 'Markoo' }, player1_score: 2, player2_score: 0 } },
  { playday: 2, label: '8 to 14 Sep', over: false, current: true, answer: null, series: { id: 12, player2_id: ME, player1: { name: 'Peterian' }, player1_score: null, player2_score: null } },
  { playday: 3, label: '15 to 21 Sep', over: false, answer: null, series: null },
  { playday: 4, label: '22 to 28 Sep', over: false, answer: false, series: null },
  { playday: 5, label: '1 to 7 Aug', over: true, answer: null, series: null },
];

// A season whose round in play is not paired yet: only that round asks the question
const ASK_CARDS = [
  { playday: 2, label: '8 to 14 Sep', over: false, current: true, answer: null, series: null },
  { playday: 3, label: '15 to 21 Sep', over: false, answer: null, series: null },
];

test('the waiting lines name the unscored series and the round in play', () => {
  const lines = waitingLines([
    { season: { id: 4, name: 'GNL Review Season' }, cards: CARDS },
    { season: { id: 5, name: 'GNL Ladder Season' }, cards: ASK_CARDS },
  ], ME);
  assert.deepEqual(lines.map(row => row.text), [
    'Round 2 · GNL Review Season · vs Peterian',
    'Round 2 · GNL Ladder Season · Check in for 8 to 14 Sep',
  ]);
  assert.deepEqual(lines.map(row => row.kind), ['series', 'round']);
  assert.equal(lines[0].series.id, 12);
  assert.equal(lines[1].seasonId, 5);
  assert.equal(lines[1].playday, 2);
});

test('a season that asks nothing still shows its unscored series', () => {
  const lines = waitingLines([{ season: { id: 4, name: 'GNL S18' }, cards: CARDS, asks: false }], ME);
  assert.deepEqual(lines.map(row => row.kind), ['series']);
});

test('nothing waits when every series is played and every open round is answered', () => {
  assert.deepEqual(waitingLines([{ season: { id: 4, name: 'GNL S18' }, cards: [CARDS[0], CARDS[3]] }], ME), []);
  assert.deepEqual(waitingLines([], ME), []);
});

// The check-in window: it opens checkin_days before the round starts and closes with it
const WINDOW_ROUNDS = [
  { playday: 1, start_date: '2026-09-20', end_date: '2026-09-26' },
  { playday: 2, start_date: '2026-09-27', end_date: '2026-10-03' },
];
const windowCards = (today, checkinDays = 3, answers = []) =>
  roundCards({ rounds: WINDOW_ROUNDS, answers, checkinDays }, DateTime.fromISO(today));
const checkinLines = (today, checkinDays = 3, answers = []) => waitingLines(
  [{ season: { id: 5, name: 'GNL Ladder Season' }, cards: windowCards(today, checkinDays, answers) }], ME,
).map(row => row.text);

test('a card carries the day its check-in opens', () => {
  const cards = windowCards('2026-09-22T10:00');
  assert.equal(cards[1].opens.toISO(), '2026-09-24T00:00:00.000Z');
  assert.deepEqual(cards.map(card => card.open), [true, false]);
  // the window closes with the round
  assert.deepEqual(windowCards('2026-09-28T10:00').map(card => card.open), [false, true]);
  // a season that names no checkin_days has no window, so the check-in is always open
  assert.deepEqual(windowCards('2026-09-22T10:00', null).map(card => [card.opens, card.open]), [[null, true], [null, true]]);
});

test('a round asks for a check-in only inside its window', () => {
  // round 2 opens 24 Sep: five days out it asks nothing, three days out it asks
  assert.deepEqual(checkinLines('2026-09-22T10:00'), ['Round 1 · GNL Ladder Season · Check in for 20 to 26 Sep']);
  assert.deepEqual(checkinLines('2026-09-24T10:00'), [
    'Round 1 · GNL Ladder Season · Check in for 20 to 26 Sep',
    'Round 2 · GNL Ladder Season · Check in for 27 Sep to 3 Oct',
  ]);
});

test('an answered round drops out of the check-in lines', () => {
  assert.deepEqual(checkinLines('2026-09-24T10:00', 3, [{ playday: 1, available: true }]), [
    'Round 2 · GNL Ladder Season · Check in for 27 Sep to 3 Oct',
  ]);
});

test('a season without checkin_days asks the round in play, as before', () => {
  assert.deepEqual(checkinLines('2026-09-22T10:00', null), ['Round 1 · GNL Ladder Season · Check in for 20 to 26 Sep']);
});

test('the state chip reads the round before it reads the window', () => {
  // 1 Oct: round 1 is over and unpaired, round 2 is open, and both carry a window
  const [past, open] = windowCards('2026-10-01T10:00');
  assert.equal(roundStateChip(past), 'Not paired');
  assert.equal(roundStateChip(open), 'Not paired yet');
  // before its window a round names the day it opens, but only to the player who checks in
  const [ahead] = windowCards('2026-09-15T10:00');
  assert.equal(roundStateChip(ahead), 'Check-in opens 17 Sep');
  assert.equal(roundStateChip(ahead, false), 'Not paired yet');
  assert.equal(roundStateChip({ ...ahead, answer: true }), 'Checked in');
  assert.equal(roundStateChip({ ...ahead, answer: false }), 'Out');
});
