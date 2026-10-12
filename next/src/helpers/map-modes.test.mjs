import assert from 'node:assert';
import test from 'node:test';

import { cupMode, forMode, modesLine, modesOf, modesText } from './map-modes.mjs';

test('a map stores its modes once each, in their own order', () => {
  assert.deepStrictEqual(modesOf('1v1,2v2'), ['1v1', '2v2']);
  assert.deepStrictEqual(modesOf(null), []);
  assert.strictEqual(modesText(['ffa', '2v2', '1v1']), '1v1,2v2,ffa');
  assert.strictEqual(modesText([]), null);
  assert.strictEqual(modesLine('2v2,ffa'), '2v2 · FFA');
  assert.strictEqual(modesLine(''), 'No mode set');
});

test('a cup lists the maps of its own mode first', () => {
  assert.strictEqual(cupMode(null), '1v1');
  assert.strictEqual(cupMode(4), '4v4');
  const maps = [{ name: 'Zeta', modes: '2v2' }, { name: 'Alpha', modes: '1v1' }, { name: 'Beta', modes: null }];
  assert.deepStrictEqual(forMode(maps, '2v2').map((map) => map.name), ['Zeta', 'Alpha', 'Beta']);
  assert.deepStrictEqual(forMode(maps, '1v1').map((map) => map.name), ['Alpha', 'Beta', 'Zeta']);
});
