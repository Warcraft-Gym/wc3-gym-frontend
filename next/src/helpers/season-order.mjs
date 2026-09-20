// Season order is the order the seasons ran, never the order of their ids.
//
// The old league seasons were imported long after seasons 17 and 18, so they
// carry higher ids while having run years earlier. Sort on the start date and
// keep the id only to break a tie, so a season with no date still lands
// somewhere stable.

const started = (season) => {
  const value = Date.parse(season?.start_date ?? season?.startDate ?? "");
  return Number.isNaN(value) ? null : value;
};

/** Oldest season first. Pass to sort(). */
export const byOldest = (a, b) => {
  const left = started(a);
  const right = started(b);
  if (left !== null && right !== null && left !== right) return left - right;
  if (left === null && right !== null) return -1;
  if (left !== null && right === null) return 1;
  return (a?.id ?? 0) - (b?.id ?? 0);
};

/** Newest season first. Pass to sort(). */
export const byNewest = (a, b) => byOldest(b, a);
