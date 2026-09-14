---
type: Decision
title: Page titles in Title Case, everything else sentence case
description: An h1 and the app bar and menu entries are names and take Title Case; dialogs, buttons, labels, columns and chips are instructions and take sentence case.
tags: [decision, design, words]
generated: { by: claude-code/claude-fable-5-1, at: 2026-09-14T10:00:00Z }
sources:
  - id: source
    resource: ../../../DESIGN.md
    title: Words on the page
---

# Decision

Made 2026-09-13. A page title is the name of a place in the app; a button is an instruction.

# Consequences

Put this line in every frontend brief: h1 and navigation entries Title Case; everything else sentence case. `base.css` turns off Vuetify's capitals on buttons, so a label shows as written.
