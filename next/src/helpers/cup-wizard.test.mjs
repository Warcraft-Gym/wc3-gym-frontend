import { test } from 'node:test';
import assert from 'node:assert/strict';
import { blankCup, cupPayload, cupProblem } from './cup-wizard.mjs';

const day = new Date(2026, 9, 16);

test('a cup writes one immediate elimination stage and the bounds it was given', () => {
  const body = cupPayload({ ...blankCup(), name: ' Friday Cup ', start_date: day, start_time: '20:00', entrant_min: '8', entrant_cap: '16' });
  assert.equal(body.name, 'Friday Cup');
  assert.equal(body.kind, 'cup');
  assert.equal(body.entrant_kind, 'solo');
  assert.equal(body.start_date, '2026-10-16');
  // a cup that runs past midnight is still running the next day
  assert.equal(body.end_date, null);
  assert.ok(body.starts_at);
  assert.deepEqual([body.entrant_min, body.entrant_cap], [8, 16]);
  assert.deepEqual(body.stages, [
    { format: 'single_elimination', best_of: 3, best_of_by_round: null, scheduling_mode: 'immediate', third_place: false, grand_final_modifier: 'one' },
  ]);
  assert.equal(body.veto_by_best_of, true);
  assert.deepEqual(body.map_ids, []);
});

test('a cup names the best-of of its bracket parts and the maps it vetoes from', () => {
  const form = { ...blankCup(), format: 'double_elimination', best_of: 1, best_of_plan: { upper_final: 3, grand_final: 5, final: 5 }, pool: [{ id: 4 }, { id: 2 }] };
  const body = cupPayload(form);
  // the single elimination final is not a part of a double elimination
  assert.equal(body.stages[0].best_of_by_round, 'upper_final:3,grand_final:5');
  assert.deepEqual(body.map_ids, [4, 2]);
  assert.equal(cupProblem(form, 'maps'), 'A Bo5 needs at least 5 maps in the pool; it holds 2.');
  assert.equal(cupProblem({ ...form, pool: [1, 2, 3, 4, 5].map((id) => ({ id })) }, 'maps'), null);
});

test('the third place plays only in single elimination, the reset only in double', () => {
  const single = cupPayload({ ...blankCup(), third_place: true, grand_final_reset: true });
  assert.deepEqual([single.stages[0].third_place, single.stages[0].grand_final_modifier], [true, 'one']);
  const double = cupPayload({ ...blankCup(), format: 'double_elimination', third_place: true, grand_final_reset: true });
  assert.deepEqual([double.stages[0].third_place, double.stages[0].grand_final_modifier], [false, 'reset']);
  const noReset = cupPayload({ ...blankCup(), format: 'double_elimination', grand_final_reset: false });
  assert.equal(noReset.stages[0].grand_final_modifier, 'one');
});

test('blank bounds write nothing', () => {
  const body = cupPayload(blankCup());
  assert.deepEqual([body.entrant_min, body.entrant_cap, body.starts_at, body.mmr_min, body.mmr_max, body.min_games], [null, null, null, null, null, null]);
});

test('a cup checks who signs up by default, and only a cup that asks for Battle.net takes members only', () => {
  const body = cupPayload({ ...blankCup(), signup_policy: 'anyone', mmr_min: '1400', mmr_max: '1800', min_games: '20' });
  assert.deepEqual([body.eligibility_required, body.bnet_required, body.signup_policy, body.mmr_min, body.mmr_max, body.min_games], [true, false, 'anyone', 1400, 1800, 20]);
  const linked = cupPayload({ ...blankCup(), signup_policy: 'anyone', bnet_required: true });
  assert.deepEqual([linked.bnet_required, linked.signup_policy], [true, 'members']);
  // the link is a part of the check, so it goes with it
  assert.equal(cupPayload({ ...blankCup(), eligibility_required: false, bnet_required: true }).bnet_required, false);
  const open = cupPayload({ ...blankCup(), eligibility_required: false, signup_policy: 'anyone' });
  assert.deepEqual([open.eligibility_required, open.signup_policy], [false, 'anyone']);
  assert.equal(cupProblem({ ...blankCup(), mmr_min: '1800', mmr_max: '1400' }, 'signups'), 'The lowest MMR cannot be above the highest.');
});

test('a step names what it still needs', () => {
  assert.equal(cupProblem(blankCup(), 'basics'), 'Name the cup.');
  assert.equal(cupProblem({ ...blankCup(), name: 'Cup' }, 'basics'), 'Pick the day the cup is played.');
  assert.equal(cupProblem({ ...blankCup(), name: 'Cup', start_date: day, start_time: '20:00' }, 'basics'), null);
  assert.equal(cupProblem({ ...blankCup(), entrant_min: '1' }, 'signups'), 'A cup needs at least 2 players.');
  assert.equal(cupProblem({ ...blankCup(), entrant_min: '9', entrant_cap: '8' }, 'signups'), 'The minimum cannot be above the maximum.');
  assert.equal(cupProblem({ ...blankCup(), entrant_min: '8', entrant_cap: '16' }, 'signups'), null);
});
