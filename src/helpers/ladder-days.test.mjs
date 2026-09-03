import { test } from 'node:test';
import assert from 'node:assert/strict';
import { fillDays, lastPlayed, maxGamesPerDay, winRate } from './ladder-days.mjs';

const perDay = [{ d: '2026-09-03', w: 2, l: 1, mmr: 1510 }];

test('every day of the window appears once, zeros where no game was played', () => {
  const days = fillDays(perDay, '2026-09-02', '2026-09-04');
  assert.deepEqual(days.map((d) => d.d), ['2026-09-02', '2026-09-03', '2026-09-04']);
  assert.deepEqual(days[0], { d: '2026-09-02', w: 0, l: 0, mmr: null });
  assert.deepEqual(days[1], { d: '2026-09-03', w: 2, l: 1, mmr: 1510 });
});

test('the games scale is the busiest day of any player, never below 1', () => {
  assert.equal(maxGamesPerDay([{ per_day: perDay }, { per_day: [{ d: '2026-09-05', w: 4, l: 3 }] }]), 7);
  assert.equal(maxGamesPerDay([{ per_day: [] }]), 1);
});

test('last played and win rate', () => {
  assert.equal(lastPlayed(perDay), '2026-09-03');
  assert.equal(lastPlayed([]), null);
  assert.equal(winRate(2, 1), 67);
  assert.equal(winRate(0, 0), null);
});
