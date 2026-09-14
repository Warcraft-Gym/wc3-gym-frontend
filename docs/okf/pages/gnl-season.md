---
type: Page
title: The GNL season
description: The seasons list, one season with its rounds and matches, the draft, the season maps, the achievement rules and the public season report.
resource: ../../../src/views/SeasonsView.vue
tags: [pages, events]
generated: { by: claude-code/claude-fable-5-1, at: 2026-09-14T16:00:00Z }
sources:
  - id: seasons
    resource: ../../../src/views/SeasonsView.vue
    title: The seasons list and the season dialog
  - id: season
    resource: ../../../src/views/SeasonDetailsView.vue
    title: One season
  - id: assign
    resource: ../../../src/views/SeasonTeamAssignView.vue
    title: The draft
  - id: maps
    resource: ../../../src/views/SeasonMapsView.vue
    title: The season maps
  - id: achievements
    resource: ../../../src/views/SeasonAchievementsView.vue
    title: The achievement rules
  - id: report
    resource: ../../../src/views/SeasonReportView.vue
    title: The season report
  - id: store
    resource: ../../../src/stores/season.store.js
    title: Every season write
---

# Routes

| Path | Lowest role | View |
|---|---|---|
| `/seasons` | admin | `SeasonsView` |
| `/seasons/:id` | member | `SeasonDetailsView` |
| `/seasons/:id/assign` | captain (every write is admin) | `SeasonTeamAssignView` |
| `/seasons/:id/maps` | admin | `SeasonMapsView` |
| `/seasons/:id/achievements` | admin | `SeasonAchievementsView` |
| `/report` | public | `SeasonReportView` |
| `/report/:id` | public | `SeasonReportView` |

`:id` is the season slug; a bare id still resolves.

# What it does

A GNL season is the GNL-kind event of the GNL league. It keeps these pages of its own; the event page links to them.

**Seasons (`/seasons`).** One row per season: name, rounds, pick and ban order, series per fixture, and the phase (open, commenced, overdue, complete), with a warning mark on an overdue season and a chip that counts the series with no result, which opens the season with that list. A row opens the season. The admin dialog, for a new season or an edit, takes the name, the number of rounds, the pick and ban order, the series per fixture, the score system (standard or helpstone), the Discord role id, the start and end date, the map pool, the signups switch, the availability tools switch, the check-in days (blank keeps check-in open all season) and the fantasy grind pick. The row menu also exports the season as a spreadsheet and deletes it. A panel imports a season from a spreadsheet, by season name or id.

**One season (`/seasons/:id`).** The event header with the round and team counts. One tab per round; the page opens on the current round. Each match of the round is a card with the two teams, the scores and the round dates, and the fixed map of the round when the season's rules use one; a round with no fixed map warns until the match is played. A member reads the matches and the teams of the season. An admin gets the links to the season maps and the achievements, "Add match" (two teams in the selected round), and the edit and delete of a match. The teams panel shows each team's points; an admin adds teams to the season, and a captain or an admin opens the draft. Opened with `?unscored=1`, the page leads with the series that carry no result, grouped by round.

**The draft (`/seasons/:id/assign`).** The signups of the season in draft order: MMR ascending, each player moved by hand at their slot, and no excluded player. A row shows the name with a warning when W3Champions holds no stats or under twenty games for the signup race, the MMR and when it was read, the race, the round the pick falls in, and a team picker. A captain reads it. An admin changes the race, moves a player to a round or lets the MMR place them again, takes a player out of the pick list and back, edits the player, removes the signup, adds a signup, and syncs every signup from W3Champions. The team picker per row and "Assign n players to teams" write the picks; each team card lists its players with a remove button. A player name on this page opens the side panel, so the picks are not lost.

**Season maps (`/seasons/:id/maps`).** The map pool of the season: add from every map, import the W3Champions ladder pool, make a new map with its picture, reorder, remove. The map rule per game of the best-of. The rounds, each with its start and end date and, when a rule is the fixed map, the map of the round. The pick and ban order, built step by step with the counts of bans and picks the pool allows, and a list of what fills each game. The rules and the order save together; the page asks before leaving with them unsaved.

**Achievements (`/seasons/:id/achievements`).** The player rules and the team rules of the season, each with its points and its parameters. Rules come from the catalogue, or the whole list is imported from the catalogue defaults or from another season, then edited. The list saves as a whole.

**The season report (`/report`, `/report/:id`).** Public. A season picker, a print button, and the report: the hero with the season's headline numbers, then the season's standings and statistics sections, each one collapsible. It is the page the public site embeds.

# Writes

| Store action | Route |
|---|---|
| `season.createSeason` | `POST /seasons` |
| `season.updateSeason` | `PUT /seasons/{id}` |
| `season.deleteSeason` | `DELETE /seasons/{id}` |
| `season.addMapsToSeason` | `POST /seasons/{id}/maps` |
| `season.removeMapsFromSeason` | `DELETE /seasons/{id}/maps` |
| `season.setSeasonMapOrder` | `PUT /seasons/{id}/maps/order` |
| `season.setSeasonRound` | `PUT /seasons/{id}/rounds` |
| `season.importLadderMaps` | `POST /seasons/{id}/maps/ladder-import` |
| `season.saveSeasonAchievements` | `PUT /seasons/{id}/achievements` |
| `season.addUserSignup` | `POST /seasons/{id}/signups` |
| `season.removeUserSignup` | `DELETE /seasons/{id}/signups` |
| `season.updateSeasonSignup` | `PUT /seasons/{id}/signups/{user_id}` |
| `season.addTeamsToSeason` | `POST /seasons/{id}/teams` |
| `season.uploadSeasonFile` | `POST /import` |
| `season.exportSeason` | `POST /export` |
| `match.createMatch` | `POST /matches` |
| `match.updateMatch` | `PUT /matches/{id}` |
| `match.deleteMatch` | `DELETE /matches/{id}` |
| `team.addPlayersToTeamForSeason` | `POST /teams/{id}/seasons/{season_id}/players` |
| `team.removePlayersFromTeamForSeason` | `DELETE /teams/{id}/seasons/{season_id}/players` |
| `ladder.syncSeason` | `POST /seasons/{id}/ladder-sync`, one chunk of players per request |
| `map.createMap`, `map.uploadMapImage` | `POST /maps`, `POST /maps/{id}/image` |
| `player.updatePlayer` | `PUT /users/{id}` |

# Rules

- The draft page opens names in the side panel: [the player panel opens only on drafting pages](../decisions/player-panel-drafting-only.md).
- The race on a season page is the signup race: [a race icon needs a race for the row](../pitfalls/race-icon-context.md).
- The unscored list is a grouped table: [one grouped table component](../decisions/grouped-table.md).
- The season slug in the path: [app shell and routing](../concepts/app-shell-and-routing.md).
- The report inside the public site: [read-only embed](../concepts/readonly-embed.md).
- The phases and the season payload fields: [the backend contract](../concepts/backend-contract.md).
