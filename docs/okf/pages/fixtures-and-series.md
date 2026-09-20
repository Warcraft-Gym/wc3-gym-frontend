---
type: Page
title: Fixtures and series
description: The GNL fixture page with its published and draft series, one series of any event, the map veto, the upcoming series, and the Report Result, schedule and cast dialogs.
resource: ../../../next/src/app/(app)/match/[id]/MatchDetailsView.tsx
tags: [pages, events, series]
generated: { by: claude-code/claude-fable-5-1, at: 2026-09-20T23:59:00Z }
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
  - id: upcoming
    resource: ../../../next/src/app/(app)/upcoming/UpcomingView.tsx
    title: The upcoming series
  - id: report
    resource: ../../../next/src/components/ReportResultDialog.tsx
    title: The Report Result dialog
  - id: schedule
    resource: ../../../next/src/components/player/ScheduleDialog.tsx
    title: The schedule dialog
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
| `/upcoming` | member | `UpcomingView` |

# What it does

**The fixture (`/match/:id`).** A GNL fixture: two teams in one round. The banner names the round, its dates, the teams and the scores. When the events module runs the fixture, its ordered series show under the banner with their mode and pick rule. The round tabs open a menu of the other fixtures of the round. The series card has two tabs. Published: every series with the two players, the host mark, the races, the score, the schedule, the fantasy star and the casts; an admin adds a series, edits one (date and time in the admin's own zone, the scores or "Not played", the race each side played, which opens on the race that side signed the season up on and stores a value only when the admin picks another, the host, the fantasy flag), deletes one, and deletes them all. A published series also offers "Replace a player" to an admin and to a captain with a seat on that side, which opens the draft board on the player who stays. A round with a place open offers a captain "Add a series", which opens the same board. Draft: read by a captain; a captain of either team, or an admin, adds a draft, edits it, marks it for fantasy and deletes it; an admin publishes one or all, and the host is balanced between the teams as each one is published. Publishing the whole draft asks once and lists the pairings it publishes; a draft that replaces a published series is left out of that set and publishes from its own row. An admin also gets the team rosters panel, which pairs the picked players of the two teams inside an MMR difference and creates the pairs as drafts or as published series, and a button that syncs both rosters from W3Champions.

**The round draft board.** The Draft tab leads with the board a captain drafts on. One read of the draft board and one of the draft state fill it. A write that moves a pairing reads both again with no browser cache, whether it succeeds or fails, so a set that failed part-way still shows the rows it wrote; the ready mark and the largest difference read the state alone, and a check-in reads the availability of the team. Nothing is read per row. The board draws both rosters on one MMR scale, the team 1 player line on the left and the team 2 player line on the right, each with the games-rule mark the read carries; a player with no MMR sits on a shelf under the scale, pickable and never inside a difference. The scale names itself: a low-emphasis grid line and its MMR every 200 in a gutter at the left edge, the two bounds of the picked band beside it, and one legend line under the board for the marks that carry no hover of their own, the draft pairing line, the quieter published pairing line, the band and an already paired name. The plot stands at least half again as tall as its rows need, so few names are pushed off their own MMR, and the board card keeps its own height beside the panel. Under 960 px the scale would clip, so each roster reads as an ordered list of the same player lines, the players with no MMR last, and the panel takes the screen while a player is picked. Picking a player shades the working difference around that player, links the free opponents inside it, and opens a panel beside the board: each opponent with the MMR difference, the shared hours of the pairing, both ladder records against the other's race, and the head to head in pairing order, whose meetings load only when the reader opens them. An opponent further away than the working difference is listed under the near ones, and a player with no free opponent inside it reads the nearest difference that reaches one. A player who sits out this round moves into a collapsed "Sitting out" group, where a captain checks a member of their own team in; an opponent already paired, by a published series of the fixture or by a draft, moves into a collapsed "Already paired" group, which shows only while it holds someone; a draft pairing there offers "Change opponent", which marks the pairing it would break while the pointer is on it, and a published one offers nothing. A player who already has a pairing may take a second one after a warning, and nothing is refused.

The board is the one way to start a draft, so the draft table under it draws its "no draft series yet" block only when the board read answered nothing. The toolbar counts the places of the round against the event's series per fixture, carries the largest MMR difference of this match as one control with the stage value one click away, and offers "Suggest pairings", which is disabled once every place has one. Suggest runs in the browser over the board read: it keeps the pairings already drafted, fills only the places the published series and the drafts leave open, with the set of the smallest total MMR difference inside the working value, skips a player with no MMR and a player who already holds a published series or a draft of the fixture, reads itself again from the board whenever the working value or the drafts move, takes the nearest pairing first instead of the smallest total once either team leaves more than twelve rated players free, and nothing is written until the reader confirms; a whole confirmed set writes as one run of creates and one read follows it. The draft rows carry the MMR difference, the shared hours, the head to head, who added or changed each pairing and a mark on every pairing the other captain changed since this team last opened the draft. Opening the Draft tab stamps the visit for the reader's own team, so reading the published table alone keeps the marks. A captain marks their own team ready; the mark is advisory, the backend clears it on any change, and only an admin publishes.

Replacing a player in a published series opens the same panel with the pick fixed on the player who stays, names the player who drops out, lists the free players of the other side and the players of that side who sit out, and writes a draft that names the series it replaces. Such a draft takes the place of that series, never a new one, so the toolbar count and the suggestion leave it out. Its row wears the pairing it replaces, and an admin publishes it with one confirm, "Publish and replace", which reads what that series holds only when the confirm opens and names the booked time and the map veto that go with it. A series that holds a result or a replay cannot be replaced: a series with a score offers no "Replace a player", and a series that holds only a replay shows the message the backend answers. The three players see the replacement through the reads that exist, the new series appears in their series lists and the replaced series is gone; the app sends no change note.

**One series (`/series/:id`).** Open to anyone. The event label, the two sides with the score, the rule, the map and the winner of each game, and the casts. A game whose rule is the fixed map names the map its round sets, else the map the fixture carries, before the series is played; a veto or a loser game names a map once the veto or the result decides it. An eyebrow says the round and the opponent, because the title names the event. Under the title stand three facts, one per line at every width, each with its icon: the booked time in the reader's zone, the map the next game plays with the rule that gives the map after it, and the head to head of the two players. The head to head is one read of the meetings of the pair, made only for a series of two players and only for a signed-in reader, because the meetings route answers a member alone; it prints the score in the order of the pairing with the event they last met in, this series itself left out, and the meetings themselves open under it with no second read. Two players who never met show no line, and neither does a series with no booked time or one whose result stands. Under the facts the full series action bar carries the steps a side or an admin takes: "Schedule", "Veto maps" and the result; the bar keeps its "Veto done" fact and states no booked time here, because the fact line above it does. A side that names no player is its team, so any logged-in member may open the report and the backend answers whether the caller is on the roster it fields; a side that names a player is acted on by that player, by a captain of the team fielding the side, or by an admin. A captain of a team side, or an admin, names the roster of that side while the series plays a fixture, fields more than one player a side and is not yet played. An admin scores a series nobody played as a walkover or a forfeit. When the fixture holds more than one series, the whole fixture is listed under the card. A viewer who may act on the series, by the rule the action bar uses, sees on a series of more than one game played, beside each game that holds an uploaded replay, a menu that moves that replay to another game the series played; an admin on neither side moves one too, because the move route takes one. When the target game holds a replay the two swap, and the page says so. A series that plays no fixture shows no menu, because the fixture read is the one route that lists replays.

**The veto (`/player-series/:id/veto`).** The veto board on its own page: the pool, the pick and ban order, the step on turn, and the map each game gets from the steps taken. The board reads which side the viewer acts for from the answer and polls the other side's steps every five seconds. A step writes the map picked or banned; the last step can be undone.

**Upcoming (`/upcoming`).** Every scheduled series of the current season, grouped by day in the viewer's zone: the time, the round and the fixture, the two players with the rating the row names on the race each plays, the score, and the casts, with how many series of the day are cast.

**The Report Result dialog.** Opened from the series page and from the owner's own player page. It keeps one width in every state. The veto sits at the top under a disclosure row, a button with `aria-expanded` that says where the veto stands ("Map veto complete", "Map veto: 2 of 6 steps done", "No veto recorded") and opens the board in report mode in place; the row is closed when the dialog opens, and a series whose rules play no veto, which answers an empty order, carries neither the row nor the warning. A veto that is not complete reads as a heading in `warning` with its icon, "The map veto is not complete", over the line "Enter it below, or report the result without it.", and the save button reads "Report without a veto": the veto warns and never blocks. The board stays loaded while the row is folded, because it names the map each game offers. A solo series offers "Played a different race" for the off-race of either side. Then one card per game: the winner, the map played (the map the rules and the veto offer, or the one a picked replay names), and the replay file. A first report needs a replay for every game played; a fix keeps the stored replays unless a new file is picked. Each game group is titled "Game 1 · <map>", on the map the veto gives that game, else the map named for the game. The dialog reads the replay in the browser and warns when it names other players, or when its map is not the one the veto gives that game, or not the map named for that game: the warning names the map the file was played on and what to do with it, "Move it to game 2, or change the map of game 1"; when the map field already holds the map the file was played on, the second way out reads "or report game 1 on <map>". Every game whose replay the dialog holds, and every game whose replay is stored, carries a "Move to game" menu over the games the series played; a file the reporter picked is not uploaded yet, so the two games swap it inside the form, with the map field the file itself wrote, and a stored replay moves through the move route, which swaps when the target holds one and answers every replay of the series, so a surface that lists them takes that answer and reads nothing again. Saving asks once when a replay was played on a map other than the one its game plays, and once when the series plays a veto and records no step: a small confirm names the reason and offers "Report anyway" and "Go back". The veto still never blocks. Each replay goes from the browser to a signed upload link the backend answers per game, then the score writes with one entry per game; when only files changed, each new file replaces one stored replay.

**The schedule dialog.** Opened by the schedule step of the series action bar, on the owner's own player page and on the series page. It reads the shared free hours of the pair once when it opens and draws the round window from the current half hour to its end: what the read leaves out of that window is an hour at least one of the two blocks, and the grid marks it. The same read names each side's own blocked ranges, and the grid draws the two apart, by position and never by colour: in the day tracks the viewer's hours are a strip over the track and the other side's a strip under it, and in the calendar each day holds two lanes, the viewer's on the left; an hour outside the round window carries no side mark. The legend reads "Open for both", "You are blocked" and "`<name>` is blocked"; a reader who plays neither side, a captain or an admin, reads both names. An answer that carries no per-side ranges keeps the one pair state, "One of you is blocked". The window has two views behind a labelled "Calendar / Day tracks" toggle, the calendar by default on a desktop and the day tracks at 390 px; both are a CSS grid whose cells are buttons on the half hour, so arrow keys move inside a day and every cell names both clocks. The calendar draws one page of the window at a time, seven days wide and three under the XS breakpoint, with a previous and a next pager over the dates it shows; its columns share the space that is left beside a narrow hour gutter and every half-hour row is the same height, so the grid never widens the dialog and the toggle, the legend and the blocked-hour line keep its width. A track cell is a few pixels wide on a phone, so the day tracks list the half hours of the picked day under its track as wrapping buttons, which a finger can hit. Above the grid one line says when the round ends, on the event's clock and on the reader's, the same line the round cards of the player page draw. The pick is a point in time, and the grid draws it as one: a stem across its cell with a dot at the cell's left edge, never a filled half hour, and a cell fill is the hover and focus state alone. An hour outside the round window wears a hatch, so it reads apart from a blocked hour in both themes. A pick inside a blocked hour says whose hour it is, in the cell's tooltip and in the line under the grid, and is still booked, because the hours are a guide and never a refusal, and its start-time chip keeps the picked style instead of the faint one a blocked chip wears; the date and time inputs move the same pick. The bottom section holds one aligned row a player, flag first, with that player's zone, its GMT offset written with a true minus sign, and the picked point on that clock; a row on another date than the viewer's says that date. The button reads "Book this time" and there is no second confirm; after the write the dialog offers the next step, the veto board of the series. It writes the series' time with the action `scheduled`, on the one player route, for an admin as for a side, because that route refreshes the bot's post of the series.

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
| `series.getDraftReplaces` | `GET /draft-series/{id}/replaces` |
| `series.getDraftBoard` | `GET /matches/{match_id}/draft-board` |
| `series.getDraftState` | `GET /draft-series/match/{match_id}/state` |
| `series.markDraftSeen` | `PUT /draft-series/match/{match_id}/teams/{team_id}/seen` |
| `series.setDraftReady` | `PUT /draft-series/match/{match_id}/teams/{team_id}/ready` |
| `series.setDraftMaxMmrDifference` | `PUT /draft-series/match/{match_id}/max-mmr-difference` |
| `series.playerMeetings` | `GET /users/{user_a}/meetings/{user_b}` |
| `availability.setTeamAvailability` | `PUT /events/{event_id}/teams/{team_id}/availability` |
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
