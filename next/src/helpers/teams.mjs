// How a team reads and where its page lives. TeamName draws both.

// A team reads by its long name, and by its tag when it carries no long name.
export const teamLabel = (team) => team?.long_name || team?.name || '';

// The team page path. A season key opens the season team page, the way the season
// pages and the ladder link today; without one the link is the plain team page.
// A team the payload names without an id has no page.
export const teamPath = (team, seasonKey) => {
  if (team?.id == null) return null;
  return seasonKey == null || seasonKey === '' ? `/team/${team.id}` : `/team/${team.id}/season/${seasonKey}`;
};
