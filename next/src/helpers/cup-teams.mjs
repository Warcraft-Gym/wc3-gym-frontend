// The teams of a team cup as the pages read them: the caller's own team, what a team still
// waits for, and the ladder pool a cup of that size can start from. The entrant rows carry a
// cup team's `roster` (confirmed players, the captain first) and `invited` (no answer yet).

/** The team sizes a cup is played in, and the W3Champions ladder pool of each; 3v3 has none.
 *  @type {Record<number, string | null>} */
export const LADDER_MODES = { 1: '1v1', 2: '2v2', 3: null, 4: '4v4' };

/** The ladder mode a cup of this team size reads its pool from, or null for none.
 *  @param {number | null | undefined} teamSize */
export const ladderModeOf = (teamSize) => (teamSize ? LADDER_MODES[teamSize] ?? null : '1v1');

/** The cup team the caller plays for or is invited by, and their place in it.
 *  @param {any[]} entrants @param {number | null | undefined} userId
 *  @returns {{ entrant: any, captain: boolean, invited: boolean } | null} */
export function myTeam(entrants = [], userId = null) {
  if (userId == null) return null;
  for (const entrant of entrants) {
    if (!entrant?.team || entrant.withdrawn_at) continue;
    const member = (entrant.roster || []).find((one) => one.user?.id === userId);
    if (member) return { entrant, captain: !!member.captain, invited: false };
    if ((entrant.invited || []).some((one) => one.id === userId)) return { entrant, captain: false, invited: true };
  }
  return null;
}

/** The players a team still needs before it may be drawn: the size less the confirmed roster.
 *  @param {any} entrant @param {number} teamSize */
export const missing = (entrant, teamSize) => Math.max(0, (teamSize || 0) - (entrant?.roster?.length || 0));

/** What a team row says about its state, for the captain and for the run page.
 *  @param {any} entrant @param {number} teamSize */
export function teamState(entrant, teamSize) {
  const short = missing(entrant, teamSize);
  if (!short) return 'Complete';
  const invited = entrant?.invited || [];
  // one open invite names the player it waits for; more read as a count
  if (invited.length === 1 && short === 1 && invited[0]?.name) return `Waiting for ${invited[0].name} to accept`;
  if (invited.length >= short) return `Waiting for ${short} of ${teamSize - 1} to accept`;
  return `${short} ${short === 1 ? 'player' : 'players'} missing`;
}

/** The teams the caller plays for in a cup, by team id, so a box of the draw knows its side.
 *  @param {any[]} entrants @param {number | null | undefined} userId */
export const teamIdsOf = (entrants = [], userId = null) =>
  entrants.filter((entrant) => entrant?.team && (entrant.roster || []).some((one) => one.user?.id === userId)).map((entrant) => entrant.team.id);
