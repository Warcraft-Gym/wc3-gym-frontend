// One row per event the player took part in, newest first: the accordion on the
// player page draws every kind through this. GET /users/{id}/history answers the
// events with their kind, record and placing; the season list adds the dates, the
// phase and the rounds; the series read adds the series of one event.
import { EVENT_KINDS, eventLabel, titleOf } from './event-labels.mjs';
import { isUnscored } from './season-phase.mjs';

const SUFFIX = ['th', 'st', 'nd', 'rd'];

// 1st, 2nd, 3rd, 4th; the teens all read th
export const ordinal = (place) => {
  const rest = Math.abs(place) % 100;
  const last = rest % 10;
  return `${place}${rest > 10 && rest < 20 ? 'th' : SUFFIX[last] || 'th'}`;
};

// Where the entrant finished, with the field it finished in; null before a placing
export const placing = (event) => (event?.place == null
  ? null
  : `${ordinal(event.place)}${event.team_count ? ` of ${event.team_count}` : ''}`);

// The series still to play, soonest first; a series with no time comes last
export const nextSeries = (series = []) => [...series]
  .filter(isUnscored)
  .sort((a, b) => (a.date_time ?? '9').localeCompare(b.date_time ?? '9'))[0] ?? null;

export const eventRows = ({
  history = {},
  player = {},
  seasons = [],
  seriesByEvent = {},
  ladderByEvent = {},
} = {}) => {
  const bySeason = new Map((seasons ?? []).map((season) => [season.id, season]));
  const races = new Map((player.signup_seasons ?? []).map((row) => [row.id, row.signup_race]));
  const champion = new Set((player.trophies ?? []).map((row) => row.season_id));
  return (history.events ?? [])
    .map((event) => {
      const id = event.season_id;
      const season = bySeason.get(id) ?? { id, name: event.season_name };
      const series = seriesByEvent[id] ?? [];
      return {
        id,
        event,
        season,
        kind: event.kind ?? 'gnl',
        kindLabel: titleOf(EVENT_KINDS, event.kind ?? 'gnl'),
        label: eventLabel({ name: season.name ?? event.season_name, league_short_name: event.league_short_name }),
        placing: placing(event),
        running: !!event.running,
        champion: champion.has(id),
        team: event.team_name ?? null,
        teamId: event.team_id ?? null,
        race: races.get(id) ?? null,
        wins: event.won ?? 0,
        losses: event.lost ?? 0,
        series,
        next: nextSeries(series),
        ladder: ladderByEvent[id] ?? null,
      };
    })
    .sort((a, b) => b.id - a.id);
};
