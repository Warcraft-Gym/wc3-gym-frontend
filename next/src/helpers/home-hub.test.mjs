import { test } from 'node:test';
import assert from 'node:assert/strict';
import { DateTime } from 'luxon';
import { PANEL_ORDER, captainRow, homeRounds, openSignups, ownScore, ownSeries, rowContext, seasonFixtures, seasonState, seriesWhen, teamMatch } from './home-hub.mjs';

test('an open signup comes first, then the games, the upcoming series, the upcoming events, fantasy and the stats', () => {
  assert.deepEqual(PANEL_ORDER, { signup: 1, games: 2, next: 3, upcoming: 4, fantasy: 5, stats: 6 });
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
  assert.equal(rowContext({ league: 'GNL', event: 'Season 19', stage: null, round: 'Round 3' }), 'GNL · Season 19 · Round 3');
  assert.equal(rowContext({ league: 'GNL', event: 'GNL S18', round: 'Round 1' }), 'GNL S18 · Round 1');
  assert.equal(rowContext({ event: 'Autumn Cup', stage: 'Group stage', round: 'Round 2' }), 'Autumn Cup · Group stage · Round 2');
  assert.equal(rowContext({}), '');
});

test('a scored series with no time never had one written down', () => {
  const now = DateTime.fromISO('2026-09-21T12:00:00Z');
  assert.equal(seriesWhen({ date_time: null, player1_score: 2, player2_score: 0 }, now), 'Not recorded');
});

test('an unscored series with no time is still waiting on a booking', () => {
  const now = DateTime.fromISO('2026-09-21T12:00:00Z');
  assert.equal(seriesWhen({ date_time: null, player1_score: null, player2_score: null }, now), 'No time booked');
});

test('the member is on a team, waiting for the draft, or not in the current season', () => {
  assert.equal(seasonState({ id: 20, team: { id: 3 }, signed_up: true }), 'playing');
  assert.equal(seasonState({ id: 20, team: null, signed_up: true }), 'waiting');
  assert.equal(seasonState({ id: 20, team: null, signed_up: false }), 'not_in');
  assert.equal(seasonState(undefined), 'not_in');
});

test('the rounds to play come first in order, the rounds played after, the most recent first', () => {
  const cards = [1, 2, 3, 4, 5].map((playday) => ({ playday, over: playday <= 2 }));
  const { ahead, played } = homeRounds(cards);
  assert.deepEqual(ahead.map((card) => card.playday), [3, 4, 5]);
  assert.deepEqual(played.map((card) => card.playday), [2, 1]);
});

test("the current season's fixtures go to My Season and every other event's draft to Upcoming Series", () => {
  const matches = [{ match_id: 7, playday: 1 }, { match_id: 1, playday: 2 }];
  const events = [
    { id: 19, name: 'Season 19', captain_fixture: { match_id: 1, playday: 2 }, captain_matches: matches },
    { id: 40, name: 'Cup', captain_fixture: { match_id: 2, playday: 1 }, captain_matches: [] },
    { id: 41, name: 'Open', captain_fixture: null, captain_matches: [] },
  ];
  assert.deepEqual(seasonFixtures(events, 19), { matches, others: [{ match_id: 2, playday: 1, event: 'Cup' }] });
  // a season id read as text still finds its row
  assert.deepEqual(seasonFixtures(events, '19').matches, matches);
  assert.deepEqual(seasonFixtures(events, null).others.map((row) => row.event), ['Season 19', 'Cup']);
  assert.deepEqual(seasonFixtures(undefined, 19), { matches: [], others: [] });
});

test('a fully published season round keeps its fixture on Home', () => {
  // the round is published, so the draft row has walked on; the list still holds it
  const events = [{ id: 19, captain_fixture: null, captain_matches: [{ match_id: 7, playday: 1, published: 4 }] }];
  assert.deepEqual(seasonFixtures(events, 19).matches.map((row) => row.match_id), [7]);
  // a row from before the list falls back to the one fixture still to draft
  assert.deepEqual(seasonFixtures([{ id: 19, captain_fixture: { match_id: 8 } }], 19).matches, [{ match_id: 8 }]);
  assert.deepEqual(seasonFixtures([{ id: 19, captain_fixture: null }], 19).matches, []);
});

test("a team match names the other team, how far its series are, and the match page", () => {
  const fixture = { match_id: 31, team1: { id: 4 }, team2: { id: 9 }, series_per_round: 4, published: 0, drafted: 0, played: 0 };
  assert.deepEqual(teamMatch(fixture, 4), { opponent: { id: 9 }, status: 'No series published yet', to: '/match/31' });
  assert.equal(teamMatch(fixture, 9).opponent.id, 4);
  assert.equal(teamMatch(fixture, null).opponent, null);
  assert.equal(teamMatch({ ...fixture, drafted: 3 }, 4).status, 'No series published yet · 3 in draft');
  assert.equal(teamMatch({ ...fixture, published: 2, drafted: 1 }, 4).status, '2 of 4 published · 1 in draft · 0 played');
  assert.equal(teamMatch({ ...fixture, published: 4, played: 1 }, 4).status, '4 of 4 published · 1 played');
  assert.equal(teamMatch({ ...fixture, published: 4, played: 4 }, 4).status, '4 of 4 published · all played');
  assert.equal(teamMatch(null, 4), null);
});
