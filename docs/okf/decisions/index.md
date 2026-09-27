# Decisions

* [Clerk in proxy mode on production](clerk-proxy-mode.md) - Production runs the Clerk production instance through an edge function on this domain, because Clerk cannot own a vercel.app subdomain.
* [Colours are tokens, in one file](design-tokens-only.md) - Every colour is a theme token from palette.mjs with a light and a dark value; no hex value or Tailwind palette name in a view.
* [History routing, no hash bridge](history-routing.md) - The router runs on plain paths, and old hash links get no redirect.
* [One grouped table component](grouped-table.md) - Groups of rows with subtotals are drawn by GroupedTable, never by a table nested in a cell.
* [One player name standard](player-name-standard.md) - A player reads flag, name, race, MMR, in that order, on every page and on every Discord card, through one component.
* [Titles that name a thing in Title Case, sentences and actions in sentence case](title-case.md) - An h1, a menu entry, and a banner, card, dialog or section title or group label that names a thing take Title Case; a title that reads as a sentence or an action, buttons, labels, columns and chips take sentence case.
* [The player panel opens only on drafting pages](player-panel-drafting-only.md) - A player name links to the player page everywhere except on a page that holds unsaved draft work, where it opens a side panel and shows a dock icon.
* [The veto is entered inside Report Result](veto-in-report-result.md) - The Report Result dialog holds the veto board under a disclosure row, so a player never leaves the dialog to record the veto, and the veto warns but never blocks.
