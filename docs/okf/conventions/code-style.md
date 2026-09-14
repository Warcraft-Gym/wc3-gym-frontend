---
type: Convention
title: Code style
description: Vue 3 with Vuetify and Pinia, pure helpers in .mjs files with node tests, theme tokens instead of colour values, Title Case page titles, and one-line comments.
resource: ../../../package.json
tags: [vue, style, tooling]
generated: { by: claude-code/claude-fable-5-1, at: 2026-09-14T14:30:00Z }
sources:
  - id: package
    resource: ../../../package.json
    title: Dependencies and scripts
  - id: design
    resource: ../../../DESIGN.md
    title: Design rules
  - id: eslint
    resource: ../../../.eslintrc.cjs
    title: The lint rules
---

# Stack

Vue 3 with `<script setup>`, Vuetify 3 for every control, Pinia for the stores, vue-router 4 on plain paths, Vite. Clerk's Vue SDK owns the member session. Luxon for dates, d3 for chart maths, flagpack for flags. `npm run lint` runs ESLint with `vue3-essential` and `eslint:recommended` and fixes what it can.

# Where logic goes

- A view (`src/views/*.vue`) draws a page and calls stores. A component (`src/components/*.vue`) is a reusable piece; see [shared components](../concepts/shared-components.md).
- A store (`src/stores/*.store.js`) owns the fetches for one area. See [stores](../concepts/stores.md).
- A pure rule goes in `src/helpers/<name>.mjs` with a `<name>.test.mjs` beside it, run by `npm test` on node's own test runner. No Vue import in an `.mjs` helper, so it runs in node. Examples: the season phase words, the best-of and map rules, the draft order, the bracket layout, the fantasy tiers, the event labels.
- The few `.js` helpers (`router.js`, `fetch-wrapper.js`, `backend-url.js`, `theme.js`) touch the browser or the stores.

# Colour and type

Every colour is a theme token from `src/helpers/palette.mjs`: `color="primary"`, `class="text-win"`, `rgb(var(--v-theme-loss))`. Never a hex value or a Vuetify palette name in a view. Text wears a text token; a result, a tier or a race gets a small coloured mark beside the text. Colour never carries meaning alone. `DESIGN.md` lists every token with its light and dark value and where it is used, and `palette.test.mjs` checks the contrast pairs. A pull request that adds a token or closes a known gap edits `DESIGN.md` too.

# Words on the page

- Page titles (`h1`) and app bar and menu entries use Title Case. Everything else uses sentence case: dialog titles, buttons, labels, hints, columns, alerts, chips, card titles.
- A column title is a short noun with no legend in brackets. Numeric columns are right-aligned. No table shows a database id.
- A hint is one short instruction, or nothing.
- Use the events vocabulary from the `Events` section of `DESIGN.md`: league, event, stage, round, fixture, series, game, division. Never "week", never "team series", never "match" for a series.

# Comments and prose

A comment describes the current state in the present tense, on one line where it can. Nothing about what used to be, no TODO. Prose in pull requests and in this bundle uses short plain sentences. See [the writing rule](okf-bundle.md).

# What not to add

- No second table component, no second player-name fragment, no hand-rolled chart when a `GroupedTable`, a `PlayerName` or a d3 scale already exists.
- No second copy of a pure rule. A rule two pages need lives once in `src/helpers`, under one name, with one node test. Before writing a helper, search `src/helpers` for the same arithmetic or the same label under another name, and call that one.
- No configuration knob that restates a library default.
- No hand-written parser over a binary format. The replay reader inflates a block and searches its text; it never walks records.
