---
type: Integration
title: The backend contract, as consumed here
description: What this app relies on from the wc3-gym-backend API, named by route and field, and where those reliances live in the code.
resource: ../../../next/src/stores
tags: [stores]
generated: { by: claude-code/claude-fable-5-1, at: 2026-10-06T10:33:26Z }
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
- The event API answers a GNL run with the common phase words. The season store translates them to `open`, `commenced`, `overdue` and `complete`; `running` past the end date is overdue, and `finished` is complete whatever results are missing, because only an admin's close finishes a season.
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
| `season` | `/leagues`, `/events?league_id={id}`, `/events/{id}`, `/events/{id}/maps`, `/maps/order`, `/rounds`, `/signups`, `/signups/{user}`, `/teams`, `/achievements`, `/ladder`, `/ladder/players`, `/ladder-sync`, `/maps/ladder-import`, `/achievements`, `/finish`, `/reopen`, `/import`, `/export` |
| `event` | `/leagues`, `/leagues/{id}`, `/events`, `/events/{id}`, `/me/events`, `/events/{id}/entrants...`, `/divisions`, `/divisions/assign`, `/stages`, `/stages/{id}/seeds`, `/seeds/lock`, `/generate`, `/rounds`, `/series`, `/standings`, `/advance`, `/finish`, `/reopen`, `/events/{id}/entrants/{entrant}/checkin`, `/koth/board`, `/koth/nights`, `/koth/nights/{id}/board`, `/close`, `/series...`, `/results`, `/bounds`, `/brackets/{division}/queue`, `/brackets/{division}/crown`, `/entrants/{entrant}...`, `/series/{id}/places`, `/series/{id}/sides`, `/series/{id}/result-kind` |
| `player` | `/users`, `/users?no_discord=true`, `/users?tag_source=claim`, `/users/{id}`, `/users/me/tags`, `/users/me/tags/{tag_id}`, `/users/me/tags/{tag_id}/active`, `/users/{id}/tags/{tag_id}/move`, `/users/{id}/merge`, `/users/{id}/ban`, `/users/{id}/history`, `/users/{id}/w3c-sync`, `/users/{id}/ladder`, `/users/search`, `/user-info`, `/signup`, `/users/me/bnet/start`, `/users/me/bnet/finish`, `/users/me/prompts`, `/users/me/prompts/{id}` |
| `team` | `/leagues/{league_id}/teams`, `/leagues/{league_id}/teams/basic`, `/leagues/{league_id}/teams/{id}`, `/events/{event_id}/teams`, `/events/{event_id}/teams/basic`, `/events/{event_id}/teams/{id}`, `/players`, `/captains`, `/availability`, `/ladder-sync`, `/image` |
| `match` | `/matches`, `/matches/{id}`, `/matches/{id}/replays`, `/player-series/{id}/replays/{game}/move/{to_game}`, `/matches/search`, `/draft-series...`, `/draft-series/{id}/promote` |
| `series` | `/series`, `/series/{id}`, `/series/{id}/result`, `/series/{id}/casts...`, `/casts/last`, `/events/{event_id}/series` (bare, or filtered by `match_id`, `player_id` or `is_fantasy_match`), `/home/series`, `/home/series/upcoming`, `/users/{a}/meetings/{b}`, `/draft-series...`, `/matches/{id}/draft-board` |
| no store: called from a view or a component | `/series/{id}/games`, `/player-series`, `/player-series/{id}`, `/player-series/{id}/veto`, `/player-series/{id}/replays/{game}/upload-url`, `/player-series/{id}/free-time` |
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
- A read after a write, and every admin read, carries the bearer. A page that re-reads an edge-cached route right after its own write also adds `?t=`, so the browser's own cache cannot answer with the copy from before the write (see the pitfall). Everyone else sees the change once the edge entry expires.
- The backend states the rules for choosing a cache time in its `docs/okf/api/overview.md`, section "What a read costs".

Requests on load, by surface. The first column links the page concept of each surface.

| Surface | Requests on load | Cache or polling |
|---|---|---|
| [Home](../pages/member.md) | 6 first: `/me`, the seasons (`GET /leagues`, read once a session, and `GET /events?league_id=<gnl>&kind=gnl`), `GET /me/events`, `GET /home/series` and one `GET /player-series?season_id=`; the fantasy and stats panels read after the panels have drawn | `/home/series`, the setting, the fantasy series, the history and the ladders are edge cached; the rest carry the bearer |
| [The round planner](../pages/fixtures-and-series.md) | 2: the draft board and the draft state, beside the two roster reads the page already makes | a write that moves a pairing reads both again with no browser cache; nothing is read per row. On demand, once per pair or player while the page is open: the pair's free time behind the calendar button, sent private, and a player's ladder record behind the stats panel, edge cached |
| [A KOTH night page](../pages/koth.md) | 2: the board and the event row | the board is edge cached for fifteen seconds; the clean stream view reads it again every thirty seconds while the night holds a series, every five minutes before the first one, and stops when the night closes or 24 hours after its start |
| [A KOTH run page](../pages/koth.md) | 2: the board and the event row | an admin read carries the bearer, so the board answers fresh; every admin write answers the whole board |
| [The veto page](../pages/fixtures-and-series.md) | 2: the veto board and the map list | the map list is edge cached; the board is read again every five seconds while the other side is on turn and the tab is visible, until the veto is complete |
| [The schedule dialog](../pages/fixtures-and-series.md) | 1: the pair's free hours, `GET /player-series/{id}/free-time` | read once, when the dialog opens |
| [The blocked-times dialog](../pages/member.md) | 1: `GET /player-blocks` | read when the dialog opens; after a save, Home or the player page reads its `GET /player-series` again once the dialog closes |
| [The series head to head](../pages/fixtures-and-series.md) | 1: the meetings of the pair, for a series of two players and a signed-in reader | the meetings open under it with no second read |
| [The team page roster strip](../pages/teams.md) | 0 extra | reuses the event's series read that the rounds table already made |
| [The upcoming list](../pages/fixtures-and-series.md) | 1: `GET /home/series/upcoming` | open and edge cached for two minutes, so it goes without a bearer; a claim shows on its row at once and in the list after the cache turns |

# What the app never does

It never builds a URL from a template without the one `backendUrl` import, never reads `error.detail`, never sends a request with `credentials`, and never caches a backend answer beyond the session, except the `me` row.
