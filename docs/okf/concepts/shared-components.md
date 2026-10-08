---
type: Domain Concept
title: Shared components
description: The pieces every page reuses, with the rules that decide when a player or team name links, opens a panel or is plain text, when a race icon may show, how a round strip and a roster are drawn, where the standings sit in a stage, how the veto board knows its side, how the series action bar is drawn, where the blocked-times dialog lives, what a control shows before its data arrives, and the notice a phone shows for a task that is easier on a computer.
resource: ../../../DESIGN.md
tags: [components, design]
generated: { by: claude-code/claude-opus-5-5, at: 2026-10-07T22:00:00Z }
sources:
  - id: design
    resource: ../../../DESIGN.md
    title: Shared components and the events section
  - id: player-name
    resource: ../../../next/src/components/PlayerName.tsx
    title: PlayerName
  - id: team-name
    resource: ../../../next/src/components/TeamName.tsx
    title: TeamName
  - id: grouped-table
    resource: ../../../next/src/components/GroupedTable.tsx
    title: GroupedTable
  - id: stage-view
    resource: ../../../next/src/components/StageView.tsx
    title: StageView
  - id: veto-board
    resource: ../../../next/src/components/VetoBoard.tsx
    title: VetoBoard
  - id: round-strip
    resource: ../../../next/src/components/RoundStrip.tsx
    title: RoundStrip
  - id: team-roster
    resource: ../../../next/src/components/TeamRoster.tsx
    title: TeamRoster
  - id: head-to-head
    resource: ../../../next/src/components/HeadToHeadCell.tsx
    title: HeadToHeadCell
  - id: desktop-only-notice
    resource: ../../../next/src/components/DesktopOnlyNotice.tsx
    title: DesktopOnlyNotice
  - id: availability-calendar
    resource: ../../../next/src/components/AvailabilityCalendar.tsx
    title: AvailabilityCalendar
  - id: series-action-bar
    resource: ../../../next/src/components/SeriesActionBar.tsx
    title: SeriesActionBar
  - id: blocked-times-dialog
    resource: ../../../next/src/components/BlockedTimesDialog.tsx
    title: BlockedTimesDialog
  - id: pick-grid
    resource: ../../../next/src/components/admin/PickGrid.tsx
    title: PickGrid
  - id: player-chip-picker
    resource: ../../../next/src/components/admin/PlayerChipPicker.tsx
    title: PlayerChipPicker
---

`DESIGN.md` lists the shared components with what each shows. This file adds the rules that took a decision to settle.

# PlayerName

A player is drawn as `{flag} {name} {race} {mmr}` everywhere, the Discord cards included, and the name links to the player page. That is the one standard; no page draws a name its own way. See [the decision](../decisions/player-name-standard.md).

- One 6 px gap sits between every part, and the MMR reads at every width. A captain shows his race and his MMR only when he plays in the event.
- The plain line is the default on every surface. One variation puts the games icon before the flag, a warning triangle with the count of ladder games in its tooltip and the same mark in `error` when W3C holds no stats. Two props feed it. `games` turns the mark on, and the line works the rule out itself with `gamesWarning` in `next/src/helpers/games-rule.mjs`: twenty ladder games on that race over the current and the previous w3champions season, the `games` of the race's window entry in `race_mmrs`, the threshold a parameter of the helper; a stale entry counts as no stats. The players page and the season team assign page pass it. `warning` is the colour and the text of a mark a read already worked out against the event's own games rule, and the round planner passes it off the draft board read. A line that meets the rule keeps an empty slot of the mark's width, so the flags stay in one column, and the mark carries its text for a screen reader.
- The line reads the MMR itself, with `getW3CMMR` over the `race_mmrs` the payload carries, on the race the player signed up on. It asks for nothing of its own, so a payload without `race_mmrs` shows no number. `mmr={false}` leaves it out where a column of its own sorts by MMR; a number fills it where the surface already holds one, as the KOTH night page does with the MMR its entries store; `mmr={null}` names no number and lets the line read its own.
- A series row names the rating beside the race it plays: `player1_mmr` and `player2_mmr` hold the live window rating on that race on a running event, and the MMR of the time on a finished one. Six reads fill the two fields: `GET /events/{id}/stages/{sid}/series`, `GET /events/{id}/series`, `POST /events/{id}/series/search`, `POST /events/{id}/rounds/{playday}/series/search`, `POST /series/search` and the `series` of `GET /player-series`; every other series payload carries them as null. The row's player carries an empty `race_mmrs`, so the number the row names is the only one the line can read.
- The surfaces that pass the row's rating in: `SeriesBox` on a stage row, `SeriesCard` on a phone, the series schedule, the unscored list of the season page, the published series of the fixture page, the round cards and the series by round of a player page, and the round strip tooltip, which reads `opponentMmr` from `next/src/helpers/round-strip.mjs` before it falls back to the opponent's own stats.
- By default `PlayerName` is a `Link` to the player page.
- `w3c` adds a link to the player's W3Champions profile after the line, the W3Champions mark with the player's name as its label, opened in a new tab. It stands beside the line, never inside it, because the line is itself a link or a button, and a player with no battle tag draws none. The surfaces that weigh players pass it: the round planner and the published series of the fixture page.
- On a drafting page, where the page holds unsaved work, the page wraps its body in `PanelLinksContext.Provider` with the value `true` (`next/src/hooks/player-panel.ts`). Under it the name opens the side panel instead and shows a dock icon in the primary colour with the title "Opens in a side panel". The providers today: the season team assign page, the match page with its round planner, and the panel itself. No other page opens the panel. See [the decision](../decisions/player-panel-drafting-only.md).
- Inside a form dialog on any other page, pass `plain`, because a link would drop the typed input: the veto board in report mode, the fantasy bet dialog, the add-players dialog.

# TeamName

A team is drawn as `{logo} {name}` everywhere, and it links to the team page. The name is the team's long name, and its short tag when it carries no long name.

- A few surfaces draw the team themselves: a card or row that already links as a whole (the teams table, the season match cards and the team cards), the role group button, and the `h1` of a team's own page.
- The logo is the `icon_url` the payload names, at one fixed size on every surface, so names in a column line up. The component asks the backend for no image: a team whose payload names no `icon_url` reads a muted shield outline of that same size. The payloads that name a team name its logo: the ladder read answers `teams[].icon_url`, the ladder players read `rows[].team_icon_url`, the veto board `player1/player2.team_icon_url`, a player's history `events[].team_icon_url`, and the fantasy breakdown `team_breakdown.team_icon_url`; `grind_breakdown` is the one exception and names none.
- The name truncates inside a narrow cell and carries the full name in its `title`, so a long name cannot widen a bracket box or a phone column.
- `seasonKey` picks the season team page, the path the team cards and the ladder already use; without one the link is the plain team page.
- On a drafting page (the match page and the season team assign page) and inside the player panel, under `PanelLinksContext` with the value `true`, the name is plain text with no link, for the same reason the player name is: a click would leave unsaved work.
- Pass `plain` for text only: inside another link or a button, inside a form dialog that holds unsaved work, and in the `h1` of the team's own page. A select option stays a plain option.
- A series box draws the team plain while the box itself opens the series, and links it where the box opens nothing, because a link inside a link cannot be reached.
- The veto board's sides are plain in report mode only, where the board sits inside the result form, and they link on the veto page. A player's event history reads as a plain line, because it sits inside the accordion button. The fantasy score breakdown's drafted team reads as a team line; its grind team draws its own logo, because that part of the payload names none. The ladder teams and the fantasy draft table carry an id, and link like every other team.

# The series action bar

One bar carries the steps of a series. A step not taken yet reads "Schedule", "Veto maps" or "Report result"; a step taken offers its correction, "Change time", "View veto" or "Edit result". "View veto" opens the board, where a step is taken back by the side that took it. The bar is full, all three steps, where the series is the subject of the surface; compact, two active steps, where a series is one item among many; and "all" on Home's My Season, the player's control panel. In the full and compact bars the next step is filled and the one after it outlined, and a step already taken reads as a quiet fact before the buttons: the booked time, and "Veto done"; a surface that states the booked time in a line of its own hides that one fact and keeps the other. The all bar keeps every step the series offers as a button, the next one filled: every needed step before the result, and once the result stands "Edit result" with the steps already taken, so a mistake is corrected where the task was done. Its one fact is the booked time. The steps of one series, their state and who may act are answered in one place, `next/src/helpers/series-actions.mjs`, which mirrors the API gate: the player a side names, a captain of the team that fields a side, and a member of the roster of a side that names no player. The captain reads off the seats `/me` lists, one per team and event he captains. An admin acts for either side, on the same routes as everyone else, so every schedule write refreshes the bot's post of the series. Another reader sees the steps without buttons. A series whose rules draw no map from the veto board leaves that step out, a series whose booked time has passed asks for the result next, and a reported series keeps its result button alone in the full and compact bars. Its context label reads "League - Event - Stage - Round - Opponent" and leaves out a part the series carries no value for.

# BlockedTimesDialog

The hours a player cannot play are set in one dialog, which the app shell holds once for every page. Home's My Season, the owner's player page and the account menu open it through `openBlockedTimes()` in `next/src/stores/blocked-times.ts`, and it closes back onto the page it opened over, so no page of its own needs a way back. It holds the timezone field and `BlockedTimesEditor`, which reads the blocks only while the dialog is open. A save moves a count in the same store when the dialog closes, and Home and the player page read their rounds again, so a derived "Out (blocked times)" follows the new blocks. On a phone the dialog fills the screen.

# Loading

A control draws no default before its data arrives. Until the data lands the control is inert, a skeleton or a disabled control with `aria-busy`, so a tap cannot write a value the reader never picked.

# RaceIcon

A race icon asserts a fact about a row. Show one only when the row has a race: this game, this scheduled series, this signup. A player's profile race is not a race for a row; a table without a race dimension shows the flag and the name only. A labelled "Main race" column is fine because the label says what it is. See [the pitfall](../pitfalls/race-icon-context.md).

# DataTable

`next/src/components/ui/DataTable.tsx` is the one flat table: sort, page and column visibility over one column list. With `rowCount` it runs in server mode, where the page holds the page index and the sort and sends them to the backend. A text column sorts without regard to case. `mobileStack` turns each row into a block of label and value lines below the phone breakpoint; the head row is hidden there, so a "Sort by" select above the table takes its place and each cell carries its column label as an element. `expand` draws a chevron column with one detail row under the row it opens. `rowClassName` puts a class on one data row, such as a tint that marks it; the row's own text still says why. `onRowClick` makes a row with no detail clickable, and a control inside a cell stops its own click. A column whose header is a component names itself through `meta.label`.

# GroupedTable

The one table for groups of rows: a tinted clickable header row per group, detail rows on the same column grid, so a detail number sits under the group total it adds up to. Never nest a table inside a table cell. Numeric columns right-aligned; column titles bare nouns. See [the decision](../decisions/grouped-table.md).

# StageView

`StageView` draws one stage per division in any format. `DESIGN.md` describes the drawing. Two rules took a decision:

- The standings card is the first child of the stage in the DOM, so a screen reader and a keyboard user meet the table before the rounds. A bracket alone pushes it under the draw with CSS `order`, because a bracket is read first and ranked after. No other page reorders with CSS.
- The third-place box names itself off the stage's `third_place` flag and the two loser slots its series carries, never off the column's name.
- A wide bracket follows one entrant: a pointer over a side lights every box and feeder line of that entrant's way through it, and a line under the bracket names them. Its scale is 75, 100 or 125 per cent. A box names each entrant's seed when the page passes `seeds`. The last ladder ends on a "Champion" box, the winner of the last series once it is scored. A phone reads a bracket one round at a time behind round tabs, opening on the first round with a series still to play. A page that passes `viewer` and `onReport` gets a "Report" or "Edit result" button on every box that viewer may report, and a page that passes `onVeto` a "Veto" button beside it, in the same row, on a box of a cup series the viewer plays; `StageView` draws its boxes `stateless`: no state word, and a box with a result reads as done by a success frame and tint, a check and its beaten side dimmed; a box with no `onOpen` is no button and opens nothing; the box grows by a line to hold it, and the box's own label moves beside its state.
- A double elimination is one drawing: the lower ladder is a band under the upper one, and the grand final and its reset close the upper band, past the last column of the longer ladder. The upper final's line runs across to the grand final and the lower final's line runs up to it, so both winners meet where the upper ladder ends. `drawing` in `next/src/helpers/stage-view.mjs` places the bands, the round names and the lines; a single elimination is one band.
- The reset, the series both of whose sides come from the grand final, is drawn only once the lower winner has taken the grand final, because otherwise the engine scores it a walkover of the same two players. With "Hide results" on it is always drawn, so its coming tells nothing. `withoutIdleReset` holds the rule, on the wide drawing and on the phone's round tabs alike.
- A column head whose round plays its own best-of adds it, "Upper bracket final · Bo3", off the round's `best_of`; the phone's round card does the same.
- The draw names no MMR: `StageView` passes `rated={false}` to `SeriesBox`, which hands `mmr={false}` to `PlayerName` and ends a name longer than its side in an ellipsis. A box is 204 px in a 228 px column. The series page and a fixture's series list keep the MMR.

# RoundStrip

One player's event reads as one 12 px square per round: `win` for a round he won, `loss` for one he lost, a square split down the middle for a round he won one series and lost another, a dashed outline for a series still to play, a quiet `border` square crossed by a diagonal in low-emphasis ink for a round he sits out, and a plain quiet `border` square for a round with no series.

- The mark names the winner of the series alone, so the strip reads the same whatever best-of the stage plays. The margin lives in the tooltip: "Round 3 · Lost 0 – 2", then the opponent as a player line. A round that holds two series lists both.
- A series of that round wins over the crossed mark, because a round that was played shows its result, and the crossed mark reads "Round 3 · Sat out". It carries its own hover, so the strip still needs no legend row. The caller passes `outRounds`, which defaults to none, so a surface that knows of no sit-out draws no crossed square.
- The text record "2 – 1" sits beside the strip in `win` and `loss`, so colour is never the only channel; a narrow surface drops the record and keeps the strip.
- One strip is one keyboard stop. The group carries the name "Won 2, lost 1, played 3 of 7 rounds" and the arrow keys walk its marks, so a roster of twelve players never holds a hundred tab stops.
- `roundMarks`, `seriesHead`, `markText`, `stripRecord`, `stripPoints` and `stripLabel` in `next/src/helpers/round-strip.mjs` hold the state of a round, the points and the words; the component holds only the marks and the focus.
- It is drawn on the team page roster and on the player page's Events row. A surface that does not load the event's series draws the roster without it.

# HeadToHeadCell

The head to head of two players is one cell: the record in the order of the pairing, the event they last met in, and a "Meetings" button that opens the meetings under it.

- The caller hands the meetings over, so the cell makes no read of its own. A surface that already holds them opens the list with no request; the round planner reads them the first time a reader opens one pairing.
- A pairing that never met reads "no series". The record wears the app's form, `{wins} – {losses}`, with the percent from ten up.
- It is drawn in an opened row of the round planner and under the title of a series of two players.

# AvailabilityCalendar

When two players can meet across a round, read only, from one free-time answer: the shared free ranges and each player's blocked ranges.

- One column a day and one row a half hour, seven days a page and three under the XS breakpoint, with a pager over the dates it shows. The cells come from `windowDays`, `dayCells`, `blockedSpans` and `sideSpans` in `next/src/helpers/schedule-grid.mjs`, the helpers the schedule dialog draws with.
- A time column for each clock the viewer and the two players live on, the viewer's first; a clock several people share is one column naming them all. `zoneColumns` merges them by UTC offset at the round start, and `clockCell` names each full hour on a column's clock with "+1d" or "−1d" where that clock is on another day.
- An hour free for both is tinted green. Player 1's blocked hours fill the left half of a cell in `side-1` and player 2's the right half in `side-2`, so position and colour both tell them apart; an hour outside the round wears the hatch. Each cell names every clock and whose hour it is in its title, and the legend names the two players.
- A player who entered no availability draws no blocks, and a line above the grid says only the other player's blocked hours show.
- The round planner draws it in an opened matchup row. The schedule dialog keeps its own grid, whose cells are buttons that book a time.

# TeamRoster

The roster of one team in one event is one card: the captains, then the members, in one aligned list of flag, name, race, MMR, points and the round strip.

- The members run by MMR, highest first, and a player with no MMR last, because the list carries no sort control. The MMR head is the W3C form with the synced time in its tooltip. On a running event the MMR is the live one of the signup race; on an event that is over (closed, or past its end date, `isOver` in `next/src/helpers/season-phase.mjs`) it is `mmr_entered`, the MMR the player entered the event with, and an em dash when the ladder holds none.
- The column head, the MMR, "Points" and the round numbers, is drawn once for the card, on the head of the first group that lists rows; "Captains" and "Members 7" stay row group heads, and a group with no rows keeps its one line of empty text.
- The points cell is `stripPoints` over the series the page already holds: the sum of the player's own `player1_points` or `player2_points`. The server applies the event's score system, so the browser only adds the numbers up, and a player no series names reads an em dash. The head note says "Points from series in this event", because a record always names its scope.
- The rounds a player sits out come from the `out_rounds` of the player's `record` when its `season_id` is this event, which the event roster read fills. A roster that names no event reads no sit-out.
- A long name truncates and carries the full name in its title; a number never truncates, and a narrow screen drops the text record beside the strip before it drops the points.
- A captain shows his race, his MMR, his points and his strip only when he plays in that event, and reads "Not playing this season" across those columns when he does not. The race comes from the player's signup race for that event, so a player with none shows no race.
- A captain reads under Captains alone, so the members list and the member count leave his member row out.
- A row whose `played_as` differs from the player's tag today gets a line of its own under it, spanning the card, with "as TAG" in `PlayedAs`. The line sits under the row and not beside the name, so the tracks keep their widths.
- A page that edits the roster fills `renderCaptains` and `renderMembers` with its own controls, and that group draws its own block under the group name instead of the aligned list.

# PlayedAs

The tag one season row was played as: "as TAG" in small muted text, no icon and no link. It renders nothing when `played_as` is null or equals the person's `battleTag`. The team roster, the season team table and the player's Events card use it.

# VetoBoard

A cup series answers the rules `decider,loser,...`: its board lists game 1 as "The map the veto leaves" until the veto is done and then names that map, and a side with two picks reads them as "Map A, then Map B". `vetoOffers` in `next/src/helpers/map-order.mjs` hands the Report Result dialog the pick queue and the decider, so a side that loses twice is offered its second pick; a GNL series reads no queue.

`VetoBoard` reads which side the viewer acts for from the board answer's `viewer_side`; it never works the side out from ids on the client. A side that is a team shows its team name when the answer sets `team_name`, and the player through `PlayerName` otherwise. See [the backend contract](backend-contract.md).

# DesktopOnlyNotice

Every view states its phone level in its page concept: Full, Read on phone or Desktop only. `DesktopOnlyNotice` is the one notice for the two lower levels. On a phone it says the task is easier on a computer and offers a copy-link button; with `desktopOnly` it hides the task, and without it the task stays readable under the notice. Above 960 px it draws its children alone. See "Views for everyone" in `DESIGN.md`.

# PickGrid and the create dialogs

`PickGrid` is how an admin ticks many teams or maps: a grid of picture cards, two to a row on a phone, each with a real checkbox, a search, "Select all shown" and "Clear". A list of pictures is picked with it, never with a multi-select dropdown. `NewTeamDialog` and `NewMapDialog` create one team or one map with its picture and hand the stored row back, so a page offers the create where the pick happens and the admin never leaves the task. A team stored without its icon still counts as created, and the dialog says the icon is missing. `PlayerChipPicker` picks any number of players from a list: a search adds one, and each chip takes one back out. The captains of a team page and the captains and rosters of the season wizard use it.

# The rest

The controls are the shadcn/ui kit in `next/src/components/ui/`; a page composes them and adds no control of its own. A dialog takes its width from the `size` of its `DialogContent`, `confirm`, `sm`, `md`, `lg` or `xl`, and lays its content out by its own width through `@container/dialog`; `DESIGN.md` holds the scale. A `Combobox` or a `Select` under a `Field` takes its accessible name from the field label. `RowActions` folds three or more row buttons into a menu, and fewer when it is passed `menu`, so a row can keep its main task as its own button beside the menu; the menu takes the width of its own items, not the width of the icon button it hangs on, so an item never wraps. `ColumnNote` is a column title with a help note. `StatusAlert` shows a load or save message with a retry. `EventHeader` and `PlayerHeader` top the event and player pages. `FixtureSeries` draws the ordered series of a fixture. `StageView` and `SeriesBox` draw a stage of any format and one series. `VetoBoard` draws the veto and embeds in the Report Result dialog. `DivisionBracketing` draws the MMR bands of the divisions.
