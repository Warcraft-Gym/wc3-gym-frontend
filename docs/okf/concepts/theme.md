---
type: Domain Concept
title: Theme
description: One look, stone and bronze, in a light and a dark theme, two typefaces, every value in one palette file, the choice stored per browser.
resource: ../../../src/helpers/palette.mjs
tags: [design]
generated: { by: claude-code/claude-fable-5-1, at: 2026-09-14T17:30:00Z }
sources:
  - id: palette
    resource: ../../../src/helpers/palette.mjs
    title: Every theme colour
  - id: theme
    resource: ../../../src/helpers/theme.js
    title: Light, dark or system
  - id: design
    resource: ../../../DESIGN.md
    title: The tokens, with where each is used
---

- `src/helpers/palette.mjs` is the only place a colour value is written. `main.js` hands both themes to Vuetify. `DESIGN.md` documents every token; if the two differ, the code is right and the document needs a fix.
- `src/helpers/theme.js` picks light, dark or the system setting; the choice sits in `localStorage` under `theme`, and `activeTheme()` runs before the first paint so the page never flashes.
- Dark is its own set of values, not an inverted light. A new token gets both values and, when text sits on it, an `on-<token>` ink. `palette.test.mjs` checks the contrast.
- Win is blue and loss is red-orange, never green and red, for red-green colour blindness. Status colours (`error`, `warning`, `info`, `success`) mean a state of the app and are never chart series.
- Type: Alegreya for headings, Alegreya Sans for everything else, both bundled; every number uses lining tabular digits.
- The `?readonly=1` embed is always light.

The steps to add a colour, and the known gaps where the app still breaks its own rules, are in `DESIGN.md`.
