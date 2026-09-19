"use client";
import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle } from "@/components/ui/card";
import { Icon } from "@/components/ui/Icon";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import { toneClass } from "@/components/ui/tone";
import { EventHeader } from "@/components/EventHeader";
import { PlayerName } from "@/components/PlayerName";
import { RaceIcon } from "@/components/RaceIcon";
import { SignupDialog } from "@/components/SignupDialog";
import { StageView } from "@/components/StageView";
import { StatusAlert } from "@/components/StatusAlert";
import { byPlayer, bySeed, entrantName, raceRows } from "@/helpers/entrants.mjs";
import { myRaces, openNight } from "@/helpers/koth.mjs";
import { raceWrapper } from "@/helpers/races.js";
import { inDivision, isScored } from "@/helpers/stage-view.mjs";
import { useAuth, useEventStore } from "@/stores";

/* eslint-disable @typescript-eslint/no-explicit-any */
type Row = Record<string, any>;

const solo = (item: Row) => !raceRows(item).length;
const raceName = (race: string) => raceWrapper.getRaceObject(race)?.name || race;
const byPosition = (rows: Row[] = []) => [...rows].sort((a, b) => a.position - b.position);

/** Tonight's KOTH night, open to everyone and drawn from the event reads: one column per
 *  bracket with its standing king, everyone signed up for it, and the chain the throne is
 *  played on. `?mode=clean` drops the two buttons, so the page can sit in a stream. */
export function KothDashboard() {
  const router = useRouter();
  const auth = useAuth();
  const store = useEventStore();

  // A stream reads the brackets alone, so the clean page offers nothing to click
  const cleanMode = useSearchParams().get("mode") === "clean";

  const [event, setEvent] = useState<Row | null>(null);
  const [entrants, setEntrants] = useState<Row[]>([]);
  const [series, setSeries] = useState<Row[]>([]);
  const [rounds, setRounds] = useState<Row[]>([]);
  const [standings, setStandings] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [withdrawing, setWithdrawing] = useState<string | boolean>(false); // true, or the race on its way out
  const [error, setError] = useState<string | null>(null);
  const [dialog, setDialog] = useState(false);

  // A night plays one koth stage; a night nobody drew yet has none of its series
  const stage: Row | null = byPosition(event?.stages)[0] || null;
  const standing = entrants.filter((row) => !row.withdrawn_at);
  // A player on two races is one entrant
  const players = byPlayer(standing).length;
  const myId = auth.me?.user?.id;
  const mine = standing.find((row) => row.user?.id && row.user.id === myId) || null;
  const held: string[] = myRaces(standing, myId);

  // One column per bracket, strongest first. The king is the top of the bracket's table,
  // which the engine sorts him to once the chain has scored a series.
  const brackets: Row[] = byPosition(event?.divisions).map((division) => {
    const chain: Row[] = inDivision(series, division.id);
    const top = standings.find((group) => group.division_id === division.id)?.rows?.[0];
    return {
      ...division,
      entrants: byPlayer(bySeed(standing.filter((row) => row.division_id === division.id))),
      king: chain.some(isScored) ? entrants.find((row) => row.id === top?.entrant_id) || null : null,
      chain,
    };
  });

  const load = async () => {
    const night = openNight(await store.fetchEvents(null, "koth"));
    if (!night) {
      setEvent(null);
      return;
    }
    const [full, rows] = await Promise.all([store.fetchEvent(night.id), store.fetchEntrants(night.id)]);
    setEvent(full);
    setEntrants(rows);
    const first = byPosition(full.stages)[0];
    // A stage nobody drew yet answers nothing, and the columns show the signups alone
    const [drawn, table] = first
      ? await Promise.all([store.fetchStage(full.id, first.id).catch(() => null), store.fetchStandings(full.id, first.id).catch(() => [])])
      : [null, []];
    setSeries(drawn?.series || []);
    setRounds(drawn?.rounds || []);
    setStandings(table);
  };

  const withdraw = async (race: string | null = null) => {
    if (!window.confirm(race ? `Withdraw ${raceName(race)} from tonight?` : "Withdraw from tonight?")) return;
    setWithdrawing(race ?? true);
    try {
      await store.withdraw(event!.id, race);
      await load();
    } catch (e) {
      setError(`The withdraw did not go through: ${(e as Error).message}`);
    } finally {
      setWithdrawing(false);
    }
  };

  useEffect(() => {
    const reload = async () => {
      try {
        await load();
        setError(null);
      } catch (e) {
        setError(`The night did not load: ${(e as Error).message}`);
      }
    };
    reload().then(() => setLoading(false));
    // The page hangs on a stream all night, so it reads itself again every 30 seconds
    const timer = setInterval(reload, 30000);
    return () => clearInterval(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="p-2">
      <StatusAlert modelValue={error} onClose={() => setError(null)} />
      {loading ? <Progress value={null} /> : null}

      {!event && !loading ? (
        <div className="py-12 text-center text-muted-foreground">
          <Icon name="mdi-crown-outline" size={64} className="opacity-40" />
          <p className="mt-3 mb-0 text-xl font-medium">No night open tonight</p>
        </div>
      ) : null}

      {event ? (
        <>
          <EventHeader event={event} />

          {!cleanMode ? (
            <div className="mt-4 flex flex-wrap items-center gap-3">
              {event.signups_open && (!mine || (event.multi_entry && held.length < raceWrapper.races.length)) ? (
                <Button size="sm" onClick={() => setDialog(true)}>
                  <Icon name="mdi-account-plus" />
                  {mine ? "Enter another race" : "Sign up"}
                </Button>
              ) : null}
              {/* A player on more than one race withdraws one race at a time */}
              {(held.length > 1 ? held : []).map((race) => (
                <Button key={race} size="sm" variant="destructive" disabled={withdrawing === race} onClick={() => withdraw(race)}>
                  <Icon name={withdrawing === race ? "mdi-loading mdi-spin" : "mdi-account-minus"} />
                  Withdraw {raceName(race)}
                </Button>
              ))}
              {mine && held.length < 2 ? (
                <Button size="sm" variant="destructive" disabled={withdrawing === true} onClick={() => withdraw()}>
                  <Icon name={withdrawing === true ? "mdi-loading mdi-spin" : "mdi-account-minus"} />
                  Withdraw
                </Button>
              ) : null}
              <Badge className={toneClass(null)}>
                <Icon name="mdi-account-multiple" />
                {players} entrants
              </Badge>
            </div>
          ) : null}

          <div className="mt-4 grid gap-4 min-[960px]:grid-cols-3">
            {brackets.map((bracket) => (
              <Card key={bracket.id} className="card h-full gap-0 py-0">
                <CardHeader className="bg-primary p-4">
                  <CardTitle className="text-on-primary">{bracket.name}</CardTitle>
                </CardHeader>

                <div className="flex min-h-[84px] items-center gap-3 p-4">
                  {bracket.king ? (
                    <>
                      <Icon name="mdi-crown" size={28} className="text-primary-text" aria-hidden="true" />
                      <div>
                        <span className="text-xl font-medium">
                          <PlayerName player={bracket.king.user} race={bracket.king.race} mmr={bracket.king.mmr || false} />
                        </span>
                        <div className="text-xs text-muted-foreground">Holds the throne</div>
                      </div>
                    </>
                  ) : (
                    <div className="text-muted-foreground">No king yet</div>
                  )}
                </div>

                <Separator />

                {bracket.entrants.length ? (
                  <ul className="flex flex-col">
                    {bracket.entrants.map((entrant: Row) => (
                      <li key={entrant.id} className="px-4 py-1">
                        <div className="flex items-center gap-3">
                          {entrant.user ? (
                            <PlayerName player={entrant.user} race={solo(entrant) ? entrant.race : undefined} mmr={(solo(entrant) && entrant.mmr) || false} />
                          ) : (
                            <span>{entrantName(entrant)}</span>
                          )}
                        </div>
                        {/* A player on two races of one bracket sits once in its chain and reads once here */}
                        {raceRows(entrant).map((race: Row) => (
                          <div key={race.id} className="flex items-center gap-2 pl-6 text-xs text-muted-foreground">
                            <RaceIcon raceIdentifier={race.race} />
                            <span>{raceName(race.race)}</span>
                            {race.mmr ? <span className="tnum">{race.mmr} MMR</span> : null}
                          </div>
                        ))}
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="mb-0 px-4 py-3 text-muted-foreground">Nobody signed up yet</p>
                )}

                {stage && bracket.chain.length ? (
                  <div className="px-4 pb-2">
                    <StageView stage={stage} series={bracket.chain} rounds={rounds} divisions={[bracket]} onOpenSeries={(row) => router.push(`/series/${row.id}`)} />
                  </div>
                ) : null}
              </Card>
            ))}
          </div>

          {dialog ? <SignupDialog event={event} held={held} open onOpenChange={setDialog} onSignedUp={load} /> : null}
        </>
      ) : null}
    </div>
  );
}

export default KothDashboard;
