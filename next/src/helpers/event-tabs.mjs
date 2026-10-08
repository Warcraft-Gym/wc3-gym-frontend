// The tabs of an event page and of its run page: the draw first, then who is in, then the
// results. The tab rides in the address as `?tab=`, so a link opens the tab it names.
import { columns, isScored, standsOn, withoutIdleReset } from './stage-view.mjs';

export const EVENT_TABS = ['draw', 'participants', 'results'];

/** The tab an address names; anything else opens the page's own first tab.
 *  @param {string | null | undefined} value @param {string} home */
export const tabOf = (value, home = 'draw') => (EVENT_TABS.includes(value ?? '') ? /** @type {string} */ (value) : home);

/** The tab a page opens on when its address names none: a finished event shows its results,
 *  every other one its draw.
 *  @param {any} event */
export const homeTab = (event) => ((event?.state ?? event?.phase) === 'finished' ? 'results' : 'draw');

/** The address with the tab in it: the tab the page opens on is its own address, so it drops
 *  the query, and every other tab names itself, the draw of a finished event too.
 *  @param {string} href @param {string} tab @param {string} home */
export function withTab(href, tab, home = 'draw') {
  const url = new URL(href);
  if (tab === home) url.searchParams.delete('tab');
  else url.searchParams.set('tab', tab);
  return url.pathname + url.search + url.hash;
}

/** The played series of one stage, round by round, in the order the draw reads them. A series
 *  with a side nobody fills, a bye or the lower slot a bye feeds, is scored through but never
 *  played, and the reset nobody played draws the final twice, so neither is a result; a round
 *  with nothing played yet is left out.
 *  @param {any[]} series @param {any[]} rounds */
export function resultRounds(series = [], rounds = []) {
  const played = withoutIdleReset(series)
    .filter((row) => isScored(row) && standsOn(row, 1) != null && standsOn(row, 2) != null);
  return columns(played, rounds).filter((column) => column.series.length);
}
