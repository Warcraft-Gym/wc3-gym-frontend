---
type: Runbook
title: Capture the screens
description: Build the app at one commit, then screenshot a route list and the dialogs behind clicks, with every backend write answered in the browser.
resource: ../../../next/scripts/shots/shoot.mjs
tags: [testing, tooling]
generated: { by: claude-code/claude-fable-5-1, at: 2026-10-06T10:33:26Z }
stale_after: 2027-04-06T00:00:00Z
sources:
  - id: shoot
    resource: ../../../next/scripts/shots/shoot.mjs
    title: The capture script, its stub and its guard
  - id: actions
    resource: ../../../next/scripts/shots/actions.mjs
    title: The click steps
  - id: build
    resource: build-and-preview.md
    title: Build and preview
---

# When

- A release note that shows what changed.
- A design review of one page or of every page.
- A before-and-after of a layout change: capture the old commit and the new one into two folders.

# Steps

1. Install Playwright once, outside the repository. It is not a dependency of the app. `npm install --prefix <folder> playwright@1.61.1`, then `npx --yes playwright@1.61.1 install chromium` for the browser build of that version, then `export PLAYWRIGHT_DIR=<folder>`. On Linux, `npx --yes playwright@1.61.1 install-deps chromium` adds the browser's system libraries; it needs root.
2. Check out the commit to capture in a worktree of its own. From `next/`, `pnpm install`, then `cp .env.example .env` with the Clerk publishable key, as in [run locally](run-locally.md).
3. `PROXY_TARGET=<backend URL> pnpm build`, then `PROXY_TARGET=<backend URL> pnpm start`. `PROXY_TARGET` names the backend the captures read. The build fixes the proxy, so both commands need it. Keep `NEXT_PUBLIC_BACKEND_URL` at `/api`, so every backend call goes through the app's own origin, where the stub sees it.
4. Set the variables below in the shell. The Clerk secret key goes in the shell only, never in a tracked file.
5. `node scripts/shots/shoot.mjs / /players /seasons`. Each argument is one route; `name=/route` chooses the file name, else the route names it.
6. Run the click steps: `SHOTS_ACT=report=/series/<id>,viewas,theme node scripts/shots/shoot.mjs`. A run takes routes and click steps together; the routes go first.
7. Read the results. Each capture is `<name>.jpg` in `SHOTS_OUT`. `results.json` there holds one record per name: the `status`, the final path, the page errors, the writes the stub answered and a note. A second run replaces the records of the names it captures. `net-blocked.log` lists what the network guard answered. A run with `SHOTS_PHONE`, `SHOTS_VIEWAS` or `SHOTS_ANON` adds `-phone`, `-<role>` or `-anon` to every name, so the passes share one folder.

| Variable | Purpose |
|---|---|
| `PLAYWRIGHT_DIR` | the folder Playwright is installed in |
| `SHOTS_BASE_URL` | the app under test; the local `pnpm start` when unset |
| `SHOTS_CLERK_SECRET_KEY` | the secret key of the Clerk instance whose publishable key the build read from `next/.env`; it mints a one-time sign-in ticket |
| `SHOTS_CLERK_USER_ID` | the Clerk user the ticket signs in; the captures show what that user sees |
| `SHOTS_OUT` | the output folder; a `shots` folder in the system temp folder when unset |
| `SHOTS_VIEWAS` | the JSON that View as stores, for example `{"role":"member"}` |
| `SHOTS_PHONE=1` | an iPhone 14 viewport in place of 1280 by 900 |
| `SHOTS_ANON=1` | no sign-in; the two Clerk variables are not read |
| `SHOTS_ACT` | the click steps, comma-separated, each `step` or `step=/route` |

| Step | Page | Captures |
|---|---|---|
| `report` | `/series/<id>`, required | the Report result dialog |
| `schedule` | `/series/<id>`, required | the schedule dialog |
| `cast` | `/series/<id>`, required | the cast claim dialog |
| `draft` | `/match/<id>`, required | the Draft series tab with a team 1 player picked |
| `kothcard` | `/koth/nights/<id>`, required | the first bracket card, clipped |
| `signup` | `/signup` | the season signup form |
| `wizard` | `/events/new` | each step of the event wizard, on the first league |
| `viewas` | `/` | the account menu and the View as dialog |
| `theme` | `/` | the theme menu |
| `phonenav` | `/` | the tab bar, the My Team picker and the account menu; run it with `SHOTS_PHONE=1` |

The `status` of a record reads `ok`, `ok, url became <path>`, `showed the login page`, `redirected to No access`, `shows No access`, `shows not found` or `error banner: <text>`. Anything but `ok` needs a look before the capture is used.

# What the scripts refuse

- No non-GET request leaves the browser. A fetch stub, injected before any page script, answers every non-GET to `/api` with `{}` and records it in `stubbedWrites`. A Playwright route guard answers every other non-GET request, to any host and by any means, the same way and logs it to `net-blocked.log`. Only Clerk's own calls pass, so the session stays signed in. The one write the script makes itself is the sign-in ticket, a POST from Node to the Clerk API.
- Three reads are POSTs: `/matches/search`, `/fantasy/teams/search` and `/fantasy/bets/search`. Answered with `{}`, the season's matches, the fantasy teams and the bets would draw empty. The stub answers each from its GET twin, `GET /events/{season}/matches`, `GET /events/{season}/fantasy/teams` and `GET /fantasy/bets`, filtered by the `field == n` terms of its `query`. The page keeps its rows and no POST leaves.

# Traps

- Opening the Plan round tab writes the team's seen mark, `PUT /draft-series/match/{match_id}/teams/{team_id}/seen`. The stub catches it, so `draft` leaves the marks as they were.
- The flag in a player label of the draft board carries its own tooltip and keeps the click. Click the name, as `draft` does; a click on the flag opens no panel.
- A page that redirects shows its target. `/profile` sends a member with a player row to his own player page, and `/koth/dashboard` lands on tonight's night page. The record reads `ok, url became <path>`; name the capture after what it shows.
- Captures carry player names, avatars and battle tags, and `results.json` carries page text. They are never committed to this public repository. Keep `SHOTS_OUT` outside the clone.
