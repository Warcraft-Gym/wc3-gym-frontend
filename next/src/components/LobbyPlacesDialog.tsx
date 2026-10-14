"use client";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { Icon } from "@/components/ui/Icon";
import { Input } from "@/components/ui/input";
import { Pick } from "@/components/ui/Pick";
import { PlayerName } from "@/components/PlayerName";
import { StatusAlert } from "@/components/StatusAlert";
import { CupTeamName } from "@/components/CupTeamName";
import { isScored, lobbySeats } from "@/helpers/stage-view.mjs";
import { cn } from "@/lib/utils";

/* eslint-disable @typescript-eslint/no-explicit-any */
type Row = Record<string, any>;

const seatsOf = lobbySeats as (row: Row) => Row[];
const scoredOf = isScored as (row: Row | null) => boolean;

/** Where every seat of a free for all lobby finished: the order is the result, best place first.
 *  A seat drags to its place, or takes a typed place committed on Enter or on leaving the field,
 *  which works on a phone too. A player of the lobby and a runner use it alike; the run page adds
 *  the runner's map change, the clear of a played lobby and the move of a seat to another lobby. */
export function LobbyPlacesDialog({
  lobby,
  title = "Enter the places",
  open,
  onOpenChange,
  saving,
  error,
  onError,
  onSave,
  maps,
  onMap,
  onClear,
  onMove,
}: {
  lobby: Row;
  title?: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  saving: boolean;
  error: string | null;
  onError: (message: string | null) => void;
  onSave: (places: { side_no: number; place: number }[]) => void;
  // a runner's extras: the cup's pool to change the map from, the clear, the move of a seat
  maps?: Row[];
  onMap?: (mapId: number) => void;
  onClear?: () => void;
  onMove?: (seat: Row) => void;
}) {
  const [order, setOrder] = useState<Row[]>(() => seatsOf(lobby));
  const [dragFrom, setDragFrom] = useState<number | null>(null);
  const played = scoredOf(lobby);
  const empty = order.filter((seat) => !seat.entrant_id).length;
  // a lobby seats two entrants or more, so the third seat is the first one free to leave
  const movable = !!onMove && !played && order.filter((seat) => seat.entrant_id).length > 2;
  const nameOf = (seat: Row) => seat.team?.name || seat.user?.name || `seat ${seat.side_no}`;

  const move = (from: number | null, to: number) => {
    if (from == null || from === to || to < 0 || to >= order.length) return;
    const rows = [...order];
    rows.splice(to, 0, ...rows.splice(from, 1));
    setOrder(rows);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent showCloseButton={false} size="md" className="gap-0 p-0">
        <DialogTitle className="banner bg-banner px-4 py-3 text-primary">{title}</DialogTitle>
        <div className="flex max-h-[80vh] flex-col gap-3 overflow-y-auto p-4">
          <StatusAlert modelValue={error} onClose={() => onError(null)} />
          <div className="flex flex-wrap items-center gap-2 text-sm">
            <Icon name="mdi-map-outline" className="text-muted-foreground" />
            {maps && onMap && !played ? (
              <Pick
                labelAfter
                className="min-w-[220px]"
                label="Map"
                items={maps.map((one) => ({ value: one.id, title: one.name }))}
                value={lobby.lobby_map?.id ?? null}
                onChange={(value) => value && value !== lobby.lobby_map?.id && onMap(value as number)}
              />
            ) : (
              <span>
                Played on <strong>{lobby.lobby_map?.name ?? "a map the organizers name"}</strong>
              </span>
            )}
          </div>
          <p className="text-muted-foreground">The order is the result, the winner first: drag a player to a place, or type the place and press Enter.</p>
          <ol>
            {order.map((seat, index) => (
              <li
                key={seat.side_no}
                className={cn("flex items-center gap-2.5 border-t py-1 first:border-t-0", dragFrom === index && "opacity-50")}
                draggable={!saving}
                onDragStart={() => setDragFrom(index)}
                onDragEnd={() => setDragFrom(null)}
                onDragOver={(e) => e.preventDefault()}
                onDrop={() => move(dragFrom, index)}
              >
                <Icon name="mdi-drag-horizontal-variant" size={18} className="cursor-grab text-muted-foreground" />
                <Input
                  // the box reads its place again whenever it is not being typed into
                  ref={(el) => {
                    if (el && document.activeElement !== el) el.value = String(index + 1);
                  }}
                  type="text"
                  inputMode="numeric"
                  pattern="[0-9]*"
                  className="tnum h-9 w-12 px-1 text-center"
                  aria-label={`Place of ${nameOf(seat)}`}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") e.currentTarget.blur();
                    if (e.key === "Escape") {
                      e.currentTarget.value = String(index + 1);
                      e.currentTarget.blur();
                    }
                  }}
                  onBlur={(e) => {
                    // an emptied field or a word puts the place back and moves nobody
                    const typed = e.target.value.trim();
                    e.target.value = String(index + 1);
                    if (/^\d+$/.test(typed)) move(index, Math.min(Math.max(Number(typed), 1), order.length) - 1);
                  }}
                />
                {seat.team ? (
                  <span className="flex min-w-0 flex-col">
                    <CupTeamName team={seat.team} />
                    <span className="truncate text-xs text-muted-foreground">{(seat.players || []).map((one: Row) => one.name).join(", ")}</span>
                  </span>
                ) : seat.user ? (
                  <PlayerName player={seat.user} plain />
                ) : (
                  <span className="text-muted-foreground">Empty seat</span>
                )}
                <span className="flex-1" />
                {movable && seat.entrant_id ? (
                  <Button variant="ghost" size="sm" disabled={saving} onClick={() => onMove!(seat)}>
                    Move
                  </Button>
                ) : null}
              </li>
            ))}
          </ol>
          {empty ? (
            <p className="text-xs text-muted-foreground">This lobby seats nobody yet in {empty} of its places. It fills when the round before it is played.</p>
          ) : null}
          <div className="flex flex-wrap items-center justify-end gap-2">
            {onClear && played ? (
              <Button variant="ghost" className="text-error" disabled={saving} onClick={onClear}>
                <Icon name="mdi-backspace-outline" />
                Clear the places
              </Button>
            ) : null}
            <span className="flex-1" />
            <Button variant="ghost" disabled={saving} onClick={() => onOpenChange(false)}>
              Close
            </Button>
            <Button disabled={!!empty || saving} onClick={() => onSave(order.map((seat, index) => ({ side_no: seat.side_no, place: index + 1 })))}>
              <Icon name={saving ? "mdi-loading mdi-spin" : "mdi-content-save"} />
              {played ? "Save the corrected places" : "Save places"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
