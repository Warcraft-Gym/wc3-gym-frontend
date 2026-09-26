"use client";
import { useEffect, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Icon } from "@/components/ui/Icon";
import { toneClass } from "@/components/ui/tone";
import { SignupDialog } from "@/components/SignupDialog";
import { BoardPlayer, BracketCard } from "@/components/koth/BracketCard";
import { myRacesOnBoard, orderedBrackets } from "@/helpers/koth-board.mjs";
import { raceWrapper } from "@/helpers/races.js";
import { useAuth, useEventStore } from "@/stores";

/* eslint-disable @typescript-eslint/no-explicit-any */
type Row = Record<string, any>;

// The stream view never reloads, so it alone reads the board again every 30 s
const STREAM_POLL_MS = 30000;

const raceName = (race: string) => raceWrapper.getRaceObject(race)?.name || race;

/** A KOTH night that is not archived, on the one board read: a card per bracket with its king,
 *  the series it plays now, the line waiting and what it played tonight. A member signs up while
 *  signups stand open, withdraws until the night closes, and reads his own place in line. `clean` is the stream view: no control, and the
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

  const brackets: Row[] = orderedBrackets(board);
  const myId = auth.me ? auth.me.user?.id : null;
  const held: string[] = myRacesOnBoard(board, myId);
  const signedUp = held.length > 0;
  const closed = !!board.closed;
  // a king who leaves loses a forfeit to the first in line, so his confirm says so
  const wearsCrown = (race: string | null) =>
    brackets.some((bracket) => bracket.king?.user_id === myId && (race === null || bracket.king.rows.some((row: Row) => row.race === race)));
  const canEnter = !!auth.me && !!event.signups_open && (!signedUp || (!!event.multi_entry && held.length < raceWrapper.races.length));

  // fresh skips the edge cache after the reader's own write; a failure keeps the board on the screen
  const readBoard = async (fresh = false) => {
    try {
      setBoard(await store.fetchBoard(event.id, fresh));
      onError(null);
    } catch (e) {
      onError(`The night did not load: ${(e as Error).message}`);
    }
  };

  useEffect(() => {
    if (!clean || closed) return;
    const timer = setInterval(() => !document.hidden && readBoard(), STREAM_POLL_MS);
    return () => clearInterval(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [clean, closed]);

  const withdraw = async (race: string | null = null) => {
    const question = wearsCrown(race)
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

      {dialog ? <SignupDialog event={event} held={held} open onOpenChange={setDialog} onSignedUp={() => readBoard(true)} /> : null}
    </>
  );
}

export default KothNightBoard;
