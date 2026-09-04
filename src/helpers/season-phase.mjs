// The backend derives a season's phase from its series: open, commenced, overdue or complete
export const PHASE_LABEL = { open: 'Open', commenced: 'Commenced', overdue: 'Overdue', complete: 'Complete' };

// The backend counts a series as scored only when both sides carry a score
export const isUnscored = (series) => series.player1_score == null || series.player2_score == null;
