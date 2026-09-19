---
type: Convention
title: Code style
description: Next.js and React with shadcn/ui and Tailwind, pure helpers in .mjs files with node tests, theme tokens instead of colour values, Title Case page titles, and one-line comments.
resource: ../../../next/package.json
tags: [design, tooling]
generated: { by: claude-code/claude-fable-5-1, at: 2026-09-19T10:05:19Z }
sources:
  - id: package
    resource: ../../../next/package.json
    title: Dependencies and scripts
  - id: design
    resource: ../../../DESIGN.md
    title: Design rules
  - id: eslint
    resource: ../../../next/eslint.config.mjs
    title: The lint rules
---

# Stack

Next.js App Router with React and TypeScript, in `next/`. shadcn/ui on Base UI for every control, Tailwind for layout, TanStack Table under the one shared `DataTable`. The stores are plain modules; see [stores](../concepts/stores.md). Clerk's React SDK owns the member session. Luxon for dates, d3 for chart maths, flagpack for flags, Material Design Icons for glyphs. `pnpm lint` runs ESLint with the Next.js config. pnpm is the package manager.

# Where logic goes

- A route is a folder under `next/src/app/(app)/`. Its `page.tsx` stays small and renders a view (`*View.tsx`) in the same folder. The view is a client component: it draws the page and calls stores. A component (`next/src/components/*.tsx`) is a reusable piece; see [shared components](../concepts/shared-components.md).
- A store (`next/src/stores/*.ts`) owns the fetches for one area. See [stores](../concepts/stores.md).
- A pure rule goes in `next/src/helpers/<name>.mjs` with a `<name>.test.mjs` beside it, run by `pnpm test` on node's own test runner. No React import in an `.mjs` helper, so it runs in node. Examples: the season phase words, the best-of and map rules, the draft order, the bracket layout, the fantasy tiers, the event labels.
- The two `.js` helpers (`fetch-wrapper.js`, `backend-url.js`) touch the browser or the stores. A rule that needs React is a hook in `next/src/hooks/`. The route table and the guard are in `next/src/lib/`.

# Colour and type

Every colour is a theme token from `next/src/helpers/palette.mjs`: `className="text-win"`, `bg-primary`, `rgb(var(--v-theme-loss))`. Never a hex value or a Tailwind palette name such as `red-500` in a view. Text wears a text token; a result, a tier or a race gets a small coloured mark beside the text. Colour never carries meaning alone. `DESIGN.md` lists every token with its light and dark value and where it is used, and `palette.test.mjs` checks the contrast pairs. A pull request that adds a token or closes a known gap edits `DESIGN.md` too.

# Words on the page

- Page titles (`h1`) and app bar and menu entries use Title Case. Everything else uses sentence case: dialog titles, buttons, labels, hints, columns, alerts, chips, card titles.
- A column title is a short noun with no legend in brackets. Numeric columns are right-aligned. No table shows a database id.
- A hint is one short instruction, or nothing.
- Use the events vocabulary from the `Events` section of `DESIGN.md`: league, event, stage, round, fixture, series, game, division. Never "week", never "team series", never "match" for a series.

# Comments and prose

A comment describes the current state in the present tense, on one line where it can. Nothing about what used to be, no TODO. Prose in pull requests and in this bundle uses short plain sentences. See [the writing rule](okf-bundle.md).

# What not to add

- No second table component, no second player-name fragment, no hand-rolled chart when a `DataTable`, a `GroupedTable`, a `PlayerName` or a d3 scale already exists.
- No second copy of a pure rule. A rule two pages need lives once in `next/src/helpers`, under one name, with one node test. Before writing a helper, search `next/src/helpers` for the same arithmetic or the same label under another name, and call that one.
- No configuration knob that restates a library default.
- No hand-written parser over a binary format. The replay reader inflates a block and searches its text; it never walks records.
