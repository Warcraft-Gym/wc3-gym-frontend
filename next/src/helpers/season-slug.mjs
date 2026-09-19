// The season's name as a URL key: "GNL S17" -> "gnl-s17"
export const seasonSlug = (season) => season.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');

// The season a URL key names, by slug first and by bare id for old links
export const findSeason = (seasons, key) =>
  seasons.find((season) => seasonSlug(season) === String(key)) ??
  seasons.find((season) => String(season.id) === String(key)) ??
  null;
