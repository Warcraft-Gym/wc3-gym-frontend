"use client";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { AvailabilityCalendar } from "@/components/AvailabilityCalendar";

/* eslint-disable @typescript-eslint/no-explicit-any */
type Row = Record<string, any>;
export type Loaded = { state: "loading" } | { state: "ok"; data: Row } | { state: "error"; message: string };

/** When the two players of one matchup can play: the week of the round with each player's blocked
 *  hours and the hours both are free. The free time is read once per pair, by the caller. */
export function PairTimeDialog({ row, free, onClose, onRetry }: { row: Row | null; free?: Loaded; onClose: () => void; onRetry: () => void }) {
  return (
    <Dialog open={!!row} onOpenChange={(open) => (!open ? onClose() : undefined)}>
      <DialogContent className="max-h-[90vh] overflow-y-auto md:max-w-4xl">
        {row ? (
          <>
            <DialogHeader>
              <DialogTitle>
                When can {row.a.name} and {row.b.name} play?
              </DialogTitle>
              <DialogDescription className="tnum">
                {row.hoursKnown ? `${Math.round(row.hours)} h free for both in this round` : "The hours count only once both players entered availability."}
                {row.tzWarn ? ` · ${row.tzGap} h apart` : ""}
              </DialogDescription>
            </DialogHeader>
            {row.neitherEntered ? (
              <p className="text-sm text-muted-foreground">Neither player entered availability, so every hour counts as free.</p>
            ) : !free || free.state === "loading" ? (
              <p role="status" className="text-sm text-muted-foreground">
                Loading the blocked hours
              </p>
            ) : free.state === "error" ? (
              <p className="text-sm text-error">
                The blocked hours did not load: {free.message}{" "}
                <Button variant="link" size="sm" onClick={onRetry}>
                  Try again
                </Button>
              </p>
            ) : (
              <AvailabilityCalendar
                freeTime={free.data}
                players={[
                  { name: row.a.name, zone: row.a.timezone, entered: !!row.a.availability_entered },
                  { name: row.b.name, zone: row.b.timezone, entered: !!row.b.availability_entered },
                ]}
              />
            )}
          </>
        ) : null}
      </DialogContent>
    </Dialog>
  );
}

export default PairTimeDialog;
