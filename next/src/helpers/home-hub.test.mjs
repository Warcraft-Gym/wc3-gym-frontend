import { test } from 'node:test';
import assert from 'node:assert/strict';
import { DateTime } from 'luxon';
import { captainRow, openSignups, ownScore, ownSeries, panelOrder, rowContext, seriesWhen } from './home-hub.mjs';

test('a member with no series of his own reads the open signups first', () => {
  assert.deepEqual(panelOrder(true), { own: 1, next: 2, signup: 3, board: 4, cast: 5 });
  assert.deepEqual(panelOrder(false), { signup: 1, board: 2, own: 3, next: 4, cast: 5 });
});

test('a series already under way reads the time it started', () => {
  const now = DateTime.fromISO('2026-09-20T20:00Z').toLocal();
  const at = (value) => DateTime.fromISO(value, { zone: 'utc' }).toLocal();
  assert.equal(seriesWhen({ date_time: '2026-09-20T19:00:00Z' }, now), `Started ${at('2026-09-20T19:00:00Z').toFormat('HH:mm')}`);
  assert.equal(seriesWhen({ date_time: '2026-09-21T19:00:00Z' }, now), at('2026-09-21T19:00:00Z').toFormat('ccc d LLL, HH:mm'));
  assert.equal(seriesWhen({ date_time: null }, now), 'No time booked');
  assert.equal(seriesWhen(null, now), 'No time booked');
});

test('the open signups are the rows a member may still enter, leave or check in to, by event start', () => {
  const rows = [
    { id: 1, action: 'sign_up', start: '2026-11-09' },
    { id: 2, action: 'withdraw', signups_open: true, start: '2026-09-28' },
    { id: 3, action: 'withdraw', signups_open: false, start: '2026-09-01' },
    { id: 4, action: 'check_in', joined: true, start: '2026-09-02' },
    { id: 5, action: 'sign_up', start: '2026-09-21' },
  ];
  // a check-in opens once the signups close, so the row keeps its place on the panel
  assert.deepEqual(openSignups(rows).map((row) => row.id), [4, 5, 2, 1]);
});

test('the own panel takes the next round to play and the last round played', () => {
  const series = [
    { id: 1, player1_id: 7, player2_id: 8, player1_score: 2, player2_score: 0, match: { playday: 1 } },
    { id: 2, player1_id: 9, player2_id: 7, player1_score: 1, player2_score: 2, match: { playday: 2 } },
    { id: 3, player1_id: 7, player2_id: 5, player1_score: null, player2_score: null, match: { playday: 3 } },
    { id: 4, player1_id: 7, player2_id: 4, player1_score: null, player2_score: null, match: { playday: 4 } },
    { id: 5, player1_id: 1, player2_id: 2, player1_score: null, player2_score: null, match: { playday: 3 } },
  ];
  const { next, last } = ownSeries(series, 7);
  assert.equal(next.id, 3);
  assert.equal(last.id, 2);
  assert.deepEqual(ownSeries([], 7), { next: null, last: null });
});

test('a result reads the viewer his own score first', () => {
  const series = { player1_id: 7, player2_id: 8, player1_score: 2, player2_score: 1 };
  assert.deepEqual(ownScore(series, 7), { text: '2 – 1', won: true, lost: false, label: 'Won 2 – 1' });
  assert.deepEqual(ownScore(series, 8), { text: '1 – 2', won: false, lost: true, label: 'Lost 1 – 2' });
  assert.equal(ownScore({ player1_score: null, player2_score: null }, 7), null);
  assert.equal(ownScore(null, 7), null);
});

test('a captain fixture names its round and how much of it is drafted', () => {
  const today = DateTime.fromISO('2026-09-20T10:00');
  const fixture = { match_id: 29, playday: 4, round_start: '2026-09-28', series_per_round: 3, drafted: 0 };
  assert.deepEqual(captainRow(fixture, today), {
    when: 'Round 4 opens Mon 28 Sep',
    drafted: 'No pairing drafted yet',
    to: '/match/29',
  });
  const running = captainRow({ ...fixture, round_start: '2026-09-14', drafted: 2 }, today);
  assert.equal(running.when, 'Round 4');
  assert.equal(running.drafted, '2 of 3 pairings drafted');
  assert.equal(captainRow(null, today), null);
});

test('a home series row names its league once', () => {
  assert.equal(rowContext({ league: 'GNL', event: 'Season 19', stage: null, round: 'Round 3' }), 'GNL - Season 19 - Round 3');
  assert.equal(rowContext({ league: 'GNL', event: 'GNL S18', round: 'Round 1' }), 'GNL S18 - Round 1');
  assert.equal(rowContext({ event: 'Autumn Cup', stage: 'Group stage', round: 'Round 2' }), 'Autumn Cup - Group stage - Round 2');
  assert.equal(rowContext({}), '');
});
