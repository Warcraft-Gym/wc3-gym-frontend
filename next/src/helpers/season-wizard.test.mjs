import { test } from 'node:test';
import assert from 'node:assert/strict';
import { changedRounds, crewChanges, drawMatchups, freeSignups, dropUnpooled, fillRoundMaps, idDiff, matchupRows, roundsNeeded, stepProblem, weekOf, wizardSteps } from './season-wizard.mjs';

const keys = (season) => wizardSteps(season).map((step) => step.key);

test('a season with a fixed game asks for the round maps', () => {
  assert.deepEqual(keys({ map_rules: 'fixed,loser,loser' }), ['general', 'teams', 'captains', 'matchups', 'maps', 'rounds']);
  // no rules play the GNL default, which starts on the fixed map
  assert.deepEqual(keys({}), ['general', 'teams', 'captains', 'matchups', 'maps', 'rounds']);
  assert.deepEqual(keys(null), ['general', 'teams', 'captains', 'matchups', 'maps', 'rounds']);
});

test('a season with no fixed game skips the round maps', () => {
  assert.deepEqual(keys({ map_rules: 'veto,veto,veto' }), ['general', 'teams', 'captains', 'matchups', 'maps']);
});

test('the general step needs a name and a round', () => {
  assert.match(stepProblem({ season: { name: ' ', round_count: 5 } }, 'general'), /name/);
  assert.match(stepProblem({ season: { name: 'S1', round_count: 0 } }, 'general'), /round/);
  assert.match(stepProblem({ season: { name: 'S1', round_count: 5, min_games_seasons: 0 } }, 'general'), /W3C season/);
  assert.match(stepProblem({ season: { name: 'S1', round_count: 5 }, maxMmr: { 3: '0' } }, 'general'), /MMR/);
  assert.equal(stepProblem({ season: { name: 'S1', round_count: '5', min_games_seasons: '' }, maxMmr: { 3: '' } }, 'general'), null);
});

test('a round map must be in the pool', () => {
  assert.match(stepProblem({ mapIds: [1, 2], roundMaps: { 1: 3 } }, 'rounds'), /pool/);
  assert.equal(stepProblem({ mapIds: [1, 2], roundMaps: { 1: 2, 2: null } }, 'rounds'), null);
  assert.equal(stepProblem({ season: {} }, 'teams'), null);
});

test('the maps step is empty or carries an order its pool can play', () => {
  const order = 'Ban_A|Ban_B|Ban_B|Ban_A|Ban_A|Ban_B|Pick_A|Pick_B';
  assert.equal(stepProblem({ season: { pick_ban: order }, mapIds: [] }, 'maps'), null);
  assert.match(stepProblem({ season: { pick_ban: order }, mapIds: [1, 2, 3, 4] }, 'maps'), /allows 1 bans/);
  assert.equal(stepProblem({ season: { pick_ban: order }, mapIds: [1, 2, 3, 4, 5, 6, 7, 8, 9] }, 'maps'), null);
  assert.equal(stepProblem({ season: { pick_ban: 'Pick_A|Pick_B|Pick_A', map_rules: 'veto,veto,veto' }, mapIds: [1, 2, 3] }, 'maps'), null);
});

test('the diff names what to add and what to remove', () => {
  assert.deepEqual(idDiff([1, 2, 3], [2, 3, 4]), { add: [4], remove: [1] });
  assert.deepEqual(idDiff([], [5]), { add: [5], remove: [] });
});

test('filling takes the pool in turn and keeps a round set by hand', () => {
  assert.deepEqual(fillRoundMaps(5, [10, 20, 30]), { 1: 10, 2: 20, 3: 30, 4: 10, 5: 20 });
  assert.deepEqual(fillRoundMaps(3, [10, 20], { 2: 99 }), { 1: 10, 2: 99, 3: 10 });
  assert.deepEqual(fillRoundMaps(3, [], { 1: 7 }), { 1: 7 });
});

test('a map that leaves the pool leaves its rounds', () => {
  assert.deepEqual(dropUnpooled({ 1: 10, 2: 20, 3: null }, [20]), { 1: null, 2: 20, 3: null });
});

test('the save writes only the rounds whose map moved', () => {
  assert.deepEqual(changedRounds(3, { 1: 10, 2: 20 }, { 1: 10, 2: null, 3: 30 }), [
    { playday: 2, map_id: null },
    { playday: 3, map_id: 30 },
  ]);
  // a round past the count is not written
  assert.deepEqual(changedRounds(1, {}, { 2: 5 }), []);
});

test('a round with no dates is a week after the one before it', () => {
  assert.deepEqual(weekOf('2026-10-05', 1), { start_date: '2026-10-05', end_date: '2026-10-11' });
  assert.deepEqual(weekOf('2026-10-05', 3), { start_date: '2026-10-19', end_date: '2026-10-25' });
  assert.equal(weekOf(null, 1), null);
});

// A seeded random, so a failing draw can be read again
const seeded = (seed) => () => {
  seed = (seed * 1103515245 + 12345) % 2147483648;
  return seed / 2147483648;
};

test('a season needs a round for each opponent, and one more when a team rests each week', () => {
  assert.equal(roundsNeeded(0), 0);
  assert.equal(roundsNeeded(1), 0);
  assert.equal(roundsNeeded(2), 1);
  assert.equal(roundsNeeded(7), 7);
  assert.equal(roundsNeeded(8), 7);
});

test('every team meets every other team once, one match a week', () => {
  for (const count of [2, 3, 4, 5, 8, 11, 12]) {
    for (const seed of [1, 7, 42]) {
      const teams = Array.from({ length: count }, (_, i) => 100 + i);
      const weeks = drawMatchups(teams, seeded(seed));
      assert.equal(weeks.length, roundsNeeded(count));
      assert.deepEqual(weeks.map((week) => week.playday), weeks.map((_, i) => i + 1));
      const met = new Set();
      for (const week of weeks) {
        const playing = week.pairs.flat();
        assert.equal(new Set(playing).size, playing.length, 'a team plays twice in one week');
        assert.equal(week.rest == null, count % 2 === 0);
        assert.equal(playing.length + (week.rest == null ? 0 : 1), count);
        for (const [a, b] of week.pairs) {
          const pair = [a, b].sort().join('-');
          assert.ok(!met.has(pair), `${pair} meets twice`);
          met.add(pair);
        }
      }
      assert.equal(met.size, (count * (count - 1)) / 2);
    }
  }
});

test('an odd count rests each team once', () => {
  const weeks = drawMatchups([1, 2, 3, 4, 5], seeded(3));
  assert.deepEqual(weeks.map((week) => week.rest).sort(), [1, 2, 3, 4, 5]);
});

test('fewer than two teams draw nothing', () => {
  assert.deepEqual(drawMatchups([]), []);
  assert.deepEqual(drawMatchups([9]), []);
});

test('the matchup rows run round by round', () => {
  assert.deepEqual(matchupRows([{ playday: 1, pairs: [[1, 2], [3, 4]], rest: null }, { playday: 2, pairs: [[1, 3]], rest: 2 }]), [
    { team1_id: 1, team2_id: 2, playday: 1 },
    { team1_id: 3, team2_id: 4, playday: 1 },
    { team1_id: 1, team2_id: 3, playday: 2 },
  ]);
});

test('drawn matchups need two teams and a round for every week', () => {
  const season = { round_count: 5 };
  assert.equal(stepProblem({ season, teamIds: [1, 2, 3, 4, 5, 6], matchups: null }, 'matchups'), null);
  assert.equal(stepProblem({ season, teamIds: [1, 2, 3, 4, 5, 6], matchups: [] }, 'matchups'), null);
  assert.match(stepProblem({ season, teamIds: [1], matchups: [] }, 'matchups'), /2 teams/);
  assert.match(stepProblem({ season, teamIds: [1, 2, 3, 4, 5, 6, 7], matchups: [] }, 'matchups'), /7 teams need 7 rounds/);
});

test('the crew save writes a moved captain list whole and the roster as a diff', () => {
  const before = { captains: { 1: [10, 11], 2: [20] }, rosters: { 1: [30, 31], 2: [] } };
  const after = { captains: { 1: [11, 10], 2: [21], 3: [40] }, rosters: { 1: [31, 32], 2: [], 3: [] } };
  assert.deepEqual(crewChanges(before, after, [1, 2, 3]), [
    { team_id: 1, captains: null, add: [32], remove: [30] },
    { team_id: 2, captains: [21], add: [], remove: [] },
    { team_id: 3, captains: [40], add: [], remove: [] },
  ]);
  // an unticked team is left alone
  assert.deepEqual(crewChanges(before, { captains: {}, rosters: {} }, [2]), [{ team_id: 2, captains: [], add: [], remove: [] }]);
  assert.deepEqual(crewChanges(before, before, [1, 2]), []);
});

test('a signup on one roster is not offered to another team', () => {
  const signups = [{ id: 1 }, { id: 2 }, { id: 3 }];
  const rosters = { 7: [1], 8: [2] };
  assert.deepEqual(freeSignups(signups, rosters, 7).map((s) => s.id), [1, 3]);
  assert.deepEqual(freeSignups(signups, rosters, 9).map((s) => s.id), [3]);
  assert.deepEqual(freeSignups(null, rosters, 7), []);
});
