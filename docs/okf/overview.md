---
type: Repository
title: wc3-gym-frontend
description: The Next.js web app of the Warcraft Gym league, on Vercel, signed in through Clerk, reading everything from the backend API.
resource: https://github.com/Warcraft-Gym/wc3-gym-frontend
tags: [design, deploy]
generated: { by: claude-code/claude-fable-5-1, at: 2026-09-19T10:05:19Z }
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

One app for everyone: the public event and series pages, a member's profile, signup, availability, team, series reporting and fantasy pages, a captain's draft pages, and the admin pages for events, seasons, maps, config, Discord roles and KOTH nights. It draws nothing of its own data; every number comes from the backend API, and the backend's `/me` answer decides what the app shows.

# Where it runs

| Target | What |
|---|---|
| production | Vercel project `wc3-gym-frontend`, built from `main`; Clerk production instance in proxy mode |
| staging | the `staging` branch, force-pushed to the merged commit on every push to `main`; a public preview at a fixed alias, on the Clerk dev instance, pointed at the staging backend |
| previews | every pushed branch, public, on the dev instance |
| local | `pnpm dev` in `next/` on port 3000, with `PROXY_TARGET` naming the backend that `/api` reaches |

# Layout

```
next/                the app; every command runs from here
  next.config.ts     the dev proxy for /api, the /__clerk rewrite, one redirect
  vercel.json        which branches deploy and when a build is skipped
  src/app/           layout.tsx (fonts, the palette, Clerk), globals.css, the Clerk proxy route
  src/app/(app)/     one folder per route: page.tsx and the view it draws
  src/components/    the shared pieces; ui/ holds the shadcn/ui kit, layout/ the app shell
  src/stores/        one module per area, all fetches
  src/lib/           the route table, the guard, the Clerk bridge
  src/hooks/         theme, breakpoint, player panel, delete dialog
  src/helpers/       fetch wrapper, backend URL, and the pure .mjs rules with tests
  src/assets/        race icons, achievement icons, media
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
