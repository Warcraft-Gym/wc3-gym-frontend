"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { DateTime } from "luxon";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Icon } from "@/components/ui/Icon";
import { Separator } from "@/components/ui/separator";
import { TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { toneClass } from "@/components/ui/tone";
import { CastChips, type CastSeries } from "@/components/CastChips";
import { PlayerLadderTab } from "@/components/ladder/PlayerLadderTab";
import { PlayerName } from "@/components/PlayerName";
import { RaceIcon } from "@/components/RaceIcon";
import { RoundStrip } from "@/components/RoundStrip";
import { StatusAlert } from "@/components/StatusAlert";
import { TeamName } from "@/components/TeamName";
import { W3CMmr } from "@/components/W3CMmr";
import { MD_AND_UP, useBreakpoint } from "@/hooks/breakpoint";
import { useLadderStore, usePlayerStore, useSeason, useSeasonStore, useSeriesStore } from "@/stores";
import { raceWrapper } from "@/helpers/races.js";
import { STATE_COLOR as EVENT_STATE_COLOR, STATE_LABEL, timeText } from "@/helpers/event-labels.mjs";
import { eventActionButton } from "@/helpers/events.mjs";
import { foldNight } from "@/helpers/koth.mjs";
import { isUnscored } from "@/helpers/season-phase.mjs";
import { eventRows, openRowId } from "@/helpers/player-events.mjs";
import { currentRound } from "@/helpers/rounds.mjs";
import { cn } from "@/lib/utils";

/* eslint-disable @typescript-eslint/no-explicit-any */
type Row = Record<string, any>;

// The backend's phase, in the words a player uses
const STATE: Record<string, string> = { open: "Scheduled", commenced: "In progress", overdue: "In progress", complete: "Completed" };
const STATE_COLOR: Record<string, string> = { commenced: "info", overdue: "info" };
// The helpers are plain JS, so their defaults type the parameters; the seam names the real shapes.
const eventRows_ = eventRows as (args: Row) => Row[];
const foldNight_ = foldNight as (rows: Row[], night: Row | null, races: string[]) => Row[];
const eventStateColor = EVENT_STATE_COLOR as Record<string, string>;
const stateLabel = STATE_LABEL as Record<string, string>;

// An outlined chip wears its theme token as text and border; a chip with no colour stays neutral
const OUTLINE: Record<string, string> = {
  primary: "text-primary-text border-primary",
  secondary: "text-secondary border-secondary",
  success: "text-success border-success",
  info: "text-info border-info",
  warning: "text-warning border-warning",
  draw: "text-draw border-draw",
};

// the panels' own width, not the window's: the side panel is narrow on a wide screen
const FACT = "whitespace-nowrap @max-[960px]:flex @max-[960px]:items-center @max-[960px]:gap-1.5";
const CAPTION = "block text-xs text-muted-foreground";

const raceName = (code?: string | null) => (code ? raceWrapper.getRaceObject(code)?.name ?? code : "—");
const day = (iso: string) => DateTime.fromISO(iso).toFormat("LLL d");
const dates = (season: Row) => {
  if (season.starts_at) return timeText(season.starts_at); // a KOTH night is one evening, not a span
  if (!season.start_date) return "";
  const span = `${day(season.start_date)} – ${season.end_date ? day(season.end_date) : "…"}`;
  const rounds = season.round_count;
  if (!rounds) return span;
  if (season.phase === "complete") return `${span} · ${rounds} rounds`;
  if (season.phase === "open") return span;
  // The round windows say which round is in play; a round is not a week long
  const now: Row | null = currentRound(season.rounds ?? []);
  return now ? `${span} · round ${now.playday} of ${rounds}` : `${span} · ${rounds} rounds`;
};

const byRound = (series: Row[]) =>
  [...series].sort((a, b) => (a.match?.playday ?? 0) - (b.match?.playday ?? 0) || (a.date_time ?? "").localeCompare(b.date_time ?? ""));
const scored = (series: Row) => !isUnscored(series);
const playedOn = (series: Row) => (series.date_time ? DateTime.fromISO(series.date_time).toLocal().toFormat("LLL d") : "—");
const mmrDelta = (row: Row) => {
  const mmr = row.ladder?.mmr;
  return mmr?.current != null && mmr?.start != null ? mmr.current - mmr.start : 0;
};
// The one action word the member read picked for the night; checked in and closed offer none
const nightAction = (row: Row): Row | null => eventActionButton(row.night?.action);

/** One row per event the player took part in, of any kind, newest first. The row
 *  carries the event's kind, its dates and the placing or the state, and for a GNL
 *  season his team, race, series record, round strip, ladder record and MMR; it
 *  opens into his series by round and the ladder tab. A cup opens on its placing,
 *  the series still to play and its event page. The event named by `open` draws
 *  `current` instead of the series table. On the owner's own page tonight's KOTH
 *  night joins the list, crowned, with the races he entered on and its one action. */
export function PlayerSeasons({
  player,
  open,
  night = null,
  nightRaces = [],
  current,
}: {
  player: Row;
  open?: number; // the event expanded at first, whose body `current` draws
  night?: Row | null; // tonight's KOTH night, the GET /me/events row; null off the owner's page
  nightRaces?: string[]; // the races he entered that night on
  current?: (row: Row) => React.ReactNode;
}) {
  const mdAndUp = useBreakpoint(MD_AND_UP);
  const ladderStore = useLadderStore();
  const playerStore = usePlayerStore();
  const seasonStore = useSeasonStore();
  const seriesStore = useSeriesStore();
  const { seasons } = useSeason();

  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [history, setHistory] = useState<Row>({});
  const [seriesByEvent, setSeriesByEvent] = useState<Row>({});
  const [ladderByEvent, setLadderByEvent] = useState<Row>({});
  // Another player starts from an empty list, so no row of the last one reads as his
  const [shown, setShown] = useState(player);
  if (shown !== player) {
    setShown(player);
    setErrorMessage(null);
    setHistory({});
    setSeriesByEvent({});
    setLadderByEvent({});
  }

  // The history read names every event of every kind the player stood in; the season
  // list adds the dates and the phase, the per-event reads the series and the ladder
  const rows = foldNight_(eventRows_({ history, player, seasons: seasons ?? [], seriesByEvent, ladderByEvent }), night, nightRaces);

  const mine = (series: Row) => series.player1_id === player.id;
  const opponent = (series: Row) => (mine(series) ? series.player2 : series.player1) ?? { name: "—" };
  // the race the opponent played in that series, not the one he signed the season up on
  const opponentRace = (series: Row) => (mine(series) ? series.player2_race : series.player1_race);
  const opponentTeam = (series: Row, row: Row) => {
    const match = series.match;
    if (!match) return "";
    return (match.team1_id === row.teamId ? match.team2 : match.team1)?.name ?? "";
  };
  const scores = (series: Row) => (mine(series) ? [series.player1_score, series.player2_score] : [series.player2_score, series.player1_score]);
  const result = (series: Row) => {
    if (!scored(series)) return series.date_time ? "scheduled" : "unscheduled";
    const [me, them] = scores(series);
    return `${me} – ${them}`;
  };
  const resultClass = (series: Row) => {
    if (!scored(series)) return "font-normal text-muted-foreground";
    const [me, them] = scores(series);
    return me > them ? "text-win" : me < them ? "text-loss" : "";
  };

  // With no event named, the running GNL season opens onto its rounds
  const openId = open ?? openRowId(rows);
  // A night he has not entered opens first, because its action is the reason it is here;
  // otherwise a reader wants the event with ladder facts in it, rarely the one just opened
  const defaultOpen: number | null = (night && !night.joined ? night.id : null) ?? open ?? rows.find((row) => row.ladder?.games)?.id ?? openId;
  // it follows the ladder reads as they land, until the reader opens an event himself
  const [opened, setOpened] = useState<number | null>(open ?? null);
  const [followed, setFollowed] = useState<number | null>(null);
  if (defaultOpen !== followed) {
    setFollowed(defaultOpen);
    if (opened == null || opened === followed) setOpened(defaultOpen);
  }

  // One history read for the whole accordion, the season list once, then one series
  // read and one ladder read per event, for the row's own facts
  useEffect(() => {
    let live = true;
    (async () => {
      try {
        if (!seasonStore.seasons?.length) await seasonStore.fetchSeasons();
        const read: Row = await playerStore.playerHistory(player.id);
        if (!live) return;
        setHistory(read);
        await Promise.all((read.events ?? []).map(async (event: Row) => {
          const id = event.season_id;
          // the ladder record is a GNL season's: the read has nothing to say about a cup
          const [series, ladder] = await Promise.all([
            seriesStore.playerSeries(id, player.id).catch(() => []),
            (event.kind ?? "gnl") === "gnl" ? ladderStore.userLadder(player.id, { seasonId: id }).catch(() => null) : null,
          ]);
          if (!live) return;
          setSeriesByEvent((was) => ({ ...was, [id]: series }));
          setLadderByEvent((was) => ({ ...was, [id]: ladder }));
        }));
      } catch (error) {
        if (live) setErrorMessage((error as Error).message);
      }
    })();
    return () => { live = false; };
    // the store's members are rebuilt every render, so the player drives the read
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [player]);

  return (
    <>
      <StatusAlert modelValue={errorMessage} onClose={() => setErrorMessage(null)} />
      {rows.length ? (
        <Accordion className="@container" value={opened == null ? [] : [opened]} onValueChange={(value) => setOpened(value[0] ?? null)}>
          {rows.map((row) => {
            const action = nightAction(row);
            const delta = mmrDelta(row);
            return (
              <AccordionItem key={row.id} value={row.id}>
                <AccordionTrigger className="items-center gap-2 px-4 text-base font-normal hover:no-underline">
                  <span className="grid w-full grid-cols-[minmax(200px,1.4fr)_1fr_1fr_1.2fr_1.1fr_1.1fr] items-center gap-4 @max-[960px]:flex @max-[960px]:flex-wrap @max-[960px]:gap-x-3.5 @max-[960px]:gap-y-1">
                    <span className="@max-[960px]:w-full">
                      <span className="flex flex-wrap items-center gap-2 text-xl font-medium">
                        {row.label}
                        <Badge variant="outline">{row.kindLabel}</Badge>
                        {row.night ? (
                          <Badge variant="outline" className={OUTLINE[eventStateColor[row.night.phase]]}>
                            <Icon name="mdi-crown" size={12} className="text-primary-text" />
                            {stateLabel[row.night.phase] ?? row.night.phase}
                          </Badge>
                        ) : row.champion ? (
                          <Badge variant="outline">
                            <Icon name="mdi-crown" size={12} className="text-primary-text" />
                            Champion
                          </Badge>
                        ) : row.placing && !row.running ? (
                          <Badge variant="outline">
                            <Icon name="mdi-podium" size={12} />
                            {row.placing}
                          </Badge>
                        ) : (
                          <Badge variant="outline" className={OUTLINE[STATE_COLOR[row.season.phase]]}>
                            <Icon name="mdi-circle" size={12} />
                            {STATE[row.season.phase] ?? row.season.phase ?? "—"}
                          </Badge>
                        )}
                      </span>
                      <span className={CAPTION}>{dates(row.season)}</span>
                    </span>
                    {row.team ? (
                      <span className={FACT}>
                        <span className={CAPTION}>Team</span>
                        {/* inside the accordion button, so the line is plain text */}
                        <TeamName team={{ id: row.teamId, name: row.team, icon_url: row.teamIcon }} plain />
                      </span>
                    ) : null}
                    {row.race ? (
                      <span className={FACT}>
                        <span className={CAPTION}>Race</span>
                        <span className="flex items-center gap-1">
                          <RaceIcon raceIdentifier={row.race} />
                          {raceName(row.race)}
                        </span>
                      </span>
                    ) : null}
                    <span className={FACT}>
                      <span className={CAPTION}>Series</span>
                      <span className="flex items-center gap-2">
                        <span className="tnum">
                          <span className="text-win">{row.wins}</span> – <span className="text-loss">{row.losses}</span>
                        </span>
                        {row.season.round_count ? <RoundStrip series={row.series} playerId={player.id} rounds={row.season.round_count} /> : null}
                      </span>
                    </span>
                    {row.ladder ? (
                      <>
                        <span className={FACT}>
                          <span className={CAPTION}>Ladder</span>
                          <span className="tnum">
                            {row.ladder.points} pts <span className="text-muted-foreground">· {row.ladder.wins} – {row.ladder.losses}</span>
                          </span>
                        </span>
                        <span className={FACT}>
                          <span className={CAPTION}><W3CMmr /></span>
                          {row.ladder.mmr?.current != null ? (
                            <span className="tnum">
                              {row.ladder.mmr.current}
                              {delta > 0 ? <span className="text-win"> ▲ {delta}</span> : delta < 0 ? <span className="text-loss"> ▼ {-delta}</span> : null}
                            </span>
                          ) : (
                            <span className="text-muted-foreground">no games yet</span>
                          )}
                        </span>
                      </>
                    ) : null}
                  </span>
                </AccordionTrigger>
                <AccordionContent className="px-4 text-base [&_a]:no-underline">
                  {/* Tonight's night: what he entered on, and the one thing left to do about it */}
                  {row.night ? (
                    <section className="flex flex-wrap items-center gap-2 pb-4">
                      {row.races.length ? (
                        <>
                          <Badge className={toneClass("success")}>
                            <Icon name="mdi-check" />
                            Signed up
                          </Badge>
                          {row.races.map((race: string) => <RaceIcon key={race} raceIdentifier={race} />)}
                        </>
                      ) : null}
                      {action ? (
                        <Button
                          size="sm"
                          variant={action.variant === "outlined" ? "outline" : "default"}
                          className={action.variant === "outlined" ? (action.color === "error" ? "text-error" : "text-primary-text") : undefined}
                          nativeButton={false}
                          render={<Link href="/koth/dashboard" />}
                        >
                          <Icon name={action.icon} />
                          {action.text}
                        </Button>
                      ) : null}
                    </section>
                  ) : null}
                  {row.kind === "gnl" && row.id === openId && current ? (
                    current(row)
                  ) : row.kind === "gnl" ? (
                    <>
                      <section className="pb-4">
                        <h4 className="mb-2 text-base font-medium">
                          Series by round <span className="text-xs font-normal text-muted-foreground">{row.wins} – {row.losses}</span>
                        </h4>
                        <div className="table-scroll overflow-x-auto">
                          <table className="w-full caption-bottom text-sm">
                            <TableHeader>
                              <TableRow>
                                <TableHead>Round</TableHead>
                                <TableHead>Opponent</TableHead>
                                {mdAndUp ? <TableHead>Team</TableHead> : null}
                                <TableHead className="text-right">Result</TableHead>
                                {mdAndUp ? <TableHead className="text-right">Played</TableHead> : null}
                                {mdAndUp ? <TableHead /> : null}
                              </TableRow>
                            </TableHeader>
                            <TableBody>
                              {byRound(row.series).map((series) => (
                                <TableRow key={series.id}>
                                  <TableCell>{series.match?.playday ?? "—"}</TableCell>
                                  <TableCell>
                                    <PlayerName player={opponent(series)} race={opponentRace(series)} />
                                    {!mdAndUp ? <span className="ml-1 text-muted-foreground">{opponentTeam(series, row)}</span> : null}
                                  </TableCell>
                                  {mdAndUp ? <TableCell>{opponentTeam(series, row)}</TableCell> : null}
                                  <TableCell className={cn("text-right font-medium", resultClass(series))}>{result(series)}</TableCell>
                                  {mdAndUp ? <TableCell className="text-right">{playedOn(series)}</TableCell> : null}
                                  {mdAndUp ? (
                                    <TableCell className="text-muted-foreground">
                                      <div className="flex items-center gap-2">
                                        {series.host_player_id === player.id ? <span>host</span> : null}
                                        <CastChips series={series as CastSeries} />
                                      </div>
                                    </TableCell>
                                  ) : null}
                                </TableRow>
                              ))}
                              {!row.series.length ? (
                                <TableRow>
                                  <TableCell colSpan={6} className="text-muted-foreground">No series yet.</TableCell>
                                </TableRow>
                              ) : null}
                            </TableBody>
                          </table>
                        </div>
                      </section>
                      {row.ladder ? (
                        <>
                          <Separator className="mb-4" />
                          <PlayerLadderTab player={player} seasonId={row.id} />
                        </>
                      ) : null}
                    </>
                  ) : !row.night || row.series.length ? (
                    <section className="pb-4">
                      <div>{row.placing ? `Finished ${row.placing}` : "No placing yet"} · won {row.wins}, lost {row.losses}</div>
                      {row.next ? (
                        <div className="mt-2">
                          Next series{" "}
                          <Link className="text-primary-text" href={`/series/${row.next.id}`}>
                            vs {opponent(row.next).name}{row.next.date_time ? ` on ${playedOn(row.next)}` : ""}
                          </Link>
                        </div>
                      ) : (
                        <div className="mt-2 text-muted-foreground">No series to play.</div>
                      )}
                      <Button className="mt-3" variant="outline" size="sm" nativeButton={false} render={<Link href={`/events/${row.id}`} />}>
                        <Icon name="mdi-tournament" />
                        Event page
                      </Button>
                    </section>
                  ) : null}
                </AccordionContent>
              </AccordionItem>
            );
          })}
        </Accordion>
      ) : (
        <div className="p-4 text-muted-foreground">No events yet.</div>
      )}
    </>
  );
}

export default PlayerSeasons;
