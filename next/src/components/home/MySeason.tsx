"use client";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Icon } from "@/components/ui/Icon";
import { toneClass } from "@/components/ui/tone";
import { PlayerName } from "@/components/PlayerName";
import { SeriesActionBar } from "@/components/SeriesActionBar";
import { TeamName } from "@/components/TeamName";
import { HomePanel, Quiet, ROW, SkeletonRows } from "@/components/home/HomePanel";
import { homeRounds, ownScore, seasonState } from "@/helpers/home-hub.mjs";
import { cardStatus, checkinOpensLine, roundCards, roundEndLine, roundStateChip } from "@/helpers/rounds.mjs";
import { local } from "@/helpers/schedule.mjs";
import { seasonSlug } from "@/helpers/season-slug.mjs";
import { viewerZone } from "@/helpers/timezone.mjs";
import { cn } from "@/lib/utils";

/* eslint-disable @typescript-eslint/no-explicit-any */
type Row = Record<string, any>;
type Viewer = { id?: number | null; isAdmin?: boolean; seats?: { team_id: number; season_id: number }[] };

const LABEL = "mt-3 block text-xs font-medium tracking-wide text-muted-foreground first:mt-0";

/** The member's side of one series: the team it meets and the player he faces. */
function Opponent({ series, season, teamId, playerId }: { series: Row; season: Row; teamId: number | null; playerId: number | null }) {
  const match = series.match ?? {};
  const opponentTeam = teamId != null && match.team1_id != null ? (match.team1_id === teamId ? match.team2 : match.team1) : null;
  const mine = series.player1_id === playerId;
  const opponent = mine ? series.player2 : series.player1;
  // the race and rating the row names for this series, not the ones the opponent's profile carries
  const race = mine ? series.player2_race : series.player1_race;
  const mmr = (mine ? series.player2_mmr : series.player1_mmr) ?? null;
  return (
    <div className="mt-1.5 flex flex-wrap items-center gap-x-2 gap-y-1">
      <span className="text-sm text-muted-foreground">vs</span>
      {/* the opponent's name opens his player panel, the opponent info a player asks for */}
      {opponent ? <PlayerName player={opponent} race={race ?? undefined} mmr={mmr} /> : <span>To be decided</span>}
      {opponentTeam ? (
        <span className="flex min-w-0 items-center gap-1.5 text-sm text-muted-foreground">
          <span>·</span>
          <TeamName team={opponentTeam} seasonKey={season.id} />
        </span>
      ) : null}
    </div>
  );
}

/** The two answers a round takes, of equal standing; the one held is filled, and pressing it again
 *  clears it. Inert while the answers are read, so a tap never writes over an answer not yet seen. */
function Availability({ card, saving, onAnswer }: { card: Row; saving: boolean; onAnswer: (want: boolean) => void }) {
  const busy = card.pending || saving;
  return (
    <div className="mt-2 flex flex-wrap items-center gap-2">
      <span className="text-sm text-muted-foreground">Can you play?</span>
      <Button
        size="sm"
        variant={card.answer === true ? "default" : "outline"}
        className={card.answer === true ? "bg-success text-on-success" : "text-success"}
        aria-pressed={card.answer === true}
        aria-busy={busy}
        disabled={busy}
        onClick={() => onAnswer(true)}
      >
        {saving ? <Icon name="mdi-loading mdi-spin" /> : <Icon name="mdi-check" />}
        Available
      </Button>
      <Button
        size="sm"
        variant={card.answer === false ? "default" : "outline"}
        className={card.answer === false ? "bg-error text-on-error" : "text-error"}
        aria-pressed={card.answer === false}
        aria-busy={busy}
        disabled={busy}
        onClick={() => onAnswer(false)}
      >
        <Icon name="mdi-close" />
        Out
      </Button>
    </div>
  );
}

/** The current season on Home, round by round: when each round runs, the member's answer for it,
 *  and once he is paired, his opponent and the next step of the series, or its result. */
export function MySeason({
  season,
  entry,
  data,
  playerId,
  viewer,
  loading,
  savingRound,
  order,
  onAnswer,
  onSchedule,
  onReport,
}: {
  season: Row | null; // the current season's event row: its name, its check-in settings, its switches
  entry: Row | null; // the /me seasons row of the current season, or null when the member is not in it
  data: Row | null; // the GET /player-series answer: the rounds, the series and the answers
  playerId: number | null;
  viewer: Viewer;
  loading: boolean;
  savingRound: number | null;
  order: number;
  onAnswer: (playday: number, want: boolean) => void;
  onSchedule: (series: Row) => void;
  onReport: (series: Row) => void;
}) {
  const state = seasonState(entry);
  const asks = season?.scheduling_enabled !== false;
  const zone: string | null = season?.round_end_zone ?? null;
  const cards: Row[] = data
    ? roundCards({
        rounds: data.rounds ?? [],
        series: data.series ?? [],
        answers: data.availability ?? [],
        checkinDays: season?.checkin_days ?? null,
        earlyCheckin: !!season?.early_checkin,
        zone,
      } as any)
    : [];
  const { ahead, played } = homeRounds(cards);
  const standings = season ? <Link href={`/report/${seasonSlug(season)}`} className="text-on-primary underline">Standings</Link> : null;

  const roundRow = (card: Row) => {
    const series: Row | null = card.series;
    const score = series ? ownScore(series, playerId) : null;
    const when = card.over ? null : checkinOpensLine(card) || roundEndLine(card.endsAt, zone, viewerZone());
    const status = cardStatus(card);
    return (
      <div key={card.playday} className={cn(ROW, card.current && "font-medium")}>
        <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
          <span>Round {card.playday}</span>
          <span className="text-sm font-normal text-muted-foreground">{card.label}</span>
          {card.current ? <Badge className={toneClass("info")}>In play</Badge> : null}
        </div>
        {when ? <div className="text-sm font-normal text-muted-foreground">{when}</div> : null}

        {/* the answer: two buttons while the round takes one, else the state it holds */}
        {asks && !card.over && state !== "not_in" ? (
          card.blocked && !card.pending ? (
            <Link href="/availability" className="mt-2 inline-flex text-sm" title="Your blocked times cover this round">
              <Badge className={toneClass(status.color)}>{status.icon ? <Icon name={status.icon} size={12} /> : null}{status.title}</Badge>
            </Link>
          ) : card.takes ? (
            <Availability card={card} saving={savingRound === card.playday} onAnswer={(want) => onAnswer(card.playday, want)} />
          ) : (
            <div className="mt-2 text-sm font-normal text-muted-foreground">{roundStateChip(card, asks)}</div>
          )
        ) : null}

        {series ? (
          <div className="font-normal">
            <Opponent series={series} season={season ?? {}} teamId={entry?.team?.id ?? null} playerId={playerId} />
            {score ? (
              <div className="mt-1 flex flex-wrap items-center gap-2.5">
                {/* the order of the score says who won and the token says it again */}
                <Link
                  href={`/series/${series.id}`}
                  title={score.label}
                  aria-label={score.label}
                  className={cn("tnum font-medium no-underline hover:underline", score.won ? "text-win" : score.lost ? "text-loss" : "text-draw")}
                >
                  {score.text}
                </Link>
                {series.date_time ? <span className="tnum text-sm text-muted-foreground">played {local(series.date_time).toFormat("d LLL")}</span> : null}
              </div>
            ) : (
              <SeriesActionBar className="mt-2" series={series} viewer={viewer} variant="compact" onSchedule={() => onSchedule(series)} onReport={() => onReport(series)} />
            )}
          </div>
        ) : state === "playing" ? (
          <div className="mt-1 text-sm font-normal text-muted-foreground">{card.over ? "Not paired" : "Not paired yet"}</div>
        ) : null}
      </div>
    );
  };

  return (
    <HomePanel icon="mdi-sword-cross" title={season?.name ? `My Season · ${season.name}` : "My Season"} order={order} action={loading ? null : standings}>
      {loading ? (
        <SkeletonRows rows={3} />
      ) : !season ? (
        <p className="text-sm">No season is running. The next one shows here as soon as it opens.</p>
      ) : state === "not_in" ? (
        <>
          <p className="text-sm">You are not signed up for {season.name}.</p>
          {season.signups_open !== false && season.phase === "open" ? (
            <Button className="mt-3" nativeButton={false} render={<Link href={`/signup?season=${seasonSlug(season)}`} />}>
              <Icon name="mdi-account-plus" />
              Sign up for {season.name}
            </Button>
          ) : null}
        </>
      ) : (
        <>
          {state === "waiting" ? <p className="text-sm">You are signed up. The draft places you in a team before round 1.</p> : null}
          {ahead.length ? <span className={LABEL}>Rounds to play</span> : null}
          {ahead.map(roundRow)}
          {played.length ? <span className={LABEL}>Played</span> : null}
          {played.map(roundRow)}
          {!cards.length && state === "playing" ? <p className="text-sm">The rounds of {season.name} are not set yet.</p> : null}
          {asks ? (
            <Quiet>
              Busy on certain days every week? Set your <Link href="/availability">blocked times</Link>.
            </Quiet>
          ) : null}
        </>
      )}
    </HomePanel>
  );
}
