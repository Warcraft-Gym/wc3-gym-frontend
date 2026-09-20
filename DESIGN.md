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
- Text wears a text token. A result, a tier or a race gets a small coloured mark beside the text, not coloured text. Two exceptions, where the figure is itself the mark: the score of a result seen from one side wears `win`, `loss` or `draw`, and a wins count and a losses count may wear `win` and `loss` in a column of their own or inside a record, because the column title or the order of the record is the second channel.
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
| `win` | `#1F63A6` | `#4F95D8` | A won game, series or bar. |
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

The race and medal tokens are used on the season report. The `heat-*` ramp fills the heat map of the season report and the division bands of the entrants page. The Random race uses `draw`.

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

A large number on a card uses Alegreya Sans 500 at the `.text-h2` size. The heading serif at 800 looks playful at that size.

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
- A player answers his own round with two buttons, "Check in" and "Sit out"; a captain answers for a player from a row menu. The status reads "Checked in", "Out", "Out (blocked times)" or "No answer". Never "can play" or "can't play".
- A record reads wins then losses around an en dash with one space on each side: "19 – 11 (63%)" from ten played up, "3 – 1" under ten, an em dash when nothing was played. Never "19/30". One helper writes it, `next/src/helpers/figures.mjs`. A points pair wears the same spaced en dash, "1 – 3", but it is not a record: it takes no percent and it prints its zeroes, so the surface writes it and the helper does not. No bar in a cell, no footnote, and no "won" and no W or L letters in a cell, because the column title carries them.
- A series is a best of three; a ladder game is one game. A column title, a caption and a tooltip name the one they count and never mix them.
- A head to head reads as the score in the pairing's order with the last meeting after it: "2 – 1, last met Season 18".
- The app shows no win chance for an MMR or for an MMR difference over the whole population. A figure counted from one player's own games is fine.

## Shared components

Use these instead of drawing the same thing again.

| Component | What it shows |
|---|---|
| `PlayerName` | A player as flag, name, race icon and MMR. It reads the MMR itself; pass `mmr={false}` where a column of its own sorts by MMR, a number where the surface already holds one, and `games={w3cSeason}` on a draft surface for the games mark, or `warning` where the read the surface already made applies the event's own games rule. It links to the player page. On a drafting page and inside the side panel, it opens the panel instead and shows a dock icon. Inside a form dialog, pass `plain`. On one line that stands alone, pass `noFlag` so a player with no country leaves no flag gap. |
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
| `BracketCard` | One bracket of a KOTH night: its throne, the series it plays now, the line waiting and what it played tonight. The run page passes its admin controls; the public page passes none. |
| `SeriesActionBar` | The steps of one series as buttons, full or compact. A step already taken reads as a quiet fact before the buttons. |

- The player line is flag, name, race icon, MMR, with one 6 px gap between every part, and the MMR reads at every width. A captain shows his race and his MMR only when he plays in that event. This plain line is the default on every surface.
- The MMR is the W3C ladder MMR of the race the player signed up on, read by the line itself from the `w3c_stats` the payload already carries, so no surface asks for a number of its own. A series row is the exception: the series reads name `player1_mmr` and `player2_mmr`, the rating on the race the row plays, and the surface passes that number in, because the row's player carries no stats. A player with no stats in the payload, and a row that names no rating, end the line after the race icon: no dash, no placeholder. A table that sorts by MMR keeps its column and passes `mmr={false}`, so the number never reads twice in one row; a ladder table keeps its own MMR and +/- columns, which come from the ladder history and are a different figure.
- A sorted roster aligns race and MMR in tracks, while a free-standing player line runs inline with one 6 px gap.
- The round strip is one 12 px square per round of the event, drawn by `RoundStrip`: `win` for a round the player won, `loss` for one he lost, a square split down the middle for a round he won one series and lost another, a dashed outline in `foreground` for a series still to play, a quiet `border` square crossed by a diagonal in low-emphasis ink for a round he sits out, and a plain quiet `border` square for a round with no series. A series of a round wins over the out mark, because a round that was played shows its result. The mark names the winner of the series only, so the strip reads the same for best of 1, 3 and 5. Its tooltip names the round and the margin, "Round 3 · Lost 0 – 2", then the opponent as a player line; a round with two series lists both, and a round sat out reads "Round 3 · Sat out". The crossed mark carries its own hover, so the strip needs no legend row. The text record "2 – 1" sits beside the strip in `win` and `loss`, so colour is never the only channel, and a phone drops it and keeps the strip. One strip is one keyboard stop: the group carries the name "Won 2, lost 1, played 3 of 7 rounds" and the arrow keys walk its marks. It shows on the team page roster and on the player page's Events row.
- A second version of the player line puts the games icon before the flag: a warning triangle when the player is under the event's games rule, with the count in its tooltip, and the same mark in `error` when W3C holds no stats for him. It shows only on the surfaces that pair players in an event that sets a games rule. `games={w3cSeason}` works the rule out in the browser; `warning` takes the mark a read already worked out, which is how the round draft board draws it. A line that meets the rule keeps an empty slot of the same width and height, so the flags stay in one column and the rows keep one baseline. A line that stands on its own, not in a column of player lines, keeps no slot, so its flag lines up with the caption under it. It is never the default, because the icon is noise on a surface that does not pair players.
- A team is drawn as its logo and its name, and the name links to the team page. A team with no logo shows a neutral placeholder of the same size, so the names in a column stay aligned. A long name truncates and carries the full name in its title.
- On a drafting page, the match page and the season assign page, and inside the player panel, a team name is plain text with no link, for the same reason the player name is there: a link would leave unsaved work.
- One shared action bar carries the steps of a series, in order, with the words "Schedule", "Veto maps" and "Report result"; the report step reads "Edit result" once the series is scored. The full bar shows all three steps where the series is the subject of the surface: the "Waiting for you" list and the series page. The compact bar shows two active steps where a series is one item among many: the next step filled and the one after it outlined. In both bars a button keeps the word of its step, and a step already taken states what it left behind as a quiet fact before the buttons: the booked time, and "Veto done". A series that needs no veto leaves that step out, and a reported series keeps its result button alone. The player a side names, a captain of the team that fields a side, a member of the roster of a side that names no player, and an admin act on it, all through the same routes; another reader sees the steps without buttons. Once the booked time has passed the result is the next step, because a missing veto warns and never blocks. Its context label reads "League - Event - Stage - Round - Opponent", and a part the series carries no value for is left out with its separator.
- The W3C data line is the W3C mark and "synced 3 days ago", with the detail in a tooltip. It reads the same way everywhere in the app.

## Events

The events module names things the same way on every page. A league is what repeats. An event is one run of it that people sign up for: a GNL season, a KOTH night, a cup. A stage is one format over the entrants. A round is a dated window of series. A fixture pairs two teams in a round and holds series. A series has one opponent per side and a best-of. A game is one map. A division is a band of entrants that runs the whole event on its own and never merges. Never "week", never "team series", never "match" for a series; "match" stays only on the GNL fixture pages until they are redrawn.

- The team page tabs one event per row of `seasons_info`, each named with `eventLabel`, and links that name to the event page beside the season team page link. Both team pages read the roster of the tab from `GET /events/{event_id}/teams/{team_id}` and draw it with `TeamRoster`: one card, the captains and the members in one aligned list, the columns flag, name, race and MMR, and on `/team/:id` the points and the round strip too. The members run by MMR, highest first, a player with no MMR last, because the list carries no sort control. The column head, the MMR, "Points" and the round numbers, is drawn once for the card, on the head of the first group that lists rows, and "Captains" and "Members 7" stay row group heads. The MMR head is the W3C form with the synced time in its tooltip, the points head carries the note "Points from series in this event", and a long name truncates while the numbers never do. The points cell sums `player1_points` and `player2_points` over the series the page already holds, because the server applies the event's score system, and a player with no series reads an em dash. The rounds a player sits out come from the `out_rounds` of his `gnl_stats` row for this event, so the roster asks for no read of its own. A narrow screen drops the text record beside the strip before it drops the points. A captain shows his race, his MMR, his points and his strip only when he plays in that event, and reads "Not playing this season" across those columns when he does not, and he reads under Captains alone, so the members list and the member count leave his member row out.
- An event named outside its own pages carries its league: "GNL · Season 18". `eventLabel(event)` in `next/src/helpers/event-labels.mjs` prints it, and prints the name alone when the event has no league or the name already starts with the league's short name. It reads the league off `league_short_name`, or off a league row passed as a second argument, and off `season_name` for the flat trophy and head-to-head rows. A GNL season page wears the same `EventHeader` as every other event, so its `h1` is that label too, and the rounds and teams counts sit under it as small chips. The season team page keeps a plain `h1` of the team name with the same label under it.
- The event state is computed, never stored, and shows as one small tonal chip: signups open in `success`, check-in in `info`, seeded in `secondary`, running in `primary`, finished in `draw`, a draft with no colour. A GNL season answers its own four phases under `phase` instead: open in `success`, commenced in `primary`, overdue in `warning`, complete in `draw`. `STATE_LABEL` and `STATE_COLOR` in `next/src/helpers/event-labels.mjs` are the one source for both; `STATE_ITEMS`, the filter on the events list, holds the six event states alone.
- The event page lists every stage with its format, its best-of and its scheduling. Two settings count series and they never share a name: the event's `series_per_round` is "Series per fixture", which reads only on a team event, because a fixture pairs two team entrants; a stage's `series_per_entrant_per_round` is "Series each entrant plays per round", which reads only on a round robin. The stage table titles that column "Series per entrant" with the long name as its note, and every other format reads an em dash. `seriesPerFixture` and `seriesPerEntrant` in `next/src/helpers/event-labels.mjs` answer both, so the wizard, the event page and the run page print the same words. The stage format that pairs players by captain draft is named "Captain draft" wherever the app prints a format.
- The seed of a stage comes from MMR, a shuffle, a hand order, or the standings of the previous stage; the previous-stage button reads only on a stage that has one. A qualifier seeds from a parent event's field, which the model does not carry, so `SEED_SOURCES` leaves it out.
- The event page is open to everyone, and so are the events list and the league pages. It carries the one action the server picked for the caller: sign up opens the signup dialog, withdraw asks once, check in takes the entrant's own row, a caller who checked in reads a chip instead of a button, and view scrolls to the draw. A reader who is not logged in reads "Log in to sign up" in that place while the signups stand open. The signup dialog takes the race, and a battle tag only when the event takes anyone and the caller's account names no player; the eligibility warnings the API answers show as chips after the signup and never block it. A signup-only event asks for one more field, a note of at most 200 characters, hinted "What you want to work on".
- The home page is a hub of five panels: "Your series", "Next matches" and "Open signups" in a wide main column, the latest season's leaderboard and "Casted games" in a narrow side column. Below 960 px the two columns dissolve into one stack. One CSS order per panel drives both layouts, so a member with no series of his own reads "Open signups" first, the leaderboard second and his own panel third; `panelOrder` in `next/src/helpers/home-hub.mjs` is the one source of that order. The h1 is "Home" and carries no subheader, because the season context sits in the leaderboard title. While the page loads each panel draws its own skeleton rows under its real title, and its controls stay inert. The panels stand in the with-series order while the reads are out, so a member with a series of his own sees no panel swap when they land, and the leaderboard's skeleton title fills a whole title line, so its header keeps its height when the season name lands. The hub carries no admin card: an admin reaches season management and the round draft through the leaderboard's season link.
- A result on the hub follows "Show a result from the reader's side": the viewer's own score first, through `record` in `next/src/helpers/figures.mjs`, in the `win` token when he won and the `loss` token when he lost, medium weight, tabular, linked to the series, with the title and the aria-label "Won 2 – 1".
- The panels read four sources. "Your series" takes the member's next series and last result out of `GET /player-series`, one read per season `/me` names that has started, or the leaderboard's season once none of them has started and that season is complete, and offers the next series the compact action bar. "Next matches" and "Casted games" take the `next`, `casts_upcoming` and `casts_recent` lists of `GET /home/series`, one public edge-cached read per page load; a row states its time in the reader's zone, its "League · Event · Stage · Round" label, its two teams and its two players with the MMR the row names, and a side with neither player nor team reads "To be decided". That read keeps a started series for two hours, so a row whose time has passed reads "Started 20:30" in place of the day and time; `seriesWhen` in `next/src/helpers/home-hub.mjs` answers both forms, and a stream still to come under "Casted games" reads the same day and time, because a reader who wants to watch needs the start; a recording there names the day alone. `rowContext` in the same file joins the label parts with the middle dot `eventLabel` uses, so one hub screen names an event one way. A captain's fixture that still needs a draft leads "Next matches" as one row per event, from the `captain_fixture` of `GET /me/events`, and names its own event in a muted line over the two teams, because a captain of two events reads two "Round N" rows. "Open signups" takes the rows of `GET /me/events` whose signups stand open and the rows whose check-in stands open, and keeps the signup dialog, the GNL form link, the withdraw and the check-in behind the same controls; a row prints the play dates alone, below 600 px with the chip at the left of that line and the button beside the event name, and the rows read in the order the events start, because an event stores no signup close time. A member already entered reads one `success` chip, "Signed up as" with the icon and the name of every race of `entrant_races`, so a two-race entry names both races in that one chip. Every button there is outlined, because choices of equal standing look equal. The leaderboard takes `GET /events/{id}/teams/basic`, ranks on the season points and carries one "Series record" column beside them, the `series_won` and `series_lost` of that season's `seasons_info` row through `record`; the column head names the unit and its note names the scope, a figure never wraps and the team name truncates first.
- A failed read never prints an empty state. When `GET /home/series` or `GET /events/{id}/teams/basic` fails, the hub states it in the page's `StatusAlert` and the panel that read it prints one quiet line, "Could not be loaded.", in place of its rows, because "No series is booked" is a lie after a network error and a title over an empty strip reads as a broken card. The line states the failure; it is not an empty state.
- The event page lists its entrants under the stages: the name through `PlayerName` with the signup race, the seed once a stage locked its order, a withdrawn entrant in medium emphasis, and "No entrants yet" when nobody has entered. On an event that takes one entry per race, `byPlayer` in `next/src/helpers/entrants.mjs` prints a player once with one line per race under him, the entrants chip counts players, and a member already in reads "Enter another race" while a race is left to enter.
- A signup-only event plays no stage, so it is a sign-up list and not a draw. The wizard leaves its stages step out and writes an explicit empty stage list, which the API reads as no stage where a missing field writes a default one; its review names the shape as "No stages: a sign-up list". The event page drops the stage table, titles the card "Sign-ups", counts the entrants against the cap as "n of cap signed up", reads them in the order they entered instead of by seed, prints each one's note under the name and marks a checked-in entrant with a `success` tick. `stepsFor` in `next/src/helpers/event-wizard.mjs` and `bySignup` and `signupCount` in `next/src/helpers/entrants.mjs` answer all of it.
- A member's own blocks never refuse a round. When `GET /me/events` hints `blocked_by_blocks` for the next round, the event page shows one `info` chip, "Your blocks cover this round", beside one outlined `error` button, "Sit out", which writes the answer through `PUT /player-availability`. Every other hint shows nothing, because a hint the player has already answered has nothing left to say. `blocksHint` in `next/src/helpers/events.mjs` is the one source.
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
- Under the title of a series stand three facts, one per line at every width, each with its icon: the booked time on the reader's clock with `mdi-calendar`, the map the next game plays with `mdi-map-outline`, and the head to head with `mdi-sword-cross`. A fact the series names no value for is left out, and a series whose result stands draws no map line.
- The report dialog folds the veto away. One row, a button with `aria-expanded`, states where the veto stands and opens the board in place; it is closed when the dialog opens, in every state, and a series whose rules play no veto carries no row at all. A veto that is not complete adds a heading in `warning` with its icon over the row, because a banner body alone reads as a note; the dialog keeps one width in both states, and the report still saves.
- The schedule dialog draws the round window as half-hour cells, behind a labelled "Calendar / Day tracks" toggle: the calendar opens above the XS breakpoint and the day tracks under it, and one calendar page holds seven days, three under XS, with a pager over the dates it shows. A cell open to both sides is tinted; each side's blocked hours read apart by position, never by colour, the viewer's in the left half of a calendar day and in a strip over a day track, the other side's in the right half and in a strip under the track; an hour outside the window wears the hatch and takes no pick. The pick is a point, a stem across its cell with a dot at the cell's left edge, never a filled half hour. A pick inside a blocked hour names whose hour it is and books anyway, because the hours are a guide. Under the grid one aligned row a player names his zone, its GMT offset and the picked time on his clock, and the button reads "Book this time".
- The round draft board draws both rosters on one linear MMR scale: a low-emphasis grid line and its MMR every 200 in a gutter at the left edge, and a player with no MMR on a shelf under the scale. Picking a player tints the band of the working largest difference around him, labels its two bounds, and opens the panel of free opponents inside it. One legend line names the four marks that carry no hover of their own: the draft pairing line, the quieter published pairing line, the band and an already paired name. A player who sits out this round reads under "Sitting out" and an opponent another pairing holds under "Already paired". An opponent wider than the working value wears a "n over the largest difference" chip, and a player who already has a pairing takes a second one after a warning, because the board warns and never refuses. Under 960 px the scale would clip, so each roster reads as an ordered list of player lines and the panel takes the screen. A captain marks his own team ready, which reads as a `success` "Ready" chip on the team head; only an admin publishes, and "Publish and replace" names the booked time and the map veto the replaced series loses, read when the confirm opens, so a failed read blocks the publish.
- The run page is `/events/:id/admin`, admin only: one tab per stage, "Generate" while the stage holds no series, the same `StageView`, and "Advance" once every series carries a result. A result is entered game by game and the winners make the score. A walkover and a forfeit take a side picker. Reopening a series warns that it clears every side it feeds, and a reopen the engine refuses asks once more before it forces. A stage of format `koth` adds two buttons of its own: "Add challenger" picks one entrant no series names yet, each row a `PlayerName` with the signup race and his bracket and his MMR under the name, and appends him to the end of that bracket's chain; "Close the night" counts the unplayed series at the end of every chain and names the count before it deletes them.
- `/koth` is the KOTH nights list, admin only: every night newest first with its date and its state, each name a link to `/koth/nights/:id`, one "Settings" link a row to the event page, and "Open tonight", which takes the start time and the three MMR bounds the brackets open at, prefilled from the night before, and lands on the night's run page. A night is one event of the KOTH league, so the event page keeps its settings and the entrants page enters a signup by hand. The event run page of a KOTH night carries "Bracket MMR bounds" beside "Public page", and the entrants page of one draws no MMR strip, no division control and no seed control, because a division write rebuilds the brackets and a seed write reorders the queue the night is running; one line points at the night's run page instead.
- The entrants list is a `GroupedTable` grouped by division. An eligibility warning is a chip in `warning` with its reason as the label: under 20 games, over the MMR cap, banned. An identity that is not linked reads "Not linked" in medium emphasis, and the W3C column reads "Linked" as a link to the profile, because the W3C name is the battle tag the row already prints. A withdrawn entrant keeps its row in medium emphasis. The seed column reads the seed, and its source once the stage is locked; an admin drags a row to reorder the seeds inside its division. A player on more than one race is one row with a race row under it per race, each with its own MMR, seed, state and actions; the ban sits on his row alone, and a drag moves his races together. The MMR strip above the list is `DivisionBracketing`: its bands ascend where the divisions descend, and each band wears one step of the `heat-*` scale, because a division is a band of amounts and not a category. A phone drops the table for one card per entrant with the name, the race, the MMR and the chips. A team entrant reads as the team name with its roster under it: every member the team is rostered with for this event, through `PlayerName` on the race he signed up on, the captains marked with `mdi-star` in `primary-text`. Its MMR is the mean of those ratings, so the battle tag, Discord and W3C columns read an em dash, because a team carries no identity of its own. The Add dialog's team picker names the roster size of each team, and says which teams this event holds no roster for.
- A KOTH night is drawn as one `BracketCard` per bracket, weakest bracket first, on the one board read, and the run page and the public page draw the same card: a `bg-primary` title bar with the bracket name and its MMR band, the throne, the series it plays now, the line waiting, the players who left and what the bracket played tonight. The throne is `mdi-crown` in `primary-text` over the king's player line and "Holds the throne", or `mdi-crown-outline` over the king from the last event and "King from last event, defending", or "No king yet". A queue row is one PLAYER with one place in line: the number, the player line, and under the name, at the indent of the race rows, a `play` chip while he is in another bracket's series and one line per race he holds in this bracket; a race the board answers no rating for wears the games mark in `error` in place of its number, and the name line wears that mark beside the name only when no race of his in this bracket holds a rating. Every other player line of a KOTH night — the throne, the defender, the open series, a played row, a player who left, the pass-the-crown list, the pair the close names and the strip of players waiting for a bracket — wears the same mark beside the name whenever the board names no rating, and a line that names no race reads "No W3C stats found". A long name truncates, so no control of the row leaves the card. Whatever comes first under the throne stands 12 px off its line. A played row reads "<winner> beat <loser>" with a `win` square, no score, because a best of one has none, a crown where the throne moved or was held, and a "Replay" chip that opens the series. The public card carries no control at all. `next/src/components/koth/BracketCard.tsx` holds the card and its pieces; `next/src/helpers/koth-board.mjs` holds the band, the default pair, the start text, the place word and the throne word.
- `/koth/nights/:id` is the night's run page, admin only. It hangs the admin controls on the same cards: the card face carries three controls with no open series and five while one runs. One filled button starts the next series and names the pair, "Start A vs B"; clicking two queue rows picks that pair instead, which the button then names, and a pair that leaves the king out reads "The crown stays with <king>." under it. A bracket that plays a series draws no start button, so its queue takes no pick at all, and a pick already made there clears with the next board answer. A running series takes its winner on two filled buttons of equal weight, one per player, over a quiet "Cancel this series". A queue row carries three controls: a drag handle, and two `icon-xs` step buttons that are its keyboard and phone route, as the entrants list does, plus one remove. A played row carries two: "Add replay" and "Change the winner", each an icon button with an `aria-label` and a tooltip. The Unplaced strip sits over the brackets and gives each signup with no rating the games mark and three equal outlined bracket buttons. The step-down panel offers "Leave the throne empty" or "Pass the crown to" with one pick, and its one filled confirm names the outcome. The close confirm names each bracket's king and its played count, names every series it deletes as two player lines, and says the standing kings start the next event as King from last event. "Bracket MMR" in the page header opens one number field per bracket, strongest first, with the weakest fixed at 0, a quiet line per bracket that names its band in words as the admin types, one error sentence and one filled "Save the bounds"; the header button is off while any bracket plays a series, and a quiet line over the cards says why. The event page of the night links into that dialog with `?bounds=1`.
- The KOTH board page is `/koth/dashboard` and any reader opens it. It draws the night `GET /koth/board` answers, which is an empty state and not an error when no night takes signups: "No KOTH night is open". The header is the h1 "KOTH Night", the night and its date under it, the sign up and withdraw buttons and the entrants chip. A signed-in reader reads one `info` chip, "You are third in line", on his own row. A quiet read-only strip over the brackets, "Waiting for a bracket", lists the players no bracket holds yet with their marks and the line "An admin places these players."; it shows only when that list is not empty and never in the clean view. `?mode=clean` drops every control, cuts the app bar down to the app title alone, with no nav, no account menu and no theme switch, drops the page footer and the "Replay" chip of a played row, because nobody clicks a link on a stream, and grows the card face and every small label on it one step, so the page can sit in a stream. Both KOTH pages read the board again every 30 seconds and never while the tab is hidden. The public read carries no token, so the edge caches it for 15 seconds and every reader shares that answer; the run page's read carries the admin token, which the edge never caches, so it answers fresh after a write.
- The player page's Events section is one accordion row per event the player took part in, of any kind, newest first: the event label, the kind as a small outlined chip, the dates, and one chip for the result — Champion, else the placing once the event is over, else the state. A GNL row carries the team, the race, the series record with its round strip, the ladder record and the MMR, and opens onto the round cards or the series by round; every other kind opens onto its placing, the series still to play and a link to its event page. `next/src/helpers/player-events.mjs` builds the rows from `GET /users/{id}/history`, which answers every kind. On the owner's own page tonight's KOTH night joins the list: `foldNight` in `next/src/helpers/koth.mjs` rides it on his own row once he entered it and leads the list while he has not, and the row wears `mdi-crown` with the night's state, the races he entered on, and the one action word the member read picked.
- A result bar or square uses `win` and `loss` only; a draw or no result uses `draw`.
- The head to head card counts every kind of event. Its events column and its meeting rows print `eventLabel`, and a cup, a KOTH night and a signup event wear a small icon (`mdi-tournament`, `mdi-crown`, `mdi-clipboard-text-outline`) with the kind as the title; a GNL season wears none, because its label already says so.

## Patterns

- A card title bar is `bg-primary`. A dialog that deletes something uses `bg-error`.
- A filled button marks the one next action of its surface; every other button on it is outlined or quiet. Choices of equal standing wear equal buttons.
- A dialog is a full-height sheet under 768 px and a centred panel above it. A confirm keeps the centred panel at both widths, its height its content, so the form it asks about stays in view: pass `dialogCompact` from `next/src/components/ui/dialog.tsx` on its `DialogContent`.
- Bronze text on a tab, a toolbar button or a card action button uses `primary-text`, because `primary` is 4.21:1 on `surface-light`.
- The sorted column title of a table is in `primary`. An unsorted sortable column shows a faint sort icon.
- A table wider than its card shows a shadow at the hidden edge.
- A card pads its content with 16 px, the value `--card-spacing` holds. A card marked `size="sm"` pads with 12 px. A card whose content runs to its own edge, a full-width table or list, pads with none.
- A cell the reader cannot use wears a 45° hatch, the `.hatched` utility in `globals.css`, so it reads apart from a plain fill in both themes.
- A control draws no default before its data arrives. Until the data lands the control is inert: a skeleton, or a disabled control with `aria-busy`, so a tap cannot write a value the reader never picked.

## Data display

This section states how the app picks a figure, a mark or a chart, and which piece already draws it. The words of a figure are in "Words on the page". The mark rules are in "Charts". An agent loads the `dataviz` skill and the `frontend-design` skill before it draws data, and this file outranks a general rule of a skill.

### Pick the form from the question

Start from what the reader of that page wants to decide. Then pick the form. Pick the colour last. When one figure answers the question, print the figure and draw no chart. Reuse the piece in this table before you draw a new one.

| The reader asks | Form | Piece |
|---|---|---|
| How did a player or a team do? | A record figure | `record` in `next/src/helpers/figures.mjs` |
| How did each round go? | One square per round, with the record beside it | `next/src/components/RoundStrip.tsx` |
| How do two players stand against each other? | A score and the last meeting, the meetings on demand | `next/src/components/HeadToHeadCell.tsx` |
| Who fits against whom by MMR? | Every player on one linear MMR scale | `RoundDraftBoard.tsx`, `next/src/components/DivisionBracketing.tsx` |
| How does a rating move? | A line on a date scale, in a plot of its own | `next/src/components/ladder/LadderPlots.tsx` |
| How much did a player play, day by day? | Stacked win and loss bars. In a table, a small row of bars on one shared height | `LadderPlots.tsx`, `next/src/components/ladder/LadderDayBars.tsx` |
| When are games played? | A heat map in one hue | `SeasonReportView.tsx` |
| What share was won? | The record with its percent. No bar | `record` in `next/src/helpers/figures.mjs` |
| How does a player do against each race? | A race icon and a record per race | `next/src/components/VsRaces.tsx` |
| Which MMR does a player hold? | One chip per ladder race | `next/src/components/RaceMmrChips.tsx` |
| When can two players meet? | Half-hour cells, the pick as a point | `next/src/components/player/ScheduleDialog.tsx` |
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
| An identity | `race-*`, `tier-*` | A race colour is a stripe beside the race icon. A tier colour is a labelled chip. |
| An amount | `heat-1` to `heat-5` | One hue, light to dark. |
| A state of the app | `error`, `warning`, `info`, `success` | Never a chart series. Always with an icon and a label. |
| A control | `primary`, `secondary` | Never a data mark. |

The `dataviz` skill ships a palette validator, `validate_palette.js`. It measures how far apart two colours stand, as ΔE, for full colour vision and for three kinds of colour blindness. A pair passes from ΔE 15 for full vision and from ΔE 8 for a colour-blind reader. The measured values of this palette:

| Set | Light, on `surface` | Dark, on `surface` | Result |
|---|---|---|---|
| `win` with `loss` | 27.1 full vision, 18.7 colour blind | 25.8 and 19.3 | Passes. |
| The four `race-*` | 19.9 and 9.1 | 19.9 and 9.2 | Passes as a set of four. |
| The four `race-*` with `win` and `loss` | | 10.7 and 1.5 | Fails. A race colour and a result colour never share one set of marks. |
| The six `tier-*` | 13.0 and 3.7 | | Fails. A tier is always a chip with its label, never a bare mark. |
| `primary` with `loss` | 7.9 and 1.5 | | Fails. Bronze is a control colour and never a mark. |

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
- In the light theme, `win`, `loss`, `draw` and the four status tokens name no `on-*` ink. `palette-style.ts` gives each of them the `on-primary` ink, which passes 4.5:1 on all seven, so `bg-win text-on-win` is safe in both themes.
- A read that failed is not an empty list. An error draws `StatusAlert`, and the empty sentence shows only after a read that worked.
- A tap on a mark opens its tooltip and never follows the link of its row. `RoundStrip`, `PlayerName` and `FlagIcon` stop the event.
- A card of players is as synced as its least synced player: `TeamRoster` prints the oldest sync time of the card.
- A tonal chip is the token as text over a 12% wash of the same token (`next/src/components/ui/tone.ts`).
- The measured colour values of this section have no test behind them. `pnpm test` checks ink contrast only. Measure again when a mark colour changes.

### The public league site

The public league site, the `wc3-gnl-website` repository, shows the same league data in its own look, black and gold. A reader who moves between the two sites must find one way to read a record, a result and a race. Each site keeps its own look. For data, this palette is the reference for both sites: the maintainers decided on 20 September 2026 that the public site takes the dark values of `win`, `loss` and the four `race-*` tokens, which also pass the validator on a black ground. Propose a change to a rule of this section to that repository too.

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
- A scale a reader compares across draws its grid lines and its tick labels, as the round draft board does every 200 MMR. Marks that share a scale share its maximum, so two rows of bars compare.
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

- In light, `win`, `loss`, `draw`, `error`, `info`, `success` and `warning` name no `on-*` ink. A fill of one of those names picks its text colour by hand.
- Status colours mark things that are not app states. The fantasy week rank chips use `success`, `info` and `warning`. The MMR chips on the match page use `info`. Bench points use `warning`.
- The fantasy bet-points chip colours its text in `win` or `loss`.
- `LadderDayBars` is a fixed 224 px wide. Its stacked bars have a 1 px gap.
- The result score of a round card names no outcome for a screen reader. It carries no "Won 2 – 1" or "Lost 1 – 2" as its title and label (`next/src/components/player/RoundCards.tsx`).
- The day bars and the MMR line of `LadderPlots` and `LadderDayBars` answer a hover alone. They have no keyboard route. The same holds for the heat cells and the day bars of the season report, the dots of `DivisionBracketing`, `TrophyIcon`, and every `TapTooltip`, whose trigger is a `span` and not a button.
- `LadderPlots`, `LadderDayBars`, `DivisionBracketing` and the scale of `RoundDraftBoard` carry no name for a screen reader.
- No shared piece draws a result chip, a points pair, a stat tile or the result legend. Nine surfaces write their own `bg-win` and `bg-loss` chip, six write a points pair or a series score by hand, in three forms, and three write the result legend.
- `primary` draws data in the games-per-day bars of the season report, `BadgeRarity`, `LadderLeaderboards`, the first row of the ladder table and the race rank badge of `FantasyScoreBreakdown`. `tier-5` draws achievement points in `LadderLeaderboards`.
- A status token carries a data value, not a state, in the rank scale of `FantasyScoreBreakdown`, the MMR badges of the draft series tables and `TeamRostersPanel`, the points badge of the season page, and the ban and pick marks of `VetoBoard`. `secondary` marks data in four more places.
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
