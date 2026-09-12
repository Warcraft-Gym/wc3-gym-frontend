# GNL app user guide

This guide is for gym admins. It follows the app's own top navigation bar, and the page it
describes is always named by its route, so a link can be pasted straight into Discord.

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

**Where:** Config → Settings (`/config`)

The page holds the settings the backend and the Discord bot read. Edit a field and press
**Save Settings**; only the fields you changed are sent. **Reset** reloads the stored values
and drops your edits.

### W3Champions integration

- **Current W3C season**: leave blank to follow the latest W3Champions season.
- **W3Champions API URL**: leave blank to use the backend default.

### GNL league settings

- **Current GNL season**: the season public signups, fantasy registration and the Discord
  bot work against. Set it once per season.

Player signups are opened and closed per season on the Seasons page, not here.

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
- **Captain/Coach role ID** and **Admin role ID**: the two Discord roles the bot reads.
- The channel ids say where the bot posts: signup, player dashboard, fantasy dashboard,
  scheduling, results and content (cast claims and stream reminders).

To read an id in Discord, turn on Settings → Advanced → Developer Mode, then right-click a
role or channel and choose Copy ID.

### KOTH Nightbot integration

**Current token** authenticates the Nightbot signup command. **Generate new token** replaces
it at once and every Nightbot command using the old one stops working, so copy the new
command into Nightbot straight after.

---

## Discord roles and access

**Where:** Config → Discord Roles (`/config/discord-roles`), Config → Access (`/config/access`)

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

**Where:** GNL → Players (`/players`)

A player row carries the name, Discord tag and id, BattleTag, country, race and MMR. Discord
details are filled in when the player signs up, so most edits are MMR, race and country.

A player's own page is `/player/<id>`: career record, races played and head-to-head.

---

## Seasons and rounds

**Where:** GNL → Seasons (`/seasons`)

### Create a season

**Create Season** opens the dialog:

- **Season name** and **Season ID** (the short id used in links, for example `gnl-s18`).
- **Start date** and **End date**.
- **Number of rounds** and **Series per round**.
- **Map pool**: the maps this season plays on.
- **Signups open**: open or close signups for this season.
- **Availability tools**: lets players enter blocked times and schedule their own series.
- **Fantasy grind pick**: bettors pick a team and its achievement points pay by rank.
- **Discord role ID**: the role given to this season's participants.

A season's phase is derived, never stored: **Open** until a series is scored or past its
time, **Commenced** from then on, **Complete** once every series has a result.

### The season pages

- `/seasons/<season>`: rounds, matches and the teams in the season.
- `/seasons/<season>/maps`: the map pool, the map rule for each game and the pick/ban order.
- `/seasons/<season>/achievements`: the achievement rules and what each one pays.

### Set the current season

Config → Settings → **Current GNL season**. Everything public (signups, fantasy
registration, the bot) reads that one value.

---

## Teams

**Where:** GNL → Teams (`/teams`)

A team carries a name, a long name and an icon. A team page is `/team/<id>`; its roster for
one season is `/team/<id>/season/<season>`, where an admin adds players and seats the
captains. `/team/<id>/season/<season>/rounds` shows the team's series round by round.

---

## Matches and series

**Where:** a season page (`/seasons/<season>`), a match page (`/match/<id>`)

A match is two teams in one round. A series is two players inside a match.

### Create a match

On the season page, **Create match** takes Team 1, Team 2 and the round. Open the match to
add the series.

### Create and edit a series

On the match page, **Edit series** sets the two players, the scheduled date and time (in the
admin's own timezone; the stored value is UTC), **Is fantasy match**, and the result.

The result takes the score for each side, the race each player played, the map of each game
and the replay files. A series with a veto shows the maps the players chose.

### Upcoming

GNL → Upcoming (`/upcoming`) lists the scheduled series of the current season with their
times in the reader's own timezone, and who has claimed the cast.

---

## Fantasy league

**Where:** Fantasy → Leaderboard (`/fantasy`), Manage Bets (`/fantasy/bets`), Player Tiers (`/fantasy/tiers`)

### Set the player tiers

On `/fantasy/tiers`, **Even split** proposes six tiers by MMR and **Apply tiers** stores
them. Every fantasy team drafts one player from each tier, so a season needs all six.

### Open registration

Config → Settings → **Fantasy team creation enabled**. A member registers a team on
`/fantasy-registration`; an admin can create or edit one from the leaderboard.

### Bets

`/fantasy/bets` lists every bet and lets an admin add or correct one. A bet locks once its
series starts, and no bet or team may be edited after the season ends; the admin pages are
the override.

---

## KOTH

**Where:** KOTH (`/koth`)

An event carries a name, a date, a description and the two bracket thresholds. Players sign
up with a BattleTag, a Twitch username and their races, either on this page or through the
Nightbot command configured on `/config`. The public board is `/koth/dashboard`, which has
no navigation bar so it can be shown on stream.

---

## Common workflows

### Start a season

1. Create the season (Seasons → Create Season) with its rounds and map pool.
2. Set it as the current season (Config → Settings).
3. Open signups on the season (Seasons → edit → Signups open).
4. Players sign up; add late ones by hand from the season page.
5. Create or update the teams, then fill each team's roster for the season.
6. Create the matches for each round, then the series inside each match.
7. Close signups once the rosters are final.

### Run a round

1. Players schedule their own series, or an admin sets the time on the match page.
2. Mark the series that count for fantasy.
3. Bettors place their bets before each series starts.
4. Players report the result; an admin corrects it on the match page.
5. Check the leaderboard and the season report.

### Set up the fantasy league

1. Assign the six player tiers (`/fantasy/tiers`).
2. Enable fantasy team creation (Config → Settings).
3. Configure the bet points (Config → Settings).
4. Bettors register their teams.
5. Mark the fantasy series each round.

---

## Troubleshooting

### Players cannot sign up

- Check **Signups open** on the season, and that the season is not complete.
- Check **Current GNL season** on `/config`.
- Check the **Signup channel ID**.

### A guest sees no way to join the Discord

- Set **Discord invite URL** on `/config`. Without it the join card shows the membership
  error and nothing to click.

### Fantasy teams cannot register

- Check **Fantasy team creation enabled** and **Current GNL season**.
- Check the season has not commenced, and that all six tiers are assigned.

### Discord roles do not follow the app

- Open `/config/discord-roles`. A role in **Ignored** is left alone on purpose; a locked one
  sits above the bot's role in Discord.
- Press **Sync all** and read the count in the message.

### A page shows a red error and an empty list

The list is empty because the load failed, not because there is nothing there. Reload the
page before acting on it.

---

Report a problem or ask for a change in the gym Discord.
