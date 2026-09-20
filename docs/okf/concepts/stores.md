---
type: Domain Concept
title: Stores
description: One store module per area holds every call to the backend; three of them also hold state the pages share. Views never fetch on their own.
resource: ../../../next/src/stores/index.ts
tags: [stores]
generated: { by: claude-code/claude-fable-5-1, at: 2026-09-20T09:00:00Z }
sources:
  - id: index
    resource: ../../../next/src/stores/index.ts
    title: The stores, exported once
  - id: event
    resource: ../../../next/src/stores/event.ts
    title: A worked example
  - id: season
    resource: ../../../next/src/stores/season.ts
    title: The GNL event adapter
---

# Shape

`next/src/stores/index.ts` re-exports every store. A store is a plain module: `use<Area>Store()` returns the methods that call `fetchWrapper`, and each method returns the answer, so a view awaits it and keeps the rows in its own state. `use<Area>Store` is a plain function, not a React hook, so the fetch wrapper and the guard call it outside React. Three stores also hold state that several pages share, in a small `box` (`next/src/stores/box.ts`) that React reads through `useSyncExternalStore`: `useAuth()` for the session, `useSeason()` for the season list and the current season, `useLadder()` for the ladder reads and the sync progress. A store holds no derived numbers; the backend answers them.

| Store | Owns the calls for |
|---|---|
| `auth` | the session: `user` (the admin token), `me`, `viewAs`, `loginError` |
| `season` | the season list, the current season, its maps, rounds, signups, achievements, ladder |
| `event` | leagues, one league, events, one event, the entrants, stages, standings and nights |
| `player` | players, one player, the player's own series and history |
| `team` | teams, a team, a team's season page, the availability grid |
| `match` | fixtures, draft series and the replays of a fixture |
| `series` | series, casts, games, the veto board, replay links, free time, the round draft board and its state |
| `availability` | the round answers and the soft blocks |
| `map` | maps and the ladder import |
| `config` | settings, admins, Discord role bindings and the sync |
| `fantasy` | fantasy teams, bets, tiers, the breakdown |
| `ladder` | the season and player ladder reads |
| `player_career_stats` | career rows |

# Rules

- A view calls a store; a component receives props. Neither imports `fetchWrapper`.
- `ensureSeasons()` loads the season list once; the guard calls it for routes that carry a slug.
- The season store selects the league whose kind is `gnl`, reads its rows through `/events`, and translates the common event phase into the four season-page lifecycle words.
- The team store uses that GNL league id for team identity routes and an event id for rosters, captains, availability and standings.
- `resolveCurrentSeasonId()` in `next/src/helpers/current-season.js` reads the `current_gnl_season` setting and falls back to the newest season, the same rule the backend applies.
- A store method that writes returns the backend's answer and lets the view refetch what it shows. A store makes no optimistic update.
- A read that the browser caches takes a third argument on `fetchWrapper`, the options `fetch` itself takes; the round draft reads pass `{ cache: "no-store" }` after a write.
- `next/src/stores/season-api.test.mjs` reads the store sources and fails when one calls a season route the event API replaced.
