// The ladder charts: one entry per day of the season window, on one games scale for every player.
export const WIN = '#1867C0';
export const LOSS = '#F44336';
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

// The last day with a game, or null
export const lastPlayed = (perDay) => (perDay || []).reduce((last, d) => (d.w + d.l ? d.d : last), null);

// Whole-number win rate, null with no games
export const winRate = (w, l) => (w + l ? Math.round((100 * w) / (w + l)) : null);
