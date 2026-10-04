"use client";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Icon } from "@/components/ui/Icon";
import { toneClass } from "@/components/ui/tone";
import { PlayerName } from "@/components/PlayerName";
import { SeriesActionBar } from "@/components/SeriesActionBar";
import { TeamName } from "@/components/TeamName";
import { HomePanel, ROW, SkeletonRows } from "@/components/home/HomePanel";
import { SitOutRestDialog } from "@/components/player/SitOutRestDialog";
import { seasonAction } from "@/helpers/events.mjs";
import { homeRounds, ownScore, seasonState, teamMatch } from "@/helpers/home-hub.mjs";
import { checkinOpensLine, roundCards, roundEndLine, roundStateChip } from "@/helpers/rounds.mjs";
import { local } from "@/helpers/schedule.mjs";
import { seasonSlug } from "@/helpers/season-slug.mjs";
import { teamLabel } from "@/helpers/teams.mjs";
import { viewerZone, zoneLabel } from "@/helpers/timezone.mjs";
import { cn } from "@/lib/utils";
import { openBlockedTimes } from "@/stores";

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

/** One series of the member on its round: who he meets, the score once it stands, and every step the
 *  series offers, the next one filled and a step taken as its correction, so a mistake is fixed here. */
function SeriesRow({
  series,
  season,
  teamId,
  playerId,
  viewer,
  className,
  onSchedule,
  onReport,
}: {
  series: Row;
  season: Row;
  teamId: number | null;
  playerId: number | null;
  viewer: Viewer;
  className?: string;
  onSchedule: (series: Row) => void;
  onReport: (series: Row) => void;
}) {
  const score = ownScore(series, playerId);
  const opponent: Row | null = series.player1_id === playerId ? series.player2 : series.player1;
  // While the series is to play: who hosts, and the opponent's clock against his own at the booked time
  const notes = score
    ? []
    : [series.host_player_id === playerId ? "You host and ban first" : null, zoneLabel(opponent?.timezone, viewerZone(), series.date_time)].filter(Boolean);
  return (
    <div className={cn("mt-1 font-normal", className)}>
      <Opponent series={series} season={season} teamId={teamId} playerId={playerId} />
      {notes.length ? <div className="mt-0.5 text-xs text-muted-foreground">{notes.join(" · ")}</div> : null}
      {score ? (
        <div className="mt-1 flex flex-wrap items-center gap-2.5">
          {/* the order of the score says who won and the token says it again */}
          <Link
            href={`/series/${series.id}`}
            title={score.label}
            aria-label={score.label}
            className={cn("tnum font-bold no-underline hover:underline", score.won ? "text-win" : score.lost ? "text-loss" : "text-foreground")}
          >
            {score.text}
          </Link>
          {series.date_time ? <span className="tnum text-sm text-muted-foreground">played {local(series.date_time).toFormat("d LLL")}</span> : null}
        </div>
      ) : null}
      {/* the score line names the day it was played, so the bar states the booked time only before it */}
      <SeriesActionBar className="mt-2" series={series} viewer={viewer} variant="all" dateFact={!score} onSchedule={() => onSchedule(series)} onReport={() => onReport(series)} />
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

/** The captain's line on a round: how far the fixture's series are, and the one way into the
 *  match, whatever the round's state. The button names the team the fixture meets. */
function TeamMatch({ fixture, teamId }: { fixture: Row; teamId: number | null }) {
  const row = teamMatch(fixture, teamId);
  if (!row) return null;
  const name = teamLabel(row.opponent);
  return (
    <div className="mt-2 flex items-center gap-2 font-normal">
      <span className="min-w-0 flex-1 text-sm text-muted-foreground">{row.status}</span>
      <Button
        size="sm"
        variant="outline"
        className="min-w-0 max-w-[60%] shrink"
        nativeButton={false}
        aria-label={name ? `Open the match vs ${name}` : "Open the match"}
        render={<Link href={row.to} />}
      >
        {row.opponent ? (
          <>
            <span>vs</span>
            <TeamName team={row.opponent} plain />
          </>
        ) : (
          <>
            <Icon name="mdi-sword-cross" />
            Open match
          </>
        )}
      </Button>
    </div>
  );
}

/** The current season on Home, the player's control panel for it: when each round runs, and either
 *  his series in it (the opponent, the result once it stands, and every step it offers, a step taken
 *  as its correction) or, with none, his answer for it while it takes one. Under the rounds sit his
 *  blocked times and, with early check-in, sitting out the rest. A captain reads his team's match on
 *  every round, with the way into it, and the season. */
export function MySeason({
  season,
  entry,
  data,
  playerId,
  viewer,
  loading,
  savingRound,
  fixtures,
  order,
  undo,
  onAnswer,
  onSitOut,
  onUndo,
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
  fixtures: Row[]; // the captain_matches of the current season: every fixture of the team he captains
  order: number;
  undo: { count: number } | null; // the rounds the last "sit out all" turned out, while it can be taken back
  onAnswer: (playday: number, want: boolean) => void;
  onSitOut: (cards: Row[]) => Promise<void>;
  onUndo: () => void;
  onSchedule: (series: Row) => void;
  onReport: (series: Row) => void;
}) {
  const state = seasonState(entry);
  const asks = season?.scheduling_enabled !== false;
  const zone: string | null = season?.round_end_zone ?? null;
  // The seat he holds in this season names the team he captains; each fixture names both teams
  const seat = viewer.seats?.find((row) => Number(row.season_id) === Number(season?.id)) ?? null;
  const teamId: number | null = seat ? Number(seat.team_id) : null;
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
  const captainTeam: Row | null = fixtures.flatMap((row) => [row.team1, row.team2]).find((team: Row) => Number(team?.id) === teamId) ?? null;
  const fixtureOf = (playday: number) => fixtures.find((row) => Number(row.playday) === Number(playday)) ?? null;
  // a captain reads every match of the season there, and the older seasons through its picker
  const links = season && seat ? <Link href={`/seasons/${seasonSlug(season)}`} className="text-on-banner underline">Season</Link> : null;

  const roundRow = (card: Row) => {
    const list: Row[] = card.seriesList ?? [];
    // a captain who plays on no roster checks into nothing, so his row reads only when the round ends
    const opens = state === "not_in" ? "" : checkinOpensLine(card);
    const when = card.over ? null : opens || roundEndLine(card.endsAt, zone, viewerZone());
    const fixture = fixtureOf(card.playday);
    return (
      <div key={card.playday} className={cn(ROW, card.current && "font-medium")}>
        <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
          <span>Round {card.playday}</span>
          <span className="text-sm font-normal text-muted-foreground">{card.label}</span>
          {card.current ? <Badge className={toneClass("info")}>In play</Badge> : null}
        </div>
        {when ? <div className="text-sm font-normal text-muted-foreground">{when}</div> : null}

        {/* the answer: two buttons while the round takes one, else the state it holds; a round that
            holds his series shows the series instead. Out on his blocked times holds Out, and
            Available answers the round all the same, because a stored answer wins over the blocks. */}
        {asks && !card.over && state !== "not_in" && !list.length ? (
          <>
            {card.takes ? (
              <Availability card={card} saving={savingRound === card.playday} onAnswer={(want) => onAnswer(card.playday, want)} />
            ) : (
              <div className="mt-2 text-sm font-normal text-muted-foreground">{roundStateChip(card, asks)}</div>
            )}
            {card.blocked && !card.pending ? (
              <button type="button" className="mt-1 cursor-pointer text-left text-sm font-normal text-primary-text underline" onClick={openBlockedTimes}>
                Your blocked times cover this round
              </button>
            ) : null}
          </>
        ) : null}

        {/* every series of his in the round; a round with none stays as its bare line, so he sees he had no game there */}
        {list.map((series, index) => (
          <SeriesRow
            key={series.id}
            series={series}
            season={season ?? {}}
            teamId={entry?.team?.id ?? null}
            playerId={playerId}
            viewer={viewer}
            // a second series of the round stands apart from the buttons of the first
            className={index ? "mt-4" : undefined}
            onSchedule={onSchedule}
            onReport={onReport}
          />
        ))}

        {fixture ? <TeamMatch fixture={fixture} teamId={teamId} /> : null}
      </div>
    );
  };

  // The rounds still to play, then the rounds that are over; a season whose rounds were not read
  // still lists its captain's fixtures, one bare row per round
  const roundList = cards.length ? (
    <>
      {ahead.length ? <span className={LABEL}>Rounds to play</span> : null}
      {ahead.map(roundRow)}
      {played.length ? <span className={LABEL}>Past rounds</span> : null}
      {played.map(roundRow)}
    </>
  ) : (
    fixtures.map((row) => (
      <div key={row.match_id} className={ROW}>
        <span>Round {row.playday}</span>
        <TeamMatch fixture={row} teamId={teamId} />
      </div>
    ))
  );

  return (
    <HomePanel id="my-season" icon="mdi-sword-cross" title={season?.name ? `My Season · ${season.name}` : "My Season"} order={order} action={loading ? null : links}>
      {loading ? (
        <SkeletonRows rows={3} />
      ) : !season ? (
        <p className="text-sm">No season is running. The next one shows here as soon as it opens.</p>
      ) : season.phase === "complete" ? (
        // /me lists no complete season, so a finished one says only that it is over
        <p className="text-sm">{season.name} is over. The next season shows here as soon as it opens.</p>
      ) : state === "not_in" ? (
        <>
          {/* the sign-up button lives in the Open signups panel; this line only says where the member stands */}
          <p className="text-sm">
            {seasonAction(season) === "signup"
              ? `You are not signed up for ${season.name} yet. Sign up in the Open signups panel.`
              : `You are not signed up for ${season.name}.`}
          </p>
          {/* a captain who plays on no roster still reads his team's match on every round */}
          {fixtures.length ? (
            <>
              <p className="mt-2 flex flex-wrap items-center gap-x-2 gap-y-1 text-sm">
                <span>You captain</span>
                {captainTeam ? <TeamName team={captainTeam} seasonKey={season.id} /> : <span>your team</span>}
              </p>
              {roundList}
            </>
          ) : null}
        </>
      ) : (
        <>
          {state === "waiting" ? <p className="text-sm">You are signed up. The draft places you in a team before round 1.</p> : null}
          {roundList}
          {!cards.length && !fixtures.length && state === "playing" ? <p className="text-sm">The rounds of {season.name} are not set yet.</p> : null}
          {asks ? (
            <div className="mt-3 flex flex-wrap items-center gap-2">
              {/* the hours he cannot play, once for the whole season; they answer every round they cover */}
              <Button variant="outline" size="sm" className="text-primary-text" onClick={openBlockedTimes}>
                <Icon name="mdi-calendar-remove" />
                Blocked times
              </Button>
              {/* the write covers rounds whose own window is still shut, so only early check-in offers it */}
              {season.early_checkin ? <SitOutRestDialog className="" label={season.name} cards={cards} onConfirm={() => onSitOut(cards)} /> : null}
            </div>
          ) : null}
          {/* the way back from the bulk write: every round it changed takes its old answer again */}
          {undo ? (
            <div role="status" className="mt-2 flex items-center gap-2 text-sm">
              <span>
                {undo.count} {undo.count === 1 ? "round" : "rounds"} set to Out
              </span>
              <Button variant="ghost" size="sm" onClick={onUndo}>
                Undo
              </Button>
            </div>
          ) : null}
        </>
      )}
    </HomePanel>
  );
}
