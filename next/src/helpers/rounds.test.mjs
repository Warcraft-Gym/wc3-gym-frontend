import { test } from 'node:test';
import assert from 'node:assert/strict';
import { DateTime, Settings } from 'luxon';
import { checkinLine, currentRound, roundCards, roundEnd, roundEndLine, roundLabel, roundOver, roundStateChip, sitOutUndo, waitingLines, nextAnswer } from './rounds.mjs';

// The locale names the zone: "GMT+2" for Berlin and "EDT" for New York in en-US, where en-GB reads "CEST" and "GMT-4"
Settings.defaultLocale = 'en-US';

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

test('a card lists every series of its round, the first one leading', () => {
  const [first, second] = roundCards({
    rounds: ROUNDS.slice(0, 2),
    series: [
      { id: 7, match: { playday: 1 } },
      { id: 8, match: { playday: 2 } },
      { id: 9, match: { playday: 1 } },
    ],
  }, TODAY);
  assert.deepEqual(first.seriesList.map((s) => s.id), [7, 9]);
  assert.equal(first.series.id, 7);
  assert.deepEqual(second.seriesList.map((s) => s.id), [8]);
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
    'GNL Review Season - Round 2 - vs Peterian',
    'GNL Ladder Season - Round 2 - Check in for 8 to 14 Sep',
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

// The check-in window as the server sends it for a season with no zone: from 3 days before a
// round until the round ends at midnight UTC
const WINDOW_ROUNDS = [
  { playday: 1, start_date: '2026-09-20', end_date: '2026-09-26', checkin_opens_at: '2026-09-17T00:00:00Z', checkin_closes_at: '2026-09-27T00:00:00Z' },
  { playday: 2, start_date: '2026-09-27', end_date: '2026-10-03', checkin_opens_at: '2026-09-24T00:00:00Z', checkin_closes_at: '2026-10-04T00:00:00Z' },
];
// A season that opens its check-in from sign-up sends no opening
const OPEN_ROUNDS = WINDOW_ROUNDS.map((round) => ({ ...round, checkin_opens_at: null }));
const windowCards = (today, rounds = WINDOW_ROUNDS, answers = []) =>
  roundCards({ rounds, answers }, DateTime.fromISO(today));
const checkinLines = (today, rounds = WINDOW_ROUNDS, answers = []) => waitingLines(
  [{ season: { id: 5, name: 'GNL Ladder Season' }, cards: windowCards(today, rounds, answers) }], ME,
).map(row => row.text);
// The reader's clock, for the lines that name a time
const inZone = (zone, check) => {
  const was = Settings.defaultZone;
  Settings.defaultZone = zone;
  try {
    check();
  } finally {
    Settings.defaultZone = was;
  }
};

test('a card carries the day its check-in opens', () => {
  const cards = windowCards('2026-09-22T10:00');
  assert.equal(cards[1].opens.toISO(), '2026-09-24T00:00:00.000Z');
  assert.deepEqual(cards.map(card => card.open), [true, false]);
  // the window closes with the round
  assert.deepEqual(windowCards('2026-09-28T10:00').map(card => card.open), [false, true]);
  // a season that sends no opening is open from sign-up
  assert.deepEqual(windowCards('2026-09-22T10:00', OPEN_ROUNDS).map(card => [card.opens, card.open]), [[null, true], [null, true]]);
});

test('a round asks for a check-in only inside its window', () => {
  // round 2 opens 24 Sep: five days out it asks nothing, three days out it asks
  assert.deepEqual(checkinLines('2026-09-22T10:00'), ['GNL Ladder Season - Round 1 - Check in for 20 to 26 Sep']);
  assert.deepEqual(checkinLines('2026-09-24T10:00'), [
    'GNL Ladder Season - Round 1 - Check in for 20 to 26 Sep',
    'GNL Ladder Season - Round 2 - Check in for 27 Sep to 3 Oct',
  ]);
});

test('an answered round drops out of the check-in lines', () => {
  assert.deepEqual(checkinLines('2026-09-24T10:00', WINDOW_ROUNDS, [{ playday: 1, available: true }]), [
    'GNL Ladder Season - Round 2 - Check in for 27 Sep to 3 Oct',
  ]);
});

test('a card whose answers are still being read is pending and asks nothing', () => {
  const cards = roundCards({ rounds: WINDOW_ROUNDS }, DateTime.fromISO('2026-09-24T10:00'));
  assert.deepEqual(cards.map(card => [card.pending, card.answer]), [[true, null], [true, null]]);
  assert.deepEqual(waitingLines([{ season: { id: 5, name: 'GNL Ladder Season' }, cards }], ME), []);
  // an answer that has arrived, empty or not, ends the pending state and asks again
  assert.deepEqual(windowCards('2026-09-24T10:00').map(card => card.pending), [false, false]);
  assert.equal(checkinLines('2026-09-24T10:00').length, 2);
});

test('a season open from sign-up asks the round in play', () => {
  assert.deepEqual(checkinLines('2026-09-22T10:00', OPEN_ROUNDS), ['GNL Ladder Season - Round 1 - Check in for 20 to 26 Sep']);
});

test('the state chip reads the round before it reads the window', () => {
  // 1 Oct: round 1 is over and unpaired, round 2 is open, and both carry a window
  const [past, open] = windowCards('2026-10-01T10:00');
  assert.equal(roundStateChip(past), 'Not paired');
  assert.equal(roundStateChip(open), 'No answer');
  assert.equal(roundStateChip(open, false), 'Not paired yet');
  // before its window a round names when it opens on the reader's clock, but only to the player who checks in
  const [ahead] = windowCards('2026-09-15T10:00');
  inZone('Europe/Berlin', () => assert.equal(roundStateChip(ahead), 'Check-in opens 17 Sep 2026, 02:00 GMT+2'));
  assert.equal(roundStateChip(ahead, false), 'Not paired yet');
  assert.equal(roundStateChip({ ...ahead, answer: true }), 'Checked in');
  assert.equal(roundStateChip({ ...ahead, answer: false }), 'Out');
});

test('a derived answer reads as out through the blocked times', () => {
  const [card] = roundCards(
    { rounds: WINDOW_ROUNDS, answers: [{ playday: 1, available: false, blocked_out: true, set_by_user_id: null }] },
    DateTime.fromISO('2026-09-22T10:00'),
  );
  assert.equal(card.blocked, true);
  assert.equal(card.setBy, null);
  assert.equal(roundStateChip(card), 'Out (blocked times)');
  // a stored answer is not derived, and names who set it
  const [stored] = roundCards(
    { rounds: WINDOW_ROUNDS, answers: [{ playday: 1, available: false, set_by_user_id: 9, set_by_name: 'Peterian' }] },
    DateTime.fromISO('2026-09-22T10:00'),
  );
  assert.equal(stored.blocked, false);
  assert.equal(stored.setBy, 'Peterian');
  assert.equal(roundStateChip(stored), 'Out');
});

test('early check-in takes an answer before the window opens', () => {
  const ahead = DateTime.fromISO('2026-09-15T10:00');
  assert.deepEqual(roundCards({ rounds: WINDOW_ROUNDS, answers: [] }, ahead).map(c => c.takes), [false, false]);
  const early = roundCards({ rounds: WINDOW_ROUNDS, answers: [], earlyCheckin: true }, ahead);
  assert.deepEqual(early.map(c => c.takes), [true, true]);
  // the line under the buttons still names when the window opens
  assert.equal(roundStateChip(early[0]), 'No answer');
  inZone('UTC', () => assert.equal(checkinLine(early[0]), 'Check-in opens 17 Sep 2026, 00:00 UTC'));
  // a round that is over takes no answer, early check-in or not
  assert.deepEqual(
    roundCards({ rounds: WINDOW_ROUNDS, answers: [], earlyCheckin: true }, DateTime.fromISO('2026-10-04T10:00')).map(c => c.takes),
    [false, false],
  );
});

test("a card reads the server's window and works none out of checkin_days", () => {
  // opens 2 hours before the round starts and closes 30 minutes before it, which no day count gives
  const rounds = [{ playday: 1, start_date: '2026-09-20', end_date: '2026-09-26', checkin_opens_at: '2026-09-19T22:00:00Z', checkin_closes_at: '2026-09-19T23:30:00Z' }];
  const at = (iso) => roundCards({ rounds, answers: [], checkinDays: 3 }, DateTime.fromISO(iso))[0];
  assert.deepEqual(['2026-09-17T12:00:00Z', '2026-09-19T22:30:00Z', '2026-09-19T23:45:00Z'].map((iso) => at(iso).takes), [false, true, false]);
  // closed early, the round is still in play but takes no answer
  const shut = at('2026-09-20T10:00:00Z');
  assert.deepEqual([shut.over, shut.current, shut.open, shut.takes], [false, true, false, false]);
  assert.equal(roundCards({ rounds, answers: [], earlyCheckin: true }, DateTime.fromISO('2026-09-20T10:00:00Z'))[0].takes, false);
  inZone('UTC', () => {
    assert.equal(checkinLine(at('2026-09-17T12:00:00Z')), 'Check-in opens 19 Sep 2026, 22:00 UTC');
    assert.equal(checkinLine(at('2026-09-19T22:30:00Z')), 'Check-in closes 19 Sep 2026, 23:30 UTC');
    assert.equal(roundStateChip(shut), 'Check-in closed 19 Sep 2026, 23:30 UTC');
  });
  // a close at the round's end is the round's end line, not a check-in line
  inZone('UTC', () => assert.equal(checkinLine(windowCards('2026-09-22T10:00')[0]), ''));
});

test('a season with no zone ends its rounds at midnight UTC, as the server does', () => {
  // 26 Sep 20:00 UTC is 27 Sep 04:00 in Perth, and round 1 still runs until 27 Sep 00:00 UTC
  inZone('Australia/Perth', () => {
    const cards = roundCards({ rounds: WINDOW_ROUNDS, answers: [] }, DateTime.fromISO('2026-09-26T20:00:00Z'));
    assert.deepEqual(cards.map((card) => [card.over, card.current, card.takes]), [[false, true, true], [false, false, true]]);
  });
});

test("a round of an event with no zone ends at 00:00 UTC, on the reader's clock too", () => {
  const end = roundEnd({ playday: 1, start_date: '2026-09-20', end_date: '2026-09-26' }, 'utc');
  assert.equal(roundEndLine(end, null, 'America/New_York'), 'Ends 27 Sep 00:00 UTC · 26 Sep 20:00 EDT your time');
  assert.equal(roundEndLine(end, null, 'UTC'), 'Ends 27 Sep 00:00 UTC');
  assert.equal(roundEndLine(end, null), 'Ends 27 Sep 00:00 UTC');
});

test('a round ends at midnight in the event zone', () => {
  const round = { playday: 1, start_date: '2026-09-20', end_date: '2026-09-26' };
  // 27 Sep 00:00 in Berlin is 26 Sep 15:00 in Los Angeles
  const end = roundEnd(round, 'Europe/Berlin');
  assert.equal(roundEndLine(end, 'Europe/Berlin', 'America/Los_Angeles'), 'Ends 27 Sep 00:00 Europe/Berlin · 26 Sep 15:00 PDT your time');
  assert.equal(roundEndLine(end, 'Europe/Berlin', 'Europe/Berlin'), 'Ends 27 Sep 00:00 Europe/Berlin');
  assert.equal(roundEndLine(roundEnd({ playday: 2 }, 'Europe/Berlin'), 'Europe/Berlin'), '');
  // the zone decides when the round is over: Berlin midnight has passed, Los Angeles has three hours left
  const midnight = DateTime.fromISO('2026-09-26T22:30Z');
  assert.equal(roundOver(round, midnight, 'Europe/Berlin'), true);
  assert.equal(roundOver(round, midnight, 'America/Los_Angeles'), false);
});

test('pressing a round button sets that answer, and pressing the answer it holds clears it', () => {
  assert.equal(nextAnswer(null, true), true);
  assert.equal(nextAnswer(false, true), true);
  assert.equal(nextAnswer(true, true), null);
  assert.equal(nextAnswer(false, false), null);
});

test('the way back from sitting out restores each round it turned out, and counts the rounds the ask named', () => {
  const before = [
    { playday: 1, available: true },
    { playday: 2, available: false, blocked_out: true },
    { playday: 4, available: false },
  ];
  const after = [1, 2, 3, 4, 5].map((playday) => ({ playday, available: false }));
  // round 5 holds a series, so the ask kept it; the write turned it out all the same
  const cards = [{ playday: 5, series: { id: 1 } }];
  const { rounds, count } = sitOutUndo(before, after, cards);
  // round 4 was out already, and the derived out of round 2 goes back to no answer
  assert.deepEqual(rounds, [
    { playday: 1, available: true },
    { playday: 2, available: null },
    { playday: 3, available: null },
    { playday: 5, available: null },
  ]);
  assert.equal(count, 2);
});
