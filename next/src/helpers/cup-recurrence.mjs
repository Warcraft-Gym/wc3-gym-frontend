// A cup that repeats on a rule: a weekday, every week or the nth of the month, at a local start
// time. The rule's page lists its cups and its next days, and a runner makes each next cup there.
import { viewerZone } from './timezone.mjs';

export const WEEKDAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

// Which of the month's weekdays the rule plays: every week, the nth, or the last
export const NTHS = [
  { value: null, title: 'Every week' },
  { value: 1, title: 'The first of the month' },
  { value: 2, title: 'The second of the month' },
  { value: 3, title: 'The third of the month' },
  { value: 4, title: 'The fourth of the month' },
  { value: -1, title: 'The last of the month' },
];

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const ORDINAL = { 1: 'first', 2: 'second', 3: 'third', 4: 'fourth', '-1': 'last' };

/** How a rule reads in a line: "Every Friday at 20:00" or "The first Friday of the month at 20:00".
 *  @param {any} rule */
export const ruleLine = (rule) => {
  const day = WEEKDAYS[rule?.weekday] ?? '?';
  const when = rule?.nth == null ? `Every ${day}` : `The ${ORDINAL[rule.nth]} ${day} of the month`;
  return [when, rule?.start_time ? `at ${rule.start_time}` : null, rule?.ends_on ? `until ${dayText(rule.ends_on)}` : null].filter(Boolean).join(' ');
};

/** A day as the rule's pages read it: "Fri 11 Jan 2030".
 *  @param {string} iso "yyyy-mm-dd" */
export const dayText = (iso) => {
  const [year, month, day] = String(iso || '').split('-').map(Number);
  if (!year || !month || !day) return '';
  const weekday = (new Date(Date.UTC(year, month - 1, day)).getUTCDay() + 6) % 7;
  return `${WEEKDAYS[weekday].slice(0, 3)} ${day} ${MONTHS[month - 1]} ${year}`;
};

/** The rule a cup suggests: its own weekday and start time in the viewer's zone, every week,
 *  named after the cup without a trailing number or date.
 *  @param {any} event
 *  @param {string} [zone] */
export const ruleFrom = (event, zone = viewerZone()) => {
  const start = event?.starts_at ? new Date(event.starts_at.endsWith('Z') || /[+-]\d\d:\d\d$/.test(event.starts_at) ? event.starts_at : `${event.starts_at}Z`) : null;
  const parts = start
    ? Object.fromEntries(
        new Intl.DateTimeFormat('en-GB', { timeZone: zone, weekday: 'long', hour: '2-digit', minute: '2-digit', hourCycle: 'h23' })
          .formatToParts(start)
          .map((part) => [part.type, part.value]),
      )
    : {};
  const name = String(event?.name || '')
    .replace(/\s+\d{1,2} [A-Z][a-z]{2} \d{4}$/, '')
    .replace(/\s+#?\d+$/, '')
    .trim();
  return {
    name: name || event?.name || '',
    weekday: parts.weekday ? WEEKDAYS.indexOf(parts.weekday) : 4,
    nth: null,
    start_time: parts.hour ? `${parts.hour}:${parts.minute}` : '20:00',
    zone,
    ends_on: null,
  };
};

/** What keeps the rule from being saved, or null.
 *  @param {any} rule */
export const ruleProblem = (rule) => {
  if (!String(rule?.name || '').trim()) return 'Name the recurring cup.';
  if (!/^([01]\d|2[0-3]):[0-5]\d$/.test(rule?.start_time || '')) return 'Pick the start time.';
  return null;
};

/** The coming days split by whether their cup is made yet.
 *  @param {any} recurrence */
export const upcomingRows = (recurrence) =>
  (recurrence?.upcoming || []).map((row) => ({
    ...row,
    occurrence: (recurrence.occurrences || []).find((one) => one.event_id === row.event_id) || null,
  }));
