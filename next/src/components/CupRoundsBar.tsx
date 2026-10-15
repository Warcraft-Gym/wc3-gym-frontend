"use client";
import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Icon } from "@/components/ui/Icon";
import { toneClass } from "@/components/ui/tone";
import { CupRoundsEditor } from "@/components/CupRoundsEditor";
import { dateRange } from "@/helpers/event-labels.mjs";
import { legState, legTitle } from "@/helpers/cup-rounds.mjs";
import { useEventStore } from "@/stores";
import { cn } from "@/lib/utils";

/* eslint-disable @typescript-eslint/no-explicit-any */
type Row = Record<string, any>;

const dateRange_ = dateRange as (event: Row) => string;

const STATE_BADGE: Record<
  string,
  { label: string; tone: "success" | "info" | null }
> = {
  checkin: { label: "Check-in", tone: null },
  playing: { label: "Playing", tone: "info" },
  finished: { label: "Finished", tone: "success" },
};

/** The rounds of a cup played over rounds, over its draw on the run page: which round the page
 *  shows, who is checked in for it before its draw, and the finish once it is played. A round's
 *  places count in the overall table from its finish on. */
export function CupRoundsBar({
  event,
  legs,
  legIndex,
  onLeg,
  entrants,
  drawn,
  played,
  onLegs,
  onFinished,
  onChanged,
  onError,
}: {
  event: Row;
  legs: Row[];
  legIndex: number;
  onLeg: (index: number) => void;
  entrants: Row[];
  drawn: boolean;
  // every series of the round's last stage holds a result
  played: boolean;
  onLegs: (legs: Row[]) => void;
  onFinished: () => Promise<void>;
  // the rounds were renamed, moved, added or removed: the cup is read again
  onChanged: () => Promise<void>;
  onError: (message: string) => void;
}) {
  const store = useEventStore();
  const [busy, setBusy] = useState<string | null>(null);
  const [editing, setEditing] = useState(false);
  const leg = legs[legIndex];
  const state = leg ? legState(leg, drawn) : "checkin";
  const closed = !!event.closed_at || !!event.cancelled_at;
  const playing = entrants.filter(
    (row) => !row.withdrawn_at && !row.waitlisted_at,
  );
  const checked = new Set<number>(leg?.checked_in || []);

  const work = async (
    key: string,
    write: () => Promise<Row[]>,
    after?: () => Promise<void>,
  ) => {
    setBusy(key);
    try {
      onLegs(await write());
      if (after) await after();
    } catch (e) {
      onError((e as Error).message || "The write failed");
    } finally {
      setBusy(null);
    }
  };

  if (!leg) return null;
  const toggle = (row: Row) =>
    work(`in-${row.id}`, () =>
      checked.has(row.id)
        ? store.checkOutLeg(event.id, leg.id, row.id)
        : store.checkInLeg(event.id, leg.id, row.id),
    );
  const nameOf = (row: Row) => row.user?.name || row.team?.name || "Entrant";

  return (
    <div className="mb-4 rounded-lg border border-border">
      {/* the rounds side by side, each with its day and where it stands */}
      <div className="flex items-start gap-2 border-b border-border p-2">
        <div
          role="tablist"
          aria-label="Rounds"
          className="flex min-w-0 flex-1 gap-2 overflow-x-auto"
        >
          {legs.map((one, index) => {
            const badge =
              STATE_BADGE[
                legState(one, index === legIndex ? drawn : !!one.finished_at)
              ];
            return (
              <button
                key={one.id}
                type="button"
                role="tab"
                aria-selected={index === legIndex}
                onClick={() => onLeg(index)}
                className={cn(
                  "flex min-h-11 flex-none flex-col items-start rounded-md border-2 px-3 py-1 text-left",
                  index === legIndex
                    ? "border-primary bg-primary/10"
                    : "border-transparent",
                )}
              >
                <span className="font-bold">{legTitle(one)}</span>
                <span className="text-xs text-muted-foreground">
                  {dateRange_({ starts_at: one.starts_at }) || "No time yet"}
                </span>
                {one.finished_at || index === legIndex ? (
                  <Badge className={cn("mt-0.5", toneClass(badge.tone))}>
                    {badge.label}
                  </Badge>
                ) : null}
              </button>
            );
          })}
        </div>
        {!closed ? (
          <Button
            size="sm"
            variant="outline"
            className="flex-none"
            onClick={() => setEditing(true)}
          >
            <Icon name="mdi-calendar-edit" />
            Edit rounds
          </Button>
        ) : null}
      </div>
      {editing ? (
        <CupRoundsEditor
          event={event}
          legs={legs}
          open
          onOpenChange={setEditing}
          onChanged={onChanged}
        />
      ) : null}

      <div className="flex flex-col gap-3 p-3">
        {state === "checkin" ? (
          <>
            <div className="flex flex-wrap items-center gap-2">
              <span className="flex-1 text-sm">
                <span className="tnum font-bold">{checked.size}</span> of{" "}
                {playing.length} checked in for {legTitle(leg)}. The draw takes
                the players checked in.
              </span>
              {!closed ? (
                <Button
                  size="sm"
                  variant="outline"
                  disabled={busy === "all" || checked.size === playing.length}
                  onClick={() =>
                    work("all", () =>
                      store.checkEveryoneInLeg(event.id, leg.id),
                    )
                  }
                >
                  {busy === "all" ? (
                    <Icon name="mdi-loading mdi-spin" />
                  ) : (
                    <Icon name="mdi-check-all" />
                  )}
                  Check everyone in
                </Button>
              ) : null}
            </div>
            <ul
              className="flex flex-wrap gap-2"
              aria-label={`Check-in for ${legTitle(leg)}`}
            >
              {playing.map((row) => (
                <li key={row.id}>
                  <Button
                    size="sm"
                    variant={checked.has(row.id) ? "secondary" : "outline"}
                    aria-pressed={checked.has(row.id)}
                    disabled={closed || busy === `in-${row.id}`}
                    onClick={() => toggle(row)}
                  >
                    {busy === `in-${row.id}` ? (
                      <Icon name="mdi-loading mdi-spin" />
                    ) : (
                      <Icon
                        name={
                          checked.has(row.id)
                            ? "mdi-check"
                            : "mdi-account-outline"
                        }
                      />
                    )}
                    {nameOf(row)}
                  </Button>
                </li>
              ))}
            </ul>
          </>
        ) : state === "playing" ? (
          <div className="flex flex-wrap items-center gap-2">
            <span className="flex-1 text-sm">
              {checked.size}{" "}
              {checked.size === 1 ? "player plays" : "players play"}{" "}
              {legTitle(leg)}.{" "}
              {played
                ? "Every series has a result: finish the round to count its places."
                : "Finish the round once every series has a result."}
            </span>
            {!closed ? (
              <Button
                disabled={!played || busy === "finish"}
                onClick={() =>
                  work(
                    "finish",
                    () => store.finishLeg(event.id, leg.id),
                    onFinished,
                  )
                }
              >
                {busy === "finish" ? (
                  <Icon name="mdi-loading mdi-spin" />
                ) : (
                  <Icon name="mdi-flag-checkered" />
                )}
                Finish {legTitle(leg)}
              </Button>
            ) : null}
          </div>
        ) : (
          <div className="flex flex-wrap items-center gap-2">
            <span className="flex-1 text-sm">
              <Icon name="mdi-check-circle" className="mr-1 text-success" />
              {legTitle(leg)} is finished; its places count in the overall
              table.
              {legIndex < legs.length - 1
                ? " The next round seeds afresh from its own check-ins."
                : ""}
            </span>
            {!closed ? (
              <Button
                variant="outline"
                size="sm"
                disabled={busy === "reopen"}
                onClick={() =>
                  work(
                    "reopen",
                    () => store.reopenLeg(event.id, leg.id),
                    onFinished,
                  )
                }
              >
                <Icon name="mdi-lock-open-variant" />
                Reopen the round
              </Button>
            ) : null}
            {legIndex < legs.length - 1 ? (
              <Button size="sm" onClick={() => onLeg(legIndex + 1)}>
                {legTitle(legs[legIndex + 1])}
                <Icon name="mdi-arrow-right" />
              </Button>
            ) : null}
          </div>
        )}
      </div>
    </div>
  );
}
