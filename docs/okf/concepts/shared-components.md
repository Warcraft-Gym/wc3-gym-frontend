---
type: Domain Concept
title: Shared components
description: The pieces every page reuses, with the rules that decide when a player or team name links, opens a panel or is plain text, when a race icon may show, how a round strip and a roster are drawn, where the standings sit in a stage, how the veto board knows its side, how the series action bar is drawn, and what a control shows before its data arrives.
resource: ../../../DESIGN.md
tags: [components, design]
generated: { by: claude-code/claude-opus-5-5, at: 2026-09-24T09:35:07Z }
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
---

`DESIGN.md` lists the shared components with what each shows. This file adds the rules that took a decision to settle.

# PlayerName

A player is drawn as `{flag} {name} {race} {mmr}` everywhere, the Discord cards included, and the name links to the player page. That is the one standard; no page draws a name its own way. See [the decision](../decisions/player-name-standard.md).

- One 6 px gap sits between every part, and the MMR reads at every width. A captain shows his race and his MMR only when he plays in the event.
- The plain line is the default on every surface. One variation puts the games icon before the flag, a warning triangle with the count of ladder games in its tooltip and the same mark in `error` when W3C holds no stats. Two props feed it. `games` turns the mark on, and the line works the rule out itself with `gamesWarning` in `next/src/helpers/games-rule.mjs`: twenty ladder games on that race over the current and the previous w3champions season, the `games` of the race's window entry in `race_mmrs`, the threshold a parameter of the helper; a stale entry counts as no stats. The players page and the season team assign page pass it. `warning` is the colour and the text of a mark a read already worked out against the event's own games rule, and the round draft board passes it off the board read. A line that meets the rule keeps an empty slot of the mark's width, so the flags stay in one column, and the mark carries its text for a screen reader.
- The line reads the MMR itself, with `getW3CMMR` over the `race_mmrs` the payload carries, on the race the player signed up on. It asks for nothing of its own, so a payload without `race_mmrs` shows no number. `mmr={false}` leaves it out where a column of its own sorts by MMR; a number fills it where the surface already holds one, as the KOTH night page does with the MMR its entries store; `mmr={null}` names no number and lets the line read its own.
- A series row names the rating beside the race it plays: `player1_mmr` and `player2_mmr` hold the live window rating on that race on a running event, and the MMR of the time on a finished one. Six reads fill the two fields: `GET /events/{id}/stages/{sid}/series`, `GET /events/{id}/series`, `POST /events/{id}/series/search`, `POST /events/{id}/rounds/{playday}/series/search`, `POST /series/search` and the `series` of `GET /player-series`; every other series payload carries them as null. The row's player carries an empty `race_mmrs`, so the number the row names is the only one the line can read.
- The surfaces that pass the row's rating in: `SeriesBox` on a stage row, `SeriesCard` on a phone, the upcoming list, the unscored list of the season page, the published series of the fixture page, the round cards and the series by round of a player page, and the round strip tooltip, which reads `opponentMmr` from `next/src/helpers/round-strip.mjs` before it falls back to the opponent's own stats.
- By default `PlayerName` is a `Link` to the player page.
- On a drafting page, where the page holds unsaved work, the page wraps its body in `PanelLinksContext.Provider` with the value `true` (`next/src/hooks/player-panel.ts`). Under it the name opens the side panel instead and shows a dock icon in the primary colour with the title "Opens in a side panel". The providers today: the season team assign page, the match page's series draft, and the panel itself. No other page opens the panel. See [the decision](../decisions/player-panel-drafting-only.md).
- Inside a form dialog on any other page, pass `plain`, because a link would drop the typed input: the veto board in report mode, the fantasy bet dialog, the add-players dialog.

# TeamName

A team is drawn as `{logo} {name}` everywhere, and it links to the team page. The name is the team's long name, and its short tag when it carries no long name.

- A few surfaces draw the team themselves: a card or row that already links as a whole (the teams table, the season match cards and the team cards), the `TeamChip` badge in the propose dialog, the role group button, and the `h1` of a team's own page.
- The logo is the `icon_url` the payload names, at one fixed size on every surface, so names in a column line up. The component asks the backend for no image: a team whose payload names no `icon_url` reads a muted shield outline of that same size. The payloads that name a team name its logo: the ladder read answers `teams[].icon_url`, the ladder players read `rows[].team_icon_url`, the veto board `player1/player2.team_icon_url`, a player's history `events[].team_icon_url`, and the fantasy breakdown `team_breakdown.team_icon_url`; `grind_breakdown` is the one exception and names none.
- The name truncates inside a narrow cell and carries the full name in its `title`, so a long name cannot widen a bracket box or a phone column.
- `seasonKey` picks the season team page, the path the team cards and the ladder already use; without one the link is the plain team page.
- On a drafting page (the match page and the season team assign page) and inside the player panel, under `PanelLinksContext` with the value `true`, the name is plain text with no link, for the same reason the player name is: a click would leave unsaved work.
- Pass `plain` for text only: inside another link or a button, inside a form dialog that holds unsaved work, and in the `h1` of the team's own page. A select option stays a plain option.
- A series box draws the team plain while the box itself opens the series, and links it where the box opens nothing, because a link inside a link cannot be reached.
- The veto board's sides are plain in report mode only, where the board sits inside the result form, and they link on the veto page. A player's event history reads as a plain line, because it sits inside the accordion button. The fantasy score breakdown's drafted team reads as a team line; its grind team draws its own logo, because that part of the payload names none. The ladder teams and the fantasy draft table carry an id, and link like every other team.

# The series action bar

One bar carries the steps of a series, with the words "Schedule", "Veto maps" and "Report result"; the report step reads "Edit result" once the series is scored. It is full, all three steps, where the series is the subject of the surface, and compact, two active steps, where a series is one item among many; in the compact bar the next step is filled and the one after it outlined. In both bars a button keeps the word of its step, and a step already taken reads as a quiet fact before the buttons: the booked time, and "Veto done"; a surface that states the booked time in a line of its own hides that one fact and keeps the other. The steps of one series, their state and who may act are answered in one place, `next/src/helpers/series-actions.mjs`, which mirrors the API gate: the player a side names, a captain of the team that fields a side, and a member of the roster of a side that names no player. The captain reads off the seats `/me` lists, one per team and event he captains. An admin acts for either side, on the same routes as everyone else, so every schedule write refreshes the bot's post of the series. Another reader sees the steps without buttons. A series whose rules draw no map from the veto board leaves that step out, a series whose booked time has passed asks for the result next, and a reported series keeps its result button alone. Its context label reads "League - Event - Stage - Round - Opponent" and leaves out a part the series carries no value for.

# Loading

A control draws no default before its data arrives. Until the data lands the control is inert, a skeleton or a disabled control with `aria-busy`, so a tap cannot write a value the reader never picked.

# RaceIcon

A race icon asserts a fact about a row. Show one only when the row has a race: this game, this scheduled series, this signup. A player's profile race is not a race for a row; a table without a race dimension shows the flag and the name only. A labelled "Main race" column is fine because the label says what it is. See [the pitfall](../pitfalls/race-icon-context.md).

# DataTable

`next/src/components/ui/DataTable.tsx` is the one flat table: sort, page and column visibility over one column list. With `rowCount` it runs in server mode, where the page holds the page index and the sort and sends them to the backend. A text column sorts without regard to case. `mobileStack` turns each row into a block of label and value lines below the phone breakpoint; the head row is hidden there, so a "Sort by" select above the table takes its place and each cell carries its column label as an element. `expand` draws a chevron column with one detail row under the row it opens. A column whose header is a component names itself through `meta.label`.

# GroupedTable

The one table for groups of rows: a tinted clickable header row per group, detail rows on the same column grid, so a detail number sits under the group total it adds up to. Never nest a table inside a table cell. Numeric columns right-aligned; column titles bare nouns. See [the decision](../decisions/grouped-table.md).

# StageView

`StageView` draws one stage per division in any format. `DESIGN.md` describes the drawing. Two rules took a decision:

- The standings card is the first child of the stage in the DOM, so a screen reader and a keyboard user meet the table before the rounds. A bracket alone pushes it under the draw with CSS `order`, because a bracket is read first and ranked after. No other page reorders with CSS.
- The third-place box names itself off the stage's `third_place` flag and the two loser slots its series carries, never off the column's name.

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

- The caller hands the meetings over, so the cell makes no read of its own. A surface that already holds them opens the list with no request; the draft board reads them the first time a reader opens one pairing.
- A pairing that never met reads "no series". The record wears the app's form, `{wins} – {losses}`, with the percent from ten up.
- It is drawn on the round draft board, on the draft table of a fixture and under the title of a series of two players.

# TeamRoster

The roster of one team in one event is one card: the captains, then the members, in one aligned list of flag, name, race, MMR, points and the round strip.

- The members run by MMR, highest first, and a player with no MMR last, because the list carries no sort control. The MMR head is the W3C form with the synced time in its tooltip. On a running event the MMR is the live one of the signup race; on an event that is over (closed, or past its end date, `isOver` in `next/src/helpers/season-phase.mjs`) it is `mmr_entered`, the MMR the player entered the event with, and an em dash when the ladder holds none.
- The column head, the MMR, "Points" and the round numbers, is drawn once for the card, on the head of the first group that lists rows; "Captains" and "Members 7" stay row group heads, and a group with no rows keeps its one line of empty text.
- The points cell is `stripPoints` over the series the page already holds: the sum of the player's own `player1_points` or `player2_points`. The server applies the event's score system, so the browser only adds the numbers up, and a player no series names reads an em dash. The head note says "Points from series in this event", because a record always names its scope.
- The rounds a player sits out come from the `out_rounds` of the `gnl_stats` row whose `season_id` is this event, which the event roster read fills. A roster that names no event reads no sit-out.
- A long name truncates and carries the full name in its title; a number never truncates, and a narrow screen drops the text record beside the strip before it drops the points.
- A captain shows his race, his MMR, his points and his strip only when he plays in that event, and reads "Not playing this season" across those columns when he does not. The race comes from the player's signup race for that event, so a player with none shows no race.
- A captain reads under Captains alone, so the members list and the member count leave his member row out.
- A row whose `played_as` differs from the player's tag today gets a line of its own under it, spanning the card, with "as TAG" in `PlayedAs`. The line sits under the row and not beside the name, so the tracks keep their widths.
- A page that edits the roster fills `renderCaptains` and `renderMembers` with its own controls, and that group draws its own block under the group name instead of the aligned list.

# PlayedAs

The tag one season row was played as: "as TAG" in small muted text, no icon and no link. It renders nothing when `played_as` is null or equals the person's `battleTag`. The team roster, the season team table and the player's Events card use it.

# VetoBoard

`VetoBoard` reads which side the viewer acts for from the board answer's `viewer_side`; it never works the side out from ids on the client. A side that is a team shows its team name when the answer sets `team_name`, and the player through `PlayerName` otherwise. See [the backend contract](backend-contract.md).

# The rest

The controls are the shadcn/ui kit in `next/src/components/ui/`; a page composes them and adds no control of its own. A `Combobox` or a `Select` under a `Field` takes its accessible name from the field label. `RowActions` folds three or more row buttons into a menu; the menu takes the width of its own items, not the width of the icon button it hangs on, so an item never wraps. `ColumnNote` is a column title with a help note. `StatusAlert` shows a load or save message with a retry. `EventHeader` and `PlayerHeader` top the event and player pages. `FixtureSeries` draws the ordered series of a fixture. `StageView` and `SeriesBox` draw a stage of any format and one series. `VetoBoard` draws the veto and embeds in the Report Result dialog. `DivisionBracketing` draws the MMR bands of the divisions.
