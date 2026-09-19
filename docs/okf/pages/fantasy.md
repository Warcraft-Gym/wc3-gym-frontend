---
type: Page
title: Fantasy
description: The fantasy leaderboard, the bets, the player tiers and the member's own fantasy team and bets.
resource: ../../../next/src/app/(app)/fantasy/FantasyLeaderboardView.tsx
tags: [pages, fantasy]
generated: { by: openai/gpt-6, at: 2026-09-15T21:52:57Z }
sources:
  - id: leaderboard
    resource: ../../../next/src/app/(app)/fantasy/FantasyLeaderboardView.tsx
    title: The leaderboard
  - id: bets
    resource: ../../../next/src/app/(app)/fantasy/bets/FantasyBetsView.tsx
    title: The bets
  - id: tiers
    resource: ../../../next/src/app/(app)/fantasy/tiers/FantasyTiersView.tsx
    title: The player tiers
  - id: dashboard
    resource: ../../../next/src/app/(app)/fantasy-registration/FantasyDashboardView.tsx
    title: The member's own team and bets
  - id: store
    resource: ../../../next/src/stores/fantasy.ts
    title: Every fantasy write
---

# Routes

| Path | Lowest role | View |
|---|---|---|
| `/fantasy` | member | `FantasyLeaderboardView` |
| `/fantasy/bets` | admin | `FantasyBetsView` |
| `/fantasy/tiers` | admin | `FantasyTiersView` |
| `/fantasy-registration` | member | `FantasyDashboardView` |

Every page carries the season picker; the picked season is shared across the fantasy pages.

# What it does

**Leaderboard (`/fantasy`).** Every fantasy team of the season by total points: the rank, the team, its captain, and the team, grind, race, player, bench and bet points. A row expands to the score breakdown. An admin creates a team, edits any and deletes any. A captain edits their own team while the season is open; the draft freezes when the season commences.

**Bets (`/fantasy/bets`).** Every bet of the season, one page at a time: the captain and their team, the series with each player's MMR and record against the other race, the player bet on, the score, the result, the points, and whether the bet is locked because the series is scored. An admin adds a bet for a captain on a fantasy series, edits any bet and deletes any.

**Tiers (`/fantasy/tiers`).** The players rostered in the season, cut into two to six tiers by MMR. The strip proposes an even split and takes dragged cuts; a row's picker pins one player to a tier by hand. A commenced season's tiers are locked until the admin unlocks them. "Apply tiers" writes the cuts and the allocation, then syncs the season ladder and reads the season again.

**The member's own team (`/fantasy-registration`).** The member's fantasy team for the picked season. Registration is open while the season is open, team creation is enabled in the settings and the season's tiers are cut; the page says which of these is missing. The form takes the team name, a drafted team, a drafted race, a grind team when the season has the grind pick, and one player from each tier. A registered team shows its points and its players, and can be edited while the season is open. Under it, the fantasy series of the season with the member's bet on each: a bet costs the fixed points from the settings, or a value between the settings' minimum and maximum; a bet can be changed or removed while its series has no result.

# Writes

| Store action | Route |
|---|---|
| `fantasy.createTeam` | `POST /fantasy/teams` |
| `fantasy.updateTeam` | `PUT /fantasy/teams/{id}` |
| `fantasy.deleteTeam` | `DELETE /fantasy/teams/{id}` |
| `fantasy.addPlayers` | `POST /fantasy/teams/{id}/players` |
| `fantasy.removePlayers` | `DELETE /fantasy/teams/{id}/players` |
| `fantasy.createBet` | `POST /fantasy/bets` |
| `fantasy.updateBet` | `PUT /fantasy/bets/{id}` |
| `fantasy.deleteBet` | `DELETE /fantasy/bets/{id}` |
| `player.updateFantasyTiers` | `PUT /events/{id}/fantasy/tiers` |
| `ladder.syncSeason` | `POST /events/{id}/ladder-sync` |
| `fantasy.public_createFantasyTeam` | `POST /fantasy-team` |
| `fantasy.public_createBet` | `POST /fantasy-bet` |
| `fantasy.public_updateBet` | `PUT /fantasy-bet/{id}` |
| `fantasy.public_deleteBet` | `DELETE /fantasy-bet/{id}` |

# Rules

- The tier names and colours are tokens: [colours are tokens, in one file](../decisions/design-tokens-only.md).
- The tier tables are grouped tables: [one grouped table component](../decisions/grouped-table.md).
- A name inside the bet dialog is plain text: [the player panel opens only on drafting pages](../decisions/player-panel-drafting-only.md).
- The settings keys the pages read belong to the backend: [the backend contract](../concepts/backend-contract.md).
