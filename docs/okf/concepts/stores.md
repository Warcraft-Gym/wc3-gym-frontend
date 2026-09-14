---
type: Domain Concept
title: Stores
description: One Pinia store per area holds the fetched rows and every call to the backend; views never fetch on their own.
resource: ../../../src/stores/index.js
tags: [pinia, stores, state]
generated: { by: claude-code/claude-fable-5-1, at: 2026-09-14T16:30:00Z }
sources:
  - id: index
    resource: ../../../src/stores/index.js
    title: The stores, exported once
  - id: event
    resource: ../../../src/stores/event.store.js
    title: A worked example
---

# Shape

`src/stores/index.js` re-exports every store. A store is `defineStore` with `state` for the rows it holds (`seasons`, `current_season`, `events`, `event` and so on) and `actions` that call `fetchWrapper` and assign the answer. A store method returns the answer too, so a view can await it without reading the state. A store holds no derived numbers; the backend answers them.

| Store | Holds |
|---|---|
| `auth` | the session: `user` (the admin token), `me`, `viewAs`, `loginError` |
| `season` | the season list, the current season, its maps, rounds, signups, achievements, ladder |
| `event` | leagues, one league, events, one event; the entrants, stages, standings and nights are returned to the view, not held |
| `player` | players, one player, the player's own series and history |
| `team` | teams, a team, a team's season page, the availability grid |
| `match` | fixtures and draft series |
| `series` | series, casts, games, the veto board, replay links, free time |
| `availability` | the round answers and the soft blocks |
| `map` | maps and the ladder import |
| `config` | settings, admins, Discord role bindings and the sync |
| `fantasy` | fantasy teams, bets, tiers, the breakdown |
| `ladder` | the season and player ladder reads |
| `player_career_stats` | career rows |

# Rules

- A view calls a store; a component receives props. Neither imports `fetchWrapper`.
- `ensureSeasons()` loads the season list once; the router guard calls it for routes that carry a slug.
- `resolveCurrentSeasonId()` in `src/helpers/current-season.js` reads the `current_gnl_season` setting and falls back to the newest season, the same rule the backend applies.
- A store method that writes returns the backend's answer and lets the view refetch what it shows. There is no optimistic update.
