export type NavItem = { title: string; to: string; mark?: boolean };
export type NavGroup = { title: string; to: string; items?: NavItem[] };

/** One link tree drawn as the bar's menus on desktop and as the drawer on phones. */
export const navItems = (): NavGroup[] => [
  { title: "Home", to: "/" },
  {
    title: "GNL",
    to: "/report",
    items: [
      { title: "Season Report", to: "/report" },
      { title: "Upcoming", to: "/upcoming" },
      { title: "Teams", to: "/teams" },
      { title: "Ladder Grind", to: "/ladder", mark: true },
      { title: "Players", to: "/players" },
      { title: "Seasons", to: "/seasons" },
      { title: "1v1 Maps", to: "/maps" },
    ],
  },
  {
    title: "Events",
    to: "/events",
    items: [
      { title: "Leagues", to: "/leagues" },
      { title: "Events", to: "/events" },
    ],
  },
  {
    title: "Fantasy",
    to: "/fantasy",
    items: [
      { title: "Leaderboard", to: "/fantasy" },
      { title: "My Fantasy Team", to: "/fantasy-registration" },
      { title: "Manage Bets", to: "/fantasy/bets" },
      { title: "Player Tiers", to: "/fantasy/tiers" },
    ],
  },
  { title: "KOTH", to: "/koth" },
  {
    title: "Config",
    to: "/config",
    items: [
      { title: "Settings", to: "/config" },
      { title: "Discord Roles", to: "/config/discord-roles" },
      { title: "Access", to: "/config/access" },
    ],
  },
  { title: "User Guide", to: "/user-guide" },
];
