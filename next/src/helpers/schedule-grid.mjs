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

/** The half hours of one day. A day that changes its offset holds 46 or 50 of them.
 *  `sides` holds one span list per player, in the order the dialog draws them. */
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
