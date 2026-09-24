---
type: Integration
title: The backend contract, as consumed here
description: What this app relies on from the wc3-gym-backend API, named by route and field, and where those reliances live in the code.
resource: ../../../next/src/stores
tags: [stores]
generated: { by: claude-code/claude-opus-5-5, at: 2026-09-24T15:45:00Z }
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

# The person's tags

A user row carries `tags`: a list of `{id, tag, verified, active, source, first_seen, last_seen}`, one of them active, and `battleTag` equals the active tag. A signup and a roster row carry `played_as`, the tag that season was played as, or null. `GET /users/{key}` takes an id or any tag the person holds. The merge answers `{stops, removes, moves}`, three lists of sentences, when `dry_run` is true.

# The session answer

`GET /me`: `role` (`guest`, `member`, `captain`, `admin`), `actual_role`, `name`, `avatar`, `user` (the linked player or null), `superadmin`, `signed_up`, `season_id`, `team`, `seats` (a list of `{team_id, season_id}`), and `seasons` (every running season with `phase`, `signups_open`, `scheduling_enabled`, `checkin_days`, dates, `signed_up`, `team`, `captain`). The router guard, the app bar, the home page and every draft page read it.

# Routes by store

| Store | Routes |
|---|---|
| `auth` | `POST /login`, `GET /me` |
| `season` | `/leagues`, `/events?league_id={id}`, `/events/{id}`, `/events/{id}/maps`, `/maps/order`, `/rounds`, `/signups`, `/signups/{user}`, `/teams`, `/achievements`, `/ladder`, `/ladder/players`, `/ladder-sync`, `/maps/ladder-import`, `/achievements`, `/import`, `/export` |
| `event` | `/leagues`, `/leagues/{id}`, `/events`, `/events/{id}`, `/me/events`, `/events/{id}/entrants...`, `/divisions`, `/divisions/assign`, `/stages`, `/stages/{id}/seeds`, `/seeds/lock`, `/generate`, `/rounds`, `/series`, `/standings`, `/advance`, `/finish`, `/koth/nights`, `/koth/nights/{id}/close` |
| `player` | `/users`, `/users?no_discord=true`, `/users?tag_source=claim`, `/users/{id}`, `/users/me/tags`, `/users/me/tags/{tag_id}`, `/users/me/tags/{tag_id}/active`, `/users/{id}/tags/{tag_id}/move`, `/users/{id}/merge`, `/users/{id}/ban`, `/users/{id}/history`, `/users/{id}/w3c-sync`, `/users/{id}/ladder`, `/users/search`, `/user-info`, `/signup`, `/player-series`, `/player-history` |
| `team` | `/leagues/{league_id}/teams`, `/leagues/{league_id}/teams/basic`, `/leagues/{league_id}/teams/{id}`, `/events/{event_id}/teams`, `/events/{event_id}/teams/basic`, `/events/{event_id}/teams/{id}`, `/players`, `/captains`, `/availability`, `/ladder-sync`, `/image` |
| `match` | `/matches`, `/matches/{id}`, `/matches/{id}/replays`, `/player-series/{id}/replays/{game}/move/{to_game}`, `/matches/search`, `/draft-series...`, `/draft-series/{id}/promote` |
| `series` | `/series`, `/series/{id}`, `/series/{id}/result-kind`, `/series/{id}/places`, `/series/{id}/sides`, `/series/search`, `/events/{event_id}/series/search`, `/series/{id}/casts...`, `/casts/last`, `/series/{id}/games`, `/player-series/{id}`, `/player-series/{id}/veto`, `/player-series/{id}/replays/{game}/upload-url`, `/player-series/{id}/free-time`, `/home/series` |
| `availability` | `/player-availability`, `/player-blocks...`, `/events/{event_id}/teams/{team_id}/availability` |
| `map` | `/maps`, `/maps/{id}`, `/maps/ladder-import`, `/maps/{id}/image` |
| `config` | `/config/settings`, `/config/settings/{key}`, `/config/w3c`, `/config/admins`, `/config/discord-role-bindings...`, `/config/discord-hidden-roles`, `/config/discord-roles`, `/config/discord-roles/sync`, `/config/discord-guild-roles`, `/config/discord-role-groups`, `/config/koth/nightbot-token` |
| `fantasy` | `/fantasy/teams...`, `/fantasy/bets...`, `/events/{event_id}/fantasy/tiers`, `/events/{event_id}/fantasy/teams/{team_id}/breakdown`, `/fantasy-team`, `/fantasy-bet` |
| `ladder` | `/events/{id}/ladder`, `/events/{id}/ladder-sync`, `/users/{id}/ladder` |
| `player_career_stats` | `/stats/career`, `/stats/career/{id}` |

The backend pins the GNL payloads, the error envelope and the paged routes in its own tests. A field this app reads that is not in those tests is a reliance the backend cannot see; add a line here when you add one, and tell the backend.

# Read cost and the edge cache

The database cost of a backend read is the rows one call reads times the calls that reach the backend function. A call the Vercel edge answers from its cache costs no database read. The edge serves a cached copy only to a request with no Authorization header, so `EDGE_CACHED` in `next/src/helpers/fetch-wrapper.js` lists the open reads that go out without the bearer for a non-admin. See [the pitfall](../pitfalls/edge-cache-no-bearer.md).

- A read that every visitor of a page makes goes through a route the backend edge-caches and is listed in `EDGE_CACHED`. When the backend route has no cache time yet, ask the backend for one in the same change.
- Read the narrowest route the page needs: one player's row, not the full list filtered in the browser. When no narrow route exists, ask the backend for one.
- A read after a write, and every admin read, carries the bearer, so the person who changed something sees it at once. Everyone else sees it once the edge entry expires.
- The backend states the rules for choosing a cache time in its `docs/okf/api/overview.md`, section "What a read costs".

# What the app never does

It never builds a URL from a template without the one `backendUrl` import, never reads `error.detail`, never sends a request with `credentials`, and never caches a backend answer beyond the session, except the `me` row.
