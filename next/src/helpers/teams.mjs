// How a team reads and where its page lives. TeamName draws both.

// A team reads by its long name, and by its tag when it carries no long name.
export const teamLabel = (team) => team?.long_name || team?.name || '';

// The team page path: a season key opens the season team page, and a team with no id has no page.
export const teamPath = (team, seasonKey) => {
  if (team?.id == null) return null;
  return seasonKey == null || seasonKey === '' ? `/team/${team.id}` : `/team/${team.id}/season/${seasonKey}`;
};
