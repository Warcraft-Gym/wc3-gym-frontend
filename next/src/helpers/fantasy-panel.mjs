// What the Home fantasy panel offers: a team to create while creation is open, the bets of the
// member's team once it exists, and nothing once creation is closed and the member has no team.
import { DateTime } from 'luxon';
import { betsOpen } from './bets.mjs';

/** Whether team creation is open. A missing or failed setting reads as closed, as on the fantasy page. */
export const creationOpen = (setting) => !!setting?.value && String(setting.value).toLowerCase() === 'true';

/** 'bets' once the member has a team, 'create' while creation is open, else null (no panel). */
export const fantasyState = ({ open, team }) => (team ? 'bets' : open ? 'create' : null);

/** The season's fantasy series still open for bets, soonest first (a series with no time last),
 *  each with the member's own bet as `myBet`. */
export function openBets(series = [], bets = [], now = DateTime.utc()) {
  const when = (row) => (row.date_time ? DateTime.fromISO(row.date_time, { zone: 'UTC' }).toMillis() : Infinity);
  return series
    .filter((row) => row.is_fantasy_match && betsOpen(row, now))
    .sort((a, b) => when(a) - when(b) || a.id - b.id)
    .map((row) => ({ ...row, myBet: bets.find((bet) => bet.series_id === row.id) ?? null }));
}
