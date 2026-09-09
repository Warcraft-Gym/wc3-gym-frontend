import { test } from 'node:test';
import assert from 'node:assert/strict';
import { allMatches } from './all-matches.mjs';

// A reader that hands out `games` matches, `size` at a time
const reader = (games, size) => async (offset) => ({
    games,
    matches: Array.from({ length: Math.min(size, games - offset) }, (_, i) => offset + i),
});

test('one page holds every match', async () => {
    const answer = await allMatches(reader(3, 500));
    assert.deepEqual(answer.matches, [0, 1, 2]);
});

test('three pages are read into one list', async () => {
    const answer = await allMatches(reader(1100, 500));
    assert.equal(answer.matches.length, 1100);
    assert.deepEqual(answer.matches.slice(0, 2), [0, 1]);
    assert.equal(answer.matches.at(-1), 1099);
});

test('a count larger than the rows does not loop forever', async () => {
    const answer = await allMatches(async () => ({ games: 99, matches: [] }));
    assert.deepEqual(answer.matches, []);
});
