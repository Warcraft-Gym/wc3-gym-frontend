---
type: Page
title: Players and stats
description: The players list, one player's page with the owner's actions, the season ladder and the Random stats helper.
resource: ../../../src/views/PlayersView.vue
tags: [pages, players]
generated: { by: openai/gpt-6, at: 2026-09-15T16:51:45Z }
sources:
  - id: players
    resource: ../../../src/views/PlayersView.vue
    title: The players list
  - id: player
    resource: ../../../src/views/PlayerView.vue
    title: The player page
  - id: profile
    resource: ../../../src/components/PlayerProfile.vue
    title: The profile the page and the panel render
  - id: edit
    resource: ../../../src/components/EditPlayerDialog.vue
    title: The edit dialog
  - id: ladder
    resource: ../../../src/views/LadderView.vue
    title: The season ladder
  - id: random
    resource: ../../../src/views/RandomStatsView.vue
    title: The Random stats helper
---

# Routes

| Path | Lowest role | View |
|---|---|---|
| `/players` | member | `PlayersView` |
| `/player/:id` | member | `PlayerView` |
| `/ladder` | member | `LadderView` |
| `/random-stats` | public | `RandomStatsView` |

`/player-stats` redirects to `/players`. `/player/:id` takes the battle tag or the id; the page rewrites the address to the tag.

# What it does

**Players (`/players`).** Every player with their career row: the name, with a warning when W3Champions holds no stats or under twenty games for the main race, the race and MMR chips, the rating, the series and games records with win rates, the seasons played and the events entered. Filters: name, race, season (`?season=<slug>`), MMR range, and flags. A row opens the player page. An admin adds a player (name, battle tag, country, Discord tag and id, race), edits one, adds one to a season, syncs one from W3Champions, edits or deletes the career row, and deletes the player.

**One player (`/player/:id`).** The header with the flag, name, races, MMR and channels; the owner and an admin edit it. The owner also reads "Waiting for you", one line per open job: a series to schedule or report, a round to check in for. The Events card lists every event the player took part in, newest first, with the result; the running GNL season opens on its round cards, where the owner schedules a series, reports it, opens its maps, and answers each round with check in or can't play. Tonight's KOTH night joins the owner's list. The head-to-head card closes the page. The same profile opens as a side panel over a drafting page, without the owner's actions.

**Ladder (`/ladder`).** The season picker, then the team standings of the season's W3Champions ladder (points, achievement points, games, players, badges), the player leaderboards, the badge rarity, and the player table with filters. An admin syncs the season from W3Champions; the sync runs one chunk of players per request and shows its progress.

**Random stats (`/random-stats`).** Public. A battle tag and one or more W3Champions seasons; the page analyses the Random-race games of that tag and breaks them down by the race drawn against the opponent's race.

# Writes

| Store action | Route |
|---|---|
| `player.createPlayer` | `POST /users` |
| `player.updatePlayer` | `PUT /users/{id}` (an admin editing any player) |
| the edit dialog, no store | `PUT /user-info` (the owner editing their own row) |
| `player.deletePlayer` | `DELETE /users/{id}` |
| `player.syncW3CPlayer` | `POST /users/{id}/w3c-sync` |
| `season.addUserSignup` | `POST /events/{id}/signups` |
| `player_career_stats.update` | `PUT /stats/career/{id}` |
| `player_career_stats.delete` | `DELETE /stats/career/{id}` |
| `ladder.syncSeason` | `POST /events/{id}/ladder-sync` |
| `availability.setPlayerAvailability` | `PUT /player-availability` |
| the schedule and report dialogs | see [fixtures and series](fixtures-and-series.md) |

# Rules

- A player reads as flag, name, race, MMR, and the name links to this page: [one player name standard](../decisions/player-name-standard.md).
- The panel and the page render one profile; the panel carries no owner action: [the player panel opens only on drafting pages](../decisions/player-panel-drafting-only.md).
- The season ladder read is cached at the edge: [the edge-cached read must carry no bearer](../pitfalls/edge-cache-no-bearer.md).
- The "Main race" column is labelled, so the profile race may show there: [a race icon needs a race for the row](../pitfalls/race-icon-context.md).
