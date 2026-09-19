---
type: Domain Concept
title: Shared components
description: The pieces every page reuses, with the rules that decide when a player or team name links, opens a panel or is plain text, when a race icon may show, where the standings sit in a stage, and how the veto board knows its side.
resource: ../../../DESIGN.md
tags: [components, design]
generated: { by: claude-code/claude-fable-5-1, at: 2026-09-19T18:00:00Z }
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
---

`DESIGN.md` lists the shared components with what each shows. This file adds the rules that took a decision to settle.

# PlayerName

A player is drawn as `{flag} {name} {race} {mmr}` everywhere, the Discord cards included, and the name links to the player page. That is the one standard; no page draws a name its own way. See [the decision](../decisions/player-name-standard.md).

- By default `PlayerName` is a `Link` to the player page.
- On a drafting page, where the page holds unsaved work, the page wraps its body in `PanelLinksContext.Provider` with the value `true` (`next/src/hooks/player-panel.ts`). Under it the name opens the side panel instead and shows a dock icon in the primary colour with the title "Opens in a side panel". The providers today: the season team assign page, the match page's series draft, and the panel itself. No other page opens the panel. See [the decision](../decisions/player-panel-drafting-only.md).
- Inside a form dialog on any other page, pass `plain`, because a link would drop the typed input: the veto board in report mode, the fantasy bet dialog, the add-players dialog.

# TeamName

A team is drawn as `{logo} {name}` everywhere, and it links to the team page. No view draws a team name by hand. The name is the team's long name, and its short tag when it carries no long name.

- The logo is the team's `icon_url`, at one fixed size on every surface, so names in a column line up. A payload that names a team without a logo and without an id reads a muted shield outline of that same size instead, and asks the backend for nothing.
- `seasonKey` picks the season team page, the path the team cards and the ladder already use; without one the link is the plain team page.
- Pass `plain` for text only: inside another link or a button, inside a form dialog that holds unsaved work, and in the `h1` of the team's own page. A select option stays a plain option.
- Some payloads carry a team as a name alone: the veto board's sides, a player's event history, the fantasy score breakdown and the ladder rows. There the team reads without a link, because the payload names no team to link to.

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

# VetoBoard

`VetoBoard` reads which side the viewer acts for from the board answer's `viewer_side`; it never works the side out from ids on the client. A side that is a team shows its team name when the answer sets `team_name`, and the player through `PlayerName` otherwise. See [the backend contract](backend-contract.md).

# The rest

The controls are the shadcn/ui kit in `next/src/components/ui/`; a page composes them and adds no control of its own. A `Combobox` or a `Select` under a `Field` takes its accessible name from the field label. `RowActions` folds three or more row buttons into a menu. `ColumnNote` is a column title with a help note. `StatusAlert` shows a load or save message with a retry. `EventHeader` and `PlayerHeader` top the event and player pages. `TeamRoster` draws captains and members of one team in one event. `FixtureSeries` draws the ordered series of a fixture. `StageView` and `SeriesBox` draw a stage of any format and one series. `VetoBoard` draws the veto and embeds in the Report Result dialog. `DivisionBracketing` draws the MMR bands of the divisions.
