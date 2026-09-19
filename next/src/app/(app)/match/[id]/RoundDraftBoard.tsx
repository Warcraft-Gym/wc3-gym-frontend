/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";
import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardTitle } from "@/components/ui/card";
import { Icon } from "@/components/ui/Icon";
import { Input } from "@/components/ui/input";
import { toneClass } from "@/components/ui/tone";
import { PlayerName } from "@/components/PlayerName";
import { RaceIcon } from "@/components/RaceIcon";
import { TeamName } from "@/components/TeamName";
import { W3CIcon } from "@/components/W3CIcon";
import { record } from "@/helpers/figures.mjs";
import { mmrGap, pairIndex, suggestPairings } from "@/helpers/draft-suggest.mjs";

type Row = Record<string, any>;

const BOARD_WIDTH = 640;
const LEFT_EDGE = 280; // where a team 1 lead line meets the scale
const RIGHT_EDGE = 360;
const LABEL_END = 268; // the right edge of a team 1 label, where its lead line starts
const LABEL_START = 372; // the left edge of a team 2 label
const MIN_ROW = 26;
const PAD = 14;

const WARNING_TEXT: Record<string, string> = {
  under_min_games: "Fewer W3C ladder games than the event asks for",
  no_w3c_stats: "No W3C stats for the signup race",
};

// The games rule of the event, as the board read already applied it
const markOf = (player: Row) =>
  player.games_warning
    ? { colour: player.games_warning === "no_w3c_stats" ? ("error" as const) : ("warning" as const), text: `${WARNING_TEXT[player.games_warning]} (${player.games} games)` }
    : null;

// The MMR window the scale covers, with room over the highest and under the lowest player
function scaleOf(players: Row[]) {
  const rated = players.filter((p) => p.mmr != null).map((p) => p.mmr as number);
  if (!rated.length) return null;
  const high = Math.max(...rated);
  const low = Math.min(...rated);
  const pad = Math.max(50, Math.round((high - low) / 10));
  return { high: high + pad, low: low - pad };
}

/** One row per player at its MMR; rows that would overlap are pushed apart, so every name reads. */
function placeRows(players: Row[], scale: { high: number; low: number }, height: number) {
  const span = Math.max(1, scale.high - scale.low);
  const rows = players.map((player) => {
    const at = PAD + ((scale.high - (player.mmr as number)) / span) * (height - 2 * PAD);
    return { player, at, top: at };
  });
  for (let i = 1; i < rows.length; i++) if (rows[i].top - rows[i - 1].top < MIN_ROW) rows[i].top = rows[i - 1].top + MIN_ROW;
  // the forward pass can push a low cluster past the board, so the last row is held inside it
  if (rows.length) rows[rows.length - 1].top = Math.min(rows[rows.length - 1].top, height - PAD);
  for (let i = rows.length - 2; i >= 0; i--) if (rows[i + 1].top - rows[i].top < MIN_ROW) rows[i].top = rows[i + 1].top - MIN_ROW;
  return rows;
}

const stroke = (token: string) => `rgb(var(--v-theme-${token}))`;

/** The shared hours of a pairing as one counted figure; only zero warns, and a round with no
 *  dates answers null and shows nothing. */
export function SharedHours({ hours }: { hours?: number | null }) {
  if (hours == null) return null;
  if (hours === 0)
    return (
      <span className="inline-flex items-center gap-1 text-error">
        <Icon name="mdi-alert" size={16} />
        No shared hours
      </span>
    );
  return <span className="tnum text-muted-foreground">{Math.round(hours)} h shared</span>;
}

/** The head to head of a pairing: the score in pairing order, with the meetings read on demand. */
export function HeadToHeadCell({ pair, onMeetings }: { pair?: Row; onMeetings: () => Promise<Row[]> }) {
  const [rows, setRows] = useState<Row[] | null>(null);
  const [open, setOpen] = useState(false);
  const score = record(pair?.wins, pair?.losses);
  const show = async () => {
    setOpen((was) => !was);
    if (rows) return;
    setRows(await onMeetings().catch(() => []));
  };
  if (!score) return <span className="text-muted-foreground">no series</span>;
  return (
    <span className="inline-flex flex-wrap items-center gap-1">
      <span className="tnum">{score}</span>
      {pair?.last_event ? <span className="text-xs text-muted-foreground">last met {pair.last_event}</span> : null}
      <Button variant="ghost" size="sm" className="text-primary-text" onClick={show} aria-expanded={open}>
        <Icon name={open ? "mdi-chevron-up" : "mdi-chevron-down"} />
        Meetings
      </Button>
      {open ? (
        <span className="block w-full">
          {rows === null ? (
            <span className="text-xs text-muted-foreground">Reading the meetings…</span>
          ) : rows.length === 0 ? (
            <span className="text-xs text-muted-foreground">No meeting on WC3 Gym yet</span>
          ) : (
            rows.map((meeting) => (
              <span key={meeting.series_id} className="flex items-center gap-2 text-xs">
                <span className="tnum">
                  {meeting.player1_score} – {meeting.player2_score}
                </span>
                {meeting.player1_race ? <RaceIcon raceIdentifier={meeting.player1_race} size="1.1em" /> : null}
                <span className="text-muted-foreground">v</span>
                {meeting.player2_race ? <RaceIcon raceIdentifier={meeting.player2_race} size="1.1em" /> : null}
                <span className="text-muted-foreground">{meeting.event_label || "—"}</span>
              </span>
            ))
          )}
        </span>
      ) : null}
    </span>
  );
}

/** The largest MMR difference of this match: one control over the working value, with the
 *  stage value one click away. A pairing may still sit outside it. */
function DifferenceControl({ value, stageValue, busy, onChange }: { value: number; stageValue?: number | null; busy: boolean; onChange: (next: number | null) => void }) {
  const [text, setText] = useState(String(value));
  const [shown, setShown] = useState(value);
  if (shown !== value) {
    setShown(value);
    setText(String(value));
  }
  const commit = (next: number) => {
    if (!Number.isFinite(next) || next < 1 || next === value) return setText(String(value));
    onChange(next);
  };
  return (
    <span className="flex items-center gap-2">
      <label htmlFor="max-mmr-difference" className="text-sm text-muted-foreground">
        Largest MMR difference
      </label>
      <Input
        id="max-mmr-difference"
        type="number"
        min={1}
        step={25}
        className="tnum w-24"
        value={text}
        disabled={busy}
        aria-busy={busy}
        onChange={(event) => setText(event.target.value)}
        onBlur={() => commit(Number(text))}
        onKeyDown={(event) => (event.key === "Enter" ? commit(Number(text)) : undefined)}
      />
      {stageValue != null && stageValue !== value ? (
        <Button variant="outline" size="sm" className="text-primary-text" disabled={busy} onClick={() => onChange(null)}>
          Reset to {stageValue}
        </Button>
      ) : null}
    </span>
  );
}

/** The captain round draft of one fixture: both rosters on a shared MMR scale, the opponents of
 *  the picked player beside it, and the Ready mark of each captain. */
export function RoundDraftBoard({
  board,
  state,
  maxDifference,
  drafted,
  team1,
  team2,
  playerById,
  ownTeamId,
  playday,
  narrow,
  isOut,
  busy,
  onAddPairings,
  onChangeOpponent,
  onSetMaxDifference,
  onSetReady,
  onCheckIn,
  onMeetings,
}: {
  board: Row | null;
  state: Row | null;
  maxDifference: number; // the working value of the match, which the page holds for the board and the table
  drafted: Row[];
  team1: Row;
  team2: Row;
  playerById: Record<number, Row>; // the rosters the page holds: the board read names no player
  ownTeamId: number | null;
  playday?: number;
  narrow: boolean; // under 960 px the scale becomes two roster lists
  isOut: (playerId: number, teamId: number) => boolean;
  busy: boolean;
  onAddPairings: (pairs: { player1_id: number; player2_id: number }[]) => Promise<void>;
  onChangeOpponent: (draft: Row, side: 1 | 2, playerId: number) => Promise<void>;
  onSetMaxDifference: (value: number | null) => Promise<void>;
  onSetReady: (teamId: number, ready: boolean) => Promise<void>;
  onCheckIn: (teamId: number, playerId: number) => Promise<void>;
  onMeetings: (userA: number, userB: number) => Promise<Row[]>;
}) {
  const [pick, setPick] = useState<number | null>(null);
  const [breaking, setBreaking] = useState<number | null>(null);
  const [showPaired, setShowPaired] = useState(false);
  const [sittingOpen, setSittingOpen] = useState<number | null>(null);
  const [suggested, setSuggested] = useState<Row | null>(null);
  const [dropped, setDropped] = useState<number[]>([]);

  if (!board) return null;

  const pairOf = pairIndex(board);
  // The board read carries no name and no flag, so both come from the rosters the page holds
  const players: Row[] = (board.players || []).map((one: Row) => ({
    ...one,
    name: playerById[one.user_id]?.name,
    country: playerById[one.user_id]?.country ?? null,
  }));
  const byId = new Map<number, Row>(players.map((player) => [player.user_id, player]));
  const stageDifference = state?.stage_max_mmr_difference ?? null;
  const seriesPerRound = board.series_per_round || 0;
  const filled = (board.published_series || 0) + drafted.length;
  const full = seriesPerRound > 0 && filled >= seriesPerRound;

  // Who a player is drafted against on this fixture, and the draft row that holds it
  const draftOf = (playerId: number) => drafted.find((row) => row.player1_id === playerId || row.player2_id === playerId);
  const partnerOf = (playerId: number) => {
    const row = draftOf(playerId);
    if (!row) return null;
    return byId.get(row.player1_id === playerId ? row.player2_id : row.player1_id) || null;
  };
  const takenIds = new Set(drafted.flatMap((row) => [row.player1_id, row.player2_id]));

  const sideOf = (player: Row) => (player.team_id === board.team1_id ? 1 : 2);
  const ordered = (teamId: number) =>
    players.filter((player) => player.team_id === teamId && !isOut(player.user_id, teamId)).sort((a, b) => (b.mmr ?? -1) - (a.mmr ?? -1));
  const sitting = (teamId: number) => players.filter((player) => player.team_id === teamId && isOut(player.user_id, teamId));

  const left = ordered(board.team1_id);
  const right = ordered(board.team2_id);
  const scale = scaleOf([...left, ...right]);
  const shelfLeft = left.filter((player) => player.mmr == null);
  const shelfRight = right.filter((player) => player.mmr == null);
  const shelf = Math.max(shelfLeft.length, shelfRight.length);
  const height = Math.max(320, Math.max(left.length, right.length) * MIN_ROW + 2 * PAD);
  const leftRows = scale ? placeRows(left.filter((player) => player.mmr != null), scale, height) : [];
  const rightRows = scale ? placeRows(right.filter((player) => player.mmr != null), scale, height) : [];
  const topOf = new Map<number, number>();
  for (const row of [...leftRows, ...rightRows]) topOf.set(row.player.user_id, row.at);
  const total = height + (shelf ? shelf * MIN_ROW + 16 : 0);

  const picked = pick != null ? byId.get(pick) || null : null;
  const pickedSide = picked ? sideOf(picked) : null;
  const gapTo = (opponent: Row) => (picked ? mmrGap(picked, opponent) : Infinity);

  const opponentsOf = (player: Row) => ordered(sideOf(player) === 1 ? board.team2_id : board.team1_id);
  const free = picked ? opponentsOf(picked).filter((player) => !takenIds.has(player.user_id)) : [];
  const near = free.filter((player) => gapTo(player) <= maxDifference).sort((a, b) => gapTo(a) - gapTo(b));
  const far = free.filter((player) => gapTo(player) > maxDifference).sort((a, b) => gapTo(a) - gapTo(b));
  const pairedOther = picked ? opponentsOf(picked).filter((player) => takenIds.has(player.user_id)) : [];
  const nearest = far.find((player) => Number.isFinite(gapTo(player)));
  const pickedPartner = picked ? partnerOf(picked.user_id) : null;

  // a player who sits out this round is not on the board, so Suggest never picks that player
  const runSuggest = () => {
    setDropped([]);
    setSuggested(suggestPairings({ ...board, players: [...left, ...right] }, maxDifference, drafted));
  };

  // The whole set goes in one write, so the board and the state are read once for all of it
  const addSuggested = async () => {
    const pairs = (suggested?.pairs || []).filter((pair: Row) => !dropped.includes(pair.player1_id));
    await onAddPairings(pairs.map((pair: Row) => ({ player1_id: pair.player1_id, player2_id: pair.player2_id })));
    setSuggested(null);
  };

  const add = async (opponent: Row) => {
    const [one, two] = sideOf(opponent) === 2 ? [picked as Row, opponent] : [opponent, picked as Row];
    await onAddPairings([{ player1_id: one.user_id, player2_id: two.user_id }]);
    setPick(null);
  };

  // Moving the picked player's own pairing keeps the row and writes the new opponent into it
  const changeTo = async (opponent: Row) => {
    const row = draftOf((picked as Row).user_id);
    if (!row) return add(opponent);
    await onChangeOpponent(row, sideOf(opponent) as 1 | 2, opponent.user_id);
    setPick(null);
  };

  // Taking an opponent who is already paired writes the picked player into that other row
  const takeOver = async (opponent: Row) => {
    const row = draftOf(opponent.user_id);
    if (!row) return;
    await onChangeOpponent(row, pickedSide as 1 | 2, (picked as Row).user_id);
    setPick(null);
  };

  // plain inside the board button, because a link inside a button is not a control
  const playerLine = (player: Row, plain = false) => (
    <PlayerName
      player={{ id: player.user_id, name: player.name, country: player.country, signup_race: player.race }}
      race={player.race}
      mmr={player.mmr ?? null}
      warning={markOf(player)}
      plain={plain}
    />
  );

  // A row on the scale sets its own top; a row of the narrow roster list takes no top and flows
  const label = (player: Row, side: 1 | 2, top: number | null) => {
    const isPicked = pick === player.user_id;
    const isTaken = takenIds.has(player.user_id);
    const placed = top == null ? "w-full py-1" : `absolute w-[268px] ${side === 1 ? "left-0 justify-end" : "left-[372px]"}`;
    return (
      <button
        key={player.user_id}
        type="button"
        title={`Opponents for ${player.name}`}
        aria-pressed={isPicked}
        className={`flex items-center gap-1 rounded px-1 text-sm ${placed} ${isPicked ? "bg-primary/12" : ""} ${isTaken && !isPicked ? "opacity-60" : ""}`}
        style={top == null ? undefined : { top: top - 11 }}
        onClick={() => setPick(isPicked ? null : player.user_id)}
      >
        {playerLine(player, true)}
      </button>
    );
  };

  // Under 960 px the scale would clip, so each roster reads as an ordered list of the same lines
  const rosterList = (team: Row, teamId: number, rows: Row[], side: 1 | 2) => (
    <div key={teamId}>
      <div className="mb-1 border-b pb-1">{teamHead(team, teamId, rows.length)}</div>
      {rows.map((player) => label(player, side, null))}
    </div>
  );

  const teamHead = (team: Row, teamId: number, count: number) => (
    <span className="flex items-center gap-2">
      <TeamName team={team} plain />
      <span className="tnum text-xs text-muted-foreground">{count} players</span>
      {readyChip(teamId)}
    </span>
  );

  const readyOf = (teamId: number) => (state?.teams || []).find((team: Row) => team.team_id === teamId);
  const readyChip = (teamId: number) => {
    const mark = readyOf(teamId);
    if (!mark?.ready_at) return null;
    return (
      <Badge variant="outline" className={toneClass("success")}>
        <Icon name="mdi-check" size={14} />
        Ready
      </Badge>
    );
  };

  const candidate = (opponent: Row, kind: "near" | "far" | "paired") => {
    // every figure of a pairing counts in pairing order, so the team 1 player leads it
    const [firstId, secondId] = pickedSide === 1 ? [(picked as Row).user_id, opponent.user_id] : [opponent.user_id, (picked as Row).user_id];
    const pair = pairOf(firstId, secondId);
    const difference = gapTo(opponent);
    const over = Number.isFinite(difference) && difference > maxDifference ? difference - maxDifference : 0;
    return (
      <div key={opponent.user_id} className="border-t px-3 py-2 first:border-t-0">
        <div className="flex flex-wrap items-center gap-2">
          {playerLine(opponent)}
          <span className="tnum text-muted-foreground">{Number.isFinite(difference) ? `${difference} MMR difference` : "no MMR difference"}</span>
          {over ? <Badge variant="outline" className="tnum">{over} over the largest difference</Badge> : null}
          <SharedHours hours={pair?.hours} />
          <span className="flex-1" />
          {kind === "paired" ? (
            <Button
              variant="outline"
              size="sm"
              disabled={busy}
              onMouseEnter={() => setBreaking(opponent.user_id)}
              onMouseLeave={() => setBreaking(null)}
              onFocus={() => setBreaking(opponent.user_id)}
              onBlur={() => setBreaking(null)}
              onClick={() => takeOver(opponent)}
            >
              <Icon name="mdi-swap-horizontal" />
              Change opponent
            </Button>
          ) : (
            <>
              <Button size="sm" disabled={busy} onClick={() => (pickedPartner ? changeTo(opponent) : add(opponent))}>
                <Icon name={pickedPartner ? "mdi-swap-horizontal" : "mdi-plus"} />
                {pickedPartner ? `Change to ${opponent.name}` : "Add to draft"}
              </Button>
              {pickedPartner ? (
                <Button variant="outline" size="sm" disabled={busy} onClick={() => add(opponent)}>
                  Add as a second pairing
                </Button>
              ) : null}
            </>
          )}
        </div>
        <div className="mt-1 flex flex-wrap items-center gap-3 text-sm">
          {kind === "paired" ? (
            <span className="text-muted-foreground">Paired with {partnerOf(opponent.user_id)?.name}</span>
          ) : (
            <>
              <span className="inline-flex items-center gap-1">
                <W3CIcon size={14} />
                {(picked as Row).name} vs {opponent.race ? <RaceIcon raceIdentifier={opponent.race} size="1.1em" /> : null}{" "}
                {record((picked as Row).vs_race?.[opponent.race]?.[0], (picked as Row).vs_race?.[opponent.race]?.[1]) || "no games"}
              </span>
              <span className="inline-flex items-center gap-1">
                <W3CIcon size={14} />
                {opponent.name} vs {(picked as Row).race ? <RaceIcon raceIdentifier={(picked as Row).race} size="1.1em" /> : null}{" "}
                {record(opponent.vs_race?.[(picked as Row).race]?.[0], opponent.vs_race?.[(picked as Row).race]?.[1]) || "no games"}
              </span>
              <span className="inline-flex items-center gap-1">
                Head to head
                <HeadToHeadCell pair={pair} onMeetings={() => onMeetings(firstId, secondId)} />
              </span>
            </>
          )}
        </div>
      </div>
    );
  };

  const sittingGroup = (teamId: number) => {
    const names = sitting(teamId);
    const own = ownTeamId === teamId;
    const open = sittingOpen === teamId;
    if (!names.length) return null;
    return (
      <div>
        <Button variant="ghost" size="sm" className="text-primary-text" aria-expanded={open} onClick={() => setSittingOpen(open ? null : teamId)}>
          <Icon name={open ? "mdi-chevron-down" : "mdi-chevron-right"} />
          Sitting out ({names.length})
        </Button>
        {open
          ? names.map((player) => (
              <div key={player.user_id} className="flex flex-wrap items-center gap-2 px-3 py-1">
                {playerLine(player)}
                <Badge variant="outline" className={toneClass("error")}>
                  Out
                </Badge>
                {own ? (
                  <Button variant="outline" size="sm" className="text-success" disabled={busy} onClick={() => onCheckIn(teamId, player.user_id)}>
                    Check in for {player.name}
                  </Button>
                ) : null}
              </div>
            ))
          : null}
      </div>
    );
  };

  return (
    <div className="mb-4 flex flex-col gap-4">
      <div className="flex flex-wrap items-center gap-3 rounded bg-surface-light px-3 py-2">
        <span className="tnum">
          {full ? `All ${seriesPerRound} places have a pairing` : `${filled} of ${seriesPerRound} places have a pairing`}
        </span>
        <DifferenceControl value={maxDifference} stageValue={stageDifference} busy={busy} onChange={(next) => onSetMaxDifference(next)} />
        <span className="flex-1" />
        <Button variant="outline" className="text-primary-text" disabled={busy || full} onClick={runSuggest}>
          <Icon name="mdi-lightbulb-on-outline" />
          Suggest pairings
        </Button>
        {ownTeamId ? (
          <Button
            variant={readyOf(ownTeamId)?.ready_at ? "outline" : "default"}
            aria-pressed={!!readyOf(ownTeamId)?.ready_at}
            disabled={busy}
            onClick={() => onSetReady(ownTeamId, !readyOf(ownTeamId)?.ready_at)}
          >
            <Icon name="mdi-check-decagram" />
            {readyOf(ownTeamId)?.ready_at ? "Not ready" : "Mark ready"}
          </Button>
        ) : null}
      </div>

      <div className="grid gap-4 min-[1280px]:grid-cols-[auto_minmax(0,1fr)]">
        {/* on a phone the panel takes the screen, and Close brings the rosters back */}
        {narrow && picked ? null : (
        <Card className="card gap-0 py-0">
          <CardTitle className="flex flex-wrap items-center gap-3 bg-primary px-4 py-3 text-on-primary">
            Draft board
            <span className="flex-1" />
            <span className="inline-flex items-center gap-1 text-sm">
              <W3CIcon size={14} /> MMR of the signup race
            </span>
          </CardTitle>
          <div className={narrow ? "p-4" : "overflow-x-auto p-4"}>
            {narrow ? (
              <div className="grid gap-4">
                {rosterList(team1, board.team1_id, left, 1)}
                {rosterList(team2, board.team2_id, right, 2)}
              </div>
            ) : (
            <>
            <div className="mb-2 flex justify-between gap-2" style={{ width: BOARD_WIDTH }}>
              {teamHead(team1, board.team1_id, left.length)}
              {teamHead(team2, board.team2_id, right.length)}
            </div>
            <div className="relative" style={{ width: BOARD_WIDTH, height: total }}>
              <svg width={BOARD_WIDTH} height={total} className="absolute inset-0" aria-hidden="true">
                {/* the working difference around the picked player, so the reachable opponents stand out */}
                {picked && scale && picked.mmr != null ? (
                  <rect
                    x={pickedSide === 1 ? LEFT_EDGE : 0}
                    y={placeAt(Math.min(scale.high, picked.mmr + maxDifference), scale, height)}
                    width={pickedSide === 1 ? BOARD_WIDTH - LEFT_EDGE : RIGHT_EDGE}
                    height={Math.max(
                      2,
                      placeAt(Math.max(scale.low, picked.mmr - maxDifference), scale, height) - placeAt(Math.min(scale.high, picked.mmr + maxDifference), scale, height),
                    )}
                    fill={stroke("primary")}
                    opacity={0.1}
                  />
                ) : null}
                {drafted.map((row) => {
                  const one = topOf.get(row.player1_id);
                  const two = topOf.get(row.player2_id);
                  if (one == null || two == null) return null;
                  const breaks = breaking != null && (row.player1_id === breaking || row.player2_id === breaking);
                  const pair = pairOf(row.player1_id, row.player2_id);
                  return (
                    <line
                      key={row.id}
                      x1={LEFT_EDGE}
                      y1={one}
                      x2={RIGHT_EDGE}
                      y2={two}
                      strokeWidth={2}
                      strokeDasharray={breaks ? "4 3" : undefined}
                      stroke={breaks ? stroke("error") : pair?.hours === 0 ? stroke("warning") : stroke("on-surface")}
                      opacity={breaks ? 1 : 0.55}
                    />
                  );
                })}
                {picked
                  ? near.map((opponent) => {
                      const one = topOf.get(picked.user_id);
                      const two = topOf.get(opponent.user_id);
                      if (one == null || two == null) return null;
                      return (
                        <line
                          key={opponent.user_id}
                          x1={pickedSide === 1 ? LEFT_EDGE : RIGHT_EDGE}
                          y1={one}
                          x2={pickedSide === 1 ? RIGHT_EDGE : LEFT_EDGE}
                          y2={two}
                          strokeWidth={2}
                          stroke={stroke("primary")}
                        />
                      );
                    })
                  : null}
                {[...leftRows, ...rightRows].map((row) => {
                  const own = sideOf(row.player) === 1;
                  return (
                    <g key={row.player.user_id}>
                      {/* a name pushed off its MMR keeps a lead line back to its own dot */}
                      {Math.abs(row.top - row.at) > 1 ? (
                        <line x1={own ? LEFT_EDGE : RIGHT_EDGE} y1={row.at} x2={own ? LABEL_END : LABEL_START} y2={row.top} stroke={stroke("on-surface")} opacity={0.4} />
                      ) : null}
                      <circle
                        cx={own ? LEFT_EDGE : RIGHT_EDGE}
                        cy={row.at}
                        r={pick === row.player.user_id ? 5 : 3}
                        fill={pick === row.player.user_id ? stroke("primary") : stroke("on-surface")}
                        stroke={stroke("surface")}
                        strokeWidth={2}
                      />
                    </g>
                  );
                })}
                {shelf ? <line x1={0} y1={height + 8} x2={BOARD_WIDTH} y2={height + 8} stroke={stroke("on-surface")} strokeDasharray="2 4" opacity={0.3} /> : null}
              </svg>
              {leftRows.map((row) => label(row.player, 1, row.top))}
              {rightRows.map((row) => label(row.player, 2, row.top))}
              {shelfLeft.map((player, index) => label(player, 1, height + 26 + index * MIN_ROW))}
              {shelfRight.map((player, index) => label(player, 2, height + 26 + index * MIN_ROW))}
              {shelf ? (
                <span className="absolute text-xs text-muted-foreground" style={{ left: LEFT_EDGE + 6, top: height + 18 }}>
                  none
                </span>
              ) : null}
            </div>
            </>
            )}
            <div className="mt-3 grid gap-2 min-[960px]:grid-cols-2" style={narrow ? undefined : { width: BOARD_WIDTH }}>
              {sittingGroup(board.team1_id)}
              {sittingGroup(board.team2_id)}
            </div>
          </div>
        </Card>
        )}

        <div>
          {picked ? (
            <Card className="card gap-0 py-0">
              <CardTitle className="flex flex-wrap items-center gap-2 bg-primary px-4 py-3 text-on-primary">
                {pickedPartner ? `Change opponent for ${picked.name}` : `Opponents for ${picked.name}`}
                <span className="flex-1" />
                <Button variant="ghost" size="sm" className="text-on-primary" onClick={() => setPick(null)}>
                  <Icon name="mdi-close" />
                  Close
                </Button>
              </CardTitle>
              <div className="py-2">
                {pickedPartner ? (
                  <div className={`mx-3 mb-2 flex items-center gap-2 rounded px-3 py-2 ${toneClass("warning")}`}>
                    <Icon name="mdi-alert" />
                    {picked.name} already has a pairing this round, vs {pickedPartner.name}. A second one is allowed and gives {picked.name} two series in round {playday}.
                  </div>
                ) : null}
                {picked.mmr == null ? (
                  <div className="px-3 py-2 text-sm text-muted-foreground">{picked.name} has no MMR, so no difference applies. Every free opponent is listed.</div>
                ) : (
                  <div className="px-3 py-1 text-sm tnum text-muted-foreground">Within {maxDifference} MMR ({near.length})</div>
                )}
                {!near.length && picked.mmr != null ? (
                  <div className="flex flex-wrap items-center gap-2 px-3 py-2">
                    <span className="tnum text-sm">
                      No free opponent within {maxDifference} MMR.
                      {nearest ? ` The nearest is ${nearest.name}, ${gapTo(nearest)} away.` : ""}
                    </span>
                    {nearest ? (
                      <Button variant="outline" size="sm" className="text-primary-text" disabled={busy} onClick={() => onSetMaxDifference(gapTo(nearest))}>
                        Set to {gapTo(nearest)}
                      </Button>
                    ) : null}
                  </div>
                ) : null}
                {near.map((opponent) => candidate(opponent, "near"))}
                {far.length ? <div className="px-3 py-1 text-sm tnum text-muted-foreground">Further in MMR ({far.length})</div> : null}
                {far.map((opponent) => candidate(opponent, "far"))}
                <div className="px-3 pt-2">
                  <Button variant="ghost" size="sm" className="text-primary-text" aria-expanded={showPaired} onClick={() => setShowPaired((was) => !was)}>
                    <Icon name={showPaired ? "mdi-chevron-down" : "mdi-chevron-right"} />
                    Already paired ({pairedOther.length})
                  </Button>
                </div>
                {showPaired ? pairedOther.map((opponent) => candidate(opponent, "paired")) : null}
              </div>
            </Card>
          ) : (
            <div className={`flex items-center gap-2 rounded px-3 py-2 ${toneClass("info")}`}>
              <Icon name="mdi-information" />
              Pick a player on the board to see the opponents, or use Suggest pairings.
            </div>
          )}
        </div>
      </div>

      {suggested ? (
        <Card className="card gap-0 py-0">
          <CardTitle className="flex flex-wrap items-center gap-2 bg-primary px-4 py-3 text-on-primary">
            Suggested pairings
            <span className="flex-1" />
            <Button variant="ghost" size="sm" className="text-on-primary" onClick={() => setSuggested(null)}>
              <Icon name="mdi-close" />
              Cancel
            </Button>
          </CardTitle>
          <div className="p-4">
            <p className="mb-2 text-sm text-muted-foreground">
              The open places take the set of pairings with the smallest total MMR difference. The pairings already drafted stay. Nothing is added until you confirm.
            </p>
            {suggested.pairs.length ? (
              suggested.pairs.map((pair: Row) => {
                const one = byId.get(pair.player1_id) as Row;
                const two = byId.get(pair.player2_id) as Row;
                const off = dropped.includes(pair.player1_id);
                return (
                  <div key={`${pair.player1_id}-${pair.player2_id}`} className={`flex flex-wrap items-center gap-2 border-t py-2 first:border-t-0 ${off ? "opacity-50" : ""}`}>
                    {playerLine(one)}
                    <span className="text-muted-foreground">vs</span>
                    {playerLine(two)}
                    <span className="tnum text-muted-foreground">{pair.difference} MMR difference</span>
                    <SharedHours hours={pairOf(pair.player1_id, pair.player2_id)?.hours} />
                    <span className="flex-1" />
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setDropped((was) => (off ? was.filter((id) => id !== pair.player1_id) : [...was, pair.player1_id]))}
                    >
                      {off ? "Put back" : "Leave out"}
                    </Button>
                  </div>
                );
              })
            ) : (
              <p className="text-sm text-muted-foreground">No pairing fits inside {maxDifference} MMR. Raise the largest MMR difference and run it again.</p>
            )}
            {suggested.open > suggested.pairs.length ? (
              <div className="mt-3">
                <p className="tnum text-sm">
                  {suggested.open - suggested.pairs.length} of {suggested.open} open places stay open at {maxDifference} MMR.
                </p>
                {(suggested.fills as Row[]).map((fill) => (
                  <div key={fill.difference} className="mt-1 flex flex-wrap items-center gap-2">
                    <span className="tnum text-sm text-muted-foreground">{fill.pairs} pairings at {fill.difference}</span>
                    <Button variant="outline" size="sm" className="text-primary-text" disabled={busy} onClick={() => onSetMaxDifference(fill.difference)}>
                      Set to {fill.difference}
                    </Button>
                  </div>
                ))}
              </div>
            ) : null}
            <div className="mt-3 flex justify-end gap-2">
              <Button variant="ghost" onClick={() => setSuggested(null)}>
                Cancel
              </Button>
              <Button disabled={busy || !suggested.pairs.filter((pair: Row) => !dropped.includes(pair.player1_id)).length} onClick={addSuggested}>
                <Icon name="mdi-plus" />
                Add {suggested.pairs.filter((pair: Row) => !dropped.includes(pair.player1_id)).length} to draft
              </Button>
            </div>
          </div>
        </Card>
      ) : null}
    </div>
  );
}

// The y of one MMR on the scale, for the marks the SVG draws between the rows
function placeAt(mmr: number, scale: { high: number; low: number }, height: number) {
  const span = Math.max(1, scale.high - scale.low);
  return PAD + ((scale.high - mmr) / span) * (height - 2 * PAD);
}
