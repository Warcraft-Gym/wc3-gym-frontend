---
type: Page
title: Fixtures and series
description: The GNL fixture page with its published and draft series, one series of any event, the map veto, the upcoming series, and the Report Result, schedule and cast dialogs.
resource: ../../../src/views/MatchDetailsView.vue
tags: [pages, events, series]
generated: { by: openai/gpt-6, at: 2026-09-15T21:52:57Z }
sources:
  - id: match
    resource: ../../../src/views/MatchDetailsView.vue
    title: The fixture page
  - id: series
    resource: ../../../src/views/SeriesView.vue
    title: One series
  - id: veto
    resource: ../../../src/views/VetoBoardView.vue
    title: The veto page
  - id: veto-board
    resource: ../../../src/components/VetoBoard.vue
    title: The veto board
  - id: upcoming
    resource: ../../../src/views/UpcomingView.vue
    title: The upcoming series
  - id: report
    resource: ../../../src/components/ReportResultDialog.vue
    title: The Report Result dialog
  - id: schedule
    resource: ../../../src/components/ScheduleDialog.vue
    title: The schedule dialog
  - id: casts
    resource: ../../../src/components/CastChips.vue
    title: The cast claims
  - id: fixture-helper
    resource: ../../../src/helpers/fixture.mjs
    title: Who may name a roster
  - id: store
    resource: ../../../src/stores/series.store.js
    title: The series and draft series writes
---

# Routes

| Path | Lowest role | View |
|---|---|---|
| `/match/:id` | member | `MatchDetailsView` |
| `/series/:id` | public | `SeriesView` |
| `/player-series/:id/veto` | member | `VetoBoardView` |
| `/upcoming` | member | `UpcomingView` |

# What it does

**The fixture (`/match/:id`).** A GNL fixture: two teams in one round. The banner names the round, its dates, the teams and the scores. When the events module runs the fixture, its ordered series show under the banner with their mode and pick rule. The round tabs open a menu of the other fixtures of the round. The series card has two tabs. Published: every series with the two players, the host mark, the races, the score, the schedule, the fantasy star and the casts; an admin adds a series, edits one (date and time in the admin's own zone, the scores or "Not played", the race each side played, the host, the fantasy flag), deletes one, and deletes them all. Draft: read by a captain; a captain of either team, or an admin, adds a draft, edits it, marks it for fantasy and deletes it; an admin publishes one or all, and the host is balanced between the teams as each one is published. An admin also gets the team rosters panel, which pairs the picked players of the two teams inside an MMR difference and creates the pairs as drafts or as published series, and a button that syncs both rosters from W3Champions.

**One series (`/series/:id`).** Open to anyone. The event label, the round and the time, the two sides with the score, the rule, the map and the winner of each game, and the casts. A side of the series, or an admin, gets "Report result" or "Edit result", and "Map veto" when a rule is the veto. A series with team sides names no player, so any logged-in member may open the report and the backend answers whether the caller acts for a side. A captain of a team side, or an admin, names the roster of that side while the series plays a fixture, fields more than one player a side and is not yet played. An admin scores a series nobody played as a walkover or a forfeit. When the fixture holds more than one series, the whole fixture is listed under the card.

**The veto (`/player-series/:id/veto`).** The veto board on its own page: the pool, the pick and ban order, the step on turn, and the map each game gets from the steps taken. The board reads which side the viewer acts for from the answer and polls the other side's steps every five seconds. A step writes the map picked or banned; the last step can be undone.

**Upcoming (`/upcoming`).** Every scheduled series of the current season, grouped by day in the viewer's zone: the time, the round and the fixture, the two players, the score, and the casts, with how many series of the day are cast.

**The Report Result dialog.** Opened from the series page and from the owner's own player page. The veto board sits at the top in report mode; it warns when the veto is not complete and never blocks. A solo series offers "Played a different race" for the off-race of either side. Then one card per game: the winner, the map played (the map the rules and the veto offer, or the one a picked replay names), and the replay file. A first report needs a replay for every game played; a fix keeps the stored replays unless a new file is picked. The dialog reads the replay in the browser and warns when it names another map or other players. Each replay goes from the browser to a signed upload link the backend answers per game, then the score writes with one entry per game; when only files changed, each new file replaces one stored replay.

**The schedule dialog.** On the owner's own player page. The date and time in the viewer's zone, the same instant on the opponent's clock, and the hours both players are open this round, as a hint only. It writes the series' time with the action `scheduled`.

**Casts.** The cast chips sit on every series row. A member with a player row claims a series with their channel, the last channel they used prefilled; a series with a result takes a VOD link instead. The claimer edits their channel and their VOD and removes their claim; an admin edits any.

# Writes

| Store action | Route |
|---|---|
| `series.createSeries` | `POST /series` |
| `series.updateSeries` | `PUT /series/{id}` |
| `series.deleteSeries`, `series.deleteAllSeries` | `DELETE /series/{id}` |
| `series.createDraftSeries` | `POST /draft-series` |
| `series.updateDraftSeries` | `PUT /draft-series/{id}` |
| `series.deleteDraftSeries` | `DELETE /draft-series/{id}` |
| `series.deleteAllDraftSeriesForMatch` | `DELETE /draft-series/match/{match_id}` |
| `series.promoteDraftSeries` | `POST /draft-series/{id}/promote` |
| `team.syncPlayersW3C` | `POST /events/{season_id}/teams/{id}/ladder-sync` |
| `event.setSideRoster` | `PUT /series/{id}/sides` |
| `event.awardSeries` | `PUT /series/{id}/result-kind` |
| the veto board, no store | `PUT /player-series/{id}/veto` |
| the Report Result dialog, no store | `POST /player-series/{id}/replays/{game}/upload-url`, a `PUT` of the file to the answered link, `PUT /player-series/{id}` with the scores and the games, `PUT /player-series/{id}/replays/{game}` for a replaced file |
| the schedule dialog, no store | `PUT /player-series/{id}` with `date_time` |
| `series.claimSeries` | `POST /series/{id}/casts` |
| `series.updateCast` | `PUT /series/{id}/casts/{cast_id}` |
| `series.setCastVod` | `PUT /series/{id}/casts/{cast_id}/vod` |
| `series.unclaimSeries` | `DELETE /series/{id}/casts/{cast_id}` |

# Rules

- The veto is entered inside the report and never blocks it: [the veto is entered inside Report Result](../decisions/veto-in-report-result.md).
- The board takes its side from the answer, never from ids: [shared components](../concepts/shared-components.md).
- The fixture page holds unsaved draft work, so a name opens the side panel there: [the player panel opens only on drafting pages](../decisions/player-panel-drafting-only.md).
- A series answers resolved races and takes off-races on a write; every time is UTC: [the backend contract](../concepts/backend-contract.md).
- A race on a series row is the race of that series: [a race icon needs a race for the row](../pitfalls/race-icon-context.md).
