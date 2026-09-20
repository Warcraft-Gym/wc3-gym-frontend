// The map a replay was played on against the map its game should play. A file uploaded to the
// wrong game is a common mistake, so the check names the game the file belongs to. It warns and
// never blocks: the parse may be wrong and the reporter may be right.

/** The mismatch of one game, or null. `played` holds the replay's map per game and `wanted` the
 *  map the veto gives each game, game 1 first; `to` names the game that map belongs to.
 *  @returns {{game: number, to: number|null}|null} */
export const mapMismatch = (game, played, wanted) => {
  const read = played?.[game - 1] ?? null;
  const want = wanted?.[game - 1] ?? null;
  if (read == null || want == null || read === want) return null;
  const to = wanted.findIndex((id) => id != null && id === read);
  return { game, to: to === -1 ? null : to + 1 };
};

/** Every game whose replay was played on another map than the veto gives it. */
export const mapMismatches = (played, wanted) =>
  (played || []).map((_, index) => mapMismatch(index + 1, played, wanted)).filter(Boolean);

/** Why the report asks before it saves, or null: a series that plays a veto and records none, or
 *  a replay on a map the veto gives another game. `off` is what `mapMismatches` answered. */
export const reportWarning = (vetoMissing, off = []) => {
  if (vetoMissing) return 'No map veto is recorded for this series, so nothing says which map each game plays.';
  if (!off.length) return null;
  const games = off.map((one) => one.game);
  const which = games.length > 1 ? `games ${games.join(', ')}` : `game ${games[0]}`;
  return `The replay of ${which} was played on another map than the veto gives it.`;
};
