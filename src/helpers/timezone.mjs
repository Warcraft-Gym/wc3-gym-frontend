import { DateTime } from 'luxon';

export const viewerZone = () => Intl.DateTimeFormat().resolvedOptions().timeZone;

// A bare string is UTC, as the backend stores a series time; nothing means now
const instant = (at) => {
  if (!at) return DateTime.utc();
  if (DateTime.isDateTime(at)) return at;
  if (at instanceof Date) return DateTime.fromJSDate(at);
  return DateTime.fromISO(at, { zone: 'UTC' });
};

const span = (minutes) => {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return [h && `${h} h`, m && `${m} min`].filter(Boolean).join(' ');
};

// e.g. "GMT+2", "GMT-3:30", "GMT"
export const gmt = (offset) => {
  if (!offset) return 'GMT';
  const abs = Math.abs(offset);
  const m = abs % 60;
  return `GMT${offset < 0 ? '-' : '+'}${Math.floor(abs / 60)}${m ? `:${String(m).padStart(2, '0')}` : ''}`;
};

// "Europe/Paris · GMT+2 · 1 h ahead of you", both offsets taken at the instant; '' for no zone
export const zoneLabel = (zone, viewer = viewerZone(), at = null) => {
  const when = instant(at);
  const theirs = zone && when.setZone(zone);
  if (!theirs?.isValid) return '';
  const parts = [zone, gmt(theirs.offset)];
  const mine = when.setZone(viewer);
  if (zone !== viewer && mine.isValid) {
    const diff = theirs.offset - mine.offset;
    parts.push(diff ? `${span(Math.abs(diff))} ${diff > 0 ? 'ahead of' : 'behind'} you` : 'same time as you');
  }
  return parts.join(' · ');
};

// The date and time pickers' values for a stored UTC series time, read in the zone
export const pickerParts = (value, zone = viewerZone()) => {
  const dt = instant(value).setZone(zone);
  return { date: new Date(dt.year, dt.month - 1, dt.day), time: dt.toFormat('HH:mm') };
};

// The picked date and "HH:mm" typed in the zone, as the instant they name
export const pickedInstant = (date, time, zone = viewerZone()) => {
  const [hour, minute] = String(time).split(':').map(Number);
  const dt = DateTime.fromObject(
    { year: date.getFullYear(), month: date.getMonth() + 1, day: date.getDate(), hour, minute },
    { zone },
  );
  return dt.isValid ? dt : null;
};

// The stored form of a picked time: UTC with no zone suffix
export const storedUtc = (date, time, zone = viewerZone()) =>
  pickedInstant(date, time, zone)?.toUTC().toFormat("yyyy-MM-dd'T'HH:mm:ss") ?? null;
