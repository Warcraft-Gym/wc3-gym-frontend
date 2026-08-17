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
