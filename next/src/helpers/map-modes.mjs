// The modes a map is played as, mirroring MAP_MODES in app/models/types.py. A map stores them
// as "1v1,2v2"; a cup offers the maps of its own mode first.

export const MAP_MODES = [
  { value: '1v1', title: '1v1' },
  { value: '2v2', title: '2v2' },
  { value: '3v3', title: '3v3' },
  { value: '4v4', title: '4v4' },
  { value: '5v5', title: '5v5' },
  { value: '6v6', title: '6v6' },
  { value: '8v8', title: '8v8' },
  { value: 'ffa', title: 'FFA' },
  { value: 'custom', title: 'Custom' },
];

/** The modes a map names, as a list.
 *  @param {string | null | undefined} text @returns {string[]} */
export const modesOf = (text) => (text || '').split(',').map((mode) => mode.trim()).filter(Boolean);

/** The text a map stores, each mode once, in the order MAP_MODES names them.
 *  @param {string[]} modes */
export const modesText = (modes) => MAP_MODES.map((mode) => mode.value).filter((value) => modes.includes(value)).join(',') || null;

/** The modes as a reader sees them: "1v1 · 2v2", or a word for none.
 *  @param {string | null | undefined} text */
export const modesLine = (text) => modesOf(text).map((mode) => MAP_MODES.find((one) => one.value === mode)?.title || mode).join(' · ') || 'No mode set';

/** The mode a cup is played as: 1v1, or its team size as "2v2".
 *  @param {number | null | undefined} teamSize */
export const cupMode = (teamSize) => (teamSize ? `${teamSize}v${teamSize}` : '1v1');

/** The maps for a cup of that mode: its own maps first, then every other, each by name.
 *  @param {any[]} maps @param {string} mode */
export const forMode = (maps, mode) => [...maps].sort((a, b) => {
  const own = (map) => (modesOf(map.modes).includes(mode) ? 0 : 1);
  return own(a) - own(b) || String(a.name || '').localeCompare(String(b.name || ''));
});
