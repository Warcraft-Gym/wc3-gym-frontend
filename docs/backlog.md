# Backlog

The open work for the app, frontend and backend, until the first production release. After that release the backlog moves to GitHub issues.

How to use it:
- Add an item under the right heading, with its acceptance criteria and the code it touches.
- Mark a decision still open as **Open:** so it is settled before the work starts.
- When an item ships, delete it here; the pull request and `docs/okf/log.md` keep the record.

## Bugs

None open.

## Stories

### Only admins and the players themselves check players in on production

As an admin, I want organizers to stop checking players in on production while they still can on staging, so a check-in on production means the player confirmed it and organizers can still test an evening on staging.

Acceptance criteria:
- On production, a runner who is not an admin gets 403 on `POST /events/{id}/entrants/checkin-everyone`, and on `POST /events/{id}/entrants/{entrant_id}/checkin` for another player's row.
- A player still checks themselves in, and an admin still checks anyone in.
- On staging and locally, organizers keep both actions.
- The run page hides "Check everyone in" and a row's check-in button when the viewer may not use them.
- Tests cover production and staging.

Notes:
- Backend and frontend. The backend tells production by `VERCEL_ENV == "production"`, as `app/services/egress_monitor.py` already does.
- Rather than the frontend reading its own environment, the event read says whether the caller may check others in (for example a `may_check_in_others` flag), so the buttons follow the backend's rule.
- Routes: `app/api/routes/events.py` (`check_everyone_in_to_cup`, `check_in`).
- Update the check-in concept in the backend bundle and the event-management page in the frontend bundle.

### Change a cup's settings until the draw

As an organizer, I want to change a cup's settings until the draw, in the same wizard that created it. Then a mistake at creation doesn't mean deleting the cup.

Acceptance criteria:
- Until the first stage is drawn, the run page offers "Edit cup". It opens the Create cup wizard filled in with the cup's settings.
- Every step opens directly from the step bar, in any order, and "Save" writes the changes from any step.
- Before the draw, every setting changes that leaves the signed-up players and their data intact: name, description, start, format and its options, best-of, map pool, sign-up information and sign-up rules.
- A setting that would break existing data shows read-only, with the reason next to it.
- Once the cup is drawn, the wizard is not offered. The run page keeps today's rules, where the best-of, maps and sign-up rules lock at the draw.
- Every write goes through the existing routes and their checks.

Notes:
- Most of the writes exist:
  - `PUT /events/{id}` (`EventUpdate`: name, description, start, check-in, rules, player cap and minimum, divisions on or off);
  - `PUT /events/{id}/stages`, which updates a stage in place and keeps its id;
  - `PUT /events/{id}/maps`;
  - `PUT`, `POST` and `DELETE /events/{id}/legs` for the rounds of a cup played over several rounds.
- The recurring rule keeps its own Edit dialog.
- No route changes these after creation today: `cup_settings.custom_game`, `points_by_place`, the entrant kind and the team size.
- The wizard is `CupCreateView.tsx` with `helpers/cup-wizard.mjs` (`cupSteps`, `cupPayload`). An edit also needs the reverse direction, from the cup's settings to the form.
- Today the run page edits pieces in place: `CupFormatCard` (best-of and maps), and the "Sign-up rules" dialog and `CheckinSettings` in `CupConsole`.
- **Open:** which settings lock once a player has signed up? The likely ones are the mode (team size, FFA, custom game) and one evening versus several rounds.
- **Open:** do the in-place cards stay beside "Edit cup", or does the wizard replace them?

### Ask about cup announcements when a player signs up

As a player signing up for a cup, I want to be asked about the cup announcements in Discord. Then I learn they exist without having to find the switch on Home.

Acceptance criteria:
- After a successful cup sign-up, the dialog appears for a member who isn't subscribed and hasn't declined for good.
- It explains what subscribing means: a Discord role pinged in the announcement channel for every new cup, when sign-ups open, for the check-in reminder, the draw and the top three.
- It offers three answers: "Subscribe", "Not now" and "No, don't ask again".
- "Subscribe" writes the subscription, as Home's switch does. "Not now" closes the dialog, and the next cup sign-up asks again. "No, don't ask again" is stored on the account, so no device asks again.
- The dialog shows only while announcements are available (channel and role set, the member in the guild), the same condition as Home's switch.
- Home's "Announcements" switch still changes the subscription at any time, also after "No, don't ask again".
- Every sign-up path asks: the event page, Home's upcoming events and a team sign-up.

Notes:
- `GET /me/announcements` and `PUT /me/announcements` answer `{available, subscribed}` (`AnnouncementState`), and `announcement_subscriber` holds the opt-in. The switch is `AnnouncementSwitch` in `components/home/MyEvents.tsx`.
- The backend needs a place for "don't ask again" per account (a column or a small table, with its migration). The read then says whether to ask.
- The sign-up paths are `SignupDialog`, `signUp` in `HomeView.tsx` and `TeamSignupDialog`.
- Update the announcement concept in both bundles.
- **Open:** is a player who joins a team through an invite asked as well?

### The draw and every series after it ping their players

As a player in a cup, I want a message that pings me when my series is set, says who I play, links straight to my veto and gives the game name to use. This applies to the draw and to every later series. Then I can start without searching the site.

Acceptance criteria:
- The draw message pings the players in the draw, not the announcement role. The role keeps the other messages: sign-ups open, the reminder and the result.
- It lists every series whose two sides are known as "Player A vs Player B", with the series' game name. The series' seat 2 (`entrant2`), on the bottom row of the bracket box and named second, hosts the game, and the line marks the host.
- Each line links to the cup's draw with that series' veto open. Anyone outside the series, or signed out, sees the draw with that series in view.
- A bye is named as one and pings nobody.
- A player without a Discord account is named, not pinged.
- A large draw splits over several messages, so Discord's limits drop no ping and no line.
- A Swiss round's message (`cup_round`) does the same for its round.
- Every later series is announced the same way once both its sides are known, for example when the second semifinalist wins their quarterfinal or a loser drops into the lower bracket. The message pings both players with the pairing, the veto link, the game name and the host.
- Each series is announced once. A series the draw already listed gets no second message.
- The event page shows the same game name and host on each series box.

Notes:
- Today `post_draw` in `app/services/cup_announcements.py` posts one line and a "See the draw" button, and `_message` pings the role alone (`allowed_mentions` names only roles).
- Discord pings only from the message content, never from an embed. The content carries the mentions: about 2000 characters, so roughly 80 mentions per message, and `allowed_mentions.users` takes at most 100 ids. The pairings can sit in an embed, with up to 4096 characters per description.
- The event page opens `VetoBoard` in a dialog from component state (`vetoing` in `EventView.tsx`). Nothing reads a series from the address yet, so the link needs a parameter such as `?tab=draw&veto=<series id>`.
- The host is not stored: it is always the series' seat 2 (`entrant2_id`, `player2_id`), the bottom row of the bracket box, so the message and the event page derive it the same way. No cup service reads the `host` map rule (`MAP_RULES` in `app/models/types.py`) today; if a cup offers it later, it uses the same seat.
- **Open:** who hosts an FFA lobby?
- **Open:** the game name format, for example `<cup> R1 M3`. Check Warcraft III's length limit for a game name, and keep the name distinct enough to find in the lobby list.
- **Open:** a team cup pings every player of both teams, or the captains only?
- A result fills the series it feeds in `_fill_below` (`app/services/cup_engine.py`). The draw already marks itself in `session.info` (`note_draw`) and posts after the commit (`_announce_draws` in `cup_announcements.py`). A series that a result completes can be marked and posted the same way. A `discord_post` row per series (a new kind, keyed by the series id) keeps each series to one message.
- An FFA heat whose seats fill from earlier heats follows the same rule once every seat is known.
- **Open:** a corrected or reopened result that changes who moves on. Edit the series' message, post a new one, or leave it as it was?
- **Open:** the announcement channel, or a thread per cup?
- Update the announcement concept in both bundles.

### Grand final rules for double elimination

As an organizer, I want the grand final's rules in a section of their own, off by default. The section offers the choice between a reset and a head start for the upper-bracket winner.

Acceptance criteria:
- For double elimination, Create cup's Format step shows a section for the grand final with three choices:
  - "One grand final", the default;
  - "Grand final reset: the lower-bracket winner must win twice";
  - "Upper-bracket winner starts ahead", with the number of games.
- A new cup has no reset. An existing cup keeps its rule.
- With a head start, the upper-bracket winner opens the grand final series that many games up. The score, the veto, the report and the result all count it, and the bracket and the event page show it, for example "starts 1–0".
- The head start stays below the games a player needs to win the series. A Bo1 grand final offers no head start.
- The review step and the run page's format card name the rule.

Notes:
- The reset is on by default today: `grand_final_reset: true` in `blankCup` (`helpers/cup-wizard.mjs`), sent as `grand_final_modifier` `reset` or `one`. The stage column also allows `skip`. The switch sits in the Format step of `CupCreateView.tsx`.
- The head start is new in the backend: a stage field with its migration, and the opening score in the cup engine, the veto and the report (`cup_engine`, `cup_series`, `cup_veto`).
- **Open:** the section title. "Lower bracket final rules" was the first idea; both choices decide the grand final between the two bracket winners, so "Grand final rules" may read clearer.
- **Open:** may a reset and a head start combine, or is it one choice of the three?
