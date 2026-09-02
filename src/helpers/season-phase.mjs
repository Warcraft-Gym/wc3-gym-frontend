// Where a season sits today: before its start, between its dates, or past its end
export function seasonPhase(season, today) {
  if (!season?.start_date || today < season.start_date) return 'upcoming';
  return season.end_date && today > season.end_date ? 'ended' : 'running';
}
