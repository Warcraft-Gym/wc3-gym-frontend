---
type: Domain Concept
title: Theme
description: One look, stone and gold, in a light and a dark theme, three typefaces, every value in one palette file, the choice stored per browser.
resource: ../../../next/src/helpers/palette.mjs
tags: [design]
generated: { by: claude-code/claude-fable-5-1, at: 2026-09-19T10:06:59Z }
sources:
  - id: palette
    resource: ../../../next/src/helpers/palette.mjs
    title: Every theme colour
  - id: theme
    resource: ../../../next/src/hooks/theme.ts
    title: Light, dark or system
  - id: design
    resource: ../../../DESIGN.md
    title: The tokens, with where each is used
---

- `next/src/helpers/palette.mjs` is the only place a colour value is written. `next/src/app/palette-style.ts` writes both themes into the page as CSS variables named `--v-theme-<token>`, and `globals.css` maps them to the Tailwind colour names, so `text-win` and `rgb(var(--v-theme-win))` are the same colour. `DESIGN.md` documents every token; if the two differ, the code is right and the document needs a fix.
- `next/src/hooks/theme.ts` picks light, dark or the system setting; the choice sits in `localStorage` under `theme`. An inline script in the root layout sets `data-theme` on `<html>` before the first paint, so the page never flashes. With no stored choice the page follows `prefers-color-scheme`.
- Dark is its own set of values, not an inverted light. A new token gets both values and, when text sits on it, an `on-<token>` ink. `palette.test.mjs` checks the contrast.
- Gold is the highlight and the hue of an amount. A banner (`banner` token, #2B2117 light, #1E1710 dark) is a dark warm bar with cream text and a gold title; gold fields (#E7B643 with dark ink) are for buttons and small marks only, and the filled button is embossed gold; gold text uses `primary-text`. `success` is a status, never an action: an action button is `primary`. The dark theme uses the public site's warm near-black grounds (`background` #080503, `surface` #0C0805). Win is blue and loss is a true red, never green and red, for red-green colour blindness. The public league site shares the same data colours and faces. Status colours (`error`, `warning`, `info`, `success`) mean a state of the app and are never chart series.
- Type: Cinzel 700 for the page title and the app bar title, Cardo 700 for headings and for player and team names, Lato 400 and 700 for everything else and every figure, loaded with `next/font`; every number uses lining tabular digits.

The steps to add a colour, and the known gaps where the app still breaks its own rules, are in `DESIGN.md`.
