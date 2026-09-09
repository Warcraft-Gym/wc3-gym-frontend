// The typed date of the date picker. A season is scheduled around today, so a
// year far from it is a typo, not a date.
export const MIN_YEAR = 2000;
export const maxYear = (today = new Date()) => today.getFullYear() + 2;

const DATE_PATTERN = /^(0[1-9]|1[0-2])\/(0[1-9]|[12]\d|3[01])\/\d{4}$/;

// True when the text is a date the app accepts, otherwise the reason it is not
export const checkDate = (value, today = new Date()) => {
  if (!DATE_PATTERN.test(value)) return 'Invalid date format. Use MM/DD/YYYY';

  const [month, day, year] = value.split('/').map(Number);
  const date = new Date(year, month - 1, day);
  if (date.getFullYear() !== year || date.getMonth() !== month - 1 || date.getDate() !== day) {
    return 'Invalid date. Please enter a valid date.';
  }

  const max = maxYear(today);
  if (year < MIN_YEAR || year > max) return `Year must be between ${MIN_YEAR} and ${max}.`;
  return true;
};
