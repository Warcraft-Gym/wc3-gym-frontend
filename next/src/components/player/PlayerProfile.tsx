"use client";
import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardTitle } from "@/components/ui/card";
import { Icon } from "@/components/ui/Icon";
import { EditPlayerDialog, type EditPlayerDialogHandle } from "@/components/EditPlayerDialog";
import { HeadToHead } from "@/components/player/HeadToHead";
import { PlayerHeader } from "@/components/player/PlayerHeader";
import { PlayerSeasons } from "@/components/player/PlayerSeasons";
import { RoundCards } from "@/components/player/RoundCards";
import { ScheduleDialog, type ScheduleDialogHandle } from "@/components/player/ScheduleDialog";
import { ReportResultDialog, type ReportResultDialogHandle } from "@/components/ReportResultDialog";
import { StatusAlert } from "@/components/StatusAlert";
import { usePanelLinks } from "@/hooks/player-panel";
import { useAuth, useAvailabilityStore, useEventStore, usePlayerStore, useSeason } from "@/stores";
import { backendUrl, fetchWrapper } from "@/helpers";
import { resolveCurrentW3CSeason } from "@/helpers/current-season.js";
import { myNight, myRaces } from "@/helpers/koth.mjs";
import { roundCards, waitingLines } from "@/helpers/rounds.mjs";
import { isUnscored } from "@/helpers/season-phase.mjs";

/* eslint-disable @typescript-eslint/no-explicit-any */
type Row = Record<string, any>;

// One job still open: the bronze edge marks it as the player's own to do.
const WAITING = "flex flex-wrap items-center gap-3 rounded-r-md border-l-[3px] border-primary bg-primary/8 px-3.5 py-2.5";

const weekKey = (seasonId: number | string, week: number) => `${seasonId}-${week}`;

/** One player: who he is, what waits for him, every event he entered with the rounds
 *  of the ones running, and the lifetime head to head. The page at /player/:id and
 *  the panel that opens over any other page both render this; the owner reads his
 *  own page with the actions on it, and every visitor reads the same facts. */
export function PlayerProfile({ playerKey, onLoaded }: { playerKey: string; onLoaded?: (player: Row) => void }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { me, isAdmin } = useAuth();
  const availabilityStore = useAvailabilityStore();
  const eventStore = useEventStore();
  const playerStore = usePlayerStore();
  const { seasons } = useSeason();

  const [player, setPlayer] = useState<Row | null>(null);
  // a stat from an older W3C season names its own season on the chip
  const [currentW3CSeason, setCurrentW3CSeason] = useState<number | null>(null);
  const editDialog = useRef<EditPlayerDialogHandle>(null);
  const scheduleDialog = useRef<ScheduleDialogHandle>(null);
  const reportDialog = useRef<ReportResultDialogHandle>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  useEffect(() => {
    let live = true;
    resolveCurrentW3CSeason().then((season: number | null) => { if (live) setCurrentW3CSeason(season); });
    return () => { live = false; };
  }, []);

  // The side panel reads a profile over another page, so it never carries the owner's
  // actions: a click there would take his unsaved work with it.
  const inPanel = usePanelLinks();
  const owner = !inPanel && !!me?.user?.id && me.user.id === player?.id;

  // One read for the whole profile; the ladder card reads its own record.
  // the caller may rewrite the address to the tag, which lands here again
  const loaded = useRef<Row | null>(null);
  useEffect(() => {
    if (loaded.current && [String(loaded.current.id), loaded.current.battleTag].includes(playerKey)) return;
    let live = true;
    loaded.current = null;
    setPlayer(null);
    setErrorMessage(null);
    playerStore
      .getPlayer(playerKey)
      .then((row: Row) => {
        if (!live) return;
        loaded.current = row;
        setPlayer(row);
        onLoaded?.(row);
      })
      .catch((error: Error) => { if (live) setErrorMessage(error.message); });
    return () => { live = false; };
    // the store's members are rebuilt every render, so the key drives the read
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [playerKey]);

  // The owner's own seasons: /player-series answers the series, the rounds and his answers
  const [seasonData, setSeasonData] = useState<Row>({});
  const openSeasons: Row[] = (me?.seasons ?? []).filter((season: Row) => season.signed_up);
  const openSeasonId = owner ? Number(me?.season_id) || undefined : undefined;

  const loadSeasons = async () => {
    const answers = await Promise.all(openSeasons.map((season) =>
      fetchWrapper.get(`${backendUrl}/player-series?season_id=${season.id}`).catch(() => null)));
    setSeasonData(Object.fromEntries(
      openSeasons.map((season, i) => [season.id, answers[i]]).filter(([, answer]) => answer)));
  };

  // Tonight's KOTH night, an extra the page stands without: the member read names it and
  // its one action, the event read its start time, and the entrants read the races he
  // entered on. The events list folds it in.
  const [night, setNight] = useState<Row | null>(null);
  const [nightRaces, setNightRaces] = useState<string[]>([]);

  const loadNight = async () => {
    const row: Row | null = myNight(await eventStore.myEvents().catch(() => []));
    if (!row) return;
    const [event, entrants] = await Promise.all([
      eventStore.fetchEvent(row.id).catch(() => null),
      eventStore.fetchEntrants(row.id).catch(() => []),
    ]);
    setNight({ ...event, ...row });
    setNightRaces(myRaces(entrants, player?.id));
  };

  // a visitor's page must never read the last owner's series, so the cache drops first
  const [served, setServed] = useState(owner);
  if (served !== owner) {
    setServed(owner);
    setSeasonData({});
    setNight(null);
    setNightRaces([]);
  }

  useEffect(() => {
    if (!owner) return;
    (async () => {
      await Promise.all([loadSeasons(), loadNight()]);
    })();
    // the store's members are rebuilt every render, so the viewer's role drives the reads
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [owner]);

  const seriesOf = (row: Row) => seasonData[row.season.id]?.series ?? row.series;
  const answersOf = (seasonId: number | string): Row[] => seasonData[seasonId]?.availability ?? [];

  // What he still owes, over every season he is in
  const waiting: Row[] = waitingLines(
    openSeasons
      .map((season) => {
        const answer = seasonData[season.id];
        if (!answer) return null;
        const full = (seasons ?? []).find((row: Row) => row.id === season.id) ?? season;
        return {
          season,
          asks: full.scheduling_enabled !== false,
          cards: roundCards({
            rounds: answer.rounds ?? [],
            series: answer.series ?? [],
            answers: answer.availability ?? [],
            checkinDays: full.checkin_days ?? season.checkin_days ?? null,
          }),
        };
      })
      .filter(Boolean),
    player?.id,
  );

  // Until the series time has passed the job is to agree a time, so Schedule leads
  const seriesActions = (row: Row): Row[] => {
    const schedule = { label: "Schedule", icon: "mdi-calendar-edit", lead: !row.played, dialog: "schedule" };
    const report = { label: "Report result", icon: "mdi-trophy", lead: row.played, dialog: "report" };
    return row.played ? [report, schedule] : [schedule, report];
  };
  const openSeries = (dialog: string, series: Row) =>
    (dialog === "schedule" ? scheduleDialog : reportDialog).current?.open(series);

  // The check-in, from the waiting card and from the round cards alike
  const [savingWeek, setSavingWeek] = useState<string | null>(null);
  const rowOfWeek = (seasonId: number | string, week: number) => answersOf(seasonId).find((row) => row.playday === week);

  const setByLine = (seasonId: number | string, week: number) => {
    const row = rowOfWeek(seasonId, week);
    if (!row || row.available == null) return "No answer";
    return `Set by ${row.set_by_user_id === player?.id ? "You" : row.set_by_name} · tap again to clear`;
  };

  // a second click on the state already set clears the week back to no answer
  const setWeek = async (seasonId: number | string, week: number, want: boolean) => {
    setSavingWeek(weekKey(seasonId, week));
    setErrorMessage(null);
    try {
      const available = rowOfWeek(seasonId, week)?.available ?? null;
      const rows = await availabilityStore.setPlayerAvailability({
        season_id: Number(seasonId),
        playday: week,
        available: available === want ? null : want,
      });
      setSeasonData((was) => ({ ...was, [seasonId]: { ...was[seasonId], availability: rows } }));
    } catch (error) {
      setErrorMessage((error as Error).message || "Error saving availability.");
    } finally {
      setSavingWeek(null);
    }
  };

  // after a save the battle tag may have changed, and the tag is the address
  const reload = async () => {
    const row = await playerStore.getPlayer(String(player?.id));
    loaded.current = row;
    setPlayer(row);
    onLoaded?.(row);
  };

  const afterWrite = async (message: string) => {
    setSuccessMessage(message);
    await loadSeasons();
    await reload();
  };

  // the account menu used to ask for the dialog with ?edit=1; old links still open it
  const edit = searchParams.get("edit");
  useEffect(() => {
    if (!edit || !player || !(owner || isAdmin)) return;
    const query = new URLSearchParams(searchParams);
    query.delete("edit");
    router.replace(window.location.pathname + (query.size ? `?${query}` : ""));
    editDialog.current?.open(player);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [edit, player, owner, isAdmin]);

  return (
    <>
      <StatusAlert modelValue={errorMessage} onClose={() => setErrorMessage(null)} />
      <StatusAlert modelValue={successMessage} type="success" onClose={() => setSuccessMessage(null)} />

      {player ? (
        <>
          <Card className="card mb-6">
            <CardContent className="p-4">
              <PlayerHeader
                player={player}
                me={me}
                owner={owner}
                editable={owner || isAdmin}
                w3cSeason={currentW3CSeason}
                onEdit={() => editDialog.current?.open(player)}
              />
            </CardContent>
          </Card>

          {owner && waiting.length ? (
            <Card className="card mb-6">
              <CardContent className="p-4">
                <h2 className="mb-3 text-lg">Waiting for you</h2>
                <div className="flex flex-col gap-2">
                  {waiting.map((row) => (
                    <div key={row.key} className={WAITING}>
                      <div className="min-w-0 grow">{row.text}</div>
                      {row.kind === "series" ? (
                        <div className="flex flex-wrap gap-2">
                          {seriesActions(row).map((action) => (
                            <Button key={action.label} size="sm" variant={action.lead ? "default" : "ghost"} onClick={() => openSeries(action.dialog, row.series)}>
                              <Icon name={action.icon} />
                              {action.label}
                            </Button>
                          ))}
                        </div>
                      ) : (
                        <div className="flex gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            className="text-success"
                            disabled={savingWeek !== null}
                            onClick={() => setWeek(row.seasonId, row.playday, true)}
                          >
                            {savingWeek === weekKey(row.seasonId, row.playday) ? <Icon name="mdi-loading mdi-spin" /> : null}
                            Check in
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            className="text-error"
                            disabled={savingWeek !== null}
                            onClick={() => setWeek(row.seasonId, row.playday, false)}
                          >
                            {savingWeek === weekKey(row.seasonId, row.playday) ? <Icon name="mdi-loading mdi-spin" /> : null}
                            Can&apos;t play
                          </Button>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          ) : null}

          <Card className="card gap-0 py-0">
            <CardTitle className="flex items-center gap-2 bg-primary p-4 text-on-primary">
              <Icon name="mdi-calendar-account" />
              Events
            </CardTitle>
            {/* The event still running opens onto its rounds; the others onto their series */}
            <PlayerSeasons
              player={player}
              open={openSeasonId}
              night={night}
              nightRaces={nightRaces}
              current={(row) => (
                <RoundCards
                  player={player}
                  season={row.season}
                  series={seriesOf(row)}
                  teamId={row.teamId}
                  answers={answersOf(row.season.id)}
                  seriesActions={owner ? (item) => (
                    <div className="mt-2 flex flex-wrap gap-1">
                      {isUnscored(item) ? (
                        <Button variant="outline" size="sm" className="text-primary-text" onClick={() => scheduleDialog.current?.open(item)}>
                          <Icon name="mdi-calendar-edit" />
                          Edit schedule
                        </Button>
                      ) : null}
                      <Button size="sm" onClick={() => reportDialog.current?.open(item)}>
                        <Icon name="mdi-trophy" />
                        {isUnscored(item) ? "Report result" : "Edit result"}
                      </Button>
                      <Button variant="outline" size="sm" className="text-primary-text" nativeButton={false} render={<Link href={`/player-series/${item.id}/veto`} />}>
                        <Icon name="mdi-map-outline" />
                        Maps
                      </Button>
                    </div>
                  ) : undefined}
                  question={owner ? (card) => (
                    <>
                      <div className="mt-2 flex gap-2">
                        <Button
                          className={card.answer === true ? "bg-success text-on-success" : "text-success"}
                          variant={card.answer === true ? "default" : "outline"}
                          disabled={savingWeek !== null}
                          onClick={() => setWeek(row.season.id, card.playday, true)}
                        >
                          {savingWeek === weekKey(row.season.id, card.playday) ? <Icon name="mdi-loading mdi-spin" /> : null}
                          Check in
                        </Button>
                        <Button
                          className={card.answer === false ? "bg-error text-on-error" : "text-error"}
                          variant={card.answer === false ? "default" : "outline"}
                          disabled={savingWeek !== null}
                          onClick={() => setWeek(row.season.id, card.playday, false)}
                        >
                          {savingWeek === weekKey(row.season.id, card.playday) ? <Icon name="mdi-loading mdi-spin" /> : null}
                          Can&apos;t play
                        </Button>
                      </div>
                      <div className="mt-2 text-xs text-muted-foreground">{setByLine(row.season.id, card.playday)}</div>
                    </>
                  ) : undefined}
                />
              )}
            />
          </Card>

          <HeadToHead playerId={player.id} />

          <EditPlayerDialog ref={editDialog} self={owner} canSave={owner || isAdmin} refresh={reload} />
          {owner ? (
            <>
              <ScheduleDialog ref={scheduleDialog} playerId={player.id} onSaved={afterWrite} />
              <ReportResultDialog ref={reportDialog} onSaved={afterWrite} />
            </>
          ) : null}
        </>
      ) : null}
    </>
  );
}

export default PlayerProfile;
