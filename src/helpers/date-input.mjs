// The date picker speaks "yyyy-mm-dd", the value a native date input reads and writes;
// the viewer's locale decides how it is shown. A season is scheduled around today, so a
// year far from it is a typo, not a date.
export const MIN_YEAR = 2000;
export const maxYear = (today = new Date()) => today.getFullYear() + 2;

// "yyyy-mm-dd" as a local Date, or null when the text names no day
export const dayDate = (iso) => {
  const [year, month, day] = String(iso ?? '').split('-').map(Number);
  const date = new Date(year, month - 1, day);
  return date.getFullYear() === year && date.getMonth() === month - 1 && date.getDate() === day ? date : null;
};

// A Date as "yyyy-mm-dd", read in the viewer's own zone
export const dayIso = (date) => (date instanceof Date && !Number.isNaN(date.getTime())
  ? `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
  : '');

// True when the day is one the app accepts, otherwise the reason it is not
export const checkDate = (iso, today = new Date()) => {
  const date = dayDate(iso);
  if (!date) return 'Enter a date.';
  const max = maxYear(today);
  const year = date.getFullYear();
  if (year < MIN_YEAR || year > max) return `Year must be between ${MIN_YEAR} and ${max}.`;
  return true;
};
