import test from 'node:test';
import assert from 'node:assert/strict';
import process from 'node:process';

import { blankForm, createPayload, divisionsPayload, eventPayload, gameRules, stagesPayload, stepProblem, wizardProblem } from './event-wizard.mjs';

process.env.TZ = 'Australia/Sydney';  // UTC+10, so a wall time and its stored instant differ

test('a new event inherits the league it is opened from', () => {
  assert.equal(blankForm({ id: 4, entrant_kind: 'team' }).league_id, 4);
  assert.equal(blankForm({ id: 4, entrant_kind: 'team' }).entrant_kind, 'team');
  assert.equal(blankForm({ id: 4, entrant_kind: 'drafted_teams' }).entrant_kind, 'solo');
  assert.equal(blankForm().league_id, null);
});

test('a start date and a typed time are stored as the UTC instant they name', () => {
  const body = eventPayload({
    ...blankForm({ id: 3 }),
    name: ' Autumn cup ',
    start_date: new Date(2026, 9, 1),
    start_time: '19:00',
    region: ' Europe ',
    page_url: '',
  });
  assert.equal(body.name, 'Autumn cup');
  assert.equal(body.start_date, '2026-10-01');
  assert.equal(body.end_date, null);
  assert.equal(body.starts_at, '2026-10-01T09:00:00');
  assert.equal(body.region, 'Europe');
  assert.equal(body.page_url, null);
  assert.equal(body.description, null);
});

test('the new event fields ride along, and a blank number is nothing', () => {
  const body = eventPayload({ ...blankForm({ id: 1 }), parent_id: 9, signup_policy: 'anyone', entrant_cap: '32' });
  assert.equal(body.parent_id, 9);
  assert.equal(body.signup_policy, 'anyone');
  assert.equal(body.entrant_cap, 32);
  assert.equal(body.mmr_max, null);
  assert.equal(body.min_games, null);
  assert.equal(body.checkin_days, null);  // check-in is off, so its window is not sent
  assert.ok(!('min_games_seasons' in body));  // the API has no such field
});

test('check-in sends its window and a games floor sends its count', () => {
  const body = eventPayload({ ...blankForm(), checkin_enabled: true, checkin_days: 2, min_games: '20' });
  assert.equal(body.checkin_days, 2);
  assert.equal(body.min_games, 20);
});

test('a map rule writes one word per game, and a veto runs once for the series', () => {
  for (const bestOf of [1, 3, 5]) {
    assert.equal(gameRules('veto', bestOf), ['veto', ...Array(bestOf - 1).fill('loser')].join(','));
    assert.equal(gameRules('fixed', bestOf), Array(bestOf).fill('fixed').join(','));
    assert.equal(gameRules('loser', bestOf), Array(bestOf).fill('loser').join(','));
    assert.equal(gameRules('host', bestOf), Array(bestOf).fill('host').join(','));
  }
  assert.equal(gameRules('veto', 1), 'veto');
  assert.equal(gameRules('veto', 3), 'veto,loser,loser');
  assert.equal(gameRules('veto', 5), 'veto,loser,loser,loser,loser');
  assert.equal(gameRules('fixed', 5), 'fixed,fixed,fixed,fixed,fixed');
  assert.equal(gameRules('host', 3), 'host,host,host');
});

test('a team event sends the series a fixture holds and a solo event sends one', () => {
  const team = eventPayload({ ...blankForm(), entrant_kind: 'team', series_per_round: '2' });
  assert.equal(team.series_per_round, 2);
  assert.equal(eventPayload({ ...blankForm(), entrant_kind: 'team', series_per_round: '' }).series_per_round, 1);
  // a solo event has no fixture, so the typed count never reaches the body
  assert.equal(eventPayload({ ...blankForm(), entrant_kind: 'solo', series_per_round: '3' }).series_per_round, 1);
  assert.equal(blankForm().series_per_round, 1);
});

test('a round robin stage carries its series count and every other format carries one', () => {
  const stages = stagesPayload({
    stages: [
      { format: 'round_robin', best_of: 3, map_rule: 'loser', series_per_entrant_per_round: '2' },
      { format: 'round_robin', best_of: 3, map_rule: 'loser' },
      { format: 'single_elimination', best_of: 3, map_rule: 'veto', series_per_entrant_per_round: '4' },
    ],
  });
  assert.equal(stages[0].series_per_entrant_per_round, 2);
  assert.equal(stages[1].series_per_entrant_per_round, 1);  // a blank field means one series
  assert.equal(stages[2].series_per_entrant_per_round, 1);  // a bracket plays one series a round
});

test('the stages are numbered in the order they are listed and repeat their map rule', () => {
  const stages = stagesPayload({
    stages: [
      { name: ' Group ', format: 'round_robin', best_of: 3, map_rule: 'loser', scheduling_mode: 'agreed', advance_count: '2', auto_advance: true },
      { name: '', format: 'single_elimination', best_of: 5, map_rule: 'veto', scheduling_mode: 'assigned', advance_count: '' },
    ],
  });
  assert.equal(stages[0].position, 1);
  assert.equal(stages[0].name, 'Group');
  assert.equal(stages[0].map_rules, 'loser,loser,loser');
  assert.equal(stages[0].advance_count, 2);
  assert.equal(stages[0].auto_advance, true);
  assert.equal(stages[1].position, 2);
  assert.equal(stages[1].name, null);
  assert.equal(stages[1].map_rules, 'veto,loser,loser,loser,loser');
  assert.equal(stages[1].advance_count, null);
  assert.equal(stages[1].auto_advance, false);
});

test('a division without a name is named by its position', () => {
  assert.deepEqual(divisionsPayload({ division_count: 0, division_names: [] }), []);
  assert.deepEqual(divisionsPayload({ division_count: 2, division_names: [' Pro ', ''] }), [
    { position: 1, name: 'Pro' },
    { position: 2, name: 'Division 2' },
  ]);
});

test('a step names what it still needs', () => {
  const form = blankForm();
  assert.equal(stepProblem(form, 'basics'), 'Pick the league this event runs in.');
  assert.equal(stepProblem({ ...form, league_id: 1 }, 'basics'), 'Name the event.');
  const named = { ...form, league_id: 1, name: 'Autumn cup' };
  assert.equal(stepProblem(named, 'basics'), null);
  assert.equal(stepProblem({ ...named, start_date: new Date(2026, 9, 5), end_date: new Date(2026, 9, 1) }, 'basics'),
    'The end date falls before the start date.');
  assert.equal(stepProblem({ ...named, entrant_cap: '1' }, 'entrants'), 'A cap holds at least two entrants.');
  assert.equal(stepProblem({ ...named, checkin_enabled: true, checkin_days: '' }, 'entrants'),
    'Say how many days before a round check-in opens.');
  assert.equal(stepProblem({ ...named, stages: [] }, 'stages'), 'Add at least one stage.');
  assert.equal(stepProblem({ ...named, stages: [{ best_of: 2 }] }, 'stages'), 'A best-of is an odd number of games.');
  assert.equal(stepProblem({ ...named, division_count: 1 }, 'divisions'), 'Two divisions or more, or none at all.');
  assert.equal(stepProblem(named, 'review'), null);
  assert.equal(wizardProblem(named), null);
  assert.equal(wizardProblem(form), 'Pick the league this event runs in.');
});

test('the create body carries the stages, so one write makes the whole event', () => {
  const body = createPayload({ ...blankForm({ id: 2 }), name: 'Autumn cup' });
  assert.equal(body.name, 'Autumn cup');
  assert.equal(body.league_id, 2);
  assert.equal(body.stages.length, 1);
  assert.equal(body.stages[0].position, 1);
});
