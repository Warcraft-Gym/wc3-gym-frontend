// A player's soft blocks: the weekday bits the backend stores, the lines that
// read them back, and the free time two players of a series share.
import { DateTime } from 'luxon';
import { roundLabel } from './rounds.mjs';
import { viewerZone } from './timezone.mjs';

export const DAY_NAMES = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

const DAY = 24 * 60;

// ISO weekday bits: Monday = 1, Tuesday = 2, ... Sunday = 64
export const daysOf = (bits) => [1, 2, 3, 4, 5, 6, 7].filter(day => (bits ?? 0) & (1 << (day - 1)));
export const bitsOf = (days = []) => days.reduce((bits, day) => bits | (1 << (day - 1)), 0);

// "Mon–Fri", "Mon, Wed", "Every day"; a run of three days or more reads as a range
export const dayLabel = (bits) => {
  const days = daysOf(bits);
  if (days.length === 7) return 'Every day';
  const runs = [];
  for (const day of days) {
    const last = runs.at(-1);
    if (last && day === last[1] + 1) last[1] = day;
    else runs.push([day, day]);
  }
  return runs
    .map(([from, to]) => (to - from >= 2
      ? `${DAY_NAMES[from - 1]}–${DAY_NAMES[to - 1]}`
      : DAY_NAMES.slice(from - 1, to).join(', ')))
    .join(', ');
};

// "09:00:00" or "09:00" as minutes past local midnight
const minutes = (value) => {
  const [hour, minute] = String(value ?? '').split(':').map(Number);
  return (hour || 0) * 60 + (minute || 0);
};

const clock = (mins) => `${String(Math.floor(mins / 60)).padStart(2, '0')}:${String(mins % 60).padStart(2, '0')}`;

// An end at or before the start runs past midnight into the next day
export const pastMidnight = (block) => minutes(block?.end_local) <= minutes(block?.start_local);

// "Mon–Fri 09:00–17:00", or "Sat 22:00–02:00 (next day)"
export const blockLine = (block) => {
  const hours = `${clock(minutes(block?.start_local))}–${clock(minutes(block?.end_local))}`;
  return [dayLabel(block?.weekdays), hours, pastMidnight(block) ? '(next day)' : '']
    .filter(Boolean)
    .join(' ');
};

// A run of whole days reads like a round window: "13 to 19 Sep", "28 Sep to 4 Oct", "13 Sep"
export const busyLine = (row) => roundLabel({ start_date: row?.first_day, end_date: row?.last_day });

// Merge overlapping spans and answer what is left of the day
const freeOf = (spans) => {
  const busy = [...spans].sort((a, b) => a[0] - b[0]);
  const free = [];
  let open = 0;
  for (const [from, to] of busy) {
    if (from > open) free.push([open, from]);
    open = Math.max(open, to);
  }
  if (open < DAY) free.push([open, DAY]);
  return free;
};

const line = (free) => {
  if (!free.length) return 'Nothing open';
  if (free.length === 1 && free[0][0] === 0 && free[0][1] === DAY) return 'All day';
  return free.map(([from, to]) => `${clock(from)}–${to === DAY ? '24:00' : clock(to)}`).join(', ');
};

// What the repeating blocks leave open on each weekday, as the week preview's output
export const weekFree = (blocks = []) => DAY_NAMES.map((name, index) => {
  const day = index + 1;
  const before = day === 1 ? 7 : day - 1;
  const spans = [];
  for (const block of blocks) {
    const from = minutes(block.start_local);
    const to = minutes(block.end_local);
    const runsOver = to <= from;
    if (daysOf(block.weekdays).includes(day)) spans.push([from, runsOver ? DAY : to]);
    if (runsOver && daysOf(block.weekdays).includes(before)) spans.push([0, to]);
  }
  const free = freeOf(spans);
  return { day, name, free, line: line(free) };
});

// The shared free ranges of a series, read in the viewer's zone
export const freeLines = (ranges = [], zone = viewerZone()) => ranges.map(({ start, end }) => {
  const from = DateTime.fromISO(start, { zone: 'UTC' }).setZone(zone);
  const to = DateTime.fromISO(end, { zone: 'UTC' }).setZone(zone);
  const head = from.toFormat('ccc d LLL, HH:mm');
  return from.hasSame(to, 'day') ? `${head}–${to.toFormat('HH:mm')}` : `${head} to ${to.toFormat('ccc d LLL, HH:mm')}`;
});

// "14 h in common this round"; under an hour counts in minutes
export const commonHours = (hours) => {
  if (!hours) return 'No hours in common this round';
  if (hours < 1) return `${Math.round(hours * 60)} min in common this round`;
  return `${Number(hours.toFixed(1))} h in common this round`;
};
