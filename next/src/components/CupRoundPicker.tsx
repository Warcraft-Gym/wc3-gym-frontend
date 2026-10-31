"use client";
import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Icon } from "@/components/ui/Icon";
import { toneClass } from "@/components/ui/tone";
import { dateRange } from "@/helpers/event-labels.mjs";
import { legTitle } from "@/helpers/cup-rounds.mjs";
import { checkinOpenNow } from "@/helpers/checkin-window.mjs";
import { missing } from "@/helpers/cup-teams.mjs";
import { useEventStore } from "@/stores";
import { cn } from "@/lib/utils";

/* eslint-disable @typescript-eslint/no-explicit-any */
type Row = Record<string, any>;

const dateRange_ = dateRange as (event: Row) => string;

/** The rounds of a cup played over rounds, over its draw on the event page: which round the draw
 *  shows, and the player's own check-in for it. A round is drawn with the players checked in for
 *  it, so the check-in closes at its draw. */
export function CupRoundPicker({
  event,
  legs,
  legIndex,
  onLeg,
  entry,
  drawn,
  onLegs,
  onError,
}: {
  event: Row;
  legs: Row[];
  legIndex: number;
  onLeg: (index: number) => void;
  // the viewer's own playing entry, one on the waitlist too, or null
  entry: Row | null;
  // the round shown holds its draw
  drawn: boolean;
  onLegs: (legs: Row[]) => void;
  onError: (message: string) => void;
}) {
  const store = useEventStore();
  const [busy, setBusy] = useState(false);
  const leg = legs[legIndex];
  if (!leg) return null;
  const checkedIn = !!entry && (leg.checked_in || []).includes(entry.id);
  // a cup team checks in once every invited player has accepted
  const short = !!entry && !!event.team_size && missing(entry, event.team_size) > 0;
  const open = !!entry && !short && !drawn && !leg.finished_at && !event.closed_at && !event.cancelled_at && checkinOpenNow(leg, !!event.early_checkin);

  const toggle = async () => {
    setBusy(true);
    try {
      onLegs(checkedIn ? await store.checkOutLeg(event.id, leg.id) : await store.checkInLeg(event.id, leg.id));
    } catch (e) {
      onError((e as Error).message || "That did not go through");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="mb-4 flex flex-col gap-3">
      <div role="tablist" aria-label="Rounds" className="flex gap-2 overflow-x-auto">
        {legs.map((one, index) => (
          <button
            key={one.id}
            type="button"
            role="tab"
            aria-selected={index === legIndex}
            onClick={() => onLeg(index)}
            className={cn("flex min-h-11 flex-none flex-col items-start rounded-md border-2 px-3 py-1 text-left", index === legIndex ? "border-primary bg-primary/10" : "border-border")}
          >
            <span className="font-bold">{legTitle(one)}</span>
            <span className="text-xs text-muted-foreground">{one.finished_at ? "Finished" : dateRange_({ starts_at: one.starts_at }) || "No time yet"}</span>
          </button>
        ))}
      </div>
      {entry && !leg.finished_at ? (
        <div className={cn("flex flex-wrap items-center gap-3 rounded-lg border p-3", checkedIn ? "border-border" : "border-primary/60")}>
          {checkedIn ? (
            <Badge className={toneClass("success")}>
              <Icon name="mdi-check" />
              Checked in for {legTitle(leg)}
            </Badge>
          ) : (
            <span className="flex-1 text-sm">
              {open && entry.waitlisted_at
                ? `You are on the waitlist. Check in for ${legTitle(leg)} anyway: if a place frees up, the organizers can add you before it is drawn.`
                : open
                ? `Playing ${legTitle(leg)}? Check in before it is drawn; the draw takes the players checked in.`
                : short
                  ? `Your team checks in for ${legTitle(leg)} once every player has accepted their invitation.`
                  : `You are not checked in for ${legTitle(leg)}.`}
            </span>
          )}
          {open ? (
            <Button size="sm" variant={checkedIn ? "outline" : "default"} disabled={busy} onClick={toggle}>
              <Icon name={busy ? "mdi-loading mdi-spin" : checkedIn ? "mdi-close" : "mdi-check"} />
              {checkedIn ? "Check out" : `Check in for ${legTitle(leg)}`}
            </Button>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
