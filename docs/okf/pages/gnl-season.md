---
type: Page
title: The GNL season
description: The seasons list, one season with its rounds and matches, the draft, the season maps, the achievement rules and the public season report.
resource: ../../../next/src/app/(app)/seasons/SeasonsView.tsx
tags: [pages, events]
generated: { by: claude-code/claude-opus-5-5, at: 2026-09-27T14:00:00Z }
sources:
  - id: seasons
    resource: ../../../next/src/app/(app)/seasons/SeasonsView.tsx
    title: The seasons list
  - id: wizard
    resource: ../../../next/src/app/(app)/seasons/_wizard/SeasonWizardDialog.tsx
    title: The season wizard
  - id: season
    resource: ../../../next/src/app/(app)/seasons/[id]/SeasonDetailsView.tsx
    title: One season
  - id: assign
    resource: ../../../next/src/app/(app)/seasons/[id]/assign/SeasonTeamAssignView.tsx
    title: The draft
  - id: maps
    resource: ../../../next/src/app/(app)/seasons/[id]/maps/SeasonMapsView.tsx
    title: The season maps
  - id: achievements
    resource: ../../../next/src/app/(app)/seasons/[id]/achievements/SeasonAchievementsView.tsx
    title: The achievement rules
  - id: report
    resource: ../../../next/src/app/(app)/report/SeasonReportView.tsx
    title: The season report
  - id: store
    resource: ../../../next/src/stores/season.ts
    title: Every season write
  - id: event-store
    resource: ../../../next/src/stores/event.ts
    title: The event read and the stage write the season dialog makes
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

**Seasons (`/seasons`).** One row per season: name, rounds, pick and ban order, series per fixture, and the phase (open, commenced, overdue, complete), with a warning mark on an overdue season and a chip that counts the series with no result, which opens the season with that list. A row opens the season. An admin creates a season in the season wizard, see below, and edits one with the pencil button on its row, which opens the same wizard. The row menu exports the season as a spreadsheet and deletes it. A panel imports a season from a spreadsheet, by season name or id.

**The season wizard.** "Add New Season" and the row's pencil open one wizard, a large dialog that fills a phone screen (Full). Its steps are General, Teams, Captains & rosters, Matchups, Maps and Round maps; the Round maps step shows only while the season's map rules use the fixed map, and a season with no rules does. A step opens once every step before it is answered, so an edit can go straight to any step. Nothing of the season is written before the last button: "Create season" on the last step for a new season, "Save changes" on any step for an edit. Closing a wizard with changes asks first.

- **General** takes the name, the number of rounds, the start and end date, the pick and ban order, the series per fixture, the score system (standard or helpstone), the Discord role id, the round end zone, the signups switch, the availability tools switch, the recent games floor with how many of the newest W3C seasons it counts over, the check-in switch, the largest MMR difference of each captain draft stage, and the fantasy grind pick. A season has 1 round or more; each round is one week from the start date. The round end zone is an IANA name; a round of a season that names none ends at midnight where the reader is. The check-in switch holds the check-in days (blank keeps check-in open all season) and the early check-in switch, shown only while check-in is on; off, the round check-in asks nobody. Early check-in lets a player check in for any round that has not ended. A new season starts with check-in and early check-in on and with a floor of 20 games over the last 2 W3C seasons. A largest MMR difference is 1 or more and belongs to a captain draft stage alone; a blank one reads as the default of 100. A games count is over one W3C season or more, and a blank one counts every synced season.
- **Teams** is a grid of team cards with their icons, each with a checkbox, a search and "Select all shown". "New team" creates a GNL team with its icon in place and ticks it. On an edit, the step names the teams an untick takes out of the season on save.
- **Captains & rosters** lists every ticked team with two pickers, each a search that adds a player and a chip per player that takes one out. Captains are any number of players. Players come from the season's signups, and a player on one team's roster is not offered to another. A season with no signups yet, such as a new one, sets captains only and says the players join once they sign up, here or in the draft. Unticking a team drops its captains and players from the step. The player list is read once, when the step first opens.
- **Matchups** is optional. Its switch "Draw the matchups at random" draws a single round robin: every ticked team meets every other team once, and each team plays at most one match a round. An even number of teams needs one round fewer than it has teams; an odd number needs as many rounds as teams, and each round names the team with no match. The draw shows round by round with the week and both teams of each match; "Draw again" draws anew, and a change to the ticked teams draws again too. A season with fewer rounds than the draw needs blocks the step and offers "Set the season to n rounds"; the rounds after the draw stay empty. A season that stores matches already gets no draw and points to the season page.
- **Maps** is the same grid with the map pictures. "New map" creates a map with its picture, and "Import W3C map pool" imports the W3Champions 1v1 pool into the map list; both tick the maps they add. The pool keeps the order the maps were ticked in; the season maps page reorders it.
- **Round maps** lists every round with its week and the ticked maps as a strip of pictures; a click picks the map game 1 of that round is played on, or no fixed map. "Fill in pool order" gives every round with no map the pool's maps in turn. Unticking a map clears it from the rounds that used it.

An edit reads the season with `GET /events/{id}` for its stages, its rounds and its pool, the season's teams with their rosters and captains (`GET /events/{id}/teams`), and its signups, because the list read carries none of them. The save writes, in this order: the season (`POST /events` or `PUT /events/{id}`), then `PUT /events/{id}/stages` when a largest MMR difference was typed, the teams added, then per ticked team whose crew changed its captains (`PUT /events/{id}/teams/{team}/captains`, the whole list) and the players added and removed, then the teams removed, each drawn matchup in round order (`POST /matches`), the maps added, each round whose map changed, and last the maps removed, because a round map must be in the pool. The stage write replaces every field of every stage, so each stage goes back as it was read. A write that fails stops the save and says which step failed; what was written stays, and the next press writes only what is still missing, so a new season is never created twice.

**One season (`/seasons/:id`).** The event header with the round and team counts. One tab per round; the page opens on the current round. Each match of the round is a card with the two teams, the scores and the round dates, and the fixed map of the round when the season's rules use one; a round with no fixed map warns until the match is played. A member reads the matches and the teams of the season. An admin gets the links to the season maps and the achievements, "Add match" (two teams in the selected round), and the edit and delete of a match. The teams panel shows each team's points; an admin adds teams to the season, and a captain or an admin opens the draft. Opened with `?unscored=1`, the page leads with the series that carry no result, grouped by round.

**The draft (`/seasons/:id/assign`).** The signups of the season in draft order: MMR ascending, each player moved by hand at their slot, and no excluded player. A row shows the name with a warning when W3Champions holds no stats or under twenty games for the signup race, the MMR and when it was read, the race, the round the pick falls in, and a team picker. A captain reads it. An admin changes the race, moves a player to a round or lets the MMR place them again, takes a player out of the pick list and back, edits the player, removes the signup, adds a signup, and syncs every signup from W3Champions. The team picker per row and "Assign n players to teams" write the picks; each team card lists its players with a remove button. A player name on this page opens the side panel, so the picks are not lost.

**Season maps (`/seasons/:id/maps`).** The map pool of the season: add from every map, import the W3Champions ladder pool, make a new map with its picture, reorder, remove. The map rule per game of the best-of. The rounds, each with its start and end date and, when a rule is the fixed map, the map of the round. The pick and ban order, built step by step with the counts of bans and picks the pool allows, and a list of what fills each game. The rules and the order save together; the page asks before leaving with them unsaved.

**Achievements (`/seasons/:id/achievements`).** The player rules and the team rules of the season, each with its points and its parameters. Rules come from the catalogue, or the whole list is imported from the catalogue defaults or from another season, then edited. The list saves as a whole.

**The season report (`/report`, `/report/:id`).** Public. A season picker, a print button, and the report: the hero with the season's headline numbers, then the season's standings and statistics sections, each one collapsible. It is the page the public site embeds.

# Writes

| Store action | Route |
|---|---|
| `season.createSeason` | `POST /events`, with the GNL league id |
| `season.updateSeason` | `PUT /events/{id}` |
| `event.fetchEvent`, `event.setStages` | `GET /events/{id}`, `PUT /events/{id}/stages` |
| `season.deleteSeason` | `DELETE /events/{id}` |
| `season.addMapsToSeason` | `POST /events/{id}/maps` |
| `season.removeMapsFromSeason` | `DELETE /events/{id}/maps` |
| `season.setSeasonMapOrder` | `PUT /events/{id}/maps/order` |
| `season.setSeasonRound` | `PUT /events/{id}/rounds` |
| `season.importLadderMaps` | `POST /events/{id}/maps/ladder-import` |
| `season.saveSeasonAchievements` | `PUT /events/{id}/achievements` |
| `season.addUserSignup` | `POST /events/{id}/signups` |
| `season.removeUserSignup` | `DELETE /events/{id}/signups` |
| `season.updateSeasonSignup` | `PUT /events/{id}/signups/{user_id}` |
| `season.addTeamsToSeason` | `POST /events/{id}/teams` |
| `season.removeTeamsFromSeason` | `DELETE /events/{id}/teams` |
| `season.uploadSeasonFile` | `POST /import` |
| `season.exportSeason` | `POST /export` |
| `match.createMatch` | `POST /matches` |
| `match.updateMatch` | `PUT /matches/{id}` |
| `match.deleteMatch` | `DELETE /matches/{id}` |
| `team.addPlayersToTeamForSeason` | `POST /events/{season_id}/teams/{id}/players` |
| `team.removePlayersFromTeamForSeason` | `DELETE /events/{season_id}/teams/{id}/players` |
| `ladder.syncSeason` | `POST /events/{id}/ladder-sync`, one chunk of players per request |
| `map.createMap`, `map.uploadMapImage` | `POST /maps`, `POST /maps/{id}/image` |
| `map.importLadderMaps` | `POST /maps/ladder-import` |
| `team.createTeam`, `team.uploadTeamImage` | `POST /leagues/{id}/teams`, `POST /leagues/{id}/teams/{team_id}/image` |
| `player.updatePlayer` | `PUT /users/{id}` |

# Rules

- The draft page opens names in the side panel: [the player panel opens only on drafting pages](../decisions/player-panel-drafting-only.md).
- The race on a season page is the signup race: [a race icon needs a race for the row](../pitfalls/race-icon-context.md).
- The unscored list is a grouped table: [one grouped table component](../decisions/grouped-table.md).
- The season slug in the path: [app shell and routing](../concepts/app-shell-and-routing.md).
- The phases and the season payload fields: [the backend contract](../concepts/backend-contract.md).
