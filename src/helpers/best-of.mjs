// A season's best-of is the number of maps its rules list: "veto,veto,veto" is a Bo3
export const gamesOf = (mapRules) => (mapRules || '').split(',').filter((rule) => rule.trim()).length || 3;

export const winsOf = (mapRules) => Math.floor(gamesOf(mapRules) / 2) + 1;

// A result stands when the winner has every win the series needs and the loser fewer
export const isValidResult = (p1, p2, wins) => p1 >= 0 && p2 >= 0 && ((p1 === wins && p2 < wins) || (p2 === wins && p1 < wins));

// One replay per map played
export const replaysNeeded = (p1, p2) => p1 + p2;
