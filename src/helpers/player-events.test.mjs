import { test } from 'node:test';
import assert from 'node:assert/strict';

import { eventRows, nextSeries, openRowId, ordinal, placing } from './player-events.mjs';

test('an ordinal names the place a reader says out loud', () => {
  assert.deepEqual([1, 2, 3, 4, 11, 12, 13, 21, 102].map(ordinal),
    ['1st', '2nd', '3rd', '4th', '11th', '12th', '13th', '21st', '102nd']);
});

test('a placing carries the field it was won in, and no placing reads null', () => {
  assert.equal(placing({ place: 3, team_count: 12 }), '3rd of 12');
  assert.equal(placing({ place: 1 }), '1st');
  assert.equal(placing({ place: null, team_count: 12 }), null);
});

test('the next series is the soonest unplayed one, a timeless one last', () => {
  const series = [
    { id: 1, date_time: '2026-09-20T18:00:00Z', player1_score: 2, player2_score: 0 },
    { id: 2, date_time: null, player1_score: null, player2_score: null },
    { id: 3, date_time: '2026-09-22T18:00:00Z', player1_score: null, player2_score: null },
  ];
  assert.equal(nextSeries(series).id, 3);
  assert.equal(nextSeries([series[0]]), null);
  assert.equal(nextSeries(), null);
});

const history = {
  events: [
    {
      season_id: 18, season_name: 'Season 18', league_short_name: 'GNL', kind: 'gnl',
      team_id: 4, team_name: 'Stone Wolves', played: 6, won: 4, lost: 2, place: 2, team_count: 10, running: true,
    },
    {
      season_id: 21, season_name: 'Autumn Cup', league_short_name: null, kind: 'cup',
      team_id: null, team_name: null, played: 3, won: 2, lost: 1, place: null, team_count: null, running: false,
    },
  ],
};
const player = {
  signup_seasons: [{ id: 18, signup_race: 'UD' }],
  trophies: [{ season_id: 18 }],
};
const seasons = [{ id: 18, name: 'Season 18', phase: 'commenced', round_count: 7 }];

test('every kind of event answers one row, newest first', () => {
  const rows = eventRows({ history, player, seasons });
  assert.deepEqual(rows.map((row) => [row.id, row.kind, row.label]), [
    [21, 'cup', 'Autumn Cup'],
    [18, 'gnl', 'GNL · Season 18'],
  ]);
});

test('a GNL row keeps its team, race, record and season row', () => {
  const [, gnl] = eventRows({ history, player, seasons });
  assert.equal(gnl.team, 'Stone Wolves');
  assert.equal(gnl.teamId, 4);
  assert.equal(gnl.race, 'UD');
  assert.deepEqual([gnl.wins, gnl.losses], [4, 2]);
  assert.equal(gnl.champion, true);
  assert.equal(gnl.running, true);
  assert.equal(gnl.season.phase, 'commenced');
  assert.equal(gnl.placing, '2nd of 10');
  assert.equal(gnl.kindLabel, 'GNL season');
});

test('a cup row stands without a season row, a team or a signup race', () => {
  const [cup] = eventRows({ history, player, seasons });
  assert.equal(cup.season.name, 'Autumn Cup');
  assert.equal(cup.team, null);
  assert.equal(cup.race, null);
  assert.equal(cup.placing, null);
  assert.equal(cup.kindLabel, 'Cup');
  assert.deepEqual(cup.series, []);
  assert.equal(cup.next, null);
});

test('the series and ladder reads land on the row of their own event', () => {
  const unplayed = { id: 9, date_time: '2026-10-01T18:00:00Z', player1_score: null, player2_score: null };
  const rows = eventRows({
    history,
    player,
    seasons,
    seriesByEvent: { 21: [unplayed] },
    ladderByEvent: { 18: { points: 12 } },
  });
  const [cup, gnl] = rows;
  assert.equal(cup.next.id, 9);
  assert.equal(gnl.ladder.points, 12);
  assert.equal(cup.ladder, null);
});

test('an empty history draws no row', () => {
  assert.deepEqual(eventRows(), []);
  assert.deepEqual(eventRows({ history: {}, player: {} }), []);
});

test('a running cup never takes the open slot from a running season', () => {
  const running = {
    events: [
      { season_id: 12, season_name: 'Review Season', league_short_name: 'GNL', kind: 'gnl' },
      { season_id: 30, season_name: 'Autumn Cup', kind: 'cup' },
    ],
  };
  const phases = [
    { id: 12, name: 'Review Season', phase: 'commenced' },
    { id: 30, name: 'Autumn Cup', phase: 'commenced' },
  ];
  const rows = eventRows({ history: running, seasons: phases });
  assert.equal(rows[0].kind, 'cup');
  assert.equal(openRowId(rows), 12);
});

test('no running season leaves the open slot empty', () => {
  const rows = eventRows({ history, player, seasons: [{ id: 18, phase: 'complete' }] });
  assert.equal(openRowId(rows), null);
  assert.equal(openRowId(), null);
});
