---
type: Page
title: Member self-service
description: The home page, the player's control panel for the season, the profile, the season signup form and the blocked-times dialog; what a member reads and writes about themselves.
resource: ../../../next/src/app/(app)/HomeView.tsx
tags: [pages]
generated: { by: claude-code/claude-fable-5-1, at: 2026-10-06T10:33:26Z }
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
  - id: blocked-times-dialog
    resource: ../../../next/src/components/BlockedTimesDialog.tsx
    title: The blocked-times dialog
  - id: blocked-times-store
    resource: ../../../next/src/stores/blocked-times.ts
    title: Who opens the dialog, and the count a save moves
  - id: availability
    resource: ../../../next/src/app/(app)/availability/page.tsx
    title: The old availability address, which opens the dialog over Home
  - id: events-helper
    resource: ../../../next/src/helpers/events.mjs
    title: The home cards and the action words
  - id: blocks
    resource: ../../../next/src/components/BlockedTimesEditor.tsx
    title: The blocked times editor
  - id: sit-out
    resource: ../../../next/src/components/player/SitOutRestDialog.tsx
    title: Sit out all remaining rounds
---

# Routes

| Path | Lowest role | View |
|---|---|---|
| `/` | member | `HomeView` |
| `/profile` | guest | `ProfileView` |
| `/signup` | member | `PublicSignupView` |
| `/availability` | member | none: opens the blocked-times dialog over Home |

`/player-dashboard` redirects to the member's own player page, or to `/profile` while the session has not loaded. `/availability`, the old blocked-times page, opens the dialog and replaces the address with `/`.

# What it does

**Home (`/`).** The player's one page for the week, under the h1 "Home". Up to six panels, each drawn only when it has something to say. Above 960 px a wide column holds "Open signups", "My Season", "Upcoming Series" and "Upcoming Events", and a narrow column holds "My Stats" and "Fantasy"; below that width they stack in one column in the order of `PANEL_ORDER` in `next/src/helpers/home-hub.mjs`: signup, games, next, upcoming, fantasy, stats. Every panel works on a phone (Full).

"Open signups" shows while the member can still enter, leave or check in to an event, from `GET /me/events`: sign up opens the signup dialog, a GNL season links to its own form, a member already in reads a chip beside the withdraw or the check-in, and a GNL season he is in carries "Your series", which scrolls to My Season (`#my-season`). Every panel follows the current season, the `current_gnl_season` setting that `/me` names as `season_id`, never the last season the member played. "My Season · <season>" lists that season round by round from `GET /player-series` and `roundCards`: first the rounds to play, the one in play on top, then under "Past rounds" the rounds that are over, the most recent first. Every round of the season is listed, with or without a game. My Season is the player's control panel for the season: every task of it is done there, and stays open to correct while the season runs, so the player page is never needed for one. A round shows its dates and when its check-in opens or its round ends; while it takes an answer, the two buttons "Available" and "Out" (pressing the answer held clears it, `nextAnswer`), written with `PUT /player-availability`. A round the member's blocked times cover holds "Out", with the line "Your blocked times cover this round", which opens the blocked-times dialog; "Available" answers the round all the same, because a stored answer wins over the blocks. A round that holds his series shows every series of his in it (`seriesList`) in place of the answer: the opponent, whose name opens his player panel; while the series is to play, whether he hosts and bans first and the opponent's clock against his own; once the result stands, the score from his side, linked to the series; and the series action bar in its "all" form. That bar keeps every step the series offers as a button, the next one filled: "Schedule" or "Change time", "Veto maps" or "View veto", "Report result" or "Edit result". Once the result stands it keeps "Edit result" and the steps already taken. A round with no series of his keeps the answer while it takes one, and once it is over it is its bare line, so he sees he had no game there. Under the rounds, "Blocked times" opens the blocked-times dialog. When the event takes early check-in, "Sit out all remaining rounds" answers every round still to come with Out (`PUT /player-availability/all`), with an Undo that puts back the answers it changed (`sitOutUndo`). The schedule and Report Result dialogs open over Home, and a save prints its message in the page's success alert. A captain reads, on every round, a line on his team's fixture of that round (the `captain_matches` of the season's `GET /me/events` row): how far its series are (published of the round's series, in draft, played) and one button to the fixture page that names the team it meets ("vs <team>"), whether the round is drafted or not, running or over; the fixture page opens on the plan while the round has places left. For a captain the panel's title bar carries "Season": the season page, with every match round by round and a pick of the older seasons. The standings live on the public website, so the panel links none. A member not in the season reads one line and no button: while signups are open it points to the "Open signups" panel, which carries the sign-up button; once the season is over it says so; a captain who plays on no roster reads the team he captains and the same rounds, each with the team's fixture. "Upcoming Series" lists the next booked series of the whole app, and first one row per fixture of another event, such as a tournament, that the captain still has to draft, with the same "Open match" button; "All upcoming" opens the upcoming list (`/upcoming`), every booked series with the cast claims; see [fixtures and series](fixtures-and-series.md). "Upcoming Events" lists every other event of every league that has not finished, one row per home card (so a KOTH league shows tonight's night alone), with its play dates and the member's signup chip and no button: an event that takes an entry, a withdraw or a check-in sits in "Open signups" instead. "Fantasy" offers "Create your fantasy team" while `fantasy_team_creation_enabled` is true and the member has no team; once he has one, it lists the season's fantasy series still open for bets, soonest first, each with his pick or a "Place bet" button that opens `BetDialog`; with creation closed and no team the panel is not drawn. "My Stats" shows the GNL seasons he took part in, his achievements this season and overall, the best three of this season by points, and his GNL points this season; its title bar carries the one link, "Go to Profile", to his player page.

The page first sends `/me`, `GET /leagues` and `GET /events?league_id=<gnl>&kind=gnl` (the seasons), `GET /me/events`, `GET /home/series` and one `GET /player-series?season_id=` for the current season. After the panels have drawn, the fantasy panel reads the setting and the member's team, and with a team `GET /events/{id}/series?is_fantasy_match=true` and his bets; the stats panel reads `GET /users/{id}/history` and one `GET /users/{id}/ladder?season_id=` per GNL season of that history. The history, the ladders, the setting, `/home/series` and the fantasy series read are public and edge cached, so they go without a bearer. A failed `/home/series` read states itself in the page's alert and the upcoming panel prints "Could not be loaded."; a failed ladder read leaves that season out of the counts and the stats panel says a count may be short.

**Profile (`/profile`).** The one route a guest may open. A guest reads a card that offers the Discord invite from the settings and a "Check again" button, which reads `/me` once more. A member with no player row reads the signup form. A member with a player row is sent to their own player page, where the "My Accounts" card manages his battle tags; see [players and stats](players-and-stats.md).

**Signup (`/signup`).** The season signup form: player name, battle tag, country, main race and timezone, prefilled from the linked player row. `?season=<slug>` names the season; otherwise the `/me` answer's season does. The form has five states. Signup: the season is open and takes signups. Request: signups are closed or the season has commenced, so the form saves the profile and asks an admin to add the player. Joined: the page shows the entry and offers "Change my details", plus a link to the round check-in on Home when scheduling is on. Over: the season is complete. Profile: no season takes signups, so only the profile saves. A submit the backend answers as closed shows the backend's message. A refusal that names the battle tag prints under the tag field until the tag changes. A refusal that carries `link` names the earlier player and shows two lines for an admin, the Discord id and the battle tag, with a copy button. A successful submit reads `/me` again. A new signup then goes to Home with `?signed_up=<season>`, where one success note confirms it and the address drops the parameter; an edit of the details, a profile save and a request stay on the form.

**Blocked times (a dialog).** One dialog, held by the app shell for every page, so it closes back onto the page it opened over. My Season opens it, and so do the owner's [player page](players-and-stats.md) (the header's "Blocked times" and a round card's "Out (blocked times)" chip) and the account menu. It holds the timezone the member's hours are read in, then the blocked times editor: repeating weekly blocks and one-off busy periods. The backend refuses a block while the profile names no zone, so the editor writes the browser zone first when the profile has none. The dialog says that open hours are a starting point, not a promise. It holds no check-in control: the round answer is taken on Home's My Season panel and on the owner's own round cards, both through the same write, `PUT /player-availability`. The editor reads `GET /player-blocks` when the dialog opens. A save moves the count in `stores/blocked-times.ts` when the dialog closes, so Home and the player page read their rounds again and a derived "Out (blocked times)" follows the new blocks. Full on a phone, where the dialog fills the screen.

# Writes

| Store action | Route |
|---|---|
| `event.signUp` | `POST /events/{id}/entrants` |
| `event.withdraw` | `DELETE /events/{id}/entrants/me` |
| `event.checkInRow` | `POST /events/{id}/entrants/{entrant_id}/checkin`, or `PUT /player-availability` when the event checks in by round |
| `event.answerRound` | `PUT /player-availability` |
| `availability.setPlayerAvailability` | `PUT /player-availability` (My Season's answer, and the Undo of a sit-out) |
| `availability.setAllPlayerAvailability` | `PUT /player-availability/all` (Sit out all remaining rounds) |
| the signup form, no store | `POST /signup` |
| the blocked-times dialog, no store | `PUT /user-info` (the timezone) |
| the blocked times editor, no store | `POST` and `PUT /player-blocks/repeating`, `POST` and `PUT /player-blocks/busy`, `DELETE /player-blocks/{kind}/{id}` |

# Rules

- The guard, the roles and where a login lands: [app shell and routing](../concepts/app-shell-and-routing.md).
- The `/me` answer the home and the signup form read: [the backend contract](../concepts/backend-contract.md).
- The guest session and the join card: [session and auth](../concepts/session-and-auth.md).
