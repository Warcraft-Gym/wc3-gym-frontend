// The season pages keep their four lifecycle words while the event API answers its common phase
export const PHASE_LABEL = { open: 'Open', commenced: 'Commenced', overdue: 'Overdue', complete: 'Complete' };

// Translate the common event phase at the API boundary; an unfinished event past its end is overdue
export const seasonPhase = (event) => {
  if (event?.phase in PHASE_LABEL) return event.phase;
  if (event?.phase === 'running') return 'commenced';
  if (event?.phase === 'finished') return event.unscored_series > 0 ? 'overdue' : 'complete';
  return 'open';
};

export const asSeason = (event) => ({ ...event, phase: seasonPhase(event) });

// The backend counts a series as scored only when both sides carry a score
export const isUnscored = (series) => series.player1_score == null || series.player2_score == null;
