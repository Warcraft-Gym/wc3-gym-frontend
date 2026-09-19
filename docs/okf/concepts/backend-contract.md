---
type: Integration
title: The backend contract, as consumed here
description: What this app relies on from the wc3-gym-backend API, named by route and field, and where those reliances live in the code.
resource: ../../../next/src/stores
tags: [stores]
generated: { by: claude-code/claude-fable-5-1, at: 2026-09-19T19:10:00Z }
sources:
  - id: stores
    resource: ../../../next/src/stores
    title: Every fetch, one store per area
  - id: fetch
    resource: ../../../next/src/helpers/fetch-wrapper.js
    title: The envelope and the paging
  - id: backend-url
    resource: ../../../next/src/helpers/backend-url.js
    title: The one place the URL is read
---

The backend repository, `wc3-gym-backend`, owns every definition below. This file says only what this app reads, so a backend change can find its consumers.

# The base URL

`NEXT_PUBLIC_BACKEND_URL`, read once in `next/src/helpers/backend-url.js`, which throws at load and at build when it is unset. Locally it is `/api`, which Next proxies to the backend that `PROXY_TARGET` names. On a Vercel target it is the backend's absolute URL, set on the project per environment and inlined at build time. `/api` on Vercel has no route and never reaches the backend. See [the pitfall](../pitfalls/env-not-tracked.md).

# Rules relied on everywhere

- Every error is `{"error": "<text>"}`, sometimes with a `message` beside an `error` code. The wrapper reads both.
- List routes take `limit` (up to 500) and `offset` and answer `X-Total-Count`; `sort` and `order` on the routes that support them.
- Reads are open. A write needs an admin or the owning member; the app hides the buttons of writes the role cannot make, because a 401 ends the session.
- The event API answers a GNL run with the common phase words. The season store translates them to `open`, `commenced`, `overdue` and `complete`; `finished` with an unscored count is overdue.
- Payloads nested under the older GNL routes keep `season_id`, `playday` and the four season phase words.
- A series answers `player1_race` / `player2_race` resolved, and takes `player1_off_race` / `player2_off_race` on a write.
- Every datetime is UTC and ends in `Z`; Luxon reads it and shows the viewer's zone.
- The veto board answer carries `week_map_id` for the fixed map of game 1; the name is kept on purpose.
- The veto board answer carries `viewer_side` (`A`, `B`, or null for an admin, who edits either side). Each side is a player or a team: `id` and `name` are the user's, or null for a team side, which sets `team_id` and `team_name` instead.

# The session answer

`GET /me`: `role` (`guest`, `member`, `captain`, `admin`), `actual_role`, `name`, `avatar`, `user` (the linked player or null), `superadmin`, `signed_up`, `season_id`, `team`, `seats` (a list of `{team_id, season_id}`), and `seasons` (every running season with `phase`, `signups_open`, `scheduling_enabled`, `checkin_days`, dates, `signed_up`, `team`, `captain`). The router guard, the app bar, the home page and every draft page read it.

# Routes by store

| Store | Routes |
|---|---|
| `auth` | `POST /login`, `GET /me` |
| `season` | `/leagues`, `/events?league_id={id}`, `/events/{id}`, `/events/{id}/maps`, `/maps/order`, `/rounds`, `/signups`, `/signups/{user}`, `/teams`, `/achievements`, `/ladder`, `/ladder/players`, `/ladder-sync`, `/maps/ladder-import`, `/achievements`, `/import`, `/export` |
| `event` | `/leagues`, `/leagues/{id}`, `/events`, `/events/{id}`, `/me/events`, `/events/{id}/entrants...`, `/divisions`, `/divisions/assign`, `/stages`, `/stages/{id}/seeds`, `/seeds/lock`, `/generate`, `/rounds`, `/series`, `/standings`, `/advance`, `/finish`, `/koth/nights`, `/koth/nights/{id}/close` |
| `player` | `/users`, `/users/{id}`, `/users/{id}/ban`, `/users/{id}/history`, `/users/{id}/w3c-sync`, `/users/{id}/ladder`, `/users/search`, `/user-info`, `/signup`, `/player-series`, `/player-history` |
| `team` | `/leagues/{league_id}/teams`, `/leagues/{league_id}/teams/basic`, `/leagues/{league_id}/teams/{id}`, `/events/{event_id}/teams`, `/events/{event_id}/teams/basic`, `/events/{event_id}/teams/{id}`, `/players`, `/captains`, `/availability`, `/ladder-sync`, `/image` |
| `match` | `/matches`, `/matches/{id}`, `/matches/{id}/replays`, `/player-series/{id}/replays/{game}/move/{to_game}`, `/matches/search`, `/draft-series...`, `/draft-series/{id}/promote` |
| `series` | `/series`, `/series/{id}`, `/series/{id}/result-kind`, `/series/{id}/places`, `/series/{id}/sides`, `/series/search`, `/events/{event_id}/series/search`, `/series/{id}/casts...`, `/casts/last`, `/series/{id}/games`, `/player-series/{id}`, `/player-series/{id}/veto`, `/player-series/{id}/replays/{game}/upload-url`, `/player-series/{id}/free-time` |
| `availability` | `/player-availability`, `/player-blocks...`, `/events/{event_id}/teams/{team_id}/availability` |
| `map` | `/maps`, `/maps/{id}`, `/maps/ladder-import`, `/maps/{id}/image` |
| `config` | `/config/settings`, `/config/settings/{key}`, `/config/w3c`, `/config/admins`, `/config/discord-role-bindings...`, `/config/discord-hidden-roles`, `/config/discord-roles`, `/config/discord-roles/sync`, `/config/discord-guild-roles`, `/config/discord-role-groups`, `/config/koth/nightbot-token` |
| `fantasy` | `/fantasy/teams...`, `/fantasy/bets...`, `/events/{event_id}/fantasy/tiers`, `/events/{event_id}/fantasy/teams/{team_id}/breakdown`, `/fantasy-team`, `/fantasy-bet` |
| `ladder` | `/events/{id}/ladder`, `/events/{id}/ladder-sync`, `/users/{id}/ladder` |
| `player_career_stats` | `/stats/career`, `/stats/career/{id}` |

The backend pins the GNL payloads, the error envelope and the paged routes in its own tests. A field this app reads that is not in those tests is a reliance the backend cannot see; add a line here when you add one, and tell the backend.

# What the app never does

It never builds a URL from a template without the one `backendUrl` import, never reads `error.detail`, never sends a request with `credentials`, and never caches a backend answer beyond the session, except the `me` row.
