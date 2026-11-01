import { MAP_MODES, modesOf } from './map-modes.mjs';

// What a page says when the ladder import could not read a map source. Each row names the source
// that knew its map and every source that could not be read.

const inWords = (names) => names.join(' and ');

/** The note for these rows, or null when every source it asked answered.
 *  @param {{ source?: string | null, unreached?: string[] }[] | null | undefined} rows */
export const unreachedNote = (rows) => {
  const unreached = (rows || []).find((row) => row.unreached?.length)?.unreached;
  if (!unreached) return null;
  const sources = [...new Set(rows.map((row) => row.source).filter(Boolean))];
  const pictures = sources.length ? `so the pictures come from ${inWords(sources)}` : 'so new maps have no picture';
  return `${inWords(unreached)} could not be reached, ${pictures}. A map without a short name gets its initials.`;
};

/** The note for the maps an import left without a picture, or null when each has one.
 *  @param {{ name: string, image?: string | null }[]} maps */
export const missingPicturesNote = (maps) => {
  const names = maps.filter((map) => !map.image).map((map) => map.name);
  if (!names.length) return null;
  return `Imported, but ${names.join(', ')} ${names.length === 1 ? 'has' : 'have'} no picture. Import again to try once more, or an admin can upload one on the Maps page.`;
};

export const ALL_MODES = 'all';

const holds = (row, mode) => modesOf(row.modes).includes(mode);

/** A site's rows played as this mode.
 *  @template {{ modes?: string | null }} R
 *  @param {R[]} rows @param {string} mode @returns {R[]} */
export const playedAs = (rows, mode) => (mode === ALL_MODES ? rows : rows.filter((row) => holds(row, mode)));

/** What a list can be narrowed to: the modes its rows hold, and the one chosen even when a search left none of it.
 *  @param {{ modes?: string | null }[]} rows @param {string} chosen */
export const modeChoices = (rows, chosen) => [
  { value: ALL_MODES, title: 'All' },
  ...MAP_MODES.filter((mode) => mode.value === chosen || rows.some((row) => holds(row, mode.value))),
];

/** Where a player finds a map to download: warcraft3.info's list, searched by the map's name. The
 *  app does not hold the site's id for a map's own page.
 *  @param {string} name */
export const mapSearchUrl = (name) => `https://warcraft3.info/maps?q=${encodeURIComponent(name)}`;
