/**
 * The GNL games rule: how many W3C ladder games a player has on one race over the current
 * and the previous w3champions season, and the mark the player line draws when he is short.
 * The backend's race_mmrs summary carries the window; the threshold is a parameter, so an
 * event setting can carry it once the backend holds one.
 */

/**
 * The race_mmrs entry of one race: a window entry (stale false) or a profile's older one (stale true)
 *
 * @param {Object} player - Player object carrying race_mmrs
 * @param {string} race - Race to read (required, null gives null)
 * @returns {Object|null} - { race, wc3_season, mmr, games, wins, losses, stale }, or null when the race has none
 */
export function getRaceMmr(player, race = null) {
  if (!race) return null;
  return (player?.race_mmrs || []).find(entry => entry.race && entry.race.toUpperCase() === race.toUpperCase()) ?? null;
}

// The window entry of one race, which the games rule reads; a stale entry does not count
const liveEntry = (player, race) => {
  const entry = getRaceMmr(player, race);
  return entry && !entry.stale ? entry : null;
};

/**
 * The games of one race over the current and the previous season
 *
 * @param {Object} player - Player object
 * @param {string} race - Race to count for (required, null gives no games)
 * @returns {number} - The window games of that race, 0 when it has none
 */
export function getW3CGamesCount(player, race = null) {
  return Number(liveEntry(player, race)?.games || 0);
}

/**
 * Check if player has W3C stats for the current or the previous season on one race.
 * Used for eligibility warning display.
 *
 * @param {Object} player - Player object
 * @param {string} race - Race to check (required, null gives false)
 * @returns {boolean} - True when the race has a window entry
 */
export function hasW3CStatsTwoSeasons(player, race = null) {
  return !!liveEntry(player, race);
}

/**
 * Check if the games over the current and the previous season are below threshold.
 * Used for eligibility warning display.
 *
 * @param {Object} player - Player object
 * @param {string} race - Race to check (required, null gives false)
 * @param {number} threshold - Minimum games threshold (default: 20)
 * @returns {boolean} - True if the window games are below threshold (and player has some)
 */
export function hasLowGamesTwoSeasons(player, race = null, threshold = 20) {
  const games = getW3CGamesCount(player, race);
  return games > 0 && games < threshold;
}

/**
 * The one mark for a race W3Champions holds no rating for, so every surface reads the same.
 * A line that names no race, such as a signup nobody placed in a bracket yet, drops the race.
 *
 * @param {string|null} race - Race the rating is missing for, or null for the whole player
 * @returns {{colour: 'error', text: string}}
 */
export const noStatsWarning = (race = null) => ({
  colour: 'error',
  text: race ? `No W3C stats found for ${race}` : 'No W3C stats found',
});

/**
 * The games-rule mark of one player on one race, as the player line draws it
 *
 * @param {Object} player - Player object
 * @param {string} race - Race to check (required, null gives no mark)
 * @param {number} threshold - Minimum games threshold (default: 20)
 * @returns {{colour: 'error'|'warning', text: string}|null} - error when W3C holds no stats, warning under the rule, null when the player passes
 */
export function gamesWarning(player, race = null, threshold = 20) {
  if (!race) {
    return null;
  }

  if (!hasW3CStatsTwoSeasons(player, race)) {
    return noStatsWarning(race);
  }

  if (hasLowGamesTwoSeasons(player, race, threshold)) {
    const games = getW3CGamesCount(player, race);
    return { colour: 'warning', text: `Less than ${threshold} games (${games} games) for ${race}` };
  }

  return null;
}
