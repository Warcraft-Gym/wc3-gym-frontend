---
type: Guide
title: Start here by question
description: The questions a new contributor or an agent asks first, each with the concept that answers it; the list is also the benchmark the bundle is read against.
tags: [tooling]
generated: { by: claude-code/claude-fable-5-1, at: 2026-10-01T09:45:36Z }
sources:
  - id: index
    resource: index.md
    title: The bundle map
---

# Running and changing the code

- How do I run the app on my machine against a backend? [Run locally](runbooks/run-locally.md).
- Why is `.env` missing after a clone? [The .env file is not tracked](pitfalls/env-not-tracked.md).
- How do I deploy to production? [Deploy on Vercel](runbooks/deploy-vercel.md).
- Why did main break after two pull requests that each built green? [No CI: build the merged pair](pitfalls/no-ci-build-the-merged-pair.md).
- Which form shows a record, a rating or a result, and how is a colour set checked for a colour-blind reader? [Data display](concepts/data-display.md).
- Which piece already draws this figure, mark, table or chart, and when is another piece right? [Data pieces](concepts/data-pieces.md).
- Where do colours and type come from, and may a page pick its own? [Theme](concepts/theme.md), by [the tokens decision](decisions/design-tokens-only.md).

# How the app is built

- Which routes may a guest, a member, a captain or an admin open? [App shell and routing](concepts/app-shell-and-routing.md).
- How does the app know the viewer's role? [Session and auth](concepts/session-and-auth.md).
- May a view call the backend, or must a store? [Stores](concepts/stores.md).
- Which backend fields does this app rely on, by route? [The backend contract](concepts/backend-contract.md).
- When does a player name open the side panel instead of linking? [Shared components](concepts/shared-components.md), by [the panel decision](decisions/player-panel-drafting-only.md).
- Which table draws grouped rows? [One grouped table](decisions/grouped-table.md).
- Why does Clerk run in proxy mode on this domain? [Clerk proxy mode](decisions/clerk-proxy-mode.md).

# The pages

- What does an admin do on the event run page, from a new league to awards? [Event management](pages/event-management.md).
- Where does a member sign up for a season and set availability? [Member self-service](pages/member.md).
- What can a captain do on the draft page? [The GNL season](pages/gnl-season.md).
- Where is a result reported and the veto entered? [Fixtures and series](pages/fixtures-and-series.md).

# The flows

- What has to happen between a signup and the first reported result, and who is waiting on whom? [A member's GNL season](flows/gnl-season-for-a-member.md).
- Which steps take a cup from an empty league to its awards, and where do the members act? [Run a cup](flows/run-a-cup.md).
- How does a KOTH night run from "Open tonight" to the close, and which pages read its board? [A KOTH night](flows/koth-night.md).
- Which states does a series pass through, and who moves it out of each one? [The life of one series](flows/series-lifecycle.md).
- When does a member register a fantasy team, until when may he bet, and when does the team freeze? [A fantasy season](flows/fantasy-season.md).

# The benchmark

A reader who starts at [the bundle map](index.md) should reach each answer in two hops: the map names the directory, the directory index names the concept. When a question here misses, the fix is the index line, not this list.
