import { DateTime } from 'luxon';

// A played series stays on the schedule this long, because its caster still owes a VOD
export const KEEP_DAYS = 7;

// A bare value is UTC; a zoned one carries its own offset, as formatDateTime reads it
export const local = (value) => DateTime.fromISO(value, { zone: 'UTC' }).toLocal();

// The scheduled series by day in the reader's own zone, soonest first: a caster
// plans an evening, not a round. A series with no time is left out.
export const scheduleDays = (series, now = DateTime.local()) => {
  const from = now.minus({ days: KEEP_DAYS });
  const rows = series
    .filter((row) => row.date_time && local(row.date_time) >= from)
    .sort((a, b) => local(a.date_time) - local(b.date_time));
  const days = new Map();
  for (const row of rows) {
    const day = local(row.date_time);
    const key = day.toISODate();
    if (!days.has(key)) days.set(key, { key, title: day.toFormat('cccc, d LLLL'), rows: [], cast: 0 });
    const group = days.get(key);
    group.rows.push(row);
    if (row.casts?.length) group.cast += 1;
  }
  return [...days.values()];
};
