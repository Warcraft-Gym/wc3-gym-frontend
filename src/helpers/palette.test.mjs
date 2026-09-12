import { test } from 'node:test';
import assert from 'node:assert/strict';
import { themes } from './palette.mjs';

const AA = 4.5;  // WCAG AA for text

const srgb = (hex) => [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255);
const toLinear = (c) => (c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4);
const luminance = (hex) => {
  const [r, g, b] = srgb(hex).map(toLinear);
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
};
const contrast = (a, b) => {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (hi + 0.05) / (lo + 0.05);
};

for (const [name, theme] of Object.entries(themes)) {
  const colors = theme.colors;

  test(`${name}: every declared ink passes AA on its fill`, () => {
    for (const [key, ink] of Object.entries(colors)) {
      if (!key.startsWith('on-')) continue;
      const fill = colors[key.slice(3)];
      if (!fill) continue;  // on-surface and friends are inks for a ground named elsewhere
      assert.ok(contrast(fill, ink) >= AA, `${key} ${ink} on ${fill} is ${contrast(fill, ink).toFixed(2)}:1`);
    }
  });

  test(`${name}: every tier fill names its own ink`, () => {
    for (let tier = 1; tier <= 6; tier++) {
      assert.ok(colors[`on-tier-${tier}`], `tier-${tier} falls back to Vuetify's white, which is under AA on these fills`);
    }
  });
}

