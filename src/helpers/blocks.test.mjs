import { test } from 'node:test';
import assert from 'node:assert/strict';
import { asBlock, asBusy, bitsOf, blockFields, blockLine, busyFields, busyLine, commonHours, dayLabel, daysOf, dirty, freeLines, mark, weekFree } from './blocks.mjs';

test('weekday bits read as ISO days, Monday first', () => {
  assert.deepEqual(daysOf(1), [1]);
  assert.deepEqual(daysOf(64), [7]);
  assert.deepEqual(daysOf(31), [1, 2, 3, 4, 5]);
  assert.deepEqual(daysOf(0), []);
  assert.equal(bitsOf([1, 2, 3, 4, 5]), 31);
  assert.equal(bitsOf([7]), 64);
  assert.equal(bitsOf(daysOf(96)), 96);
});

test('a run of three days or more reads as a range', () => {
  assert.equal(dayLabel(31), 'Mon–Fri');
  assert.equal(dayLabel(96), 'Sat, Sun');
  assert.equal(dayLabel(5), 'Mon, Wed');
  assert.equal(dayLabel(127), 'Every day');
  assert.equal(dayLabel(1), 'Mon');
});

test('a block past midnight says so', () => {
  assert.equal(blockLine({ weekdays: 31, start_local: '09:00:00', end_local: '17:00:00' }), 'Mon–Fri 09:00–17:00');
  assert.equal(blockLine({ weekdays: 96, start_local: '22:00:00', end_local: '02:00:00' }), 'Sat, Sun 22:00–02:00 (next day)');
});

test('busy days read as their window', () => {
  assert.equal(busyLine({ first_day: '2026-09-13', last_day: '2026-09-19' }), '13 to 19 Sep');
  assert.equal(busyLine({ first_day: '2026-09-13', last_day: '2026-09-13' }), '13 Sep');
});

test('the week preview is what the blocks leave open, spill included', () => {
  const blocks = [
    { weekdays: 31, start_local: '09:00:00', end_local: '17:00:00' },   // Mon–Fri work
    { weekdays: 127, start_local: '23:00:00', end_local: '07:00:00' },  // asleep, past midnight
  ];
  const week = weekFree(blocks);
  assert.equal(week.length, 7);
  assert.equal(week[0].name, 'Mon');
  assert.equal(week[0].line, '07:00–09:00, 17:00–23:00');  // Sunday's sleep spills into Monday
  assert.equal(week[5].line, '07:00–23:00');               // Saturday has no work block
});

test('a fully blocked day and a free day each get their own line', () => {
  assert.equal(weekFree([{ weekdays: 1, start_local: '00:00:00', end_local: '00:00:00' }])[0].line, 'Nothing open');
  assert.equal(weekFree([])[3].line, 'All day');
});

test('a row saved round-trip stops asking to be saved', () => {
  const row = mark({ ...blockFields(null), days: [1, 2, 3, 4, 5], start: '09:00', end: '17:00', label: 'Work' }, asBlock);
  assert.equal(dirty(row, asBlock), true);  // no id yet, so the backend holds nothing
  Object.assign(row, blockFields({ id: 7, label: 'Work', weekdays: 31, start_local: '09:00:00', end_local: '17:00:00' }));
  mark(row, asBlock);
  assert.equal(dirty(row, asBlock), false);
  assert.deepEqual(asBlock(row), { label: 'Work', weekdays: 31, start_local: '09:00', end_local: '17:00' });

  const away = mark(busyFields({ id: 3, label: null, first_day: '2026-09-13', last_day: '2026-09-19' }), asBusy);
  assert.equal(dirty(away, asBusy), false);
  assert.deepEqual(asBusy(away), { label: null, first_day: '2026-09-13', last_day: '2026-09-19' });
  away.label = 'Trip';
  assert.equal(dirty(away, asBusy), true);
});

test('shared ranges read in the viewer zone, a crossing range names both days', () => {
  const ranges = [
    { start: '2026-09-17T17:00:00+00:00', end: '2026-09-17T21:00:00+00:00' },
    { start: '2026-09-18T22:00:00+00:00', end: '2026-09-19T01:00:00+00:00' },
  ];
  assert.deepEqual(freeLines(ranges, 'UTC'), ['Thu 17 Sep, 17:00–21:00', 'Fri 18 Sep, 22:00 to Sat 19 Sep, 01:00']);
  assert.deepEqual(freeLines(ranges, 'Europe/Berlin'), ['Thu 17 Sep, 19:00–23:00', 'Sat 19 Sep, 00:00–03:00']);
});

test('hours in common are worded, and zero says so', () => {
  assert.equal(commonHours(14), '14 h in common this round');
  assert.equal(commonHours(13.5), '13.5 h in common this round');
  assert.equal(commonHours(0.5), '30 min in common this round');
  assert.equal(commonHours(0), 'No hours in common this round');
});
