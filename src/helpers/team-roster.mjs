// The roster of one team in one event, off GET /teams/{id}/seasons/{event_id}. Both
// team pages read the same two lists from the same payload, so the shape lives here.
// JSON object keys are text, so the event id is read as text.

// The captains and the members of one event, in the order the read answers them
export const rosterOf = (team, eventId) => {
  const key = eventId == null ? null : String(eventId);
  const pick = (rows) => (key && Array.isArray(rows?.[key]) ? rows[key] : []);
  return { captains: pick(team?.captains_by_season), members: pick(team?.player_by_season) };
};
