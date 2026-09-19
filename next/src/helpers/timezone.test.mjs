import { test } from 'node:test';
import assert from 'node:assert/strict';
import { gmt, pickerParts, storedUtc, zoneLabel } from './timezone.mjs';

const LON = 'Europe/London';
const NY = 'America/New_York';

// 2026: New York moves its clocks on 8 March, London on 29 March
test('London against New York follows each side on its own switch date', () => {
  assert.equal(zoneLabel(LON, NY, '2026-03-01T20:00:00'), 'Europe/London · GMT · 5 h ahead of you');
  assert.equal(zoneLabel(LON, NY, '2026-03-15T20:00:00'), 'Europe/London · GMT · 4 h ahead of you');
  assert.equal(zoneLabel(LON, NY, '2026-04-05T20:00:00'), 'Europe/London · GMT+1 · 5 h ahead of you');
  assert.equal(zoneLabel(NY, LON, '2026-03-15T20:00:00'), 'America/New_York · GMT-4 · 4 h behind you');
  assert.equal(zoneLabel(NY, LON, '2026-03-01T20:00:00'), 'America/New_York · GMT-5 · 5 h behind you');
});

test('a half hour zone keeps its minutes', () => {
  assert.equal(zoneLabel('Asia/Kolkata', LON, '2026-03-15T12:00:00'), 'Asia/Kolkata · GMT+5:30 · 5 h 30 min ahead of you');
  assert.equal(zoneLabel('Asia/Kolkata', NY, '2026-03-15T12:00:00'), 'Asia/Kolkata · GMT+5:30 · 9 h 30 min ahead of you');
  assert.equal(zoneLabel(LON, 'Asia/Kolkata', '2026-04-05T12:00:00'), 'Europe/London · GMT+1 · 4 h 30 min behind you');
  assert.equal(gmt(-210), 'GMT-3:30');
});

test('an opponent with no zone gets no label', () => {
  assert.equal(zoneLabel(null, LON), '');
  assert.equal(zoneLabel('', LON), '');
  assert.equal(zoneLabel(undefined, LON), '');
  assert.equal(zoneLabel('Not/AZone', LON), '');
});

test('the viewer own zone names no difference; another zone on the same offset says so', () => {
  assert.equal(zoneLabel(LON, LON, '2026-03-15T12:00:00'), 'Europe/London · GMT');
  assert.equal(zoneLabel('Europe/Lisbon', LON, '2026-03-15T12:00:00'), 'Europe/Lisbon · GMT · same time as you');
});

test('a series time read into the pickers and saved again is the same UTC instant', () => {
  for (const zone of [NY, LON, 'Asia/Kolkata', 'Pacific/Auckland']) {
    for (const stored of ['2026-03-08T07:30:00', '2026-03-29T00:30:00', '2026-09-12T23:45:00']) {
      const { date, time } = pickerParts(stored, zone);
      assert.equal(storedUtc(date, time, zone), stored, `${zone} ${stored}`);
    }
  }
});

test('a time typed in the admin zone is stored as UTC', () => {
  assert.equal(storedUtc(new Date(2026, 2, 15), '20:00', NY), '2026-03-16T00:00:00');
  assert.equal(storedUtc(new Date(2026, 2, 15), '20:00', LON), '2026-03-15T20:00:00');
  assert.equal(storedUtc(new Date(2026, 2, 15), '20:00', 'Asia/Kolkata'), '2026-03-15T14:30:00');
});
