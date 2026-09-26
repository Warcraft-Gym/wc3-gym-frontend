---
type: Domain Concept
title: App shell and routing
description: One router on plain paths, a role rank per route, a guard that saves the return path, and an app bar that reads everything from the /me answer.
resource: ../../../next/src/lib/routes.ts
tags: [router, session]
generated: { by: claude-code/claude-opus-5, at: 2026-09-19T12:16:46Z }
sources:
  - id: router
    resource: ../../../next/src/lib/routes.ts
    title: The routes and the guard
  - id: app
    resource: ../../../next/src/components/layout/AppShell.tsx
    title: The app bar and the session watch
  - id: return-url
    resource: ../../../next/src/helpers/return-url.mjs
    title: Where a login lands
---

# Routes and roles

`next/src/lib/routes.ts` lists every route with `meta.role`, the lowest session role that may open it, ranked `public < guest < member < captain < admin`. `meta.nav: false` hides a route from the navigation. `meta.season: true` says the path carries a season slug, so the guard loads the season list first. The pages themselves are folders under `next/src/app/(app)/`; a new route needs its folder and its line in the table, and a path the table does not name is public.

| Role | Routes |
|---|---|
| public | `/login`, `/sso-callback`, `/admin-login`, `/series/:id`, `/leagues`, `/leagues/:id`, `/events`, `/events/:id`, `/report`, `/report/:id`, `/koth/dashboard`, `/random-stats`, `/credits`, `/no-access` |
| guest | `/profile` only; it shows the join-the-Discord card |
| member | `/`, `/signup`, `/availability`, `/players`, `/player/:id`, `/player-series/:id/veto`, `/seasons/:id`, `/match/:id`, `/teams`, `/team/:id`, `/team/:id/season/:season_id`, `/events/:id/entrants`, `/fantasy`, `/fantasy-registration`, `/ladder` |
| captain | `/seasons/:id/assign`, `/team/:id/season/:season_id/rounds` (reads; the view gates writes to admins) |
| admin | `/seasons`, `/seasons/:id/maps`, `/seasons/:id/achievements`, `/maps`, `/config`, `/config/discord-roles`, `/config/access`, `/fantasy/bets`, `/fantasy/tiers`, `/koth`, `/events/new`, `/events/:id/admin`, `/user-guide` |

`/player-dashboard` redirects to the member's own player page and `/player-stats` to `/players`. What each page does is in the [pages](../pages/index.md) directory.

The guard is a client component in `next/src/lib/guard.tsx` that wraps every page and draws nothing until the route is allowed. A public route opens for anyone. Otherwise, with no session the path is saved and the browser goes to `/login`; a login lands on the saved path, else on `/` for a member and `/profile` for a guest. A session below the role goes to `/profile` for a guest and to `/no-access` for everyone else. An unknown path redirects to `/` rather than a blank page, because old links from Discord and the website exist. The season list is loaded once; a page that rewrites its own path, as `/report` and `/player/:id` do, is not drawn again.

Routes are plain paths since 2026-09-04; there is no bridge for old `/#/x` links. See [the decision](../decisions/history-routing.md).

# Season slugs

A season in a path is its slug, `gnl-s18`, made from its name; a bare id still resolves for old links. The view reads the id off the loaded season list.

# The app bar

The bar opens with the app title, "WC3 Gym Dashboard", which links to `/` from every page and is the way home. The same words are the default title of the browser tab, and a page title reads `<page> · WC3 Gym Dashboard`.

`AppShell.tsx` draws the navigation from `/me`: the name and avatar, the role, the current season by slug, the team link (the captained seat in the current season, else the roster row), and the theme menu (light, dark, system, stored in `localStorage`). On a phone the links sit in a drawer. The server renders a signed-out shell, so the account slot waits for hydration and never shows "Sign in" to a signed-in reader. `ClerkBridge` in `next/src/lib/clerk-bridge.tsx` hands Clerk's `useAuth()` to the auth store, watches the sign-in state, calls `/me` once the session lands, and routes to the saved path. A failed `/me` shows its message on the login page and signs out.

# The app icon

`next/src/app/favicon.ico` and `next/src/app/icon.png` are the icon of the browser tab, and the hosting dashboard draws the project with the same file. The icon is a placeholder: the letters GNL in the display face, in the dark theme's `primary` on its `background`. Replace both files together.

# No embed mode

Every page draws the full shell. `?readonly=1` is ignored since 2026-09-16.
