"use client";
import { useEffect, useRef, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Field } from "@/components/ui/Field";
import { Icon } from "@/components/ui/Icon";
import { Progress } from "@/components/ui/progress";
import { multiSelectTrigger, Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { toneClass } from "@/components/ui/tone";
import { CastChips, type CastSeries } from "@/components/CastChips";
import { FixtureSeries } from "@/components/FixtureSeries";
import { HeadToHeadCell } from "@/components/HeadToHeadCell";
import { PageHeader } from "@/components/PageHeader";
import { PlayerName } from "@/components/PlayerName";
import { ScheduleDialog, type ScheduleDialogHandle } from "@/components/player/ScheduleDialog";
import { ReportResultDialog, SIDE_BUTTON, type ReportResultDialogHandle } from "@/components/ReportResultDialog";
import { SeriesActionBar } from "@/components/SeriesActionBar";
import { SeriesBox } from "@/components/SeriesBox";
import { StatusAlert } from "@/components/StatusAlert";
import { backendUrl, fetchWrapper } from "@/helpers";
import { moveMessage, moveTargets, replaysNeeded } from "@/helpers/best-of.mjs";
import { formatDateTime } from "@/helpers/datetime";
import { eventLabel, MAP_RULES, titleOf } from "@/helpers/event-labels.mjs";
import { record } from "@/helpers/figures.mjs";
import { fixtureRosters, modeLabel, pickLabel, rosterSides as sidesFor, sideRoster } from "@/helpers/fixture.mjs";
import { meetingRecord } from "@/helpers/head-to-head.mjs";
import { fixedMapOf, rulesOf } from "@/helpers/map-order.mjs";
import { seriesContext, seriesMapLine, seriesSteps } from "@/helpers/series-actions.mjs";
import { isScored, sideName as nameOfSide } from "@/helpers/stage-view.mjs";
import { useAuth, useEventStore, useMapStore, useMatchStore, useSeriesStore, useTeamStore } from "@/stores";

/* eslint-disable @typescript-eslint/no-explicit-any */
type Row = Record<string, any>;

const phoneOnly = "min-[600px]:hidden";
const wideOnly = "hidden min-[600px]:table-cell";
// The helper is plain JS, so its defaults type the parameters; the seam names the real shapes.
const sidesOf = sidesFor as unknown as (row: Row | null, rosters: Record<string, Row[]>, userId?: number | null, admin?: boolean) => number[];
const rostersOf = fixtureRosters as unknown as (series: Row[], teams: Row[], eventId: number) => Record<string, Row[]>;

/** One series, whatever event it belongs to: the event it is played in, the two sides
 *  and the score, the rule and the map of every game, who casts it, and for a side or
 *  an admin the report action. A bracket box and the fixture page both open it. */
export function SeriesView({ id }: { id: string }) {
  const auth = useAuth();
  const eventStore = useEventStore();
  const mapStore = useMapStore();
  const matchStore = useMatchStore();
  const seriesStore = useSeriesStore();
  const teamStore = useTeamStore();

  const [series, setSeries] = useState<Row | null>(null);
  const [games, setGames] = useState<Row[]>([]);
  const [maps, setMaps] = useState<Row[]>([]);
  const [fixture, setFixture] = useState<Row[]>([]); // every series the fixture holds, in play order
  const [rounds, setRounds] = useState<Row[]>([]); // the event's rounds, which carry the fixed map of each round
  const [rosters, setRosters] = useState<Record<string, Row[]>>({}); // the roster each team entrant fields for the event, by entrant id
  const [rosterOpen, setRosterOpen] = useState(false);
  const [rosterSide, setRosterSide] = useState(1);
  const [picked, setPicked] = useState<number[]>([]);
  const [rosterError, setRosterError] = useState<string | null>(null);
  const [savingRoster, setSavingRoster] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [replays, setReplays] = useState<Row[]>([]); // the uploaded replay of each game of this series
  const [moving, setMoving] = useState<number | null>(null); // the game whose replay is on the move
  const [moved, setMoved] = useState<string | null>(null);
  const [meetings, setMeetings] = useState<Row[]>([]); // every series the two players played, newest first
  const reportDialog = useRef<ReportResultDialogHandle>(null);
  const scheduleDialog = useRef<ScheduleDialogHandle>(null);
  const [awardOpen, setAwardOpen] = useState(false);
  const [awardSide, setAwardSide] = useState<number | null>(null);
  const [awardError, setAwardError] = useState<string | null>(null);
  const [awarding, setAwarding] = useState(false);

  // The event of a series inside a fixture is its season; a bracket series names none yet
  const event: Row | null = series?.match?.season || null;
  const title = event ? eventLabel(event) : "Series";
  const scored = isScored(series);

  // One rule per game, so their count is the best-of
  const rules: string[] = rulesOf(series?.rules?.map_rules);
  const bestOfLine = `Best of ${series?.rules?.best_of || rules.length}`;

  // The stage row of this series carries what it plays and who fields it; GET /series/{id}
  // answers neither, so a series inside a fixture reads them off the fixture.
  const stageRow = fixture.find((row) => row.id === series?.id) || null;
  const box = stageRow || series;
  const mode = modeLabel(stageRow?.side_size);
  const pick = pickLabel(stageRow?.pick_rule);
  const sideSize: number = stageRow?.side_size || 1;
  const teamName = (side: number) => stageRow?.[`team${side}`]?.name || `side ${side}`;
  const sideName = (side: number) => nameOfSide(box, side) || `Side ${side}`;

  // A captain names his own side, an admin either; a side already named is changed, not written
  const rosterSides = sidesOf(stageRow, rosters, auth.me?.user?.id, auth.isAdmin);
  const rosterVerb = (side: number) => (sideRoster(stageRow, side).length ? "Change" : "Name");
  const rosterItems: Row[] = (rosters[stageRow?.[`entrant${rosterSide}_id`]] || []).map((seat) => ({ id: seat.player.id, name: seat.player.name, player: seat.player, race: seat.race }));

  const openRoster = (side: number) => {
    setRosterSide(side);
    setRosterError(null);
    setPicked(sideRoster(stageRow, side).map((player: Row) => player.id));
    setRosterOpen(true);
  };

  const mapName = (mapId?: number | null) => maps.find((row) => row.id === mapId)?.name;

  // The map a fixed game plays: the map of its round, else the map an import wrote on the fixture
  const fixedMapId: number | null = fixedMapOf(series?.rules?.map_rules, rounds.find((row) => row.playday === series?.match?.playday)) ?? series?.match?.fixed_map_id ?? null;

  // One row per game of the best-of: its rule, the map it was played on or the one the
  // rule offers, and the side that won it
  const gameRows = rules.map((rule, index) => {
    const game = games.find((row) => row.game_no === index + 1);
    return {
      game_no: index + 1,
      rule: titleOf(MAP_RULES, rule),
      // a fixed game names its map before it is played; every other rule waits for the veto or the result
      map: mapName(game?.map_id ?? game?.offered_map_id ?? (rule === "fixed" ? fixedMapId : null)) || null,
      winner: game?.winner_side ? sideName(game.winner_side === "A" ? 1 : 2) : null,
    };
  });

  // The three facts under the title: the booked time, the next map, the head to head; a scored series plays no next game
  const mapLine = scored ? null : seriesMapLine(series?.rules?.map_rules, gameRows);
  const met = meetingRecord(meetings);
  const headToHead = record(met.wins, met.losses);

  // The stage row names the team entrants and the team behind each side, which the series
  // read does not carry, so the action bar gates on the two together
  const viewer = { id: auth.me?.user?.id ?? null, isAdmin: auth.isAdmin, seats: auth.me?.seats ?? [] };
  const actionRow = series
    ? {
        ...series,
        entrant1_id: stageRow?.entrant1_id ?? null,
        entrant2_id: stageRow?.entrant2_id ?? null,
        team1: stageRow?.team1 ?? null,
        team2: stageRow?.team2 ?? null,
      }
    : null;
  const canReport = seriesSteps(actionRow, viewer).mayAct;

  // A replay moves inside the games the series played, so an unreported series moves none
  const playedGames = scored ? replaysNeeded(series?.player1_score || 0, series?.player2_score || 0) : 0;
  const hasReplay = (game: number) => replays.some((row) => row.game_no === game);
  const canMove = playedGames > 1 && canReport;

  // Only a viewer who may move a replay reads the fixture's replay list
  const loadReplays = async (matchId: number, seriesId: number) => {
    const rows: Row[] = await matchStore.getMatchReplays(matchId).catch(() => []);
    setReplays((rows || []).filter((row: Row) => row.series_id === seriesId));
  };

  // Move one game's replay to another game; the answer is every replay of the series
  const moveReplay = async (from: number, to: number) => {
    setMoving(from);
    setError(null);
    setMoved(null);
    try {
      const rows: Row[] = await matchStore.moveSeriesReplay(series!.id, from, to);
      setReplays(rows || []);
      // the answer tells the swap: after a plain move the game the file came from holds nothing
      setMoved(moveMessage(from, to, (rows || []).some((row) => row.game_no === from)));
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setMoving(null);
    }
  };

  // The fixture this series plays, once the event runs it through the events module: its
  // ordered series with their mode, their pick rule and the roster each side fields.
  const loadFixture = async (loaded: Row) => {
    const eventId = loaded.match?.season_id ?? loaded.match?.season?.id;
    if (!loaded.match_id || !eventId) return;
    const answer = await eventStore.fetchFixture(eventId, loaded.match_id).catch(() => null);
    // the same read answers the event, whose rounds name the fixed map of this round
    setRounds(answer?.event?.rounds || []);
    if (!answer?.series?.length) return;
    setFixture(answer.series);
    const teams = await teamStore.fetchTeamsBySeason(eventId).catch(() => []);
    setRosters(rostersOf(answer.series, teams, eventId));
  };

  const load = async () => {
    try {
      const loaded = await fetchWrapper.get(`${backendUrl}/series/${id}`);
      setSeries(loaded);
      setReplays([]); // the replays of the series the page leaves are not this one's
      setMoved(null); // and neither is its success line
      // A series nobody reported records no game, and the table shows its rules alone
      setGames(await fetchWrapper.get(`${backendUrl}/series/${id}/games`).catch(() => []));
      await loadFixture(loaded);
    } catch (e) {
      setError(`The series did not load: ${(e as Error).message}`);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    mapStore.fetchMaps().then((rows: Row[]) => setMaps(rows || [])).catch(() => {}); // names the map of each game
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const matchId = series?.match_id;
    const seriesId = series?.id;
    if (!canMove || !matchId || !seriesId) return;
    // the loader sets state, so it runs just outside the effect body (react-hooks/set-state-in-effect)
    queueMicrotask(() => loadReplays(matchId, seriesId));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [canMove, series]); // load() sets a new series row on every save, so the list is read again

  // The head to head of the two players, for a solo series and a signed-in reader alone.
  // This series is left out of its own line, so a scored one does not count itself.
  useEffect(() => {
    const [one, two] = [series?.player1_id, series?.player2_id];
    const self = series?.id;
    // the loader sets state, so it runs just outside the effect body (react-hooks/set-state-in-effect)
    queueMicrotask(() => {
      setMeetings([]); // the meetings of the series the page leaves are not this one's
      if (!one || !two || !auth.me) return; // the meetings route answers a member alone
      seriesStore.playerMeetings(one, two).then((rows: Row[]) => setMeetings((rows || []).filter((row: Row) => row.series_id !== self))).catch(() => {});
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [series?.id, series?.player1_id, series?.player2_id, auth.me?.user?.id]); // one read per series: a save of this series cannot change a line it is left out of

  // A link from one series to the next keeps the page, so the read follows the route
  useEffect(() => {
    // the loader sets state, so it runs just outside the effect body (react-hooks/set-state-in-effect)
    queueMicrotask(load);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  const saveRoster = async () => {
    setSavingRoster(true);
    setRosterError(null);
    try {
      await eventStore.setSideRoster(series!.id, rosterSide, picked);
      setRosterOpen(false);
      await load();
    } catch (e) {
      setRosterError((e as Error).message);
    } finally {
      setSavingRoster(false);
    }
  };

  const award = async (kind: string) => {
    setAwarding(true);
    setAwardError(null);
    try {
      await eventStore.awardSeries(series!.id, kind, awardSide);
      setAwardOpen(false);
      await load();
    } catch (e) {
      setAwardError((e as Error).message);
    } finally {
      setAwarding(false);
    }
  };

  return (
    <div className="p-4">
      <StatusAlert modelValue={error} onClose={() => setError(null)} />
      <StatusAlert modelValue={moved} type="success" onClose={() => setMoved(null)} />
      {loading ? <Progress value={null} /> : null}

      {series ? (
        <>
          {/* The title names the event, so the eyebrow says the round and the opponent alone */}
          <PageHeader kicker={seriesContext(series, { event: false, playerId: viewer.id }) || undefined} title={title}>
            <div className="flex w-full flex-col gap-1.5">
              {/* One fact per line at every width: the booked time, the next map, the head to head */}
              {series.date_time ? (
                <span className="flex items-center gap-1.5 text-sm text-muted-foreground">
                  <Icon name="mdi-calendar" size={16} />
                  <span className="tnum">{formatDateTime(series.date_time)}</span>
                  <span>&middot; your time</span>
                </span>
              ) : null}
              {mapLine ? (
                <span className="flex items-center gap-1.5 text-sm text-muted-foreground">
                  <Icon name="mdi-map-outline" size={16} />
                  {mapLine}
                </span>
              ) : null}
              {headToHead ? (
                <span className="flex flex-wrap items-center gap-1.5 text-sm text-muted-foreground">
                  <Icon name="mdi-sword-cross" size={16} />
                  Head to head
                  <HeadToHeadCell pair={{ wins: met.wins, losses: met.losses, last_event: met.lastEvent }} onMeetings={async () => meetings} />
                </span>
              ) : null}
              <SeriesActionBar
                className="mt-2"
                series={actionRow}
                viewer={viewer}
                dateFact={false}
                onSchedule={() => actionRow && scheduleDialog.current?.open(actionRow)}
                onReport={() => reportDialog.current?.open(series)}
              />
            </div>
          </PageHeader>

          <div className="grid gap-6 min-[960px]:grid-cols-12">
            <Card className="card gap-0 self-start py-0 min-[960px]:col-span-7">
              <CardHeader className="p-4">
                <CardTitle className="flex flex-wrap items-center gap-3">
                  <span>{bestOfLine}</span>
                  {stageRow ? <Badge className={toneClass(null)}>{mode}</Badge> : null}
                  {stageRow ? <Badge variant="outline">{pick}</Badge> : null}
                </CardTitle>
              </CardHeader>
              <div className="p-3">
                <SeriesBox readonly series={box as Row} rosters={rosters} />
              </div>
              <div className="flex flex-wrap items-center gap-2 px-3 pb-3">
                <CastChips series={series as CastSeries} />
                <span className="flex-1" />
                {rosterSides.map((side) => (
                  <Button key={side} variant="outline" size="sm" className="text-primary-text" onClick={() => openRoster(side)}>
                    <Icon name="mdi-account-group" />
                    {rosterVerb(side)} {teamName(side)}
                  </Button>
                ))}
                {auth.isAdmin && !scored ? (
                  <Button variant="outline" size="sm" onClick={() => setAwardOpen(true)}>
                    <Icon name="mdi-account-cancel" />
                    No game played
                  </Button>
                ) : null}
              </div>
            </Card>

            <Card className="card gap-0 self-start py-0 min-[960px]:col-span-5">
              <CardHeader className="p-4">
                <CardTitle>Games</CardTitle>
              </CardHeader>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead style={{ width: "56px" }}>Game</TableHead>
                    <TableHead className={wideOnly}>Rule</TableHead>
                    <TableHead>Map</TableHead>
                    <TableHead>Winner</TableHead>
                    {canMove ? <TableHead className="text-right">Replay</TableHead> : null}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {gameRows.map((row) => (
                    <TableRow key={row.game_no}>
                      <TableCell>
                        {row.game_no}
                        <div className={`${phoneOnly} text-xs whitespace-nowrap text-muted-foreground`}>{row.rule}</div>
                      </TableCell>
                      <TableCell className={wideOnly}>{row.rule}</TableCell>
                      <TableCell>{row.map ?? "—"}</TableCell>
                      <TableCell>
                        {/* The winner wears the win mark, never coloured text */}
                        {row.winner ? (
                          <span className="inline-flex items-center gap-1.5">
                            <i className="h-[1em] w-[3px] rounded-[2px] bg-win" />
                            {row.winner}
                          </span>
                        ) : (
                          <span className="text-muted-foreground">—</span>
                        )}
                      </TableCell>
                      {/* A file uploaded to the wrong game moves to another game the series played */}
                      {canMove ? (
                        <TableCell className="text-right">
                          {hasReplay(row.game_no) ? (
                            <DropdownMenu>
                              <DropdownMenuTrigger render={<Button variant="ghost" size="icon-sm" aria-label={`Move the replay of game ${row.game_no}`} aria-busy={moving === row.game_no} disabled={moving !== null} />}>
                                <Icon name={moving === row.game_no ? "mdi-loading mdi-spin" : "mdi-file-move-outline"} />
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                {moveTargets(playedGames, row.game_no).map((to: number) => (
                                  <DropdownMenuItem key={to} onClick={() => moveReplay(row.game_no, to)}>
                                    Move to game {to}
                                  </DropdownMenuItem>
                                ))}
                              </DropdownMenuContent>
                            </DropdownMenu>
                          ) : null}
                        </TableCell>
                      ) : null}
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </Card>
          </div>

          {/* The whole fixture, so a reader reads the five series from any one of them */}
          {fixture.length > 1 ? <FixtureSeries className="mt-4" series={fixture} rosters={rosters} currentId={series.id} /> : null}

          {/* A captain names the players his side fields, out of the roster his team holds */}
          <Dialog open={rosterOpen} onOpenChange={setRosterOpen}>
            <DialogContent showCloseButton={false} className="max-w-[520px] gap-0 p-0 sm:max-w-[520px]">
              <DialogTitle className="bg-primary px-4 py-3 text-on-primary">Name the roster</DialogTitle>
              <div className="p-4">
                <StatusAlert modelValue={rosterError} onClose={() => setRosterError(null)} />
                <Field label={teamName(rosterSide)} htmlFor="series-roster" hint={`Pick ${sideSize} ${sideSize === 1 ? "player" : "players"}.`}>
                  <Select multiple value={picked} onValueChange={(value) => setPicked(value as number[])}>
                    <SelectTrigger id="series-roster" className={`${multiSelectTrigger} w-full`}>
                      <SelectValue>{(ids: number[]) => ids.map((one) => rosterItems.find((item) => item.id === one)?.name ?? one).join(", ")}</SelectValue>
                    </SelectTrigger>
                    <SelectContent>
                      {rosterItems.map((item) => (
                        <SelectItem key={item.id} value={item.id}>
                          <PlayerName player={item.player} race={item.race || undefined} plain />
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </Field>
              </div>
              <div className="flex justify-end gap-2 p-4 pt-0">
                <Button variant="ghost" disabled={savingRoster} onClick={() => setRosterOpen(false)}>
                  Cancel
                </Button>
                <Button disabled={picked.length !== sideSize || savingRoster} onClick={saveRoster}>
                  <Icon name={savingRoster ? "mdi-loading mdi-spin" : "mdi-content-save"} />
                  Save roster
                </Button>
              </div>
            </DialogContent>
          </Dialog>

          {/* An admin scores a series nobody played: the side that takes it, then the kind */}
          <Dialog open={awardOpen} onOpenChange={setAwardOpen}>
            <DialogContent showCloseButton={false} className="max-w-[480px] gap-0 p-0 sm:max-w-[480px]">
              <DialogTitle className="bg-primary px-4 py-3 text-on-primary">No game played</DialogTitle>
              <div className="p-4">
                <StatusAlert modelValue={awardError} onClose={() => setAwardError(null)} />
                <p className="mb-3">Pick the side that takes the series.</p>
                <ToggleGroup variant="outline" spacing={0} className="w-full" aria-label="Side that takes the series" value={awardSide ? [String(awardSide)] : []} onValueChange={(value) => setAwardSide(value[0] ? Number(value[0]) : null)}>
                  {[1, 2].map((side) => (
                    <ToggleGroupItem key={side} value={String(side)} className={SIDE_BUTTON}>
                      {sideName(side)}
                    </ToggleGroupItem>
                  ))}
                </ToggleGroup>
              </div>
              <div className="flex justify-end gap-2 p-4 pt-0">
                <Button variant="ghost" disabled={awarding} onClick={() => setAwardOpen(false)}>
                  Close
                </Button>
                <Button variant="outline" disabled={!awardSide || awarding} onClick={() => award("walkover")}>
                  Walkover
                </Button>
                <Button variant="outline" disabled={!awardSide || awarding} onClick={() => award("forfeit")}>
                  Forfeit
                </Button>
              </div>
            </DialogContent>
          </Dialog>

          {canReport ? (
            <>
              <ScheduleDialog ref={scheduleDialog} playerId={auth.me?.user?.id ?? null} onSaved={load} />
              {/* a moved replay answers the whole list, so the table takes it instead of reading the page again */}
              <ReportResultDialog ref={reportDialog} onSaved={load} onMoved={setReplays} />
            </>
          ) : null}
        </>
      ) : null}
    </div>
  );
}

export default SeriesView;
