---
type: Page
title: Event management
description: The admin's path from an empty league to a finished event with awards; the wizard, the entrants writes, the run page and the KOTH nights, each step with the route it calls.
resource: ../../../src/views/EventWizardView.vue
tags: [pages, events]
generated: { by: claude-code/claude-fable-5-1, at: 2026-09-16T17:30:00Z }
sources:
  - id: wizard
    resource: ../../../src/views/EventWizardView.vue
    title: The event wizard
  - id: wizard-helper
    resource: ../../../src/helpers/event-wizard.mjs
    title: The steps, the bodies and the step problems
  - id: entrants
    resource: ../../../src/views/EntrantsView.vue
    title: The entrants page and its admin controls
  - id: admin
    resource: ../../../src/views/EventAdminView.vue
    title: The run page
  - id: koth
    resource: ../../../src/views/KothView.vue
    title: The KOTH nights list
  - id: store
    resource: ../../../src/stores/event.store.js
    title: Every event write
---

# Routes

| Path | Lowest role | View |
|---|---|---|
| `/events/new` | admin | `EventWizardView` |
| `/events/:id/entrants` | member (every write is admin) | `EntrantsView` |
| `/events/:id/admin` | admin | `EventAdminView` |
| `/koth` | admin | `KothView` |

# What it does

The steps below take an admin from nothing to a finished event. Each step names the page, what the admin does there, and the route the store calls. The backend owns every rule the routes apply.

**1. The league.** On `/leagues`, "New league" takes a name, a short name, the kind (GNL, KOTH, custom), what an entrant is (solo players, pre-made teams, drafted teams) and a page link. It writes `POST /leagues`. A league that exists is reused: it is what repeats.

**2. The event.** On the league page, "New event" opens `/events/new` with the league preset. The wizard makes a cup or a signup-only event; a GNL season and a KOTH night are made elsewhere. Its steps:

- Basics: the league, the name, the kind, "Part of" (an event of the same league that this one feeds, for a qualifier), the region, the start and end date, the start time, the description, a page link and a stream link.
- Entrants: who may sign up (Discord members with an account, or anyone with a battle tag), what an entrant is (solo players or pre-made teams), the series per fixture on a team event, the entrant cap, the MMR maximum, the recent games floor, and the check-in switch with the days before a round it opens.
- Stages, one or more, each with a name, a format (round robin, single elimination, double elimination, Swiss, KOTH, free for all), a best-of (1, 3, 5, 7), a map rule (veto, loser picks, host picks, fixed map), the format's own fields (players per lobby and the points each place pays for a free for all; the round count for Swiss; the series each entrant plays per round, the group size and the entrants each group advances for a round robin), the scheduling mode (an admin sets the time, the two sides agree, played straight away), the count of entrants who advance, and whether they advance by themselves. A signup-only event skips this step.
- Divisions: none, or two to six, each named. The MMR bounds are cut later on the entrants page.
- Review, with an edit link back to each step.

A step with a problem cannot be left: no league or no name, an end before the start, a cap under two, check-in on with no days, no stage, an even best-of, a lobby under two seats, a group under two seats, a group that advances nobody, or one division. "Create event" writes `POST /events` with the stages in the same body, so no event exists without its stages, then `PUT /events/{id}/divisions` when divisions were asked for, and lands on the event page. When the event was written but the divisions write failed, the event page says so.

**3. The entrants.** Members enter on the event page; see [the public side](leagues-and-events.md). On `/events/:id/entrants` an admin also enters any player or team by hand, whether the signups stand open or not: "Add entrant" takes a player or a team and the race, and writes `POST /events/{id}/entrants/admin`. A row's menu offers "Check in" (`POST /events/{id}/entrants/{entrant_id}/checkin`), "Remove" (`DELETE /events/{id}/entrants/{entrant_id}`) and, for a player, "Ban player" (`PUT /users/{id}/ban`), which warns on every entrant row of every event and refuses no signup.

**4. The divisions.** On the entrants page, the strip over the table cuts the entrants by MMR; it draws one dot per entrant row and counts players, so a player on two races is two dots and one count. The admin picks the count (two to five), presses "Even split" for quantile cuts or drags the cuts, and presses "Save divisions", which writes the bands with their names and bounds through `PUT /events/{id}/divisions` and clears every placement made by hand. "Assign from MMR" writes `POST /events/{id}/divisions/assign`, which cuts the entrants into the stored divisions from the MMR of their signup race. A row's menu moves one entrant into another division and marks it placed by hand (`PUT /events/{id}/entrants/{entrant_id}` with `division_id` and `manual_placement`); the pin on the row toggles that mark, so a reassign leaves a pinned entrant where it is.

**5. The seeds.** On the same page, the admin picks the stage when the event has more than one, then "Seed by MMR", "Shuffle", or "Seed from the previous stage" on a stage that has one. Each writes `PUT /events/{id}/stages/{stage_id}/seeds` with a `source`. Dragging a row inside its division, or its move up and move down buttons, writes the same route with an order of entrant ids, which is the manual source. "Lock seeds" writes `POST /events/{id}/stages/{stage_id}/seeds/lock`; a locked stage takes no reorder, shows each seed's source, and the public page starts showing the seeds.

**6. The run.** `/events/:id/admin` draws one tab per stage with the same stage view the public page shows, and the buttons the stage takes:

- "Generate", while the stage holds no series, writes `POST /events/{id}/stages/{stage_id}/generate`; the confirm names the seed source and the field per division, with the byes. A Swiss stage has "Draw the next round" instead, `POST /events/{id}/stages/{stage_id}/rounds`, disabled while a series of the round before carries no result and once every round is drawn.
- A series box opens the result dialog: the winner of each game, and the winners make the score. "Save result" writes `PUT /series/{id}` with the two scores. "Walkover" and "Forfeit" take the side that gets the series and write `PUT /series/{id}/result-kind`. "Reopen" writes the same route with cleared scores; when the engine refuses because a later series already carries a result, the page asks once more and retries with `?force=true`.
- A free for all lobby opens the places dialog instead: the admin drags the seats or types the places, and "Save places" writes `PUT /series/{id}/places`. Before a lobby is played, "Move" sends one entrant to another lobby of the same round through `PUT /series/{id}/sides` on both lobbies.
- On a team event, the players each side fields are named on the series page; see [fixtures and series](fixtures-and-series.md).
- "Advance", once every series of the stage carries a result, writes `POST /events/{id}/stages/{stage_id}/advance`; the confirm lists the entrants who move on, the top of each division's table.

**7. The awards.** On the last stage's tab, "Finish" writes `POST /events/{id}/finish`. The confirm lists every entrant the close awards and the place it takes (Champion, Runner-up, Third, Placed n), because the close freezes that stage's table into the award rows. Finishing again rewrites the places from the table as it stands. The event page then carries each place on the entrant's row, and a first place reaches the player page's trophy shelf.

**KOTH nights.** A night is one event of the KOTH league, so the same pages run it. `/koth` lists every night, newest first, with its date and state, each name a link to its run page. "Open tonight" takes the start time and the three MMR bounds the brackets open at, both prefilled from the night before, and writes `POST /koth/nights`, which lands on the run page. Entrants sign up on the [public dashboard](koth.md) or are entered on the entrants page. On the run page a KOTH stage adds "Add challenger", which picks an entrant no series names yet and writes `POST /events/{id}/stages/{stage_id}/series` with the entrant id, appending that entrant to the end of the bracket's chain, and "Close the night", which writes `POST /koth/nights/{id}/close` and deletes the series nobody played, so every series left carries a result and the night reads finished.

# Writes

| Store action | Route |
|---|---|
| `event.createLeague` | `POST /leagues` |
| `event.createEvent` | `POST /events` |
| `event.setDivisions` | `PUT /events/{id}/divisions` |
| `event.assignDivisions` | `POST /events/{id}/divisions/assign` |
| `event.addEntrant` | `POST /events/{id}/entrants/admin` |
| `event.removeEntrant` | `DELETE /events/{id}/entrants/{entrant_id}` |
| `event.checkIn` | `POST /events/{id}/entrants/{entrant_id}/checkin` |
| `event.placeEntrant` | `PUT /events/{id}/entrants/{entrant_id}` |
| `player.banPlayer` | `PUT /users/{id}/ban` |
| `event.setSeeds` | `PUT /events/{id}/stages/{stage_id}/seeds` |
| `event.lockSeeds` | `POST /events/{id}/stages/{stage_id}/seeds/lock` |
| `event.generateStage` | `POST /events/{id}/stages/{stage_id}/generate` |
| `event.drawNextRound` | `POST /events/{id}/stages/{stage_id}/rounds` |
| `event.scoreSeries` | `PUT /series/{id}`, with `?force=true` on a forced reopen |
| `event.awardSeries` | `PUT /series/{id}/result-kind` |
| `event.setPlaces` | `PUT /series/{id}/places` |
| `event.setLobbySides` | `PUT /series/{id}/sides` |
| `event.advanceStage` | `POST /events/{id}/stages/{stage_id}/advance` |
| `event.finishEvent` | `POST /events/{id}/finish` |
| `event.openNight` | `POST /koth/nights` |
| `event.addChallenger` | `POST /events/{id}/stages/{stage_id}/series` |
| `event.closeNight` | `POST /koth/nights/{id}/close` |

# Rules

- The stage view, the standings order and the third-place box: [shared components](../concepts/shared-components.md).
- A name inside a dialog is plain text: [the player panel opens only on drafting pages](../decisions/player-panel-drafting-only.md).
- The entrants list is a grouped table: [one grouped table component](../decisions/grouped-table.md).
- A write returns the backend's answer and the page reads again; nothing is updated ahead of the answer: [stores](../concepts/stores.md).
- Reads are open and writes are admin, so the page hides the controls a member cannot use: [the backend contract](../concepts/backend-contract.md).
