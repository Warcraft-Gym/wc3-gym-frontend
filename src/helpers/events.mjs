import { seasonSlug } from './season-slug.mjs';

// What a player can do with an event: sign up, ask an admin, or nothing
export const seasonAction = (phase) => (phase === 'open' ? 'signup' : phase === 'commenced' ? 'request' : null);

// Every event a player can still join or follow, soonest first; season and KOTH ids collide, so rows key on kind + id
export function upcomingEvents({ seasons = [], joinedSeasonIds = [], kothEvents = [], now = new Date() }) {
  const today = new Date(now);
  today.setHours(0, 0, 0, 0);  // the player's own midnight, so a KOTH night under way today stays
  const rows = [
    ...seasons.filter((season) => seasonAction(season.phase)).map((season) => ({
      key: `season:${season.id}`,
      kind: 'season',
      id: season.id,
      name: season.name,
      date: season.start_date ? new Date(`${season.start_date}T00:00:00Z`) : null,
      phase: season.phase,
      action: seasonAction(season.phase),
      joined: joinedSeasonIds.includes(season.id),
      slug: seasonSlug(season),
    })),
    ...kothEvents.filter((event) => event.is_active && new Date(event.event_date) >= today).map((event) => ({
      key: `koth:${event.id}`,
      kind: 'koth',
      id: event.id,
      name: event.name,
      date: new Date(event.event_date),
      action: 'signup',
      joined: null,  // the KOTH signups carry no own-row key
    })),
  ];
  return rows.sort((a, b) => (a.date ?? Infinity) - (b.date ?? Infinity));
}

// The rows the landing popup offers: open signups the player has not taken
export const joinableEvents = (rows) => rows.filter((row) => row.action === 'signup' && row.joined === false);
