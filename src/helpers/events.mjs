import { DateTime } from 'luxon';
import { seasonSlug } from './season-slug.mjs';
import { currentRound, roundLabel } from './rounds.mjs';

// What a player can do with a season: sign up, ask an admin, or nothing; an absent signups_open reads as open
export function seasonAction(season) {
  const action = { open: 'signup', commenced: 'request', overdue: 'request' }[season?.phase] ?? null;
  return action === 'signup' && season.signups_open === false ? 'request' : action;
}

// The line under a season name: the round in play for a player who is in, else where the signups stand
function seasonStatus(season, round) {
  if (round) return `Round ${round.playday} of ${season.round_count ?? season.rounds.length} · ${roundLabel(round)}`;
  if (season.phase !== 'open') return 'In progress';
  return season.signups_open === false ? 'Signups are closed. An admin may add you.' : 'Signups are open';
}

// The links under a season card; a season the player is not in carries the two open reads only
function seasonLinks(season, slug) {
  const report = { title: 'Season report', icon: 'mdi-trophy-outline', to: `/report/${slug}` };
  const players = { title: 'Players', icon: 'mdi-account-multiple', to: `/players?season=${slug}` };
  if (!season.signed_up) return [report, players];
  return [
    season.team && { title: season.team.name, icon: 'mdi-shield-account', to: `/team/${season.team.id}` },
    report,
    { title: 'Upcoming series', icon: 'mdi-calendar-clock', to: '/upcoming' },
    { title: 'Ladder', icon: 'mdi-chart-line', to: `/ladder?season=${slug}` },
    players,
    { title: 'My fantasy team', icon: 'mdi-cards-playing-outline', to: `/fantasy-registration?season=${slug}` },
    season.scheduling_enabled && { title: 'Availability', icon: 'mdi-calendar-month', to: '/availability' },
  ].filter(Boolean);
}

// One card per season /me names, then the KOTH nights still to come. The /seasons row of the
// same id adds the rounds and the round count; /me answers what the account is to that season.
export function homeCards({ me = null, seasons = [], kothEvents = [], now = new Date() }) {
  const today = new Date(now);
  today.setHours(0, 0, 0, 0);  // the player's own midnight, so a KOTH night under way today stays
  const clock = DateTime.fromJSDate(new Date(now));
  const cards = (me?.seasons ?? []).map((entry) => {
    const season = { ...seasons.find((row) => row.id === entry.id), ...entry };
    const slug = seasonSlug(season);
    const round = season.signed_up ? currentRound(season.rounds ?? [], clock) : null;
    const action = seasonAction(season);
    const ask = { signup: 'Sign up', request: 'Ask to join' }[action];
    return {
      key: `season:${season.id}`,
      kind: 'season',
      id: season.id,
      name: season.name,
      date: season.start_date ? new Date(`${season.start_date}T00:00:00Z`) : null,
      status: seasonStatus(season, round),
      chips: [
        season.signed_up && { title: 'Signed up', color: 'success', icon: 'mdi-check' },
        season.captain && season.team && { title: `Captain · ${season.team.name}`, color: 'primary', icon: 'mdi-shield-star' },
      ].filter(Boolean),
      action,
      joined: !!season.signed_up,
      primary: season.signed_up
        ? { title: 'Your series', to: '/player-dashboard', variant: 'elevated' }
        : ask && { title: ask, to: `/signup?season=${slug}`, variant: action === 'signup' ? 'elevated' : 'outlined' },
      links: seasonLinks(season, slug),
      slug,
    };
  });
  const nights = kothEvents
    .filter((event) => event.is_active && new Date(event.event_date) >= today)
    .map((event) => {
      const date = new Date(event.event_date);
      return {
        key: `koth:${event.id}`,
        kind: 'koth',
        id: event.id,
        name: event.name,
        date,
        status: `King of the Hill · ${date.toLocaleString(undefined, { weekday: 'short', hour: '2-digit', minute: '2-digit' })}`,
        chips: [],
        action: 'signup',
        joined: null,  // the KOTH signups carry no own-row key
        primary: { title: 'Sign up', to: '/koth/dashboard', variant: 'elevated' },
        links: [],
      };
    })
    .sort((a, b) => a.date - b.date);
  return [...cards, ...nights];
}

// The rows the landing popup offers: open signups the player has not taken
export const joinableEvents = (rows) => rows.filter((row) => row.action === 'signup' && row.joined === false);
