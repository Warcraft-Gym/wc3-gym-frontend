# Design Rules

The app uses one look, stone and gold, in a light and a dark theme. This file lists the colours, the type and the rules that keep every page in that look. If a value here differs from the code, the code is correct and this file needs a fix.

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
- Text wears a text token. A result, a tier or a race gets a small coloured mark beside the text, not coloured text. Two exceptions, where the figure is itself the mark: the score of a result seen from one side wears `win` or `loss`, and a drawn score wears body ink, and a wins count and a losses count may wear `win` and `loss` in a column of their own or inside a record, because the column title or the order of the record is the second channel.
- Colour never carries meaning alone. Pair it with an icon, a label or a position.
- A fill that carries text names its own ink as `on-<fill>`. The test checks that every such pair passes 4.5:1 (WCAG AA).
- Dark is its own set of values, not an inverted light theme. A new token gets a light and a dark value.

## Colours

Ink means `#1A241E`. White means `#FBF7F1`.

### Page and surface colours

| Token | Light | Dark | Use |
|---|---|---|---|
| `background` | `#E8E9E3` | `#080503` | The page. |
| `surface` | `#F4F5F1` | `#0C0805` | Cards, tables, dialogs. |
| `surface-bright` | `#FAFBF8` | `#16140F` | A raised surface. |
| `surface-light` | `#E1E4DD` | `#1B1915` | One tab bar, a banned veto tile, a progress-bar track, an empty heat-map cell. |
| `surface-variant` / `on-surface-variant` | `#1C2420` / `#F2F4ED` | `#D5DBD1` / ink | The inverted surface, for example a tooltip. |
| `on-surface`, `on-background` | ink | `#E7EBE3` | Body text. |
| `band` / `on-band` | `#1C2420` / `#F2F4ED` | `#050301` / `#F2F4ED` | The dark strip on the match, maps and veto pages, and behind a map thumbnail. |
| `hero` / `on-hero` | `#1C2420` / `#F2F4ED` | `#1E1710` / `#F2F4ED` | The top block of the season report page, a warm lift above the page. |
| `band-muted` | `#B9C4B6` | `#B9C4B6` | Second-level text on the hero. |
| `tag` / `on-tag` | `#DCE1D8` / `#3F4C43` | `#221F19` / `#C3CCC1` | A quiet label on the fantasy tiers page. |

The dark grounds are the public league site's warm near-black, so the two products share one ground. `on-surface` is 16.5:1 on the dark `surface`.

### Brand

| Token | Light | Dark | Use |
|---|---|---|---|
| `primary` / `on-primary` | `#E7B643` / `#1A140C` | `#E7B643` / `#1A140C` | Gold. Main buttons, chips, badges, avatars, step dots, meters, focus rings, the selected tab indicator. |
| `primary-darken-1` | `#D3A329` | `#D3A329` | A darker gold for a small mark that needs one. |
| `banner` / `on-banner` | `#2B2117` / `#FBF7F1` | `#1E1710` / `#FBF7F1` | Card title bars, card headers, dialog title bars and the round tab bar of the match page. The title in the bar is `text-primary`: 8.4:1 on the light banner, 9.4:1 on the dark one. |
| `primary-text` | `#916200` | `#E7B643` | Gold text and links. In light, `primary` is 1.7:1 on `surface`, so gold text takes this amber. |
| `secondary` / `on-secondary` | `#3F4C43` / `#F2F4ED` | `#C3CCC1` / ink | Stone. Second-level chips and buttons. |
| `secondary-darken-1` | `#2E3931` | `#A7B1A4` | The pressed state. |

Gold is the highlight. A banner is a dark warm bar with cream text; its title is gold; gold fields are for buttons and small marks only. A banner carries the class `banner`: an inset light top line, an inset dark bottom line and a 1 px gold hairline at 35% (`oklch(80% 0.06 80 / 0.35)`). A badge or a button in a bar uses `on-banner` with a 40% border of the same ink.

The filled button (`btn-gold`) is embossed gold: ink `oklch(22% 0.04 60)`, a top-to-bottom gradient `oklch(88% 0.13 90)`, `oklch(78% 0.14 84)` at 48%, `oklch(68% 0.13 78)`, and an inset highlight above. In dark, the inset shade below is `oklch(50% 0.1 70 / 0.6)` and the drop shadow `0 1px 2px oklch(0% 0 0 / 0.6)`; the light ground, and a disabled button on it, take `oklch(50% 0.1 70 / 0.35)` and `0 1px 1px oklch(20% 0.04 60 / 0.22)`. Hover brightens it by 5%, and a press moves it down 1 px unless the reader asks for reduced motion. Chips, badges and the rank badge keep the flat gold fill. Gold is also the hue of an amount (the `heat-*` ramp). It never marks a win, a race or a series. On a light ground gold is a fill with dark ink, never text: a text role in gold uses `primary-text`.

### Status

Status colours mean a state of the app. Never use one as a chart series or for an action button.

| Token | Light | Dark | Use |
|---|---|---|---|
| `error` | `#8C3B2A` | `#FFB4AB` | A failed action, a delete, the sit-out button. Kept apart from `loss` in dark. |
| `warning` | `#A65200` | `#F0A04B` | A warning. Orange, never amber, because amber text does not read. |
| `info` | `#2F6690` | `#7FB0DA` | A note, the "In progress" chip. |
| `success` | `#2A6B36` | `#5FA870` | A saved state, a check mark, a positive state chip. Success is a status, never an action: an action button is `primary`. |

In dark, `on-error`, `on-info`, `on-success` and `on-warning` are ink.

### Results

| Token | Light | Dark | Use |
|---|---|---|---|
| `win` | `#1F63A6` | `#4996F5` | A won game, series or bar. |
| `loss` | `#B31220` | `#E24947` | A lost game, series or bar. |
| `draw` | `#A8A29A` | `#5E5B56` | A draw, no result, the Random race, a neutral bar. |

Win is blue, not green. Green and red cannot be told apart by a reader with red-green colour blindness. `on-draw` is ink in light and white in dark. The draw grey is under 3:1 as text in both themes, so it is a fill or a mark only: a draw as text, a score or a tonal chip, wears body ink. In dark, `on-win` is ink and `on-loss` is `#1A140C`.

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

### Races, medals, the heat map and the two sides of a pair

The race and medal tokens are used on the season report and the event pages. The `heat-*` ramp fills the heat map of the season report and the division bands of the entrants page. The Random race uses `draw`.

| Token | Light | Dark |
|---|---|---|
| `race-hu` | `#0278E7` | `#005BB5` |
| `race-oc` | `#ED4952` | `#B71824` |
| `race-ne` | `#00660C` | `#2DA73D` |
| `race-ud` | `#62359C` | `#9D6FE3` |
| `medal-gold` | `#8F6B00` | `#E0B84A` |
| `medal-silver` | `#6E7881` | `#B9C2C8` |
| `medal-bronze` | `#9A5B18` | `#D08B3C` |
| `heat-1` to `heat-5` | `#F0D49B` `#DBB155` `#B68B16` `#8E6800` `#664700` | `#5E4300` `#805D00` `#AA7E00` `#D3A329` `#F5CB70` |
| `side-1` | `#2E68A8` | `#4A86C8` |
| `side-2` | `#BD6A1E` | `#C97A2C` |

The two `side-*` tokens are the two players of a pair on the availability calendar of the round planner: each fills its own half of a cell, so position tells them apart as well as colour.

The races are the Bold set. In dark, `race-hu` and `race-oc` are 3.01:1 on `surface`: marks beside the race icon, never text. The rank number sits beside each medal, so the rank does not depend on the colour. The heat map is the gold ramp: light to dark gold in light mode, dark to light in dark mode. A cell with no games uses `surface-light`, and the legend shows that swatch.

### Borders and faded text

| Variable | Light | Dark |
|---|---|---|
| `border-color` at `border-opacity` | `#1A241E` at 0.2 | `#E7EBE3` at 0.12 |
| `medium-emphasis-opacity` | 0.78 | 0.7 |

Light uses 0.78 because 0.7 put field labels under 4.5:1 on the light surface.

## Type

| Face | Weights | Use |
|---|---|---|
| Cinzel | 700 | The page title, `h1`, and the app bar title. Cinzel has capitals only, so it never sets a name. |
| Cardo | 400, 700 | `h2` to `h6`, card, dialog and sheet titles, and player and team names (`.player-name .name`, `.team-name .name`, `.font-name`). A name keeps its own case. |
| Lato | 400, 700 | Body text, controls, buttons, captions and every figure. |

`next/font/google` loads the three faces in `next/src/app/layout.tsx` and serves them from the app. Every number uses lining, equal-width digits (`lining-nums tabular-nums`), so figures line up in a column. Lato has no 500: a figure that needs weight uses 700.

A large number on a card uses Lato 700, never a heading face.

Below 960 px, `h1` is 1.6rem and `h2` is 1.3rem.

## Words on the page

- Page titles (`h1`) and app bar and menu entries use Title Case: "Fantasy Bets", "Team Details".
- A banner, card, dialog or section title or a sidebar group label that names a thing uses Title Case: "App Settings", "Upcoming Series", "My Accounts". One that reads as a sentence or an action uses sentence case: "Sign in as a player", "Open signups", "Add team".
- The league is "Gym Newbie League" in a title or a group label. "GNL" stays only where the full name would wrap: a chip, a table cell, a column title, a filter option. Never "the league" for it.
- Everything else uses sentence case: buttons, field labels, hints, table columns, alerts, chips.
- Buttons show their label as written, in sentence case.
- A column title is a short noun. It has no legend in brackets. On a wide screen it stays on one line.
- Right-align numeric columns, the title and the cells.
- No table shows a database id. A row is named by its name; the id stays in the link.
- A hint is one short instruction, or nothing. It never explains how the code works.
- A table that would clip on a phone hides its columns by priority or becomes cards. A clipped row is a bug.
- The app bar title reads "WC3 Gym Dashboard" and always links to `/`.
- A player answers his own round with two buttons, "Check in" and "Sit out"; a captain answers for a player from a row menu. The status reads "Checked in", "Out", "Out (blocked times)" or "No answer". Never "can play" or "can't play".
- A record reads wins then losses around an en dash with one space on each side: "19 – 11 (63%)" from ten played up, "3 – 1" under ten, an em dash when nothing was played. Never "19/30". One helper writes it, `next/src/helpers/figures.mjs`. A points pair wears the same spaced en dash, "1 – 3", but it is not a record: it takes no percent and it prints its zeroes, so the surface writes it and the helper does not. No bar in a cell, no footnote, and no "won" and no W or L letters in a cell, because the column title carries them.
- A series is a best of three; a ladder game is one game. A column title, a caption and a tooltip name the one they count and never mix them.
- A head to head reads as the score in the pairing's order with the last meeting after it: "2 – 1, last met Season 18".
- The app shows no win chance for an MMR or for an MMR difference over the whole population. A figure counted from one player's own games is fine.

## Shared components

Use these instead of drawing the same thing again.

| Component | What it shows |
|---|---|
| `PlayerName` | A player as flag, name, race icon and MMR. It reads the MMR itself; pass `mmr={false}` where a column of its own sorts by MMR, a number where the surface already holds one, and `games={w3cSeason}` on a draft surface for the games mark, or `warning` where the read the surface already made applies the event's own games rule. It links to the player page. On a drafting page and inside the side panel, it opens the panel instead and shows a dock icon. Inside a form dialog, pass `plain`. On one line that stands alone, pass `noFlag` so a player with no country leaves no flag gap. On a surface that weighs players, pass `w3c` for a link to the W3Champions profile beside the line. |
| `TeamName` | A team as its logo and its name, linked to its team page. On a drafting page it is plain text; pass `plain` inside another link, a button or the team's own heading. |
| `RaceIcon`, `FlagIcon` | One race or one country. Show a race only when the row has one: this game, a scheduled series, or a KOTH signup. A player's profile race is not a race for a row. |
| `GroupedTable` | Groups of rows, each under one header row that opens and closes. Detail rows share the group's columns, so they add up under its total. Never put a table inside a table cell. |
| `RowActions` | The buttons at the end of a row. Three or more fold into a menu; `menu` folds fewer, next to a row's main task as its own button. |
| `ColumnNote` | A column title with a help note. |
| `StatusAlert` | A load or save message. It offers a retry when the page can load again. |
| `EventHeader`, `PlayerHeader` | The top of an event page and of a player page. |
| `TeamRoster` | The captains and the members of one team in one event, as one card and one aligned list. A page that edits the roster fills its slots, and a GNL page passes the two empty lines that say season. |
| `PlayedAs` | "as TAG" in muted text under a season row, only when the row's `played_as` differs from the person's tag today. No icon, no link. |
| `RoundStrip` | One player's event as one square per round, with the text record beside it. |
| `FixtureSeries` | The ordered series one fixture holds, each with its mode, its pick rule and its two sides. |
| `BracketCard` | One bracket of a KOTH night: its throne, the series it plays now, the line waiting and what it played tonight. The run page passes its admin controls; the public page passes none. |
| `SeriesActionBar` | The steps of one series as buttons, full or compact. A step already taken reads as a quiet fact before the buttons. |
| `DesktopOnlyNotice` | On a phone, the notice that a task is easier on a computer, with a copy-link button. Around the editing part of a "Read on phone" view, or with `desktopOnly` for a "Desktop only" view. Above 960 px it draws its children alone. |

- The player line is flag, name, race icon, MMR, with one 6 px gap between every part, and the MMR reads at every width. A captain shows his race and his MMR only when he plays in that event. This plain line is the default on every surface.
- The MMR is the W3C ladder MMR of the race the player signed up on, read by the line itself from the `w3c_stats` the payload already carries, so no surface asks for a number of its own. A series row is the exception: the series reads name `player1_mmr` and `player2_mmr`, the rating on the race the row plays, and the surface passes that number in, because the row's player carries no stats. A player with no stats in the payload, and a row that names no rating, end the line after the race icon: no dash, no placeholder. A table that sorts by MMR keeps its column and passes `mmr={false}`, so the number never reads twice in one row; a ladder table keeps its own MMR and +/- columns, which come from the ladder history and are a different figure.
- A sorted roster aligns race and MMR in tracks, while a free-standing player line runs inline with one 6 px gap.
- The round strip is one 12 px square per round of the event, drawn by `RoundStrip`: `win` for a round the player won, `loss` for one he lost, a square split down the middle for a round he won one series and lost another, a dashed outline in `foreground` for a series still to play, a quiet `border` square crossed by a diagonal in low-emphasis ink for a round he sits out, and a plain quiet `border` square for a round with no series. A series of a round wins over the out mark, because a round that was played shows its result. The mark names the winner of the series only, so the strip reads the same for best of 1, 3 and 5. Its tooltip names the round and the margin, "Round 3 · Lost 0 – 2", then the opponent as a player line; a round with two series lists both, and a round sat out reads "Round 3 · Sat out". The crossed mark carries its own hover, so the strip needs no legend row. The text record "2 – 1" sits beside the strip in `win` and `loss`, so colour is never the only channel, and a phone drops it and keeps the strip. One strip is one keyboard stop: the group carries the name "Won 2, lost 1, played 3 of 7 rounds" and the arrow keys walk its marks. It shows on the team page roster and on the player page's Events row.
- A second version of the player line puts the games icon before the flag: a warning triangle when the player is under the event's games rule, with the count in its tooltip, and the same mark in `error` when W3C holds no stats for him. It shows only on the surfaces that pair players in an event that sets a games rule. `games={w3cSeason}` works the rule out in the browser; `warning` takes the mark a read already worked out, which is how the round planner draws it. A line that meets the rule keeps an empty slot of the same width and height, so the flags stay in one column and the rows keep one baseline. A line that stands on its own, not in a column of player lines, keeps no slot, so its flag lines up with the caption under it. It is never the default, because the icon is noise on a surface that does not pair players.
- A team is drawn as its logo and its name, and the name links to the team page. A team with no logo shows a neutral placeholder of the same size, so the names in a column stay aligned. A long name truncates and carries the full name in its title.
- On a drafting page, the match page and the season assign page, and inside the player panel, a team name is plain text with no link, for the same reason the player name is there: a link would leave unsaved work.
- One shared action bar carries the steps of a series, in order, with the words "Schedule", "Veto maps" and "Report result"; the report step reads "Edit result" once the series is scored. The full bar shows all three steps where the series is the subject of the surface: the "Waiting for you" list and the series page. The compact bar shows two active steps where a series is one item among many: the next step filled and the one after it outlined. In both bars a button keeps the word of its step, and a step already taken states what it left behind as a quiet fact before the buttons: the booked time, and "Veto done". A series that needs no veto leaves that step out, and a reported series keeps its result button alone. The player a side names, a captain of the team that fields a side, a member of the roster of a side that names no player, and an admin act on it, all through the same routes; another reader sees the steps without buttons. Once the booked time has passed the result is the next step, because a missing veto warns and never blocks. Its context label reads "League - Event - Stage - Round - Opponent", and a part the series carries no value for is left out with its separator.
- The W3C data line is the W3C mark and "synced 3 days ago", with the detail in a tooltip. It reads the same way everywhere in the app.

## Events

The events module names things the same way on every page. A league is what repeats. An event is one run of it that people sign up for: a GNL season, a KOTH night, a cup. A stage is one format over the entrants. A round is a dated window of series. A fixture pairs two teams in a round and holds series. A series has one opponent per side and a best-of. A game is one map. A division is a band of entrants that runs the whole event on its own and never merges. Never "week", never "team series", never "match" for a series; "match" stays only on the GNL fixture pages until they are redrawn.

- The team page tabs one event per row of `seasons_info`, each named with `eventLabel`, and links that name to the event page beside the season team page link. Both team pages read the roster of the tab from `GET /events/{event_id}/teams/{team_id}` and draw it with `TeamRoster`: one card, the captains and the members in one aligned list, the columns flag, name, race and MMR, and on `/team/:id` the points and the round strip too. The members run by MMR, highest first, a player with no MMR last, because the list carries no sort control. The column head, the MMR, "Points" and the round numbers, is drawn once for the card, on the head of the first group that lists rows, and "Captains" and "Members 7" stay row group heads. The MMR head is the W3C form with the synced time in its tooltip, the points head carries the note "Points from series in this event", and a long name truncates while the numbers never do. The points cell sums `player1_points` and `player2_points` over the series the page already holds, because the server applies the event's score system, and a player with no series reads an em dash. The rounds a player sits out come from the `out_rounds` of his `record`, the one object that holds his record in this event, so the roster asks for no read of its own. A narrow screen drops the text record beside the strip before it drops the points. A captain shows his race, his MMR, his points and his strip only when he plays in that event, and reads "Not playing this season" across those columns when he does not, and he reads under Captains alone, so the members list and the member count leave his member row out.
- An event named outside its own pages carries its league: "GNL · Season 18". `eventLabel(event)` in `next/src/helpers/event-labels.mjs` prints it, and prints the name alone when the event has no league or the name already starts with the league's short name. It reads the league off `league_short_name`, or off a league row passed as a second argument, and off `season_name` for the flat trophy and head-to-head rows. A GNL season page wears the same `EventHeader` as every other event, so its `h1` is that label too, and the rounds and teams counts sit under it as small chips. The season team page keeps a plain `h1` of the team name with the same label under it.
- The event state is computed, never stored, and shows as one small tonal chip: signups open in `success`, check-in in `info`, seeded in `secondary`, running in `primary`, finished in `draw`, a draft with no colour. A GNL season answers its own four phases under `phase` instead: open in `success`, commenced in `primary`, overdue in `warning`, complete in `draw`. `STATE_LABEL` and `STATE_COLOR` in `next/src/helpers/event-labels.mjs` are the one source for both; `STATE_ITEMS`, the filter on the events list, holds the six event states alone.
- The event page lists every stage with its format, its best-of and its scheduling. Two settings count series and they never share a name: the event's `series_per_round` is "Series per fixture", which reads only on a team event, because a fixture pairs two team entrants; a stage's `series_per_entrant_per_round` is "Series each entrant plays per round", which reads only on a round robin. The stage table titles that column "Series per entrant" with the long name as its note, and every other format reads an em dash. `seriesPerFixture` and `seriesPerEntrant` in `next/src/helpers/event-labels.mjs` answer both, so the wizard, the event page and the run page print the same words. The stage format that pairs players by captain draft is named "Captain draft" wherever the app prints a format.
- The seed of a stage comes from MMR, a shuffle, a hand order, or the standings of the previous stage; the previous-stage button reads only on a stage that has one. A qualifier seeds from a parent event's field, which the model does not carry, so `SEED_SOURCES` leaves it out.
- The event page is open to everyone, and so are the events list and the league pages. It carries the one action the server picked for the caller: sign up opens the signup dialog, withdraw asks once, check in takes the entrant's own row, a caller who checked in reads a chip instead of a button, and view scrolls to the draw. A reader who is not logged in reads "Log in to sign up" in that place while the signups stand open. The signup dialog takes the race, and a battle tag only when the event takes anyone and the caller's account names no player; the eligibility warnings the API answers show as chips after the signup and never block it. A signup-only event asks for one more field, a note of at most 200 characters, hinted "What you want to work on".
- The home page is the player's page for the week: "Open signups", "My Season", "Upcoming Series" and "Upcoming events" in a wide column, "My Stats" and "Fantasy" in a narrow one, each drawn only when it has something to say. Below 960 px the columns dissolve into one stack in the order of `PANEL_ORDER` in `next/src/helpers/home-hub.mjs`: an open signup first, because it is the one thing that expires. The h1 is "Home" and carries no subheader. While the page loads a panel draws its own skeleton rows under its real title, and its controls stay inert; the fantasy panel is drawn only once its reads say it has something to offer, so it never shows and then vanishes.
- A result on the hub follows "Show a result from the reader's side": the viewer's own score first, through `record` in `next/src/helpers/figures.mjs`, in the `win` token when he won and the `loss` token when he lost, medium weight, tabular, linked to the series, with the title and the aria-label "Won 2 – 1".
- Every Home panel follows the current season. "My Season" lists it round by round, `homeRounds` putting the rounds to play first and the rounds played after: each round carries its dates, its answer as two equal buttons "Available" and "Out" while it takes one (the answer held is filled, in `success` or `error`, and inert while the answers load), and once paired the opponent with the compact action bar, or the result. "Upcoming Series" takes the `next` list of `GET /home/series`; a row states its time in the reader's zone through `seriesWhen`, its "League · Event · Stage · Round" label through `rowContext`, its two teams and its two players, and a side with neither player nor team reads "To be decided". A captain's fixture that still needs a draft leads that panel as one row per event. "Open signups" keeps the signup dialog, the GNL form link, the withdraw and the check-in behind outlined buttons of equal standing. "Upcoming events" is read-only: it names the rest of the upcoming events with their dates and the signup chip, and offers no button, so an action lives in one panel only. "My Stats" shows four figures, large number over small words, and the best three achievements of the season with their icons and points. "Fantasy" shows one filled "Place bet" per open series without a bet and an outlined "Change bet" where the member has one.
- A failed read never prints an empty state. When `GET /home/series` fails, the hub states it in the page's `StatusAlert` and the panel that read it prints one quiet line, "Could not be loaded.", in place of its rows, because "No series is booked" is a lie after a network error and a title over an empty strip reads as a broken card. The line states the failure; it is not an empty state.
- The event page lists its entrants under the stages: the name through `PlayerName` with the signup race, the seed once a stage locked its order, a withdrawn entrant in medium emphasis, and "No entrants yet" when nobody has entered. On an event that takes one entry per race, `byPlayer` in `next/src/helpers/entrants.mjs` prints a player once with one line per race under him, the entrants chip counts players, and a member already in reads "Enter another race" while a race is left to enter.
- A signup-only event plays no stage, so it is a sign-up list and not a draw. The wizard leaves its stages step out and writes an explicit empty stage list, which the API reads as no stage where a missing field writes a default one; its review names the shape as "No stages: a sign-up list". The event page drops the stage table, titles the card "Sign-ups", counts the entrants against the cap as "n of cap signed up", reads them in the order they entered instead of by seed, prints each one's note under the name and marks a checked-in entrant with a `success` tick. `stepsFor` in `next/src/helpers/event-wizard.mjs` and `bySignup` and `signupCount` in `next/src/helpers/entrants.mjs` answer all of it.
- A member's own blocks never refuse a round. When `GET /me/events` hints `blocked_by_blocks` for the next round, the event page shows one `info` chip, "Your blocks cover this round", beside one outlined `error` button, "Sit out", which writes the answer through `PUT /player-availability`. Every other hint shows nothing, because a hint the player has already answered has nothing left to say. `blocksHint` in `next/src/helpers/events.mjs` is the one source.
- A "Hide results" switch over the draw blanks every score and win mark and hides the standings, so a reader can watch the games first. A side a feeder filled reads "To be decided" while the switch is on, because the name a bracket carries into the next round is the result of the one before it. It is the viewer's own choice, stored in `localStorage` under `hideResults`, and it starts off. `SeriesBox` and `StageView` read it through the `HIDE_RESULTS` provide key, so a page with no switch shows every result.
- `StageView` draws one stage per division. An elimination stage is columns, one per round, boxes joined by feeder lines in `on-surface` at a low opacity; a double elimination draws its lower ladder under its upper one and the grand final under both, so no column sits off the screen; the winning side of a played series wears a `win` mark and the beaten side a `loss` mark; a side that can never fill reads "Bye"; the round names the column, and the third-place box names itself off the stage's `third_place` and the two loser slots the series carries, never off the column's name. A round robin and a Swiss stage are a `GroupedTable` of standings in the ranking order, then one card a round; a Swiss round holds the bye as a box that names one side and reads "Bye" beside it. Every box shows each side through `PlayerName` with its race, the score, and the state as a phrase: "Waiting for both sides", "To play", "Played", "Walkover", "Forfeit". One legend under the stage names the win, loss and no-result marks. The standings card leads the stage in the DOM, so a screen reader and a keyboard user meet it first; a bracket alone pushes it under the draw with CSS `order`, because a bracket is read first and ranked after. A phone stacks the columns into one list per round. A screen reader gets the same series as a list, in column order.
- A Swiss stage draws one round at a time and a round robin may split into groups. The stage table carries a Buchholz column, the sum of an entrant's opponents' points, only where the ranking rule breaks ties on it, and it sits beside the points it breaks and hides under md; a Swiss stage that names no rule of its own ranks on Buchholz, which `ranking` in `next/src/helpers/stage-view.mjs` resolves the way the engine does. A stage split into groups answers one standings table per group, and `standingsGroups` keys each on its division and its group and names it "Gold · Group A", so the groups read one under the other under the division that holds them. A division runs its own groups and they merge only at the next stage.
- The run page draws a Swiss stage instead of generating it: "Draw the next round" takes the place "Generate" holds on every other format, because the engine plans no Swiss stage up front. It writes `POST /events/{id}/stages/{sid}/rounds`, and the confirm names the round it is about to pair. The button is disabled while a series of the round before carries no result, and once the stage has drawn every round it plays; one caption under the row says which of the two it is. `nextRound` in `next/src/helpers/stage-view.mjs` answers the round number, the block and the end.
- A free for all stage plays lobbies, not pairs. One series is one lobby: it names nobody in its two player columns and carries a seat per player instead, each with the place he took. `StageView` draws a card per round of lobbies, and the one league lobby as a card of its games; `SeriesBox` draws a lobby as one row a seat, best place first, the place as the number where a score sits, the winner on the `win` mark and every beaten seat on `loss`. A seat of the first round that nobody took reads "Empty seat"; a lobby past the first round is fed by the round before it, so an unfilled seat there reads "To be decided" the way a fed bracket side does, and the box reads "Waiting for the round before". While "Hide results" is on, a fed lobby names nobody at all, because the players it seats are the result of the round before it. The table over the stage is titled "Place points", because a lobby counts no games, so it drops the game difference column. `isLobby` and `lobbySeats` in `next/src/helpers/stage-view.mjs` answer both.
- The run page enters a lobby's result as places, not as games: the dialog lists the seats in place order, and the organiser drags a seat or types its place, so the order is always a whole result. It writes `PUT /series/{id}/places`. Before a lobby is played each seat also offers "Move", which sends that entrant to another lobby of the same round through `PUT /series/{id}/sides` on both lobbies. The picker holds the lobbies of that entrant's own division, because a division runs the whole event in parallel and never merges, and it numbers them the way that division's boxes are numbered. A lobby seats two entrants or more, so a lobby down to two offers no "Move" at all.
- `next/src/helpers/stage-view.mjs` holds the parts that are only data: the columns and their box positions, the blocks a bracket is drawn in, the feeder lines, the standings groups and the bye. `SeriesBox` is one series; on the event page a button that opens the series page, on the run page a button that opens the result dialog, and read only where the page already names the series, which links its two names. A side that names a team entrant reads as the team name over the roster it fields, one `PlayerName` each; a solo side stays the one name it is today. The roster comes from `GET /teams/season/{event_id}` and reaches the box as the `rosters` map that `rostersByEntrant` builds, keyed by entrant id, so only a team event pays for that read. A side is filled once its entrant or its player is named, which `standsOn` answers for the state word, the bye and the score entry alike.
- A fixture of a team event holds ordered series, and each one names its own mode and pick rule. The Clan War template of the Altar of Champions is a drafted 1v1, a drafted 2v2, a 4v4 on any pick, a drafted 1v1 and a 1v1 on any pick. `FixtureSeries` draws them on the fixture page and on the series page, in play order: the mode as "1v1", "2v2" or "4v4", the pick rule as "Drafted" or "Any pick", and the `SeriesBox` of the two sides under them. The card head carries the fixture score, one legend under the list names the win, loss and no-result marks, and the series the reader is already on wears a `primary` border instead of its "Open series" link. `fixtureRows` and `fixtureScore` in `next/src/helpers/fixture.mjs` answer the rows and the score. A GNL season draws its fixtures on its own pages, so it answers no rows here.
- A side that fields more than one player is named by a captain, never drafted. The series page offers "Name <team>" to a captain of that side and to an admin, and its picker holds the roster the team is rostered with for the event, one `PlayerName` a row with a tick, and takes exactly the players the series fields. It writes `PUT /series/{id}/sides`. In a box, a side reads the players the series names, else the one player it drafted, else every member of the team; a side of a series with a pick rule that nobody has named yet reads "Roster not named". `rosterSides` and `takesRoster` in `next/src/helpers/fixture.mjs` answer who may write and when.
- The run page ends the event on its last stage: "Finish" writes `POST /events/{id}/finish`, and the confirm names every entrant the close awards and the place it takes, because the close freezes that stage's table into the award rows. A closed event carries "Reopen" beside it, an outline button that writes `POST /events/{id}/reopen`. A GNL season is closed and reopened from the row menu of the seasons list instead; its close is a compact confirm under a `banner` title that names the count of series with no result. A finished event's page carries that place on each entrant's row as a small outlined chip: "Champion" under `mdi-trophy` in `medal-gold`, "Runner-up" under `mdi-medal` in `medal-silver`, "Third" in `primary`, and "Placed n" with no mark past third. `placeTitle`, `placeMedal` and `placings` in `next/src/helpers/awards.mjs` name them the way `app/services/awards.py` does. A first place also reaches the player page's trophy shelf through the existing `TrophyIcon`, so a cup win stands beside a season championship.
- The series page is `/series/:id` and any reader opens it. Its title names the event with `eventLabel`, its eyebrow the round and the opponent, and the full action bar sits under them and holds the booked time and the steps. Then the same `SeriesBox` for the two sides and the score, one row per game of the best-of with its map rule, its map and its winner, and the casts. An admin also gets the walkover and forfeit ask. A team side names no player of its own, so a series with no player on either side offers the report to any logged-in member and the API answers who acts for the side; its 403 reads as the dialog's alert. A series inside a GNL fixture names its season and its round; a bracket series names neither until `SeriesPublic` carries its round.
- Under the title of a series stand three facts, one per line at every width, each with its icon: the booked time on the reader's clock with `mdi-calendar`, the map the next game plays with `mdi-map-outline`, and the head to head with `mdi-sword-cross`. A fact the series names no value for is left out, and a series whose result stands draws no map line.
- The report dialog folds the veto away. One row, a button with `aria-expanded`, states where the veto stands and opens the board in place; it is closed when the dialog opens, in every state, and a series whose rules play no veto carries no row at all. A veto that is not complete adds a heading in `warning` with its icon over the row, because a banner body alone reads as a note; the dialog keeps one width in both states, and the report still saves. A played game with no replay adds the same heading, "Replays are missing", and the report still saves.
- The round planner's availability calendar draws the round window as half-hour cells too, read only, one page of seven days and three under XS. A time column stands for each clock the viewer and the two players live on, the viewer's first, and a clock several people share is one column naming them all; each full hour reads on every column, with "+1d" or "−1d" where that clock is on another day. An hour free for both is tinted in `success`; each player's blocked hours fill that player's half of the cell, the first on the left in `side-1` and the second on the right in `side-2`, so position and colour both tell them apart, and an hour outside the round wears the hatch. A player who entered no availability draws no blocks, and a line above the grid says so.
- The schedule dialog draws the round window as half-hour cells, behind a labelled "Calendar / Day tracks" toggle: the calendar opens above the XS breakpoint and the day tracks under it, and one calendar page holds seven days, three under XS, with a pager over the dates it shows. A cell open to both sides is tinted; each side's blocked hours read apart by position, never by colour, the viewer's in the left half of a calendar day and in a strip over a day track, the other side's in the right half and in a strip under the track; an hour outside the window wears the hatch and takes no pick. The pick is a point, a stem across its cell with a dot at the cell's left edge, never a filled half hour. A pick inside a blocked hour names whose hour it is and books anyway, because the hours are a guide. Under the grid one aligned row a player names his zone, its GMT offset and the picked time on his clock, and the button reads "Book this time".
- The round planner's matchup list marks a row two ways, each with a tint and a 4 px bar on its first cell's left edge:
  - `primary` at 12% for a selected row; this marking wins when both apply.
  - `info` at 15% for a row whose player already holds a match this round. That player carries an `info` chip with `mdi-account-check` naming the match ("Draft vs …") on the line of his name, and each side of a row reads on two lines, so the mark never rests on colour alone.

  A click on the row selects it; the name, the links, the marks and the calendar button keep their own clicks. Under 960 px each row stacks as a block. The draft publishes the ticked pairings up to the round's series. "Publish and replace" names the booked time and the map veto the replaced series loses, read when the confirm opens, so a failed read blocks the publish.
- The run page is `/events/:id/admin`, admin only: one tab per stage, "Generate" while the stage holds no series, the same `StageView`, and "Advance" once every series carries a result. A result is entered game by game and the winners make the score. A walkover and a forfeit take a side picker. Reopening a series warns that it clears every side it feeds, and a reopen the engine refuses asks once more before it forces. A KOTH night is not run on the stage engine, so its run page address sends the admin on to `/koth/nights/:id` and draws nothing of its own.
- `/koth` is the KOTH nights list, admin only: the nights newest first, 25 a page in the `DataTable` pager, with their date and their state, each name a link to `/koth/nights/:id`, which also holds the night's settings, "Tonight" to `/koth/dashboard`, and "Open the event", which takes the start time and the three MMR bounds the brackets open at, prefilled from the night before, and lands on the night's run page. A night is one event of the KOTH league, so the entrants page enters a signup by hand. The entrants page of a night draws no MMR strip, no division control, no seed control and no "Remove", because a division write rebuilds the brackets, a seed write reorders the queue the night is running and the run page removes a player under the night's forfeit rules; one link, "Set the brackets on the night's run page.", points at `/koth/nights/:id` instead, and its groups read "bracket" where every other kind reads "division".
- The entrants list is a `GroupedTable` grouped by division. An eligibility warning is a chip in `warning` with its reason as the label: under 20 games, over the MMR cap, banned. An identity that is not linked reads "Not linked" in medium emphasis, and the W3C column reads "Linked" as a link to the profile, because the W3C name is the battle tag the row already prints. A withdrawn entrant keeps its row in medium emphasis. The seed column reads the seed, and its source once the stage is locked; an admin drags a row to reorder the seeds inside its division. A player on more than one race is one row with a race row under it per race, each with its own MMR, seed, state and actions; the ban sits on his row alone, and a drag moves his races together. The MMR strip above the list is `DivisionBracketing`: its bands ascend where the divisions descend, and each band wears one step of the `heat-*` scale, because a division is a band of amounts and not a category. A phone drops the table for one card per entrant with the name, the race, the MMR and the chips. A team entrant reads as the team name with its roster under it: every member the team is rostered with for this event, through `PlayerName` on the race he signed up on, the captains marked with `mdi-star` in `primary-text`. Its MMR is the mean of those ratings, so the battle tag, Discord and W3C columns read an em dash, because a team carries no identity of its own. The Add dialog's team picker names the roster size of each team, and says which teams this event holds no roster for.
- A KOTH night is drawn as one `BracketCard` per bracket, weakest bracket first, on the one board read, and the run page and the public page draw the same card: a `banner` title bar with the bracket name and its MMR band, the throne, the series it plays now, the line waiting, the players who left and what the bracket played tonight. The throne is `mdi-crown` in `primary-text` over the king's player line and "Holds the throne", or `mdi-crown-outline` over the king from the last event and "King from last event, defending", or "No king yet". A queue row is one PLAYER with one place in line: the number, the player line, and under the name, at the indent of the race rows, a `play` chip while he is in another bracket's series, one line per race he holds in this bracket, and one muted "<Race> · left tonight" line per race he left here while another race of his stays; "Players who left" lists only the players who hold no place on the card, by name and the races they left on; a race the board answers no rating for wears the games mark in `error` beside its race name, as a name line wears it, and its MMR slot stays empty, and the name line wears that mark beside the name only when no race of his in this bracket holds a rating. Every other player line of a KOTH night — the throne, the defender, the open series, a played row, a player who left, the pass-the-crown list, the pair the close names and the strip of players waiting for a bracket — wears the same mark beside the name whenever the board names no rating, and a line that names no race reads "No W3C stats found". A long name truncates, so no control of the row leaves the card. Whatever comes first under the throne stands 12 px off its line. A played row reads "<winner> beat <loser>" with a `win` square, no score, because a best of one has none, a quiet "Forfeit" after the loser when he left the night, a crown where the throne moved or was held, and a "Replay" chip that opens the series. The public card carries no control at all. `next/src/components/koth/BracketCard.tsx` holds the card and its pieces; `next/src/helpers/koth-board.mjs` holds the band, the default pair, the start text, the place word and the throne word.
- An archived KOTH night, one whose board answers `historical`, is drawn by `HistoricalBoard`: one card per source bracket with its literal name, and the same head, throne and played list that `BracketCard` draws for a closed night. The throne is `mdi-crown` in `primary-text` over the reported king and "Held the throne at the end", or `mdi-crown-outline` and "No king recorded". Each BO1 is a played row in play order, "<winner> beat <loser>" with a `win` square and no score, because a best of one has none. A winner the play order infers wears `mdi-crown` in muted ink at the end of the row, and its tooltip reads "Inferred from the play order"; a recorded winner wears no mark. A series with no result reads "<a> vs <b>" with a `draw` square, and "Forfeit" in muted text where the order reads one; a review reason is an `mdi-information-outline` with the reason as its tooltip. An archived name is the written name alone, with no flag, race, rating mark or link, until an account claims it. Every mark carries its own hover, so the board draws no legend. Event videos are outline chips with `mdi-youtube` over the brackets.
- `/koth/nights/:id` is the night's run page, admin only. Its header reads the night's status as a tonal chip, "Not started" with no colour while no series exists and the start lies ahead, "Running" in `primary`, or "Closed" in `draw`, then the count of signups, "Signups open" in `success` or "Signups closed" with no colour on a night not closed, and "Not published" with no colour on a night nobody published. It carries "Open stream view" and "Copy signup link" on any night that is not archived, as the night page does, one "Add player" on a night that is not closed, because W3Champions picks the bracket and no card owns the late arrival, and "Edit details" (`mdi-pencil`). It hangs the admin controls on the same cards: the card face carries two controls with no open series and four while one runs. One filled button starts the next series and names the pair, "Start A vs B"; clicking two queue rows picks that pair instead, which the button then names, and a pair that leaves the king out reads "The crown stays with <king>." under it. A bracket that plays a series draws no start button, so its queue takes no pick at all, and a pick already made there clears with the next board answer. A running series takes its winner on two filled buttons of equal weight, one per player, over a quiet "Cancel this series". A queue row carries a drag handle, two `icon-xs` step buttons that are its keyboard and phone route, as the entrants list does, and one remove, "Remove <name>", which takes the player out of this bracket on every race he holds here. A drag counts only on the card it started on, so a row dragged over another card shows no drop. "Move to" is a small outline button that opens a menu of the other brackets by name and moves one race row, which stands last there: a one-race seat carries it on a line under the name, so the name keeps its room, and a seat on several races carries it on each race row. A seat on several races reads "Plays next as" over its race rows, which are radios (`mdi-radiobox-marked`, `mdi-radiobox-blank`) for the race the next series takes, and each race row carries its own remove, "Remove <name>'s <Race>". The king carries "Move to" the same way, under "Step down" on one race and on each race row on several; his move asks first in "Move the king", which says the throne goes empty and that a bracket with no series after it has no champion tonight and no king from last event next time. Only the race that wears the crown asks; another race of the king moves like any row. A muted "<Race> · left tonight" row in a seat carries "Put back" for that one race; a "Players who left" row's "Put back" restores every race he left on. After each "Put back" an icon button, `mdi-delete-outline` in muted ink with the `aria-label` "Delete signup, <name>" and a tooltip, asks first under a `bg-error` title, "Delete <name>'s signup?", names the races, and deletes the signup of those rows; a row that is a side of a series tonight keeps an empty slot of the same size there instead, so the "Put back" buttons stay in one column. A played row carries two: "Add replay" and "Change the winner", each an icon button with an `aria-label` and a tooltip. The Unplaced strip sits over the brackets and gives each signup with no rating the games mark, three equal outlined bracket buttons, and an X that asks first, "Remove <name>? An unplaced signup cannot be put back.", and deletes the signup The step-down panel offers "Leave the throne empty" or "Pass the crown to" with one pick, and its one filled confirm names the outcome. The close confirm names each bracket's king and its played count, names every series it deletes as two player lines, and says the standing kings start the next event as King from last event. "Edit details" opens the Event Details dialog, a form dialog, which holds Name, Date, Start time, Stream link, Page link and the "Signups open" and "Published" switches. Its footer carries a ghost "Delete event" in `error` on the left, which closes the dialog and opens the confirm that deletes the night, then "Cancel", which discards the edits, and one filled "Save", which writes only those fields through `PUT /events/{id}` and closes the dialog; a refused save keeps it open with the error inside it. One card stands over the bracket cards: the Bracket Bounds card is the `DivisionBracketing` strip: one dot per rated race row of the board, the cuts at the lower bound of every bracket but the weakest, and one filled "Save the bounds" that writes `PUT /koth/nights/{id}/bounds` and takes the board it answers. The strip is off on a closed night only, so the bounds move while a series plays. A save moves each placed player by the rating he was placed with, players who left included; both players of a series on the table keep their bracket, also after it ends, and a player placed by hand never moves. A muted line by the button says so: "A save moves players by the rating they were placed with. Players in a series or placed by hand stay." An archived night's Brackets card draws no strip and lists each bracket's literal name, because its bounds are the source's words. Besides the stream view, the page carries no link to the public page; View As guest is how an admin reads it.
- Every KOTH night has one public page, its event page `/events/:id`, and any reader opens it. It draws the event header, then `HistoricalBoard` for an archived night, or `KothNightBoard` for any other: a row with the sign up button while signups stand open, the withdraw buttons until the night closes, the entrants chip and an outline "Refresh" (`mdi-refresh`), which reads the board again and spins while the read runs, a quiet read-only strip over the brackets, "Waiting for a bracket", which lists the players no bracket holds yet with their marks and the line "An admin places these players." and shows only when that list is not empty, and the `BracketCard` grid with no control. A signed-in reader reads one `info` chip, "You are third in line", on his own row, beside his name or under it when the name needs the room, and "You are playing now" on his own side of a series on the table, on his line or under his name, never beside "vs" or the other player; a race he plays there is one he holds, so its withdraw button stays and the signup does not offer it again. A withdraw asks for a confirm. A race he plays at the table, or any such race when the withdraw names none, reads "Withdrawing forfeits the match you are playing."; otherwise a king's confirm reads "Withdrawing forfeits your next match." when the withdraw names no race, or takes his crowned race and leaves him no other race in that bracket; a king with another race there passes the crown to it with no forfeit A guest sees "Sign up" too while signups stand open on a night whose policy is `anyone`, and signs up by battle tag and race; he gets no withdraw button and no place chip, the button stays after his signup, and his end state adds "Sign in with Discord to see your place and withdraw." `canSignUp` in `next/src/helpers/koth-board.mjs` is the one rule for the button. An admin also reads "Run the event", a link to `/koth/nights/:id`, and two outline buttons of the same size: "Open stream view" (`mdi-monitor`), a link that opens `/events/:id?mode=clean` in a new tab, and "Copy signup link" (`mdi-link-variant`), which copies the absolute `/koth/dashboard` URL, the stable link that always opens the current event where players sign up, and reads "Copied" for two seconds, or shows the URL selected in a read-only field when the browser refuses the copy. `?mode=clean` is the stream view: it drops every control and the strip, cuts the app bar down to the app title and the theme switch, with no nav and no account menu, drops the page footer and the "Replay" chip of a played row, because nobody clicks a link on a stream, and grows the card face and every small label on it one step, so the page can sit in a stream. `/koth/dashboard` reads `GET /koth/board` and lands on tonight's night page, keeping `?mode=clean`; while no night is open it reads the empty state "No KOTH night is open". The night page reads the board on load, on "Refresh", and when its tab becomes visible again, at most once every 15 seconds and while the night is not closed; no timer runs. The run page reads it once, on load, and a reload shows new results. The clean stream view reads it again every 30 seconds while visible and while the night is not closed. A signup reads the board once, fresh: the dialog reads it for its end state and hands it to the page. The public read carries no token, so the edge caches it for 15 seconds and every reader shares that answer; the run page's read carries the admin token, which the edge never caches, so it answers fresh after a write.
- The player page's Events section is one accordion row per event the player took part in, of any kind, newest first: the event label, the kind as a small outlined chip, the dates, and one chip for the result — Champion, else the placing once the event is over, else the state. A GNL row carries the team, the race, the series record with its round strip, the ladder record and the MMR, and opens onto the round cards or the series by round; every other kind opens onto its placing, the series still to play and a link to its event page. `next/src/helpers/player-events.mjs` builds the rows from `GET /users/{id}/history`, which answers every kind. On the owner's own page tonight's KOTH night joins the list: `foldNight` in `next/src/helpers/koth.mjs` rides it on his own row once he entered it and leads the list while he has not, and the row wears `mdi-crown` with the night's state, the races he entered on, and the one action word the member read picked.
- A result bar or square uses `win` and `loss` only; a draw or no result uses `draw`.
- The head to head card counts every kind of event. Its events column and its meeting rows print `eventLabel`, and a cup, a KOTH night and a signup event wear a small icon (`mdi-tournament`, `mdi-crown`, `mdi-clipboard-text-outline`) with the kind as the title; a GNL season wears none, because its label already says so.

## Views for everyone

Most people who use the app are players and captains, not IT or data specialists. Every view follows these rules:

- One view serves one task. Its title names the task ("Plan Round 3 Lineup"), not the data it shows.
- The next step comes first, as the one filled button. Everything else sits below it or behind a "More" link.
- Plain words only. An internal term (draft series, promote, entrant, seat, a phase code) never reaches the page. A status is a short label with a colour and an icon, never a raw value.
- Show, don't tabulate. A status chip, a progress step or a card comes before a table. A table is used when comparing many rows is the task.
- No new UI library and no decoration beyond the components in "Shared components".
- An empty list says why it is empty and what happens next. A disabled button says why it is disabled.

### Phone support

Every view is built for a phone (390 px wide) and a desktop in the same pull request. Each view states one of three levels in its `docs/okf/pages/*` concept:

| Level | On a phone |
|---|---|
| Full | Every action works. |
| Read on phone | The status is readable; the editing part shows `DesktopOnlyNotice` above it. |
| Desktop only | Only `DesktopOnlyNotice` shows (`desktopOnly`). |

`next/src/components/DesktopOnlyNotice.tsx` is the one notice for both lower levels, so every task says it in the same words and offers the same copy-link button.

### Navigation

The nav is built from the hats a session wears (`next/src/helpers/nav-model.mjs`): a player, a captain and an admin can be one person, and each hat adds its own links. The tabs are Home, My Stats, My Team and Admin, each only for the hat the person wears; a player sees Home and My Stats alone, and every shared page is reached through the Home panels. From 960 px the tabs sit in the top bar, below it in a bottom tab bar; there is no drawer. Admin pages sit in the admin frame (`next/src/components/admin/AdminFrame.tsx`), whose sections come from `next/src/helpers/admin-nav.mjs`.

## Patterns

- A card title bar and a dialog title bar are `banner bg-banner` with a `text-primary` title at 1.25rem. A dialog that deletes something uses `bg-error`.
- A filled button marks the one next action of its surface; every other button on it is outlined or quiet. Choices of equal standing wear equal buttons.
- A dialog is a full-height sheet under 768 px and a centred panel above it. A confirm keeps the centred panel at both widths, its height its content, so the form it asks about stays in view: pass `dialogCompact` from `next/src/components/ui/dialog.tsx` on its `DialogContent`.
- Gold text on a tab, a toolbar button or a card action button uses `primary-text`, because light `primary` is 1.5:1 on `surface-light`.
- The sorted column title of a table is in `primary`. An unsorted sortable column shows a faint sort icon.
- A table wider than its card shows a shadow at the hidden edge.
- A card pads its content with 16 px, the value `--card-spacing` holds. A card marked `size="sm"` pads with 12 px. A card whose content runs to its own edge, a full-width table or list, pads with none.
- A cell the reader cannot use wears a 45° hatch, the `.hatched` utility in `globals.css`, so it reads apart from a plain fill in both themes.
- The Settings page `/config` is one card of six sections, each an `Accordion` header that opens and closes, all closed on load so the page reads as a list of headers. A failed save opens the sections that hold unsaved edits. The Save settings and Reset buttons sit outside the sections and always show, and the About settings card folds the same way.
- A control draws no default before its data arrives. Until the data lands the control is inert: a skeleton, or a disabled control with `aria-busy`, so a tap cannot write a value the reader never picked.
- A value the reader cannot edit is drawn as a disabled field or as plain text, never as a focusable read-only input. The one exception is the text a refused copy shows selected, so the reader copies it by hand.

## Data display

This section states how the app picks a figure, a mark or a chart, and which piece already draws it. The words of a figure are in "Words on the page". The mark rules are in "Charts". An agent loads the `dataviz` skill and the `frontend-design` skill before it draws data, and this file outranks a general rule of a skill.

### Pick the form from the question

Start from what the reader of that page wants to decide. Then pick the form. Pick the colour last. When one figure answers the question, print the figure and draw no chart. Reuse the piece in this table before you draw a new one.

| The reader asks | Form | Piece |
|---|---|---|
| How did a player or a team do? | A record figure | `record` in `next/src/helpers/figures.mjs` |
| How did each round go? | One square per round, with the record beside it | `next/src/components/RoundStrip.tsx` |
| How do two players stand against each other? | A score and the last meeting, the meetings on demand | `next/src/components/HeadToHeadCell.tsx` |
| Who fits against whom by MMR? | Every player on one linear MMR scale | `next/src/components/DivisionBracketing.tsx` |
| Which pairs could play this round? | A list of pairs sorted on several criteria at once, each side's facts beside its name | `next/src/app/(app)/match/[id]/plan/MatchupTable.tsx`, `PlayerBlock.tsx` |
| How does a rating move? | A line on a date scale, in a plot of its own | `next/src/components/ladder/LadderPlots.tsx` |
| How much did a player play, day by day? | Stacked win and loss bars. In a table, a small row of bars on one shared height | `LadderPlots.tsx`, `next/src/components/ladder/LadderDayBars.tsx` |
| When are games played? | A heat map in one hue | `SeasonReportView.tsx` |
| What share was won? | The record with its percent. No bar | `record` in `next/src/helpers/figures.mjs` |
| How does a player do against each race? | A race icon and a record per race | `next/src/components/VsRaces.tsx` |
| Which MMR does a player hold? | One chip per ladder race | `next/src/components/RaceMmrChips.tsx` |
| When can two players meet? | Half-hour cells, the pick as a point | `next/src/components/player/ScheduleDialog.tsx` |
| Could two players meet, before a series exists? | Half-hour cells, a time column per clock, each player's blocked hours in their own half | `next/src/components/AvailabilityCalendar.tsx` |
| One headline number | A stat tile: the figure, its label, its scope | `SeasonReportView.tsx`, `TeamView.tsx` |

### Name the unit and the scope

- A figure stands beside the word for what it counts, close enough that a crop of the figure still shows the word: "Series record 5 – 2", "Games record 11 – 5 (69%)", "Ladder games 234 – 298 (44%)". A bare pair of numbers is a bug.
- `record` takes wins and losses alone, so the surface names the unit and the scope: this event, every event, or one W3Champions season. A ladder count always names its W3Champions season. The app prints no all-time ladder total.
- Name the Gym Newbie League in full or as GNL. "The league" alone is the general term: the GNL and King of the Hill are both leagues.
- The full list of the pieces that show data, with when to use each one, is `docs/okf/concepts/data-pieces.md`.

### Give each colour one job

| Job | Tokens | Rule |
|---|---|---|
| A result | `win`, `loss`, `draw` | The only colours of a result mark. |
| An identity | `race-*`, `tier-*`, `side-*` | A race colour is a stripe beside the race icon. A tier colour is a labelled chip. A side colour fills its own half of a calendar cell, under a legend that names the player. |
| An amount | `heat-1` to `heat-5` | One hue, light to dark. |
| A state of the app | `error`, `warning`, `info`, `success` | Never a chart series. Always with an icon and a label. |
| A control | `primary`, `secondary` | Never a data mark. |

The `dataviz` skill ships a palette validator, `validate_palette.js`. It measures how far apart two colours stand, as ΔE, for full colour vision and for three kinds of colour blindness. A pair passes from ΔE 15 for full vision and from ΔE 8 for a colour-blind reader. The measured values of this palette:

| Set | Light, on `surface` | Dark, on `surface` | Result |
|---|---|---|---|
| `win` with `loss` | 29.1 full vision, 21.4 colour blind | 32.2 and 25.8 | Passes. |
| The four `race-*` | 19.6 and 8.7 | 20.3 and 11.8 | Passes as a set of four. |
| The four `race-*` with `win` and `loss` | | 10.7 and 1.5 | Fails. A race colour and a result colour never share one set of marks. |
| The six `tier-*` | 13.0 and 3.7 | | Fails. A tier is always a chip with its label, never a bare mark. |
| `primary` with `loss` | | | Not measured. Gold is chrome and the amount hue, never a mark beside a result. |
| `side-1` with `side-2` | 26.8 full vision, 21.5 colour blind | 25.4 and 21.9 | Passes, each at 3:1 or more on `surface`. |
| The two `side-*` with `success` | 18.4 and 7.4 | 17.3 and 7.3 | Legal only with a second channel: an hour free for both is a pale tint over the whole cell, a blocked hour a solid half, left for the first player and right for the second, and every cell names itself in its title. |

### A player has many races

- A race is never a fixed property of a player. It belongs to a ladder season, to the signup of one event, or to one series. A player may sign up with another race for the next event.
- A player holds one ladder row per race per W3Champions season, in `w3c_stats`. No surface reduces a player to one race or to one MMR without the race of that MMR beside it.
- Three race facts exist, and a surface names the one it shows. The row's race is the race of this game or this series. The signup race is the race of one event entry, and the MMR of the player line reads that race alone (`next/src/components/PlayerName.tsx`). The profile race is one value the player declared, and it is a fallback only.
- `RaceMmrChips` draws one chip per race with ladder games, sorted by MMR from high to low. A race without games draws no chip. A row from an older season carries its season, "S22".
- A race icon needs a race source for its row: this game, this scheduled series or this signup. With no source, the row draws no icon.
- `next/src/helpers/w3c-stats.js` reads the rows. With no race it answers no MMR, so a surface without a race prints no number.

### A win rate gets no bar

- The record carries the percent, so a bar beside it says the same thing twice and invites a comparison of bar lengths between records of very different sizes. Add no new bar for a win rate. A bar is for an amount against a maximum, such as points against the top team.

### Show a result from the reader's side

- A result seen from one side puts that side's score first and draws the score in `win`, `loss` or `draw`. The order of the score is the second channel beside the colour (`next/src/components/player/RoundCards.tsx`).
- A result never wears an alert icon and never the words "You won" or "You lost". An alert icon is for a fault or a call to action: too few ladder games, no W3C stats, a replay on another map than the veto gives.
- A rule that the data breaks warns and never blocks. The warning names the figure: "3 over the largest difference".
- Urgency is information, never weight. The order of a list and one chip carry it.

### Move figures, not rows

- One screen reads one aggregated answer. The draft board is one read. The roster matrix uses the team read it already holds.
- The server sends the figure. The browser may sum figures and never computes a rule: points arrive per series, and the MMR at the time of a series arrives from the server.
- Detail loads on demand. The meetings of a head to head load when the reader opens them.
- A slow read carries cache headers.

### Rules the code follows everywhere

- The body rule in `globals.css` sets lining, tabular digits for every number. `.tnum` repeats it where a component resets the font. So a missing `tnum` is no fault, and a numeric column that is not right-aligned is.
- In the light theme, `win`, `loss` and the four status tokens name no `on-*` ink. `palette-style.ts` gives each of them white (`#FBF7F1`), which passes 4.5:1 on all six, so `bg-win text-on-win` is safe in both themes. The light `draw` names ink.
- A read that failed is not an empty list. An error draws `StatusAlert`, and the empty sentence shows only after a read that worked.
- A tap on a mark opens its tooltip and never follows the link of its row. `RoundStrip`, `PlayerName` and `FlagIcon` stop the event.
- A card of players is as synced as its least synced player: `TeamRoster` prints the oldest sync time of the card.
- A tonal chip is the token as text over a 12% wash of the same token (`next/src/components/ui/tone.ts`).
- The measured colour values of this section have no test behind them. `pnpm test` checks ink contrast only. Measure again when a mark colour changes.

### The public league site

The public league site, the `wc3-gnl-website` repository, shows the same league data. A reader who moves between the two sites must find one way to read a record, a result and a race. The two sites share these exact values: the dark grounds, gold `#E7B643` with `#1A140C` ink, the embossed gold button, the dark banner with a gold title, the gold amount ramp, `win`, `loss`, `draw` and the four `race-*` tokens, and the faces Cinzel, Cardo and Lato. The maintainers decided this data language on 27 September 2026. Propose a change to a rule of this section to that repository too.

The validator of the `dataviz` skill passes both sets on both grounds. The Bold races in dark: colour-blind ΔE 11.8, full vision 20.3; in light 8.7 and 19.6. Win and loss in dark: 32.2 and 25.8; in light 29.1 and 21.4. A race colour and a result colour never share one set of marks.

## Charts

- Use d3 to compute scales, paths, axes and drag. Draw the marks in JSX.
- Size an SVG in real pixels from its container. A fixed `viewBox` stretches the text on a wide card.
- An SVG attribute cannot take a utility class. Use `rgb(var(--v-theme-<token>))`, as `ladder-days.mjs` and `DivisionBracketing.tsx` do.
- Give a plot one y-axis. Two measures on different scales go in two plots.
- Draw axes and grid lines in `on-surface` at a lower opacity. A label that names a value can use full `on-surface`. Never draw text in a series colour.
- Draw lines 2 px wide. Give a dot a 2 px ring in `surface`. Leave a 2 px gap between stacked bars.
- A scale of amounts uses one hue from light to dark, like the `heat-*` tokens.
- A legend holds only the marks that carry no hover of their own. A mark the reader can hover for its own label needs no legend row.
- A value a hover shows is also open to a tap and to the keyboard. A tooltip opens on a tap (`next/src/components/ui/TapTooltip.tsx`). A strip of marks is one keyboard stop, the arrow keys walk its marks, and each mark carries its text as its label, as `RoundStrip` does.
- A scale a reader compares across draws its grid lines and its tick labels, as `DivisionBracketing` does. Marks that share a scale share its maximum, so two rows of bars compare.
- League MMR runs from about 120 to 1780, with the middle near 1200. Sample data and scale bounds stay inside that range.

## Light and dark

- The app bar menu offers light, dark and system. The choice is stored in `localStorage` under `theme`.

## Add a colour

1. Add the token to both themes in `palette.mjs`.
2. If text sits on the colour, add an `on-<token>` ink to both themes.
3. Run `pnpm test` from `next/`.
4. Open the page in light and in dark, and look at it.

The test checks three things. Every declared ink passes 4.5:1 on its fill. A form label passes 4.5:1 on `surface`, `background` and `surface-light`. Dark `error` stays apart from `loss`. It does not check that a new chart colour stays apart from its neighbours for a colour-blind reader. Run the validator of the `dataviz` skill for that, once per theme, with every colour of the set the new colour joins: `node validate_palette.js "<hex,hex>" --mode light --surface "#F4F5F1" --pairs all`, then `--mode dark --surface "#232420"`. Write the measured values into the table of "Give each colour one job".

## Known gaps

These parts of the app break a rule above today.

- In light, `win`, `loss`, `error`, `info`, `success` and `warning` name no `on-*` ink. A fill of one of those names picks its text colour by hand.
- Status colours mark things that are not app states. The fantasy week rank chips use `success`, `info` and `warning`. Bench points use `warning`.
- The fantasy bet-points chip colours its text in `win` or `loss`.
- `LadderDayBars` is a fixed 224 px wide. Its stacked bars have a 1 px gap.
- The result score of a round card names no outcome for a screen reader. It carries no "Won 2 – 1" or "Lost 1 – 2" as its title and label (`next/src/components/player/RoundCards.tsx`).
- The day bars and the MMR line of `LadderPlots` and `LadderDayBars` answer a hover alone. They have no keyboard route. The same holds for the heat cells and the day bars of the season report, the cells of `AvailabilityCalendar`, which carry their clocks in a title, the dots of `DivisionBracketing`, `TrophyIcon`, and every `TapTooltip`, whose trigger is a `span` and not a button.
- `LadderPlots`, `LadderDayBars` and `DivisionBracketing` carry no name for a screen reader.
- No shared piece draws a result chip, a points pair, a stat tile or the result legend. Nine surfaces write their own `bg-win` and `bg-loss` chip, six write a points pair or a series score by hand, in three forms, and three write the result legend.
- `primary` draws data in the games-per-day bars of the season report, `BadgeRarity`, `LadderLeaderboards`, the first row of the ladder table and the race rank badge of `FantasyScoreBreakdown`. `tier-5` draws achievement points in `LadderLeaderboards`.
- A status token carries a data value, not a state, in the rank scale of `FantasyScoreBreakdown`, the points badge of the season page, and the ban and pick marks of `VetoBoard`. `secondary` marks data in four more places.
- Coloured text carries a result outside the two exceptions: the weekly net and the bet results of `FantasyScoreBreakdown`, and the record chip of the head to head table. `win` and `loss` also colour a rating change, which is not a result.
- The random stats page and `MatchupCompare` show ladder figures with no W3C mark and no sync time.
- The fantasy leaderboard and the ladder table do not right-align their numeric columns. The team page prints "0 – 0" for a round nobody played. The fantasy bets page writes a series score with a colon, and the fantasy dashboard sends a series score through `record`.
- The "Edit profile" dialog still offers one race per player, and `PlayerHeader` and the games mark still fall back to it. That profile race is a legacy value, and no new data display reads it.
- A win rate still gets a bar on the race cards of the season report (`RateBar`) and in the per-race table of `PlayerLadderTab`. A bar for a win rate is discouraged, by the maintainers' decision of 20 September 2026.
- The dots in `DivisionBracketing` have a 1.5 px ring. A pinned dot's ring is `on-surface`.
- The games mark the `games` prop draws holds a fixed twenty-game rule over two W3C seasons. The event settings carry a games floor and the number of W3C seasons it counts over, and that mark reads neither. One of its two surfaces, the players page, pairs nobody (`next/src/helpers/games-rule.mjs`). The mark the `warning` prop draws reads the event's own rule, because the board read applies it.
- Some surfaces still print a synced time without the W3C mark, while the match page and the roster head draw it: the player header prints the time as a caption under the MMR chips (`next/src/components/player/PlayerHeader.tsx`), the entrants table reads "Read from w3champions ..." or "Never read from w3champions" (`next/src/app/(app)/events/[id]/entrants/EntrantsView.tsx`), and the season assign page and the season team page print the time with a tooltip alone (`next/src/app/(app)/seasons/[id]/assign/SeasonTeamAssignView.tsx`, `next/src/app/(app)/team/[id]/season/[season_id]/SeasonTeamDetailsView.tsx`).
- Only the report confirm and the publish-draft confirm pass `dialogCompact`. Every other confirm, `ConfirmDeleteDialog` among them, is still a full-height sheet under 768 px, and seven places ask through the browser's own confirm instead of a dialog, "Sit out all remaining rounds" on the captain check-in page among them.
- The report dialog names the map each game plays as "the veto" even where no veto gave it. The map a game wants falls back to the map the series carries, so a series with no veto recorded can warn that "the veto gives game 1 <map>" (`next/src/components/ReportResultDialog.tsx`).
- `FORMATS` in `next/src/helpers/event-labels.mjs` holds no captain-draft format, so nothing prints "Captain draft" yet.
- Cards that pad other than 16 px: `UserGuideView.tsx`, `LoginView.tsx`, `AdminLoginView.tsx` and `DiscordJoinCard.tsx` pad 24 px; `LadderView.tsx` pads 32 px; `MatchRoundNav.tsx` and `SeasonTeamAssignView.tsx` pad 12 px; `SeasonDetailsView.tsx` pads 8 px on its action row; `SeasonAchievementsView.tsx` pads 8 px top and bottom.
- The series page cannot name a team side of a bracket series. `SeriesPublic` carries the players and the fixture alone, so `GET /series/{id}` answers no entrant and no team; a series inside a fixture reads them off the stage read instead, and a bracket series with no fixture still reads "To be decided" until that payload carries them.
