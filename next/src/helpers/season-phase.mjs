// The season pages keep their four lifecycle words while the event API answers its common phase
export const PHASE_LABEL = { open: 'Open', commenced: 'Commenced', overdue: 'Overdue', complete: 'Complete' };

const pastEnd = (event) => !!event.end_date && event.end_date < new Date().toISOString().slice(0, 10);

// Translate the common event phase at the API boundary. Only the admin's close finishes a season,
// so a running one past its end date is overdue and a finished one is complete whatever it still misses
export const seasonPhase = (event) => {
  if (event?.phase in PHASE_LABEL) return event.phase;
  if (event?.phase === 'running') return pastEnd(event) ? 'overdue' : 'commenced';
  if (event?.phase === 'finished') return 'complete';
  return 'open';
};

export const asSeason = (event) => ({ ...event, phase: seasonPhase(event) });

// The backend counts a series as scored only when both sides carry a score
export const isUnscored = (series) => series.player1_score == null || series.player2_score == null;

// The backend's rule for a season that is over: closed, or its end date passed (UTC); a roster then shows mmr_entered
export const isOver = (event) => !!event && (!!event.closed_at || pastEnd(event));
