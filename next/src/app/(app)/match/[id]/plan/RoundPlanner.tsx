"use client";
import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardTitle } from "@/components/ui/card";
import { Icon } from "@/components/ui/Icon";
import { toneClass } from "@/components/ui/tone";
import { placeTakers, pairIndex } from "@/helpers/draft-suggest.mjs";
import { DEFAULT_ORDER, matchupRow, matchupRows, plannerPlayers, rangeHints, sortMatchups, switchAnswer, topPicks } from "@/helpers/planner.mjs";
import { cn } from "@/lib/utils";
import { DraftList } from "./DraftList";
import { MatchupTable } from "./MatchupTable";
import { MmrRange } from "./MmrRange";
import { SortChips, type SortOrder } from "./SortChips";
import { WhoPlays } from "./WhoPlays";

/* eslint-disable @typescript-eslint/no-explicit-any */
type Row = Record<string, any>;
type Pair = { player1_id: number; player2_id: number; replaces_series_id?: number };

const ORDER_KEY = "round-planner-sort";

// The viewer's own sort order, kept in the browser; a blocked or empty store reads the default
const readOrder = (): SortOrder => {
  try {
    const saved = JSON.parse(window.localStorage.getItem(ORDER_KEY) || "null");
    if (Array.isArray(saved) && saved.every((one) => DEFAULT_ORDER.some((known) => known.key === one?.key) && (one.dir === 1 || one.dir === -1))) return saved;
  } catch {
    // a private window or blocked site data keeps the default
  }
  return DEFAULT_ORDER as SortOrder;
};

/** One step of the planner: a banner with its number and title, a summary while it is folded, and
 *  its body. */
function Step({
  n,
  title,
  summary,
  open,
  onToggle,
  badges,
  id,
  children,
}: {
  n: number;
  title: string;
  summary?: string;
  open?: boolean;
  onToggle?: () => void;
  badges?: React.ReactNode;
  id?: string;
  children: React.ReactNode;
}) {
  const shown = open ?? true;
  return (
    <Card id={id} className="card gap-0 py-0">
      <CardTitle className="flex flex-wrap items-center gap-3 banner bg-banner px-4 py-3 text-primary">
        <span className="inline-grid size-7 place-items-center rounded-full bg-primary text-sm text-on-primary">{n}</span>
        {title}
        <span className="grow" />
        {!shown && summary ? <span className="text-sm font-normal text-on-banner/80">{summary}</span> : null}
        {badges}
        {onToggle ? (
          <Button variant="outline" size="sm" className="border-on-banner/40 bg-transparent text-on-banner" aria-expanded={shown} onClick={onToggle}>
            {shown ? "Done" : "Change"}
          </Button>
        ) : null}
      </CardTitle>
      {shown ? <div className="p-4">{children}</div> : null}
    </Card>
  );
}

/** The captain's plan for one round of one fixture, in four steps: who plays, the MMR range, the
 *  matchups to pick from, and the draft both captains share and either one publishes. */
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
  onCancelReplace,
  replacedLabel,
  onAnswer,
  onAddPairings,
  onChangeOpponent,
  onSetMaxDifference,
  onToggleFantasy,
  onRemoveDraft,
  onPublishAll,
  onPublishReplace,
  onMeetings,
  loadFreeTime,
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
  replacing: { series: Row; dropId: number } | null;
  onCancelReplace: () => void;
  replacedLabel: (draft: Row) => string | null;
  onAnswer: (teamId: number, playerId: number, available: boolean | null) => Promise<void>;
  onAddPairings: (pairs: Pair[]) => Promise<void>;
  onChangeOpponent: (draft: Row, side: 1 | 2, playerId: number) => Promise<void>;
  onSetMaxDifference: (value: number | null) => Promise<void>;
  onToggleFantasy: (draft: Row) => void;
  onRemoveDraft: (draft: Row) => void;
  onPublishAll: () => void;
  onPublishReplace: (draft: Row) => void;
  onMeetings: (userA: number, userB: number) => Promise<Row[]>;
  loadFreeTime: (player1Id: number, player2Id: number) => Promise<Row>;
}) {
  const [order, setOrder] = useState<SortOrder>(DEFAULT_ORDER as SortOrder);
  const [focusId, setFocusId] = useState<number | null>(null);
  const [changing, setChanging] = useState<Row | null>(null);
  const [whoOpen, setWhoOpen] = useState(!narrow);
  const [rangeOpen, setRangeOpen] = useState(!narrow);
  // A player of a team whose answers the viewer does not read, switched in or out of the viewer's own list
  const [overrides, setOverrides] = useState<Record<number, boolean>>({});

  // the stored order is the browser's, so it is read once the page is in the browser
  useEffect(() => {
    queueMicrotask(() => setOrder(readOrder()));
  }, []);
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

  const included = (player: Row) => (player.answersRead ? player.plays : overrides[player.user_id] ?? player.plays);
  const inPublished = new Set(published.flatMap((row) => [row.player1_id, row.player2_id]));
  const inDraft = new Set(drafts.flatMap((row) => [row.player1_id, row.player2_id]));
  const paired = (id: number) => inPublished.has(id) || inDraft.has(id);
  const pairedAs = (id: number) => (inPublished.has(id) ? "Has a series" : inDraft.has(id) ? "In the draft" : null);
  const free = (teamId: number) => players.filter((player: Row) => player.team_id === teamId && included(player) && !paired(player.user_id));
  const side1 = free(team1Id);
  const side2 = free(team2Id);
  const open = Math.max(0, (board?.series_per_round || 0) - published.length - placeTakers(drafts).length);
  const maxPlayed: [number, number] = [team1Id, team2Id].map((teamId) =>
    Math.max(0, ...players.filter((player: Row) => player.team_id === teamId).map((player: Row) => player.played)),
  ) as [number, number];

  // The focus: the player who stays in a replaced series, the own player of a pairing whose opponent
  // changes, or the player the viewer picked
  const replaceStay = replacing
    ? byId.get(replacing.series.player1_id === replacing.dropId ? replacing.series.player2_id : replacing.series.player1_id) ?? null
    : null;
  const changeFocus = changing
    ? byId.get(ownTeamId != null && Number(changing.player2?.team_id ?? byId.get(changing.player2_id)?.team_id) === Number(ownTeamId) ? changing.player2_id : changing.player1_id) ?? null
    : null;
  const focus = replaceStay ?? changeFocus ?? (focusId != null ? byId.get(focusId) ?? null : null);

  const rows = sortMatchups(matchupRows({ side1, side2, team1Id, range: maxDifference, focus, pairOf, at }), order);
  const picks = focus ? new Set<string>() : topPicks(rows, open);
  const inRange = matchupRows({ side1, side2, team1Id, range: maxDifference, pairOf, at }).length;
  const hints = rangeHints(side1, side2, maxDifference);

  const clearFocus = () => {
    setFocusId(null);
    setChanging(null);
    if (replacing) onCancelReplace();
  };
  const other = (row: Row) => (focus && row.a.user_id === focus.user_id ? row.b : row.a);
  const addLabel = (row: Row) => {
    if (changing) return `Change to ${other(row).name}`;
    if (replacing) return `Replace with ${other(row).name}`;
    if (focus && paired(focus.user_id)) return "Add as a second pairing";
    return "Add";
  };
  const add = async (row: Row) => {
    if (changing) {
      const next = other(row);
      await onChangeOpponent(changing, next.team_id === team1Id ? 1 : 2, next.user_id);
    } else {
      await onAddPairings([{ player1_id: row.a.user_id, player2_id: row.b.user_id, ...(replacing ? { replaces_series_id: replacing.series.id } : {}) }]);
    }
    clearFocus();
  };
  const addPicks = () =>
    onAddPairings(rows.filter((row: Row) => picks.has(row.key)).map((row: Row) => ({ player1_id: row.a.user_id, player2_id: row.b.user_id })));

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

  const filled = published.length + placeTakers(drafts).length;
  const fantasyCount = drafts.filter((draft) => draft.is_fantasy_match).length;
  const plays = (teamId: number) => players.filter((player: Row) => player.team_id === teamId && included(player)).length;
  const withoutTimes = players.filter((player: Row) => included(player) && !player.availability_entered).length;
  const focusChips = [...side1, ...side2];

  if (!board) {
    return (
      <div className={cn("m-4 flex items-center gap-2 rounded px-3 py-2", toneClass("info"))}>
        <Icon name="mdi-information" />
        The round planner did not load. Refresh the page to try again.
      </div>
    );
  }

  let modeText: string | null = null;
  if (changing) modeText = `Pick a new opponent for ${focus?.name}. Now: ${focus?.user_id === changing.player1_id ? changing.player2?.name : changing.player1?.name}.`;
  else if (replacing) {
    const drop = byId.get(replacing.dropId);
    modeText = `Replace ${drop?.name ?? "a player"}: pick who plays ${focus?.name} instead. The old series goes when the replacement is published.`;
  } else if (focus) modeText = `Every free opponent of ${focus.name}, also outside the range.`;

  const draftStep = (
    <Step
      n={4}
      id="round-draft"
      title="Draft"
      badges={
        <>
          <span className="rounded-full border border-on-banner/40 px-2.5 py-0.5 text-xs text-on-banner tnum">
            {filled} of {board.series_per_round} places
          </span>
          <span className="inline-flex items-center gap-1 rounded-full border border-on-banner/40 px-2.5 py-0.5 text-xs text-on-banner">
            <Icon name="mdi-star" size={14} />
            {fantasyCount ? `${fantasyCount} fantasy series` : "No fantasy series yet"}
          </span>
        </>
      }
    >
      <p className="mb-2 text-sm text-muted-foreground">Shared with the other captain of this match.</p>
      <DraftList
        drafts={drafts}
        factsOf={factsOf}
        isFresh={isFresh}
        replacedLabel={replacedLabel}
        outNames={outNames}
        busy={busy}
        canPublish
        onToggleFantasy={onToggleFantasy}
        onChange={(draft) => {
          setFocusId(null);
          setChanging(draft);
          document.getElementById("round-matchups")?.scrollIntoView({ behavior: "smooth" });
        }}
        onRemove={onRemoveDraft}
        onPublishAll={onPublishAll}
        onPublishReplace={onPublishReplace}
      />
    </Step>
  );

  return (
    <div className={cn("flex flex-col gap-4 p-4", narrow && "pb-20")}>
      <div className="tnum font-medium">
        Round {playday} · {published.length} published · {drafts.length} in draft · {open ? `${open} open place${open === 1 ? "" : "s"}` : "no open place"}
      </div>

      <Step
        n={1}
        title="Who Plays This Round"
        open={whoOpen}
        onToggle={() => setWhoOpen((was) => !was)}
        summary={`${team1?.name} ${plays(team1Id)} · ${team2?.name} ${plays(team2Id)} play${withoutTimes ? ` · ${withoutTimes} without availability` : ""}`}
      >
        <WhoPlays
          teams={[
            { team: team1, teamId: team1Id },
            { team: team2, teamId: team2Id },
          ]}
          ownTeamId={ownTeamId}
          players={players}
          included={included}
          pairedAs={pairedAs}
          viewerId={viewerId}
          busy={busy}
          onSwitch={switchPlayer}
        />
      </Step>

      <Step n={2} title="MMR Range" open={rangeOpen} onToggle={() => setRangeOpen((was) => !was)} summary={`Largest difference ${maxDifference}`}>
        <MmrRange
          value={maxDifference}
          stageValue={state?.stage_max_mmr_difference ?? null}
          count={inRange}
          sidesLeft={side1.length > 0 && side2.length > 0}
          hints={hints}
          busy={busy}
          onChange={onSetMaxDifference}
        />
      </Step>

      <Step n={3} id="round-matchups" title="Pick Matchups" badges={<span className="text-sm font-normal text-on-banner/80 tnum">{rows.length} shown</span>}>
        <div className="flex flex-col gap-3">
          {modeText ? (
            <div className={cn("flex flex-wrap items-center gap-2 rounded px-3 py-2", toneClass("info"))}>
              <Icon name="mdi-information" />
              <span className="grow">{modeText}</span>
              <Button variant="outline" size="sm" onClick={clearFocus}>
                {changing || replacing ? "Cancel" : "Show all players"}
              </Button>
            </div>
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
                  disabled={!!changing || !!replacing}
                  onClick={() => setFocusId(focusId === player.user_id ? null : player.user_id)}
                >
                  {player.name}
                </Button>
              ))}
            </div>
          ) : null}
          <SortChips order={order} onChange={changeOrder} />
          {picks.size && open ? (
            <div className="flex flex-wrap items-center gap-3">
              <Button disabled={busy} onClick={addPicks}>
                <Icon name="mdi-plus" />
                Add the {picks.size} top pick{picks.size === 1 ? "" : "s"}
              </Button>
              <span className="text-sm text-muted-foreground">
                The first rows of your sort that share no player, one per open place, marked <Icon name="mdi-star" size={14} className="text-primary-text" />.
              </span>
            </div>
          ) : null}
          {!open && !changing && !replacing ? (
            <div className={cn("flex items-center gap-2 rounded px-3 py-2", toneClass("info"))}>
              <Icon name="mdi-information" />
              Every place of the round has a pairing. Remove one from the draft to add another.
            </div>
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
            addLabel={addLabel}
            addDisabled={!open && !changing && !replacing}
            onAdd={add}
            loadFreeTime={(row) => loadFreeTime(row.a.user_id, row.b.user_id)}
            onMeetings={onMeetings}
            empty={
              focus
                ? `${focus.name} has no free opponent left.`
                : !side1.length || !side2.length
                  ? "Nobody is left to pair on one side."
                  : `No matchup within ${maxDifference} MMR. Raise the range in step 2.`
            }
          />
        </div>
      </Step>

      {draftStep}

      {narrow ? (
        // the phone keeps the draft's count in reach, fixed above the tab bar; the page leaves room under it
        <div role="region" aria-label="Draft" className="fixed inset-x-0 bottom-[calc(3.5rem+env(safe-area-inset-bottom))] z-30 flex items-center gap-3 border-t border-border bg-surface px-4 py-2 shadow-lg">
          <div className="grow text-sm">
            <div className="font-medium">
              Draft · {drafts.length} pairing{drafts.length === 1 ? "" : "s"}
            </div>
            <div className="tnum text-muted-foreground">
              {filled} of {board.series_per_round} places · {fantasyCount ? `${fantasyCount} fantasy` : "no fantasy yet"}
            </div>
          </div>
          <Button variant="outline" size="sm" onClick={() => document.getElementById("round-draft")?.scrollIntoView({ behavior: "smooth" })}>
            View draft
          </Button>
        </div>
      ) : null}
    </div>
  );
}

export default RoundPlanner;
