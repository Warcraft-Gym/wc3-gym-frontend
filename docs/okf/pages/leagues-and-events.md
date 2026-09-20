---
type: Page
title: Leagues and events, the public side
description: The leagues list, one league, the events list, one event with its draw, and the entrants list as a member reads them.
resource: ../../../next/src/app/(app)/leagues/LeaguesView.tsx
tags: [pages, events]
generated: { by: claude-code/claude-fable-5-1, at: 2026-09-20T13:05:16Z }
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

**Leagues (`/leagues`).** One row per league: name, kind (GNL, KOTH, custom), what an entrant is (solo players, pre-made teams, drafted teams), the count of events, and the next event, which is the soonest one not finished. An admin sees "New league", a dialog with name, short name, kind, entrant kind and page link.

**One league (`/leagues/:id`).** The league's events, newest first, with kind, dates and state. A member reads the published events; an admin also reads the drafts. An admin sees "New event", which opens the wizard with this league preset.

**Events (`/events`).** Every published event of every league, newest first, with league, kind, dates and state. Two filters: league, and state (draft, signups open, check-in, seeded, running, finished).

**One event (`/events/:id`).** The header, the description, the entrant count and, on a team event, the series per fixture. Then the one action the backend picked for the caller: sign up opens the signup dialog, withdraw asks once (a caller on more than one race gets one withdraw button per race and gives back that race alone), check in writes the caller's row, view scrolls to the draw, and a caller who is checked in reads a chip. A reader who is not logged in reads "Log in to sign up" while the signups stand open. When the caller's blocks cover the next round, the page shows the hint and the "Sit out" button. A logged-in reader gets a link to the entrants list, and on a GNL season a link to the season page. A table lists every stage with its format, best-of, series per entrant and scheduling. The entrants card lists each entrant with the signup race, the seed once a stage has locked its order, a tick when checked in, and "withdrawn" when withdrawn; on a finished event each row carries its place. A signup-only event plays no stage: the card is titled "Sign-ups", counts the entrants against the cap, lists them in signup order and prints each one's note. Under that, the draw: every stage that holds series, drawn read-only, with a "Hide results" switch the viewer keeps in their own browser. A series box opens the series page; its accessible name is its round, the two sides and the state.

The signup dialog asks for the race, a note on a signup-only event, and a battle tag when the event takes anyone and the caller's account names no player. The battle tag is read against the shape every door takes, a name with no space and no hash then a hash and three to eight digits, before the request; a tag of another shape, and a refusal the backend answers, print one sentence under the field. The eligibility warnings the backend answers show as chips after the signup and never block it.

The dialog ends on a state with a "Done" button. On a KOTH night the end state names where the entrant stands: an entrant the night placed reads its bracket and its place in line, counted from one read of the public board, the bracket alone when that read answers nothing, and the line every other event reads, "You are in. See you on the ladder.", when neither the board nor the event row names a bracket. An entrant W3Champions rated no race for reads that an admin places it in a bracket, with the no-stats mark on the race. Both states draw the player line the app draws everywhere: the flag, the name, the race and the one rating.

**Entrants (`/events/:id/entrants`).** A grouped table, one group per division: the entrant, the MMR the seed was cut from, the battle tag, the Discord tag, whether W3Champions knows the player, the eligibility warnings (under the game count, over the MMR cap, banned), the seed with its source once locked, and the status (signed up, checked in, withdrawn, and a pin when placed by hand). A team entrant reads as the team name over the roster it fields for this event, captains starred; its MMR is the mean of the roster's ratings. A phone reads one card per entrant. A member reads all of this and none of the controls.

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
