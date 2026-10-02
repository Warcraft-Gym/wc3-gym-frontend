"use client";
import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Icon } from "@/components/ui/Icon";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toneClass } from "@/components/ui/tone";
import { placeTakers, pairIndex } from "@/helpers/draft-suggest.mjs";
import {
  DEFAULT_ORDER,
  SORT_KEYS,
  cycleSort,
  matchesOf,
  matchupRow,
  matchupRows,
  pairKey,
  plannerPlayers,
  pruneSelection,
  rangeHints,
  selectItem,
  sortMatchups,
  switchAnswer,
  takenPairs,
  topPicks,
} from "@/helpers/planner.mjs";
import { cn } from "@/lib/utils";
import { DraftList } from "./DraftList";
import { InfoTip, Notice } from "./InfoTip";
import { MatchupTable, type SortKey, type SortOrder } from "./MatchupTable";
import { MmrRange } from "./MmrRange";
import type { Loaded } from "./PairTimeDialog";
import { PlayerStatsPanel, type PanelTarget } from "./PlayerStatsPanel";
import { ReplaceSeries } from "./ReplaceSeries";
import { PlayerFocus } from "./PlayerFocus";
import { SelectionTray, type SelectionEntry } from "./SelectionTray";
import { WhoPlays } from "./WhoPlays";

/* eslint-disable @typescript-eslint/no-explicit-any */
type Row = Record<string, any>;
type Pair = { player1_id: number; player2_id: number; replaces_series_id?: number };
/** A matchup the viewer selected, team 1's player first. */
type Pick = { player1_id: number; player2_id: number };
type StepId = "who" | "range" | "matchups" | "draft";

const ORDER_KEY = "round-planner-sort";
const selectionKey = (matchId: number) => `round-planner-selection:${matchId}`;

// The steps, with the short label a phone shows
const STEPS: { id: StepId; label: string; short: string }[] = [
  { id: "who", label: "Who plays", short: "Who plays" },
  { id: "range", label: "MMR range", short: "Range" },
  { id: "matchups", label: "Pick matchups", short: "Matchups" },
  { id: "draft", label: "Draft", short: "Draft" },
];

// What each step does, behind the info button beside its title; the people who plan know it by heart
const HELP: Record<StepId, string> = {
  who:
    "Switch off whoever cannot play this round. For your own team the switch saves the player's round answer at once, and the player sees it on Home. For the other team it only leaves the player out of your own list; their captain sets their answers.",
  range: "The largest MMR difference a matchup may have. Both captains of this match share it. Reset goes back to the value of the stage.",
  matchups:
    "Click a row, or its box, to select the matchup. The selection stays in this browser, seen only by you, until you move it into the draft. A tinted row has a player who already holds a match this round. The calendar shows when the two can play, and a name opens the player's stats. Click a column title to sort by it, again to turn the sort round, and a third time to stop; the number is its place in the sort. Show lists every opponent of the players you add, also outside the range. The list starts unsorted, in roster order by MMR. Once it is sorted, the top picks are the first rows of your sort whose players hold no match yet, one per series the round has not planned.",
  draft:
    "Shared with the other captain of this match. Tick the pairings to publish: either captain publishes, up to the series of the round, and an unticked pairing stays in the draft.",
};

// What a player's chip says of each match they hold this round, short enough for one line
const MATCH_TEXT: Record<string, string> = {
  published: "Series vs",
  played: "Played vs",
  draft: "Draft vs",
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
    if (Array.isArray(saved)) {
      return saved
        .filter((one) => Number.isInteger(one?.player1_id) && Number.isInteger(one?.player2_id))
        .map((one) => ({ player1_id: one.player1_id, player2_id: one.player2_id }));
    }
  } catch {
    // a private window or blocked site data starts empty
  }
  return [];
};

/** The title of one step, its info button, and what it shows beside the title. */
function StepHead({ id, title, children }: { id: StepId; title: string; children?: React.ReactNode }) {
  return (
    <div className="mb-2 flex flex-wrap items-center gap-x-2 gap-y-1">
      <h3 className="text-base font-medium">{title}</h3>
      <InfoTip label={title}>{HELP[id]}</InfoTip>
      {children}
    </div>
  );
}

/** The captain's plan for one round of one fixture, a step at a time: who plays, the MMR range, the
 *  matchups to pick from and the draft. Picked matchups wait in the viewer's own selection until they
 *  move into the draft both captains share, and either captain publishes up to the round's series. */
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
  replacing,
  replacedLabel,
  onAnswer,
  onAddPairings,
  onChangeOpponent,
  onSetMaxDifference,
  onToggleFantasy,
  onRemoveDraft,
  onRemoveDrafts,
  onPublish,
  onPublishReplace,
  onReplace,
  onCancelReplace,
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
  /** The published series a captain looks for a replacement for; the plan shows that search instead of its steps. */
  replacing: Row | null;
  replacedLabel: (draft: Row) => string | null;
  onAnswer: (teamId: number, playerId: number, available: boolean | null) => Promise<unknown>;
  onAddPairings: (pairs: Pair[]) => Promise<boolean>;
  onChangeOpponent: (draft: Row, side: 1 | 2, playerId: number) => Promise<boolean>;
  onSetMaxDifference: (value: number | null) => Promise<unknown>;
  onToggleFantasy: (draft: Row) => void;
  onRemoveDraft: (draft: Row) => void;
  onRemoveDrafts: (drafts: Row[]) => void;
  onPublish: (chosen: Row[]) => void;
  onPublishReplace: (draft: Row) => void;
  onReplace: (series: Row, pairs: Pair[]) => Promise<boolean>;
  onCancelReplace: () => void;
  onMeetings: (userA: number, userB: number) => Promise<Row[]>;
  loadFreeTime: (player1Id: number, player2Id: number) => Promise<Row>;
  /** One player's ladder record over the event window, for the stats panel. */
  loadLadder: (userId: number) => Promise<Row>;
}) {
  const [order, setOrder] = useState<SortOrder>(DEFAULT_ORDER as SortOrder);
  // The step the viewer picked; until then the planner opens where the round stands
  const [step, setStep] = useState<StepId | null>(null);
  // The players whose every opponent the list shows; none shows every pair inside the range
  const [focusIds, setFocusIds] = useState<number[]>([]);
  const [changing, setChanging] = useState<Row | null>(null);
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

  // Every match a player holds this round: published, in the draft, or in the viewer's selection. While a
  // series is replaced, it and the draft that replaces it are no match its players hold
  const replacedId = replacing ? Number(replacing.id) : null;
  const matches = matchesOf({
    published: replacedId == null ? published : published.filter((row) => Number(row.id) !== replacedId),
    drafts: replacedId == null ? drafts : drafts.filter((row) => Number(row.replaces_series_id) !== replacedId),
    selection,
  });
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
  // the players who play, highest MMR first, so an unsorted list runs in roster order
  const playing = (teamId: number) =>
    players.filter((player: Row) => player.team_id === teamId && included(player)).sort((x: Row, y: Row) => (y.mmr ?? -1) - (x.mmr ?? -1));
  const side1 = playing(team1Id);
  const side2 = playing(team2Id);
  const free1 = side1.filter((player: Row) => !busyIds.has(player.user_id));
  const free2 = side2.filter((player: Row) => !busyIds.has(player.user_id));
  const perRound = board?.series_per_round || 0;
  // The round publishes up to its series; the draft holds any number of pairings
  const publishLeft = Math.max(0, perRound - published.length);
  const unplanned = Math.max(0, publishLeft - placeTakers(drafts).length - selection.length);
  const maxPlayed: [number, number] = [team1Id, team2Id].map((teamId) =>
    Math.max(0, ...players.filter((player: Row) => player.team_id === teamId).map((player: Row) => player.played)),
  ) as [number, number];

  // The focus: the own player of a pairing whose opponent changes, or the players the viewer added who play
  const changeFocus = changing
    ? byId.get(ownTeamId != null && Number(changing.player2?.team_id ?? byId.get(changing.player2_id)?.team_id) === Number(ownTeamId) ? changing.player2_id : changing.player1_id) ?? null
    : null;
  const playingIds = new Set([...side1, ...side2].map((player: Row) => player.user_id));
  const chosen = focusIds.filter((id) => playingIds.has(id));
  const focus: Row[] = changeFocus ? [changeFocus] : chosen.map((id) => byId.get(id)!).filter(Boolean);
  const rows = sortMatchups(matchupRows({ side1, side2, team1Id, range: maxDifference, focus, pairOf, at, taken }), order);
  // the top picks follow the viewer's sort, so an unsorted list offers none
  const picks = focus.length || !order.length ? new Set<string>() : topPicks(rows, unplanned, busyIds);
  const inRange = matchupRows({ side1, side2, team1Id, range: maxDifference, pairOf, at, taken }).length;
  const hints = rangeHints(free1, free2, maxDifference);
  const current: StepId = step ?? (drafts.length ? "draft" : "who");

  const go = (next: StepId) => {
    setStep(next);
    document.getElementById("round-planner")?.scrollIntoView({ behavior: "smooth", block: "start" });
  };
  const clearFocus = () => setChanging(null);

  // while a draft pairing changes its opponent, the row's other player is the new one
  const other = (row: Row) => (changeFocus && row.a.user_id === changeFocus.user_id ? row.b : row.a);
  const toggle = (row: Row) => changeSelection(selectItem(selection, { player1_id: row.a.user_id, player2_id: row.b.user_id }));
  const changeTo = async (row: Row) => {
    if (changing && (await onChangeOpponent(changing, other(row).team_id === team1Id ? 1 : 2, other(row).user_id))) clearFocus();
  };
  const selectPicks = () =>
    changeSelection([
      ...selection,
      ...rows.filter((row: Row) => picks.has(row.key) && !isSelected(row)).map((row: Row) => ({ player1_id: row.a.user_id, player2_id: row.b.user_id })),
    ]);

  // The selection moves in one run; a run that failed part-way keeps the rest, and the reads drop what was written
  const moveToDraft = async () => {
    if (!(await onAddPairings(selection.map((one) => ({ player1_id: one.player1_id, player2_id: one.player2_id }))))) return;
    changeSelection([]);
    go("draft");
  };
  const entries: SelectionEntry[] = selection.flatMap((one) => {
    const a = byId.get(one.player1_id);
    const b = byId.get(one.player2_id);
    if (!a || !b) return [];
    return [{ key: pairKey(one.player1_id, one.player2_id), a, b, difference: matchupRow(a, b, { range: maxDifference }).difference }];
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
  const focusTeams = [
    { name: team1?.name ?? "Team 1", players: side1 },
    { name: team2?.name ?? "Team 2", players: side2 },
  ];
  const teams = [
    { team: team1, teamId: team1Id },
    { team: team2, teamId: team2Id },
  ];

  if (!board) {
    return (
      <div className={cn("m-4 flex items-center gap-2 rounded px-3 py-2", toneClass("info"))}>
        <Icon name="mdi-information" />
        The round planner did not load. Refresh the page to try again.
      </div>
    );
  }

  const counts: Record<StepId, React.ReactNode> = {
    who: `${side1.length}·${side2.length}`,
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
  };

  const index = STEPS.findIndex((one) => one.id === current);
  const back = STEPS[index - 1];
  const next = STEPS[index + 1];
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
        <Button onClick={() => go(next.id)}>
          {narrow ? "Next" : `Next: ${next.label}`}
          <Icon name="mdi-chevron-right" />
        </Button>
      ) : null}
    </div>
  );

  const panelView = (
    <PlayerStatsPanel
      target={panel}
      team={panel ? (Number(panel.player.team_id) === Number(team1Id) ? team1 : team2) : null}
      ladder={panel ? ladders[panel.player.user_id] : undefined}
      onClose={() => setPanel(null)}
      onRetry={() => (panel ? readLadder(panel.player.user_id) : undefined)}
      onMeetings={onMeetings}
    />
  );
  const noteOf = (player: Row, row: Row) => matchNote(player, player.user_id === row.a.user_id ? row.b.user_id : row.a.user_id);
  const marked = (row: Row) => otherMatches(row.a, row.b.user_id).length > 0 || otherMatches(row.b, row.a.user_id).length > 0;

  // A replacement is its own search, started from the published series; the steps wait behind it
  if (replacing) {
    return (
      <div id="round-planner" className="flex scroll-mt-16 flex-col gap-3 p-4">
        <ReplaceSeries
          series={replacing}
          proposals={drafts.filter((draft) => Number(draft.replaces_series_id) === Number(replacing.id))}
          team1={team1}
          team2={team2}
          team1Id={team1Id}
          side1={side1}
          side2={side2}
          byId={byId}
          nameOf={nameOf}
          startRange={maxDifference}
          order={order}
          onSort={(key: SortKey) => changeOrder(cycleSort(order, key) as SortOrder)}
          taken={taken}
          pairOf={pairOf}
          at={at}
          maxPlayed={maxPlayed}
          narrow={narrow}
          busy={busy}
          noteOf={noteOf}
          marked={marked}
          onPlayer={(player, opponent, row) => openPlayer(player, opponent, row)}
          loadFreeTime={(row) => loadFreeTime(row.a.user_id, row.b.user_id)}
          onSubmit={async (pairs) => {
            const done = await onReplace(replacing, pairs);
            if (done) setStep("draft");
            return done;
          }}
          onCancel={onCancelReplace}
        />
        {panelView}
      </div>
    );
  }

  return (
    <div id="round-planner" className={cn("flex scroll-mt-16 flex-col gap-3 p-4", narrow && current !== "draft" && "pb-20")}>
      <span className="tnum text-sm text-muted-foreground">
        Round {playday} · {published.length} of {perRound} published · {drafts.length} in draft{selection.length ? ` · ${selection.length} selected` : ""}
      </span>

      <Tabs value={current} onValueChange={(value) => setStep(value as StepId)}>
        <div className="-mx-4 overflow-x-auto border-b px-4 pb-1.5">
          <TabsList variant="line" aria-label="Steps" className="min-w-full justify-start">
            {STEPS.map((one, n) => (
              <TabsTrigger key={one.id} value={one.id} className="flex-none gap-2 px-3">
                <span className={cn("inline-grid size-5 place-items-center rounded-full text-[11px] tnum", one.id === current ? "bg-primary text-on-primary" : "bg-muted text-foreground")}>
                  {n + 1}
                </span>
                {narrow ? one.short : one.label}
                <span className="inline-flex items-center text-xs font-normal text-muted-foreground tnum">{counts[one.id]}</span>
              </TabsTrigger>
            ))}
          </TabsList>
        </div>

        <TabsContent value="who" className="pt-2">
          <StepHead id="who" title="Who plays this round" />
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
          <StepHead id="range" title="MMR range" />
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

        <TabsContent value="matchups" className="pt-2">
          <StepHead id="matchups" title="Pick matchups" />
          <div className="flex flex-col gap-3">
            <SelectionTray entries={entries} busy={busy} onRemove={removeEntry} onClear={() => changeSelection([])} onMove={moveToDraft} onPlayer={openPlayerId} />
            {changing ? (
              <Notice>
                <span className="grow">
                  Pick a new opponent for {changeFocus?.name}. Now: {changeFocus?.user_id === changing.player1_id ? changing.player2?.name : changing.player1?.name}.
                </span>
                <Button variant="outline" size="sm" onClick={clearFocus}>
                  Cancel
                </Button>
              </Notice>
            ) : null}
            {!publishLeft && !changing ? <Notice>Every series of the round is published. Pairings you move wait in the draft.</Notice> : null}
            <div className="flex flex-wrap items-center gap-x-5 gap-y-2">
              <PlayerFocus teams={focusTeams} selected={chosen} disabled={!!changing} onChange={setFocusIds} />
              {picks.size ? (
                <Button variant="outline" size="sm" className="ml-auto" disabled={busy} onClick={selectPicks}>
                  <Icon name="mdi-star" />
                  Select the {picks.size} top pick{picks.size === 1 ? "" : "s"}
                </Button>
              ) : null}
            </div>
          </div>
          <div className="-mx-4 mt-3">
            <MatchupTable
              rows={rows}
              picks={picks}
              order={order}
              onSort={(key: SortKey) => changeOrder(cycleSort(order, key) as SortOrder)}
              team1={team1}
              team2={team2}
              maxPlayed={maxPlayed}
              narrow={narrow}
              busy={busy}
              selected={isSelected}
              onToggle={toggle}
              changeLabel={changing ? (row) => `Change to ${other(row).name}` : null}
              onChange={changeTo}
              onPlayer={(player, opponent, row) => openPlayer(player, opponent, row)}
              noteOf={noteOf}
              marked={marked}
              loadFreeTime={(row) => loadFreeTime(row.a.user_id, row.b.user_id)}
              empty={
                focus.length
                  ? `${focus.map((player) => player.name).join(", ")} ${focus.length === 1 ? "has" : "have"} no opponent left to pair.`
                  : !side1.length || !side2.length
                    ? "Nobody plays on one side."
                    : `No matchup within ${maxDifference} MMR. Raise the range in step 2.`
              }
            />
          </div>
          {nav}
        </TabsContent>

        <TabsContent value="draft" className="pt-2">
          <StepHead id="draft" title="Draft">
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
              setChanging(draft);
              go("matchups");
            }}
            onRemove={onRemoveDraft}
            onRemoveMany={onRemoveDrafts}
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

      {panelView}
    </div>
  );
}

export default RoundPlanner;
