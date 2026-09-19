import test from 'node:test';
import assert from 'node:assert/strict';
import process from 'node:process';

import { blankForm, createPayload, divisionsPayload, eventPayload, gameRules, groupProblem, readStagesPayload, stagesPayload, stepProblem, stepsFor } from './event-wizard.mjs';

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
  assert.equal(body.min_games_seasons, null);  // nothing counts every W3C season
  assert.equal(body.early_checkin, false);
  assert.equal(body.round_end_zone, null);
});

test('one entry per race starts off and sends its switch', () => {
  assert.equal(eventPayload(blankForm()).multi_entry, false);
  assert.equal(eventPayload({ ...blankForm(), multi_entry: true }).multi_entry, true);
});

test('check-in sends its window and a games floor sends its count', () => {
  const body = eventPayload({ ...blankForm(), checkin_enabled: true, checkin_days: 2, min_games: '20', min_games_seasons: '2' });
  assert.equal(body.checkin_days, 2);
  assert.equal(body.min_games, 20);
  assert.equal(body.min_games_seasons, 2);
});

test('early check-in rides the check-in switch, and a zone is trimmed or nothing', () => {
  const on = eventPayload({ ...blankForm(), checkin_enabled: true, early_checkin: true, round_end_zone: ' Europe/Berlin ' });
  assert.equal(on.early_checkin, true);
  assert.equal(on.round_end_zone, 'Europe/Berlin');
  // check-in off carries no early check-in, as it carries no window
  assert.equal(eventPayload({ ...blankForm(), checkin_enabled: false, early_checkin: true }).early_checkin, false);
  assert.equal(eventPayload({ ...blankForm(), round_end_zone: '' }).round_end_zone, null);
});

test('the entrants step counts the games over one W3C season or more', () => {
  assert.equal(stepProblem({ ...blankForm(), min_games_seasons: '2' }, 'entrants'), null);
  assert.equal(stepProblem({ ...blankForm(), min_games_seasons: '' }, 'entrants'), null);
  assert.match(stepProblem({ ...blankForm(), min_games_seasons: '0' }, 'entrants'), /one W3C season or more/);
});

test('a stage write carries back what the read gave, and the MMR limit is a captain draft setting', () => {
  const read = [
    { id: 7, position: 1, format: 'gnl', name: 'Season', best_of: 3, map_rules: 'veto,loser,loser', auto_advance: false, seeds_locked_at: '2026-09-01T00:00:00Z', max_mmr_difference: 100 },
    { id: 8, position: 2, format: 'single_elimination', best_of: 5, max_mmr_difference: null },
  ];
  const [draft, bracket] = readStagesPayload(read, { 7: '150' });
  assert.equal(draft.max_mmr_difference, 150);
  assert.equal(draft.name, 'Season');
  assert.equal(draft.map_rules, 'veto,loser,loser');
  assert.equal(draft.best_of, 3);
  // the id, the position and the seed lock are read-only, so the write never carries them
  for (const field of ['id', 'position', 'seeds_locked_at']) assert.ok(!(field in draft), field);
  // every other format refuses the field, so it goes out as nothing
  assert.equal(bracket.max_mmr_difference, null);
  assert.equal(bracket.best_of, 5);
  // a cleared box writes nothing, which a captain draft reads as its default
  assert.equal(readStagesPayload(read, { 7: '' })[0].max_mmr_difference, null);
  // an untouched stage carries the value it was read with
  assert.equal(readStagesPayload(read, {})[0].max_mmr_difference, 100);
  assert.deepEqual(readStagesPayload(null), []);
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

test('the stages are written in the order they are listed and repeat their map rule', () => {
  const stages = stagesPayload({
    stages: [
      { name: ' Group ', format: 'round_robin', best_of: 3, map_rule: 'loser', scheduling_mode: 'agreed', advance_count: '2', auto_advance: true },
      { name: '', format: 'single_elimination', best_of: 5, map_rule: 'veto', scheduling_mode: 'assigned', advance_count: '' },
    ],
  });
  assert.equal(stages[0].name, 'Group');
  assert.equal(stages[0].map_rules, 'loser,loser,loser');
  assert.equal(stages[0].advance_count, 2);
  assert.equal(stages[0].auto_advance, true);
  // EventStageWrite declares no position: the list order is the position
  assert.ok(stages.every((stage) => !('position' in stage)));
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
});

test('the create body carries the stages, so one write makes the whole event', () => {
  const body = createPayload({ ...blankForm({ id: 2 }), name: 'Autumn cup' });
  assert.equal(body.name, 'Autumn cup');
  assert.equal(body.league_id, 2);
  assert.equal(body.stages.length, 1);
});


test('a signup-only event skips the stages step and every other kind keeps it', () => {
  const keys = (form) => stepsFor(form).map((step) => step.key);
  assert.deepEqual(keys(blankForm()), ['basics', 'entrants', 'stages', 'divisions', 'review']);
  assert.deepEqual(keys({ ...blankForm(), kind: 'signup' }), ['basics', 'entrants', 'divisions', 'review']);
  assert.deepEqual(keys(undefined), ['basics', 'entrants', 'stages', 'divisions', 'review']);
});

test('a signup-only event writes an explicit empty stage list', () => {
  const form = { ...blankForm({ id: 2 }), name: 'Coaching night', kind: 'signup' };
  assert.deepEqual(createPayload(form).stages, []);
  assert.equal(createPayload(form).kind, 'signup');
  // the same form as a cup still writes the one stage it holds
  assert.equal(createPayload({ ...form, kind: 'cup' }).stages.length, 1);
});

test('the stages step never holds a signup-only event back', () => {
  const form = { ...blankForm({ id: 2 }), name: 'Coaching night', kind: 'signup', stages: [] };
  assert.equal(stepProblem(form, 'stages'), 'Add at least one stage.');  // the step is not asked for
  assert.deepEqual(stepsFor(form).map((step) => step.key).includes('stages'), false);
});

test('only a Swiss stage counts rounds and only a round robin splits into groups', () => {
  const stages = stagesPayload({
    stages: [
      { format: 'swiss', best_of: 3, map_rule: 'veto', swiss_rounds: '5', group_size: '4' },
      { format: 'round_robin', best_of: 3, map_rule: 'veto', group_size: '4', group_advance: '2', swiss_rounds: '5' },
      { format: 'single_elimination', best_of: 3, map_rule: 'veto' },
    ],
  });
  assert.equal(stages[0].swiss_rounds, 5);
  assert.equal(stages[0].group_size, null);
  assert.equal(stages[1].swiss_rounds, null);
  assert.equal(stages[1].group_size, 4);
  assert.equal(stages[1].group_advance, 2);
  assert.equal(stages[2].swiss_rounds, null);
  assert.equal(stages[2].group_advance, null);
  // a blank field is no setting at all, not a zero
  assert.equal(stagesPayload({ stages: [{ format: 'swiss', best_of: 3, map_rule: 'veto' }] })[0].swiss_rounds, null);
});

test('a group seats two entrants and advances one', () => {
  assert.equal(groupProblem({ format: 'round_robin', group_size: '', group_advance: '' }), null);
  assert.equal(groupProblem({ format: 'round_robin', group_size: '4', group_advance: '2' }), null);
  assert.equal(groupProblem({ format: 'round_robin', group_size: '1' }), 'A group seats two entrants or more.');
  assert.equal(groupProblem({ format: 'round_robin', group_advance: '0' }), 'A group advances one entrant or more.');
  assert.equal(groupProblem({ format: 'swiss', group_size: '1' }), null);
  assert.equal(
    stepProblem({ stages: [{ format: 'round_robin', best_of: 3, group_size: '1' }] }, 'stages'),
    'A group seats two entrants or more.',
  );
});
