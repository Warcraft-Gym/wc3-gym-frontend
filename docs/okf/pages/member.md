---
type: Page
title: Member self-service
description: The home page, with the player's control panel for the season on one side and their events on the other, the profile, the season signup form and the blocked-times dialog; what a member reads and writes about themselves.
resource: ../../../next/src/app/(app)/HomeView.tsx
tags: [pages]
generated: { by: claude-code/claude-opus-5-5, at: 2026-11-01T12:00:00Z }
sources:
  - id: home
    resource: ../../../next/src/app/(app)/HomeView.tsx
    title: The home page
  - id: home-panels
    resource: ../../../next/src/components/home/HomePanel.tsx
    title: The panel shell of the home hub
  - id: home-helper
    resource: ../../../next/src/helpers/home-hub.mjs
    title: The panel order, the season games, the captain row, the event cards and the format chip
  - id: my-season
    resource: ../../../next/src/components/home/MySeason.tsx
    title: The current season round by round, with its signup, the answers and the series
  - id: my-events
    resource: ../../../next/src/components/home/MyEvents.tsx
    title: The member's own events, with the matches, the check-in and the invites in place
  - id: upcoming-events
    resource: ../../../next/src/components/home/UpcomingEvents.tsx
    title: The cups and sign-up lists the member may still enter
  - id: team-signup
    resource: ../../../next/src/components/TeamSignupDialog.tsx
    title: The team signup and invite dialog of a team cup
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

**Home (`/`).** The player's one page for the week, under the h1 "Home", in two halves. Up to five panels, each drawn only when it has something to say. Above 960 px the wide left column holds the league: "My GNL Season", "GNL Upcoming Series" and "Fantasy"; the narrow right column holds the events: "My Events" and "Upcoming Events". Below that width they stack in one column in the order of `PANEL_ORDER` in `next/src/helpers/home-hub.mjs`: games, mine, next, upcoming, fantasy, so the member's own season and own events come first. Every panel works on a phone (Full).

Every GNL panel follows the current season, the `current_gnl_season` setting that `/me` names as `season_id`, never the last season the member played. "My GNL Season · <season>", the season's name without a leading "GNL", lists that season round by round from `GET /player-series` and `roundCards`: first the rounds to play, the one in play on top, then under "Past rounds" the rounds that are over, the most recent first. Every round of the season is listed, with or without a game. My Season is the player's control panel for the season: every task of it is done there, and stays open to correct while the season runs, so the player page is never needed for one. A round shows its dates and, from the window the server sends with it, when its check-in opens, when it closes before the round ends, or when its round ends; while it takes an answer, the two buttons "Available" and "Out" (pressing the answer held clears it, `nextAnswer`), written with `PUT /player-availability`. A round the member's blocked times cover holds "Out", with the line "Your blocked times cover this round", which opens the blocked-times dialog; "Available" answers the round all the same, because a stored answer wins over the blocks. A round that holds his series shows every series of his in it (`seriesList`) in place of the answer: the opponent, whose name opens his player panel; while the series is to play, whether he hosts and bans first and the opponent's clock against his own; once the result stands, the score from his side, linked to the series; and the series action bar in its "all" form. That bar keeps every step the series offers as a button, the next one filled: "Schedule" or "Change time", "Veto maps" or "View veto", "Report result" or "Edit result". Once the result stands it keeps "Edit result" and the steps already taken. A round with no series of his keeps the answer while it takes one, and once it is over it is its bare line, so he sees he had no game there. Under the rounds, "Blocked times" opens the blocked-times dialog. When the event takes early check-in, "Sit out all remaining rounds" answers every round still to come with Out (`PUT /player-availability/all`), with an Undo that puts back the answers it changed (`sitOutUndo`). The schedule and Report Result dialogs open over Home, and a save prints its message in the page's success alert. A captain reads, on every round, a line on his team's fixture of that round (the `captain_matches` of the season's `GET /me/events` row): how far its series are (published of the round's series, in draft, played) and one button to the fixture page that names the team it meets ("vs <team>"), whether the round is drafted or not, running or over; the fixture page opens on the plan while the round has places left. For a captain the panel's title bar carries "Season": the season page, with every match round by round and a pick of the older seasons. The standings live on the public website, so the panel links none. A member not in the season reads where they stand. While the season takes signups, a card names it with its play dates and a "Sign up" button to the season's form (`/signup?season=<slug>`); once it has started, one line and "Ask to join" to the same form; the admin token, which holds no player account, reads why it cannot sign up instead; once the season is over it says so; a captain who plays on no roster reads the team he captains and the same rounds, each with the team's fixture. "GNL Upcoming Series" lists the next booked series of the whole app, and first one row per fixture of another event, such as a tournament, that the captain still has to draft, with the same "Open match" button; "All upcoming" opens the upcoming list (`/upcoming`), every booked series with the cast claims; see [fixtures and series](fixtures-and-series.md). Once the admins have set the cup announcement channel and role, the title bar of "My Events" carries an "Announcements" switch for a guild member, read with `GET /me/announcements` and written with `PUT /me/announcements`: on, the member takes the announcement role, which every new cup, its check-in reminder and its podium ping in Discord, and off, the member declines it and is not asked again; a draw and each series ping their own players either way. A save says so in the page's success alert, and a refusal in its error alert. After a cup sign-up, from the event page, Home, a team sign-up or an accepted team invite, a member who has never chosen is asked once (`AnnouncementPrompt`, mounted in the app shell and opened by `askAboutAnnouncements`): "Subscribe", "Not now", which asks again at the next cup sign-up, or "No, don't ask again"; it opens only while `GET /me/announcements` answers `available` and `ask`. "My Events" holds one card per event that is the member's own (`myEventCards`): a cup or a sign-up list they play in, alone or in a cup team, tonight's KOTH night alone of the nights they joined (`myNight` in `next/src/helpers/koth.mjs`), a cup whose team invited them, and an event they run, drafts included, that is not finished. A card names the event, linked to its page, a chip for the role ("Playing", "Invited" or "Organizer"), the format chip, which a draft with no member row reads off the event row, "Checked in" once they are, the dates, and for a team cup the team with `CupTeamName`. Its one button leads in: "Open" to the event page, or "Manage cup" to the run page for an organizer. Under it, what is left to do, in place: a cup team still waiting for invited players reads how many of its size have accepted, and that it checks in and is drawn once everyone has; while check-in is open, "Check in" or "Check the team in", the team only once it is full; an invitation reads "<captain> invited you to <team>." with "Decline" and "Accept"; and every match and lobby the member still plays (`GET /me/cup-series`) is a framed line, "Your match is waiting for its result" or "Your lobby is waiting for its places", with the stage, the round and the sides or the seat count and map, a "Map veto" button where the series vetoes first, and "Report result" or "Report places". Those open the Report Result dialog for a cup series, the veto board in a dialog, and the places dialog, as on the event page; a save reads the events side again and prints its message in the page's success alert. A card with something to do sorts first, then the soonest. With no card the panel says the member is in no cup and points to Upcoming Events. "Upcoming Events" lists the cups and sign-up lists that take signups and that the member is not in and not invited to (`upcomingEvents`); a cup the member runs stays here until they sign up for it, so an organizer can play their own cup, and My Events lists it too, soonest first, no GNL season and no KOTH night: the name, linked to the event page, a format chip from `formatChip` ("1v1 cup", "2v2 cup", "FFA, solo", "FFA, teams of 2", "Custom game, 1v1", "Sign-up list") and the dates. A team cup's button reads "Sign up a team" and opens the team dialog, `TeamSignupDialog`, the one the event page's team panel opens too: the team name and one player picker for each other place, the caller its captain, and each picked player invited; every other event's button reads "Sign up" and opens the signup dialog on the full event. After a signup the event moves to My Events. "Fantasy" offers "Create your fantasy team" while `fantasy_team_creation_enabled` is true and the member has no team; once he has one, it lists the season's fantasy series still open for bets, soonest first, each with his pick or a "Place bet" button that opens `BetDialog`; with creation closed and no team the panel is not drawn.

The page first sends `/me`, `GET /leagues` and `GET /events?league_id=<gnl>&kind=gnl` (the seasons), `GET /me/events`, `GET /me/organized-events`, `GET /me/team-invites`, `GET /me/cup-series`, `GET /home/series` and one `GET /player-series?season_id=` for the current season; a failed read of the three events-side reads leaves its part of the events side empty. After the panels have drawn, the fantasy panel reads the setting and the member's team, and with a team `GET /events/{id}/series?is_fantasy_match=true` and his bets. The setting, `/home/series` and the fantasy series read are public and edge cached, so they go without a bearer. A failed `/home/series` read states itself in the page's alert and the upcoming panel prints "Could not be loaded."

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
