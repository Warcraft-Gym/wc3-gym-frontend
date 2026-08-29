import { DateTime } from 'luxon';

/**
 * W3Champions Stats Helper
 * 
 * Provides utilities for working with W3C stats including fallback logic
 * to previous season when current season stats are not available.
 */

/**
 * Get W3C stats for a player with season fallback
 * 
 * @param {Object} player - Player object containing w3c_stats array
 * @param {string} race - Race to get stats for (defaults to player.race)
 * @param {number} currentSeason - Current W3C season number
 * @returns {Object|null} - W3C stats object or null if not found
 */
export function getW3CStatsWithFallback(player, race = null, currentSeason = null) {
  if (!player || !player.w3c_stats || player.w3c_stats.length === 0) {
    return null;
  }

  const targetRace = race || player.race;
  if (!targetRace) {
    return null;
  }

  // Filter stats for the target race (case-insensitive comparison)
  const raceStats = player.w3c_stats.filter(s => 
    s.race && s.race.toUpperCase() === targetRace.toUpperCase()
  );
  if (raceStats.length === 0) {
    return null;
  }

  // If no current season specified, return the most recent stats
  if (!currentSeason) {
    return raceStats.reduce((latest, current) => {
      if (!latest) return current;
      return (current.wc3_season || 0) > (latest.wc3_season || 0) ? current : latest;
    }, null);
  }

  // Try to find stats for current season
  let stats = raceStats.find(s => s.wc3_season === currentSeason);
  
  // If not found, try previous season (currentSeason - 1)
  if (!stats) {
    stats = raceStats.find(s => s.wc3_season === currentSeason - 1);
  }

  // If still not found, return the most recent available stats
  if (!stats) {
    stats = raceStats.reduce((latest, current) => {
      if (!latest) return current;
      return (current.wc3_season || 0) > (latest.wc3_season || 0) ? current : latest;
    }, null);
  }

  return stats;
}

/**
 * Get combined games count from W3C stats for current season AND previous season (currentSeason - 1).
 * 
 * @param {Object} player - Player object
 * @param {number} currentSeason - Current W3C season (required)
 * @returns {number} - Combined games count across both seasons
 */
export function getW3CGamesCount(player, currentSeason) {
  if (!player || !player.w3c_stats || player.w3c_stats.length === 0 || !currentSeason) {
    return 0;
  }

  const targetRace = player.race;
  if (!targetRace) {
    return 0;
  }

  let total = 0;

  // Add games from current season
  const currentStats = player.w3c_stats.find(s =>
    s.race && s.race.toUpperCase() === targetRace.toUpperCase() &&
    s.wc3_season === currentSeason
  );
  if (currentStats) {
    total += Number(currentStats.wins || 0) + Number(currentStats.losses || 0);
  }

  // Add games from previous season
  const prevStats = player.w3c_stats.find(s =>
    s.race && s.race.toUpperCase() === targetRace.toUpperCase() &&
    s.wc3_season === currentSeason - 1
  );
  if (prevStats) {
    total += Number(prevStats.wins || 0) + Number(prevStats.losses || 0);
  }

  return total;
}

/**
 * Get W3C stats for all races
 * 
 * @param {Object} player - Player object
 * @param {number} currentSeason - Current W3C season (optional)
 * @returns {Array} - Array of W3C stats objects for all races
 */
export function getAllRaceStats(player, currentSeason = null) {
  if (!player || !player.w3c_stats || player.w3c_stats.length === 0) {
    return [];
  }

  const races = ['HU', 'OC', 'UD', 'NE', 'RANDOM'];
  return races
    .map(race => getW3CStatsWithFallback(player, race, currentSeason))
    .filter(stats => stats !== null);
}

/**
 * Get W3C MMR for a player with fallback
 * 
 * @param {Object} player - Player object
 * @param {number} currentSeason - Current W3C season (optional, null = use fallback)
 * @returns {number} - MMR value (0 if not found)
 */
export function getW3CMMR(player, currentSeason = null) {
  const stats = getW3CStatsWithFallback(player, null, currentSeason);
  return stats ? (stats.mmr || 0) : 0;
}

/**
 * Get the w3champions season the MMR shown for a player came from
 *
 * @param {Object} player - Player object
 * @param {number} currentSeason - Current W3C season (optional, null = newest available)
 * @returns {number|null} - Season number of the stats used, or null when there are none
 */
export function getW3CMMRSeason(player, currentSeason = null) {
  const stats = getW3CStatsWithFallback(player, null, currentSeason);
  return stats ? (stats.wc3_season ?? null) : null;
}

/**
 * Check if player has W3C stats for current OR previous season (currentSeason - 1).
 * Used for eligibility warning display.
 *
 * @param {Object} player - Player object
 * @param {number} currentSeason - Current W3C season (required)
 * @returns {boolean} - True if stats exist for either season
 */
export function hasW3CStatsTwoSeasons(player, currentSeason) {
  if (!player || !player.w3c_stats || player.w3c_stats.length === 0 || !currentSeason) {
    return false;
  }

  const targetRace = player.race;
  if (!targetRace) {
    return false;
  }

  return player.w3c_stats.some(s =>
    s.race && s.race.toUpperCase() === targetRace.toUpperCase() &&
    (s.wc3_season === currentSeason || s.wc3_season === currentSeason - 1)
  );
}

/**
 * Check if combined games count across current and previous season is below threshold.
 * Used for eligibility warning display.
 *
 * @param {Object} player - Player object
 * @param {number} currentSeason - Current W3C season (required)
 * @param {number} threshold - Minimum games threshold (default: 20)
 * @returns {boolean} - True if combined games are below threshold (and player has some stats)
 */
export function hasLowGamesTwoSeasons(player, currentSeason, threshold = 20) {
  if (!hasW3CStatsTwoSeasons(player, currentSeason)) {
    return false;
  }

  const games = getW3CGamesCount(player, currentSeason);
  return games > 0 && games < threshold;
}

/**
 * Relative time since a player's W3C stats were last fetched
 *
 * @param {Object} player - Player object
 * @returns {string} - e.g. "2 hours ago", or "never synced"
 */
export function syncedAgo(player) {
  return agoFromIso(player?.w3c_synced_at);
}

/**
 * Full local timestamp of a player's last W3C stats fetch
 *
 * @param {Object} player - Player object
 * @returns {string} - e.g. "2026-08-26 14:03", or "never synced"
 */
export function syncedAt(player) {
  return localFromIso(player?.w3c_synced_at);
}

/**
 * Relative time since a UTC timestamp
 *
 * @param {string|null} iso - UTC timestamp the backend sent
 * @returns {string} - e.g. "2 hours ago", or "never synced"
 */
export function agoFromIso(iso) {
  return iso ? DateTime.fromISO(iso, { zone: 'utc' }).toRelative() : 'never synced';
}

/**
 * A UTC timestamp as a full local timestamp
 *
 * @param {string|null} iso - UTC timestamp the backend sent
 * @returns {string} - e.g. "2026-08-26 14:03", or "never synced"
 */
export function localFromIso(iso) {
  return iso ? DateTime.fromISO(iso, { zone: 'utc' }).toLocal().toFormat('yyyy-LL-dd HH:mm') : 'never synced';
}
