---
type: Page
title: Member self-service
description: The home page, the profile, the season signup form and the availability page; what a member reads and writes about themselves.
resource: ../../../next/src/app/(app)/HomeView.tsx
tags: [pages]
generated: { by: claude-code/claude-opus-5-5, at: 2026-10-01T09:49:44Z }
sources:
  - id: home
    resource: ../../../next/src/app/(app)/HomeView.tsx
    title: The home page
  - id: home-panels
    resource: ../../../next/src/components/home/HomePanel.tsx
    title: The panel shell of the home hub
  - id: home-helper
    resource: ../../../next/src/helpers/home-hub.mjs
    title: The panel order, the season games, the signup chip and the captain row
  - id: my-season
    resource: ../../../next/src/components/home/MySeason.tsx
    title: The current season round by round, with the answers and the series
  - id: stats-panel
    resource: ../../../next/src/components/home/StatsPanel.tsx
    title: The member's stats at a glance
  - id: player-summary
    resource: ../../../next/src/helpers/player-summary.mjs
    title: Seasons played, achievements and the season score
  - id: fantasy-panel
    resource: ../../../next/src/components/home/FantasyPanel.tsx
    title: Fantasy on Home
  - id: fantasy-panel-helper
    resource: ../../../next/src/helpers/fantasy-panel.mjs
    title: What the fantasy panel offers and which bets are open
  - id: profile
    resource: ../../../next/src/app/(app)/profile/ProfileView.tsx
    title: The profile switch
  - id: signup
    resource: ../../../next/src/app/(app)/signup/PublicSignupView.tsx
    title: The season signup form
  - id: signup-helper
    resource: ../../../next/src/helpers/signup.mjs
    title: The signup states, the battle tag shape and which refusal the tag field owns
  - id: availability
    resource: ../../../next/src/app/(app)/availability/AvailabilityView.tsx
    title: The availability page
  - id: events-helper
    resource: ../../../next/src/helpers/events.mjs
    title: The home cards and the action words
  - id: blocks
    resource: ../../../next/src/components/BlockedTimesEditor.tsx
    title: The blocked times editor
  - id: blocked-rounds
    resource: ../../../next/src/app/(app)/availability/BlockedRounds.tsx
    title: The rounds the blocked times cover
---

# Routes

| Path | Lowest role | View |
|---|---|---|
| `/` | member | `HomeView` |
| `/profile` | guest | `ProfileView` |
| `/signup` | member | `PublicSignupView` |
| `/availability` | member | `AvailabilityView` |

`/player-dashboard` redirects to the member's own player page, or to `/profile` while the session has not loaded.

# What it does

**Home (`/`).** The player's one page for the week, under the h1 "Home". Up to six panels, each drawn only when it has something to say. Above 960 px a wide column holds "Open signups", "My Season", "Upcoming Series" and "Upcoming events", and a narrow column holds "My Stats" and "Fantasy"; below that width they stack in one column in the order of `PANEL_ORDER` in `next/src/helpers/home-hub.mjs`: signup, games, next, upcoming, fantasy, stats. Every panel works on a phone (Full).

"Open signups" shows while the member can still enter, leave or check in to an event, from `GET /me/events`: sign up opens the signup dialog, a GNL season links to its own form, a member already in reads a chip beside the withdraw or the check-in. Every panel follows the current season, the `current_gnl_season` setting that `/me` names as `season_id`, never the last season the member played. "My Season · <season>" lists that season round by round from `GET /player-series` and `roundCards`: first the rounds to play, the one in play on top, then under "Past rounds" the rounds that are over, the most recent first. Every round of the season is listed, with or without a game. A round shows its dates and when its check-in opens or its round ends; while it takes an answer, the two buttons "Available" and "Out" (pressing the answer held clears it, `nextAnswer`), written with `PUT /player-availability`; a round the member's blocked times cover shows "Out (blocked times)" and links to the availability page. A round that holds his series shows the series in place of the answer: the opponent, whose name opens his player panel, and the compact action bar (schedule, veto, report), or the score from his side linked to the series. A round with no series of his keeps the answer while it takes one, and once it is over it is its bare line, so he sees he had no game there. A captain reads, on the round of the fixture his team still has to draft (the `captain_fixture` of the season's `GET /me/events` row), how much of it is drafted and a filled "Draft pairings" button to the fixture page; the next round gets it once this one is drafted. A member not in the season reads one line and no button: while signups are open it points to the "Open signups" panel, which carries the sign-up button; once the season is over it says so; a captain who plays on no roster reads the team he captains and the same draft row. "Upcoming Series" lists the next booked series of the whole app, and first one draft row per fixture of another event, such as a tournament, that the captain still has to draft; "All upcoming" opens the schedule on the Season page (`/report#upcoming`). "Upcoming events" lists every other event of every league that has not finished, one row per home card (so a KOTH league shows tonight's night alone), with its play dates and the member's signup chip and no button: an event that takes an entry, a withdraw or a check-in sits in "Open signups" instead. "Fantasy" offers "Create your fantasy team" while `fantasy_team_creation_enabled` is true and the member has no team; once he has one, it lists the season's fantasy series still open for bets, soonest first, each with his pick or a "Place bet" button that opens `BetDialog`; with creation closed and no team the panel is not drawn. "My Stats" shows the GNL seasons he took part in, his achievements this season and overall, the best three of this season by points, and his GNL points this season; its title bar carries the one link, "Go to Profile", to his player page.

The page first sends `/me`, `GET /seasons`, `GET /me/events`, `GET /home/series` and one `GET /player-series?season_id=` for the current season. After the panels have drawn, the fantasy panel reads the setting and the member's team, and with a team `GET /events/{id}/series?is_fantasy_match=true` and his bets; the stats panel reads `GET /users/{id}/history` and one `GET /users/{id}/ladder?season_id=` per GNL season of that history. The history, the ladders, the setting, `/home/series` and the fantasy series read are public and edge cached, so they go without a bearer. A failed `/home/series` read states itself in the page's alert and the upcoming panel prints "Could not be loaded."; a failed ladder read leaves that season out of the counts and the stats panel says a count may be short.

**Profile (`/profile`).** The one route a guest may open. A guest reads a card that offers the Discord invite from the settings and a "Check again" button, which reads `/me` once more. A member with no player row reads the signup form. A member with a player row is sent to their own player page, where the "My accounts" card manages his battle tags; see [players and stats](players-and-stats.md).

**Signup (`/signup`).** The season signup form: player name, battle tag, country, main race and timezone, prefilled from the linked player row. `?season=<slug>` names the season; otherwise the `/me` answer's season does. The form has five states. Signup: the season is open and takes signups. Request: signups are closed or the season has commenced, so the form saves the profile and asks an admin to add the player. Joined: the page shows the entry and offers "Change my details", plus a link to the round check-in on Home when scheduling is on. Over: the season is complete. Profile: no season takes signups, so only the profile saves. A submit the backend answers as closed shows the backend's message. A refusal that names the battle tag prints under the tag field until the tag changes. A refusal that carries `link` names the earlier player and shows two lines for an admin, the Discord id and the battle tag, with a copy button. A successful submit reads `/me` again. A new signup then goes to Home with `?signed_up=<season>`, where one success note confirms it and the address drops the parameter; an edit of the details, a profile save and a request stay on the form.

**Availability (`/availability`).** The timezone the member's hours are read in, then the blocked times editor: repeating weekly blocks and one-off busy periods. The backend refuses a block while the profile names no zone, so the editor writes the browser zone first when the profile has none. The page says that open hours are a starting point, not a promise. It holds no check-in control: the round answer is taken on Home's My Season panel and on the owner's own round cards on the [player page](players-and-stats.md), both through the same write, `PUT /player-availability`. Under the editor, "Rounds these cover" reads the rounds the blocks answer on their own, grouped by event, each with its derived "Out (blocked times)" chip and a link to the event. The list is read-only, because a derived answer is never stored; a round is taken back on Home's My Season panel or on the owner's own round cards. It reads one `GET /player-series` per event the member is signed up to, the same read the player page makes, and shows the app's skeleton pulse until they land. The reads run once, when the page loads; a saved or deleted block moves the rounds the blocks cover, so the card then asks the reader to reload the page.

# Writes

| Store action | Route |
|---|---|
| `event.signUp` | `POST /events/{id}/entrants` |
| `event.withdraw` | `DELETE /events/{id}/entrants/me` |
| `event.checkInRow` | `POST /events/{id}/entrants/{entrant_id}/checkin`, or `PUT /player-availability` when the event checks in by round |
| `event.answerRound` | `PUT /player-availability` |
| the signup form, no store | `POST /signup` |
| the availability page, no store | `PUT /user-info` (the timezone) |
| the blocked times editor, no store | `POST` and `PUT /player-blocks/repeating`, `POST` and `PUT /player-blocks/busy`, `DELETE /player-blocks/{kind}/{id}` |

# Rules

- The guard, the roles and where a login lands: [app shell and routing](../concepts/app-shell-and-routing.md).
- The `/me` answer the home and the signup form read: [the backend contract](../concepts/backend-contract.md).
- The guest session and the join card: [session and auth](../concepts/session-and-auth.md).
