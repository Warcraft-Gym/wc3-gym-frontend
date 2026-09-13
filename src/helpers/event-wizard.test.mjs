import test from 'node:test';
import assert from 'node:assert/strict';
import process from 'node:process';

import { blankForm, divisionsPayload, eventPayload, stagesPayload, stepProblem, wizardProblem } from './event-wizard.mjs';

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
  assert.equal(body.min_games_seasons, null);  // a seasons count without a games floor means nothing
  assert.equal(body.checkin_days, null);  // check-in is off, so its window is not sent
});

test('check-in sends its window, and a games floor sends its seasons', () => {
  const body = eventPayload({ ...blankForm(), checkin_enabled: true, checkin_days: 2, min_games: '20', min_games_seasons: 3 });
  assert.equal(body.checkin_days, 2);
  assert.equal(body.min_games, 20);
  assert.equal(body.min_games_seasons, 3);
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
  assert.equal(stages[1].map_rules, 'veto,veto,veto,veto,veto');
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
