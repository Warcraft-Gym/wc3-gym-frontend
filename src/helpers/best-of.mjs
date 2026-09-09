// A season with no map rules plays GNL's format: the round's fixed map, then the loser picks
export const DEFAULT_RULES = 'fixed,loser,loser';

// A season's best-of is the number of maps its rules list: "veto,veto,veto" is a Bo3
export const gamesOf = (mapRules) => (mapRules || '').split(',').filter((rule) => rule.trim()).length || 3;

export const winsOf = (mapRules) => Math.floor(gamesOf(mapRules) / 2) + 1;

// A result stands when the winner has every win the series needs and the loser fewer
export const isValidResult = (p1, p2, wins) => p1 >= 0 && p2 >= 0 && ((p1 === wins && p2 < wins) || (p2 === wins && p1 < wins));

// One replay per map played
export const replaysNeeded = (p1, p2) => p1 + p2;

// 0-0 records a series that was never played. Only an admin may store it: voiding
// his own series would drop a game a player was losing out of the standings
export const neverPlayed = (p1, p2) => p1 === 0 && p2 === 0;

// Why a pair of map scores is not a result an admin may store, or null
export const resultProblem = (p1, p2, mapRules) => {
  const wins = winsOf(mapRules);
  if (isValidResult(p1, p2, wins) || neverPlayed(p1, p2)) return null;
  if (Number.isNaN(p1) || Number.isNaN(p2)) return 'Enter both map scores';
  return `A Bo${gamesOf(mapRules)} ends when one player wins ${wins} maps, or 0-0 when it was never played`;
};
