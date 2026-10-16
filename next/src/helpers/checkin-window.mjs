// The check-in window an organizer sets: how long before the start it opens, when it closes, and
// whether a player may check in early. The server counts both in minutes from the start.
import { DateTime } from 'luxon';
import { zonedTimeText } from './event-labels.mjs';

// The units the opening is typed in, largest last
export const CHECKIN_UNITS = [
  { value: 'minutes', title: 'Minutes', minutes: 1 },
  { value: 'hours', title: 'Hours', minutes: 60 },
  { value: 'days', title: 'Days', minutes: 1440 },
];

const sizeOf = (unit) => CHECKIN_UNITS.find((item) => item.value === unit)?.minutes ?? 1;

/** The largest unit that counts `minutes` in whole numbers; a blank is typed in hours.
 *  @param {number|null|undefined} minutes */
export const unitOf = (minutes) => {
  if (minutes == null) return 'hours';
  if (!minutes) return 'minutes';
  return [...CHECKIN_UNITS].reverse().find((unit) => minutes % unit.minutes === 0)?.value ?? 'minutes';
};

/** The minutes an amount typed in a unit stands for; a blank is null.
 *  @param {string|number|null|undefined} amount @param {string} unit */
export const toMinutes = (amount, unit) => (amount === '' || amount == null ? null : Math.max(Math.round(Number(amount) * sizeOf(unit)), 0));

/** The Opens amount for `minutes` in `unit` to two decimals, as a number so the field keeps a typed "1.0".
 *  @param {number|null|undefined} minutes @param {string} unit */
export const openingAmount = (minutes, unit) => (minutes == null ? '' : Math.round((minutes / sizeOf(unit)) * 100) / 100);

/** The Opens field after a typed amount or a picked unit; only a pick changes the unit and it keeps the amount.
 *  @param {{minutes: number|null, unit: string}} field @param {{amount?: string, unit?: string}} edit */
export const editOpening = (field, edit) =>
  edit.unit === undefined
    ? { minutes: toMinutes(edit.amount, field.unit), unit: field.unit }
    : { minutes: field.minutes == null ? null : toMinutes(field.minutes / sizeOf(field.unit), edit.unit), unit: edit.unit };

/** "2 hours", "1 day", "90 minutes".
 *  @param {number} minutes */
export const durationText = (minutes) => {
  const unit = unitOf(minutes);
  const count = minutes / sizeOf(unit);
  return `${count} ${count === 1 ? unit.slice(0, -1) : unit}`;
};

// What the window counts from and where it closes by default, by the kind of event that takes it.
// A runner closes a cup's check-in, or one round's, by hand; a GNL round closes at its end.
const SHAPES = {
  cup: { start: 'the start', ends: 'at the draw', byHand: true, timed: true },
  rounds: { start: 'each round', ends: "at the round's draw", byHand: true, timed: false },
  gnl: { start: 'a round', ends: 'when the round ends (late check-in)', byHand: false, timed: false },
};

/** One line that says when check-in opens and closes. `startsAt` names the opening on the
 *  reader's clock, for a cup that starts once.
 *  @param {any} settings @param {'cup'|'rounds'|'gnl'} kind @param {string|null} [startsAt] */
export const checkinSummary = (settings, kind, startsAt = null) => {
  if (settings.checkin_enabled === false) return 'No check-in.';
  const shape = SHAPES[kind];
  const opens = settings.checkin_opens_minutes;
  const closes = settings.checkin_closes_minutes;
  const at = shape.timed && startsAt && opens != null ? ` (${zonedTimeText(DateTime.fromISO(startsAt, { zone: 'utc' }).minus({ minutes: opens }).toISO())})` : '';
  const opening = opens == null ? 'Opens at sign-up' : `Opens ${durationText(opens)} before ${shape.start}${at}`;
  const closing = closes === null || closes === undefined || closes === '' ? shape.ends : `${durationText(Number(closes))} before ${shape.start}`;
  return `${opening}, closes ${closing}${shape.byHand ? ' or when you close it' : ''}.${settings.early_checkin ? ' Early check-in is on.' : ''}`;
};

/** Why the settings cannot be saved, or null. The close counts back from the start, so it must
 *  be fewer minutes than the opening, as the server holds it.
 *  @param {any} settings */
export const checkinProblem = (settings) => {
  const opens = settings.checkin_opens_minutes;
  const closes = settings.checkin_closes_minutes;
  if (closes === '') return settings.checkin_enabled === false ? null : 'Say how many minutes before the start check-in closes.';
  if (opens != null && closes != null && Number(closes) >= opens) return 'Check-in must close fewer minutes before the start than it opens.';
  return null;
};

/** The window fields POST and PUT /events take; a close with no minutes closes at the draw.
 *  @param {any} settings */
export const checkinPayload = (settings) => ({
  checkin_opens_minutes: settings.checkin_opens_minutes ?? null,
  checkin_closes_minutes: settings.checkin_closes_minutes === '' || settings.checkin_closes_minutes == null ? null : Number(settings.checkin_closes_minutes),
  early_checkin: !!settings.early_checkin,
});

/** Whether the server takes a player's own check-in for a cup or a round now: its close covers a
 *  runner's close, a timed close and a finished or cancelled cup.
 *  @param {any} target @param {boolean} early @param {number} [now] */
export const checkinOpenNow = (target, early, now = Date.now()) =>
  (!target.checkin_closes_at || now < Date.parse(target.checkin_closes_at)) && (early || !target.checkin_opens_at || now >= Date.parse(target.checkin_opens_at));

/** The window the server answers for a cup or one of its rounds: from its opening, or from
 *  sign-up with early check-in, until its close or its draw; or the time a runner closed it.
 *  @param {any} leg @param {boolean} early */
export const checkinWindowLine = (leg, early) => {
  if (leg.checkin_closed_at) return `Check-in closed on ${zonedTimeText(leg.checkin_closed_at)}.`;
  const from = early || !leg.checkin_opens_at ? 'sign-up' : zonedTimeText(leg.checkin_opens_at);
  return `Check-in from ${from} until ${leg.checkin_closes_at ? zonedTimeText(leg.checkin_closes_at) : 'the draw'}.`;
};
