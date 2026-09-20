/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { Icon } from "@/components/ui/Icon";
import { PlayerName } from "@/components/PlayerName";
import { StatusAlert } from "@/components/StatusAlert";
import { formatDateTime } from "@/helpers/datetime";

type Row = Record<string, any>;

const pairLine = (row: Row) => (
  <span className="flex flex-wrap items-center gap-2">
    <PlayerName player={row.player1} race={row.player1_race} plain />
    <span className="text-muted-foreground">vs</span>
    <PlayerName player={row.player2} race={row.player2_race} plain />
  </span>
);

/** The one ask before an admin publishes a draft, which names the series a replacement removes. */
export function PublishDraftDialog({
  drafts,
  replaced,
  lost,
  busy,
  error,
  onErrorClose,
  onConfirm,
  onCancel,
}: {
  drafts: Row[] | null; // null while the dialog is closed
  replaced?: Row | null; // the published series the one draft replaces, for its two names
  lost?: Row | null; // the replaces read: date_time, has_veto, has_result, has_replay
  busy: boolean;
  error?: string | null;
  onErrorClose: () => void;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  const rows = drafts || [];
  const replacement = rows.length === 1 && !!rows[0].replaces_series_id;
  const noun = rows.length === 1 ? "1 pairing" : `${rows.length} pairings`;
  const title = replacement ? `Publish ${rows[0].player1?.name} vs ${rows[0].player2?.name}?` : `Publish ${noun}?`;
  return (
    <Dialog open={!!drafts} onOpenChange={(open) => (open ? undefined : onCancel())}>
      <DialogContent showCloseButton={false} className="max-w-[600px] gap-0 p-0 sm:max-w-[600px]">
        <DialogTitle className="flex items-center gap-2 bg-primary px-4 py-3 text-on-primary">
          <Icon name="mdi-publish" />
          {title}
        </DialogTitle>
        <div className="p-4">
          {/* A failed replaces read keeps its message here, so closing the alert never brings the reading line back */}
          <StatusAlert modelValue={error} onClose={replacement && !lost ? undefined : onErrorClose} />
          {replacement ? (
            <>
              <p>It replaces this series, which is removed:</p>
              <div className="mt-2 border-t pt-2">{replaced ? pairLine(replaced) : <span className="text-muted-foreground">The series it replaces</span>}</div>
              <p className="mt-4">Removed with it:</p>
              {lost ? (
                <div className="mt-2 flex flex-col gap-1 border-t pt-2">
                  {lost.date_time ? (
                    <span className="flex items-center gap-2">
                      <Icon name="mdi-calendar" />
                      <span className="tnum">The booked time, {formatDateTime(lost.date_time)}</span>
                    </span>
                  ) : null}
                  {lost.has_veto ? (
                    <span className="flex items-center gap-2">
                      <Icon name="mdi-close" />
                      The map veto
                    </span>
                  ) : null}
                  {!lost.date_time && !lost.has_veto ? <span className="text-muted-foreground">No booked time and no map veto</span> : null}
                </div>
              ) : error ? (
                <p className="mt-2 text-sm text-muted-foreground">Cancel and open the confirm again to read what that series holds.</p>
              ) : (
                <p role="status" className="text-sm text-muted-foreground">Reading what that series holds…</p>
              )}
              <p className="mt-4 text-sm text-muted-foreground">
                The new series shows in &quot;Waiting for you&quot; for its two players; the removed series no longer lists.
              </p>
            </>
          ) : (
            <>
              <p className="tnum">
                The {rows.length * 2} players then see their series and can schedule it, veto maps and report the result. The pairings leave the draft.
              </p>
              <div className="mt-2 flex flex-col gap-1 border-t pt-2">{rows.map((row) => <span key={row.id}>{pairLine(row)}</span>)}</div>
            </>
          )}
        </div>
        <div className="flex justify-end gap-2 p-4 pt-0">
          <Button variant="ghost" onClick={onCancel}>
            Cancel
          </Button>
          {/* The replacement waits on the replaces read alone, so a failed read blocks the publish */}
          <Button disabled={busy || !rows.length || (replacement && !lost)} onClick={onConfirm}>
            <Icon name="mdi-publish" />
            {replacement ? "Publish and replace" : `Publish ${noun}`}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
