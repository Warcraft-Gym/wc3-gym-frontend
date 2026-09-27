import { DateTime } from 'luxon';
import { getRaceMmr } from './games-rule.mjs';

/**
 * W3Champions Stats Helper
 *
 * Reads the backend's race_mmrs summary: one entry per race, the window races
 * (current and previous W3C season) first, then a profile's stale races.
 */

// The games rule is pure and lives on its own, so node --test reads it without a bundler
export { gamesWarning, getW3CGamesCount, hasLowGamesTwoSeasons, hasW3CStatsTwoSeasons } from './games-rule.mjs';

/**
 * The summary entries of every race, window races first
 *
 * @param {Object} player - Player object carrying race_mmrs
 * @returns {Array} - The race_mmrs entries, empty when there are none
 */
export function getAllRaceStats(player) {
  return player?.race_mmrs || [];
}

/**
 * Get W3C MMR for a player on one race
 *
 * @param {Object} player - Player object
 * @param {string} race - Race to read (required, null gives no MMR)
 * @returns {number|null} - MMR value, or null when the race has no entry
 */
export function getW3CMMR(player, race = null) {
  return getRaceMmr(player, race)?.mmr ?? null;
}

// A player's w3champions profile page
export const w3cPlayerUrl = (battleTag) => `https://www.w3champions.com/player/${encodeURIComponent(battleTag)}`;

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
