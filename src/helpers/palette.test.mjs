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
// what an ink painted at `alpha` over `ground` actually looks like
const over = (ink, ground, alpha) => {
  const [a, b] = [srgb(ink), srgb(ground)];
  return '#' + a.map((v, i) => Math.round((v * alpha + b[i] * (1 - alpha)) * 255).toString(16).padStart(2, '0')).join('');
};
// Vuetify paints a field label in on-surface at 0.87, then applies medium-emphasis-opacity on top (measured in Chromium)
const LABEL_FACTOR = 0.87;
// OKLab distance x100: how far apart two colours look to a full-colour reader
const oklab = (hex) => {
  const [r, g, b] = srgb(hex).map(toLinear);
  const l = Math.cbrt(0.4122214708 * r + 0.5363325363 * g + 0.0514459929 * b);
  const m = Math.cbrt(0.2119034982 * r + 0.6806995451 * g + 0.1073969566 * b);
  const s = Math.cbrt(0.0883024619 * r + 0.2817188376 * g + 0.6299787005 * b);
  return [0.2104542553 * l + 0.7936177850 * m - 0.0040720468 * s,
    1.9779984951 * l - 2.4285922050 * m + 0.4505937099 * s,
    0.0259040371 * l + 0.7827717662 * m - 0.8086757660 * s];
};
const deltaE = (a, b) => Math.hypot(...oklab(a).map((v, i) => v - oklab(b)[i])) * 100;

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

  test(`${name}: a form label passes AA on every ground it sits on`, () => {
    const alpha = theme.variables['medium-emphasis-opacity'] * LABEL_FACTOR;
    for (const ground of [colors.surface, colors.background, colors['surface-light']]) {
      const painted = over(colors['on-surface'], ground, alpha);
      assert.ok(contrast(painted, ground) >= AA, `${painted} on ${ground} is ${contrast(painted, ground).toFixed(2)}:1`);
    }
  });

  test(`${name}: every tier fill names its own ink`, () => {
    for (let tier = 1; tier <= 6; tier++) {
      assert.ok(colors[`on-tier-${tier}`], `tier-${tier} falls back to Vuetify's white, which is under AA on these fills`);
    }
  });

}

// The light pair sits at 9.3: both have to be dark enough to carry white text, which holds them in one red.
test('dark: error does not read as the loss colour', () => {
  const { error, loss } = themes.dark.colors;
  assert.ok(deltaE(error, loss) >= 15, `error ${error} vs loss ${loss} is only ${deltaE(error, loss).toFixed(1)} apart`);
});
