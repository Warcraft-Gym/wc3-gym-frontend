---
type: Page
title: Leagues and events, the public side
description: The leagues list, one league, the events list, one event with its draw, and the entrants list as a member reads them.
resource: ../../../next/src/app/(app)/leagues/LeaguesView.tsx
tags: [pages, events]
generated: { by: claude-code/claude-opus-5-5, at: 2026-10-07T20:00:00Z }
sources:
  - id: leagues
    resource: ../../../next/src/app/(app)/leagues/LeaguesView.tsx
    title: The leagues list
  - id: league
    resource: ../../../next/src/app/(app)/leagues/[id]/LeagueView.tsx
    title: One league
  - id: events
    resource: ../../../next/src/app/(app)/events/EventsView.tsx
    title: The events list
  - id: event
    resource: ../../../next/src/app/(app)/events/[id]/EventView.tsx
    title: One event
  - id: entrants
    resource: ../../../next/src/app/(app)/events/[id]/entrants/EntrantsView.tsx
    title: The entrants list
  - id: signup-dialog
    resource: ../../../next/src/components/SignupDialog.tsx
    title: The event signup dialog
  - id: labels
    resource: ../../../next/src/helpers/event-labels.mjs
    title: The words for kinds, states and formats
---

# Routes

| Path | Lowest role | View |
|---|---|---|
| `/leagues` | public | `LeaguesView` |
| `/leagues/:id` | public | `LeagueView` |
| `/events` | public | `EventsView` |
| `/events/:id` | public | `EventView` |
| `/events/:id/entrants` | member | `EntrantsView` |

# What it does

A league is what repeats. An event is one run of it: a GNL season, a KOTH night, a cup, or a sign-up list. The admin side of these pages is in [event management](event-management.md).

Outside its own page an event is named by its league and its name, "GNL · Season 18". A wide screen reads the long league name, "Gym Newbie League · Season 18"; a phone keeps the short one. An event whose name already opens with the short name, "GNL S18", is named alone.

**Leagues (`/leagues`).** One row per league: name, linked to `/koth/dashboard` for KOTH (which lands on tonight's night page) and to `/leagues/:id` for every other kind, GNL included, kind (GNL, KOTH, custom), what an entrant is (solo players, pre-made teams, drafted teams), the count of events, and the next event, which is the soonest one not finished. An admin sees "New league", a dialog with name, short name, kind, entrant kind and page link.

**One league (`/leagues/:id`).** The league's events, newest first, with kind, dates and state. A member reads the published events; an admin also reads the drafts. An admin sees "New event", which opens the wizard with this league preset.

**Events (`/events`).** The Events tab of every member. A kind filter (Cups, KOTH nights, GNL seasons, All) leads with cups. The events fall in three groups, from the phase the backend answers: "Live now" (running), "Upcoming" as cards, soonest first, each with its state, its kind, its time and one button (Sign up, Check in or View), and "Past" as a table, newest first, where a cancelled cup reads "Cancelled". An organizer, and an admin, also read "Your cups" (`GET /me/organized-events`, drafts included), each with a "Run it" link to its run page, and the "Create cup" button. A member who is no organizer reads "Want to run a cup?" with "Request organizer access", a dialog with an optional note that writes `POST /organizers/requests`; once sent, the card reads "Request sent" until an admin answers. A guest reads neither card. `next/src/helpers/events-page.mjs` holds the grouping and the card rules.

**One event (`/events/:id`).** Every event but a GNL season and a KOTH night leads back to the Events tab with "← Events" over its header. The header, the description, the entrant count and, on a team event, the series per fixture. Then the one action the backend picked for the caller: sign up opens the signup dialog, withdraw asks once (a caller on more than one race gets one withdraw button per race and gives back that race alone), check in writes the caller's row, view scrolls to the draw on a page without tabs and is left out on a tabbed one, which opens on the draw, and a caller who is checked in reads a chip. A reader who is not logged in reads "Log in to sign up" while the signups stand open. When the caller's blocks cover the next round, the page shows the hint and the "Sit out" button. An event that names an MMR range or a games floor lists them under its description, one line a rule; with `eligibility_required` on the box reads "Who can sign up" and leads with the rated battle tag; an event that also asks for Battle.net names the link and points at the profile to make it, and a refused signup shows the backend's reason, which names the rule missed. Without the switch the box reads "What the organizers look at". `eligibilityLines` in `next/src/helpers/events-page.mjs` writes the lines. A logged-in reader gets a link to the entrants list on a page without tabs, where the Participants tab does not hold them, and on a GNL season a link to the season page. The page names who runs the event, "Run by" and the names from `GET /events/{id}/organizers`, and a runner of the event, an admin or one of those organizers, gets "Run the cup" to its run page. A cancelled event carries a "Cancelled" badge under its header. Under the header an event that plays stages, every one but a GNL season, reads as three tabs: "Draw", the default, "Participants" with the count, and "Results", the default of a finished event, with the "Hide results" switch beside them. The tab rides in the address as `?tab=participants`, `?tab=results` or, on a finished event, `?tab=draw`, so a link opens it, and an address that names none opens the default; `homeTab`, `tabOf` and `withTab` in `next/src/helpers/event-tabs.mjs` pick, read and write it. The Draw tab names each stage's format, best-of and scheduling on one line over its drawing, and before the draw says the bracket shows once the organizers draw it; a bracket draws no table under it there, because its places are on Results. Participants is the entrants card, titled "Participants". Results (`EventResults`) holds "Places" and "Matches". Places is a podium, second, first and third from the left on steps in the medal colours, the champion highest under the trophy, then every other place in a list; before the finish the steps stand empty over "The podium fills when the event finishes.", and a cancelled event awards none. Each place names the player with flag and race, read off the entrants. Matches is every played series round by round with both players' race, the winner in bold and "Walkover" or "Forfeit" beside it; a series with a side nobody fills and a reset nobody played are no match, `resultRounds` leaves them out, and a row opens nothing. A GNL season keeps one page: a table lists every stage with its format, best-of, series per entrant and scheduling, then the entrants card, then the draw. The entrants card lists each entrant with the signup race, the seed once a stage has locked its order, a tick when checked in, and "withdrawn" when withdrawn; on a finished event each row carries its place. A signup-only event plays no stage: the card is titled "Sign-ups", counts the entrants against the cap, lists them in signup order and prints each one's note. The draw is every stage that holds series, drawn read-only, with a "Hide results" switch the viewer keeps in their own browser; it hides the results tab too. A series box opens nothing: the draw is read in place, and its accessible name is its round, the two sides and the state. A box the reader may report, as a player of a side, a captain of its team, an admin or an organizer of the event (`reportOf` in `next/src/helpers/series-actions.mjs`), carries a "Report" button in its corner, "Edit result" once a result is in, which opens the Report Result dialog in place on the series read afresh; a save reads the entrants and the draw again. A bye, a side still to be decided, a free for all lobby and a walkover carry none. Over the draw, a player or a captain with a series waiting for its result reads "Your match is waiting for its result" with the two sides and a "Report result" button, and on a cup series a "Map veto" button. On a cup series that has no result, a side of it, never a runner who plays neither, also reads "Veto" on its box over "Report" (`vetoOf` in `next/src/helpers/series-actions.mjs`); both open the veto board in a dialog on the page, so the draw needs no series page. The Draw tab's stage line names the best-of of each bracket part, "Bo1 early · grand final Bo5".

The signup dialog asks for the race, a note on a signup-only event, and a battle tag when the event takes anyone and the caller's account names no player. The battle tag is read against the shape every door takes, a name with no space and no hash then a hash and three to eight digits, before the request; a tag of another shape, and a refusal that names the battle tag, print one sentence under the field, and every other refusal prints at the top of the dialog. The eligibility warnings the backend answers show as chips after the signup and never block it.

The dialog ends on a state with a "Done" button. On a KOTH night the end state names where the entrant stands: an entrant the night placed reads its bracket and its place in line, counted from one fresh read of the board, and the night page draws that same answer, the bracket alone when that read answers nothing, and the line every other event reads, "You are in. See you on the ladder.", when neither the board nor the event row names a bracket. An entrant W3Champions rated no race for reads that an admin places it in a bracket, with the no-stats mark on the race. Both states draw the player line the app draws everywhere: the flag, the name, the race and the one rating.

**Entrants (`/events/:id/entrants`).** A grouped table, one group per division: the entrant, the MMR the seed was cut from, the battle tag, whether W3Champions knows the player, the eligibility warnings (under the game count, over the MMR cap, banned), the seed with its source once locked, and the status (signed up, checked in, withdrawn, and a pin when placed by hand). A team entrant reads as the team name over the roster it fields for this event, captains starred; its MMR is the mean of the roster's ratings. A phone reads one card per entrant. A member reads all of this and none of the controls; the event's runners, an admin or its organizers, get them.

# Writes

| Store action | Route |
|---|---|
| `event.createLeague` | `POST /leagues` |
| `event.signUp` | `POST /events/{id}/entrants` |
| `event.withdraw` | `DELETE /events/{id}/entrants/me`, with `?race=` for one race |
| `event.checkInRow` | `POST /events/{id}/entrants/{entrant_id}/checkin`, or `PUT /player-availability` when the event checks in by round |
| `event.answerRound` | `PUT /player-availability` |

# Rules

- The stage drawing, the standings order and the third-place box: [shared components](../concepts/shared-components.md).
- A player reads as flag, name, race, MMR: [one player name standard](../decisions/player-name-standard.md).
- The race shown is the signup race, never the profile race: [a race icon needs a race for the row](../pitfalls/race-icon-context.md).
- The entrants list is a grouped table: [one grouped table component](../decisions/grouped-table.md).
- The vocabulary of leagues, events, stages, rounds, fixtures, series, games and divisions: the events section of `DESIGN.md`.

# KOTH nights

The public event page of a KOTH night reads the event row and the night's board, `GET /koth/nights/{id}/board`: it skips the entrant, stage and standings reads and draws the event header over the board. An archived night, one whose board answers `historical` true, draws the same historical component as the night's run page: every source bracket, its reported crown, ordered BO1s and event video links. Unknown results remain visible, and unconfirmed source names do not link to accounts. The backend owns the evidence and nullable identity contract. Any other night draws `KothNightBoard`: the bracket cards, and for a member the sign up and withdraw buttons, his place in line and the "Waiting for a bracket" strip; an admin also reads one "Run the night" link to the night's run page. See [KOTH](koth.md). The board route has a fifteen-second edge cache; the page reads it on load, on "Refresh" and on a return to its tab at most once every fifteen seconds, and `?mode=clean` reads it again every thirty seconds while the tab is visible and the night is not closed.
