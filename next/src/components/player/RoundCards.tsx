"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Icon } from "@/components/ui/Icon";
import { toneClass } from "@/components/ui/tone";
import { CastChips, type CastSeries } from "@/components/CastChips";
import { PlayerName } from "@/components/PlayerName";
import { TeamName } from "@/components/TeamName";
import { useMatchStore } from "@/stores";
import { formatDateTime } from "@/helpers/datetime";
import { record } from "@/helpers/figures.mjs";
import { cardStatus, checkinOpensLine, roundCards, roundEndLine, roundStateChip } from "@/helpers/rounds.mjs";
import { viewerZone, zoneLabel } from "@/helpers/timezone.mjs";
import { isUnscored } from "@/helpers/season-phase.mjs";
import { cn } from "@/lib/utils";

/* eslint-disable @typescript-eslint/no-explicit-any */
type Row = Record<string, any>;

const CAPTION = "text-xs text-muted-foreground";
const SCORE: Record<string, string> = { win: "text-win border-win", loss: "text-loss border-loss", draw: "text-draw border-draw" };

/** One card per round of a season: the window, the team faced, and the player's
 *  series of that round. The player's own page fills `seriesActions` and `question`
 *  with his actions, a visitor reads the same facts without them. */
export function RoundCards({
  player,
  season,
  rounds = null,
  series = [],
  teamId = null,
  answers = null,
  seriesActions,
  question,
}: {
  player: Row;
  season: Row; // carries the settings, and the rounds when the caller passes none
  rounds?: Row[] | null; // the rounds of GET /player-series, the one read that names the stage
  series?: Row[]; // the player's series of this season
  teamId?: number | null;
  answers?: Row[] | null; // availability, the player's own page only; null while it is read
  seriesActions?: (series: Row) => React.ReactNode;
  question?: (card: Row) => React.ReactNode;
}) {
  const matchStore = useMatchStore();
  const [matches, setMatches] = useState<Row[]>([]);

  // the season's matches name the team the player's team meets each round
  const seasonId: number | undefined = season?.id;
  useEffect(() => {
    let live = true;
    (seasonId ? matchStore.searchMatchesBySeason(seasonId).catch(() => []) : Promise.resolve([])).then((found: Row[]) => live && setMatches(found));
    return () => { live = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [seasonId]);

  // The event's own clock: it decides when a round is over and what the end line reads
  const zone: string | null = season?.round_end_zone ?? null;

  const cards: Row[] = roundCards({
    rounds: rounds ?? season?.rounds ?? [],
    series,
    matches,
    teamId,
    answers,
    checkinDays: season?.checkin_days ?? null,
    earlyCheckin: !!season?.early_checkin,
    zone,
  } as any);

  // The check-in belongs to the player himself, and only while the season runs the scheduling tools
  const asks = !!question && season?.scheduling_enabled !== false;

  // The count follows the rounds whose buttons are live, early check-in included
  const asking = cards.filter((card) => !card.series && card.takes);
  const answered = asking.filter((card) => card.answer !== null).length;
  // The answers are still on their way, so the count would read every round as unanswered
  const pending = cards.some((card) => card.pending);

  // The round's own clock beside the reader's; an event with no zone shows neither
  const endLine = (card: Row) => roundEndLine(card.endsAt, zone, viewerZone());

  // The answer, as one chip; a derived "Out (blocked times)" opens the blocked times that made it
  const stateChip = (card: Row) => {
    const text: string = roundStateChip(card, asks);
    // An answer keeps the colour and icon the captain grid gives it; a pairing state chip stays neutral
    const status = cardStatus(card);
    const mark = text === status.title ? status : { color: null, icon: "" };
    const badge = (
      <Badge className={cn(toneClass(mark.color), asks && card.pending && "invisible")}>
        {mark.icon ? <Icon name={mark.icon} size={12} /> : null}
        {text}
      </Badge>
    );
    return card.blocked && !card.pending
      ? <Link href="/availability" title="Blocked times cover this round">{badge}</Link>
      : badge;
  };

  const mine = (s: Row) => s.player1_id === player.id;
  // the other side of a series; the id is the fallback when the payload carries no player row
  const opponent = (s: Row): Row => (mine(s) ? s.player2 : s.player1) || { name: `Player ${mine(s) ? s.player2_id : s.player1_id}` };
  // the opponent's zone against the reader's, at the series time
  const opponentZone = (s: Row) => zoneLabel(opponent(s).timezone, viewerZone(), s.date_time);
  // the race the opponent played in that series, not the one he signed the season up on
  const opponentRace = (s: Row) => (mine(s) ? s.player2_race : s.player1_race);
  // the rating the row names on that race, not the one the opponent's profile carries
  const opponentMmr = (s: Row) => (mine(s) ? s.player2_mmr : s.player1_mmr);

  // The maps of the series, read from the player's side: game 1 is the season's
  // fixed map, and each side picks the map it takes after a loss
  const maps = (s: Row): string[] => {
    const myPick = mine(s) ? s.player1_pick_map : s.player2_pick_map;
    const theirPick = mine(s) ? s.player2_pick_map : s.player1_pick_map;
    return [
      s.match?.fixed_map && `Game 1: ${s.match.fixed_map.name}`,
      myPick && `Your pick: ${myPick}`,
      theirPick && `${opponent(s).name}'s pick: ${theirPick}`,
    ].filter(Boolean);
  };

  // Scores read from the player's side: his first, the opponent's second
  const myScore = (s: Row) => (mine(s) ? s.player1_score : s.player2_score) || 0;
  const theirScore = (s: Row) => (mine(s) ? s.player2_score : s.player1_score) || 0;
  const scoreColor = (s: Row) => (myScore(s) > theirScore(s) ? "win" : myScore(s) < theirScore(s) ? "loss" : "draw");

  // The rounds in their stages, in round order; a run of rounds of one stage is one group
  const groups = cards.reduce((list: Row[], card: Row) => {
    const last = list[list.length - 1];
    if (last && last.stageId === card.stageId) last.cards.push(card);
    else list.push({ stageId: card.stageId, name: card.stageName, key: `${card.stageId}-${card.playday}`, cards: [card] });
    return list;
  }, []);
  // An event whose rounds all sit in one stage, or in none, names no stage
  const staged = groups.length > 1;

  const cardBox = (card: Row) => (
    <div key={card.playday} className={cn("card min-w-[230px] grow rounded p-3", card.current && "border-primary!")}>
      <div className="text-sm font-medium">{card.label}</div>
      <div className={cn(CAPTION, "flex flex-wrap items-center gap-1")}>
        <span>Round {card.playday}</span>
        {card.opponentTeam ? (
          <>
            <span>· vs</span>
            <TeamName team={card.opponentTeam} />
          </>
        ) : null}
      </div>

      {card.series ? (
        // A series replaces the question: the round is already accounted for
        <>
          <div className="mt-2 flex flex-wrap items-center gap-2">
            <PlayerName player={opponent(card.series)} race={opponentRace(card.series)} mmr={opponentMmr(card.series)} host={card.series.host_player_id === opponent(card.series).id} />
            {!isUnscored(card.series) ? (
              <Badge variant="outline" className={cn("tnum", SCORE[scoreColor(card.series)])}>
                {record(myScore(card.series), theirScore(card.series)) ?? "—"}
              </Badge>
            ) : null}
          </div>
          {/* The host bans first and hosts game one, so the card names that side */}
          {card.series.host_player_id === player.id ? <div className="text-xs text-primary-text">You host and ban first</div> : null}
          {/* The action bar names the booked time for a viewer who acts on it */}
          {!seriesActions ? <div className={CAPTION}>{formatDateTime(card.series.date_time)}</div> : null}
          {opponentZone(card.series) ? <div className={CAPTION}>{opponentZone(card.series)}</div> : null}
          {/* The three maps of the series once the veto has decided them */}
          {maps(card.series).map((line) => (
            <div key={line} className={CAPTION}>{line}</div>
          ))}
          <div className="mt-1">
            <CastChips series={card.series as CastSeries} />
          </div>
          {/* A scored series keeps its actions: the backend takes a second report */}
          {seriesActions?.(card.series)}
        </>
      ) : (
        // the check-in belongs to the player himself; a visitor reads the state
        <div className="mt-2 flex flex-col gap-2">
          <div className="flex flex-wrap items-center gap-2">
            {stateChip(card)}
            {asks && !card.pending && card.setBy && card.setById !== player.id ? (
              <span className={CAPTION}>set by {card.setBy}</span>
            ) : null}
          </div>
          {asks && card.takes ? question?.(card) : null}
          {asks && card.takes && checkinOpensLine(card) ? <div className={CAPTION}>{checkinOpensLine(card)}</div> : null}
        </div>
      )}
      {/* The round closes at midnight in the event's zone, so the reader gets both clocks */}
      {!card.over && endLine(card) ? <div className={cn(CAPTION, "mt-2")}>{endLine(card)}</div> : null}
    </div>
  );

  return (
    <>
      {asks && asking.length ? (
        <Badge className={cn("mb-3", toneClass("primary"), pending && "invisible")}>
          {answered} of {asking.length} answered
        </Badge>
      ) : null}
      {cards.length ? (
        <div className="flex flex-col gap-4">
          {groups.map((group) => (
            <div key={group.key} className="flex flex-col gap-2">
              {staged && group.name ? <h3 className="text-sm font-medium">{group.name}</h3> : null}
              <div className="flex flex-wrap gap-3">{group.cards.map(cardBox)}</div>
            </div>
          ))}
        </div>
      ) : (
        <div className="text-muted-foreground">No rounds yet.</div>
      )}
    </>
  );
}

export default RoundCards;
