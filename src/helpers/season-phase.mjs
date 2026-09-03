// Where a season sits today: before its start, between its dates, or past its end
export function seasonPhase(season, today) {
  if (!season?.start_date || today < season.start_date) return 'upcoming';
  return season.end_date && today > season.end_date ? 'ended' : 'running';
}

// A season is over once every series is scored or past its scheduled time; an unplayed, unscheduled series keeps it open
export function seasonEnded(series, nowMs = Date.now()) {
  const done = (s) => (s.player1_score != null && s.player2_score != null) || (s.date_time && Date.parse(s.date_time) <= nowMs);
  return series.length > 0 && series.every(done);
}
