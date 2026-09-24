---
type: Page
title: Players and stats
description: The players list with the admin's tag controls, one player's page with his tags and the owner's actions, the season ladder and the Random stats helper.
resource: ../../../next/src/app/(app)/players/PlayersView.tsx
tags: [pages, players]
generated: { by: claude-code/claude-opus-5-5, at: 2026-09-24T12:12:23Z }
sources:
  - id: players
    resource: ../../../next/src/app/(app)/players/PlayersView.tsx
    title: The players list
  - id: next-players
    resource: ../../../next/src/app/(app)/players/PlayersView.tsx
    title: The Next.js players list
  - id: next-career
    resource: ../../../next/src/components/CareerStatsDialog.tsx
    title: The Next.js career stats editor
  - id: player
    resource: ../../../next/src/app/(app)/player/[id]/PlayerView.tsx
    title: The player page
  - id: profile
    resource: ../../../next/src/components/player/PlayerProfile.tsx
    title: The profile the page and the panel render
  - id: accounts
    resource: ../../../next/src/components/player/MyAccounts.tsx
    title: The owner's My accounts card
  - id: tag-dialogs
    resource: ../../../next/src/app/(app)/players/PersonTagDialogs.tsx
    title: The Move tag and Merge into dialogs
  - id: tags
    resource: ../../../next/src/helpers/tags.mjs
    title: The tag rules
  - id: edit
    resource: ../../../next/src/components/EditPlayerDialog.tsx
    title: The edit dialog
  - id: ladder
    resource: ../../../next/src/app/(app)/ladder/LadderView.tsx
    title: The season ladder
  - id: random
    resource: ../../../next/src/app/(app)/random-stats/RandomStatsView.tsx
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

**Players (`/players`).** Every player with their career row: the name, with a warning when W3Champions holds no stats or under twenty games for the main race, the race and MMR chips, the rating, the series record and the games record as "19 – 11 (63%)" from ten played up and "3 – 1" under ten, under a column title that names what it counts, the seasons played and the events entered. Filters: name, race, season (`?season=<slug>`), MMR range, and the "Show only" flags. The name search matches the name, the Discord name and every tag the player holds. A row opens the player page. An admin adds a player (name, battle tag, country, Discord tag and id, race), edits one, adds one to a season, syncs one from W3Champions, edits or deletes the career row, and deletes the player.

The admin sees the same page with more on it. A Tags column shows the active tag and a count of the others, which opens the full list. "Show only" adds "Unlinked players", "No Discord" and "Claimed tags". The last two are server filters: each one reads `GET /users?no_discord=true` or `GET /users?tag_source=claim` once when it is picked, and the page keeps the full list for the person search. Like the other flags, two picked flags show a row that matches either. The row menu adds "Move tag" and "Merge into". "Move tag" picks one of the person's tags and a person to move it to. "Merge into" picks the person who stays, then runs the merge with `dry_run: true` and lists what stops the merge, what the merge removes and what it moves, in the backend's own words. The Merge button stays off while anything stops the merge. Both dialogs find a person by name, tag or Discord name, and show his Discord name, tags and newest season so two people with one name read apart.

The list pages 25 rows at a time, and its country flags and race/MMR chips carry tap-accessible tooltips on a touch screen.

**One player (`/player/:id`).** The header with the flag, name, races, MMR and channels; the owner and an admin edit it. The battle tag under the name is the active tag, linked to W3Champions, and the MMR is the active tag's. A person who holds more tags gets one "Also played as" line under it, each tag a W3Champions link.

The owner reads a "My accounts" card under the header. It lists his tags, the active one first. A tag Battle.net confirmed carries a tick and the word "Battle.net" beside it, with "Verified on Battle.net" in its tooltip, and no second line. An unverified tag has a second line: a "Verify with Battle.net" link, then where the tag came from and when it was first and last seen. A radio picks the active tag and saves on change. An unverified tag that is not active has a remove button. "I also played as" adds a tag: the field shows "Checking W3Champions" while the request runs and "Added TAG" when it lands. A 404 (W3Champions has no such player) and a 409 (another login holds the tag) print the backend's sentence under the field, as the signup form does. A tag held by a person with no login joins at once, with that person's history. Every write reads the profile and `/me` again, because the address and the header follow the active tag.

The Events card names the tag a season was played as, "as TAG" under the season name, when the signup row's `played_as` differs from the person's tag today. The owner also reads "Waiting for you", one line per open job under its context label: a series to take the next step on, a round to check in for. The Events card lists every event the player took part in, newest first, with the result; the running GNL season opens on its round cards, which name the opponent with his race and the rating the row names on it, carry the compact series action bar, and answer each round with "Check in" or "Sit out". Tonight's KOTH night joins the owner's list. The head-to-head card closes the page. The same profile opens as a side panel over a drafting page, without the owner's actions.

The round check-in lives here and nowhere else. Every round card carries one status chip — "Checked in", "Out", "Out (blocked times)" or "No answer" — and names who set an answer somebody else gave. "Out (blocked times)" is derived by the backend from blocked times that cover the whole round; it is never stored, the chip links to the availability page, and the round still offers "Check in" so the player can take the round back. A round whose check-in window is still ahead takes an answer only when the event switches early check-in on, and then names the day its window opens under the buttons. With early check-in on, and while the event runs the scheduling tools, the event also offers "Sit out all remaining rounds", which asks first, naming the rounds that change and the rounds that keep the series they already have. After the write an Undo line names how many rounds changed and puts the answer each of them held back, one round at a time. A round card names the end of the round on the event's own clock and on the reader's when the event sets a round end zone. The round cards of the open event group under the name of the stage they sit in: an event whose rounds all sit in one stage, or name none, draws no stage heading, so a league season reads as one run of rounds. The stage name comes from `GET /player-series`, the one read whose rounds carry it, and that read belongs to the owner's own page, so a visitor reads the same cards as one run.

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
| `player.addMyTag` | `POST /users/me/tags` with `{tag}` |
| `player.makeMyTagActive` | `PUT /users/me/tags/{tag_id}/active` |
| `player.removeMyTag` | `DELETE /users/me/tags/{tag_id}` |
| `player.moveTag` | `POST /users/{id}/tags/{tag_id}/move` with `{to_user_id}` |
| `player.mergePlayer` | `POST /users/{id}/merge` with `{into_user_id, dry_run}` |
| `season.addUserSignup` | `POST /events/{id}/signups` |
| `player_career_stats.update` | `PUT /stats/career/{id}` |
| `player_career_stats.delete` | `DELETE /stats/career/{id}` |
| `ladder.syncSeason` | `POST /events/{id}/ladder-sync` |
| `availability.setPlayerAvailability` | `PUT /player-availability` |
| `availability.setAllPlayerAvailability` | `PUT /player-availability/all` |
| the schedule and report dialogs | see [fixtures and series](fixtures-and-series.md) |

# Rules

- A player reads as flag, name, race, MMR, and the name links to this page: [one player name standard](../decisions/player-name-standard.md).
- "as TAG" shows only when `played_as` is set and differs from the current tag, compared without case; one helper, `playedAsTag`, decides it everywhere.
- The panel and the page render one profile; the panel carries no owner action: [the player panel opens only on drafting pages](../decisions/player-panel-drafting-only.md).
- The season ladder read is cached at the edge: [the edge-cached read must carry no bearer](../pitfalls/edge-cache-no-bearer.md).
- The race chips of the players list stand on ladder games, one chip per race the player has games on: [a race icon needs a race for the row](../pitfalls/race-icon-context.md).
