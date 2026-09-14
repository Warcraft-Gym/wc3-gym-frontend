import test from 'node:test';
import assert from 'node:assert/strict';
import { openNight } from './koth.mjs';

test('the night is the newest published event that is not finished', () => {
  const events = [
    { id: 1, starts_at: '2026-09-14T18:00:00Z', phase: 'signups_open' },
    { id: 2, starts_at: '2026-09-15T18:00:00Z', phase: 'finished' },
    { id: 3, starts_at: '2026-09-13T18:00:00Z', phase: 'running' },
    { id: 4, starts_at: '2026-09-16T18:00:00Z', published: false, phase: 'draft' },
  ];
  assert.equal(openNight(events).id, 1);
});

test('no open night reads as null', () => {
  assert.equal(openNight([{ id: 2, phase: 'finished' }]), null);
  assert.equal(openNight([]), null);
});

test('events with no instant fall back to the start day, then to the newest id', () => {
  const events = [
    { id: 5, start_date: '2026-09-12', phase: 'running' },
    { id: 9, start_date: '2026-09-12', phase: 'running' },
  ];
  assert.equal(openNight(events).id, 9);
});
