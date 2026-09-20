# Concepts

* [App shell and routing](app-shell-and-routing.md) - One router on plain paths, a role rank per route, a guard that saves the return path, and an app bar that reads everything from the /me answer.
* [Data display](data-display.md) - How the app picks a figure, a mark or a chart for league data, gives each colour one job, shows a player with many races, and moves figures instead of rows.
* [Read-only embed](readonly-embed.md) - A page opened with readonly=1 drops the chrome, stays light, and reports its height to the parent frame so the public site can embed it.
* [Session and auth](session-and-auth.md) - Clerk signs a member in with Discord, the backend's /me answer is the session the app reads, a legacy admin token has its own login page, and the fetch wrapper sends the bearer.
* [Shared components](shared-components.md) - The pieces every page reuses, with the rules that decide when a player or team name links, opens a panel or is plain text, when a race icon may show, how a round strip and a roster are drawn, where the standings sit in a stage, how the veto board knows its side, how the series action bar is drawn, and what a control shows before its data arrives.
* [Stores](stores.md) - One store module per area holds every call to the backend; three of them also hold state the pages share. Views never fetch on their own.
* [The backend contract, as consumed here](backend-contract.md) - What this app relies on from the wc3-gym-backend API, named by route and field, and where those reliances live in the code.
* [Theme](theme.md) - One look, stone and bronze, in a light and a dark theme, two typefaces, every value in one palette file, the choice stored per browser.
