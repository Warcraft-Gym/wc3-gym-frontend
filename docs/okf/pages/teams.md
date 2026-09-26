---
type: Page
title: Teams
description: The teams list, one team across its events, the team in one season with its roster and captains, and the captain's check-in.
resource: ../../../next/src/app/(app)/teams/TeamsView.tsx
tags: [pages, teams]
generated: { by: claude-code/claude-opus-5-5, at: 2026-09-26T14:55:00Z }
sources:
  - id: teams
    resource: ../../../next/src/app/(app)/teams/TeamsView.tsx
    title: The teams list
  - id: team
    resource: ../../../next/src/app/(app)/team/[id]/TeamView.tsx
    title: One team
  - id: next-teams
    resource: ../../../next/src/app/(app)/teams/TeamsView.tsx
    title: The Next.js teams list
  - id: next-team
    resource: ../../../next/src/app/(app)/team/[id]/TeamView.tsx
    title: One team in Next.js
  - id: season-team
    resource: ../../../next/src/app/(app)/team/[id]/season/[season_id]/SeasonTeamDetailsView.tsx
    title: The team in one season
  - id: rounds
    resource: ../../../next/src/app/(app)/team/[id]/season/[season_id]/rounds/TeamRoundsView.tsx
    title: The round grid
  - id: store
    resource: ../../../next/src/stores/team.ts
    title: Every team write
---

# Routes

| Path | Lowest role | View |
|---|---|---|
| `/teams` | member | `TeamsView` |
| `/team/:id` | member | `TeamView` |
| `/team/:id/season/:season_id` | member | `SeasonTeamDetailsView` |
| `/team/:id/season/:season_id/rounds` | captain | `TeamRoundsView` |

`:season_id` is the season slug.

# What it does

**Teams (`/teams`).** Every team, the current season's teams first and the past teams under them: icon, long name, handle, and a chip per season played. A row opens the team. An admin adds a team (name, long name, icon), edits one and deletes one.

**One team (`/team/:id`).** One tab per event the team played, opening on the current season. The tab links to the event page and to the season team page, and shows the rank, the series record, the points, the points against and the points available. A rounds table lists each round's opponent, series score and points; the points read as the two sides around a spaced en dash, like every other score. The roster of the tab closes the page: one card, the captains and the members in one aligned list of flag, name, race, MMR, points and the round strip. The page already reads every series of the event for the rounds table, so the strip and the points cost it no read of its own; the head names the round in play. The points are the sum of the player's own points over those series, and a round he sits out draws as a crossed square in his strip. A player who played the event under another tag reads "as TAG" on a quiet line under his row.

**The team in one season (`/team/:id/season/:season_id`).** The season points. The team's W3Champions ladder card: points, rank, games, and per player the ladder points, the achievements, the total, wins, losses, the MMR and its change since the season start, with when the card was last synced. The roster: the captains, and the members as the player line, which carries the signup race and the MMR, the MMR the player entered the season with once the season is over, with the battle tag in a column beside it, "as TAG" and the synced time under the name; each group is its own block inside the roster card. The page reads no series, so this roster draws no round strip. An admin picks the captains from every player and saves them; the save answers the accounts whose Discord role is missing, and the page reads their count as "Role missing in Discord for 2 captains". An admin syncs the roster from W3Champions, adds players from the season's signups and removes one. A captain of this team, or an admin, gets the "Team rounds" button.

**The check-in of one team (`/team/:id/season/:season_id/rounds`).** A round picker and a "One round / All rounds" switch over one read of the team's answers, one of the event's fixtures and one of the event's series. A series of the round wins over the answer, because a pairing that exists needs no check-in word: one round prints "vs" and the opponent's player line in place of the state, and a matrix cell prints the opponent's name. One round is the roster as a list: the player line, the state or the opponent, the "set by" note and the row menu. The row is one line that does not wrap: the names and the note wrap inside their own block, so the menu keeps its column on every row. All rounds is a matrix of players by rounds from the same reads; its first column is sticky, so the names hold while the rounds scroll, and under the XS breakpoint three round columns fit beside it: a name reads as flag and name alone and is cut off with an ellipsis, a round head as the round number over its dates, one date a line with the range sign after the first, and the round heads sit on one top line, a state as its mark alone with the word in the tooltip and in the cell's label, and an opponent's name is cut off with an ellipsis and holds the whole name in its tooltip. The state reads "Checked in", "Out", "Out (blocked times)" or "No answer", as a tonal chip in the list and as the mark plus the short word in a cell; a blocked state is derived from the player's blocked times, so no menu offers it as a value to set. The counts line and each round head add "n needs a game", the players who checked in and hold no series of that round; under the XS breakpoint the round head drops the count, because a bare number names nothing, and the one round view prints it. The row menu, and the same menu on a cell, offers "Check in for `<name>`", "Sit out this round", "Clear" and "Sit out all remaining rounds"; the last one asks once and writes every round that has not ended in one call. The menu leaves out the item that sets the state already stored: no check-in on a checked-in row, no sit-out on an out row, no "Clear" where nothing is stored; a derived state offers only the check-in that overrides it. The view sends anyone who is not a captain of this team, or an admin, to `/profile`.

# Writes

| Store action | Route |
|---|---|
| `team.createTeam` | `POST /leagues/{league_id}/teams` |
| `team.updateTeam` | `PUT /leagues/{league_id}/teams/{id}` |
| `team.uploadTeamImage` | `POST /leagues/{league_id}/teams/{id}/image` |
| `team.deleteTeam` | `DELETE /leagues/{league_id}/teams/{id}` |
| `team.setCaptains` | `PUT /events/{season_id}/teams/{id}/captains` |
| `team.addPlayersToTeamForSeason` | `POST /events/{season_id}/teams/{id}/players` |
| `team.removePlayersFromTeamForSeason` | `DELETE /events/{season_id}/teams/{id}/players` |
| `team.syncPlayersW3C` | `POST /events/{season_id}/teams/{id}/ladder-sync` |
| `availability.setTeamAvailability` | `PUT /events/{season_id}/teams/{id}/availability` |
| `availability.setTeamAvailabilityAll` | `PUT /events/{season_id}/teams/{id}/availability/all` |

A team belongs to one league. The team store reads the league from the team row, or resolves the GNL league when the page gives none, and the team lists read `GET /leagues/{league_id}/teams` and `GET /events/{season_id}/teams`.

# Rules

- Who counts as a captain of a team in a season, the seats in the `/me` answer: [session and auth](../concepts/session-and-auth.md).
- The roster is drawn by `TeamRoster`: [shared components](../concepts/shared-components.md).
- Every roster row reads the signup race of that event, never the profile race: [a race icon needs a race for the row](../pitfalls/race-icon-context.md).
- The ladder read is edge cached and carries no bearer: [the edge-cached read must carry no bearer](../pitfalls/edge-cache-no-bearer.md).
