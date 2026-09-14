---
okf_version: "0.2"
---

# wc3-gym-frontend knowledge bundle

This directory is an [Open Knowledge Format](https://github.com/GoogleCloudPlatform/open-knowledge-format) bundle for the web app of the Warcraft Gym league. Start with [the repository overview](overview.md). Every file is one concept with YAML frontmatter; [how this bundle is written](conventions/okf-bundle.md) explains the fields, the links and the rule for other repositories.

# Sections

* [Overview](overview.md) - The Vue 3 web app of the Warcraft Gym league, on Vercel, signed in through Clerk, reading everything from the backend API.
* [conventions](conventions/index.md) - Code style, git and pull requests, testing, and this bundle.
* [concepts](concepts/index.md) - The app shell and routing, the session, the backend contract as consumed here, the stores, the shared components, the read-only embed, the theme.
* [pages](pages/index.md) - One concept per page area: its routes, what each role does there, and the writes it makes, from the member's home to the event run page.
* [runbooks](runbooks/index.md) - Run locally, build and preview, deploy.
* [decisions](decisions/index.md) - What was decided, when, why, and what it means for new code.
* [pitfalls](pitfalls/index.md) - Mistakes made once, with the rule that avoids each.

# Neighbouring bundles

The app is three repositories. Each carries its own bundle at `docs/okf/`. This bundle names the others only through their contracts (routes, headers, environment variable names, payload shapes), never through a file path into them.

* `wc3-gym-backend` - https://github.com/Warcraft-Gym/wc3-gym-backend - the API this app reads; it owns the domain model, the roles and every payload.
* `wc3-gym-discord-bot` - https://github.com/Warcraft-Gym/wc3-gym-discord-bot - the Discord interactions adapter and the cast-reminder worker.

# Other documents in this repository

* [README](../../README.md) - Setup, the dev server, environment values, scripts.
* [DESIGN.md](../../DESIGN.md) - Every colour token, the type, the casing rules, the shared components, the events vocabulary, the known gaps.
* [ADMIN_UI_USER_GUIDE.md](../../ADMIN_UI_USER_GUIDE.md) - The admin guide, page by page.
