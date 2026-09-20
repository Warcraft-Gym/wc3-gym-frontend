import { strict as assert } from 'node:assert';
import test from 'node:test';
import { DateTime } from 'luxon';
import { blockedSpans, dayCells, insideBlocked, windowDays, zoneRow } from './schedule-grid.mjs';

const BERLIN = 'Europe/Berlin';
const SEOUL = 'Asia/Seoul';
const NY = 'America/New_York';

// A round of three UTC days with one shared free range on the middle day
const START = '2026-10-05T00:00:00Z';
const END = '2026-10-08T00:00:00Z';
const FREE = [{ start: '2026-10-06T18:00:00Z', end: '2026-10-06T21:00:00Z' }];

test('blocked spans are the window minus the shared free ranges', () => {
  const spans = blockedSpans(FREE, START, END).map((span) => [span.start.toISO(), span.end.toISO()]);
  assert.deepEqual(spans, [
    ['2026-10-05T00:00:00.000Z', '2026-10-06T18:00:00.000Z'],
    ['2026-10-06T21:00:00.000Z', '2026-10-08T00:00:00.000Z'],
  ]);
  // no free range at all blocks the whole window
  assert.equal(blockedSpans([], START, END).length, 1);
  // a window wholly open blocks nothing
  assert.deepEqual(blockedSpans([{ start: START, end: END }], START, END), []);
});

test('a pick inside a blocked range is named, never refused', () => {
  const spans = blockedSpans(FREE, START, END);
  assert.equal(insideBlocked(DateTime.fromISO('2026-10-06T19:00:00Z'), spans), false);
  assert.equal(insideBlocked(DateTime.fromISO('2026-10-06T21:30:00Z'), spans), true);
  assert.equal(insideBlocked(null, spans), false);
});

test('the window starts at now and drops the past', () => {
  const now = DateTime.fromISO('2026-10-06T09:30:00Z');
  const days = windowDays(START, END, BERLIN, now);
  assert.deepEqual(days.map((day) => day.key), ['2026-10-06', '2026-10-07', '2026-10-08']);
  assert.equal(days[0].today, true);
  // the first day opens at the current half hour on the viewer's clock, the last at the window end
  assert.equal(days[0].first.toFormat('HH:mm'), '11:30');
  assert.equal(days[2].last.toISO(), '2026-10-08T02:00:00.000+02:00');
  // a window already over draws no day
  assert.deepEqual(windowDays(START, END, BERLIN, DateTime.fromISO('2026-10-09T00:00:00Z')), []);
});

test('a day holds 48 half hours, and its hours before the window are outside', () => {
  const now = DateTime.fromISO('2026-10-06T09:30:00Z');
  const [today] = windowDays(START, END, BERLIN, now);
  const cells = dayCells(today, blockedSpans(FREE, START, END));
  assert.equal(cells.length, 48);
  assert.equal(cells[0].label, '00:00');
  assert.equal(cells[0].outside, true);
  // 20:00 Berlin is 18:00 UTC, the first open half hour
  const open = cells.find((cell) => cell.label === '20:00');
  assert.equal(open.blocked, false);
  assert.equal(open.outside, false);
  assert.equal(cells.find((cell) => cell.label === '23:00').blocked, true);
});

test('a day that gives back an hour holds 50 of them', () => {
  const now = DateTime.fromISO('2026-10-25T00:00:00Z');
  const [day] = windowDays('2026-10-25T00:00:00Z', '2026-10-26T00:00:00Z', BERLIN, now);
  assert.equal(dayCells(day, []).length, 50);
});

test('each row reads the same point on its own clock, with the date when it differs', () => {
  const pick = DateTime.fromISO('2026-10-04T00:00:00Z');
  const mine = zoneRow(pick, SEOUL, SEOUL);
  const his = zoneRow(pick, NY, SEOUL);
  assert.deepEqual([mine.time, mine.date, mine.gmt, mine.differs], ['09:00', 'Sun 4 Oct', 'GMT+9', false]);
  assert.deepEqual([his.time, his.date, his.gmt, his.differs], ['20:00', 'Sat 3 Oct', 'GMT−4', true]);
  // the same point from Berlin keeps both rows on one date
  assert.equal(zoneRow(DateTime.fromISO('2026-10-04T18:00:00Z'), NY, BERLIN).differs, false);
});
