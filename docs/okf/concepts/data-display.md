---
type: Domain Concept
title: Data display
description: How the app picks a figure, a mark or a chart for league data, gives each colour one job, shows a player with many races, and moves figures instead of rows.
resource: ../../../DESIGN.md
tags: [design, components]
generated: { by: claude-code/claude-fable-5-1, at: 2026-09-20T13:00:00Z }
sources:
  - id: design
    resource: ../../../DESIGN.md
    title: The data display section, the chart rules and the measured colour values
  - id: figures
    resource: ../../../next/src/helpers/figures.mjs
    title: The one helper that writes a record
  - id: strip
    resource: ../../../next/src/components/RoundStrip.tsx
    title: One square per round, one keyboard stop
  - id: chips
    resource: ../../../next/src/components/RaceMmrChips.tsx
    title: One MMR chip per ladder race
  - id: stats
    resource: ../../../next/src/helpers/w3c-stats.js
    title: Reads the ladder rows per race
  - id: plots
    resource: ../../../next/src/components/ladder/LadderPlots.tsx
    title: The day bars and the MMR line, each in its own plot
  - id: cards
    resource: ../../../next/src/components/player/RoundCards.tsx
    title: A result as the score from the reader's side
  - id: palette
    resource: ../../../next/src/helpers/palette.mjs
    title: The result, race, tier and heat tokens
---

- The form follows the question the reader of a page has. A record figure says how a player or a team did. One square per round says how each round went. One linear MMR scale says who fits against whom. A line on a date scale says how a rating moves. A heat map in one hue says when games are played. When one figure answers the question, the page prints the figure and draws no chart. `DESIGN.md` lists each question with the piece that draws it, and a page reuses that piece.
- A figure stands beside the word for what it counts. A series is a best of three and a game is one game, so a record reads "Series record" or "Games record" and never a bare pair of numbers. The Gym Newbie League is named in full or as GNL, never as "the league", because a league is the general term.
- A record reads wins, a spaced en dash, losses, with the percent from ten played up. `record` in `next/src/helpers/figures.mjs` writes every record. A series is a best of three and a ladder game is one game, and a title, a caption and a tooltip name the one they count. A figure also names its scope: this event, every event, or one W3Champions season.
- Each colour has one job. `win`, `loss` and `draw` mark a result. A `race-*` colour is a stripe beside the race icon, and a `tier-*` colour is a labelled chip. The `heat-*` ramp shows an amount in one hue. A status colour means a state of the app and is never a chart series. `primary` is a control colour and never a data mark.
- The colour sets are measured, not judged by eye. A palette validator reports how far apart two colours stand for full colour vision and for a colour-blind reader. `win` with `loss` passes in both themes, and so do the four race colours as a set. A race colour and a result colour never share one set of marks, because that set fails. The six tier colours fail as bare marks, which is why a tier always carries its label. `DESIGN.md` holds the measured values and the command.
- Colour never carries a result alone. Text wears a text token, with two exceptions where the figure is the mark. A result seen from one side puts that side's score first and draws the score itself in `win`, `loss` or `draw`, so the order of the score is the second channel. A wins count and a losses count may wear `win` and `loss` in a column of their own or inside a record, where the column title or the order carries the meaning too. A result wears no alert icon and no "You won" or "You lost". An alert icon is for a fault or a call to action.
- A player has many races, and a race is never a fixed property of a player: it belongs to a ladder season, to the signup of one event, or to one series. The backend sends one ladder summary per player, `race_mmrs`: one entry per race over the live window, the current and the previous W3Champions season, with the MMR and the games, window races first by MMR; the single player read adds a race with no window row from its newest older row, flagged `stale`. `main_race` names the race with the top window MMR and ten or more window games. `RaceMmrChips` draws one chip per race with ladder games in that order, and a stale chip carries its season tag, such as "S22". The player line reads the MMR of the signup race alone, and a surface with no race prints no MMR. The profile race is a fallback only. The rule for when a race icon may show is in [a race icon needs a race for the row](../pitfalls/race-icon-context.md).
- A win rate gets no bar. The record carries the percent, and a bar is for an amount against a maximum. The maintainers decided this on 20 September 2026, because a bar beside a record repeats the percent and invites a comparison between records of very different sizes.
- A plot has one y-axis, draws its grid lines and tick labels at low emphasis, and takes its size in real pixels from its container. Text never wears a series colour. A legend holds only the marks that have no hover of their own. A value a hover shows is also open to a tap and to the keyboard: `RoundStrip` is one keyboard stop, and the arrow keys walk its marks.
- A rule that the data breaks warns and never blocks, and the warning names the figure. Urgency is information, never button weight: the order of a list and one chip carry it.
- A read that failed is not an empty list: an error draws an alert, and the empty sentence shows only after a read that worked. A tap on a mark opens its tooltip and never follows the link of its row. A card of players is as synced as its least synced player.
- A screen reads one aggregated answer, and detail loads on demand. The server sends each figure. The browser may sum figures, and it never computes a rule such as the points of a series.

The measured colour values, the table of questions and pieces, and the places where the app still breaks these rules are in `DESIGN.md`. The colours themselves are in [Theme](theme.md). Every piece that shows data, with when to use it, is in [Data pieces](data-pieces.md), and the pieces that carry behaviour are in [Shared components](shared-components.md).
