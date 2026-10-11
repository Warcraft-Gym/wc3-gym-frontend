// A placement bracket, read the way app/services/stage_engine.py writes it: every round splits
// each group into its winners and its losers, and a group is the range of places it plays for.
// The backend names each series' range in place_from and place_to.

/** How a range of places reads: "Places 5–8", or "Place 3" for one.
 *  @param {number | null | undefined} from @param {number | null | undefined} to */
export const placesTitle = (from, to) => (from == null ? 'Places' : from === to || to == null ? `Place ${from}` : `Places ${from}–${to}`);

/** The groups of one round, best places first, each with its series in play order.
 *  @param {any[]} series */
export function placementGroups(series = []) {
  const groups = new Map();
  for (const row of series) {
    const key = `${row.place_from ?? 0}-${row.place_to ?? 0}`;
    if (!groups.has(key)) groups.set(key, { key, from: row.place_from ?? null, to: row.place_to ?? null, round: row.round_id ?? null, series: [] });
    groups.get(key).series.push(row);
  }
  return [...groups.values()]
    .sort((a, b) => (a.from ?? Infinity) - (b.from ?? Infinity))
    .map((group) => ({ ...group, title: placesTitle(group.from, group.to) }));
}

/** The columns of the drawing: one a round, each holding its groups. The final is a round of its
 *  own in the backend, so it plays its own best-of, and here it joins the last round at its top,
 *  since both are played at the same time.
 *  @param {{ key: any, name: string, series: any[] }[]} cols the rounds, as `columns` reads them */
export function placementColumns(cols = []) {
  const drawn = cols.map((column) => ({ key: column.key, name: column.name, series: column.series, groups: placementGroups(column.series) }));
  const final = drawn.at(-1);
  const last = drawn.at(-2);
  if (final?.name === 'Final' && last?.name === 'Last round') {
    return [
      ...drawn.slice(0, -2),
      { key: last.key, name: 'Last round', series: [...final.series, ...last.series], groups: [...final.groups.map((group) => ({ ...group, final: true })), ...last.groups] },
    ];
  }
  if (final?.name === 'Final') final.groups = final.groups.map((group) => ({ ...group, final: true }));
  return drawn;
}

/** The places a table hands out, a shared place as its range: "9–12" where four rows stand at 9.
 *  @param {any[]} rows rows of a stage table, each with its position */
export function placeLabels(rows = []) {
  const counts = new Map();
  for (const row of rows) counts.set(row.position, (counts.get(row.position) || 0) + 1);
  return rows.map((row) => {
    const shared = counts.get(row.position) || 1;
    return shared > 1 ? `${row.position}–${row.position + shared - 1}` : String(row.position);
  });
}
