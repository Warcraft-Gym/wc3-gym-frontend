"use client";
import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Icon } from "@/components/ui/Icon";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { toneClass } from "@/components/ui/tone";
import { placeTakers, pairIndex } from "@/helpers/draft-suggest.mjs";
import {
  DEFAULT_ORDER,
  SORT_KEYS,
  matchesOf,
  matchupRow,
  matchupRows,
  newMatchFor,
  pairKey,
  plannerPlayers,
  pruneSelection,
  rangeHints,
  replacementRows,
  selectItem,
  sortMatchups,
  switchAnswer,
  takenPairs,
  topPicks,
} from "@/helpers/planner.mjs";
import { teamLabel } from "@/helpers/teams.mjs";
import { cn } from "@/lib/utils";
import { DraftList } from "./DraftList";
import { MatchupTable } from "./MatchupTable";
import { MmrRange } from "./MmrRange";
import type { Loaded } from "./PairTimeDialog";
import { PlayerStatsPanel, type PanelTarget } from "./PlayerStatsPanel";
import { SelectionTray, type SelectionEntry } from "./SelectionTray";
import { SortChips, type SortOrder } from "./SortChips";
import { WhoNeedsMatch } from "./WhoNeedsMatch";
import { WhoPlays } from "./WhoPlays";

/* eslint-disable @typescript-eslint/no-explicit-any */
type Row = Record<string, any>;
type Pair = { player1_id: number; player2_id: number; replaces_series_id?: number };
/** A matchup the viewer selected: team 1's player first, the series it replaces or the replacement draft it changes. */
type Pick = { player1_id: number; player2_id: number; replaces_series_id?: number; draft_id?: number };
type Mode = "plan" | "replace";
type StepId = "who" | "range" | "matchups" | "draft" | "need";

const ORDER_KEY = "round-planner-sort";
const selectionKey = (matchId: number) => `round-planner-selection:${matchId}`;

// The steps of each mode, with the short label a phone shows
const STEPS: Record<Mode, { id: StepId; label: string; short: string }[]> = {
  plan: [
    { id: "who", label: "Who plays", short: "Who plays" },
    { id: "range", label: "MMR range", short: "Range" },
    { id: "matchups", label: "Pick matchups", short: "Matchups" },
    { id: "draft", label: "Draft", short: "Draft" },
  ],
  replace: [
    { id: "need", label: "Who needs a match", short: "Who needs" },
    { id: "matchups", label: "Pick matchups", short: "Matchups" },
    { id: "draft", label: "Draft", short: "Draft" },
  ],
};

// What a player's note says of each match they hold this round
const MATCH_TEXT: Record<string, string> = {
  published: "Has a series vs",
  played: "Played vs",
  draft: "In the draft vs",
  selected: "Selected vs",
};

// The viewer's own sort order, kept in the browser; a blocked or empty store reads the default
const readOrder = (): SortOrder => {
  try {
    const saved = JSON.parse(window.localStorage.getItem(ORDER_KEY) || "null");
    if (Array.isArray(saved) && saved.every((one) => SORT_KEYS.includes(one?.key) && (one.dir === 1 || one.dir === -1))) return saved;
  } catch {
    // a private window or blocked site data keeps the default
  }
  return DEFAULT_ORDER as SortOrder;
};

// The viewer's selection for one match, kept in the browser until it is moved or cleared
const readSelection = (matchId: number): Pick[] => {
  try {
    const saved = JSON.parse(window.localStorage.getItem(selectionKey(matchId)) || "null");
    if (Array.isArray(saved)) return saved.filter((one) => Number.isInteger(one?.player1_id) && Number.isInteger(one?.player2_id));
  } catch {
    // a private window or blocked site data starts empty
  }
  return [];
};

/** The title of one step, what it asks, and what it shows beside the title. */
function StepHead({ title, hint, children }: { title: string; hint?: string; children?: React.ReactNode }) {
  return (
    <div className="mb-3 flex flex-wrap items-center gap-x-3 gap-y-1">
      <h3 className="text-base font-medium">{title}</h3>
      {children}
      {hint ? <p className="basis-full text-sm text-muted-foreground">{hint}</p> : null}
    </div>
  );
}

function Notice({ children }: { children: React.ReactNode }) {
  return (
    <div className={cn("flex flex-wrap items-center gap-2 rounded px-3 py-2", toneClass("info"))}>
      <Icon name="mdi-information" />
      {children}
    </div>
  );
}

/** The captain's plan for one round of one fixture, a step at a time. "Plan the round" walks who plays,
 *  the MMR range, the matchups to pick from and the draft. "Find a replacement" picks the players of
 *  one team who need a new match and weighs every player of the other team who plays. Picked matchups
 *  wait in the viewer's own selection until they move into the draft both captains share, and either
 *  captain publishes up to the round's series. */
export function RoundPlanner({
  match,
  team1,
  team2,
  board,
  state,
  maxDifference,
  drafts,
  published,
  rosters,
  answers,
  ownTeamId,
  viewerId,
  narrow,
  busy,
  seenAt,
  entry,
  replacedLabel,
  onAnswer,
  onAddPairings,
  onChangeOpponent,
  onSetMaxDifference,
  onToggleFantasy,
  onRemoveDraft,
  onPublish,
  onPublishReplace,
  onMeetings,
  loadFreeTime,
  loadLadder,
}: {
  match: Row;
  team1: Row;
  team2: Row;
  board: Row | null;
  state: Row | null;
  maxDifference: number;
  drafts: Row[];
  published: Row[];
  rosters: Row[][];
  answers: Record<number, Row[]>;
  ownTeamId: number | null;
  viewerId: number | null;
  narrow: boolean;
  busy: boolean;
  seenAt?: string | null;
  /** The player of a published series who stays when the other one is replaced; the planner opens on their matchups. */
  entry: { playerId: number } | null;
  replacedLabel: (draft: Row) => string | null;
  onAnswer: (teamId: number, playerId: number, available: boolean | null) => Promise<unknown>;
  onAddPairings: (pairs: Pair[]) => Promise<boolean>;
  onChangeOpponent: (draft: Row, side: 1 | 2, playerId: number) => Promise<boolean>;
  onSetMaxDifference: (value: number | null) => Promise<unknown>;
  onToggleFantasy: (draft: Row) => void;
  onRemoveDraft: (draft: Row) => void;
  onPublish: (chosen: Row[]) => void;
  onPublishReplace: (draft: Row) => void;
  onMeetings: (userA: number, userB: number) => Promise<Row[]>;
  loadFreeTime: (player1Id: number, player2Id: number) => Promise<Row>;
  /** One player's ladder record over the event window, for the stats panel. */
  loadLadder: (userId: number) => Promise<Row>;
}) {
  const [order, setOrder] = useState<SortOrder>(DEFAULT_ORDER as SortOrder);
  const [mode, setMode] = useState<Mode>(entry ? "replace" : "plan");
  // The step the viewer picked; until then the planner opens where the round stands
  const [step, setStep] = useState<StepId | null>(entry ? "matchups" : null);
  const [focusId, setFocusId] = useState<number | null>(null);
  const [changing, setChanging] = useState<Row | null>(null);
  // The players who need a new match, and their team; a tick never writes a round answer
  const [ticked, setTicked] = useState<number[]>(entry ? [entry.playerId] : []);
  const [needTeamId, setNeedTeamId] = useState<number | null>(null);
  // The matchups the viewer selected and has not moved into the draft
  const [stored, setStored] = useState<Pick[]>([]);
  // A player of a team whose answers the viewer does not read, switched in or out of the viewer's own list
  const [overrides, setOverrides] = useState<Record<number, boolean>>({});
  // The player whose stats the panel shows, and the ladder records read for it, once per player
  const [panel, setPanel] = useState<PanelTarget | null>(null);
  const [ladders, setLadders] = useState<Record<number, Loaded>>({});

  // the stored order and selection are the browser's, so they are read once the page is in the browser
  useEffect(() => {
    queueMicrotask(() => setOrder(readOrder()));
  }, []);
  useEffect(() => {
    if (match.id != null) queueMicrotask(() => setStored(readSelection(match.id)));
  }, [match.id]);
  const changeOrder = (next: SortOrder) => {
    setOrder(next);
    try {
      window.localStorage.setItem(ORDER_KEY, JSON.stringify(next));
    } catch {
      // the order still holds for this visit
    }
  };

  const playday = match.playday;
  const team1Id = board?.team1_id ?? match.team1_id;
  const team2Id = board?.team2_id ?? match.team2_id;
  const players = useMemo(() => plannerPlayers({ board, rosters, answers, playday }), [board, rosters, answers, playday]);
  const byId = useMemo(() => new Map<number, Row>(players.map((player: Row) => [player.user_id, player])), [players]);
  const pairOf = useMemo(() => pairIndex(board), [board]);
  const at = board?.window_start ?? null;
  // a series can name a player the rosters no longer hold
  const nameOf = (id: number) => {
    if (byId.get(id)?.name) return byId.get(id)!.name;
    for (const row of [...published, ...drafts]) {
      if (row.player1_id === id && row.player1?.name) return row.player1.name;
      if (row.player2_id === id && row.player2?.name) return row.player2.name;
    }
    return "a player";
  };

  // A name opens the stats panel; the player's ladder record over the event window is read the first time
  const readLadder = async (userId: number) => {
    setLadders((was) => ({ ...was, [userId]: { state: "loading" } }));
    try {
      const data = await loadLadder(userId);
      setLadders((was) => ({ ...was, [userId]: { state: "ok", data } }));
    } catch (error: any) {
      setLadders((was) => ({ ...was, [userId]: { state: "error", message: error?.error || error?.message || String(error) } }));
    }
  };
  const openPlayer = (player: Row | undefined, opponent: Row | null = null, row: Row | null = null) => {
    if (!player) return;
    setPanel({ player, opponent, row });
    const known = ladders[player.user_id]?.state;
    if (known !== "ok" && known !== "loading") readLadder(player.user_id);
  };
  const openPlayerId = (id: number) => openPlayer(byId.get(id));

  // The selection the reads still leave room for: a pair the draft or the series took meanwhile leaves it
  const selection: Pick[] = pruneSelection(stored, { published, drafts, known: (id: number) => byId.has(id) });
  const changeSelection = (next: Pick[]) => {
    setStored(next);
    try {
      window.localStorage.setItem(selectionKey(match.id), JSON.stringify(next));
    } catch {
      // the selection still holds for this visit
    }
  };
  const selectedKeys = new Set(selection.map((one) => pairKey(one.player1_id, one.player2_id)));
  const isSelected = (row: Row) => selectedKeys.has(pairKey(row.a.user_id, row.b.user_id));

  // Every match a player holds this round: published, in the draft, or in the viewer's selection
  const matches = matchesOf({ published, drafts, selection });
  const busyIds = new Set<number>(matches.keys());
  const taken = takenPairs(published, drafts);
  const pairedAs = (id: number) => {
    const kinds = (matches.get(id) || []).map((one) => one.kind);
    if (kinds.includes("published") || kinds.includes("played")) return "Has a series";
    if (kinds.includes("draft")) return "In the draft";
    return kinds.includes("selected") ? "Selected" : null;
  };
  // The matches a player holds beside the one this row pairs them in
  const otherMatches = (player: Row, opponent: number) => (matches.get(player.user_id) || []).filter((one) => one.opponent !== opponent);
  const matchNote = (player: Row, opponent: number) => {
    const list = otherMatches(player, opponent);
    return list.length ? list.map((one) => `${MATCH_TEXT[one.kind]} ${nameOf(one.opponent)}`).join(" · ") : null;
  };

  const included = (player: Row) => (player.answersRead ? player.plays : overrides[player.user_id] ?? player.plays);
  const playing = (teamId: number) => players.filter((player: Row) => player.team_id === teamId && included(player));
  const side1 = playing(team1Id);
  const side2 = playing(team2Id);
  const free1 = side1.filter((player: Row) => !busyIds.has(player.user_id));
  const free2 = side2.filter((player: Row) => !busyIds.has(player.user_id));
  const perRound = board?.series_per_round || 0;
  // The round publishes up to its series; the draft holds any number of pairings
  const publishLeft = Math.max(0, perRound - published.length);
  const unplanned = Math.max(0, publishLeft - placeTakers(drafts).length - selection.filter((one) => one.replaces_series_id == null && one.draft_id == null).length);
  const maxPlayed: [number, number] = [team1Id, team2Id].map((teamId) =>
    Math.max(0, ...players.filter((player: Row) => player.team_id === teamId).map((player: Row) => player.played)),
  ) as [number, number];

  // Plan the round. The focus: the own player of a pairing whose opponent changes, or the player the viewer picked
  const changeFocus = changing
    ? byId.get(ownTeamId != null && Number(changing.player2?.team_id ?? byId.get(changing.player2_id)?.team_id) === Number(ownTeamId) ? changing.player2_id : changing.player1_id) ?? null
    : null;
  const focus = changeFocus ?? (focusId != null ? byId.get(focusId) ?? null : null);
  const planRows = sortMatchups(matchupRows({ side1, side2, team1Id, range: maxDifference, focus, pairOf, at, taken }), order);
  const planPicks = focus ? new Set<string>() : topPicks(planRows, unplanned, busyIds);
  const inRange = matchupRows({ side1, side2, team1Id, range: maxDifference, pairOf, at, taken }).length;
  const hints = rangeHints(free1, free2, maxDifference);

  // Find a replacement: the ticked players of one team against everyone of the other team who plays
  const needTeam = needTeamId ?? byId.get(ticked[0])?.team_id ?? ownTeamId ?? team1Id;
  const otherTeamId = Number(needTeam) === Number(team1Id) ? team2Id : team1Id;
  const stays = ticked.map((id) => byId.get(id)).filter((player): player is Row => !!player && Number(player.team_id) === Number(needTeam));
  const candidates = players.filter((player: Row) => Number(player.team_id) === Number(otherTeamId) && included(player));
  const replaceRows = sortMatchups(replacementRows({ selected: stays, candidates, team1Id, range: maxDifference, published, drafts, pairOf, at }), order);
  const busyCandidates = new Set([...busyIds].filter((id) => !ticked.includes(id)));
  const replacePicks = topPicks(replaceRows, stays.length, busyCandidates);

  const replacing = mode === "replace";
  const rows = replacing ? replaceRows : planRows;
  const picks = replacing ? replacePicks : planPicks;
  const steps = STEPS[mode];
  const current: StepId = step && steps.some((one) => one.id === step) ? step : replacing ? "need" : drafts.length ? "draft" : "who";

  const go = (next: StepId) => {
    setStep(next);
    document.getElementById("round-planner")?.scrollIntoView({ behavior: "smooth", block: "start" });
  };
  const switchMode = (next: Mode) => {
    setMode(next);
    setStep(next === "replace" ? "need" : "who");
    setFocusId(null);
    setChanging(null);
  };
  const clearFocus = () => {
    setFocusId(null);
    setChanging(null);
  };

  const other = (row: Row) => (focus && row.a.user_id === focus.user_id ? row.b : row.a);
  const planToggle = (row: Row) => changeSelection(selectItem(selection, { player1_id: row.a.user_id, player2_id: row.b.user_id }));
  const changeTo = async (row: Row) => {
    if (changing && (await onChangeOpponent(changing, other(row).team_id === team1Id ? 1 : 2, other(row).user_id))) clearFocus();
  };
  const selectPicks = () =>
    changeSelection([
      ...selection,
      ...planRows.filter((row: Row) => planPicks.has(row.key) && !isSelected(row)).map((row: Row) => ({ player1_id: row.a.user_id, player2_id: row.b.user_id })),
    ]);

  // A replacement keeps the ticked player: it replaces their open series, changes the draft that
  // already does, or is a new pairing. One selected match per ticked player.
  const replaceAction = (row: Row) => {
    const need = row.need;
    const pick: Pick = { player1_id: row.a.user_id, player2_id: row.b.user_id };
    if (need.kind === "replace" && need.replacedBy) pick.draft_id = need.replacedBy.id;
    else if (need.kind === "replace") pick.replaces_series_id = need.series.id;
    changeSelection(selectItem(selection, pick, { onePerPlayer: row.stay.user_id }));
  };
  const needNote = (stay: Row) => {
    const need = newMatchFor(stay.user_id, published, drafts);
    if (need.kind === "replace") {
      const drop = nameOf(need.dropId);
      return need.replacedBy
        ? `${stay.name}: a draft already replaces ${stay.name} vs ${drop}. A pick changes its opponent.`
        : `${stay.name}: the new match replaces ${stay.name} vs ${drop} when it is published.`;
    }
    return publishLeft ? `${stay.name}: a new pairing in the draft.` : `${stay.name}: a new pairing waits in the draft, since every series of the round is published.`;
  };

  // The selection moves in one run: new pairings and replacements are written, a change edits its draft
  const moveToDraft = async () => {
    const moving = selection;
    const writes: Pair[] = moving
      .filter((one) => one.draft_id == null)
      .map((one) => ({ player1_id: one.player1_id, player2_id: one.player2_id, ...(one.replaces_series_id != null ? { replaces_series_id: one.replaces_series_id } : {}) }));
    let done = writes.length ? await onAddPairings(writes) : true;
    for (const one of moving.filter((pick) => pick.draft_id != null)) {
      if (!done) break;
      const draft = drafts.find((row) => row.id === one.draft_id);
      if (!draft) continue;
      const side: 1 | 2 = draft.player1_id !== one.player1_id ? 1 : 2;
      done = await onChangeOpponent(draft, side, side === 1 ? one.player1_id : one.player2_id);
    }
    // a run that failed part-way keeps the rest: the reads drop what was written
    if (!done) return;
    changeSelection([]);
    setTicked((was) => was.filter((id) => !moving.some((one) => one.player1_id === id || one.player2_id === id)));
    go("draft");
  };
  const entries: SelectionEntry[] = selection.flatMap((one) => {
    const a = byId.get(one.player1_id);
    const b = byId.get(one.player2_id);
    if (!a || !b) return [];
    let note: string | null = null;
    if (one.replaces_series_id != null) {
      const series = published.find((row) => Number(row.id) === Number(one.replaces_series_id));
      note = series ? `Replaces ${nameOf(series.player1_id)} vs ${nameOf(series.player2_id)}` : null;
    } else if (one.draft_id != null) note = "Changes the replacement in the draft";
    return [{ key: pairKey(one.player1_id, one.player2_id), a, b, difference: matchupRow(a, b, { range: maxDifference }).difference, note }];
  });
  const removeEntry = (key: string) => changeSelection(selection.filter((one) => pairKey(one.player1_id, one.player2_id) !== key));

  const switchPlayer = (player: Row, on: boolean) => {
    if (player.answersRead) return onAnswer(player.team_id, player.user_id, switchAnswer(player.answer, on));
    setOverrides((was) => ({ ...was, [player.user_id]: on }));
  };

  const factsOf = (draft: Row) => {
    const a = byId.get(draft.player1_id);
    const b = byId.get(draft.player2_id);
    return a && b ? matchupRow(a, b, { range: maxDifference, pairOf, at }) : null;
  };
  // A pairing the other captain moved since this team last opened the draft; seen_at null means it never did
  const isFresh = (draft: Row) => {
    if (seenAt === undefined) return false;
    const by = draft.updated_by_user_id ?? draft.created_by_user_id ?? null;
    return !!draft.updated_at && (seenAt === null || draft.updated_at > seenAt) && (by == null || by !== viewerId);
  };
  const outNames = (draft: Row) =>
    [draft.player1_id, draft.player2_id].map((id) => byId.get(id)).filter((player): player is Row => !!player && !included(player)).map((player) => player.name);

  const fantasyCount = drafts.filter((draft) => draft.is_fantasy_match).length;
  const fantasyPublished = published.some((row) => row.is_fantasy_match);
  const plays = (teamId: number) => playing(teamId).length;
  const focusChips = [...side1, ...side2];
  const teams = [
    { team: team1, teamId: team1Id },
    { team: team2, teamId: team2Id },
  ];
  const otherTeam = Number(otherTeamId) === Number(team1Id) ? team1 : team2;

  if (!board) {
    return (
      <div className={cn("m-4 flex items-center gap-2 rounded px-3 py-2", toneClass("info"))}>
        <Icon name="mdi-information" />
        The round planner did not load. Refresh the page to try again.
      </div>
    );
  }

  const counts: Record<StepId, React.ReactNode> = {
    who: `${plays(team1Id)}·${plays(team2Id)}`,
    range: maxDifference,
    matchups: (
      <>
        {rows.length}
        {selection.length ? (
          <span className="ml-1.5 inline-flex items-center gap-0.5 rounded-full bg-primary px-1.5 text-[11px] text-on-primary" aria-label={`${selection.length} selected`}>
            <Icon name="mdi-check" size={11} />
            {selection.length}
          </span>
        ) : null}
      </>
    ),
    draft: (
      <>
        {drafts.length}
        {fantasyCount ? <Icon name="mdi-star" size={12} className="ml-0.5 text-primary-text" /> : null}
      </>
    ),
    need: ticked.length || null,
  };

  const index = steps.findIndex((one) => one.id === current);
  const back = steps[index - 1];
  const next = steps[index + 1];
  const nav = (
    <div className={cn("mt-4 gap-2 border-t pt-3", narrow ? "grid grid-cols-2" : "flex justify-between")}>
      {back ? (
        <Button variant="outline" onClick={() => go(back.id)}>
          <Icon name="mdi-chevron-left" />
          Back
        </Button>
      ) : (
        <span />
      )}
      {next ? (
        <Button disabled={current === "need" && !stays.length} onClick={() => go(next.id)}>
          {narrow ? "Next" : `Next: ${next.label}`}
          <Icon name="mdi-chevron-right" />
        </Button>
      ) : null}
    </div>
  );

  let modeText: string | null = null;
  if (changing) modeText = `Pick a new opponent for ${focus?.name}. Now: ${focus?.user_id === changing.player1_id ? changing.player2?.name : changing.player1?.name}.`;
  else if (focus) modeText = `Every opponent of ${focus.name} who plays, also outside the range.`;

  return (
    <div id="round-planner" className={cn("flex scroll-mt-16 flex-col gap-3 p-4", narrow && current !== "draft" && "pb-20")}>
      <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
        <ToggleGroup variant="outline" spacing={0} aria-label="What to plan" value={[mode]} onValueChange={(value) => (value[0] ? switchMode(value[0] as Mode) : undefined)}>
          <ToggleGroupItem value="plan">Plan the round</ToggleGroupItem>
          <ToggleGroupItem value="replace">Find a replacement</ToggleGroupItem>
        </ToggleGroup>
        <span className="tnum text-sm text-muted-foreground">
          Round {playday} · {published.length} of {perRound} published · {drafts.length} in draft{selection.length ? ` · ${selection.length} selected` : ""}
        </span>
      </div>

      <Tabs value={current} onValueChange={(value) => setStep(value as StepId)}>
        <div className="-mx-4 overflow-x-auto border-b px-4 pb-1.5">
          <TabsList variant="line" aria-label="Steps" className="min-w-full justify-start">
            {steps.map((one, n) => (
              <TabsTrigger key={one.id} value={one.id} className="flex-none gap-2 px-3">
                <span className={cn("inline-grid size-5 place-items-center rounded-full text-[11px] tnum", one.id === current ? "bg-primary text-on-primary" : "bg-muted text-foreground")}>
                  {n + 1}
                </span>
                {narrow ? one.short : one.label}
                {counts[one.id] != null ? <span className="inline-flex items-center text-xs font-normal text-muted-foreground tnum">{counts[one.id]}</span> : null}
              </TabsTrigger>
            ))}
          </TabsList>
        </div>

        <TabsContent value="who" className="pt-2">
          <StepHead title="Who plays this round" hint="Switch off whoever cannot play. On your own team the switch is saved as the player's round answer." />
          <WhoPlays
            teams={teams}
            ownTeamId={ownTeamId}
            players={players}
            included={included}
            pairedAs={pairedAs}
            viewerId={viewerId}
            busy={busy}
            onSwitch={switchPlayer}
            onPlayer={(player) => openPlayer(player)}
          />
          {nav}
        </TabsContent>

        <TabsContent value="range" className="pt-2">
          <StepHead title="MMR range" hint="The largest MMR difference a matchup may have. Both captains of this match share it." />
          <MmrRange
            value={maxDifference}
            stageValue={state?.stage_max_mmr_difference ?? null}
            count={inRange}
            sidesLeft={free1.length > 0 && free2.length > 0}
            hints={hints}
            busy={busy}
            onChange={onSetMaxDifference}
          />
          {nav}
        </TabsContent>

        <TabsContent value="need" className="pt-2">
          <StepHead title="Who needs a new match" hint="Tick the players of one team who need a new opponent. Every player of the other team who plays is a candidate." />
          <WhoNeedsMatch
            teams={teams}
            teamId={needTeam}
            players={players}
            selected={ticked}
            published={published}
            drafts={drafts}
            candidates={candidates.length}
            nameOf={nameOf}
            onPlayer={(player) => openPlayer(player)}
            onTeam={(teamId) => {
              setNeedTeamId(teamId);
              setTicked([]);
            }}
            onToggle={(playerId, on) => setTicked((was) => (on ? [...was.filter((id) => id !== playerId), playerId] : was.filter((id) => id !== playerId)))}
          />
          {nav}
        </TabsContent>

        <TabsContent value="matchups" className="pt-2">
          <StepHead
            title="Pick matchups"
            hint={
              replacing
                ? "Every candidate for each player who needs a match, also outside the range. Select one for each player."
                : "Sort on what matters to you and click the matchups that make sense. The calendar shows when the two can play, and a name opens the player's stats."
            }
          />
          <div className="flex flex-col gap-3">
            <SelectionTray entries={entries} busy={busy} onRemove={removeEntry} onClear={() => changeSelection([])} onMove={moveToDraft} onPlayer={openPlayerId} />
            {replacing ? (
              stays.length ? (
                <Notice>
                  <ul className="grow">
                    {stays.map((stay) => (
                      <li key={stay.user_id}>{needNote(stay)}</li>
                    ))}
                  </ul>
                </Notice>
              ) : null
            ) : (
              <>
                {modeText ? (
                  <Notice>
                    <span className="grow">{modeText}</span>
                    <Button variant="outline" size="sm" onClick={clearFocus}>
                      {changing ? "Cancel" : "Show all players"}
                    </Button>
                  </Notice>
                ) : null}
                {focusChips.length ? (
                  <div className="flex flex-wrap items-center gap-2" role="group" aria-label="Show one player's opponents">
                    <span className="text-sm font-medium">Show one player</span>
                    {focusChips.map((player: Row) => (
                      <Button
                        key={player.user_id}
                        variant={focus?.user_id === player.user_id ? "default" : "outline"}
                        size="sm"
                        className="rounded-full"
                        aria-pressed={focus?.user_id === player.user_id}
                        disabled={!!changing}
                        onClick={() => setFocusId(focusId === player.user_id ? null : player.user_id)}
                      >
                        {player.name}
                      </Button>
                    ))}
                  </div>
                ) : null}
              </>
            )}
            <SortChips order={order} teams={{ team1: team1?.name ?? "Team 1", team2: team2?.name ?? "Team 2" }} onChange={changeOrder} />
            {replacing && picks.size ? (
              <span className="text-sm text-muted-foreground">
                The first row of your sort for each player is marked <Icon name="mdi-star" size={14} className="text-primary-text" />.
              </span>
            ) : null}
            {!replacing && picks.size ? (
              <div className="flex flex-wrap items-center gap-3">
                <Button variant="outline" disabled={busy} onClick={selectPicks}>
                  <Icon name="mdi-star" />
                  Select the {picks.size} top pick{picks.size === 1 ? "" : "s"}
                </Button>
                <span className="text-sm text-muted-foreground">
                  The first rows of your sort whose players hold no match yet, one per series still unplanned, marked{" "}
                  <Icon name="mdi-star" size={14} className="text-primary-text" />.
                </span>
              </div>
            ) : null}
            {!replacing && !publishLeft && !changing ? (
              <Notice>Every series of the round is published. Pairings you move wait in the draft; only a replacement publishes now.</Notice>
            ) : null}
          </div>
          <div className="-mx-4 mt-3">
            <MatchupTable
              rows={rows}
              picks={picks}
              order={order}
              team1={team1}
              team2={team2}
              maxPlayed={maxPlayed}
              narrow={narrow}
              busy={busy}
              selected={isSelected}
              onToggle={replacing ? replaceAction : planToggle}
              changeLabel={changing && !replacing ? (row) => `Change to ${other(row).name}` : null}
              onChange={changeTo}
              onPlayer={(player, opponent, row) => openPlayer(player, opponent, row)}
              // a replacement names the candidates' matches; the ticked player's own series is what it replaces
              noteOf={(player, row) => (replacing && player.user_id === row.stay.user_id ? null : matchNote(player, player.user_id === row.a.user_id ? row.b.user_id : row.a.user_id))}
              marked={(row) =>
                replacing ? otherMatches(row.other, row.stay.user_id).length > 0 : otherMatches(row.a, row.b.user_id).length > 0 || otherMatches(row.b, row.a.user_id).length > 0
              }
              loadFreeTime={(row) => loadFreeTime(row.a.user_id, row.b.user_id)}
              empty={
                replacing
                  ? !stays.length
                    ? "Tick who needs a new match in step 1."
                    : `Nobody of ${teamLabel(otherTeam) || "the other team"} plays this round.`
                  : focus
                    ? `${focus.name} has no opponent left to pair.`
                    : !side1.length || !side2.length
                      ? "Nobody plays on one side."
                      : `No matchup within ${maxDifference} MMR. Raise the range in step 2.`
              }
            />
          </div>
          {nav}
        </TabsContent>

        <TabsContent value="draft" className="pt-2">
          <StepHead title="Draft" hint="Shared with the other captain of this match. Either captain publishes, up to the series of the round.">
            <span className="rounded-full border px-2.5 py-0.5 text-xs tnum">
              {published.length} of {perRound} published
            </span>
            <span className="inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-xs">
              <Icon name="mdi-star" size={14} className="text-primary-text" />
              {fantasyCount ? `${fantasyCount} fantasy series` : "No fantasy series yet"}
            </span>
          </StepHead>
          <DraftList
            drafts={drafts}
            factsOf={factsOf}
            isFresh={isFresh}
            replacedLabel={replacedLabel}
            outNames={outNames}
            publishLeft={publishLeft}
            publishedCount={published.length}
            perRound={perRound}
            fantasyPublished={fantasyPublished}
            busy={busy}
            canPublish
            onToggleFantasy={onToggleFantasy}
            onChange={(draft) => {
              setMode("plan");
              setFocusId(null);
              setChanging(draft);
              go("matchups");
            }}
            onRemove={onRemoveDraft}
            onPlayer={openPlayerId}
            onPublish={onPublish}
            onPublishReplace={onPublishReplace}
          />
          {nav}
        </TabsContent>
      </Tabs>

      {narrow && current !== "draft" ? (
        // the phone keeps the selection and the draft in reach, fixed above the tab bar; the page leaves room under it
        <div role="region" aria-label="Selection and draft" className="fixed inset-x-0 bottom-[calc(3.5rem+env(safe-area-inset-bottom))] z-30 flex items-center gap-3 border-t border-border bg-surface px-4 py-2 shadow-lg">
          <div className="grow text-sm">
            <div className="font-medium">{selection.length ? `Your selection · ${selection.length}` : `Draft · ${drafts.length} pairing${drafts.length === 1 ? "" : "s"}`}</div>
            <div className="tnum text-muted-foreground">
              {published.length} of {perRound} published · {fantasyCount ? `${fantasyCount} fantasy` : "no fantasy yet"}
            </div>
          </div>
          {selection.length ? (
            <Button size="sm" disabled={busy} onClick={moveToDraft}>
              Move {selection.length} to draft
            </Button>
          ) : (
            <Button variant="outline" size="sm" onClick={() => go("draft")}>
              View draft
            </Button>
          )}
        </div>
      ) : null}

      <PlayerStatsPanel
        target={panel}
        team={panel ? (Number(panel.player.team_id) === Number(team1Id) ? team1 : team2) : null}
        ladder={panel ? ladders[panel.player.user_id] : undefined}
        onClose={() => setPanel(null)}
        onRetry={() => (panel ? readLadder(panel.player.user_id) : undefined)}
        onMeetings={onMeetings}
      />
    </div>
  );
}

export default RoundPlanner;
