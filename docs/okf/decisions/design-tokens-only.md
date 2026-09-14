---
type: Decision
title: Colours are tokens, in one file
description: Every colour is a theme token from palette.mjs with a light and a dark value; no hex value or Vuetify palette name in a view.
tags: [design]
generated: { by: claude-code/claude-fable-5-1, at: 2026-09-14T10:00:00Z }
sources:
  - id: source
    resource: ../../../DESIGN.md
    title: Rules
---

# Decision

The stone and bronze look, light and dark, was approved on 2026-09-11 and written into `DESIGN.md` on 2026-09-13. `palette.mjs` is the one place a value lives; `palette.test.mjs` checks every ink on its fill.

# Why

A colour written in a view drifts from the theme and breaks in dark. A test on the pairs keeps the contrast honest without looking at every page.

# Consequences

- Text wears a text token; a result, tier or race gets a mark beside the text, never coloured text.
- Win is blue and loss is red-orange. Status colours are not chart series.
- Two exceptions are allowed: the Discord brand colours on the Discord buttons and the trophy artwork.
- A pull request that adds a token also edits `DESIGN.md`.
