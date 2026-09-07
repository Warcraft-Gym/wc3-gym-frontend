import { DateTime } from 'luxon';

// "13 to 19 Sep", "28 Sep to 4 Oct", "13 Sep", or "Week n" for a round with no date
export const roundLabel = (round) => {
  if (!round?.start_date) return `Week ${round?.playday ?? '?'}`;
  const start = DateTime.fromISO(round.start_date);
  if (!round.end_date || round.end_date === round.start_date) return start.toFormat('d LLL');
  const end = DateTime.fromISO(round.end_date);
  return `${start.toFormat(start.hasSame(end, 'month') ? 'd' : 'd LLL')} to ${end.toFormat('d LLL')}`;
};

// A round is over the day after its window closes; a round with no date never is
export const roundOver = (round, today = DateTime.now()) => {
  const last = round?.end_date || round?.start_date;
  return !!last && DateTime.fromISO(last).endOf('day') < today;
};
