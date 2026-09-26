"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Icon } from "@/components/ui/Icon";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { Switch } from "@/components/ui/switch";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { toneClass } from "@/components/ui/tone";
import { ColumnNote } from "@/components/ColumnNote";
import { HistoricalBoard } from "@/components/koth/HistoricalBoard";
import { EventHeader } from "@/components/EventHeader";
import { HIDE_RESULTS, useHideResultsSwitch } from "@/components/hide-results";
import { PlayerName } from "@/components/PlayerName";
import { RaceIcon } from "@/components/RaceIcon";
import { SignupDialog } from "@/components/SignupDialog";
import { StageView } from "@/components/StageView";
import { StatusAlert } from "@/components/StatusAlert";
import { placeIcon, placeMedal, placings } from "@/helpers/awards.mjs";
import { byPlayer, bySeed, bySignup, entrantName, raceRows, rostersByEntrant, signupCount } from "@/helpers/entrants.mjs";
import { FORMATS, SCHEDULING_MODES, SERIES_PER_ENTRANT_PER_ROUND, seriesPerEntrant, seriesPerFixture, stateOf, titleOf } from "@/helpers/event-labels.mjs";
import { actOnEvent, blocksHint, eventActionButton } from "@/helpers/events.mjs";
import { myRaces } from "@/helpers/koth.mjs";
import { raceWrapper } from "@/helpers/races.js";
import { saveReturnUrl } from "@/helpers/return-url.mjs";
import { seasonSlug } from "@/helpers/season-slug.mjs";
import { useAuth, useEventStore, useTeamStore } from "@/stores";
import { cn } from "@/lib/utils";

/* eslint-disable @typescript-eslint/no-explicit-any */
type Row = Record<string, any>;

const phoneCell = "hidden min-[960px]:table-cell";
const raceName = (race: string) => raceWrapper.getRaceObject(race)?.name || race;
const MEDAL_TEXT: Record<string, string> = { "medal-gold": "text-medal-gold", "medal-silver": "text-medal-silver", primary: "text-primary" };
// The helpers are plain JS, so their defaults type the parameters; the seam names the real shapes.
const placesOf = placings as (standings: Row[]) => Record<string, Row>;
const rostersOf = rostersByEntrant as unknown as (entrants: Row[], teams: Row[], eventId: number) => Record<string, Row[]>;
const act_ = actOnEvent as unknown as (action: string, options: Record<string, unknown>) => Promise<string | null>;

/** One event, open to everyone: what it is, how it plays, who is in it, and the one thing the
 *  reader can do about it. An event with no stage is a sign-up list, so it reads its entrants
 *  against the cap in place of the stage table. A GNL season keeps its own pages, so this one
 *  links to them rather than redrawing them. The spoiler switch is the reader's own, kept in
 *  this browser. */
export function EventView({ id }: { id: string }) {
  const router = useRouter();
  const search = useSearchParams();
  const auth = useAuth();
  const store = useEventStore();
  const teamStore = useTeamStore();

  const [archive, setArchive] = useState<Row | null>(null);
  const [event, setEvent] = useState<Row | null>(null);
  const [leagues, setLeagues] = useState<Row[]>([]);
  const [entrants, setEntrants] = useState<Row[]>([]);
  const [rosters, setRosters] = useState<Record<string, Row[]>>({}); // the players each team entrant fields, so a series box names them
  const [row, setRow] = useState<Row | null>(null); // the caller's own row of /me/events; null for a reader who is not logged in
  const [loading, setLoading] = useState(true);
  const [acting, setActing] = useState<string | boolean>(false); // true, or the race on its way out
  const [answering, setAnswering] = useState(false);
  const [stageData, setStageData] = useState<Record<string, Row>>({});
  const [dialog, setDialog] = useState(false);
  // the wizard lands here when the event was written but its divisions were not
  const [error, setError] = useState<string | null>(search.get("divisions") === "unsaved" ? "The event was created, but its divisions were not saved." : null);

  // The switch is per viewer and per browser, not per event, and every stage drawing reads it
  const [hideResults, setHideResults] = useHideResultsSwitch();

  const anonymous = !auth.me;
  // A GNL season signs up on its own page, so it offers no entrant action here
  const keepsEntrants = event?.kind !== "gnl";
  const button = keepsEntrants ? eventActionButton(row?.action) : null;
  const league = leagues.find((one) => one.id === event?.league_id) || null;
  const stages: Row[] = [...(event?.stages || [])].sort((a, b) => a.position - b.position);
  const seedsLocked = stages.some((stage) => stage.seeds_locked_at);
  // An event that plays no stage is a sign-up list: the entrants are the whole page
  const signupOnly = !!event && !stages.length;
  const hint = blocksHint(row);
  const held: string[] = myRaces(entrants, auth.me?.user?.id);
  // The chip counts players: a player on two races holds two rows and is one entrant
  const entered = entrants.length ? byPlayer(entrants).length : event?.entrant_count ?? 0;

  const solo = (item: Row) => !raceRows(item).length;
  const divisionName = (band: Row) => {
    const division = (event?.divisions || []).find((one: Row) => one.id === band.division_id);
    return division ? division.name || `Division ${division.position}` : null;
  };

  // A fixture pairs two team entrants, so a solo event reads no fixture chip
  const fixtureSeries = seriesPerFixture(event);

  // A phone drops the format, the series count and the scheduling columns, so they ride under the name
  const phoneLine = (stage: Row) =>
    [titleOf(FORMATS, stage.format), seriesPerEntrant(stage) ? `${seriesPerEntrant(stage)} series each entrant a round` : null, titleOf(SCHEDULING_MODES, stage.scheduling_mode)]
      .filter(Boolean)
      .join(" · ");

  // Only the stages that hold series are drawn; the table above lists every stage
  const drawn = stages.map((stage) => ({ ...stage, ...(stageData[stage.id] || {}) })).filter((stage) => stage.series?.length);

  // Closing an event freezes the table of its last stage as the places it awards, so a
  // finished event names its champion and every other place off that table.
  const places: Record<string, Row> = stateOf(event) !== "finished" ? {} : placesOf(drawn.at(-1)?.standings || []);

  const logIn = () => {
    saveReturnUrl(window.location.pathname + window.location.search);
    router.push("/login");
  };

  // The entrant list and the caller's own row move together: a signup changes both
  const reload = async (loaded: Row = event as Row) => {
    const [rows, mine] = await Promise.all([
      store.fetchEntrants(loaded.id),
      // the caller's row lives behind a login; a read that fails says so instead of reading as closed
      auth.me
        ? store.myEvents().catch((e: Error) => {
            setError(`Your own entry did not load: ${e.message}`);
            return [];
          })
        : Promise.resolve([]),
    ]);
    const list = (loaded.stages || []).length ? bySeed(rows) : bySignup(rows);
    setEntrants(list);
    setRow(mine.find((one: Row) => one.id === loaded.id) ?? null);
    // only a team event fields rosters, so nothing else pays for the read
    if (loaded.entrant_kind === "team") {
      const teams = await teamStore.fetchTeamsBySeason(loaded.id).catch(() => []);
      setRosters(rostersOf(rows, teams, loaded.id));
    }
  };

  // One action word, one thing to do. The dialog and the draw are this page's own; every
  // other word goes through the shared act.
  const act = async (race: string | null = null) => {
    const action = row?.action;
    if (action === "sign_up") return setDialog(true);
    if (action === "view") return document.getElementById("the-draw")?.scrollIntoView({ behavior: "smooth" });
    setActing(race ?? true);
    setError(await act_(action, { store, eventId: event!.id, row, reload, race, raceName: race ? raceName(race) : race }));
    setActing(false);
  };

  // The caller answers the next round himself; the hint only said what his blocks cover
  const answerBlocked = async () => {
    setAnswering(true);
    try {
      await store.answerRound(row, false);
      await reload();
    } catch (e) {
      setError(`That did not go through: ${(e as Error).message}`);
    } finally {
      setAnswering(false);
    }
  };

  useEffect(() => {
    const load = async () => {
      try {
        const [loaded, leagueRows] = await Promise.all([store.fetchEvent(Number(id)), store.fetchLeagues()]);
        setEvent(loaded);
        setLeagues(leagueRows);
        setArchive(null);
        if (loaded.kind === "koth" && loaded.closed_at) {
          const board = await store.fetchBoard(loaded.id);
          if (board.historical) {
            setArchive(board);
            return;
          }
        }
        await reload(loaded);
        const drawings = await Promise.all(
          [...(loaded.stages || [])].map(async (stage: Row) => {
            // A stage nobody has generated answers nothing, and its drawing stays off the page
            const [rows, table] = await Promise.all([store.fetchStage(loaded.id, stage.id).catch(() => null), store.fetchStandings(loaded.id, stage.id).catch(() => [])]);
            return rows ? ([stage.id, { ...rows, standings: table }] as const) : null;
          }),
        );
        setStageData(Object.fromEntries(drawings.filter(Boolean) as [string, Row][]));
      } catch (e) {
        setError(`The event did not load: ${(e as Error).message}`);
      } finally {
        setLoading(false);
      }
    };
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  if (archive && event) return <><EventHeader event={event} league={league} /><HistoricalBoard board={archive} /></>;

  return (
    <HIDE_RESULTS.Provider value={hideResults}>
      <StatusAlert modelValue={error} onClose={() => setError(null)} />
      {loading ? <Progress value={null} /> : null}

      {event ? (
        <>
          <EventHeader event={event} league={league} />
          {event.description ? <p className="mt-3 max-w-[70ch] whitespace-pre-line">{event.description}</p> : null}

          <div className="mt-4 flex flex-wrap items-center gap-3">
            <Badge className={toneClass(null)}>
              <Icon name="mdi-account-multiple" />
              {`${entered} ${entered === 1 ? "entrant" : "entrants"}`}
            </Badge>
            {fixtureSeries ? (
              <Badge className={toneClass(null)}>
                <Icon name="mdi-sword-cross" />
                {fixtureSeries} series per fixture
              </Badge>
            ) : null}

            {/* The one action the server picked for this caller; a chip once he is checked in */}
            {row?.action === "checked_in" ? (
              <Badge className={toneClass("success")}>
                <Icon name="mdi-check" />
                Checked in
              </Badge>
            ) : button && row?.action === "withdraw" && held.length > 1 ? (
              /* A player on more than one race withdraws one race at a time */
              held.map((race) => (
                <Button key={race} size="sm" variant="outline" className="text-error" disabled={acting === race} onClick={() => act(race)}>
                  <Icon name={acting === race ? "mdi-loading mdi-spin" : button.icon} />
                  Withdraw {raceName(race)}
                </Button>
              ))
            ) : button ? (
              <ActionButton button={button} busy={acting === true} onClick={() => act()} />
            ) : anonymous && event.signups_open && keepsEntrants ? (
              <Button size="sm" onClick={logIn}>
                <Icon name="mdi-login" />
                Log in to sign up
              </Button>
            ) : null}

            {/* An event that takes one entry per race lets a player in on another race beside his own row */}
            {event.multi_entry && event.signups_open && held.length > 0 && held.length < raceWrapper.races.length ? (
              <Button size="sm" variant="outline" className="text-primary-text" onClick={() => setDialog(true)}>
                <Icon name="mdi-account-plus" />
                Enter another race
              </Button>
            ) : null}

            {/* The caller's own blocks cover the next round; the answer is his, the blocks only inform */}
            {hint ? (
              <>
                <Badge className={toneClass("info")}>
                  <Icon name="mdi-calendar-remove" />
                  {hint.title}
                </Badge>
                <Button size="sm" variant="outline" className="text-error" disabled={answering} onClick={answerBlocked}>
                  <Icon name={answering ? "mdi-loading mdi-spin" : "mdi-close"} />
                  {hint.text}
                </Button>
              </>
            ) : null}

            {/* Both targets sit behind a login, so a reader who is not logged in reads neither */}
            {!anonymous ? (
              <Button nativeButton={false} size="sm" variant="outline" className="text-primary-text" render={<Link href={`/events/${event.id}/entrants`} />}>
                <Icon name="mdi-account-multiple" />
                Entrants
              </Button>
            ) : null}
            {!anonymous && event.kind === "gnl" ? (
              <Button nativeButton={false} size="sm" variant="outline" className="text-primary-text" render={<Link href={`/seasons/${seasonSlug(event)}`} />}>
                <Icon name="mdi-trophy-outline" />
                Season page
              </Button>
            ) : null}
          </div>

          {!signupOnly ? (
            <Card className="card mt-4">
              <CardHeader>
                <CardTitle>Stages</CardTitle>
              </CardHeader>
              <CardContent className="px-0">
                <div className="table-scroll overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead style={{ width: "56px" }}>#</TableHead>
                        <TableHead>Stage</TableHead>
                        <TableHead className={phoneCell}>Format</TableHead>
                        <TableHead className="text-right">Best of</TableHead>
                        <TableHead className={cn("text-right", phoneCell)}>
                          <ColumnNote title="Series per entrant" note={SERIES_PER_ENTRANT_PER_ROUND} />
                        </TableHead>
                        <TableHead className={phoneCell}>Scheduling</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {stages.map((stage) => (
                        <TableRow key={stage.position}>
                          <TableCell>{stage.position}</TableCell>
                          <TableCell className="py-3">
                            {stage.name || `Stage ${stage.position}`}
                            <div className="text-xs text-muted-foreground min-[960px]:hidden">{phoneLine(stage)}</div>
                          </TableCell>
                          <TableCell className={phoneCell}>{titleOf(FORMATS, stage.format)}</TableCell>
                          <TableCell className="text-right">{stage.best_of}</TableCell>
                          <TableCell className={cn("text-right", phoneCell)}>{seriesPerEntrant(stage) ?? "—"}</TableCell>
                          <TableCell className={phoneCell}>{titleOf(SCHEDULING_MODES, stage.scheduling_mode)}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
          ) : null}

          {/* Who is in. A seed reads only once a stage locked its order, so it means something.
              A sign-up list counts its entrants against the cap and prints what each one wrote. */}
          <Card className="card mt-4">
            <CardHeader>
              <CardTitle>{signupOnly ? "Sign-ups" : "Entrants"}</CardTitle>
              {signupOnly ? <div className="text-sm text-muted-foreground">{signupCount(event, entrants)}</div> : null}
            </CardHeader>
            <CardContent className="px-0">
              {entrants.length ? (
                <ul className="flex flex-col">
                  {byPlayer(entrants).map((entrant: Row) => (
                    <li key={entrant.id} className={cn("px-4 py-1", entrant.withdrawn_at && "text-muted-foreground")}>
                      <div className="flex items-center gap-3">
                        {seedsLocked ? <span className="tnum min-w-[2ch] text-right text-xs text-muted-foreground">{solo(entrant) ? entrant.seed ?? "—" : ""}</span> : null}
                        {entrant.user ? <PlayerName player={entrant.user} race={solo(entrant) ? entrant.race : undefined} /> : <span>{entrantName(entrant)}</span>}
                        {places[entrant.id] ? (
                          <Badge variant="outline">
                            {placeMedal(places[entrant.id].place) ? (
                              <Icon name={placeIcon(places[entrant.id].place)} size={14} className={MEDAL_TEXT[placeMedal(places[entrant.id].place)]} />
                            ) : null}
                            {places[entrant.id].title}
                          </Badge>
                        ) : null}
                        {entrant.checked_in_at ? (
                          <>
                            <Icon name="mdi-check" className="text-success" title="Checked in" />
                            <span className="sr-only">checked in</span>
                          </>
                        ) : null}
                        {entrant.withdrawn_at ? <span className="text-xs">withdrawn</span> : null}
                      </div>
                      {/* A player on more than one race: one line a race, with its seed and its division */}
                      {raceRows(entrant).map((race: Row) => (
                        <div key={race.id} className={cn("flex items-center gap-2 pl-6 text-sm", race.withdrawn_at && "text-muted-foreground")}>
                          {seedsLocked ? <span className="tnum min-w-[2ch] text-right text-xs text-muted-foreground">{race.seed ?? "—"}</span> : null}
                          <RaceIcon raceIdentifier={race.race} />
                          <span>{raceName(race.race)}</span>
                          {divisionName(race) ? <span className="text-xs text-muted-foreground">{divisionName(race)}</span> : null}
                          {race.withdrawn_at ? <span className="text-xs">withdrawn</span> : null}
                        </div>
                      ))}
                      {entrant.note ? <div className="max-w-[70ch] text-sm whitespace-pre-line text-muted-foreground">{entrant.note}</div> : null}
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="px-4 pb-4 text-muted-foreground">No entrants yet</p>
              )}
            </CardContent>
          </Card>

          {/* The stages read the same drawing the run page shows, with no admin control on it */}
          {drawn.length ? (
            <div id="the-draw" className="mt-6 flex items-center justify-between">
              <h2>The draw</h2>
              <Label className="flex items-center gap-2">
                <Switch checked={hideResults} onCheckedChange={setHideResults} />
                Hide results
              </Label>
            </div>
          ) : null}
          {drawn.map((stage) => (
            <div key={stage.id}>
              <h3 className="mt-4 mb-2 font-bold">{stage.name || `Stage ${stage.position}`}</h3>
              <StageView
                stage={stage}
                series={stage.series}
                rounds={stage.rounds}
                divisions={event.divisions}
                standings={stage.standings}
                rosters={rosters}
                onOpenSeries={(one) => router.push(`/series/${one.id}`)}
              />
            </div>
          ))}

          {dialog ? <SignupDialog event={event} held={held} open onOpenChange={setDialog} onSignedUp={() => reload()} /> : null}
        </>
      ) : null}
    </HIDE_RESULTS.Provider>
  );
}

/** The one button the server picked for this caller. */
function ActionButton({ button, busy, onClick }: { button: Row; busy: boolean; onClick: () => void }) {
  const tint = button.color === "error" ? "text-error" : button.color === "success" ? "text-success" : "text-primary-text";
  const variant = button.variant === "outlined" ? "outline" : "default";
  return (
    <Button size="sm" variant={variant} className={variant === "outline" ? tint : undefined} disabled={busy} onClick={onClick}>
      <Icon name={busy ? "mdi-loading mdi-spin" : button.icon} />
      {button.text}
    </Button>
  );
}

export default EventView;
