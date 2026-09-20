import test from 'node:test';
import assert from 'node:assert/strict';
import { foldNight, myNight, myRaces, nightState, openNight } from './koth.mjs';

test('the night is the newest published event that is not finished', () => {
  const events = [
    { id: 1, starts_at: '2026-09-14T18:00:00Z', phase: 'signups_open' },
    { id: 2, starts_at: '2026-09-15T18:00:00Z', phase: 'finished' },
    { id: 3, starts_at: '2026-09-13T18:00:00Z', phase: 'running' },
    { id: 4, starts_at: '2026-09-16T18:00:00Z', published: false, phase: 'draft' },
  ];
  assert.equal(openNight(events).id, 1);
});

test('no open night reads as null', () => {
  assert.equal(openNight([{ id: 2, phase: 'finished' }]), null);
  assert.equal(openNight([]), null);
});

test('events with no instant fall back to the start day, then to the newest id', () => {
  const events = [
    { id: 5, start_date: '2026-09-12', phase: 'running' },
    { id: 9, start_date: '2026-09-12', phase: 'running' },
  ];
  assert.equal(openNight(events).id, 9);
});

// the KOTH rows of GET /me/events, beside the other kinds the same read answers
const rows = [
  { kind: 'cup', id: 20, name: 'Autumn Cup', start: '2026-10-12', phase: 'signups_open', action: 'sign_up' },
  { kind: 'koth', id: 14, name: 'Night 14', league_short_name: 'KOTH', start: '2026-10-09', end: '2026-10-09', phase: 'signups_open', joined: false, action: 'sign_up' },
  { kind: 'koth', id: 11, name: 'Night 13', start: '2026-10-02', phase: 'finished', action: 'view' },
];

test('the member read gives up one night, the newest one still open', () => {
  assert.equal(myNight(rows).id, 14);
  assert.equal(myNight(rows.filter((row) => row.kind !== 'koth')), null);
  assert.equal(myNight([]), null);
});

test("the races are the caller's own live entrant rows", () => {
  const entrants = [
    { id: 1, user: { id: 7 }, race: 'HU' },
    { id: 2, user: { id: 7 }, race: 'NE' },
    { id: 3, user: { id: 7 }, race: 'OC', withdrawn_at: '2026-10-09T10:00:00Z' },
    { id: 4, user: { id: 9 }, race: 'UD' },
    { id: 5, team: { id: 2 }, race: null },
  ];
  assert.deepEqual(myRaces(entrants, 7), ['HU', 'NE']);
  assert.deepEqual(myRaces(entrants, 9), ['UD']);
  assert.deepEqual(myRaces([], 7), []);
});

test('a night he has not entered leads the events list as a row of its own', () => {
  const history = [{ id: 4, kind: 'gnl', label: 'GNL S18', series: [] }];
  const [night, ...rest] = foldNight(history, myNight(rows), ['HU']);
  assert.equal(night.id, 14);
  assert.equal(night.label, 'KOTH · Night 14');
  assert.equal(night.kindLabel, 'KOTH');
  assert.deepEqual(night.races, ['HU']);
  assert.equal(night.night.action, 'sign_up');
  assert.equal(night.season.start_date, '2026-10-09');
  assert.deepEqual([night.wins, night.losses, night.series, night.ladder, night.placing], [0, 0, [], null, null]);
  assert.deepEqual(rest.map((row) => row.id), [4]);
});

test('a night he entered rides on his own history row instead of doubling it', () => {
  const history = [{ id: 14, kind: 'koth', label: 'KOTH · Night 14', wins: 2, losses: 1, series: [{ id: 3 }] }];
  const night = { ...myNight(rows), joined: true, action: 'withdraw', starts_at: '2026-10-09T18:00:00Z' };
  const folded = foldNight(history, night, ['NE']);
  assert.equal(folded.length, 1);
  assert.equal(folded[0].season.starts_at, '2026-10-09T18:00:00Z');
  assert.deepEqual([folded[0].wins, folded[0].losses], [2, 1]);
  assert.deepEqual(folded[0].races, ['NE']);
  assert.equal(folded[0].night.action, 'withdraw');
});

test('no night leaves the events list as it was', () => {
  const history = [{ id: 4, kind: 'gnl' }];
  assert.equal(foldNight(history, null), history);
});

test('a night reads finished only once the admin closed it', () => {
  // the event read calls a night with a past start finished; only `closed_at` ends a night
  assert.equal(nightState({ phase: 'finished', closed_at: null }), 'running');
  assert.equal(nightState({ phase: 'finished', closed_at: '2026-09-19T22:00:00Z' }), 'finished');
  assert.equal(nightState({ phase: 'signups_open', closed_at: null }), 'signups_open');
  assert.equal(nightState({ state: 'finished', closed_at: null }), 'running');
  assert.equal(nightState(null), null);
});
