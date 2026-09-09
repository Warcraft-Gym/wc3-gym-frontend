import test from 'node:test';
import assert from 'node:assert/strict';
import { openPlayer, panelPlayerKey, playerPath } from './players.mjs';

// The panel and the page must address the same player, and a row without a
// battle tag (a ladder opponent, a leaderboard row) still has to open.
test('the panel opens on the battle tag, like the page address does', () => {
  openPlayer({ id: 152, battleTag: 'Itsjustagame#11493' });
  assert.equal(panelPlayerKey.value, 'Itsjustagame#11493');
  assert.equal(playerPath({ id: 152, battleTag: 'Itsjustagame#11493' }), '/player/Itsjustagame%2311493');
});

test('a row with no battle tag opens on the id', () => {
  openPlayer({ id: 152 });
  assert.equal(panelPlayerKey.value, '152');
  assert.equal(playerPath({ id: 152 }), '/player/152');
});

test('null closes the panel', () => {
  openPlayer({ id: 152 });
  panelPlayerKey.value = null;
  assert.equal(panelPlayerKey.value, null);
});
