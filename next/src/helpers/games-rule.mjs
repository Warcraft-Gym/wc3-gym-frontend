/**
 * The GNL games rule: how many W3C ladder games a player has on one race over the current
 * and the previous w3champions season, and the mark the player line draws when he is short.
 * The threshold is a parameter, so an event setting can carry it once the backend holds one.
 */

/**
 * Get combined games count from W3C stats for current season AND previous season (currentSeason - 1).
 *
 * @param {Object} player - Player object
 * @param {number} currentSeason - Current W3C season (required)
 * @param {string} race - Race to count for (required, null gives no games)
 * @returns {number} - Combined games count across both seasons
 */
export function getW3CGamesCount(player, currentSeason, race = null) {
  if (!player || !player.w3c_stats || player.w3c_stats.length === 0 || !currentSeason) {
    return 0;
  }

  if (!race) {
    return 0;
  }

  let total = 0;

  // Add games from current season
  const currentStats = player.w3c_stats.find(s =>
    s.race && s.race.toUpperCase() === race.toUpperCase() &&
    s.wc3_season === currentSeason
  );
  if (currentStats) {
    total += Number(currentStats.wins || 0) + Number(currentStats.losses || 0);
  }

  // Add games from previous season
  const prevStats = player.w3c_stats.find(s =>
    s.race && s.race.toUpperCase() === race.toUpperCase() &&
    s.wc3_season === currentSeason - 1
  );
  if (prevStats) {
    total += Number(prevStats.wins || 0) + Number(prevStats.losses || 0);
  }

  return total;
}

/**
 * Check if player has W3C stats for current OR previous season (currentSeason - 1).
 * Used for eligibility warning display.
 *
 * @param {Object} player - Player object
 * @param {number} currentSeason - Current W3C season (required)
 * @param {string} race - Race to check (required, null gives false)
 * @returns {boolean} - True if stats exist for either season
 */
export function hasW3CStatsTwoSeasons(player, currentSeason, race = null) {
  if (!player || !player.w3c_stats || player.w3c_stats.length === 0 || !currentSeason) {
    return false;
  }

  if (!race) {
    return false;
  }

  return player.w3c_stats.some(s =>
    s.race && s.race.toUpperCase() === race.toUpperCase() &&
    (s.wc3_season === currentSeason || s.wc3_season === currentSeason - 1)
  );
}

/**
 * Check if combined games count across current and previous season is below threshold.
 * Used for eligibility warning display.
 *
 * @param {Object} player - Player object
 * @param {number} currentSeason - Current W3C season (required)
 * @param {string} race - Race to check (required, null gives false)
 * @param {number} threshold - Minimum games threshold (default: 20)
 * @returns {boolean} - True if combined games are below threshold (and player has some stats)
 */
export function hasLowGamesTwoSeasons(player, currentSeason, race = null, threshold = 20) {
  if (!hasW3CStatsTwoSeasons(player, currentSeason, race)) {
    return false;
  }

  const games = getW3CGamesCount(player, currentSeason, race);
  return games > 0 && games < threshold;
}

/**
 * The games-rule mark of one player on one race, as the player line draws it
 *
 * @param {Object} player - Player object
 * @param {number} currentSeason - Current W3C season (required)
 * @param {string} race - Race to check (required, null gives no mark)
 * @param {number} threshold - Minimum games threshold (default: 20)
 * @returns {{colour: 'error'|'warning', text: string}|null} - error when W3C holds no stats, warning under the rule, null when the player passes
 */
export function gamesWarning(player, currentSeason, race = null, threshold = 20) {
  if (!race || !currentSeason) {
    return null;
  }

  if (!hasW3CStatsTwoSeasons(player, currentSeason, race)) {
    return { colour: 'error', text: `No W3C stats found for ${race}` };
  }

  if (hasLowGamesTwoSeasons(player, currentSeason, race, threshold)) {
    const games = getW3CGamesCount(player, currentSeason, race);
    return { colour: 'warning', text: `Less than ${threshold} games (${games} games) for ${race}` };
  }

  return null;
}
