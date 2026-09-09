import { test } from 'node:test';
import assert from 'node:assert/strict';
import { allMatches, raceTotal } from './all-matches.mjs';

// A reader that hands out `games` matches of one race, `size` at a time
const reader = (games, size) => async (offset) => ({
    race: 'OC',
    by_race: { OC: games },
    matches: Array.from({ length: Math.min(size, games - offset) }, (_, i) => offset + i),
});

test('the signup race is the total before a race is chosen', () => {
    const answer = { race: 'OC', by_race: { OC: 379, NE: 42 } };
    assert.equal(raceTotal(answer, null), 379);
    assert.equal(raceTotal(answer, 'NE'), 42);
    assert.equal(raceTotal(answer, 'UD'), 0);
});

test('a backend without by_race falls back to the scored games', () => {
    assert.equal(raceTotal({ race: 'OC', games: 379 }, null), 379);
    assert.equal(raceTotal({}, null), 0);
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

test('a chosen race pages by its own count, not the scored one', async () => {
    let reads = 0;
    const read = async (offset) => {
        reads += 1;
        return {
            race: 'OC',
            by_race: { OC: 900, NE: 700 },
            matches: Array.from({ length: Math.min(500, 700 - offset) }, (_, i) => offset + i),
        };
    };
    const answer = await allMatches(read, 'NE');
    assert.equal(answer.matches.length, 700);
    assert.equal(reads, 2);
});

test('a count larger than the rows does not loop forever', async () => {
    const answer = await allMatches(async () => ({ race: 'OC', by_race: { OC: 99 }, matches: [] }));
    assert.deepEqual(answer.matches, []);
});
