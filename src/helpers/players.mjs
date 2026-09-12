import { ref } from 'vue';

// Shared player list filters used by the player, team assign and team detail grids.

export const matchesPlayerSearch = (player, query) => {
  const q = query.trim().toLowerCase();
  return (player.name || '').toLowerCase().includes(q)
    || (player.battleTag || '').toLowerCase().includes(q)
    || (player.discordTag || '').toLowerCase().includes(q);
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

// The player panel opens over whatever page you are on, so reading a profile
// never costs a captain his roster ticks or a player his typed scores.
// null means closed; the value is a battle tag, or an id for a row without one.
export const panelPlayerKey = ref(null);

// A drafting page and the panel provide this; every PlayerName under them opens
// the panel. Everywhere else a name is a link to the player page.
export const panelLinks = Symbol('panelLinks');

export const openPlayer = (player) =>
  panelPlayerKey.value = player.battleTag ? String(player.battleTag) : String(player.id);

// The race a new signup opens on: the race he registered on in his last season,
// else the race he plays most on the w3champions ladder, else nothing. The
// profile race is one self-declared value, so a player who plays two races
// would sign up on the wrong one. `gamesOf` counts ladder games of one race.
export const defaultSignupRace = (player, gamesOf) => {
  if (!player) return null;
  const last = (player.signup_seasons || [])
    .filter(season => season.signup_race)
    .sort((a, b) => b.id - a.id)[0];
  if (last) return last.signup_race;
  const played = [...new Set((player.w3c_stats || []).map(stat => stat.race).filter(Boolean))]
    .map(race => ({ race, games: gamesOf(race) }))
    .sort((a, b) => b.games - a.games)[0];
  return played && played.games > 0 ? played.race : null;
};

// Where the account's own profile lives. A member with no player row has only
// the /profile page, which offers him the signup.
export const myProfilePath = (me) => (me?.user ? playerPath(me.user) : '/profile');
