# Backlog

The open work for the app, frontend and backend, until the first production release. After that release the backlog moves to GitHub issues.

How to use it:
- Add an item under the right heading, with its acceptance criteria and the code it touches.
- Mark a decision still open as **Open:** so it is settled before the work starts.
- When an item ships, delete it here; the pull request and `docs/okf/log.md` keep the record.

## Bugs

### An error from a dialog shows on the page behind it

When a write started in a dialog fails, the error appears on the page behind the dialog. Example: a cup's run page, Participants tab, "Add player": the error shows above the page, and the dialog stays open without a message.

Acceptance criteria:
- An error from a write started in a dialog shows inside that dialog, above its buttons, and the dialog stays open.
- The page's own alert does not repeat it.
- The dialog's error clears when the dialog closes or the next write starts.
- Holds for every dialog that writes, at least the cup console's Add player, Add team and Swap.

Notes:
- `CupConsole` sends every write error through the page's `onError` prop (`next/src/components/CupConsole.tsx`, the `work` helper), so a dialog's error lands in the page's `StatusAlert`.
- About 34 files take an `onError` prop. A shared pattern, such as an error state per dialog rendered with `StatusAlert` inside `DialogContent`, fixes them in one place.

### The cup page's tab bar shows a scroll bar in Chrome

In Chrome, the tab bar of a cup page (Draw, Participants, Results) shows a small scroll bar beside "Results".

Acceptance criteria:
- No scroll bar on the tab bar in Chrome, Edge and Firefox at desktop width.
- On a phone the bar still scrolls sideways when the tabs do not fit.
- The run page (`/events/:id/admin`), which uses the same bar, is fixed too.

Notes:
- Likely cause: `TabsList` is `h-8` with `overflow-x-auto` (`EventView.tsx`, `EventAdminView.tsx`), and the active tab's line sits 5 px below the bar (`after:bottom-[-5px]` in `next/src/components/ui/tabs.tsx`). With `overflow-x: auto` that overflow also makes the bar scroll vertically.
- Fix idea: `overflow-y-hidden` with bottom padding for the line, or let the bar grow (`h-auto` with `pb-1.5`).

## Stories

### Restructure the sign-up step of Create cup

As an organizer creating a cup, I want the sign-up step split into sign-up information and sign-up rules, without the questions that no longer apply, so I can set it up without working through one long list.

Acceptance criteria:
- **Sign-up information**, the first section:
  - minimum and maximum players;
  - split the players into divisions;
  - check-in;
  - publish now, or keep as a draft.
- "Open sign-ups now" is removed: a published cup takes sign-ups, a draft does not.
- **Sign-up rules**, the second section, starts with "Only eligible players can sign up". While it is off, every field that depends on it is disabled.
- "The battle tag must be linked to Battle.net too" is removed.
- MMR from, MMR to and Games at least stay.
- A new switch: "Only the sign-up race counts for the MMR check".
  - On: "A race counts from" is hidden, since it no longer applies.
  - Off: a notice says the MMR of a player's other races also counts toward the MMR range, and "A race counts from" is shown, because it decides when an off race with few games counts.
- "Who may sign up" is removed: every player signs up as a member of the Discord server.

Notes:
- Only `next/src/app/(app)/events/new/cup/CupCreateView.tsx` (the `signups` step) and `next/src/helpers/cup-wizard.mjs` hold these fields.
- The new switch may need no backend change. The backend checks only the sign-up race when `race_games_min` is empty, and the best race with that many lifetime games when it is set (`app/services/events.py`, `rating()`). So On sends `race_games_min: null` and Off a number, default 20. Confirm before building.
- Check how `signups_open` is set once "Open sign-ups now" goes away, so a published cup opens its sign-ups.
- **Open:** does the backend keep `bnet_required` and `signup_policy` with fixed values (`false`, `members`), or drop them?
- **Open:** with eligibility off, the MMR and games limits still warn on a player's row today. Does disabling the fields also drop those warnings?

### Events page: clearer kind filters, upcoming events as one table, no KOTH nights

As a member looking for an event to join, I want clear filter buttons and the upcoming events in one compact table, so I can scan what is coming up and pick an event quickly.

Acceptance criteria:
- The kind filters (cups, recurring cups and the rest) read clearly as buttons in both themes, and the selected one stands out.
- "Upcoming" is one table instead of cards: date, name, mode, status and the action, sorted by date and then status.
- The table stays readable on a phone (stacked rows, as `DESIGN.md` describes for wide tables).
- KOTH nights are no longer on the events page, neither as a filter nor as rows. Admins open them from the admin panel, and the public site shows them.

Notes:
- `next/src/app/(app)/events/EventsView.tsx`: the filters are `KIND_FILTERS` from `next/src/helpers/events-page.mjs`, drawn as `outline` and `secondary` pill buttons; the upcoming list uses `EventCard`.
- In dark mode the outline pills lose their edge on the leather page.
- Reuse the existing status chip for the status column, and check that the admin navigation still leads to KOTH.
- The mode column comes from the next story.

### Name a cup's mode wherever a cup is shown

As a member, I want every place that shows a cup to name its mode, so I know what kind of cup it is before I open it.

Acceptance criteria:
- A cup shows its mode: "1v1 cup", "2v2 cup", "FFA, solo", "FFA, teams of 2", "Custom game, 1v1".
- Shown on the events page, the event page header, the run page header, Home (upcoming and My events) and the recurring cup page.
- One helper renders the label everywhere.

Notes:
- `formatChip` in `next/src/helpers/home-hub.mjs` already builds the label from `kind`, `team_size`, `ffa` and `custom_game`. Reuse it.
- Check that each read carries those fields (`GET /events`, `GET /events/{id}`, the recurring cup reads). A read that lacks one needs a small backend change.

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
