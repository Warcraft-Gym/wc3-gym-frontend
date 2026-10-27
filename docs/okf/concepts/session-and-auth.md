---
type: Domain Concept
title: Session and auth
description: A member signs in with Discord through the backend, which hands back a session token; the backend's /me answer is the session the app reads, a legacy admin token has its own login page, a local dev login signs in as any player, and the fetch wrapper sends the bearer.
resource: ../../../next/src/stores/auth.ts
tags: [session]
generated: { by: claude-code/claude-opus-5-5, at: 2026-10-27T12:00:00Z }
sources:
  - id: auth-store
    resource: ../../../next/src/stores/auth.ts
    title: The auth store
  - id: fetch
    resource: ../../../next/src/helpers/fetch-wrapper.js
    title: The fetch wrapper
  - id: login
    resource: ../../../next/src/app/(app)/login/LoginView.tsx
    title: The login and callback view
---

# Three sessions

1. **A member.** "Sign in with Discord" on `/login` sends the browser to the backend's `/auth/discord/start`, which runs the Discord consent and comes back to `/sso-callback#token=<session>`. The page takes the token out of the address and the history at once, keeps it in `localStorage` under `user`, reads `/me`, and goes to `/login`, where the route guard sends a signed-in session on to the saved path. A failed sign-in comes back to `/login?login=error&reason=` and the page says why: `denied`, `state` or `token`.
2. **The super admin.** `/admin-login` posts the shared admin token to `POST /login` and keeps the answer in `localStorage` under `user`. It has no Discord account, so it signs up for nothing: a GNL signup card tells it so.
3. **The local dev login.** With `NEXT_PUBLIC_DEV_LOGIN=1`, an accepted admin token on `/admin-login` leads to a choice instead of the app: "Continue as Super Admin", or "Sign in as a player" (`next/src/components/DevLoginCard.tsx`). The choice stays while the admin-token session holds, a reload included; `/login` offers no player sign-in. The card is a search over `GET /dev/players`, a Captain chip on a player with a seat, and the role Player, Guest or Admin. The backend answers both routes to the admin token only. `POST /dev/login` answers a token that replaces the admin token under `user`, marked `dev`; to pick another player, log out and use the admin token again. The session is that player: their `/me`, games and signup, a captain when they hold a seat. An admin dev session can view as a lower role. Set it in a local `.env.local` only, never on a deployment.

Every session is a bearer the backend signed, kept under `user`. A `me` left in storage with no `user` is no session, and the next load drops it.

# The /me answer is the session

After sign-in the store calls `GET /me` and keeps the answer in `localStorage` under `me`. The app reads the role, the name, the avatar, the linked player, the captain seats and the running seasons from it. `isAdmin`, `isCaptain` and `isCaptainOf(team, season)` are read from it. The server renders every page signed out, and the stored session fills in after hydration, so the first paint matches on both sides. `SessionBridge` in `next/src/lib/session-bridge.tsx` reads `/me` again once per load, so a role, seat or name change shows without a new sign-in.

Sign-out drops the session keys from `localStorage`; a member's session token lasts 30 days, an admin's power a day, and a 401 on a Discord session goes back to `/auth/discord/start` with the path saved, so a member who is still signed in to Discord comes back without a click; a 401 on the admin token or the dev login signs out. The owner of the definition of roles is the backend; this app only ranks the word it receives. See [the backend contract](backend-contract.md).

# The fetch wrapper

`fetchWrapper` in `next/src/helpers/fetch-wrapper.js` makes almost every backend call; the report and schedule saves (`PUT /player-series/{id}`) and the fantasy store's public calls use `fetch` with the same `authHeader`, and a replay file goes to its signed upload link with no bearer. It attaches `Authorization: Bearer <token>` to every request whose URL starts with the backend URL, except `/login` and a non-admin GET of an edge-cached open read, which must stay bearer-free to be cacheable. The edge-cache patterns list those reads: the season ladder and its players, an event's achievements, stage series and stage standings, an event's series filtered by player or by the fantasy mark, the home hub's series and its upcoming list, the KOTH board, the leagues, the maps, the W3C config, one setting, a player's ladder and history, career lists and single player career rows, the team reads of an event or a league, and the events list. Career list paging, search and sort parameters remain cacheable, and so do the events list's `archived`, `league_id`, `kind`, `limit` and `offset`; any other events-list query, such as the admin-only `published` filter, carries the bearer. An admin always sends the bearer, so an admin reads past the cache and sees an edit at once. A write to the same path always sends the bearer. It sends `X-View-As` and `X-View-Seats` when an admin is viewing as a lower role. It parses the error envelope into an `Error` whose `message` is `body.message`, else `body.error`, else the text, with the body's keys copied on, so a view reads `error.message` and a code check reads `error.error`. A 401 on a live Discord session drops the session keys and goes back to Discord, which refuses a loop: on the way back a refused `/me` has no `me` to renew and shows the error. A 401 on the admin token or the dev login signs out; a 403 is shown, not acted on.

`getPage`, `postPage`, `getAll` and `postAll` read the paged list routes with `limit` and `offset` and `X-Total-Count`.

# View as

An admin signed in with Discord or the local dev login picks a role, and for a captain a set of seats, to see the app as that role; the admin token cannot. The store keeps it in `localStorage` under `viewAs`, the wrapper sends the headers, and the backend lowers the role for each request, so the admin meets the same 403s a member would. `/me` keeps `actual_role` so the switch stays visible.
