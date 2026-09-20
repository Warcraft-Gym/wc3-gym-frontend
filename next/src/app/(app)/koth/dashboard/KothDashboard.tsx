"use client";
import { useEffect, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Icon } from "@/components/ui/Icon";
import { Progress } from "@/components/ui/progress";
import { toneClass } from "@/components/ui/tone";
import { PageHeader } from "@/components/PageHeader";
import { SignupDialog } from "@/components/SignupDialog";
import { StatusAlert } from "@/components/StatusAlert";
import { BracketCard } from "@/components/koth/BracketCard";
import { dateRange, eventLabel } from "@/helpers/event-labels.mjs";
import { myRacesOnBoard, orderedBrackets } from "@/helpers/koth-board.mjs";
import { raceWrapper } from "@/helpers/races.js";
import { useAuth, useEventStore } from "@/stores";

/* eslint-disable @typescript-eslint/no-explicit-any */
type Row = Record<string, any>;

// The board is edge cached for 15 s, so twice a minute is the most the page can learn
const POLL_MS = 30000;

const raceName = (race: string) => raceWrapper.getRaceObject(race)?.name || race;

/** Tonight's KOTH night, open to everyone, on the one board read: a card per bracket with its
 *  king, the series it plays now, the line waiting and what it played tonight. A member reads
 *  his own place in line. `?mode=clean` drops every control, so the page can sit on a stream. */
export function KothDashboard() {
  const auth = useAuth();
  const store = useEventStore();

  // A stream reads the brackets alone, so the clean page offers nothing to click
  const cleanMode = useSearchParams().get("mode") === "clean";

  const [board, setBoard] = useState<Row | null>(null);
  const [event, setEvent] = useState<Row | null>(null); // read once, for the signup dialog alone
  const [loading, setLoading] = useState(true);
  const [withdrawing, setWithdrawing] = useState<string | boolean>(false); // true, or the race on its way out
  const [error, setError] = useState<string | null>(null);
  const [dialog, setDialog] = useState(false);
  const eventFor = useRef<number | null>(null); // the night the event row was read for

  const brackets: Row[] = orderedBrackets(board);
  const myId = auth.me?.user?.id;
  const held: string[] = myRacesOnBoard(board, myId);

  // The one repeated read of the page; fresh skips the edge cache after the reader's own write
  const readBoard = async (fresh = false) => {
    try {
      const answer = await store.fetchBoard(null, fresh);
      setBoard(answer);
      setError(null);
      // the event row carries the signup rules the dialog needs, so it is read once per night
      if (eventFor.current !== answer.night_id) {
        eventFor.current = answer.night_id;
        setEvent(await store.fetchEvent(answer.night_id).catch(() => null));
      }
    } catch (e) {
      // a 404 is the empty page; every other failure keeps the board that is on the screen
      if ((e as Row).status === 404) {
        setBoard(null);
        setError(null);
      } else setError(`The night did not load: ${(e as Error).message}`);
    }
  };

  useEffect(() => {
    let alive = true;
    const first = async () => {
      await readBoard();
      if (alive) setLoading(false);
    };
    first();
    // the tab in the background asks for nothing, so a page left on a stream costs nothing
    const timer = setInterval(() => {
      if (!document.hidden) readBoard();
    }, POLL_MS);
    return () => {
      alive = false;
      clearInterval(timer);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const withdraw = async (race: string | null = null) => {
    if (!window.confirm(race ? `Withdraw ${raceName(race)} from tonight?` : "Withdraw from tonight?")) return;
    setWithdrawing(race ?? true);
    try {
      await store.withdraw(board!.night_id, race);
      await readBoard(true);
    } catch (e) {
      setError(`The withdraw did not go through: ${(e as Error).message}`);
    } finally {
      setWithdrawing(false);
    }
  };

  const signedUp = held.length > 0;
  const canEnter = !!event && !!event.signups_open && (!signedUp || (!!event.multi_entry && held.length < raceWrapper.races.length));

  return (
    <>
      <StatusAlert modelValue={error} onClose={() => setError(null)} />
      {loading ? <Progress value={null} /> : null}

      {/* only a 404 is the empty night; a read that failed says so in the alert above */}
      {!board && !loading && !error ? (
        <div className="py-12 text-center text-muted-foreground">
          <Icon name="mdi-crown-outline" size={64} className="opacity-40" />
          <p className="mt-3 mb-0 text-xl font-medium">No KOTH night is open</p>
        </div>
      ) : null}

      {board ? (
        <>
          <PageHeader title="KOTH Night" lead={[event ? eventLabel(event) : board.name, dateRange(board)].filter(Boolean).join(" · ")}>
            {!cleanMode ? (
              <>
                {canEnter ? (
                  <Button size="sm" onClick={() => setDialog(true)}>
                    <Icon name={signedUp ? "mdi-plus" : "mdi-account-plus"} />
                    {signedUp ? "Enter another race" : "Sign up"}
                  </Button>
                ) : null}
                {/* A player on more than one race withdraws one race at a time */}
                {(held.length > 1 ? held : []).map((race) => (
                  <Button key={race} size="sm" variant="destructive" disabled={withdrawing === race} onClick={() => withdraw(race)}>
                    <Icon name={withdrawing === race ? "mdi-loading mdi-spin" : "mdi-account-minus"} />
                    Withdraw {raceName(race)}
                  </Button>
                ))}
                {held.length === 1 ? (
                  <Button size="sm" variant="destructive" disabled={withdrawing === true} onClick={() => withdraw()}>
                    <Icon name={withdrawing === true ? "mdi-loading mdi-spin" : "mdi-account-minus"} />
                    Withdraw
                  </Button>
                ) : null}
                <Badge className={toneClass(null)}>
                  <Icon name="mdi-account-multiple" />
                  {board.entrant_count} signed up
                </Badge>
              </>
            ) : null}
          </PageHeader>

          <div className="grid gap-4 min-[960px]:grid-cols-3">
            {brackets.map((bracket: Row) => (
              <BracketCard key={bracket.division_id} bracket={bracket} brackets={brackets} you={cleanMode ? null : myId} clean={cleanMode} />
            ))}
          </div>

          {dialog && event ? <SignupDialog event={event} held={held} open onOpenChange={setDialog} onSignedUp={() => readBoard(true)} /> : null}
        </>
      ) : null}
    </>
  );
}

export default KothDashboard;
