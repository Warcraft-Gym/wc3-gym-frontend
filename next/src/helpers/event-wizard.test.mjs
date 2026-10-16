import test from 'node:test';
import assert from 'node:assert/strict';
import process from 'node:process';

import { blankForm, createPayload, formProblem, readStagesPayload } from './event-wizard.mjs';

process.env.TZ = 'Australia/Sydney';  // UTC+10, so a wall time and its stored instant differ

test('a sign-up list is a list of members in no league, with no stage and no check-in', () => {
  assert.deepEqual(createPayload({ ...blankForm(), name: ' Coaching night ' }), {
    name: 'Coaching night',
    kind: 'signup',
    league_id: null,
    description: null,
    start_date: null,
    starts_at: null,
    page_url: null,
    entrant_cap: null,
    signup_policy: 'members',
    entrant_kind: 'solo',
    eligibility_required: false,
    checkin_enabled: false,
    checkin_days: null,
    // an explicit empty list writes no stage, where a missing field writes a default one
    stages: [],
  });
});

test('a date and a typed start time are stored as the UTC instant they name', () => {
  const body = createPayload({
    ...blankForm(),
    name: 'Coaching night',
    start_date: new Date(2026, 9, 1),
    start_time: '19:00',
    description: ' Bring one replay ',
    page_url: ' https://example.com/rules ',
    entrant_cap: '32',
  });
  assert.equal(body.start_date, '2026-10-01');
  assert.equal(body.starts_at, '2026-10-01T09:00:00');
  assert.equal(body.description, 'Bring one replay');
  assert.equal(body.page_url, 'https://example.com/rules');
  assert.equal(body.entrant_cap, 32);
  // a date alone names the day and no start time
  assert.equal(createPayload({ ...blankForm(), start_date: new Date(2026, 9, 1) }).starts_at, null);
});

test('the form names what it still needs', () => {
  assert.equal(formProblem(blankForm()), 'Name the list.');
  assert.equal(formProblem({ ...blankForm(), name: '   ' }), 'Name the list.');
  const named = { ...blankForm(), name: 'Coaching night' };
  assert.equal(formProblem(named), null);
  assert.equal(formProblem({ ...named, entrant_cap: '1' }), 'A cap holds two sign-ups or more.');
  assert.equal(formProblem({ ...named, entrant_cap: '2' }), null);
  // a start time is a time on the list's date, so it needs one
  assert.equal(formProblem({ ...named, start_time: '19:00' }), 'Pick a date for the start time.');
  assert.equal(formProblem({ ...named, start_time: '19:00', start_date: new Date(2026, 9, 1) }), null);
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

test('a stage edit keeps the loss limit of a placement bracket and the seed source', () => {
  const [stage] = readStagesPayload([{ id: 1, format: 'placement', best_of: 1, placement_lives: 2, seed_source: 'random' }]);
  assert.equal(stage.placement_lives, 2);
  assert.equal(stage.seed_source, 'random');
});
