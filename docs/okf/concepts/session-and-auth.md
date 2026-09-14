---
type: Domain Concept
title: Session and auth
description: Clerk signs a member in with Discord, the backend's /me answer is the session the app reads, a legacy admin token has its own login page, and the fetch wrapper sends the bearer.
resource: ../../../src/stores/auth.store.js
tags: [session]
generated: { by: claude-code/claude-fable-5-1, at: 2026-09-14T10:00:00Z }
sources:
  - id: auth-store
    resource: ../../../src/stores/auth.store.js
    title: The auth store
  - id: fetch
    resource: ../../../src/helpers/fetch-wrapper.js
    title: The fetch wrapper
  - id: main
    resource: ../../../src/main.js
    title: The Clerk plugin options
  - id: proxy
    resource: ../../../api/clerk-proxy.js
    title: The Clerk proxy
---

# Two sessions

1. **A member.** Clerk's Vue plugin, `publishableKey` from `VITE_CLERK_PUBLISHABLE_KEY`, Discord as the only sign-in method. Every flow stays on `/login`; Clerk's post-login navigation is kept in-page by `routerPush` and `routerReplace` so the app routes once the session lands. `/sso-callback` is where Discord sends the browser back. The session token comes from `clerk.getToken()` on every request.
2. **The super admin.** `/admin-login` posts the shared admin token to `POST /login` and keeps the answer in `localStorage` under `user`. It has no Discord account and no Clerk session. The legacy token wins when both exist.

# The /me answer is the session

After sign-in the store calls `GET /me` and keeps the answer in `localStorage` under `me`. The app reads the role, the name, the avatar, the linked player, the captain seats and the running seasons from it. `isAdmin`, `isCaptain` and `isCaptainOf(team, season)` are getters over it. The cached `me` is keyed to the Clerk publishable key, so a switch between the dev and the production instance starts clean.

Sign-out calls Clerk's `signOut()`; clearing storage or cookies is not a sign-out, because the Clerk session cookie is HttpOnly. The owner of the definition of roles is the backend; this app only ranks the word it receives. See [the backend contract](backend-contract.md).

# The fetch wrapper

`fetchWrapper` in `src/helpers/fetch-wrapper.js` is the only way the app calls the backend. It attaches `Authorization: Bearer <token>` to every request whose URL starts with the backend URL, except `/login` and the one edge-cached ladder read, which must stay bearer-free to be cacheable. It sends `X-View-As` and `X-View-Seats` when an admin is viewing as a lower role. It parses the error envelope into an `Error` whose `message` is `body.message`, else `body.error`, else the text, with the body's keys copied on, so a view reads `error.message` and a code check reads `error.error`. A 401 on a live session signs out; a 403 is shown, not acted on.

`getPage`, `postPage`, `getAll` and `postAll` read the paged list routes with `limit` and `offset` and `X-Total-Count`.

# View as

An admin picks a role, and for a captain a set of seats, to see the app as that role. The store keeps it in `localStorage` under `viewAs`, the wrapper sends the headers, and the backend lowers the role for each request, so the admin meets the same 403s a member would. `/me` keeps `actual_role` so the switch stays visible.

# Production proxy

Clerk cannot own a `vercel.app` subdomain, so production runs the Clerk production instance in proxy mode: `vercel.json` rewrites `/__clerk/(.*)` to `api/clerk-proxy.js`, an edge function that forwards to Clerk's API with the proxy URL and the secret key. The rewrite sits before the SPA catch-all. Previews and local use the dev instance with the public key in `.env.example`. See [the decision](../decisions/clerk-proxy-mode.md).
