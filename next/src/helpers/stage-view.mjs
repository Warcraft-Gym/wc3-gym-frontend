// The pure parts of a stage drawing: what state a series is in, which sides walked
// through, the columns of a bracket and where each box sits, and the standings rows a
// table shows.

// A generated series carries a result kind; an unscored one is open once both sides are known
export const SERIES_STATES = ['pending', 'open', 'played', 'walkover', 'forfeit'];

export const isScored = (row) => row?.player1_score != null || row?.player2_score != null;

// Who stands on one side: its entrant, else the player a GNL row names, the way
// app/services/series_rules.py stands_on_side reads the pair.
export const standsOn = (row, side) => row?.[`entrant${side}_id`] ?? row?.[`player${side}_id`] ?? null;

export const seriesState = (row) => {
  if (isScored(row)) return SERIES_STATES.includes(row.result_kind) ? row.result_kind : 'played';
  // A lobby names nobody in the player columns; its seats say whether it can be played
  if (row?.sides?.length) return row.sides.every((seat) => seat.entrant_id) ? 'open' : 'pending';
  return standsOn(row, 1) && standsOn(row, 2) ? 'open' : 'pending';
};

// The side a scored series sends on, 1 or 2; a draw and an unscored series send nobody
export const winnerSide = (row) => {
  if (!isScored(row)) return null;
  const [a, b] = [row.player1_score ?? 0, row.player2_score ?? 0];
  return a === b ? null : (a > b ? 1 : 2);
};

const feederOf = (row, side) => (side === 1 ? row.slot1_from_series_id : row.slot2_from_series_id);

// A side can never fill when it has neither an entrant nor a feeder while the other side
// is named: it is a bye, and the other side passes through. That is how a padded pair
// reaches the next column, and it is the pair stage_engine._row awards a walkover to.
// A row that names neither side is a payload without them, never a bye.
export const isByeSide = (row, side) => !feederOf(row, side) && !standsOn(row, side)
  && !!standsOn(row, side === 1 ? 2 : 1);

// The side a box may name. A feeder fills its side with the winner of the series before
// it, so while results are hidden that side reads as undecided instead of naming him.
export const shownPlayer = (row, side, hidden = false) => (
  hidden && feederOf(row, side) ? null : row?.[`player${side}`] || null);

// The team a box may name, hidden behind a feeder the same way a player is
export const shownTeam = (row, side, hidden = false) => (
  hidden && feederOf(row, side) ? null : row?.[`team${side}`] || null);

// What a side is called in a sentence: the team of a team entrant, else the player
export const sideName = (row, side) => row?.[`team${side}`]?.name || row?.[`player${side}`]?.name || '';

// One column per round, in round order, each holding its series in sequence order.
// The rounds name the columns; a round the list does not name reads as its number.
export function columns(series, rounds = []) {
  const byId = new Map(rounds.map((round) => [round.id, round]));
  const order = new Map(rounds.map((round, index) => [round.id, round.number ?? index]));
  const groups = new Map();
  for (const row of series) {
    const key = row.round_id ?? 0;
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push(row);
  }
  return [...groups.entries()]
    .sort((a, b) => (order.get(a[0]) ?? a[0]) - (order.get(b[0]) ?? b[0]))
    .map(([key, rows]) => ({
      key,
      name: byId.get(key)?.name || `Round ${byId.get(key)?.number ?? key}`,
      series: [...rows].sort((a, b) => (a.sequence ?? a.id) - (b.sequence ?? b.id)),
    }));
}

// Where every box sits. A box follows the middle of the feeders that fill it, and
// drops far enough down the column to clear the box above it. `xs` places a column
// elsewhere than its index says, and `top` moves the whole drawing down.
export function layout(cols, { boxH = 88, gap = 12, colW = 244, boxW = 208, xs = null, top = 0 } = {}) {
  const unit = boxH + gap;
  const centre = new Map();
  const boxes = [];
  cols.forEach((column, index) => {
    let cursor = null;
    for (const row of column.series) {
      const fed = [row.slot1_from_series_id, row.slot2_from_series_id]
        .map((id) => centre.get(id))
        .filter((value) => value !== undefined);
      const ideal = fed.length ? fed.reduce((sum, value) => sum + value, 0) / fed.length : 0;
      const cy = Math.max(cursor === null ? unit / 2 : cursor + unit, ideal);
      cursor = cy;
      centre.set(row.id, cy);
      boxes.push({ row, column: index, x: xs?.[index] ?? index * colW, cy: cy + top, key: `s${row.id}` });
    }
  });
  const lines = [];
  for (const box of boxes) {
    for (const side of [1, 2]) {
      const fromCy = centre.get(feederOf(box.row, side));
      if (fromCy === undefined) continue;
      const from = fromCy + top;
      const fed = boxes.find((other) => other.row.id === feederOf(box.row, side));
      const midX = fed.x + boxW + Math.round((box.x - fed.x - boxW) / 2);
      lines.push({
        key: `${box.key}-${side}`,
        // the two series the line joins, so a lit path lights the line between them
        from: fed.row.id,
        to: box.row.id,
        d: `M${fed.x + boxW} ${from} H${midX} V${box.cy} H${box.x}`,
      });
    }
  }
  return {
    boxes,
    lines,
    boxW,
    boxH,
    width: cols.length ? (xs?.[cols.length - 1] ?? (cols.length - 1) * colW) + boxW : 0,
    height: boxes.reduce((tall, box) => Math.max(tall, box.cy - top + boxH / 2), 0),
  };
}

// A double elimination bracket runs two ladders and a final that joins them. Drawn as
// one row of columns it is wider than a screen and its feeder lines cross the columns
// between, so the columns are split into blocks that are drawn one under the other.
// A column belongs to the lower ladder when every series in it takes a beaten side, or
// when it feeds only from lower columns; a block is a run of columns on the same side.
export function blocks(cols) {
  const columnOf = new Map();
  cols.forEach((column, index) => column.series.forEach((row) => columnOf.set(row.id, index)));
  const lower = new Set();
  cols.forEach((column, index) => {
    const beaten = column.series.every((row) => row.slot1_takes_loser || row.slot2_takes_loser);
    const feeders = column.series
      .flatMap((row) => [row.slot1_from_series_id, row.slot2_from_series_id])
      .filter((id) => id != null);
    const below = feeders.length > 0 && feeders.every((id) => lower.has(columnOf.get(id)));
    if (beaten || below) lower.add(index);
  });
  const made = [];
  cols.forEach((column, index) => {
    const side = lower.has(index) ? 'lower' : 'upper';
    const last = made.at(-1);
    if (last?.side === side) last.columns.push(column);
    else made.push({ key: `${side}-${index}`, side, columns: [column] });
  });
  return made;
}

// A whole bracket as one drawing: each block a band under the one before, headed by its
// round names. A double elimination draws its grand final, and the reset, at the end of the
// upper band, past the last column of the longer ladder, and runs the line up to it from the
// lower bracket final, so the winners of both ladders meet where the upper one ends.
export function drawing(cols, { boxH = 88, gap = 12, colW = 244, boxW = 208, head = 28, between = 20 } = {}) {
  const made = blocks(cols);
  const joined = made.length > 2 && made[0].side === 'upper' && made[1].side === 'lower';
  const upper = made[0]?.columns.length ?? 0;
  const reach = joined ? Math.max(upper, made[1].columns.length) : 0;
  const bands = joined
    ? [{ ...made[0], columns: [...made[0].columns, ...made.slice(2).flatMap((block) => block.columns)] }, made[1]]
    : made;
  const heads = [];
  const boxes = [];
  const lines = [];
  let top = 0;
  let width = 0;
  bands.forEach((band, index) => {
    const xs = band.columns.map((_, at) => (joined && index === 0 && at >= upper ? reach + at - upper : at) * colW);
    const drawn = layout(band.columns, { boxH, gap, colW, boxW, xs, top: top + head });
    band.columns.forEach((column, at) => heads.push({ key: `${band.key}-${column.key}`, round: column.key, name: column.name, x: xs[at], y: top }));
    boxes.push(...drawn.boxes.map((box) => ({ ...box, round: band.columns[box.column] })));
    lines.push(...drawn.lines);
    width = Math.max(width, drawn.width);
    top += head + drawn.height + between;
  });
  if (joined) {
    const byId = new Map(boxes.map((box) => [box.row.id, box]));
    const lower = new Set(made[1].columns.flatMap((column) => column.series.map((row) => row.id)));
    for (const box of boxes.filter((one) => !lower.has(one.row.id) && one.x >= reach * colW)) {
      for (const side of [1, 2]) {
        const fed = byId.get(feederOf(box.row, side));
        if (!fed || !lower.has(fed.row.id)) continue;
        const midX = fed.x + boxW + Math.round((box.x - fed.x - boxW) / 2);
        lines.push({ key: `${box.key}-${side}`, from: fed.row.id, to: box.row.id, d: `M${fed.x + boxW} ${fed.cy} H${midX} V${box.cy} H${box.x}` });
      }
    }
  }
  // the box the champion stands beside: the last series of the last column
  const lastId = cols.at(-1)?.series.at(-1)?.id;
  return { heads, boxes, lines, boxW, boxH, width, height: Math.max(0, top - between), last: boxes.find((box) => box.row.id === lastId) ?? null };
}

// One group of standings per table the stage answers, in division order: a division, or
// one group of a division where the stage splits into groups. The key carries the group,
// so a grouped stage reads one table per group under the division that holds it.
export function standingsGroups(standings = [], divisions = []) {
  const order = new Map(divisions.map((division) => [division.id, division.position]));
  return [...standings]
    .sort((a, b) => (order.get(a.division_id) ?? 0) - (order.get(b.division_id) ?? 0)
      || (a.group_no ?? 0) - (b.group_no ?? 0))
    .map((group) => ({
      key: `${group.division_id ?? 'all'}:${group.group_no ?? 0}`,
      label: [group.division_name, group.group_name].filter(Boolean).join(' \u00b7 ') || 'All entrants',
      division_id: group.division_id ?? null,
      group_no: group.group_no ?? null,
      rows: group.rows || [],
    }));
}

// The tie breaks a stage table reads, in the order ranking_rule names them, the way
// app/services/stage_engine.py _ranking resolves it: a stage that draws round by round
// and names no rule of its own ranks on Buchholz after the points.
const RANKING_RULE = 'points,game_diff,head_to_head';
const SWISS_RANKING_RULE = 'points,buchholz,game_diff,head_to_head';

// Whether the stage pairs one round at a time instead of drawing every series up front
export const drawsByRound = (stage) => stage?.format === 'swiss';

export function ranking(stage) {
  const named = stage?.ranking_rule || RANKING_RULE;
  const rule = drawsByRound(stage) && named === RANKING_RULE ? SWISS_RANKING_RULE : named;
  return rule.split(',').map((word) => word.trim()).filter(Boolean);
}

// Buchholz per entrant: the sum of his opponents' points, added the way app/core/
// brackets.py standings adds it. A bye names one side only, so it adds nothing.
export function buchholz(standings = [], series = []) {
  const points = new Map();
  for (const group of standings) {
    for (const row of group.rows || []) points.set(row.entrant_id, row.points ?? 0);
  }
  const sums = new Map([...points.keys()].map((id) => [id, 0]));
  for (const row of series) {
    const [a, b] = [row.entrant1_id, row.entrant2_id];
    if (!isScored(row) || a == null || b == null) continue;
    if (sums.has(a)) sums.set(a, sums.get(a) + (points.get(b) ?? 0));
    if (sums.has(b)) sums.set(b, sums.get(b) + (points.get(a) ?? 0));
  }
  return sums;
}

// What the next draw of a round-by-round stage writes: the round number it pairs, whether
// the stage has drawn every round it plays, and why it may not draw yet. The engine
// refuses while a series already drawn carries no result, so the button says so first.
export function nextRound(stage, series = [], divisions = []) {
  const bands = divisions.length ? divisions.map((band) => band.id) : [null];
  const drawn = Math.max(0, ...bands
    .map((id) => new Set(inDivision(series, id).map((row) => row.round_id)).size));
  const open = series.filter((row) => !isScored(row)).length;
  return {
    number: drawn + 1,
    done: stage?.swiss_rounds != null && drawn >= stage.swiss_rounds,
    blocked: open
      ? `Round ${drawn} is not finished: ${open} ${open === 1 ? 'series carries' : 'series carry'} no result.`
      : null,
  };
}

// The series of one division, or every series when the stage runs no divisions
export const inDivision = (series, divisionId) => (divisionId == null
  ? series.filter((row) => row.division_id == null)
  : series.filter((row) => row.division_id === divisionId));

const ELIMINATION = ['single_elimination', 'double_elimination'];

// What a generate will play over, read the way app/services/stage_engine.py does: a
// withdrawn entrant never plays, and once any entrant carries a seed the seeded alone
// stand. Only an elimination bracket pads to a power of two, so only it counts byes.
export function generateFields(entrants = [], divisions = [], format = null) {
  const bands = divisions?.length
    ? [...divisions].sort((a, b) => a.position - b.position)
    : [{ id: null, position: 1, name: null }];
  const standing = entrants.filter((row) => !row.withdrawn_at);
  const seeded = standing.filter((row) => row.seed != null);
  const field = seeded.length ? seeded : standing;
  const pads = ELIMINATION.includes(format);
  return bands.map((band) => {
    const count = field.filter((row) => band.id == null || row.division_id === band.id).length;
    let size = 1;
    while (size < count) size *= 2;
    return {
      key: band.id ?? 'all',
      name: band.name || `Division ${band.position}`,
      entrants: count,
      byes: pads && count ? size - count : null,
    };
  });
}

// Who the next stage takes, read the way app/services/stage_engine.py _advance does:
// the top of every division's table, and the whole table when the stage names no count.
export function advancingRows(standings = [], advanceCount = null) {
  return standings.flatMap((group) => (advanceCount
    ? (group.rows || []).slice(0, advanceCount)
    : group.rows || []));
}

// A free for all series is a lobby: one series holding one `series_side` row a seat, each
// with the place it finished. A fixture series writes the same rows for the roster each
// side fields, so a lobby is the series that names no entrant on either side.
export const isLobby = (row) => (row?.sides?.length ?? 0) > 0
  && !standsOn(row, 1) && !standsOn(row, 2);

// The lobbies an entrant may move into: the same round and the same division, still to
// play, and not the one he sits in. A division runs the whole event on its own and never
// merges, so the picker numbers its lobbies the way that division's boxes are numbered.
export function lobbyTargets(series = [], picked = null) {
  if (!picked) return [];
  return series
    .filter((row) => isLobby(row) && row.round_id === picked.round_id
      && row.division_id === picked.division_id)
    .sort((a, b) => (a.sequence ?? a.id) - (b.sequence ?? b.id))
    .map((row, index) => ({ id: row.id, row, label: `Lobby ${index + 1}: ${lobbyNames(row)}` }))
    .filter((item) => item.id !== picked.id && !isScored(item.row));
}

const lobbyNames = (row) => (row.sides || []).map((seat) => seat.user?.name || 'empty').join(', ');

// The seats of one lobby as its box reads them: the winner first, then the rest by
// place, then the seats nobody placed yet. While results are hidden every seat keeps
// its seat order and carries no place, so the box gives nothing away. A fed lobby takes
// its seats from the round before it, so a hidden one names nobody either.
export function lobbySeats(row, hidden = false, fed = false) {
  const seats = [...(row?.sides || [])].sort((a, b) => a.side_no - b.side_no);
  if (hidden) {
    return seats.map((seat) => ({
      ...seat, key: seat.side_no, place: null, result: null, user: fed ? null : seat.user,
    }));
  }
  return seats
    .map((seat) => ({
      ...seat,
      key: seat.side_no,
      result: seat.place == null ? null : (seat.place === 1 ? 'won' : 'lost'),
    }))
    .sort((a, b) => (a.place ?? Infinity) - (b.place ?? Infinity) || a.side_no - b.side_no);
}

// The series one entrant plays in, so a bracket lights up that entrant's way through it
/** @param {any[]} series @param {number | null} entrant */
export function pathOf(series = [], entrant = null) {
  if (entrant == null) return new Set();
  return new Set(series.filter((row) => standsOn(row, 1) === entrant || standsOn(row, 2) === entrant).map((row) => row.id));
}

// A double elimination's reset: both sides come from the grand final, its winner and its loser.
// It is played only when the lower bracket's winner, on side 2, takes the grand final; else the
// engine scores it a walkover of the same two players, which would draw the final twice. So the
// draw leaves the reset out until the grand final calls for it; `keep` holds it in all the same,
// for a page that hides results, where its coming would tell who won the final.
/** @param {any[]} series @param {boolean} keep */
export function withoutIdleReset(series = [], keep = false) {
  if (keep) return series;
  const byId = new Map(series.map((row) => [row.id, row]));
  return series.filter((row) => {
    const from = row.slot1_from_series_id;
    const reset = from != null && from === row.slot2_from_series_id && !!row.slot1_takes_loser !== !!row.slot2_takes_loser;
    return !reset || winnerSide(byId.get(from)) === 2;
  });
}

// Who won the bracket: the winner of the last series of its last column, once it is scored.
// A grand final reset sits in that column after the final, so it decides when it is played;
// a reset the final settled is a walkover the engine scores, and decides the same way.
export function championOf(cols = []) {
  const last = cols.at(-1)?.series ?? [];
  for (let at = last.length - 1; at >= 0; at -= 1) {
    const row = last[at];
    const side = winnerSide(row);
    if (side) return { row, side, entrant: standsOn(row, side), name: sideName(row, side) };
    if (seriesState(row) === 'open') return null;
  }
  return null;
}

/** The entrants who have played a match: both sides of every series with a result and two
 *  named sides. A bye walks its player on without a match, so it counts for nobody.
 *  @param {any[]} series @returns {Set<number>} */
export function playedEntrants(series = []) {
  const played = new Set();
  for (const row of series) {
    const [one, two] = [standsOn(row, 1), standsOn(row, 2)];
    if (isScored(row) && one != null && two != null) {
      played.add(one);
      played.add(two);
    }
  }
  return played;
}

/** How many matches of these carry a played result, as the undo of a draw counts them.
 *  @param {any[]} series */
export const playedCount = (series = []) => series.filter((row) => isScored(row) && standsOn(row, 1) != null && standsOn(row, 2) != null).length;

// The round a phone opens on: the first column still holding a series to play, else the last
export function currentColumn(cols = []) {
  const open = cols.findIndex((column) => column.series.some((row) => !isScored(row)));
  return open === -1 ? Math.max(0, cols.length - 1) : open;
}

