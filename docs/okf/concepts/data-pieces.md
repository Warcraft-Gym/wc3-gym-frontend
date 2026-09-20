---
type: Domain Concept
title: Data pieces
description: Every shared piece that shows league data, by group, with where it lives, when to use it and which piece to use instead.
resource: ../../../DESIGN.md
tags: [design, components]
generated: { by: claude-code/claude-fable-5-1, at: 2026-09-20T13:00:00Z }
sources:
  - id: design
    resource: ../../../DESIGN.md
    title: The rules each piece follows
  - id: components
    resource: ../../../next/src/components/PlayerName.tsx
    title: The player line, the most used data piece
  - id: figures
    resource: ../../../next/src/helpers/figures.mjs
    title: The record helper
---

This is the list of the pieces that turn league data into something a reader reads: 103 pieces in eleven groups. Look here before you draw a figure, a mark, a table or a chart, and reuse the piece that fits. The rules behind the choices are in [Data display](data-display.md). The pieces that also carry behaviour, such as when a name links, are in [Shared components](shared-components.md).

A row names the piece, the file that holds it, the reader question it answers, and the nearby case where another piece is right.

# Figures and formats

| Piece | Where it lives | Use it when | Do not use it when |
|---|---|---|---|
| Record figure | `next/src/helpers/figures.mjs` | The reader asks how a player or a team did over many series or games. | The pair is a points pair; a points pair prints its zeroes and takes no percent, so the surface writes it (see "points pair" below). |
| Points pair | Inline in the views | The two numbers are points, not a record. | The pair is wins and losses; then `record` owns it. |
| `tnum` tabular figures | `next/src/app/globals.css` | A number sits in a column or beside another number. | The number is inside a paragraph of prose. |
| MMR number, read by `getW3CMMR` | `next/src/helpers/w3c-stats.js` | The row names a race. | The row has no race; then print nothing, not a dash. |
| MMR season label and synced time | `next/src/helpers/w3c-stats.js` | The figure is W3Champions data. | The figure comes from the app's own series. |
| Signed game difference | `next/src/components/StageView.tsx` | A standings table ranks on game difference. | A free for all lobby stage; a lobby counts no games and the column is dropped. |
| Win rate percent | `next/src/helpers/ladder-days.mjs` | The page already prints the record and wants one share. | `record` can carry the percent itself. |
| Stat tile | `next/src/app/(app)/report/SeasonReportView.tsx` | One number answers the page's question. | The reader needs to compare many values; then a table or a chart. |
| `SharedHours` | `next/src/app/(app)/match/[id]/RoundDraftBoard.tsx` | The reader pairs two players who must find a time. | The series is already booked. |
| Draft-series MMR badges | `next/src/app/(app)/match/[id]/SeriesTables.tsx` | A draft table compares ratings. | A plain right-aligned number will do; `SeasonTeamAssignView` prints the same figure as text. |
| Ladder stat tiles | `next/src/components/ladder/PlayerLadderTab.tsx` | The reader opens one player's ladder season. | The surface compares two players; then `MatchupCompare`. |
| `CareerStatsDialog` | `next/src/components/CareerStatsDialog.tsx` | The reader asks what a player has done overall. | The figure belongs to one event. |

# Identity lines

| Piece | Where it lives | Use it when | Do not use it when |
|---|---|---|---|
| `PlayerName` | `next/src/components/PlayerName.tsx` | Any surface names a player. | The surface is a sorted roster with aligned tracks; `TeamRoster` draws its own aligned line there. |
| `TeamName` | `next/src/components/TeamName.tsx` | Any surface names a team. | The card or row already links as a whole, or the name is the `h1` of the team's own page; then pass `plain`. |
| `RaceIcon` | `next/src/components/RaceIcon.tsx` | The row has a race: this game, this scheduled series, this signup. | The row has no race source. A profile race is not a race for a row. |
| `FlagIcon` | `next/src/components/FlagIcon.tsx` | A player line names a country. | The surface already draws `PlayerName`, which draws the flag itself. |
| `W3CIcon` | `next/src/components/W3CIcon.tsx` | The figure is ladder data. | The figure is a GNL or event series figure. |
| `W3CMmr` | `next/src/components/W3CMmr.tsx` | A column or a line names a ladder MMR. | The number is a series rating passed in by the row; the row already names its race. |
| `RaceMmrChips` | `next/src/components/RaceMmrChips.tsx` | The reader asks which MMR a player holds. | The surface needs one number for one race; then the `PlayerName` line reads it. |
| `TeamRoster` aligned player line | `next/src/components/TeamRoster.tsx` | The surface lists one team's roster for one event. | The player line stands free in a sentence or a cell; then `PlayerName`. |
| `FacedRaces` and `SyncedLine` | `next/src/app/(app)/match/[id]/match-cells.tsx` | The reader picks an opponent. | The row has no season history. |

# Result marks

| Piece | Where it lives | Use it when | Do not use it when |
|---|---|---|---|
| `RoundStrip` | `next/src/components/RoundStrip.tsx` | The reader asks how each round went. | The reader asks how the whole event went; then the record figure alone. |
| `SeriesBox` side mark | `next/src/components/SeriesBox.tsx` | The surface draws one series of a stage or a fixture. | The surface is a phone list of scheduled series; then `SeriesCard`. |
| Stage legend | `next/src/components/StageView.tsx` | A mark carries no hover of its own. | Every mark already names itself on hover; the design rules say such a mark needs no legend row. |
| Round card score badge | `next/src/components/player/RoundCards.tsx` | The reader is one side of the series. | The surface is neutral between the two sides; then `SeriesBox`. |
| Head to head record bar | `next/src/components/player/HeadToHead.tsx` | The reader compares many opponents down one column of the head to head table. | Anywhere new. A win rate gets no bar, and the record carries the percent. |
| `RateBar` | `next/src/app/(app)/report/SeasonReportView.tsx` | An amount stands against a maximum, such as points against the top race. | The figure is a win rate. The record carries the percent, and a win rate gets no bar. |
| Achievement badge row | `next/src/components/AchievementChip.tsx` | A row lists what a player earned. | The page compares how rare each badge is; then `BadgeRarity`. |
| `TrophyIcon` and `PlayerTrophies` | `next/src/components/player/TrophyIcon.tsx` | A player page shows career wins. | The surface names a place in one event; then the place chip from `awards.mjs`. |
| Place chip and medal | `next/src/helpers/awards.mjs` | An event is finished. | The event is still running; then the state chip. |
| Report rank medal | `next/src/app/(app)/report/SeasonReportView.tsx` | A printed table ranks teams or players. | The table is not a final ranking. |
| Match banner score | `next/src/app/(app)/match/[id]/MatchBanner.tsx` | The page is about one fixture. | The surface lists many fixtures; then the match score card of `/seasons/[id]`. |
| `scoreBadge` | `next/src/app/(app)/match/[id]/SeriesTables.tsx` | A table lists many series. | The surface shows one side at a time, as `SeriesCard` does on a phone; the comparison then vanishes. |
| Season match score card | `next/src/app/(app)/seasons/[id]/SeasonDetailsView.tsx` | The reader scans a round of fixtures. | The page is about one fixture; then the match banner. |

# Scales and charts

| Piece | Where it lives | Use it when | Do not use it when |
|---|---|---|---|
| `LadderPlots` | `next/src/components/ladder/LadderPlots.tsx` | The reader asks how a rating moves. | The row has room for one small bar strip only; then `LadderDayBars`. |
| `LadderDayBars` | `next/src/components/ladder/LadderDayBars.tsx` | The reader compares day-by-day volume across rows of a table. | The row is the page's subject; then `LadderPlots`. |
| `DivisionBracketing` | `next/src/components/DivisionBracketing.tsx` | The reader asks who fits against whom by MMR. | The bands are categories, not amounts; the `heat-*` ramp says amount. |
| Season report heat map | `next/src/app/(app)/report/SeasonReportView.tsx` | The reader asks when games are played. | The question is how many were played over time; then the day bars. |
| Season report games-per-day bars | `next/src/app/(app)/report/SeasonReportView.tsx` | The reader asks how much was played over the season. | The window is a player's own; then `LadderPlots`. |
| `BadgeRarity` share bar | `next/src/components/ladder/BadgeRarity.tsx` | The reader asks which badges are rare. | The reader asks what one player earned; then `AchievementChip`. |
| Bracket feeder lines | `next/src/components/StageView.tsx` | A single or double elimination stage is drawn on a wide screen. | The screen is narrow; the stage then stacks into one list per round. |
| Round draft board MMR scale | `next/src/app/(app)/match/[id]/RoundDraftBoard.tsx` | A captain pairs two rosters by MMR. | The bands are divisions; then `DivisionBracketing`. |
| `PlayerLadderPanel` per-race bar pair | `next/src/components/ladder/PlayerLadderPanel.tsx` | A row expands into one player's ladder detail. | The page is the player's own; then `PlayerLadderTab`. |
| `LadderLeaderboards` | `next/src/components/ladder/LadderLeaderboards.tsx` | The reader asks who leads. | The reader needs every player; then the ladder table. |

# Tables and lists

| Piece | Where it lives | Use it when | Do not use it when |
|---|---|---|---|
| `ui/DataTable` | `next/src/components/ui/DataTable.tsx` | The list is flat. | The rows fall into groups whose numbers add up; then `GroupedTable`. |
| `GroupedTable` | `next/src/components/GroupedTable.tsx` | The rows group and the numbers sum. | The list is flat; then `DataTable`. |
| Stage standings table | `next/src/components/StageView.tsx` | The stage is a round robin, a Swiss or a free for all. | The format is an elimination bracket; there the table is pushed under the draw with CSS `order`. |
| Head to head table | `next/src/components/player/HeadToHead.tsx` | The reader asks how a player stands against everyone. | The question is one pairing; then `HeadToHeadCell`. |
| `HeadToHeadCell` | `next/src/components/HeadToHeadCell.tsx` | Two players are paired and the reader asks how they stand. | The page lists every opponent; then the head to head table. |
| `VsRaces` | `next/src/components/VsRaces.tsx` | The reader asks how a player does against each race. | The figure is a series record; this one counts ladder games. |
| `SeriesCard` | `next/src/components/SeriesCard.tsx` | A table of series would clip on a phone. | The surface is a stage drawing; then `SeriesBox`. |
| `FixtureSeries` | `next/src/components/FixtureSeries.tsx` | The reader is inside one fixture. | A GNL season draws its own fixture pages. |
| `MatchRoundNav` | `next/src/app/(app)/match/[id]/MatchRoundNav.tsx` | A page must move between rounds. | The event is not a GNL season. |
| `TeamRostersPanel` roster table | `next/src/app/(app)/match/[id]/TeamRostersPanel.tsx` | A captain proposes a series. | The roster is the team page's own; then `TeamRoster`. |
| Draft-players table | `next/src/app/(app)/seasons/[id]/assign/SeasonTeamAssignView.tsx` | An admin drafts a season. | The list is public. |
| Team rounds table | `next/src/app/(app)/team/[id]/TeamView.tsx` | The reader asks how a team's season went. | The reader asks about one round's series; then the rounds page. |
| W3C ladder team table | `next/src/app/(app)/team/[id]/season/[season_id]/SeasonTeamDetailsView.tsx` | The reader compares a team's ladder work. | The figure is a series record; this table counts ladder games. |
| Per-race record table | `next/src/components/ladder/PlayerLadderTab.tsx` | The reader asks how a player does against each race on the ladder. | The figure is a series record; then `VsRaces` names the ladder in its head. |
| `MatchupCompare` | `next/src/components/ladder/MatchupCompare.tsx` | A bettor weighs two players. | The page shows one player. |
| Ladder team standings table | `next/src/app/(app)/ladder/LadderView.tsx` | The reader compares teams on the ladder. | The figure is a GNL series figure. |
| Ladder players table | `next/src/app/(app)/ladder/LadderView.tsx` | The reader scans the whole ladder. | One player is the subject. |
| `FantasyScoreBreakdown` | `next/src/components/fantasy/FantasyScoreBreakdown.tsx` | The reader asks why a fantasy team scored what it scored. | The reader only needs the totals; the leaderboard row holds them. |
| Fantasy draft table | `next/src/app/(app)/fantasy-registration/FantasyDashboardView.tsx` | A captain drafts a fantasy team. | The team is already drafted. |
| Random stats page | `next/src/app/(app)/random-stats/RandomStatsView.tsx` | The reader asks how Random performs. | The question is about one player. |

# Tiles, chips and badges

| Piece | Where it lives | Use it when | Do not use it when |
|---|---|---|---|
| Tonal chip | `next/src/components/ui/tone.ts` | One short fact rides beside a name or a title. | The fact is a chart series; the design rules forbid a status colour there. |
| Event state chip | `next/src/helpers/event-labels.mjs` | The reader asks where an event stands. | The event is finished and the row names a place; then the place chip. |
| Check-in status chip | `next/src/helpers/check-in.mjs` | The surface asks or reports a check-in. | The round already has a series; the series replaces the question. |
| Entrant state chip and eligibility warning | `next/src/app/(app)/events/[id]/entrants/EntrantsView.tsx` | The admin reads the field of an event. | The surface is public; the public event page shows the entrant list without warnings. |
| Division dot | `next/src/app/(app)/events/[id]/entrants/EntrantsView.tsx` | The divisions are bands of MMR, ascending. | The groups are categories; then a label and no ramp. |
| Fantasy tier chip | `next/src/helpers/tiers.mjs` | The surface names a fantasy tier. | The mark would stand with no label. |
| `CastChips` | `next/src/components/CastChips.tsx` | A series carries a cast. | The surface has no room; the chips wrap. |
| `BetIcon` | `next/src/components/fantasy/BetIcon.tsx` | A row marks a bet. | The row needs the bet's points; those are a separate figure. |
| Teams table season chips | `next/src/app/(app)/teams/TeamsView.tsx` | The reader scans every team. | The page is one team. |
| Fantasy leaderboard rank badge and points columns | `next/src/app/(app)/fantasy/FantasyLeaderboardView.tsx` | The reader asks who leads the fantasy league. | The reader asks where the points came from; then the breakdown. |
| Fantasy bet result chip | `next/src/app/(app)/fantasy/bets/FantasyBetsView.tsx` | A bets table names an outcome. | The figure is a series score. |

# Status, warnings and notes

| Piece | Where it lives | Use it when | Do not use it when |
|---|---|---|---|
| `StatusAlert` | `next/src/components/StatusAlert.tsx` | A read or a write failed or succeeded. | The note is a standing fact about the data; then `Note`. |
| `Note` | `next/src/components/ui/Note.tsx` | The note is part of the page, not a result of an action. | The message answers a read or a write; then `StatusAlert`. |
| `ColumnNote` | `next/src/components/ColumnNote.tsx` | A column title alone cannot say what it counts. | The title can say it in a short noun; the design rules say a column title has no legend in brackets. |
| Veto warning | `next/src/components/ReportResultDialog.tsx` | The data breaks a rule that must not block the write. | The rule must block; nothing here does. |
| Games-rule mark | `next/src/helpers/games-rule.mjs` | The surface pairs players and a games floor matters. | The surface pairs nobody; the design rules say the icon is noise there. |
| `PairingNote` | `next/src/app/(app)/match/[id]/SeriesTables.tsx` | A draft table must say what changed. | The surface is public; drafts are not published. |
| `PlayerCues` sync icon | `next/src/app/(app)/seasons/[id]/assign/SeasonTeamAssignView.tsx` | A long sync runs over a list. | The page syncs one row; then the row action's own state. |
| Seasons table overdue warning | `next/src/app/(app)/seasons/SeasonsView.tsx` | An admin scans every season. | The page is one season. |

# Time and dates

| Piece | Where it lives | Use it when | Do not use it when |
|---|---|---|---|
| `formatDateTime` | `next/src/helpers/datetime.js` | The surface prints one series time. | The reader needs the other side's zone too; then `zoneLabel`. |
| `zoneLabel` and `gmt` | `next/src/helpers/timezone.mjs` | Two sides must agree on a time. | Only one side reads the page. |
| Round end line and round window | `next/src/helpers/rounds.mjs` | The round closes at midnight in a zone the reader may not be in. | The round is already over. |
| Date tile | `next/src/app/(app)/HomeView.tsx` | A card leads with a date. | The event runs over many days; the card then prints the range too. |
| Relative synced time | `next/src/helpers/w3c-stats.js` | The figure beside it is W3Champions data. | The figure is the app's own. |

# Tooltips, legends and help

| Piece | Where it lives | Use it when | Do not use it when |
|---|---|---|---|
| `TapTooltip` | `next/src/components/ui/TapTooltip.tsx` | A value shows on hover. | The value repeats text that is already on the page. |
| Raw `title` attribute | Inline in the views | The value is a repeat of text already on the page. | The value exists nowhere else; then a `TapTooltip` at least, and a focusable trigger at best. |
| Schedule legend | `next/src/components/player/ScheduleDialog.tsx` | The grid's fills carry meaning a cell label cannot. | Each mark names itself on hover. |

# Loading and empty states

| Piece | Where it lives | Use it when | Do not use it when |
|---|---|---|---|
| `Progress value={null}` | `next/src/components/ui/progress.tsx` | A whole surface is on its way. | The shape of the answer is known; then a skeleton. |
| `Skeleton` | `next/src/components/ui/skeleton.tsx` | The page knows how many cards it will show. | The count is unknown. |
| Full-screen spinner | `next/src/app/(app)/report/SeasonReportView.tsx` | Nothing on the page can be drawn yet. | Part of the page is already readable. |
| Empty states | Inline in the views | The read succeeded and answered nothing. | The read failed; then `StatusAlert`. |

# Domain drawings

| Piece | Where it lives | Use it when | Do not use it when |
|---|---|---|---|
| `StageView` | `next/src/components/StageView.tsx` | An event page draws a draw. | The event is a GNL season, which draws its fixtures on its own pages. |
| `VetoBoard` | `next/src/components/VetoBoard.tsx` | The series plays a veto. | The series rules draw no map from the board; the step is then left out. |
| `ScheduleDialog` half-hour grid | `next/src/components/player/ScheduleDialog.tsx` | The reader asks when two players can meet. | The surface only needs the booked time; then `formatDateTime`. |
| `SeriesActionBar` | `next/src/components/SeriesActionBar.tsx` | The reader may act on a series. | The reader may not act; the bar then draws the facts alone. |
| `EventHeader` | `next/src/components/EventHeader.tsx` | The page is about one event. | The page is about one team in one event; that page keeps a plain `h1` with the label under it. |
| `PlayerHeader` | `next/src/components/player/PlayerHeader.tsx` | The page is about one player. | The player is one row among many. |
| `SyncProgress` | `next/src/components/SyncProgress.tsx` | A long read runs and the page knows its total. | The total is unknown. |
| `StatusChip` and the round by player matrix | `next/src/app/(app)/team/[id]/season/[season_id]/rounds/TeamRoundsView.tsx` | A captain reads a whole season's check-ins at once. | One round is the subject; then the long chip. |
