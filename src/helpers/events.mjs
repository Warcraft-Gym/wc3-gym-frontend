import { seasonSlug } from './season-slug.mjs';

// What a player can do with a season: sign up, ask an admin, or nothing; an absent signups_open reads as open
export function seasonAction(season) {
  const action = { open: 'signup', commenced: 'request', overdue: 'request' }[season?.phase] ?? null;
  return action === 'signup' && season.signups_open === false ? 'request' : action;
}

// Every event a player can still join or follow, soonest first; season and KOTH ids collide, so rows key on kind + id
// /signup acts on /me's season only, so other seasons carry no action and an unknown (null) joined
export function upcomingEvents({ seasons = [], currentSeasonId = null, signedUp = false, kothEvents = [], now = new Date() }) {
  const today = new Date(now);
  today.setHours(0, 0, 0, 0);  // the player's own midnight, so a KOTH night under way today stays
  const rows = [
    // another season lists only while open or commenced, so an old season missing a result stays off the list
    ...seasons.filter((season) => (season.id === currentSeasonId ? seasonAction(season) : ['open', 'commenced'].includes(season.phase))).map((season) => {
      const current = season.id === currentSeasonId;
      return {
        key: `season:${season.id}`,
        kind: 'season',
        id: season.id,
        name: season.name,
        date: season.start_date ? new Date(`${season.start_date}T00:00:00Z`) : null,
        phase: season.phase,
        action: current ? seasonAction(season) : null,
        joined: current ? signedUp : null,
        slug: seasonSlug(season),
      };
    }),
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
