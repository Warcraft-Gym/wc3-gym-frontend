import assert from 'node:assert';
import test from 'node:test';

import { EVENT_TABS, homeTab, resultRounds, tabOf, withTab } from './event-tabs.mjs';

const named = (...names) => names.map((name, index) => ({ id: index + 1, number: index + 1, name }));
const P = (id) => ({ id, name: `P${id}` });
const S = (id, round_id, a, b, score = null, extra = {}) => ({
  id, round_id, sequence: id,
  player1_id: a, player1: a ? P(a) : null,
  player2_id: b, player2: b ? P(b) : null,
  player1_score: score?.[0] ?? null, player2_score: score?.[1] ?? null,
  ...extra,
});

test('the address names the tab, and anything else opens the draw', () => {
  assert.deepStrictEqual(EVENT_TABS, ['draw', 'participants', 'results']);
  assert.strictEqual(tabOf('results'), 'results');
  assert.strictEqual(tabOf('participants'), 'participants');
  assert.strictEqual(tabOf(null), 'draw');
  assert.strictEqual(tabOf('admin'), 'draw');
});

test('a finished event opens on its results, every other one on its draw', () => {
  assert.strictEqual(homeTab({ state: 'finished' }), 'results');
  assert.strictEqual(homeTab({ state: 'running' }), 'draw');
  assert.strictEqual(homeTab(null), 'draw');
  assert.strictEqual(tabOf(null, 'results'), 'results');
  // a finished event names its draw in the address, and drops the results it opens on
  assert.strictEqual(withTab('http://x/events/6', 'draw', 'results'), '/events/6?tab=draw');
  assert.strictEqual(withTab('http://x/events/6?tab=draw', 'results', 'results'), '/events/6');
});

test('the draw is the page itself, every other tab rides in the query', () => {
  assert.strictEqual(withTab('http://x/events/6?tab=results', 'draw'), '/events/6');
  assert.strictEqual(withTab('http://x/events/6', 'results'), '/events/6?tab=results');
  // another query the page reads stays
  assert.strictEqual(withTab('http://x/events/6?mode=clean', 'participants'), '/events/6?mode=clean&tab=participants');
});

test('the results list the played series round by round, never a bye or an idle reset', () => {
  const rounds = named('Upper bracket round 1', 'Upper bracket final', 'Grand final', 'Grand final reset');
  const series = [
    S(1, 1, 1, 2, [1, 0]),
    // a bye: one side never fills, and the engine scores the other through
    S(2, 1, 3, null, [1, 0], { result_kind: 'walkover' }),
    S(3, 2, 1, 3),
    // the lower slot the bye feeds: its loser side never fills, so the walkover is no match
    S(6, 2, null, 2, [0, 1], { slot1_from_series_id: 2, slot1_takes_loser: true, result_kind: 'walkover' }),
    S(4, 3, 1, 3, [2, 0], { slot1_from_series_id: 3, slot2_from_series_id: 3 }),
    // the reset of a final the upper winner took is a walkover nobody played
    S(5, 4, 1, 3, [1, 0], { slot1_from_series_id: 4, slot2_from_series_id: 4, slot2_takes_loser: true, result_kind: 'walkover' }),
  ];
  const made = resultRounds(series, rounds);
  assert.deepStrictEqual(made.map((round) => round.name), ['Upper bracket round 1', 'Grand final']);
  assert.deepStrictEqual(made.map((round) => round.series.map((row) => row.id)), [[1], [4]]);
  assert.deepStrictEqual(resultRounds([], rounds), []);
});
