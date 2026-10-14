import { test } from 'node:test';
import assert from 'node:assert/strict';
import { blankCup, cupPayload, cupProblem, cupSteps, cupTeamSize, ffaLine, ffaModeLine, ffaPoints, laterRounds, livesLine, planFormat, pointsOf, repeatChoices, repeatName, swissLine } from './cup-wizard.mjs';
import { bestOfLine } from './best-of-plan.mjs';

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
    { format: 'single_elimination', best_of: 3, best_of_by_round: null, scheduling_mode: 'immediate', third_place: false, grand_final_modifier: 'one', placement_lives: null },
  ]);
  assert.equal(body.veto_by_best_of, true);
  assert.equal(body.team_size, null);
  // a race counts from 20 lifetime games unless the organizer names another number
  assert.equal(body.race_games_min, 20);
  assert.deepEqual(body.map_ids, []);
});

test('a 2v2 cup enters teams of two', () => {
  const body = cupPayload({ ...blankCup(), game: '2v2' });
  assert.equal(body.team_size, 2);
  assert.equal(body.entrant_kind, 'team');
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

test('the seeds show to everyone by default, and the switch hides them through the event setting', () => {
  assert.equal(cupPayload(blankCup()).hide_seeds, false);
  // divisions are the cup's choice, off unless it splits its players
  assert.equal(cupPayload(blankCup()).uses_divisions, false);
  assert.equal(cupPayload({ ...blankCup(), uses_divisions: true }).uses_divisions, true);
  assert.equal(cupPayload({ ...blankCup(), hide_seeds: true }).hide_seeds, true);
});

test('a placement bracket sends its loss limit, and only it does', () => {
  const placement = cupPayload({ ...blankCup(), format: 'placement', placement_lives: 2, third_place: true, grand_final_reset: true, best_of: 1, best_of_plan: { last_round: 3, final: 5, grand_final: 5 } });
  const stage = placement.stages[0];
  assert.deepEqual([stage.format, stage.placement_lives, stage.third_place, stage.grand_final_modifier], ['placement', 2, false, 'one']);
  assert.equal(stage.best_of_by_round, 'last_round:3,final:5');
  assert.equal(cupPayload({ ...blankCup(), format: 'placement' }).stages[0].placement_lives, null);
  assert.equal(cupPayload({ ...blankCup(), placement_lives: 2 }).stages[0].placement_lives, null);
  assert.equal(livesLine(null), 'every place played out');
  assert.equal(livesLine(1), 'a run ends after 1 loss');
  assert.equal(bestOfLine(1, { last_round: 3, final: 5 }, 'placement'), 'Bo1 early · last round Bo3 · final Bo5');
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

test('a Swiss cup writes its rounds, and a playoff as a second stage the last result draws', () => {
  const swiss = cupPayload({ ...blankCup(), format: 'swiss', swiss_rounds: 4, playoff: 4, best_of: 1, best_of_plan: { final: 3 } });
  assert.deepEqual(swiss.stages.map((stage) => stage.format), ['swiss', 'single_elimination']);
  assert.deepEqual([swiss.stages[0].swiss_rounds, swiss.stages[0].advance_count, swiss.stages[0].auto_advance], [4, 4, true]);
  assert.equal(swiss.stages[1].best_of_by_round, 'final:3');
  const league = cupPayload({ ...blankCup(), format: 'swiss', swiss_mode: 'all', playoff: 0 });
  assert.deepEqual(league.stages.map((stage) => [stage.format, stage.swiss_rounds, stage.auto_advance]), [['round_robin', null, false]]);
  assert.equal(cupProblem({ ...blankCup(), format: 'swiss', swiss_rounds: 1 }, 'format'), 'A Swiss cup plays at least 2 rounds.');
  assert.equal(cupProblem({ ...blankCup(), format: 'swiss', swiss_mode: 'all', swiss_rounds: 1 }, 'format'), null);
  assert.equal(planFormat({ format: 'swiss', playoff: 8 }), 'single_elimination');
  assert.equal(swissLine({ swiss_mode: 'rounds', swiss_rounds: 3, playoff: 4 }), 'Swiss, 3 rounds, then the top 4 play off');
});

test('a cup of one evening sends no rounds and keeps its own check-in', () => {
  const body = cupPayload({ ...blankCup(), start_date: day, start_time: '20:00' });
  assert.equal(body.legs, undefined);
  assert.equal(body.points_by_place, undefined);
  assert.equal(body.checkin_enabled, true);
  assert.deepEqual(cupSteps(blankCup()).map((row) => row.key), ['basics', 'format', 'maps', 'signups', 'review']);
});

test('a cup over rounds dates them a week apart and checks its players in per round', () => {
  const form = { ...blankCup(), name: 'Weekly Cup', play: 'rounds', round_count: 3, start_date: day, start_time: '20:00' };
  const later = laterRounds(form);
  assert.deepEqual(later.map((row) => [row.date.getDate(), row.date.getMonth(), row.time]), [[23, 9, '20:00'], [30, 9, '20:00']]);
  const body = cupPayload(form);
  assert.equal(body.legs.length, 3);
  assert.equal(body.legs[0].starts_at, body.starts_at);
  assert.deepEqual(body.points_by_place, [10, 8, 6, 5, 4, 3, 2, 1]);
  assert.equal(body.checkin_enabled, false);
  assert.deepEqual(cupSteps(form).map((row) => row.key), ['basics', 'format', 'maps', 'signups', 'points', 'review']);
  assert.equal(cupProblem(form, 'basics'), null);
});

test('a round the organizer moved keeps its day when the first round moves', () => {
  const moved = { date: new Date(2026, 9, 25), time: '18:00', edited: true };
  const form = { ...blankCup(), play: 'rounds', round_count: 3, start_date: new Date(2026, 9, 9), start_time: '20:00', later_rounds: [moved] };
  const later = laterRounds(form);
  assert.equal(later[0], moved);
  assert.equal(later[1].date.getDate(), 23);
});

test('the rounds need a day each, in order, and two to twelve of them', () => {
  const base = { ...blankCup(), name: 'Weekly Cup', play: 'rounds', start_date: day, start_time: '20:00' };
  assert.equal(cupProblem({ ...base, round_count: 1 }, 'basics'), 'A cup plays 2 to 12 rounds.');
  const early = { date: new Date(2026, 9, 10), time: '20:00', edited: true };
  assert.equal(cupProblem({ ...base, round_count: 2, later_rounds: [early] }, 'basics'), 'Round 2 starts after round 1.');
  const blank = { date: null, time: '', edited: true };
  assert.equal(cupProblem({ ...base, round_count: 2, later_rounds: [blank] }, 'basics'), 'Pick the day and time of round 2.');
});

test('the points table drops its empty tail and refuses a negative place', () => {
  const form = { ...blankCup(), play: 'rounds', points: ['12', '', '5', '', ''] };
  assert.deepEqual(pointsOf(form), [12, 0, 5]);
  assert.equal(cupProblem(form, 'points'), null);
  assert.equal(cupProblem({ ...form, points: ['', ''] }, 'points'), 'Give at least the winner of a round some points.');
  assert.equal(cupProblem({ ...form, points: ['3', '-1'] }, 'points'), 'Points are whole numbers, 0 or more.');
});

test('a cup repeats every week or on the nth or last weekday its own day is', () => {
  // Friday 16 October 2026 is the third Friday and not the last
  assert.deepEqual(repeatChoices(day), [
    { value: null, title: 'Every Friday' },
    { value: 3, title: 'The third Friday of the month' },
  ]);
  // Friday 30 October 2026 is the fifth Friday: no fifth to name, but the last
  assert.deepEqual(repeatChoices(new Date(2026, 9, 30)).map((item) => item.value), [null, -1]);
  // Friday 27 November 2026 is the fourth and the last
  assert.deepEqual(repeatChoices(new Date(2026, 10, 27)).map((item) => item.value), [null, 4, -1]);
  assert.deepEqual(repeatChoices(null), []);
});

test('a repeating cup sends its rule with the cup, one evening or over rounds', () => {
  const form = { ...blankCup(), name: 'Friday Cup #1', start_date: day, start_time: '20:00', repeat: true, repeat_nth: 3 };
  const rule = cupPayload(form).recurrence;
  assert.equal(rule.name, 'Friday Cup');
  assert.deepEqual([rule.weekday, rule.nth, rule.start_time, rule.ends_on], [4, 3, '20:00', null]);
  assert.ok(rule.zone);
  // a choice the day does not offer falls back to every week
  assert.equal(cupPayload({ ...form, repeat_nth: -1 }).recurrence.nth, null);
  assert.equal(cupPayload({ ...form, repeat: false }).recurrence, null);
  assert.equal(repeatName({ name: 'Cup', repeat_name: ' Weekly ' }), 'Weekly');
  assert.equal(cupProblem({ ...form, repeat_until: new Date(2026, 9, 1) }, 'basics'), 'The last day comes after the first cup.');
  assert.equal(cupProblem(form, 'basics'), null);
});

test('an FFA cup of heats writes one lobby stage, no best-of and no veto', () => {
  const form = { ...blankCup(), name: 'FFA Night', game: 'ffa', start_date: day, start_time: '20:00', pool: [{ id: 3 }] };
  const body = cupPayload(form);
  assert.equal(body.entrant_kind, 'solo');
  assert.equal(body.team_size, null);
  assert.equal(body.veto_by_best_of, false);
  assert.deepEqual(body.stages, [
    {
      name: 'Heats',
      format: 'ffa',
      best_of: 1,
      best_of_by_round: null,
      scheduling_mode: 'immediate',
      lobby_size: 4,
      group_advance: 2,
      swiss_rounds: null,
      points_by_place: '4,3,2,1',
      third_place: false,
      grand_final_modifier: 'one',
      placement_lives: null,
    },
  ]);
  assert.equal(ffaLine(form), 'Heats of 4, the top 2 of each go on, down to one final lobby');
  assert.equal(cupProblem(form, 'format'), null);
  assert.equal(cupProblem(form, 'maps'), null);
  assert.equal(cupProblem({ ...form, pool: [] }, 'maps'), 'Add at least one map; every lobby plays a map of the pool.');
});

test('one FFA lobby seats the whole field, plays its games and caps the sign-ups', () => {
  const form = { ...blankCup(), game: 'ffa', ffa_mode: 'league', lobby_size: 6, ffa_games: 4, entrant_cap: '10' };
  const body = cupPayload(form);
  assert.deepEqual([body.stages[0].lobby_size, body.stages[0].swiss_rounds, body.stages[0].group_advance], [null, 4, null]);
  assert.equal(body.stages[0].points_by_place, '6,5,4,3,2,1');
  assert.equal(body.entrant_cap, 6);
  assert.equal(cupPayload({ ...form, entrant_cap: '' }).entrant_cap, 6);
  assert.equal(ffaLine(form), 'One lobby of 6, 4 games, the points add up');
});

test('the FFA points default to the lobby counting down, and the format step checks its numbers', () => {
  const form = { ...blankCup(), game: 'ffa' };
  assert.deepEqual(ffaPoints({ ...form, lobby_size: 5 }), [5, 4, 3, 2, 1]);
  assert.deepEqual(ffaPoints({ ...form, ffa_points: ['10', '6', '', ''] }), [10, 6]);
  assert.equal(cupProblem({ ...form, lobby_size: 2 }, 'format'), 'A heat seats 3 to 8 players.');
  assert.equal(cupProblem({ ...form, lobby_advance: '4' }, 'format'), '1 to 3 places of a heat go on.');
  assert.equal(cupProblem({ ...form, ffa_mode: 'league', ffa_games: 1 }, 'format'), 'One lobby plays 2 to 10 games.');
  assert.equal(cupProblem({ ...form, ffa_points: ['3', '-1'] }, 'format'), 'Points are whole numbers, 0 or more.');
});

test('an FFA of teams enters teams of its mode and seats teams in its lobbies', () => {
  const form = { ...blankCup(), game: 'ffa', ffa_team_size: 2, lobby_size: 4 };
  const body = cupPayload(form);
  assert.deepEqual([body.entrant_kind, body.team_size], ['team', 2]);
  assert.equal(body.stages[0].format, 'ffa');
  assert.equal(ffaModeLine(form), '2v2v2v2');
  assert.equal(ffaLine(form), 'Heats of 4 teams, the top 2 of each go on, down to one final lobby');
  // the solo mode and a 1v1 cup enter single players
  assert.equal(cupTeamSize({ ...form, ffa_team_size: 1 }), null);
  assert.equal(ffaModeLine({ ...form, ffa_team_size: 1 }), '1v1v1v1');
  assert.equal(cupTeamSize({ ...blankCup(), game: '3v3', ffa_team_size: 2 }), 3);
});
