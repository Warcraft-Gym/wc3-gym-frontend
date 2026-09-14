# Design Rules

The app uses one look, stone and bronze, in a light and a dark theme. This file lists the colours, the type and the rules that keep every page in that look. If a value here differs from the code, the code is correct and this file needs a fix.

## Where the look lives

| File | What it holds |
|---|---|
| `src/helpers/palette.mjs` | Every theme colour, light and dark. The only place a colour value is written. |
| `src/helpers/palette.test.mjs` | Checks on the palette. `npm test` runs them. |
| `src/assets/base.css` | Fonts per element, and the few rules Vuetify props cannot express. |
| `src/main.js` | Loads the fonts and gives the palette to Vuetify. |
| `src/helpers/theme.js` | Picks light, dark or the system setting. |
| `src/helpers/tiers.mjs` | Fantasy tier names and their colour tokens. |
| `src/helpers/ladder-days.mjs` | `WIN` and `LOSS` as CSS values for SVG charts. |

## Rules

- Use a theme token for every colour: `color="primary"`, `class="text-win"`, `rgb(var(--v-theme-loss))`. Never write a hex value or a Vuetify palette name such as `red` or `green-darken-2` in a view. Two exceptions are allowed: the Discord brand colours on the Discord buttons (`LoginView.vue`, `DiscordJoinCard.vue`), and the trophy artwork in `TrophyIcon.vue`.
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
| `surface-variant` / `on-surface-variant` | `#1C2420` / `#F2F4ED` | `#D5DBD1` / ink | Vuetify's inverted surface, for example a tooltip. |
| `on-surface`, `on-background` | ink | `#E7EBE3` | Body text. |
| `band` / `on-band` | `#1C2420` / `#F2F4ED` | `#11110E` / `#F2F4ED` | The dark strip on the match, maps and veto pages, and behind a map thumbnail. |
| `hero` / `on-hero` | `#1C2420` / `#F2F4ED` | `#332A1B` / `#F2F4ED` | The top block of the season report page. |
| `band-muted` | `#B9C4B6` | `#B9C4B6` | Second-level text on the hero. |
| `tag` / `on-tag` | `#DCE1D8` / `#3F4C43` | `#333430` / `#C3CCC1` | A quiet label on the fantasy tiers page. |

### Brand

| Token | Light | Dark | Use |
|---|---|---|---|
| `primary` / `on-primary` | `#9A5B18` / white | `#D08B3C` / `#1A140C` | Bronze. Main buttons, card title bars, the sorted column. |
| `primary-darken-1` | `#7C4912` | `#B57430` | Vuetify's pressed state. |
| `primary-text` | `#7C4912` | `#E3A45F` | Bronze text and links. `primary` is under 4.5:1 as text on `surface-light`. |
| `secondary` / `on-secondary` | `#3F4C43` / `#F2F4ED` | `#C3CCC1` / ink | Stone. Second-level chips and buttons. |
| `secondary-darken-1` | `#2E3931` | `#A7B1A4` | Vuetify's pressed state. |

### Status

Status colours mean a state of the app. Never use one as a chart series.

| Token | Light | Dark | Use |
|---|---|---|---|
| `error` | `#8C3B2A` | `#FFB4AB` | A failed action, a delete, the "Can't play" button. Kept apart from `loss` in dark. |
| `warning` | `#A65200` | `#F0A04B` | A warning. Orange, never amber, because amber text does not read. |
| `info` | `#2F6690` | `#7FB0DA` | A note, the "In progress" chip. |
| `success` | `#2A6B36` | `#5FA870` | A saved action, the "Check in" button. |

In dark, `on-error`, `on-info` and `on-success` are ink.

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

Below 960 px, `h1` is 1.6rem and `h2` is 1.3rem.

## Words on the page

- Page titles (`h1`) and app bar and menu entries use Title Case: "Fantasy Bets", "Team Details".
- Everything else uses sentence case: dialog titles, buttons, field labels, hints, table columns, alerts, chips, card titles.
- Buttons show their label as written. `base.css` turns off Vuetify's capitals.
- A column title is a short noun. It has no legend in brackets. On a wide screen it stays on one line.
- Right-align numeric columns, the title and the cells.
- No table shows a database id. A row is named by its name; the id stays in the link.
- A hint is one short instruction, or nothing. It never explains how the code works.
- A table that would clip on a phone hides its columns by priority or becomes cards. A clipped row is a bug.

## Shared components

Use these instead of drawing the same thing again.

| Component | What it shows |
|---|---|
| `PlayerName` | A player as flag, name, race and MMR. It links to the player page. On a drafting page and inside the side panel, it opens the panel instead and shows a dock icon. Inside a form dialog, pass `plain`. |
| `RaceIcon`, `FlagIcon` | One race or one country. Show a race only when the row has one: this game, a scheduled series, or a KOTH signup. A player's profile race is not a race for a row. |
| `GroupedTable` | Groups of rows, each under one header row that opens and closes. Detail rows share the group's columns, so they add up under its total. Never put a table inside a table cell. |
| `RowActions` | The buttons at the end of a row. Three or more fold into a menu. |
| `ColumnNote` | A column title with a help note. |
| `StatusAlert` | A load or save message. It offers a retry when the page can load again. |
| `EventHeader`, `PlayerHeader` | The top of an event page and of a player page. |
| `TeamRoster` | The captains and the members of one team in one event, as two cards. A page that edits the roster fills its slots. |

## Events

The events module names things the same way on every page. A league is what repeats. An event is one run of it that people sign up for: a GNL season, a KOTH night, a cup. A stage is one format over the entrants. A round is a dated window of series. A fixture pairs two teams in a round and holds series. A series has one opponent per side and a best-of. A game is one map. A division is a band of entrants that runs the whole event on its own and never merges. Never "week", never "team series", never "match" for a series; "match" stays only on the GNL fixture pages until they are redrawn.

- The team page tabs one event per row of `seasons_info`, each named with `eventLabel`, and links that name to the event page beside the season team page link. Both team pages read the roster of the tab from `GET /teams/{id}/seasons/{event_id}` and draw it with `TeamRoster`.
- An event named outside its own pages carries its league: "GNL · Season 18". `eventLabel(event)` in `src/helpers/event-labels.mjs` prints it, and prints the name alone when the event has no league or the name already starts with the league's short name. It reads the league off `league_short_name`, or off a league row passed as a second argument, and off `season_name` for the flat trophy and head-to-head rows. A GNL season page wears the same `EventHeader` as every other event, so its `h1` is that label too, and the rounds and teams counts sit under it as small chips. The season team page keeps a plain `h1` of the team name with the same label under it.
- The event state is computed, never stored, and shows as one small tonal chip: signups open in `success`, check-in in `info`, seeded in `secondary`, running in `primary`, finished in `draw`, a draft with no colour. A GNL season answers its own four phases under `phase` instead: open in `success`, commenced in `primary`, overdue in `warning`, complete in `draw`. `STATE_LABEL` and `STATE_COLOR` in `src/helpers/event-labels.mjs` are the one source for both; `STATE_ITEMS`, the filter on the events list, holds the six event states alone.
- The event page lists every stage with its format, its best-of and its scheduling. Only a round robin plays more than one series an entrant a round, so its series count reads on that row and every other format reads an em dash.
- The event page is open to everyone, and so are the events list and the league pages. It carries the one action the server picked for the caller: sign up opens the signup dialog, withdraw asks once, check in takes the entrant's own row, a caller who checked in reads a chip instead of a button, and view scrolls to the draw. A reader who is not logged in reads "Log in to sign up" in that place while the signups stand open. The signup dialog takes the race, and a battle tag only when the event takes anyone and the caller's account names no player; the eligibility warnings the API answers show as chips after the signup and never block it.
- The event page lists its entrants under the stages: the name through `PlayerName` with the signup race, the seed once a stage locked its order, a withdrawn entrant in medium emphasis, and "No entrants yet" when nobody has entered.
- A "Hide results" switch over the draw blanks every score and win mark and hides the standings, so a reader can watch the games first. A side a feeder filled reads "To be decided" while the switch is on, because the name a bracket carries into the next round is the result of the one before it. It is the viewer's own choice, stored in `localStorage` under `hideResults`, and it starts off. `SeriesBox` and `StageView` read it through the `HIDE_RESULTS` provide key, so a page with no switch shows every result.
- `StageView` draws one stage per division. An elimination stage is columns, one per round, boxes joined by feeder lines in `on-surface` at a low opacity; a double elimination draws its lower ladder under its upper one and the grand final under both, so no column sits off the screen; the winning side of a played series wears a `win` mark and the beaten side a `loss` mark; a side that can never fill reads "Bye"; the round names the column, so the grand final and a third place are labelled. A round robin is a `GroupedTable` of standings in the ranking order, then the rounds. A KOTH night is a chain: the king's box, marked with `mdi-crown`, then each challenger in sequence. Every box shows each side through `PlayerName` with its race, the score, and the state as a phrase: "Waiting for both sides", "To play", "Played", "Walkover", "Forfeit". One legend under the stage names the win, loss and no-result marks. A phone stacks the columns into one list per round. A screen reader gets the same series as a list, in column order.
- `src/helpers/stage-view.mjs` holds the parts that are only data: the columns and their box positions, the blocks a bracket is drawn in, the feeder lines, the chain order, the standings groups and the bye. `SeriesBox` is one series; on the event page a button that opens the series page, on the run page a button that opens the result dialog, and read only where the page already names the series, which links its two names.
- The series page is `/series/:id` and any reader opens it. It names its event with `eventLabel`, then the round and the time under it, the same `SeriesBox` for the two sides and the score, one row per game of the best-of with its map rule, its map and its winner, and the casts. A side of the series and an admin get the report dialog, and an admin the walkover and forfeit ask. A series inside a GNL fixture names its season and its round; a bracket series names neither until `SeriesPublic` carries its round.
- The run page is `/events/:id/admin`, admin only: one tab per stage, "Generate" while the stage holds no series, the same `StageView`, and "Advance" once every series carries a result. A result is entered game by game and the winners make the score. A walkover and a forfeit take a side picker. Reopening a series warns that it clears every side it feeds, and a reopen the engine refuses asks once more before it forces. A stage of format `koth` adds two buttons of its own: "Add challenger" picks one entrant no series names yet, each row a `PlayerName` with the signup race and his bracket and his MMR under the name, and appends him to the end of that bracket's chain; "Close the night" counts the unplayed series at the end of every chain and names the count before it deletes them.
- `/koth` is the KOTH nights list, admin only: every night newest first with its date and its state, each name a link to its run page, and "Open tonight", which takes the start time and the three MMR bounds the brackets open at, prefilled from the night before. A night is one event of the KOTH league, so the run page runs it and the entrants page enters a signup by hand.
- The entrants list is a `GroupedTable` grouped by division. An eligibility warning is a chip in `warning` with its reason as the label: under 20 games, over the MMR cap, banned. An identity that is not linked reads "Not linked" in medium emphasis, and the W3C column reads "Linked" as a link to the profile, because the W3C name is the battle tag the row already prints. A withdrawn entrant keeps its row in medium emphasis. The seed column reads the seed, and its source once the stage is locked; an admin drags a row to reorder the seeds inside its division. The MMR strip above the list is `DivisionBracketing`: its bands ascend where the divisions descend, and each band wears one step of the `heat-*` scale, because a division is a band of amounts and not a category. A phone drops the table for one card per entrant with the name, the race, the MMR and the chips.
- The player page's Events section is one accordion row per event the player took part in, of any kind, newest first: the event label, the kind as a small outlined chip, the dates, and one chip for the result — Champion, else the placing once the event is over, else the state. A GNL row carries the team, the race, the series record with its round strip, the ladder record and the MMR, and opens onto the round cards or the series by round; every other kind opens onto its placing, the series still to play and a link to its event page. `src/helpers/player-events.mjs` builds the rows from `GET /users/{id}/history`, which answers every kind.
- A result bar or square uses `win` and `loss` only; a draw or no result uses `draw`.
- The head to head card counts every kind of event. Its events column and its meeting rows print `eventLabel`, and a cup, a KOTH night and a signup event wear a small icon (`mdi-tournament`, `mdi-crown`, `mdi-clipboard-text-outline`) with the kind as the title; a GNL season wears none, because its label already says so.

## Patterns

- A card title bar is `bg-primary`. A dialog that deletes something uses `bg-error`.
- Bronze text on a tab, a toolbar button or a card action button uses `primary-text` (`base.css`), because `primary` is 4.21:1 on `surface-light`.
- The sorted column title of a table is in `primary`. An unsorted sortable column shows a faint sort icon.
- A table wider than its card shows a shadow at the hidden edge.

## Charts

- Use d3 to compute scales, paths, axes and drag. Draw the marks with Vue `v-for`.
- Size an SVG in real pixels from its container. A fixed `viewBox` stretches the text on a wide card.
- An SVG attribute cannot take a Vuetify class. Use `rgb(var(--v-theme-<token>))`, as `ladder-days.mjs` and `DivisionBracketing.vue` do.
- Give a plot one y-axis. Two measures on different scales go in two plots.
- Draw axes and grid lines in `on-surface` at a lower opacity. A label that names a value can use full `on-surface`. Never draw text in a series colour.
- Draw lines 2 px wide. Give a dot a 2 px ring in `surface`. Leave a 2 px gap between stacked bars.
- A scale of amounts uses one hue from light to dark, like the `heat-*` tokens.

## Light, dark and embedded pages

- The app bar menu offers light, dark and system. The choice is stored in `localStorage` under `theme`.
- A page opened with `?readonly=1` is always light, because it is embedded in the light warcraft-gym.com site.

## Add a colour

1. Add the token to both themes in `palette.mjs`.
2. If text sits on the colour, add an `on-<token>` ink to both themes.
3. Run `npm test`.
4. Open the page in light and in dark, and look at it.

The test checks three things. Every declared ink passes 4.5:1 on its fill. A form label passes 4.5:1 on `surface`, `background` and `surface-light`. Dark `error` stays apart from `loss`. It does not check that a new chart colour stays apart from its neighbours for a colour-blind reader. Check that by hand.

## Known gaps

These parts of the app break a rule above today.

- `index.html` still loads Bootstrap 4.5 from a CDN. `base.css` overrides its link colour, its `code` colour and its hover colour on filled buttons.
- Page titles use three sizes. Most pages use a bare `<h1>`. The event, events, league, leagues, season, seasons, teams and KOTH pages use `text-h5 text-md-h3`. The KOTH dashboard uses `text-h5 text-md-h2`.
- In light, `win`, `loss`, `draw`, `error`, `info`, `success` and `warning` name no `on-*` ink. In dark, `warning` names none. Vuetify picks the text colour on those fills.
- Status colours mark things that are not app states. The fantasy week rank chips use `success`, `info` and `warning`. The MMR chips on the match page use `info`. Bench points use `warning`.
- The fantasy bet-points chip colours its text in `win` or `loss`.
- `LadderDayBars` is a fixed 224 px wide. Its stacked bars have a 1 px gap.
- The dots in `DivisionBracketing` have a 1.5 px ring. A pinned dot's ring is `on-surface`.
