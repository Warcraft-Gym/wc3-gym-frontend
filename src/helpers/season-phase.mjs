// The backend derives a season's phase from its series: open, commenced or complete
export const PHASE_LABEL = { open: 'Open', commenced: 'Commenced', complete: 'Complete' };

// A season past its start date with no series started: the schedule is missing or late
export function startOverdue(season, today) {
  return season?.phase === 'open' && !!season.start_date && today > season.start_date;
}
