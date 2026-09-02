import { useConfigStore, useSeasonStore } from '@/stores';

// Resolve the season id a page opens on.
// The `current_gnl_season` config key is optional, so fall back to the newest season.
// Returns null when the backend serves no seasons at all.
export async function resolveCurrentSeasonId() {
  const configStore = useConfigStore();
  const seasonStore = useSeasonStore();

  try {
    const setting = await configStore.fetchSetting('current_gnl_season');
    const seasonId = Number(setting?.value);
    if (setting?.value && !Number.isNaN(seasonId)) return seasonId;
  } catch (error) {
    console.warn('Failed to fetch the current_gnl_season setting:', error);
  }

  try {
    await seasonStore.fetchSeasons();
    const newest = (seasonStore.seasons || []).slice().sort((a, b) => b.id - a.id)[0];
    return newest ? newest.id : null;
  } catch (error) {
    console.error('Failed to fetch seasons for the current season fallback:', error);
    return null;
  }
}

// The season row a page opens on, so a page can read the season's own settings
// (fantasy_tiers and the rest). Returns null when the backend serves no seasons.
export async function resolveCurrentSeason() {
  const seasonStore = useSeasonStore();
  const seasonId = await resolveCurrentSeasonId();
  if (!seasonId) return null;

  try {
    return await seasonStore.fetchSeason(seasonId);
  } catch (error) {
    console.error('Failed to fetch the current season:', error);
    return null;
  }
}

// The season list a picker offers, empty when the fetch fails.
export async function loadSeasons() {
  const seasonStore = useSeasonStore();

  try {
    await seasonStore.fetchSeasons();
    return seasonStore.seasons || [];
  } catch (error) {
    console.error('Failed to load seasons:', error);
    return [];
  }
}

// Resolve the w3champions season the backend reports as in use.
// Returns null when nothing is configured and w3champions is unreachable.
export async function resolveCurrentW3CSeason() {
  const configStore = useConfigStore();

  try {
    const config = await configStore.fetchW3cConfig();
    const season = Number(config?.current_season);
    return config?.current_season == null || Number.isNaN(season) ? null : season;
  } catch (error) {
    console.warn('Failed to fetch the w3champions config:', error);
    return null;
  }
}
