import { test } from 'node:test';
import assert from 'node:assert/strict';
import { changedSettings } from './settings-diff.mjs';

test('a failed load sends nothing, so the blank form cannot null the settings', () => {
  const blank = { current_gnl_season: '', announcement_role_id: '', results_channel_id: '' };
  assert.deepEqual(changedSettings(null, blank), {});
});

test('only the edited keys are sent', () => {
  const loaded = { current_gnl_season: 7, announcement_role_id: '123', results_channel_id: '456' };
  const current = { current_gnl_season: 8, announcement_role_id: '123', results_channel_id: '456' };
  assert.deepEqual(changedSettings(loaded, current), { current_gnl_season: '8' });
});

test('a cleared field is sent as null', () => {
  assert.deepEqual(changedSettings({ announcement_role_id: '123' }, { announcement_role_id: '' }), { announcement_role_id: null });
});

test('a value retyped the same way is not sent', () => {
  assert.deepEqual(changedSettings({ current_gnl_season: 7 }, { current_gnl_season: '7' }), {});
  assert.deepEqual(changedSettings({ announcement_role_id: null }, { announcement_role_id: '' }), {});
});
