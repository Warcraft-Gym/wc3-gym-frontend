import { test } from 'node:test';
import assert from 'node:assert/strict';
import { Settings } from 'luxon';
import { checkinOpenNow, checkinPayload, checkinProblem, checkinSummary, checkinWindowLine, durationText, editOpening, openingAmount, toMinutes, unitOf } from './checkin-window.mjs';

// The reader's clock: Berlin, an hour ahead of UTC once summer time ends on 25 Oct 2026
Settings.defaultZone = 'Europe/Berlin';

const CUP = { checkin_enabled: true, checkin_opens_minutes: 120, checkin_closes_minutes: null, early_checkin: false };
const SEASON = { checkin_enabled: true, checkin_opens_minutes: 4320, checkin_closes_minutes: null, early_checkin: true };

test('the opening reads in the largest unit that counts it in whole numbers', () => {
  assert.deepEqual([120, 4320, 90, 60, 1440, 0, null].map(unitOf), ['hours', 'days', 'minutes', 'hours', 'days', 'minutes', 'hours']);
  assert.deepEqual([120, 60, 1440, 4320, 90, 1, 0].map(durationText), ['2 hours', '1 hour', '1 day', '3 days', '90 minutes', '1 minute', '0 minutes']);
});

test('an amount in a unit is sent as minutes, and a blank as null', () => {
  assert.equal(toMinutes('2', 'hours'), 120);
  assert.equal(toMinutes('3', 'days'), 4320);
  assert.equal(toMinutes('45', 'minutes'), 45);
  assert.equal(toMinutes(1.5, 'hours'), 90);
  assert.equal(toMinutes('0', 'days'), 0);
  assert.equal(toMinutes('', 'hours'), null);
  assert.equal(toMinutes(null, 'days'), null);
});

test('the Opens field keeps its unit while the runner types, and changes it only on a pick', () => {
  // the GNL default reads 3 days; a cleared amount keeps days, so 5 is 5 days and not 5 hours
  let field = { minutes: 4320, unit: unitOf(4320) };
  assert.equal(openingAmount(field.minutes, field.unit), 3);
  field = editOpening(field, { amount: '' });
  assert.deepEqual(field, { minutes: null, unit: 'days' });
  assert.equal(openingAmount(field.minutes, field.unit), '');
  field = editOpening(field, { amount: '5' });
  assert.deepEqual(field, { minutes: 7200, unit: 'days' });
  assert.equal(openingAmount(field.minutes, field.unit), 5);
  // 24 typed in hours stays 24 hours, not 1 day
  field = editOpening({ minutes: null, unit: 'hours' }, { amount: '24' });
  assert.deepEqual(field, { minutes: 1440, unit: 'hours' });
  assert.equal(openingAmount(field.minutes, field.unit), 24);
  // a picked unit keeps the amount as typed: 2 hours become 2 days
  assert.deepEqual(editOpening({ minutes: 120, unit: 'hours' }, { unit: 'days' }), { minutes: 2880, unit: 'days' });
  assert.deepEqual(editOpening({ minutes: null, unit: 'hours' }, { unit: 'minutes' }), { minutes: null, unit: 'minutes' });
  // a fraction reads to two decimals, so the field shows 1.5 and 0.33 and not a long tail
  assert.equal(openingAmount(90, 'hours'), 1.5);
  assert.equal(openingAmount(20, 'hours'), 0.33);
});

test('a cup reads when its check-in opens and that it closes at the draw or by hand', () => {
  assert.equal(checkinSummary(CUP, 'cup'), 'Opens 2 hours before the start, closes at the draw or when you close it.');
  // the opening on the reader's clock: 19:00 UTC is 20:00 in Berlin, so it opens at 18:00
  assert.equal(checkinSummary(CUP, 'cup', '2026-10-30T19:00:00Z'), 'Opens 2 hours before the start (30 Oct 2026, 18:00), closes at the draw or when you close it.');
  assert.equal(checkinSummary({ ...CUP, checkin_closes_minutes: 30 }, 'cup'), 'Opens 2 hours before the start, closes 30 minutes before the start or when you close it.');
  assert.equal(checkinSummary({ ...CUP, checkin_enabled: false }, 'cup'), 'No check-in.');
  assert.equal(checkinSummary({ ...CUP, early_checkin: true, checkin_opens_minutes: null }, 'rounds'), "Opens at sign-up, closes at the round's draw or when you close it. Early check-in is on.");
});

test('a GNL season reads its window per round, and late check-in until the round ends', () => {
  assert.equal(checkinSummary({ ...SEASON, early_checkin: false }, 'gnl'), 'Opens 3 days before a round, closes when the round ends (late check-in).');
  assert.equal(checkinSummary(SEASON, 'gnl'), 'Opens 3 days before a round, closes when the round ends (late check-in). Early check-in is on.');
  assert.equal(checkinSummary({ ...SEASON, checkin_opens_minutes: 1440, checkin_closes_minutes: 60, early_checkin: false }, 'gnl'), 'Opens 1 day before a round, closes 1 hour before a round.');
  // a season has no one start, so it names no time even when one is passed
  assert.equal(checkinSummary({ ...SEASON, early_checkin: false }, 'gnl', '2026-10-30T19:00:00Z'), 'Opens 3 days before a round, closes when the round ends (late check-in).');
});

test('the settings cannot close check-in after it opens, nor close it before the start with no minutes', () => {
  assert.equal(checkinProblem(CUP), null);
  assert.equal(checkinProblem({ ...CUP, checkin_closes_minutes: 30 }), null);
  assert.equal(checkinProblem({ ...CUP, checkin_closes_minutes: '' }), 'Say how many minutes before the start check-in closes.');
  assert.equal(checkinProblem({ ...CUP, checkin_closes_minutes: 120 }), 'Check-in must close fewer minutes before the start than it opens.');
  assert.equal(checkinProblem({ ...CUP, checkin_opens_minutes: null, checkin_closes_minutes: 120 }), null);
  // a cup with no check-in asks nothing of the fields it hides, but the server still refuses a close after the opening
  assert.equal(checkinProblem({ ...CUP, checkin_enabled: false, checkin_closes_minutes: '' }), null);
  assert.equal(checkinProblem({ ...CUP, checkin_enabled: false, checkin_closes_minutes: 120 }), 'Check-in must close fewer minutes before the start than it opens.');
});

test('the write sends the minutes and early check-in, and a blank close as the draw', () => {
  assert.deepEqual(checkinPayload(CUP), { checkin_opens_minutes: 120, checkin_closes_minutes: null, early_checkin: false });
  assert.deepEqual(checkinPayload({ ...SEASON, checkin_closes_minutes: 30 }), { checkin_opens_minutes: 4320, checkin_closes_minutes: 30, early_checkin: true });
  assert.deepEqual(checkinPayload({ checkin_opens_minutes: null, checkin_closes_minutes: '' }), { checkin_opens_minutes: null, checkin_closes_minutes: null, early_checkin: false });
});

test("a round's window reads the server's times, or the time a runner closed it", () => {
  const leg = { checkin_opens_at: '2026-10-30T17:00:00Z', checkin_closes_at: null, checkin_closed_at: null };
  assert.equal(checkinWindowLine(leg, false), 'Check-in from 30 Oct 2026, 18:00 until the draw.');
  assert.equal(checkinWindowLine(leg, true), 'Check-in from sign-up until the draw.');
  assert.equal(checkinWindowLine({ ...leg, checkin_closes_at: '2026-10-30T18:30:00Z' }, false), 'Check-in from 30 Oct 2026, 18:00 until 30 Oct 2026, 19:30.');
  assert.equal(checkinWindowLine({ ...leg, checkin_closes_at: '2026-10-30T18:10:00Z', checkin_closed_at: '2026-10-30T18:10:00Z' }, false), 'Check-in closed on 30 Oct 2026, 19:10.');
});

test('a round takes a player between its opening and its close, and early check-in skips the opening', () => {
  const at = (iso) => Date.parse(iso);
  const leg = { checkin_opens_at: '2026-10-30T18:00:00Z', checkin_closes_at: null };
  assert.equal(checkinOpenNow(leg, false, at('2026-10-30T17:59:00Z')), false);
  assert.equal(checkinOpenNow(leg, true, at('2026-10-30T17:59:00Z')), true);
  assert.equal(checkinOpenNow(leg, false, at('2026-10-30T18:00:00Z')), true);
  // a runner's close, a timed close or a finished cup all read as checkin_closes_at
  const closed = { ...leg, checkin_closes_at: '2026-10-30T19:00:00Z' };
  assert.equal(checkinOpenNow(closed, true, at('2026-10-30T18:59:00Z')), true);
  assert.equal(checkinOpenNow(closed, true, at('2026-10-30T19:00:00Z')), false);
});
