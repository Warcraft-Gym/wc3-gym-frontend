import { test } from 'node:test';
import assert from 'node:assert/strict';
import { changedSettings } from './settings-diff.mjs';

test('a failed load sends nothing, so the blank form cannot null the settings', () => {
  const blank = { current_gnl_season: '', admin_role: '', results_channel_id: '' };
  assert.deepEqual(changedSettings(null, blank), {});
});

test('only the edited keys are sent', () => {
  const loaded = { current_gnl_season: 7, admin_role: '123', results_channel_id: '456' };
  const current = { current_gnl_season: 8, admin_role: '123', results_channel_id: '456' };
  assert.deepEqual(changedSettings(loaded, current), { current_gnl_season: '8' });
});

test('a cleared field is sent as null', () => {
  assert.deepEqual(changedSettings({ admin_role: '123' }, { admin_role: '' }), { admin_role: null });
});

test('a value retyped the same way is not sent', () => {
  assert.deepEqual(changedSettings({ current_gnl_season: 7 }, { current_gnl_season: '7' }), {});
  assert.deepEqual(changedSettings({ admin_role: null }, { admin_role: '' }), {});
});
