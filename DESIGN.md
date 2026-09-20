# Design Rules

The app uses one look, stone and bronze, in a light and a dark theme. This file lists the colours, the type and the rules that keep every page in that look. If a value here differs from the code, the code is correct and this file needs a fix.

## Where the look lives

| File | What it holds |
|---|---|
| `next/src/helpers/palette.mjs` | Every theme colour, light and dark. The only place a colour value is written. |
| `next/src/helpers/palette.test.mjs` | Checks on the palette. `pnpm test` runs them. |
| `next/src/app/globals.css` | The Tailwind theme, the fonts per element and the few rules a utility class cannot express. |
| `next/src/app/palette-style.ts` | Writes the palette as `--v-theme-*` custom properties, light and dark. |
| `next/src/hooks/theme.ts` | Picks light, dark or the system setting. |
| `next/src/helpers/tiers.mjs` | Fantasy tier names and their colour tokens. |
| `next/src/helpers/ladder-days.mjs` | `WIN` and `LOSS` as CSS values for SVG charts. |

## Rules

- Use a theme token for every colour: `class="bg-primary"`, `class="text-win"`, `rgb(var(--v-theme-loss))`. Never write a hex value or a Tailwind palette name such as `red-500` in a view. Two exceptions are allowed: the Discord brand colours on the Discord buttons (`LoginView.tsx`, `DiscordJoinCard.tsx`), and the trophy artwork in `TrophyIcon.tsx`.
- Text wears a text token. A result, a tier or a race gets a small coloured mark beside the text, not coloured text.
- Colour never carries meaning alone. Pair it with an icon, a label or a position.
- A fill that carries text names its own ink as `on-<fill>`. The test checks that every such pair passes 4.5:1 (WCAG AA).
- Dark is its own set of values, not an inverted light theme. A new token gets a light and a dark value.

## Colours

Ink means `#1A241E`. White means `#FBF7F1`.

### Page and surface colours

| Token | Light | Dark | Use |
|---|---|---|---|
| `background` | `#E8E9E3` | `#191A16` | The page. |
| `surface` | `#F4F5F1` | `#232420` | Cards, tables, dialogs. |
| `surface-bright` | `#FAFBF8` | `#2F302C` | A raised surface. |
| `surface-light` | `#E1E4DD` | `#2D2E2A` | One tab bar, a banned veto tile, a progress-bar track, an empty heat-map cell. |
| `surface-variant` / `on-surface-variant` | `#1C2420` / `#F2F4ED` | `#D5DBD1` / ink | The inverted surface, for example a tooltip. |
| `on-surface`, `on-background` | ink | `#E7EBE3` | Body text. |
| `band` / `on-band` | `#1C2420` / `#F2F4ED` | `#11110E` / `#F2F4ED` | The dark strip on the match, maps and veto pages, and behind a map thumbnail. |
| `hero` / `on-hero` | `#1C2420` / `#F2F4ED` | `#332A1B` / `#F2F4ED` | The top block of the season report page. |
| `band-muted` | `#B9C4B6` | `#B9C4B6` | Second-level text on the hero. |
| `tag` / `on-tag` | `#DCE1D8` / `#3F4C43` | `#333430` / `#C3CCC1` | A quiet label on the fantasy tiers page. |

### Brand

| Token | Light | Dark | Use |
|---|---|---|---|
| `primary` / `on-primary` | `#9A5B18` / white | `#D08B3C` / `#1A140C` | Bronze. Main buttons, card title bars, the sorted column. |
| `primary-darken-1` | `#7C4912` | `#B57430` | The pressed state. |
| `primary-text` | `#7C4912` | `#E3A45F` | Bronze text and links. `primary` is under 4.5:1 as text on `surface-light`. |
| `secondary` / `on-secondary` | `#3F4C43` / `#F2F4ED` | `#C3CCC1` / ink | Stone. Second-level chips and buttons. |
| `secondary-darken-1` | `#2E3931` | `#A7B1A4` | The pressed state. |

### Status

Status colours mean a state of the app. Never use one as a chart series.

| Token | Light | Dark | Use |
|---|---|---|---|
| `error` | `#8C3B2A` | `#FFB4AB` | A failed action, a delete, the sit-out button. Kept apart from `loss` in dark. |
| `warning` | `#A65200` | `#F0A04B` | A warning. Orange, never amber, because amber text does not read. |
| `info` | `#2F6690` | `#7FB0DA` | A note, the "In progress" chip. |
| `success` | `#2A6B36` | `#5FA870` | A saved action, the "Check in" button. |

In dark, `on-error`, `on-info`, `on-success` and `on-warning` are ink.

### Results

| Token | Light | Dark | Use |
|---|---|---|---|
| `win` | `#1F63A6` | `#4F95D8` | A won game, series or bar. Win-rate bars use `win` only. |
| `loss` | `#B8432C` | `#DE6E52` | A lost game, series or bar. |
| `draw` | `#5F6B61` | `#9DA89E` | A draw, no result, the Random race, a neutral bar. |

Win is blue, not green. Green and red cannot be told apart by a reader with red-green colour blindness. In dark, `on-win`, `on-loss` and `on-draw` are ink.

### Fantasy tiers

`tiers.mjs` names the tiers from the lowest up. A tier chip is filled with its tier colour and shows its name in the tier's `on-tier-*` ink.

| Token | Name | Light | Ink on it | Dark | Ink on it |
|---|---|---|---|---|---|
| `tier-1` | Grass | `#4E9A2E` | ink | `#58A833` | ink |
| `tier-2` | Bronze | `#94481A` | white | `#B0561F` | white |
| `tier-3` | Silver | `#4770BB` | white | `#6F92DA` | ink |
| `tier-4` | Gold | `#B3800E` | ink | `#BE8A00` | ink |
| `tier-5` | Platinum | `#1997A2` | ink | `#16A3A6` | ink |
| `tier-6` | Diamond | `#8B48CF` | white | `#A574E6` | ink |

### Races, medals and the heat map

These tokens are used on the season report only. The Random race uses `draw`.

| Token | Light | Dark |
|---|---|---|
| `race-hu` | `#1689A6` | `#02809C` |
| `race-oc` | `#D06D69` | `#BA4C4B` |
| `race-ne` | `#086A12` | `#44AB46` |
| `race-ud` | `#7546BA` | `#9B6FE4` |
| `medal-gold` | `#8F6B00` | `#E0B84A` |
| `medal-silver` | `#6E7881` | `#B9C2C8` |
| `heat-1` to `heat-5` | `#D0A076` `#BA8351` `#A3682E` `#865017` `#683C0B` | `#784D25` `#9C642F` `#C37D39` `#E29A57` `#FABC86` |

Third place uses `primary` as its medal. The rank number sits beside each medal, so the rank does not depend on the colour. The heat map runs from light to dark bronze in light mode and from dark to light in dark mode. A cell with no games uses `surface-light`, and the legend shows that swatch.

### Borders and faded text

| Variable | Light | Dark |
|---|---|---|
| `border-color` at `border-opacity` | `#1A241E` at 0.2 | `#E7EBE3` at 0.12 |
| `medium-emphasis-opacity` | 0.78 | 0.7 |

Light uses 0.78 because 0.7 put field labels under 4.5:1 on the light surface.

## Type

| Face | Weights | Use |
|---|---|---|
| Alegreya (serif) | 700, 800 | `h1` to `h6`, `.v-card-title`, `.text-h1` to `.text-h6`. `h1`, `.text-h1` to `.text-h3` use 800. |
| Alegreya Sans | 400, 500, 700 | Body text, controls, buttons, captions. |

`@fontsource` serves both faces from the app's own bundle. Every number uses lining, equal-width digits (`tabular-nums`), so figures line up in a column.

A large number on a card, for example the admin counts on Home, uses Alegreya Sans 500 at the `.text-h2` size. The heading serif at 800 looks playful at that size.

Below 960 px, `h1` is 1.6rem and `h2` is 1.3rem.

## Words on the page

- Page titles (`h1`) and app bar and menu entries use Title Case: "Fantasy Bets", "Team Details".
- Everything else uses sentence case: dialog titles, buttons, field labels, hints, table columns, alerts, chips, card titles.
- Buttons show their label as written, in sentence case.
- A column title is a short noun. It has no legend in brackets. On a wide screen it stays on one line.
- Right-align numeric columns, the title and the cells.
- No table shows a database id. A row is named by its name; the id stays in the link.
- A hint is one short instruction, or nothing. It never explains how the code works.
- A table that would clip on a phone hides its columns by priority or becomes cards. A clipped row is a bug.
- The app bar title reads "WC3 Gym Dashboard" and always links to `/`.
- A round is answered with two buttons, "Check in" and "Sit out". The status reads "Checked in", "Out", "Out (blocked times)" or "No answer". Never "can play" or "can't play".
- A record reads "19 – 11 (63%)", wins then losses. The percent shows from ten games up; under ten the record stands alone, "3 – 1". `record` in `next/src/helpers/figures.mjs` writes it. No bar in a cell, no footnote, and no "won" in a cell, because the column title carries it.
- A head to head reads as the score in the pairing's order with the last meeting after it: "2 – 1, last met Season 18".
- The app shows no win chance for an MMR or for an MMR difference over the whole population. A figure counted from one player's own games is fine.

## Shared components

Use these instead of drawing the same thing again.

| Component | What it shows |
|---|---|
| `PlayerName` | A player as flag, name, race icon and MMR. It reads the MMR itself; pass `mmr={false}` where a column of its own sorts by MMR, a number where the surface already holds one, and `games={w3cSeason}` on a draft surface for the games mark. It links to the player page. On a drafting page and inside the side panel, it opens the panel instead and shows a dock icon. Inside a form dialog, pass `plain`. |
| `TeamName` | A team as its logo and its name, linked to its team page. On a drafting page it is plain text; pass `plain` inside another link, a button or the team's own heading. |
| `RaceIcon`, `FlagIcon` | One race or one country. Show a race only when the row has one: this game, a scheduled series, or a KOTH signup. A player's profile race is not a race for a row. |
| `GroupedTable` | Groups of rows, each under one header row that opens and closes. Detail rows share the group's columns, so they add up under its total. Never put a table inside a table cell. |
| `RowActions` | The buttons at the end of a row. Three or more fold into a menu. |
| `ColumnNote` | A column title with a help note. |
| `StatusAlert` | A load or save message. It offers a retry when the page can load again. |
| `EventHeader`, `PlayerHeader` | The top of an event page and of a player page. |
| `TeamRoster` | The captains and the members of one team in one event, as one card and one aligned list. A page that edits the roster fills its slots, and a GNL page passes the two empty lines that say season. |
| `RoundStrip` | One player's event as one square per round, with the text record beside it. |
| `FixtureSeries` | The ordered series one fixture holds, each with its mode, its pick rule and its two sides. |
| `SeriesActionBar` | The steps of one series as buttons, full or compact. A step already taken reads as a quiet fact before the buttons. |

- The player line is flag, name, race icon, MMR, with one 6 px gap between every part, and the MMR reads at every width. A captain shows his race and his MMR only when he plays in that event. This plain line is the default on every surface.
- The MMR is the W3C ladder MMR of the race the player signed up on, read by the line itself from the `w3c_stats` the payload already carries, so no surface asks for a number of its own. A series row is the exception: the series reads name `player1_mmr` and `player2_mmr`, the rating on the race the row plays, and the surface passes that number in, because the row's player carries no stats. A player with no stats in the payload, and a row that names no rating, end the line after the race icon: no dash, no placeholder. A table that sorts by MMR keeps its column and passes `mmr={false}`, so the number never reads twice in one row; a ladder table keeps its own MMR and +/- columns, which come from the ladder history and are a different figure.
- A sorted roster aligns race and MMR in tracks, while a free-standing player line runs inline with one 6 px gap.
- The round strip is one 12 px square per round of the event, drawn by `RoundStrip`: `win` for a round the player won, `loss` for one he lost, a square split down the middle for a round he won one series and lost another, a dashed outline in `foreground` for a series still to play, and a quiet `border` square for a round with no series. The mark names the winner of the series only, so the strip reads the same for best of 1, 3 and 5. Its tooltip names the round and the margin, "Round 3 · Lost 0-2", then the opponent as a player line; a round with two series lists both. The text record "2 – 1" sits beside the strip in `win` and `loss`, so colour is never the only channel, and a phone drops it and keeps the strip. One strip is one keyboard stop: the group carries the name "Won 2, lost 1, played 3 of 7 rounds" and the arrow keys walk its marks. It shows on the team page roster and on the player page's Events row.
- A second version of the player line puts the games icon before the flag: a warning triangle when the player is under the event's games rule, with the count in its tooltip, and the same mark in `error` when W3C holds no stats for him. It shows only on the draft surfaces of an event that sets a games rule. A line that meets the rule keeps an empty slot of the same width and height, so the flags stay in one column and the rows keep one baseline. It is never the default, because the icon is noise on a surface that does not pair players.
- A team is drawn as its logo and its name, and the name links to the team page. A team with no logo shows a neutral placeholder of the same size, so the names in a column stay aligned. A long name truncates and carries the full name in its title.
- On a drafting page, the match page and the season assign page, and inside the player panel, a team name is plain text with no link, for the same reason the player name is there: a link would leave unsaved work.
- One shared action bar carries the steps of a series, in order, with the words "Schedule", "Veto maps" and "Report result"; the report step reads "Edit result" once the series is scored. The full bar shows all three steps where the series is the subject of the surface: the "Waiting for you" list and the series page. The compact bar shows two active steps where a series is one item among many: the next step filled and the one after it outlined. In both bars a button keeps the word of its step, and a step already taken states what it left behind as a quiet fact before the buttons: the booked time, and "Veto done". A series that needs no veto leaves that step out, and a reported series keeps its result button alone. The player a side names, a captain of the team that fields a side, a member of the roster of a side that names no player, and an admin act on it, all through the same routes; another reader sees the steps without buttons. Once the booked time has passed the result is the next step, because a missing veto warns and never blocks. Its context label reads "League - Event - Stage - Round - Opponent", and a part the series carries no value for is left out with its separator.
- The W3C data line is the W3C mark and "synced 3 days ago", with the detail in a tooltip. It reads the same way everywhere in the app.

## Events

The events module names things the same way on every page. A league is what repeats. An event is one run of it that people sign up for: a GNL season, a KOTH night, a cup. A stage is one format over the entrants. A round is a dated window of series. A fixture pairs two teams in a round and holds series. A series has one opponent per side and a best-of. A game is one map. A division is a band of entrants that runs the whole event on its own and never merges. Never "week", never "team series", never "match" for a series; "match" stays only on the GNL fixture pages until they are redrawn.

- The team page tabs one event per row of `seasons_info`, each named with `eventLabel`, and links that name to the event page beside the season team page link. Both team pages read the roster of the tab from `GET /teams/{id}/seasons/{event_id}` and draw it with `TeamRoster`: one card, the captains and the members in one aligned list, the columns flag, name, race, MMR and the round strip. The members run by MMR, highest first, a player with no MMR last, because the list carries no sort control. The column head, the MMR and the round numbers, is drawn once for the card, on the head of the first group that lists rows, and "Captains" and "Members 7" stay row group heads. The MMR head is the W3C form with the synced time in its tooltip, and a long name truncates while the MMR never does. A captain shows his race, his MMR and his strip only when he plays in that event, and reads "Not playing this season" across those columns when he does not, and he reads under Captains alone, so the members list and the member count leave his member row out.
- An event named outside its own pages carries its league: "GNL · Season 18". `eventLabel(event)` in `next/src/helpers/event-labels.mjs` prints it, and prints the name alone when the event has no league or the name already starts with the league's short name. It reads the league off `league_short_name`, or off a league row passed as a second argument, and off `season_name` for the flat trophy and head-to-head rows. A GNL season page wears the same `EventHeader` as every other event, so its `h1` is that label too, and the rounds and teams counts sit under it as small chips. The season team page keeps a plain `h1` of the team name with the same label under it.
- The event state is computed, never stored, and shows as one small tonal chip: signups open in `success`, check-in in `info`, seeded in `secondary`, running in `primary`, finished in `draw`, a draft with no colour. A GNL season answers its own four phases under `phase` instead: open in `success`, commenced in `primary`, overdue in `warning`, complete in `draw`. `STATE_LABEL` and `STATE_COLOR` in `next/src/helpers/event-labels.mjs` are the one source for both; `STATE_ITEMS`, the filter on the events list, holds the six event states alone.
- The event page lists every stage with its format, its best-of and its scheduling. Two settings count series and they never share a name: the event's `series_per_round` is "Series per fixture", which reads only on a team event, because a fixture pairs two team entrants; a stage's `series_per_entrant_per_round` is "Series each entrant plays per round", which reads only on a round robin. The stage table titles that column "Series per entrant" with the long name as its note, and every other format reads an em dash. `seriesPerFixture` and `seriesPerEntrant` in `next/src/helpers/event-labels.mjs` answer both, so the wizard, the event page and the run page print the same words. The stage format that pairs players by captain draft is named "Captain draft" wherever the app prints a format.
- The seed of a stage comes from MMR, a shuffle, a hand order, or the standings of the previous stage; the previous-stage button reads only on a stage that has one. A qualifier seeds from a parent event's field, which the model does not carry, so `SEED_SOURCES` leaves it out.
- The event page is open to everyone, and so are the events list and the league pages. It carries the one action the server picked for the caller: sign up opens the signup dialog, withdraw asks once, check in takes the entrant's own row, a caller who checked in reads a chip instead of a button, and view scrolls to the draw. A reader who is not logged in reads "Log in to sign up" in that place while the signups stand open. The signup dialog takes the race, and a battle tag only when the event takes anyone and the caller's account names no player; the eligibility warnings the API answers show as chips after the signup and never block it. A signup-only event asks for one more field, a note of at most 200 characters, hinted "What you want to work on".
- The home page is one card per event `GET /me/events` answers, of every kind, and a finished event stays off it. A KOTH league runs one night after another, so only tonight's night takes a card: the newest published night that is not finished, drawn as any other event card. A card carries the date tile, the label, the days it runs, the state chip, and the one action the server picked, as one button: a cup signs up in the signup dialog, withdraws, checks in or opens its page, and a caller who checked in reads a chip instead. A GNL season keeps its own signup form and its own links under the card, so its button is a link. The once-per-session "Upcoming events" dialog offers the same rows whose action is sign up.
- The event page lists its entrants under the stages: the name through `PlayerName` with the signup race, the seed once a stage locked its order, a withdrawn entrant in medium emphasis, and "No entrants yet" when nobody has entered. On an event that takes one entry per race, `byPlayer` in `next/src/helpers/entrants.mjs` prints a player once with one line per race under him, the entrants chip counts players, and a member already in reads "Enter another race" while a race is left to enter.
- A signup-only event plays no stage, so it is a sign-up list and not a draw. The wizard leaves its stages step out and writes an explicit empty stage list, which the API reads as no stage where a missing field writes a default one; its review names the shape as "No stages: a sign-up list". The event page drops the stage table, titles the card "Sign-ups", counts the entrants against the cap as "n of cap signed up", reads them in the order they entered instead of by seed, prints each one's note under the name and marks a checked-in entrant with a `success` tick. `stepsFor` in `next/src/helpers/event-wizard.mjs` and `bySignup` and `signupCount` in `next/src/helpers/entrants.mjs` answer all of it.
- A member's own blocks never refuse a round. When `GET /me/events` hints `blocked_by_blocks` for the next round, the home card and the event page show one `info` chip, "Your blocks cover this round", beside one outlined `error` button, "Sit out", which writes the answer through `PUT /player-availability`. Every other hint shows nothing, because a hint the player has already answered has nothing left to say. `blocksHint` in `next/src/helpers/events.mjs` is the one source for both pages.
- A "Hide results" switch over the draw blanks every score and win mark and hides the standings, so a reader can watch the games first. A side a feeder filled reads "To be decided" while the switch is on, because the name a bracket carries into the next round is the result of the one before it. It is the viewer's own choice, stored in `localStorage` under `hideResults`, and it starts off. `SeriesBox` and `StageView` read it through the `HIDE_RESULTS` provide key, so a page with no switch shows every result.
- `StageView` draws one stage per division. An elimination stage is columns, one per round, boxes joined by feeder lines in `on-surface` at a low opacity; a double elimination draws its lower ladder under its upper one and the grand final under both, so no column sits off the screen; the winning side of a played series wears a `win` mark and the beaten side a `loss` mark; a side that can never fill reads "Bye"; the round names the column, and the third-place box names itself off the stage's `third_place` and the two loser slots the series carries, never off the column's name. A round robin and a Swiss stage are a `GroupedTable` of standings in the ranking order, then one card a round; a Swiss round holds the bye as a box that names one side and reads "Bye" beside it. A KOTH night is a chain: the king's box, marked with `mdi-crown`, then each challenger in sequence. Every box shows each side through `PlayerName` with its race, the score, and the state as a phrase: "Waiting for both sides", "To play", "Played", "Walkover", "Forfeit". One legend under the stage names the win, loss and no-result marks. The standings card leads the stage in the DOM, so a screen reader and a keyboard user meet it first; a bracket alone pushes it under the draw with CSS `order`, because a bracket is read first and ranked after. A phone stacks the columns into one list per round. A screen reader gets the same series as a list, in column order.
- A Swiss stage draws one round at a time and a round robin may split into groups. The stage table carries a Buchholz column, the sum of an entrant's opponents' points, only where the ranking rule breaks ties on it, and it sits beside the points it breaks and hides under md; a Swiss stage that names no rule of its own ranks on Buchholz, which `ranking` in `next/src/helpers/stage-view.mjs` resolves the way the engine does. A stage split into groups answers one standings table per group, and `standingsGroups` keys each on its division and its group and names it "Gold · Group A", so the groups read one under the other under the division that holds them. A division runs its own groups and they merge only at the next stage.
- The run page draws a Swiss stage instead of generating it: "Draw the next round" takes the place "Generate" holds on every other format, because the engine plans no Swiss stage up front. It writes `POST /events/{id}/stages/{sid}/rounds`, and the confirm names the round it is about to pair. The button is disabled while a series of the round before carries no result, and once the stage has drawn every round it plays; one caption under the row says which of the two it is. `nextRound` in `next/src/helpers/stage-view.mjs` answers the round number, the block and the end.
- A free for all stage plays lobbies, not pairs. One series is one lobby: it names nobody in its two player columns and carries a seat per player instead, each with the place he took. `StageView` draws a card per round of lobbies, and the one league lobby as a card of its games; `SeriesBox` draws a lobby as one row a seat, best place first, the place as the number where a score sits, the winner on the `win` mark and every beaten seat on `loss`. A seat of the first round that nobody took reads "Empty seat"; a lobby past the first round is fed by the round before it, so an unfilled seat there reads "To be decided" the way a fed bracket side does, and the box reads "Waiting for the round before". While "Hide results" is on, a fed lobby names nobody at all, because the players it seats are the result of the round before it. The table over the stage is titled "Place points", because a lobby counts no games, so it drops the game difference column. `isLobby` and `lobbySeats` in `next/src/helpers/stage-view.mjs` answer both.
- The run page enters a lobby's result as places, not as games: the dialog lists the seats in place order, and the organiser drags a seat or types its place, so the order is always a whole result. It writes `PUT /series/{id}/places`. Before a lobby is played each seat also offers "Move", which sends that entrant to another lobby of the same round through `PUT /series/{id}/sides` on both lobbies. The picker holds the lobbies of that entrant's own division, because a division runs the whole event in parallel and never merges, and it numbers them the way that division's boxes are numbered. A lobby seats two entrants or more, so a lobby down to two offers no "Move" at all.
- `next/src/helpers/stage-view.mjs` holds the parts that are only data: the columns and their box positions, the blocks a bracket is drawn in, the feeder lines, the chain order, the standings groups and the bye. `SeriesBox` is one series; on the event page a button that opens the series page, on the run page a button that opens the result dialog, and read only where the page already names the series, which links its two names. A side that names a team entrant reads as the team name over the roster it fields, one `PlayerName` each; a solo side stays the one name it is today. The roster comes from `GET /teams/season/{event_id}` and reaches the box as the `rosters` map that `rostersByEntrant` builds, keyed by entrant id, so only a team event pays for that read. A side is filled once its entrant or its player is named, which `standsOn` answers for the state word, the bye and the score entry alike.
- A fixture of a team event holds ordered series, and each one names its own mode and pick rule. The Clan War template of the Altar of Champions is a drafted 1v1, a drafted 2v2, a 4v4 on any pick, a drafted 1v1 and a 1v1 on any pick. `FixtureSeries` draws them on the fixture page and on the series page, in play order: the mode as "1v1", "2v2" or "4v4", the pick rule as "Drafted" or "Any pick", and the `SeriesBox` of the two sides under them. The card head carries the fixture score, one legend under the list names the win, loss and no-result marks, and the series the reader is already on wears a `primary` border instead of its "Open series" link. `fixtureRows` and `fixtureScore` in `next/src/helpers/fixture.mjs` answer the rows and the score. A GNL season draws its fixtures on its own pages, so it answers no rows here.
- A side that fields more than one player is named by a captain, never drafted. The series page offers "Name <team>" to a captain of that side and to an admin, and its picker holds the roster the team is rostered with for the event, one `PlayerName` a row with a tick, and takes exactly the players the series fields. It writes `PUT /series/{id}/sides`. In a box, a side reads the players the series names, else the one player it drafted, else every member of the team; a side of a series with a pick rule that nobody has named yet reads "Roster not named". `rosterSides` and `takesRoster` in `next/src/helpers/fixture.mjs` answer who may write and when.
- The run page ends the event on its last stage: "Finish" writes `POST /events/{id}/finish`, and the confirm names every entrant the close awards and the place it takes, because the close freezes that stage's table into the award rows. A finished event's page carries that place on each entrant's row as a small outlined chip: "Champion" under `mdi-trophy` in `medal-gold`, "Runner-up" under `mdi-medal` in `medal-silver`, "Third" in `primary`, and "Placed n" with no mark past third. `placeTitle`, `placeMedal` and `placings` in `next/src/helpers/awards.mjs` name them the way `app/services/awards.py` does. A first place also reaches the player page's trophy shelf through the existing `TrophyIcon`, so a cup win stands beside a season championship.
- The series page is `/series/:id` and any reader opens it. Its title names the event with `eventLabel`, its eyebrow the round and the opponent, and the full action bar sits under them and holds the booked time and the steps. Then the same `SeriesBox` for the two sides and the score, one row per game of the best-of with its map rule, its map and its winner, and the casts. An admin also gets the walkover and forfeit ask. A team side names no player of its own, so a series with no player on either side offers the report to any logged-in member and the API answers who acts for the side; its 403 reads as the dialog's alert. A series inside a GNL fixture names its season and its round; a bracket series names neither until `SeriesPublic` carries its round.
- The report dialog folds the veto away. One row, a button with `aria-expanded`, states where the veto stands and opens the board in place; it is closed when the dialog opens, in every state, and a series whose rules play no veto carries no row at all. A veto that is not complete adds a heading in `warning` with its icon over the row, because a banner body alone reads as a note; the dialog keeps one width in both states, and the report still saves.
- The run page is `/events/:id/admin`, admin only: one tab per stage, "Generate" while the stage holds no series, the same `StageView`, and "Advance" once every series carries a result. A result is entered game by game and the winners make the score. A walkover and a forfeit take a side picker. Reopening a series warns that it clears every side it feeds, and a reopen the engine refuses asks once more before it forces. A stage of format `koth` adds two buttons of its own: "Add challenger" picks one entrant no series names yet, each row a `PlayerName` with the signup race and his bracket and his MMR under the name, and appends him to the end of that bracket's chain; "Close the night" counts the unplayed series at the end of every chain and names the count before it deletes them.
- `/koth` is the KOTH nights list, admin only: every night newest first with its date and its state, each name a link to its run page, and "Open tonight", which takes the start time and the three MMR bounds the brackets open at, prefilled from the night before. A night is one event of the KOTH league, so the run page runs it and the entrants page enters a signup by hand.
- The entrants list is a `GroupedTable` grouped by division. An eligibility warning is a chip in `warning` with its reason as the label: under 20 games, over the MMR cap, banned. An identity that is not linked reads "Not linked" in medium emphasis, and the W3C column reads "Linked" as a link to the profile, because the W3C name is the battle tag the row already prints. A withdrawn entrant keeps its row in medium emphasis. The seed column reads the seed, and its source once the stage is locked; an admin drags a row to reorder the seeds inside its division. A player on more than one race is one row with a race row under it per race, each with its own MMR, seed, state and actions; the ban sits on his row alone, and a drag moves his races together. The MMR strip above the list is `DivisionBracketing`: its bands ascend where the divisions descend, and each band wears one step of the `heat-*` scale, because a division is a band of amounts and not a category. A phone drops the table for one card per entrant with the name, the race, the MMR and the chips. A team entrant reads as the team name with its roster under it: every member the team is rostered with for this event, through `PlayerName` on the race he signed up on, the captains marked with `mdi-star` in `primary-text`. Its MMR is the mean of those ratings, so the battle tag, Discord and W3C columns read an em dash, because a team carries no identity of its own. The Add dialog's team picker names the roster size of each team, and says which teams this event holds no roster for.
- The KOTH night page is `/koth/dashboard` and any reader opens it. It draws the newest published KOTH event that is not finished from the event reads: `EventHeader`, the sign up and withdraw buttons, then one card per bracket in division order with the standing king under a `mdi-crown` in `primary-text`, the entrants through `PlayerName` with the signup race and the MMR, and the bracket's chain through `StageView`. A player on two races reads once with a line per race under him, and the entrants chip counts players. A night nobody opened reads "No night open tonight". `?mode=clean` drops the two buttons, so the page can sit in a stream, and the page reads itself again every 30 seconds.
- The player page's Events section is one accordion row per event the player took part in, of any kind, newest first: the event label, the kind as a small outlined chip, the dates, and one chip for the result — Champion, else the placing once the event is over, else the state. A GNL row carries the team, the race, the series record with its round strip, the ladder record and the MMR, and opens onto the round cards or the series by round; every other kind opens onto its placing, the series still to play and a link to its event page. `next/src/helpers/player-events.mjs` builds the rows from `GET /users/{id}/history`, which answers every kind. On the owner's own page tonight's KOTH night joins the list: `foldNight` in `next/src/helpers/koth.mjs` rides it on his own row once he entered it and leads the list while he has not, and the row wears `mdi-crown` with the night's state, the races he entered on, and the one action word the member read picked.
- A result bar or square uses `win` and `loss` only; a draw or no result uses `draw`.
- The head to head card counts every kind of event. Its events column and its meeting rows print `eventLabel`, and a cup, a KOTH night and a signup event wear a small icon (`mdi-tournament`, `mdi-crown`, `mdi-clipboard-text-outline`) with the kind as the title; a GNL season wears none, because its label already says so.

## Patterns

- A card title bar is `bg-primary`. A dialog that deletes something uses `bg-error`.
- Bronze text on a tab, a toolbar button or a card action button uses `primary-text`, because `primary` is 4.21:1 on `surface-light`.
- The sorted column title of a table is in `primary`. An unsorted sortable column shows a faint sort icon.
- A table wider than its card shows a shadow at the hidden edge.
- A card pads its content with 16 px, the value `--card-spacing` holds. A card marked `size="sm"` pads with 12 px. A card whose content runs to its own edge, a full-width table or list, pads with none.
- A control draws no default before its data arrives. Until the data lands the control is inert: a skeleton, or a disabled control with `aria-busy`, so a tap cannot write a value the reader never picked.

## Charts

- Use d3 to compute scales, paths, axes and drag. Draw the marks in JSX.
- Size an SVG in real pixels from its container. A fixed `viewBox` stretches the text on a wide card.
- An SVG attribute cannot take a utility class. Use `rgb(var(--v-theme-<token>))`, as `ladder-days.mjs` and `DivisionBracketing.tsx` do.
- Give a plot one y-axis. Two measures on different scales go in two plots.
- Draw axes and grid lines in `on-surface` at a lower opacity. A label that names a value can use full `on-surface`. Never draw text in a series colour.
- Draw lines 2 px wide. Give a dot a 2 px ring in `surface`. Leave a 2 px gap between stacked bars.
- A scale of amounts uses one hue from light to dark, like the `heat-*` tokens.
- A legend holds only the marks that carry no hover of their own. A mark the reader can hover for its own label needs no legend row.

## Light and dark

- The app bar menu offers light, dark and system. The choice is stored in `localStorage` under `theme`.

## Add a colour

1. Add the token to both themes in `palette.mjs`.
2. If text sits on the colour, add an `on-<token>` ink to both themes.
3. Run `pnpm test` from `next/`.
4. Open the page in light and in dark, and look at it.

The test checks three things. Every declared ink passes 4.5:1 on its fill. A form label passes 4.5:1 on `surface`, `background` and `surface-light`. Dark `error` stays apart from `loss`. It does not check that a new chart colour stays apart from its neighbours for a colour-blind reader. Check that by hand.

## Known gaps

These parts of the app break a rule above today.

- Page titles use three sizes. Most pages use a bare `<h1>`. The event, events, league, leagues, season, seasons, teams and KOTH pages use `text-h5 text-md-h3`.
- In light, `win`, `loss`, `draw`, `error`, `info`, `success` and `warning` name no `on-*` ink. A fill of one of those names picks its text colour by hand.
- Status colours mark things that are not app states. The fantasy week rank chips use `success`, `info` and `warning`. The MMR chips on the match page use `info`. Bench points use `warning`.
- The fantasy bet-points chip colours its text in `win` or `loss`.
- `LadderDayBars` is a fixed 224 px wide. Its stacked bars have a 1 px gap.
- The dots in `DivisionBracketing` have a 1.5 px ring. A pinned dot's ring is `on-surface`.
- The games mark draws a fixed twenty-game rule over two W3C seasons. The event settings carry a games floor and the number of W3C seasons it counts over, and the mark reads neither. One of its two surfaces, the players page, pairs nobody (`next/src/helpers/games-rule.mjs`).
- Some surfaces still print a synced time without the W3C mark, while the match page and the roster head draw it: the player header prints the time as a caption under the MMR chips (`next/src/components/player/PlayerHeader.tsx`), the entrants table reads "Read from w3champions ..." or "Never read from w3champions" (`next/src/app/(app)/events/[id]/entrants/EntrantsView.tsx`), and the season assign page and the season team page print the time with a tooltip alone (`next/src/app/(app)/seasons/[id]/assign/SeasonTeamAssignView.tsx`, `next/src/app/(app)/team/[id]/season/[season_id]/SeasonTeamDetailsView.tsx`).
- Some figures write the won-lost form by hand instead of calling `record`: the career totals read "Series 12-7 (63%)" (`next/src/components/CareerStatsDialog.tsx`) and the ladder matchup reads "12–7 · 63%" (`next/src/components/ladder/MatchupCompare.tsx`).
- `FORMATS` in `next/src/helpers/event-labels.mjs` holds no captain-draft format, so nothing prints "Captain draft" yet.
- Cards that pad other than 16 px: `UserGuideView.tsx`, `LoginView.tsx`, `AdminLoginView.tsx` and `DiscordJoinCard.tsx` pad 24 px; `LadderView.tsx` pads 32 px; `MatchRoundNav.tsx` and `SeasonTeamAssignView.tsx` pad 12 px; `SeasonDetailsView.tsx` pads 8 px on its action row; `SeasonAchievementsView.tsx` pads 8 px top and bottom.
- The series page cannot name a team side of a bracket series. `SeriesPublic` carries the players and the fixture alone, so `GET /series/{id}` answers no entrant and no team; a series inside a fixture reads them off the stage read instead, and a bracket series with no fixture still reads "To be decided" until that payload carries them.
