---
type: Repository
title: wc3-gym-frontend
description: The Vue 3 web app of the Warcraft Gym league, on Vercel, signed in through Clerk, reading everything from the backend API.
tags: [repository, vue, vuetify, vercel]
generated: { by: claude-code/claude-fable-5-1, at: 2026-09-14T16:00:00Z }
sources:
  - id: readme
    resource: ../../README.md
    title: README
  - id: design
    resource: ../../DESIGN.md
    title: Design rules
  - id: guide
    resource: ../../ADMIN_UI_USER_GUIDE.md
    title: The admin user guide
---

# What it is

One single-page app for everyone: the public event and series pages, a member's profile, signup, availability, team, series reporting and fantasy pages, a captain's draft pages, and the admin pages for events, seasons, maps, config, Discord roles and KOTH nights. It draws nothing of its own data; every number comes from the backend API, and the backend's `/me` answer decides what the app shows.

# Where it runs

| Target | What |
|---|---|
| production | Vercel project `wc3-gym-frontend`, built from `main`; Clerk production instance in proxy mode |
| staging | the `staging` branch, force-pushed to the merged commit on every push to `main`; a public preview at a fixed alias, on the Clerk dev instance, pointed at the staging backend |
| previews | every pushed branch, public, on the dev instance |
| local | `npm run dev` on port 5003, proxying `/api` to a backend on 5002 |

# Layout

```
api/clerk-proxy.js   the edge function that serves Clerk's API from this domain
src/
  main.js            fonts, Vuetify with the palette, Clerk, Pinia, the router
  App.vue            the app bar, the session watch, the theme, the read-only embed
  views/             one file per page; index.js exports them
  components/        the shared pieces
  stores/            one Pinia store per area, all fetches
  helpers/           router, fetch wrapper, backend URL, theme, and the pure .mjs rules with tests
  assets/            base.css, race icons, achievement icons, media
DESIGN.md            every colour token, the type, the casing rules, the shared components, the events vocabulary, the known gaps
ADMIN_UI_USER_GUIDE.md  the admin guide, also served at /user-guide
```

# Start here

1. [App shell and routing](concepts/app-shell-and-routing.md), [session and auth](concepts/session-and-auth.md).
2. [The backend contract as consumed here](concepts/backend-contract.md), [stores](concepts/stores.md).
3. `DESIGN.md` in full, then [shared components](concepts/shared-components.md).
4. The [pages](pages/index.md): what each page area does, who may do it, and the routes it writes. Start with [event management](pages/event-management.md).
5. [Run locally](runbooks/run-locally.md), [testing](conventions/testing.md), [git and pull requests](conventions/git-and-pull-requests.md).
6. Before a change: the [decisions](decisions/index.md) and the [pitfalls](pitfalls/index.md).
