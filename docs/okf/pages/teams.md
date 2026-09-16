---
type: Page
title: Teams
description: The teams list, one team across its events, the team in one season with its roster and captains, and the captain's round grid.
resource: ../../../src/views/TeamsView.vue
tags: [pages, teams]
generated: { by: claude-code/claude-fable-5-1, at: 2026-09-16T19:30:00Z }
sources:
  - id: teams
    resource: ../../../src/views/TeamsView.vue
    title: The teams list
  - id: team
    resource: ../../../src/views/TeamView.vue
    title: One team
  - id: season-team
    resource: ../../../src/views/SeasonTeamDetailsView.vue
    title: The team in one season
  - id: rounds
    resource: ../../../src/views/TeamRoundsView.vue
    title: The round grid
  - id: store
    resource: ../../../src/stores/team.store.js
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

**One team (`/team/:id`).** One tab per event the team played, opening on the current season. The tab links to the event page and to the season team page, and shows the rank, the series record, the points, the points against and the points available. A rounds table lists each round's opponent, series score and points. The roster of the tab, captains and members, closes the page.

**The team in one season (`/team/:id/season/:season_id`).** The season points. The team's W3Champions ladder card: points, rank, games, and per player the ladder points, the achievements, the total, wins, losses, the MMR and its change since the season start, with when the card was last synced. The roster: the captains, and the members with battle tag, Discord name, MMR and main race. An admin picks the captains from every player and saves them; the answer names the captains whose Discord role is missing. An admin syncs the roster from W3Champions, adds players from the season's signups and removes one. A captain of this team, or an admin, gets the "Team rounds" button.

**The round grid (`/team/:id/season/:season_id/rounds`).** One row per player and one column per round, each with a check-in button and a can't-play button; the caption says who set the answer. A second press on the set answer clears it. "Out to round n" marks every round as can't play. A phone shows one round at a time. The view sends anyone who is not a captain of this team, or an admin, to `/profile`.

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

A team belongs to one league. The team store reads the league from the team row, or resolves the GNL league when the page gives none, and the team lists read `GET /leagues/{league_id}/teams` and `GET /events/{season_id}/teams`.

# Rules

- Who counts as a captain of a team in a season, the seats in the `/me` answer: [session and auth](../concepts/session-and-auth.md).
- The roster is drawn by `TeamRoster`: [shared components](../concepts/shared-components.md).
- The "Main race" column is labelled, so the profile race may show there: [a race icon needs a race for the row](../pitfalls/race-icon-context.md).
- The ladder read is edge cached and carries no bearer: [the edge-cached read must carry no bearer](../pitfalls/edge-cache-no-bearer.md).
