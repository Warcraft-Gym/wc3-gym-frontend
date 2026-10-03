"use client";
import { useEffect, useRef, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Icon } from "@/components/ui/Icon";
import { toneClass } from "@/components/ui/tone";
import { SignupDialog } from "@/components/SignupDialog";
import { BoardPlayer, BracketCard } from "@/components/koth/BracketCard";
import { canSignUp, myRacesOnBoard, orderedBrackets, shouldReread, streamPollMs, withdrawForfeitsCrown, withdrawForfeitsSeries } from "@/helpers/koth-board.mjs";
import { raceWrapper } from "@/helpers/races.js";
import { useAuth, useEventStore } from "@/stores";

/* eslint-disable @typescript-eslint/no-explicit-any */
type Row = Record<string, any>;


const raceName = (race: string) => raceWrapper.getRaceObject(race)?.name || race;

/** A KOTH night that is not archived, on the one board read: a card per bracket with its king,
 *  the series it plays now, the line waiting and what it played tonight. While signups stand open a
 *  signed-in reader signs up, and a visitor signs up by battle tag on a night open to anyone. A
 *  signed-in reader withdraws until the night closes and reads his own place in line. The board is
 *  read again on "Refresh" and on a return to the tab. `clean` is the stream view: no control, and the
 *  board read again every 30 s while the tab is visible and the night is open. */
export function KothNightBoard({
  event,
  board: loaded,
  clean,
  onError,
  children,
}: {
  event: Row;
  board: Row;
  clean: boolean;
  onError: (message: string | null) => void;
  children?: React.ReactNode; // the admin's links, beside the reader's controls
}) {
  const auth = useAuth();
  const store = useEventStore();
  const [board, setBoard] = useState<Row>(loaded);
  const [withdrawing, setWithdrawing] = useState<string | boolean>(false); // true, or the race on its way out
  const [dialog, setDialog] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const lastRead = useRef(0); // when the page last read the board, in ms

  const brackets: Row[] = orderedBrackets(board);
  const myId = auth.me ? auth.me.user?.id : null;
  const held: string[] = myRacesOnBoard(board, myId);
  const signedUp = held.length > 0;
  const closed = !!board.closed;
  const canEnter = canSignUp({ signedIn: !!auth.me, signupsOpen: !!event.signups_open, policy: event.signup_policy, signedUp,
    multiEntry: !!event.multi_entry, heldCount: held.length, raceCount: raceWrapper.races.length });

  // fresh skips the edge cache after the reader's own write; a board in hand skips the read; a failure keeps
  // the board. It answers the board it now shows, so the stream's timer plans the next read from it.
  const readBoard = async (fresh = false, answer: Row | null = null): Promise<Row | null> => {
    lastRead.current = Date.now();
    try {
      const next = answer ?? (await store.fetchBoard(event.id, fresh));
      setBoard(next);
      onError(null);
      return next;
    } catch (e) {
      onError(`The night did not load: ${(e as Error).message}`);
      return null;
    }
  };

  // The stream view never reloads, so it reads the board on a timer while the night can change: each read
  // plans the next one from the board it got (streamPollMs), and a hidden tab skips the read
  useEffect(() => {
    if (!clean) return;
    let timer: ReturnType<typeof setTimeout> | undefined;
    const plan = (shown: Row) => {
      const wait = streamPollMs(shown, Date.now());
      if (wait == null) return;
      timer = setTimeout(async () => plan((!document.hidden && (await readBoard())) || shown), wait);
    };
    plan(board);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [clean]);

  // A return to the tab reads the board again, at most once per 15 s edge copy; no timer runs
  useEffect(() => {
    if (clean || closed) return;
    if (!lastRead.current) lastRead.current = Date.now(); // the page came with the board its load read
    const onShow = () => document.visibilityState === "visible" && shouldReread(lastRead.current, Date.now()) && readBoard();
    document.addEventListener("visibilitychange", onShow);
    return () => document.removeEventListener("visibilitychange", onShow);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [clean, closed]);

  // The edge copy is enough for a click, so Refresh never reads fresh
  const refresh = async () => {
    setRefreshing(true);
    await readBoard();
    setRefreshing(false);
  };

  const withdraw = async (race: string | null = null) => {
    // a race at the table loses its series by forfeit, which outweighs the king's next match
    const question = withdrawForfeitsSeries(board, myId, race)
      ? "Withdrawing forfeits the match you are playing."
      : withdrawForfeitsCrown(board, myId, race)
        ? "Withdrawing forfeits your next match."
        : race
          ? `Withdraw ${raceName(race)} from tonight?`
          : "Withdraw from tonight?";
    if (!window.confirm(question)) return;
    setWithdrawing(race ?? true);
    try {
      await store.withdraw(event.id, race);
      await readBoard(true);
    } catch (e) {
      onError(`The withdraw did not go through: ${(e as Error).message}`);
    } finally {
      setWithdrawing(false);
    }
  };

  return (
    <>
      {!clean ? (
        <div className="mt-4 flex flex-wrap items-center gap-2">
          {canEnter ? (
            <Button size="sm" onClick={() => setDialog(true)}>
              <Icon name={signedUp ? "mdi-plus" : "mdi-account-plus"} />
              {signedUp ? "Enter another race" : "Sign up"}
            </Button>
          ) : null}
          {/* A player on more than one race withdraws one race at a time */}
          {(held.length > 1 && !closed ? held : []).map((race) => (
            <Button key={race} size="sm" variant="destructive" disabled={withdrawing === race} onClick={() => withdraw(race)}>
              <Icon name={withdrawing === race ? "mdi-loading mdi-spin" : "mdi-account-minus"} />
              Withdraw {raceName(race)}
            </Button>
          ))}
          {held.length === 1 && !closed ? (
            <Button size="sm" variant="destructive" disabled={withdrawing === true} onClick={() => withdraw()}>
              <Icon name={withdrawing === true ? "mdi-loading mdi-spin" : "mdi-account-minus"} />
              Withdraw
            </Button>
          ) : null}
          <Badge className={toneClass(null)}>
            <Icon name="mdi-account-multiple" />
            {board.entrant_count} signed up
          </Badge>
          {/* the arrow says what it does, so the control is a gold icon, not a labelled button */}
          <Button size="icon-sm" variant="ghost" className="text-primary-text" title="Refresh" aria-label="Refresh" disabled={refreshing} onClick={refresh}>
            <Icon name={refreshing ? "mdi-loading mdi-spin" : "mdi-refresh"} size={20} />
          </Button>
          {children}
        </div>
      ) : null}

      {/* The signups W3Champions rated no race for wait over the brackets; a stream skips them */}
      {!clean && (board.unplaced ?? []).length ? (
        <div className="card mt-4 rounded-lg p-4 shadow-sm">
          <div className="pb-1 text-xs font-medium text-muted-foreground">Waiting for a bracket</div>
          {board.unplaced.map((row: Row) => (
            <div key={row.entrant_id} className="border-t py-1 first:border-t-0">
              <BoardPlayer row={row} slot />
            </div>
          ))}
          <p className="mt-2 mb-0 text-xs text-muted-foreground">An admin places these players.</p>
        </div>
      ) : null}

      <div className="mt-4 grid gap-4 min-[960px]:grid-cols-3">
        {brackets.map((bracket: Row) => (
          <BracketCard key={bracket.division_id} bracket={bracket} brackets={brackets} you={clean ? null : myId} clean={clean} />
        ))}
      </div>

      {dialog ? <SignupDialog event={event} held={held} open onOpenChange={setDialog} onSignedUp={(_entrant, answer) => readBoard(true, answer)} /> : null}
    </>
  );
}

export default KothNightBoard;
