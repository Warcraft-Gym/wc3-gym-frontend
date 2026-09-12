// The ladder charts: one entry per day of the season window, on one games scale for every player.
import { timeFormat } from 'd3-time-format';
export const WIN = 'rgb(var(--v-theme-win))';
export const LOSS = 'rgb(var(--v-theme-loss))';
export const RACES = ['HU', 'OC', 'NE', 'UD'];

const DAY = 86400000;

// Every day from start to end, zeros where the sparse per_day list has no row
export function fillDays(perDay, start, end) {
  const byDay = new Map((perDay || []).map((d) => [d.d, d]));
  const out = [];
  const last = Date.parse(end);
  for (let t = Date.parse(start); t <= last; t += DAY) {
    const d = new Date(t).toISOString().slice(0, 10);
    const row = byDay.get(d);
    out.push({ d, w: row?.w ?? 0, l: row?.l ?? 0, mmr: row?.mmr ?? null });
  }
  return out;
}

// The busiest day of any player, at least 1, so every chart shares one height scale
export const maxGamesPerDay = (players) =>
  Math.max(1, ...players.flatMap((p) => (p.per_day || []).map((d) => d.w + d.l)));

// The first and last day the rows carry, so a chart needs no season dates
export const dayWindow = (perDay) => {
  const days = (perDay || []).map((d) => d.d).sort();
  return days.length ? { start: days[0], end: days[days.length - 1] } : null;
};

// The last day with a game, or null
export const lastPlayed = (perDay) => (perDay || []).reduce((last, d) => (d.w + d.l ? d.d : last), null);

// Whole-number win rate, null with no games
export const winRate = (w, l) => (w + l ? Math.round((100 * w) / (w + l)) : null);

// The hover text of one day, shared by every day chart
const fmtDay = timeFormat('%-d %b');
export const dayTip = (d) =>
  `${fmtDay(new Date(`${d.d}T00:00:00`))} · ${d.w}–${d.l}${d.mmr != null ? ` · ${d.mmr} MMR` : ''}`;

// A games-per-day bar as a percentage of the tallest day; a day with no games draws nothing
export const gamesBarHeight = (games, max) => (games ? `${Math.max(2, Math.round((100 * games) / max))}%` : '0%');
