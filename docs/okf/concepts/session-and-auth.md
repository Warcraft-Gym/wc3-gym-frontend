---
type: Domain Concept
title: Session and auth
description: Clerk signs a member in with Discord, the backend's /me answer is the session the app reads, a legacy admin token has its own login page, and the fetch wrapper sends the bearer.
resource: ../../../next/src/stores/auth.ts
tags: [session]
generated: { by: claude-code/claude-opus-5-5, at: 2026-09-26T14:55:00Z }
sources:
  - id: auth-store
    resource: ../../../next/src/stores/auth.ts
    title: The auth store
  - id: fetch
    resource: ../../../next/src/helpers/fetch-wrapper.js
    title: The fetch wrapper
  - id: main
    resource: ../../../next/src/app/layout.tsx
    title: The Clerk plugin options
  - id: proxy
    resource: ../../../next/src/app/clerk-proxy/[...p]/route.ts
    title: The Clerk proxy
---

# Two sessions

1. **A member.** Clerk's React SDK, mounted once in `next/src/lib/clerk-provider.tsx` with `publishableKey` from `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`, Discord as the only sign-in method. Every flow stays on `/login`: the sign-in, sign-up and after-sign-out URLs all name it, and the app routes once the session lands. `/sso-callback` is where Discord sends the browser back. The session token comes from `clerk.getToken()` on every request.
2. **The super admin.** `/admin-login` posts the shared admin token to `POST /login` and keeps the answer in `localStorage` under `user`. It has no Discord account and no Clerk session. The legacy token wins when both exist.

# The /me answer is the session

After sign-in the store calls `GET /me` and keeps the answer in `localStorage` under `me`. The app reads the role, the name, the avatar, the linked player, the captain seats and the running seasons from it. `isAdmin`, `isCaptain` and `isCaptainOf(team, season)` are read from it. The server renders every page signed out, and the stored session fills in after hydration, so the first paint matches on both sides. The cached `me` is keyed to the Clerk publishable key, so a switch between the dev and the production instance starts clean.

Sign-out calls Clerk's `signOut()`; clearing storage or cookies is not a sign-out, because the Clerk session cookie is HttpOnly. The owner of the definition of roles is the backend; this app only ranks the word it receives. See [the backend contract](backend-contract.md).

# The fetch wrapper

`fetchWrapper` in `next/src/helpers/fetch-wrapper.js` is the only way the app calls the backend. It attaches `Authorization: Bearer <token>` to every request whose URL starts with the backend URL, except `/login` and a non-admin GET of an edge-cached open read, which must stay bearer-free to be cacheable. The edge-cache patterns list those reads: the season ladder and its players, an event's achievements, stage series and stage standings, the home hub's series, the KOTH board, the leagues, the maps, the W3C config, one setting, a player's ladder and history, career lists and single player career rows, the team reads of an event or a league, and the events list. Career list paging, search and sort parameters remain cacheable, and so do the events list's `league_id`, `kind`, `limit` and `offset`; any other events-list query, such as the admin-only `published` filter, carries the bearer. An admin always sends the bearer, so an admin reads past the cache and sees an edit at once. A write to the same path always sends the bearer. It sends `X-View-As` and `X-View-Seats` when an admin is viewing as a lower role. It parses the error envelope into an `Error` whose `message` is `body.message`, else `body.error`, else the text, with the body's keys copied on, so a view reads `error.message` and a code check reads `error.error`. A 401 on a live session signs out; a 403 is shown, not acted on.

`getPage`, `postPage`, `getAll` and `postAll` read the paged list routes with `limit` and `offset` and `X-Total-Count`.

# View as

An admin picks a role, and for a captain a set of seats, to see the app as that role. The store keeps it in `localStorage` under `viewAs`, the wrapper sends the headers, and the backend lowers the role for each request, so the admin meets the same 403s a member would. `/me` keeps `actual_role` so the switch stays visible.

# Production proxy

Clerk cannot own a `vercel.app` subdomain, so production runs the Clerk production instance in proxy mode: `next.config.ts` rewrites `/__clerk/*` to the route handler `next/src/app/clerk-proxy/[...p]/route.ts`, which forwards to Clerk's API with the proxy URL and the secret key. Node `fetch` unpacks Clerk's compressed answer, so the handler returns the body without the `content-encoding` and `content-length` headers; every other header and each `set-cookie` passes through. See [the pitfall](../pitfalls/proxy-answer-keeps-encoding-header.md). Previews and local use the dev instance. See [the decision](../decisions/clerk-proxy-mode.md).
