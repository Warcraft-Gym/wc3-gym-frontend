---
type: Decision
title: Titles that name a thing in Title Case, sentences and actions in sentence case
description: An h1, a menu entry, and a banner, card, dialog or section title or group label that names a thing take Title Case; a title that reads as a sentence or an action, buttons, labels, columns and chips take sentence case.
tags: [design, tooling]
generated: { by: claude-code/claude-fable-5-1, at: 2026-10-06T10:33:26Z }
sources:
  - id: source
    resource: ../../../DESIGN.md
    title: Words on the page
---

# Decision

Made 2026-09-13 and extended 2026-09-27. A page title is the name of a place in the app; a button is an instruction. A banner, card, dialog or section title or a sidebar group label follows what it says: "App Settings", "My Accounts" and "Upcoming Series" name a thing and take Title Case; "Sign in as a player", "Open signups" and "Admin token login" read as a sentence or an action and take sentence case. The league is "Gym Newbie League" in a title or a group label, and "GNL" only in a chip or a tight cell.

# Consequences

Put this line in every frontend brief: h1, navigation entries and titles that name a thing in Title Case; titles that read as a sentence or an action, and everything else, in sentence case. A label shows as written, with three exceptions that CSS draws in upper case: the group labels of the admin sidebar, the kicker of the page header and the group labels of the Discord roles lists.
