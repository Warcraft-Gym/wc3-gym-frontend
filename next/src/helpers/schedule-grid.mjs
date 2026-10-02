// The schedule dialog's time arithmetic: the round window as days on the viewer's
// clock, the hours at least one player blocks, and one picked point on both clocks.
import { DateTime } from 'luxon';
import { gmt } from './timezone.mjs';

// Every value the free-time read answers is UTC
const at = (value) => (DateTime.isDateTime(value) ? value : DateTime.fromISO(String(value), { zone: 'UTC' }));

/** The window minus the shared free ranges: the spans at least one of the two blocks. */
export const blockedSpans = (free = [], start, end) => {
  const from = at(start);
  const to = at(end);
  const open = free.map((range) => [at(range.start), at(range.end)]).sort((a, b) => a[0] - b[0]);
  const spans = [];
  let edge = from;
  for (const [lo, hi] of open) {
    if (lo > edge) spans.push({ start: edge, end: DateTime.min(lo, to) });
    if (hi > edge) edge = hi;
  }
  if (edge < to) spans.push({ start: edge, end: to });
  return spans.filter((span) => span.start < span.end);
};

/** One side's own blocked ranges as spans, clipped to the window; a range outside it drops. */
export const sideSpans = (ranges = [], start, end) => {
  const from = at(start);
  const to = at(end);
  return ranges
    .map((range) => ({ start: DateTime.max(at(range.start), from), end: DateTime.min(at(range.end), to) }))
    .filter((span) => span.start < span.end);
};

/** One entry per day of the window on the viewer's clock; a day wholly in the past is dropped. */
export const windowDays = (start, end, zone, now = DateTime.now()) => {
  const from = DateTime.max(at(start), at(now)).setZone(zone);
  const to = at(end).setZone(zone);
  if (!(from < to)) return [];
  const today = at(now).setZone(zone);
  const days = [];
  for (let day = from.startOf('day'); day < to; day = day.plus({ days: 1 }).startOf('day')) {
    days.push({
      key: day.toISODate(),
      day,
      label: day.toFormat('ccc d LLL'),
      today: day.hasSame(today, 'day'),
      first: DateTime.max(day, from),
      last: DateTime.min(day.plus({ days: 1 }).startOf('day'), to),
    });
  }
  return days;
};

/** The half hours of one day, `sides` one span list a player in draw order; a day that changes its offset holds 46 or 50. */
export const dayCells = ({ day, first, last }, blocked = [], sides = []) => {
  const end = day.plus({ days: 1 }).startOf('day');
  const cells = [];
  for (let cur = day; cur < end; cur = cur.plus({ minutes: 30 })) {
    cells.push({
      at: cur,
      label: cur.toFormat('HH:mm'),
      outside: cur < first || cur >= last,
      blocked: insideBlocked(cur, blocked),
      sides: sides.map((spans) => insideBlocked(cur, spans)),
    });
  }
  return cells;
};

/** Does the picked point sit inside a span at least one player blocks? */
export const insideBlocked = (pick, blocked = []) =>
  !!pick && blocked.some((span) => pick >= span.start && pick < span.end);

/** The time columns of a calendar: the viewer's clock first, then each person's, one column per
 *  distinct UTC offset at `instant`, naming everyone on it. A person with no zone gets no column. */
export const zoneColumns = (viewer, people = [], instant = null) => {
  const when = instant ? at(instant) : DateTime.utc();
  const columns = [];
  const add = (zone, name) => {
    const there = when.setZone(zone);
    if (!there.isValid) return;
    const found = columns.find((one) => one.offset === there.offset);
    if (found) found.names.push(name);
    else columns.push({ zone, offset: there.offset, names: [name] });
  };
  add(viewer, 'You');
  for (const person of people) if (person.zone) add(person.zone, person.name);
  return columns.map((one) => ({ ...one, label: one.names.join(' · '), gmt: gmt(one.offset) }));
};

/** One calendar row on a column's clock: its time, and "+1d" or "−1d" where that clock is on
 *  another day than the viewer's. */
export const clockCell = (point, zone, viewer) => {
  const there = point.setZone(zone);
  const here = point.setZone(viewer);
  const days = Math.round(
    DateTime.fromISO(there.toISODate(), { zone: 'UTC' }).diff(DateTime.fromISO(here.toISODate(), { zone: 'UTC' }), 'days').days,
  );
  return { time: there.toFormat('HH:mm'), shift: days > 0 ? `+${days}d` : days < 0 ? `−${-days}d` : '' };
};

/** One row of the bottom section: the picked point on one player's clock. */
export const zoneRow = (pick, zone, viewer) => {
  const there = pick.setZone(zone);
  const here = pick.setZone(viewer);
  return {
    zone,
    gmt: gmt(there.offset),
    time: there.toFormat('HH:mm'),
    date: there.toFormat('ccc d LLL'),
    // the dialog names the date on a row whose clock is on another day
    differs: there.toISODate() !== here.toISODate(),
  };
};
