// meta.role: the lowest session role the route accepts; nav = false hides the nav links
export type Role = "public" | "guest" | "member" | "captain" | "admin";
export type RouteMeta = { role: Role; nav?: boolean; season?: boolean };

const RANK: Record<string, number> = { public: 0, guest: 1, member: 2, captain: 3, admin: 4 };

// a session with no role claim is a member, which is what the admin-token login mints
export const canSeeRole = (role: string | undefined | null, need: string | undefined | null) =>
  RANK[role || "member"] >= RANK[need || "public"];
// where a login lands when no return path is saved
export const homePath = (role: string | undefined | null) => (canSeeRole(role, "member") ? "/" : "/profile");

// One entry per route of router.js:19-72, in the same order. A pattern segment is :name.
export const ROUTES: { path: string; meta: RouteMeta }[] = [
  { path: "/", meta: { role: "member" } },
  { path: "/login", meta: { role: "public" } },
  { path: "/sso-callback", meta: { role: "public", nav: false } },
  { path: "/admin-login", meta: { role: "public", nav: false } },
  { path: "/profile", meta: { role: "guest" } },
  { path: "/seasons", meta: { role: "admin" } },
  { path: "/signup", meta: { role: "member" } },
  { path: "/player-dashboard", meta: { role: "guest" } },  // a redirect in router.js: it needs a session, any role
  { path: "/availability", meta: { role: "member" } },
  { path: "/player-series/:id/veto", meta: { role: "member" } },
  { path: "/fantasy-registration", meta: { role: "member" } },
  { path: "/players", meta: { role: "member" } },
  { path: "/upcoming", meta: { role: "member" } },
  { path: "/player/:id", meta: { role: "member", season: true } },
  { path: "/seasons/:id", meta: { role: "member", season: true } },
  { path: "/seasons/:id/assign", meta: { role: "captain", season: true } },
  { path: "/seasons/:id/maps", meta: { role: "admin", nav: false, season: true } },
  { path: "/seasons/:id/achievements", meta: { role: "admin", nav: false, season: true } },
  { path: "/match/:id", meta: { role: "member" } },
  { path: "/series/:id", meta: { role: "public" } },
  { path: "/team/:id", meta: { role: "member" } },
  { path: "/team/:id/season/:season_id", meta: { role: "member", season: true } },
  { path: "/team/:id/season/:season_id/rounds", meta: { role: "captain", season: true } },
  { path: "/maps", meta: { role: "admin" } },
  { path: "/leagues", meta: { role: "public" } },
  { path: "/leagues/:id", meta: { role: "public" } },
  { path: "/events", meta: { role: "public" } },
  { path: "/events/new", meta: { role: "admin" } },
  { path: "/events/:id/entrants", meta: { role: "member" } },
  { path: "/events/:id/admin", meta: { role: "admin" } },
  { path: "/events/:id", meta: { role: "public" } },
  { path: "/teams", meta: { role: "member" } },
  { path: "/config", meta: { role: "admin" } },
  { path: "/config/discord-roles", meta: { role: "admin" } },
  { path: "/config/access", meta: { role: "admin" } },
  { path: "/fantasy", meta: { role: "member" } },
  { path: "/fantasy/bets", meta: { role: "admin" } },
  { path: "/fantasy/tiers", meta: { role: "admin" } },
  { path: "/koth", meta: { role: "admin" } },
  { path: "/koth/dashboard", meta: { role: "public" } },
  { path: "/koth/nights/:id", meta: { role: "admin" } },
  { path: "/user-guide", meta: { role: "admin" } },
  { path: "/report", meta: { role: "public" } },
  { path: "/report/:id", meta: { role: "public", season: true } },
  { path: "/ladder", meta: { role: "member" } },
  { path: "/random-stats", meta: { role: "public" } },
  { path: "/credits", meta: { role: "public" } },
  { path: "/no-access", meta: { role: "public" } },
];

const matches = (pattern: string, path: string) => {
  const a = pattern.split("/");
  const b = path.split("/");
  return a.length === b.length && a.every((seg, i) => seg.startsWith(":") || seg === b[i]);
};

/** The meta of the route that owns this path. A path no route names is public. */
export const metaOf = (path: string): RouteMeta =>
  ROUTES.find((r) => matches(r.path, path))?.meta ?? { role: "public" };
