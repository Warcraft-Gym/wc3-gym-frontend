---
type: Domain Concept
title: App shell and routing
description: One router on plain paths, a role rank per route, a guard that saves the return path, and a nav built from the hats a session wears, drawn as a top bar, a phone tab bar and an admin frame.
resource: ../../../next/src/lib/routes.ts
tags: [router, session]
generated: { by: claude-code/claude-fable-5-1, at: 2026-10-06T10:33:26Z }
sources:
  - id: router
    resource: ../../../next/src/lib/routes.ts
    title: The routes and the guard
  - id: app
    resource: ../../../next/src/components/layout/AppShell.tsx
    title: The app bar and the session watch
  - id: nav-model
    resource: ../../../next/src/helpers/nav-model.mjs
    title: The nav built from the hats
  - id: admin-nav
    resource: ../../../next/src/helpers/admin-nav.mjs
    title: The admin sections
  - id: return-url
    resource: ../../../next/src/helpers/return-url.mjs
    title: Where a login lands
---

# Routes and roles

`next/src/lib/routes.ts` lists every route with `meta.role`, the lowest session role that may open it, ranked `public < guest < member < captain < admin`. `meta.nav: false` hides a route from the navigation. `meta.season: true` says the path carries a season slug, so the guard loads the season list first. The pages themselves are folders under `next/src/app/(app)/`; a new route needs its folder and its line in the table, and a path the table does not name is public.

| Role | Routes |
|---|---|
| public | `/login`, `/sso-callback`, `/admin-login`, `/series/:id`, `/leagues`, `/leagues/:id`, `/events`, `/events/:id`, `/koth/dashboard`, `/random-stats`, `/credits`, `/no-access` |
| guest | `/profile` only; it shows the join-the-Discord card |
| member | `/`, `/signup`, `/availability`, `/players`, `/player/:id`, `/player-series/:id/veto`, `/seasons/:id`, `/match/:id`, `/upcoming`, `/teams`, `/team/:id`, `/team/:id/season/:season_id`, `/events/:id/entrants`, `/fantasy`, `/fantasy-registration`, `/ladder` |
| captain | `/seasons/:id/assign`, `/team/:id/season/:season_id/rounds` (reads; the view gates writes to admins) |
| admin | `/admin`, `/seasons`, `/seasons/:id/maps`, `/seasons/:id/achievements`, `/maps`, `/config`, `/config/discord-roles`, `/config/access`, `/fantasy/bets`, `/fantasy/tiers`, `/koth`, `/koth/nights/:id`, `/events/new`, `/events/:id/admin`, `/user-guide` |

`/player-dashboard` redirects to the member's own player page and `/player-stats` to `/players`. What each page does is in the [pages](../pages/index.md) directory.

The guard is a client component in `next/src/lib/guard.tsx` that wraps every page and draws nothing until the route is allowed. A public route opens for anyone. Otherwise, with no session the path is saved and the browser goes to `/login`; a login lands on the saved path, else on `/` for a member and `/profile` for a guest. A signed-in session on `/login` or `/admin-login` is sent on the same way, except the admin token's session on `/admin-login` while `NEXT_PUBLIC_DEV_LOGIN=1`, which stays to pick between the super admin and a player. A session below the role goes to `/profile` for a guest and to `/no-access` for everyone else. An unknown path redirects to `/` rather than a blank page, because old links from Discord and the website exist. The season list is loaded once; a page that rewrites its own path, as `/player/:id` does, is not drawn again.

Routes are plain paths since 2026-09-04; there is no bridge for old `/#/x` links. See [the decision](../decisions/history-routing.md).

# Season slugs

A season in a path is its slug, `gnl-s18`, made from its name; a bare id still resolves for old links. The view reads the id off the loaded season list.

# The app bar

The bar opens with the app title, "WC3 Gym Dashboard", which links to `/` from every page and is the way home. The same words are the default title of the browser tab, and a page title reads `<page> · WC3 Gym Dashboard`.

`AppShell.tsx` draws the account from `/me`: the name and avatar, the role, and the theme menu (light, dark, system, stored in `localStorage`). `?theme=dark` or `?theme=light` in the address wins over the stored choice and is never stored. `?mode=clean` on `/events/:id` or `/koth/dashboard` cuts the bar down to the app title and the theme menu and drops the tabs, the account and the footer, for a KOTH night on a stream. The server renders a signed-out shell, so the account slot waits for hydration and never shows "Sign in" to a signed-in reader. `ClerkBridge` in `next/src/lib/clerk-bridge.tsx` hands Clerk's `useAuth()` to the auth store, watches the sign-in state, calls `/me` once the session lands, and routes to the saved path. A failed `/me` shows its message on the login page and signs out.

# The nav

One person can be a player, a captain and an admin at once. `buildNav` in `next/src/helpers/nav-model.mjs` reads each hat from `/me` and returns only the places those hats work in:

- Home, for a member or above.
- My Stats, the member's own player page, when he has a player row.
- My Team: one entry per team the person plays for (`seasons[].team`) or captains (`seats`) in a running season, newest season first. A seat and a roster row of the same team and season are one entry, marked as captained. Each entry links to the team's season page.
- Admin, when the session reaches `/admin`. A viewed lower role never does, so view-as hides it.

A player therefore sees Home and My Stats alone. The shared pages (standings, upcoming series, teams, fantasy leaderboard, events) are reached through links in the Home panels and on the pages themselves; the nav names none of them. `navTabs` turns the nav into tabs: from 960 px they sit in the top bar, below it in a fixed bar at the bottom of the screen. My Team is a link for one team and opens a picker (a menu in the top bar, a sheet on a phone) for several. There is no drawer. The page ends above the tab bar, and a sheet or a dialog opens over it. A guest gets no tabs; their one page is `/profile`, in the account menu.

The account menu on the avatar holds Profile, then for a member with a player row "Blocked times", then "View as…" for an admin who may view as a lower role, and Logout. "Blocked times" opens the [blocked-times dialog](shared-components.md), which the shell holds once for every page: it opens over the page and closes back onto it. `/availability`, where the blocked times had a page of their own, opens the dialog over Home.

# The admin frame

`/admin` lists every admin task, one card per section of `next/src/helpers/admin-nav.mjs`: Gym Newbie League (Seasons, Teams, Maps, Players, Fantasy Tiers, Fantasy Bets), App Settings (Settings, Discord, Access, User Guide) and Other Events (KOTH Events, Leagues, Events, New Event). The KOTH board, the leagues and the events are public pages, reached by link; the nav names none of them. A session with the admin hat has the pages the Admin tab leads to drawn in the admin frame: the admin area, every page under a section (a season, its draft, an event), a match or a series page, which an admin opens from a season and which marks Seasons, and a team page, overall or in a season, which marks Teams; an admin's own team page, which the My Team tab opens, is a team page like any other. From 960 px the sections stand there as a sidebar, with the section the page belongs to marked. Home, a player page and the account pages keep the plain layout. `adminFrame` in the same helper decides it; a player, a captain and an admin viewing as either have no hat and no frame. The admin slides the sidebar out to the left with "Hide admin menu" and back with the slim "Show admin menu" tab; the choice stays in this browser's storage, and the first paint is always open. On a phone there is no sidebar: `/admin`, every page the sections list and every admin-only route (the admin area, `inAdminFrame`) carry a link back to `/admin`, which is the menu there; the Admin tab is marked on those pages only, and they take the wider page width.

# The app icon

`next/src/app/favicon.ico` and `next/src/app/icon.png` are the icon of the browser tab, and the hosting dashboard draws the project with the same file. The icon is a placeholder: the letters GNL in the display face, in the dark theme's `primary` on its `background`. Replace both files together.

# No embed mode

Every page draws the full shell except the clean stream view. `?readonly=1` is ignored since 2026-09-16.
