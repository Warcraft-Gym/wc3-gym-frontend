---
type: Page
title: Fixtures and series
description: The GNL fixture page with its published series and the captains' round planner, one series of any event, the map veto, the upcoming series, and the Report Result, schedule and cast dialogs.
resource: ../../../next/src/app/(app)/match/[id]/MatchDetailsView.tsx
tags: [pages, events, series]
generated: { by: claude-code/claude-opus-5-5, at: 2026-09-30T21:00:00Z }
sources:
  - id: match
    resource: ../../../next/src/app/(app)/match/[id]/MatchDetailsView.tsx
    title: The fixture page
  - id: series
    resource: ../../../next/src/app/(app)/series/[id]/SeriesView.tsx
    title: One series
  - id: veto
    resource: ../../../next/src/app/(app)/player-series/[id]/veto/VetoBoardView.tsx
    title: The veto page
  - id: veto-board
    resource: ../../../next/src/components/VetoBoard.tsx
    title: The veto board
  - id: schedule
    resource: ../../../next/src/components/SeriesSchedule.tsx
    title: The series schedule
  - id: report
    resource: ../../../next/src/components/ReportResultDialog.tsx
    title: The Report Result dialog
  - id: schedule
    resource: ../../../next/src/components/player/ScheduleDialog.tsx
    title: The schedule dialog
  - id: schedule-grid
    resource: ../../../next/src/helpers/schedule-grid.mjs
    title: The window, the cells and the blocked spans
  - id: planner
    resource: ../../../next/src/app/(app)/match/[id]/plan/RoundPlanner.tsx
    title: The round planner
  - id: planner-helper
    resource: ../../../next/src/helpers/planner.mjs
    title: Who plays, the matchups, their facts and their order
  - id: draft-suggest
    resource: ../../../next/src/helpers/draft-suggest.mjs
    title: The MMR gap, the places a draft takes and the pair index
  - id: availability-calendar
    resource: ../../../next/src/components/AvailabilityCalendar.tsx
    title: When two players can meet, with a time column per clock
  - id: replay-maps
    resource: ../../../next/src/helpers/replay-maps.mjs
    title: A replay's map against the map its game plays
  - id: casts
    resource: ../../../next/src/components/CastChips.tsx
    title: The cast claims
  - id: fixture-helper
    resource: ../../../next/src/helpers/fixture.mjs
    title: Who may name a roster
  - id: store
    resource: ../../../next/src/stores/series.ts
    title: The series and draft series writes
---

# Routes

| Path | Lowest role | View |
|---|---|---|
| `/match/:id` | member | `MatchDetailsView` |
| `/series/:id` | public | `SeriesView` |
| `/player-series/:id/veto` | member | `VetoBoardView` |

# What it does

**The fixture (`/match/:id`).** A GNL fixture: two teams in one round. The banner names the round, its dates, the teams and the scores. When the events module runs the fixture, its ordered series show under the banner with their mode and pick rule. The round tabs open a menu of the other fixtures of the round. The series card has two tabs, "Series" and "Plan round"; "Plan round" shows to a captain of either team and to an admin, and a captain opens on it while the round has an open place or a draft. Series: every published series with the two players, each with a link to their W3Champions profile, the host mark, the races, the score, the schedule, the fantasy star and the casts; an admin adds a series, edits one (date and time in the admin's own zone, the scores or "Not played", the race each side played, which opens on the race that side signed the season up on and stores a value only when the admin picks another, the host, the fantasy flag), deletes one, and deletes them all. A published series also offers "Replace a player" to an admin and to a captain with a seat on that side, which opens the plan on the player who stays. A round with a place open offers a captain "Plan the round". An admin also gets a button that syncs both rosters from W3Champions. The page is Full on a phone.

**The round planner.** One read of the draft board and one of the draft state fill it, with the two roster reads the page already makes and the round answers of the viewer's own team, of both teams for an admin; nothing is read per row. A write reads the series, the drafts, the board and the state again with no browser cache, whether it succeeds or fails, so a set that failed part-way still shows the rows it wrote; the largest difference reads the state alone, and a round answer reads the answers of the team. The planner is four steps.

1. **Who plays.** One list per team, the viewer's own team first. Each player shows the player line with the W3Champions link, the series played this season, the round answer with who gave it, and whether the player entered any availability with the day it last changed; a player who entered none counts as free all week. For a team whose answers the viewer reads, the switch writes the answer at once: off writes "Out", on clears a captain's "Out" back to no answer and turns the player's own "Out" or blocked times into an "In". For the other team the switch only leaves a player out of the viewer's own list, and a player who sits out the round comes off that team's roster read.
2. **MMR range.** The working largest MMR difference of this match, which both captains share, with 100, 150, 200 and 300 one click away and the stage value one click back. It counts the matchups the range allows and names every rated player it leaves with no opponent, with the nearest one and "Use N".
3. **Pick matchups.** Every pair of free players inside the range, as a table, and as stacked rows under 960 px. Each side is one player block: the player line with the games-rule mark the board read carries, the W3Champions link and the availability mark; the ladder record against this opponent's race; and the races faced this season, in order, with a ring on each that is this opponent's race. The columns count the series each has played this season, the lower one marked while it is under the most any player of that team has played, the MMR difference, and the time: the hours both are free, printed only when both entered availability, and a warning when the two clocks stand 8 h or more apart at the round start. Chips sort the list on several criteria at once; the default is fewest games played, then the smallest MMR difference, then the most time overlap, which puts the known hours first and the rest by the smaller clock gap. The viewer's order stays in the browser's `localStorage`. The first rows of the sort that share no player, one per open place, are the top picks, marked with a star, and "Add the N top picks" writes them in one run. "Show one player" lists every free opponent of one player, also outside the range, and a player who is already paired takes a second pairing from there. Opening a row reads the free time of the pair once: a week calendar with a time column for each clock the viewer and the two players live on, each player's blocked hours in their own half of a cell and their own colour, and the hours both are free in green. A player who entered no availability draws no blocks and a note says so, and a pair where neither entered any reads nothing. The row also shows both players' last ten ladder games and their head to head, whose meetings load only when the reader opens them.
4. **Draft.** The pairings both captains share, each with the MMR difference, the hours, the clock warning, who added or changed it, and a mark on every pairing the other captain changed since this team last opened the plan. A pairing marks the fantasy series, changes its opponent, which opens the list on the viewer's own player, or leaves the draft. The draft says when no fantasy series is marked. Either captain of the fixture publishes, as an admin does: "Publish N series" asks once, lists the pairings with a star on the fantasy series and names it, and balances the host between the teams as each one is published; a draft with no fantasy series still publishes. Opening the plan stamps the visit for the viewer's own team. Under 960 px a bar above the tab bar keeps the draft's count in reach.

Replacing a player in a published series opens the plan with the list on the player who stays, names the player who drops out, lists the free players of the other side, and writes a draft that names the series it replaces. Such a draft takes the place of that series, never a new one, so the place count and the top picks leave it out. Its row wears the pairing it replaces, and a captain of the fixture or an admin publishes it with one confirm, "Publish and replace", which reads what that series holds only when the confirm opens and names the booked time and the map veto that go with it. A series that holds a result or a replay cannot be replaced: a series with a score offers no "Replace a player", and a series that holds only a replay shows the message the backend answers. The three players see the replacement through the reads that exist, the new series appears in their series lists and the replaced series is gone; the app sends no change note.

**One series (`/series/:id`).** Open to anyone. The event label, the two sides with the score, the rule, the map and the winner of each game, and the casts. A game whose rule is the fixed map names the map its round sets, else the map the fixture carries, before the series is played; a veto or a loser game names a map once the veto or the result decides it. An eyebrow says the round and the opponent, because the title names the event. Under the title stand three facts, one per line at every width, each with its icon: the booked time in the reader's zone, the map the next game plays with the rule that gives the map after it, and the head to head of the two players. The head to head is one read of the meetings of the pair, made only for a series of two players and only for a signed-in reader, because the meetings route answers a member alone; it prints the score in the order of the pairing with the event they last met in, this series itself left out, and the meetings themselves open under it with no second read. Two players who never met show no line, and neither does a series with no booked time or one whose result stands. Under the facts the full series action bar carries the steps a side or an admin takes: "Schedule", "Veto maps" and the result; the bar keeps its "Veto done" fact and states no booked time here, because the fact line above it does. A side that names no player is its team, so any logged-in member may open the report and the backend answers whether the caller is on the roster it fields; a side that names a player is acted on by that player, by a captain of the team fielding the side, or by an admin. A captain of a team side, or an admin, names the roster of that side while the series plays a fixture, fields more than one player a side and is not yet played. An admin scores a series nobody played as a walkover or a forfeit. When the fixture holds more than one series, the whole fixture is listed under the card. A viewer who may act on the series, by the rule the action bar uses, sees on a series of more than one game played, beside each game that holds an uploaded replay, a menu that moves that replay to another game the series played; an admin on neither side moves one too, because the move route takes one. When the target game holds a replay the two swap, and the page says so. A series that plays no fixture shows no menu, because the fixture read is the one route that lists replays.

**The veto (`/player-series/:id/veto`).** The veto board on its own page: the pool, the pick and ban order, the step on turn, and the map each game gets from the steps taken. The board reads which side the viewer acts for from the answer and polls the other side's steps every five seconds. A step writes the map picked or banned; the last step can be undone.

**The series schedule.** The "Upcoming series" section at the top of the Season page (`/report#upcoming`) while the current season is selected; it reuses the season's series read, so it adds no request. Every scheduled series of the season from a few days back, grouped by day in the viewer's zone: the time, the round and the fixture, the two players with the rating the row names on the race each plays, the score, and the casts, with how many series of the day are cast.

**The Report Result dialog.** Opened from the series page and from the owner's own player page. It keeps one width in every state. The veto sits at the top under a disclosure row, a button with `aria-expanded` that says where the veto stands ("Map veto complete", "Map veto: 2 of 6 steps done", "No veto recorded") and opens the board in report mode in place; the row is closed when the dialog opens, and a series whose rules play no veto, which answers an empty order, carries neither the row nor the warning. A veto that is not complete reads as a heading in `warning` with its icon, "The map veto is not complete", over the line "Enter it below, or report the result without it.", and the save button reads "Report with incomplete data": the veto warns and never blocks. The board stays loaded while the row is folded, because it names the map each game offers. A solo series offers "Played a different race" for the off-race of either side. Then one card per game: the winner, the map played (the map the rules and the veto offer, or the one a picked replay names), and the replay file. A replay belongs with every game played, but a missing one warns and never blocks: each played game with no file reads "Every game needs its replay" under its field, a heading in `warning` with its icon, "A replay is missing" or "Replays are missing", sits over the line "Every game needs its replay. Add them below, or report the result without them.", and the save button reads "Report with incomplete data". A replay whose upload fails leaves only its game without one, and the saved message names the games the backend answers in `replays_missing`. A fix keeps the stored replays unless a new file is picked. Each game group is titled "Game 1 · <map>", on the map the veto gives that game, else the map named for the game. The dialog reads the replay in the browser and warns when it names other players, or when its map is not the one the veto gives that game, or not the map named for that game: the warning names the map the file was played on and the map the veto gives that game, then what to do with it, "Move it to game 2, or set game 1 to <map>"; when the map field already holds the map the file was played on, that way out reads "or keep game 1 on <map>", because the field asks for no step, and a replay the veto gives no game at all drops the move clause. Every game whose replay the dialog holds, and every game whose replay is stored, carries a "Move to game" menu over the games the series played; a file the reporter picked is not uploaded yet, so the two games swap it inside the form, with the map field the file itself wrote, and a stored replay moves through the move route, which swaps when the target holds one and answers every replay of the series, so a surface that lists them takes that answer and reads nothing again. Saving asks once when a played game has no replay, when a replay was played on a map other than the one its game plays, and when the series plays a veto and records no step; the confirm lists each reason as its own line under a `warning` icon, the missing replays first, "No replay for games 2 and 3.": a small confirm names the reason and offers "Report anyway" and "Go back". One game reads "The replay of game 2 was played on another map than the veto gives it." and more than one reads "The replays of games 1, 2 and 3 were played on other maps than the veto gives them.", the games listed with commas and "and". The confirm is a centred panel at every width, its height its content, so the form behind it stays in view. Each replay goes from the browser to a signed upload link the backend answers per game, then the score writes with one entry per game; when only files changed, each new file replaces one stored replay.

**The schedule dialog.** Opened by the schedule step of the series action bar, on the owner's own player page and on the series page. It reads the shared free hours of the pair once when it opens and draws the round window from the current half hour to its end: what the read leaves out of that window is an hour at least one of the two blocks, and the grid marks it. The same read names each side's own blocked ranges, and the grid draws the two apart, by position and never by colour: in the day tracks the viewer's hours are a strip over the track and the other side's a strip under it, and in the calendar each day holds two lanes, the viewer's on the left; an hour outside the round window carries no side mark. The legend reads "Open for both", "You are blocked", "`<name>` is blocked", "Start time" and "Outside the round"; a reader who plays neither side, a captain or an admin, reads both names. An answer that carries no per-side ranges keeps the one pair state, "One of you is blocked". The window has two views behind a labelled "Calendar / Day tracks" toggle, the calendar above the XS breakpoint and the day tracks under it; both are a CSS grid whose cells are buttons on the half hour, so arrow keys move inside a day and every cell names both clocks. The calendar draws one page of the window at a time, seven days wide and three under the XS breakpoint, with a previous and a next pager over the dates it shows; its columns share the space that is left beside a narrow hour gutter and every half-hour row is the same height, so the grid never widens the dialog and the toggle, the legend and the blocked-hour line keep its width. A track cell is a few pixels wide on a phone, so the day tracks list the half hours of the picked day under its track as wrapping buttons, which a finger can hit. Above the grid one line says when the round ends, on the event's clock and on the reader's, the same line the round cards of the player page draw. The pick is a point in time, and the grid draws it as one: a stem across its cell with a dot at the cell's left edge, never a filled half hour, and a cell fill is the hover and focus state alone. An hour outside the round window wears a hatch, so it reads apart from a blocked hour in both themes. A pick inside a blocked hour says whose hour it is, in the cell's tooltip and in the line under the grid, and is still booked, because the hours are a guide and never a refusal, and its start-time chip keeps the picked style instead of the faint one a blocked chip wears; the date and time inputs move the same pick. The bottom section holds one aligned row a player, flag first, with that player's zone, its GMT offset written with a true minus sign, and the picked point on that clock; a row on another date than the viewer's says that date. The button reads "Book this time" and there is no second confirm; after the write the dialog offers the next step, the veto board of the series. It writes the series' time with the action `scheduled`, on the one player route, for an admin as for a side, because that route refreshes the bot's post of the series.

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
| `series.promoteDraftSeries` | `POST /draft-series/{id}/promote` |
| `series.getDraftReplaces` | `GET /draft-series/{id}/replaces` |
| `series.getDraftBoard` | `GET /matches/{match_id}/draft-board` |
| `series.getDraftState` | `GET /draft-series/match/{match_id}/state` |
| `series.markDraftSeen` | `PUT /draft-series/match/{match_id}/teams/{team_id}/seen` |
| `series.setDraftMaxMmrDifference` | `PUT /draft-series/match/{match_id}/max-mmr-difference` |
| `series.playerMeetings` | `GET /users/{user_a}/meetings/{user_b}` |
| `availability.setTeamAvailability` | `PUT /events/{event_id}/teams/{team_id}/availability` |
| `availability.pairFreeTime` | `GET /events/{event_id}/rounds/{playday}/free-time` |
| `team.syncPlayersW3C` | `POST /events/{season_id}/teams/{id}/ladder-sync` |
| `event.setSideRoster` | `PUT /series/{id}/sides` |
| `event.awardSeries` | `PUT /series/{id}/result-kind` |
| the veto board, no store | `PUT /player-series/{id}/veto` |
| the Report Result dialog, no store | `POST /player-series/{id}/replays/{game}/upload-url`, a `PUT` of the file to the answered link, `PUT /player-series/{id}` with the scores and the games, `PUT /player-series/{id}/replays/{game}` for a replaced file |
| `match.moveSeriesReplay` | `PUT /player-series/{id}/replays/{game}/move/{to_game}` |
| the schedule dialog, no store | `GET /player-series/{id}/free-time`, `PUT /player-series/{id}` with `date_time` |
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
- A record reads `{wins} – {losses}`, with the percent from ten up; `record` in `next/src/helpers/figures.mjs` is the one source.
- The seen mark of a round draft is written for the viewer's own team only, so no other caller asks for it.
