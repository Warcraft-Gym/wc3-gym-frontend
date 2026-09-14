---
type: Page
title: Site admin
description: The settings, the Discord role bindings, the admin list, the map catalogue and the user guide.
tags: [pages, admin, config]
generated: { by: claude-code/claude-fable-5-1, at: 2026-09-14T16:00:00Z }
sources:
  - id: config
    resource: ../../../src/views/ConfigView.vue
    title: The settings
  - id: roles
    resource: ../../../src/views/DiscordRolesView.vue
    title: The Discord role bindings
  - id: access
    resource: ../../../src/views/AccessView.vue
    title: The admin list
  - id: maps
    resource: ../../../src/views/MapsView.vue
    title: The map catalogue
  - id: guide
    resource: ../../../src/views/UserGuideView.vue
    title: The user guide page
  - id: store
    resource: ../../../src/stores/config.store.js
    title: Every config write
---

# Routes

| Path | Lowest role | View |
|---|---|---|
| `/config` | admin | `ConfigView` |
| `/config/discord-roles` | admin | `DiscordRolesView` |
| `/config/access` | admin | `AccessView` |
| `/maps` | admin | `MapsView` |
| `/user-guide` | admin | `UserGuideView` |

# What it does

**Settings (`/config`).** One form over the settings the backend stores, in groups: the W3Champions season and API URL; the current GNL season; whether fantasy team creation is enabled; the fantasy bet points (fixed or a minimum and a maximum); the Discord bot's invite URL, its two role ids and its channel ids (signup, player profile, fantasy dashboard, scheduling, results, content); and the KOTH Nightbot token, shown hidden, copied with one button and replaced with another, with the Nightbot command to paste. Save writes the changed settings.

**Discord roles (`/config/discord-roles`).** One card per role of the Discord server, in three columns: managed, where the sync grants and removes the role; ignored, bound but applied by hand; and not bound. A card moves by drag, by double click or by its buttons, and a binding names the group it points at: a season's players, a team's roster, a captains group and so on, counted over the current season, one season or every season. A role that sits above the bot's own role is locked. Roles that do not matter are hidden under the last column. A table view lists the same roles in rows. "Sync all" applies every managed binding; the report under it lists the accounts whose Discord roles differ from the database, with a sync per account and per role.

**Access (`/config/access`).** The gym admins: the player, when granted, and the source, app or environment. "Add admin" takes a player from the list or a Discord id. An app-granted admin can be removed; an admin cannot remove their own row.

**Maps (`/maps`).** Every 1v1 map as a card with its picture and short name. Add a map (name, short name, picture), edit one, delete one, and import the W3Champions ladder pool.

**User guide (`/user-guide`).** The admin guide `ADMIN_UI_USER_GUIDE.md`, rendered from the repository file.

# Writes

| Store action | Route |
|---|---|
| `config.updateSettings` | `PUT /config/settings` |
| `config.generateKothNightbotToken` | `POST /config/koth/nightbot-token` |
| `config.syncDiscordRoles` | `POST /config/discord-roles/sync`, with `user_ids` or `role_ids` to narrow it |
| `config.createDiscordRoleBinding` | `POST /config/discord-role-bindings` |
| `config.updateDiscordRoleBinding` | `PUT /config/discord-role-bindings/{id}` |
| `config.deleteDiscordRoleBinding` | `DELETE /config/discord-role-bindings/{id}` |
| `config.hideDiscordRole` | `POST /config/discord-hidden-roles` |
| `config.unhideDiscordRole` | `DELETE /config/discord-hidden-roles/{role}` |
| `config.addAdmin` | `POST /config/admins` |
| `config.removeAdmin` | `DELETE /config/admins/{discord_id}` |
| `map.createMap` | `POST /maps` |
| `map.updateMap` | `PUT /maps/{id}` |
| `map.uploadMapImage` | `POST /maps/{id}/image` |
| `map.deleteMap` | `DELETE /maps/{id}` |
| `map.importLadderMaps` | `POST /maps/ladder-import` |

# Rules

- The settings keys and the roles are the backend's: [the backend contract](../concepts/backend-contract.md).
- An admin may view the app as a lower role from the app bar: [session and auth](../concepts/session-and-auth.md).
- A dialog that deletes something wears the error colour; every colour is a token: [colours are tokens, in one file](../decisions/design-tokens-only.md).
