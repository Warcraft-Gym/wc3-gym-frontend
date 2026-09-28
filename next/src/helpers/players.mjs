import { byNewest } from "./season-order.mjs";
// Shared player list filters used by the player, team assign and team detail grids.

export const matchesPlayerSearch = (player, query) => {
  const q = query.trim().toLowerCase();
  return (player.name || '').toLowerCase().includes(q)
    || (player.battleTag || '').toLowerCase().includes(q)
    || (player.tags || []).some((row) => (row.tag || '').toLowerCase().includes(q));
};

// The row-props of a player grid
export const playerRowProps = () => ({ class: 'player-row' });

// Only applies once the user moved a slider handle off the 0-3000 defaults.
export const filterByMmrRange = (list, range, getMmr) => {
  if (!Array.isArray(range) || range.length !== 2) return list;
  const mmrMin = Number(range[0]);
  const mmrMax = Number(range[1]);
  if (mmrMin === 0 && mmrMax === 3000) return list;
  return list.filter(p => {
    const mmr = getMmr(p);
    return mmr >= mmrMin && mmr <= mmrMax;
  });
};

// One row per player carrying his career row, then one row per career row no
// listed player claims: the league's history from before the app.
export const playersWithCareers = (players, careers) => {
  const byPlayer = new Map(careers.filter(c => c.user_id != null).map(c => [c.user_id, c]));
  const listed = new Set(players.map(p => p.id));
  const totals = (career) => ({
    career,
    rating: career?.rating ?? null,
    series_winrate: career?.series_winrate ?? null,
    games_winrate: career?.games_winrate ?? null,
    seasons_played: career?.seasons_played ?? null,
  });
  return [
    ...players.map(p => ({ ...p, key: `p${p.id}`, ...totals(byPlayer.get(p.id) ?? null) })),
    ...careers
      .filter(c => !listed.has(c.user_id))
      .map(c => ({ id: null, name: c.user?.name ?? c.player_name, key: `c${c.id ?? c.user_id}`, ...totals(c) })),
  ];
};

// A KOTH king as PlayerName wants him: the Twitch name a chat signup carries,
// else his battle tag. Both KOTH views read the same fallback.
export const kingPlayer = (king) => ({
  name: king.twitch_username || king.battle_tag,
  country: king.country,
});

// The player page path. The battle tag is the key, like w3champions; the id
// serves rows that carry none, and old links.
export const playerPath = (player) =>
  `/player/${player.battleTag ? encodeURIComponent(player.battleTag) : player.id}`;

// A drafting page and the panel provide this; every PlayerName under them opens
// the panel. Everywhere else a name is a link to the player page.
export const panelLinks = Symbol('panelLinks');

// The race a new signup opens on: the race he registered on in his last season,
// else his main race on the w3champions ladder, else nothing. The profile race
// is one self-declared value, so a player who plays two races would sign up on
// the wrong one.
export const defaultSignupRace = (player) => {
  if (!player) return null;
  const last = (player.signup_seasons || [])
    .filter(season => season.signup_race)
    .sort(byNewest)[0];
  return last ? last.signup_race : (player.main_race ?? null);
};

// Where the account's own profile lives. A member with no player row has only
// the /profile page, which offers him the signup.
export const myProfilePath = (me) => (me?.user ? playerPath(me.user) : '/profile');

// The ticked ids with these ids ticked or unticked. A new set, so React sees
// the change.
export const toggleIds = (selected, ids, on) => {
  const next = new Set(selected);
  for (const id of ids) {
    if (on) next.add(id);
    else next.delete(id);
  }
  return next;
};

// A bulk signup for one season: the signup call takes one race for all its
// players, so the players go out in one group per race. A player already
// signed up to the season is left out, and a player with no race yet holds
// the save back.
export const signupGroups = (players, races, seasonId) => {
  const skipped = [];
  const missingRace = [];
  const byRace = new Map();
  for (const player of players) {
    if ((player.signup_seasons || []).some((season) => season.id === seasonId)) {
      skipped.push(player);
      continue;
    }
    const race = races[player.id];
    if (!race) {
      missingRace.push(player);
      continue;
    }
    byRace.set(race, [...(byRace.get(race) || []), player.id]);
  }
  return { groups: [...byRace].map(([race, ids]) => ({ race, ids })), skipped, missingRace };
};

// Runs one call per item, one after another, so a bulk action never fires a
// burst of calls at the backend or at W3Champions. A failed item does not stop
// the rest.
/** @template T, R
 *  @param {T[]} items @param {(item: T) => Promise<R>} fn @param {(index: number) => void} [onStep]
 *  @returns {Promise<{ done: { item: T, result: R }[], failed: { item: T, error: unknown }[] }>} */
export const runEach = async (items, fn, onStep = () => {}) => {
  const done = [];
  const failed = [];
  for (const [index, item] of items.entries()) {
    onStep(index);
    try {
      done.push({ item, result: await fn(item) });
    } catch (error) {
      failed.push({ item, error });
    }
  }
  return { done, failed };
};
