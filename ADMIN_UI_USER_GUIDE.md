# GNL app user guide

This guide is for gym admins. It follows the Admin area and its three sections: Gym Newbie
League, App Settings and Other Events. The **Admin** tab of the top bar opens the area; on a
phone the tab sits in the bar at the bottom. Each page is named by its route, so a link can be
pasted straight into Discord.

## Table of contents

1. [Configuration](#configuration)
2. [Discord roles and access](#discord-roles-and-access)
3. [Players](#players)
4. [Seasons and rounds](#seasons-and-rounds)
5. [Teams](#teams)
6. [Matches and series](#matches-and-series)
7. [Fantasy league](#fantasy-league)
8. [KOTH](#koth)
9. [Common workflows](#common-workflows)
10. [Troubleshooting](#troubleshooting)

---

## Configuration

**Where:** Admin → App Settings → Settings (`/config`)

The page holds the settings the backend and the Discord bot read. Edit a field and press
**Save settings**; only the fields you changed are sent. **Reset** reloads the stored values
and drops your edits.

### Warcraft 3 Champions integration

- **Current W3C season**: leave blank to follow the latest W3Champions season.
- **W3Champions API URL**: leave blank to use the backend default.

### Gym Newbie League Settings

- **Current GNL season**: the season public signups, fantasy registration and the Discord
  bot work against. Set it once per season.

Player signups are opened and closed per season, with **Signups open** in the season wizard,
not here.

### Public access settings

- **Fantasy team creation enabled**: off closes team creation for every season. A commenced
  season is closed anyway.

### Fantasy betting settings

- **Use fixed bet points** on: every bet costs the **Fixed bet points value**.
- **Use fixed bet points** off: a bettor picks a value between **Minimum bet points** and
  **Maximum bet points**.

### Discord bot settings

- **Discord invite URL**: the invite offered to a signed-in visitor who is not in the
  server. Without it the join card on `/profile` has nothing to click.
- **Captain/coach role ID** and **Admin role ID**: the two Discord roles the bot reads.
- The channel ids say where the bot posts: signup, player profile, fantasy dashboard,
  scheduling, results and content (cast claims and stream reminders).

To read an id in Discord, turn on Settings → Advanced → Developer Mode, then right-click a
role or channel and choose Copy ID.

### KOTH Nightbot integration

**Current token** authenticates the Nightbot signup command. **Generate new token** replaces
it at once and every Nightbot command using the old one stops working. Until a token exists,
the section shows no token and offers **Generate token** instead.

**Chat command** is how players sign up from Twitch chat: they type `!kothsignup BattleTag#1234`,
or add a race, as in `!kothsignup BattleTag#1234 orc`. To install it, click **Copy message**, then
in the Nightbot dashboard open Commands, then Custom. Add a command named `!kothsignup` with
that message, or edit the one already there. After a new token, paste the new message into the same command. Never paste
the message into chat: it holds the token. The message box hides the token until you click the
eye icon on the token.

---

## Discord roles and access

**Where:** Admin → App Settings → Discord (`/config/discord-roles`), Admin → App Settings →
Access (`/config/access`)

### Bind a Discord role

Each card on `/config/discord-roles` is one role on the server. Drag a card into a column,
double-click it, or use the buttons on the card:

- **Managed**: Sync grants and removes this role.
- **Ignored**: bound, but a person applies it in Discord by hand.
- **Not bound**: never touched. Bind it, or hide it.

A locked card sits above the bot's own role in Discord, so the bot cannot grant or remove it.
Raise the bot's role in Discord to manage it.

**Sync all** applies every managed binding. The table below it lists the accounts whose
Discord roles differ from the database; **Sync** on a row fixes one account.

### Grant an admin

On `/config/access`, **Add admin** takes a player from the list or a raw Discord id. Rows
marked *Environment* are granted outside the app and cannot be removed here, and an admin
cannot remove themself.

---

## Players

**Where:** Admin → Gym Newbie League → Players (`/players`)

**Edit** on a row takes the name, BattleTag, timezone, country, Discord tag and id, race, and
the Twitch and YouTube channels. Discord details are filled in when the player signs up, so
most edits are race and country. MMR comes from W3Champions: **Sync W3C** reads it again.

Tick several players to act on them at once: **Add to season**, **Sync W3C** or **Delete**.
**Move tag** and **Merge into**, in the row menu, fix two rows that are one person.

A player's own page is `/player/<id>`: career record, races played and head-to-head.

---

## Seasons and rounds

**Where:** Admin → Gym Newbie League → Seasons (`/seasons`)

One row per season, with its phase. A row opens the season. The phase is derived, never
stored:

- **Open**: the season is being set up. It takes signups while **Signups open** is on.
- **Commenced**: a series is scored or past its time. Fantasy teams freeze, and a signup
  becomes a request for an admin to add the player.
- **Overdue**: commenced and past its end date. The row wears a warning mark.
- **Complete**: an admin closed the season.

Only **Close Season**, in the row menu, completes a season. A season with every series scored
stays commenced. The close asks first and counts the series with no result; they stay
unscored and count for neither team. On a closed season the same place reads **Reopen
Season**, which takes the close back. The row menu also exports and deletes a season.

### Create a season

**Add New Season** opens the season wizard. The pencil on a season's row opens the same
wizard to edit it. The steps, in order:

1. **General**: the name, the number of rounds, the start and end date, the pick and ban
   order, the series per fixture, the score system, the Discord role id and the round end
   zone. The switches **Signups open**, **Availability tools**, **Check-in** (with
   **Early check-in**) and **Fantasy grind pick**. The recent games floor, and the largest
   MMR difference of the captain draft.
2. **Teams**: tick the teams of the season. **New team** creates one and ticks it.
3. **Captains & rosters**: the captains and the players of each ticked team. Players come
   from the signups, so a new season sets its captains only.
4. **Matchups**: optional. **Draw the matchups at random** draws a single round robin;
   **Draw again** draws anew.
5. **Maps**: tick the map pool. **New map** and **Import W3C map pool** add maps.
6. **Round maps**: the map game 1 of each round is played on. **Fill in pool order** fills
   the empty rounds. The step shows only while the season plays a fixed map.

A step opens once every step before it is answered, so an edit can go straight to any step.
Nothing is written before the last button: **Create season** on the last step of a new
season, **Save changes** on any step of an edit. A failed write names its step; press the
button again and it writes only what is still missing.

A season's link uses a slug made from its name, for example `gnl-s18`.

### The season pages

- `/seasons/<season>`: rounds, matches and the teams in the season.
- `/seasons/<season>/assign`: the draft, where you assign the signups to teams.
- `/seasons/<season>/maps`: the map pool, the map rule for each game and the pick/ban order.
- `/seasons/<season>/achievements`: the achievement rules and what each one pays.

### Set the current season

Admin → App Settings → Settings → **Current GNL season**. Everything public (signups, fantasy
registration, the bot) reads that one value.

---

## Teams

**Where:** Admin → Gym Newbie League → Teams (`/teams`)

A team carries a name, a long name and an icon. A team page is `/team/<id>`; its roster for
one season is `/team/<id>/season/<season>`, where an admin adds players and seats the
captains. **Team rounds** opens `/team/<id>/season/<season>/rounds`, the team's round
check-in: who checked in, who sits out, and who still needs a game.

---

## Matches and series

**Where:** Admin → Gym Newbie League → Seasons, then a season (`/seasons/<season>`) and a
match (`/match/<id>`)

A match is two teams in one round. A series is two players inside a match.

### Create a match

On the season page, **Add match** takes Team 1 and Team 2 in the selected round. The
wizard's Matchups step draws every match at once. Open the match to add the series.

### Create and edit a series

On the match page, the captains draft the pairings on the **Draft series** tab, and an admin
publishes them with **Publish all**. **Add series** adds a published series directly.

**Edit series** sets the scheduled date and time (in the admin's own timezone; the stored
value is UTC), the score of each side or **Not played**, the race each player played, the
host and **Is fantasy match**.

Players report the result on the series page, `/series/<id>`: the winner, the map and the
replay of each game. A missing replay or an incomplete veto warns and never blocks.

### Upcoming series

The season report (`/report#upcoming`) opens with "Upcoming series" while the current season
is selected: the scheduled series with their times in the reader's own timezone, and who has
claimed the cast. **All upcoming** on Home links there.

---

## Fantasy league

**Where:** Admin → Gym Newbie League → Fantasy Tiers (`/fantasy/tiers`), Admin → Gym Newbie
League → Fantasy Bets (`/fantasy/bets`); the leaderboard is `/fantasy`

### Set the player tiers

On `/fantasy/tiers`, pick the number of **Tiers**, two to six. **Even split** proposes the
cuts by MMR; drag a cut to move it. **Apply tiers** stores them. Every fantasy team drafts one
player from each tier, so registration waits until the tiers are applied. A commenced
season's tiers are locked; **Unlock** opens them.

### Open registration

Admin → App Settings → Settings → **Fantasy team creation enabled**. A member registers a team
on `/fantasy-registration`; an admin can create or edit one from the leaderboard.

### Bets

`/fantasy/bets` lists every bet and lets an admin add or correct one. A member's bet locks
once its series has a result, and a member's team freezes once the season commences; the
admin pages are the override.

---

## KOTH

**Where:** Admin → Other Events → KOTH Nights (`/koth`)

`/koth` lists the nights, newest first. **Open tonight** takes the start time and the MMR each
of the three brackets opens at, filled in from the night before, and lands on the night's run
page. **Tonight** opens tonight's night page. A night's name opens its run page,
`/koth/nights/<id>`, where you pair the series, take the results and set **Signups open** and
**Published**. Only **Close the night** ends a night.

Players sign up on the night page, or through the Nightbot command set up on `/config`.
Anyone can sign up on the night page by battle tag, with or without a login.
Every night has a public page, its event page `/events/<id>`. `/koth/dashboard` lands on
tonight's night page, so one saved link follows each new night.
The run page carries **Open stream view**, which opens the night page in its stream view
(`?mode=clean`) in a new tab, and **Copy stream link**, which copies that link for the stream.
**Add player** sits beside them and enters a late arrival by battle tag; W3Champions picks his
bracket.

On a bracket card:

- **Move to** moves one race of a player to another bracket, where he stands last. A player on
  one race has it under his name; a player on several races has it on each race row. Moving
  the king asks first, because it leaves the throne empty.
- A player on several races reads **Plays next as** over his races. Pick the race the next
  series takes.
- The X on a race row removes that one race. The X beside the name removes the player from this
  bracket on every race.
- A race the player left while another of his stays reads in his row as "Orc · left tonight",
  with **Put back** for that race. **Left tonight** lists only the players who no longer stand
  in the bracket; **Put back** there returns every race he left on.
- A row is dragged only within its own bracket.
- The X on an **Unplaced** signup asks first, because an unplaced signup cannot be put back.

---

## Common workflows

### Start a season

1. Seasons → **Add New Season**. In **General**, set the rounds and dates and check that
   **Signups open** is on.
2. Tick the teams, set the captains, draw the matchups if you want them now, and tick the map
   pool and the round maps. Press **Create season**.
3. Set it as the current season (Admin → App Settings → Settings).
4. Players sign up; add late ones with **Add to season** on `/players`.
5. Assign the signups to teams on the draft, `/seasons/<season>/assign`.
6. Add any missing matches on the season page (**Add match**).
7. Turn off **Signups open** (the row's pencil, General step) once the rosters are final.

### Run a round

1. The captains draft the pairings on each match's **Draft series** tab; publish them.
2. Players schedule their own series, or an admin sets the time on the match page.
3. Mark the series that count for fantasy.
4. Bettors place their bets before each series has a result.
5. Players report the result; an admin corrects it on the match page.
6. Check the leaderboard (`/fantasy`) and the season report (`/report`).

### Set up the fantasy league

1. Apply the player tiers (Admin → Gym Newbie League → Fantasy Tiers).
2. Enable fantasy team creation (Admin → App Settings → Settings).
3. Configure the bet points (Admin → App Settings → Settings).
4. Bettors register their teams.
5. Mark the fantasy series each round.

---

## Troubleshooting

### Players cannot sign up

- Check **Signups open** on the season, and that the season has not commenced. A commenced
  season takes a request only, and a complete one takes nothing.
- Check **Current GNL season** on `/config`.
- Check the **Signup channel ID**.

### A guest sees no way to join the Discord

- Set **Discord invite URL** on `/config`. Without it the join card shows the membership
  error and nothing to click.

### Fantasy teams cannot register

- Check **Fantasy team creation enabled** and **Current GNL season**.
- Check the season has not commenced, and that its tiers are applied.

### Discord roles do not follow the app

- Open `/config/discord-roles`. A role in **Ignored** is left alone on purpose; a locked one
  sits above the bot's role in Discord.
- Press **Sync all** and read the count in the message.

### A page shows a red error and an empty list

The list is empty because the load failed, not because there is nothing there. Reload the
page before acting on it.

---

Report a problem or ask for a change in the gym Discord.
