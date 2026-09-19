"use client";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Icon } from "@/components/ui/Icon";

type SyncResult = {
  synced?: unknown[];
  skipped?: unknown[];
  failed?: { id: number | string; name: string; battleTag?: string | null; reason: string }[];
  total?: number;
};

export type SyncEntry = { title: string; result?: SyncResult; error?: { message: string } };

// The total counts every player the run touched, so a failure does not look like a missing sync
const syncLine = (result: SyncResult) => {
  const synced = result.synced?.length ?? 0;
  const skipped = result.skipped?.length ?? 0;
  const failed = result.failed?.length ?? 0;
  const total = result.total ?? synced + skipped + failed;
  return `${synced} of ${total} synced · ${skipped} skipped · ${failed} failed`;
};

/** What one W3C sync run did, one entry per team or season. */
export function W3CSyncResultDialog({
  modelValue = false,
  entries = [],
  onUpdateModelValue,
}: {
  modelValue?: boolean;
  entries?: SyncEntry[]; // one entry per team or season: { title, result } or { title, error }
  onUpdateModelValue?: (open: boolean) => void;
}) {
  return (
    <Dialog open={modelValue} onOpenChange={(open) => onUpdateModelValue?.(open)}>
      <DialogContent showCloseButton={false} className="max-w-[560px] gap-0 p-0 sm:max-w-[560px]">
        <DialogTitle className="flex items-center gap-2 bg-primary px-4 py-3 text-on-primary">
          <Icon name="mdi-sync" />
          W3C sync results
        </DialogTitle>
        <div className="p-4">
          {entries.map((entry, i) => (
            <div key={i} className="mb-3">
              <strong>{entry.title}</strong>
              {entry.error ? (
                <div className="text-error">{entry.error.message}</div>
              ) : entry.result ? (
                <div>
                  <div>{syncLine(entry.result)}</div>
                  {(entry.result.failed ?? []).map((f) => (
                    <div key={f.id} className="text-xs text-error">
                      {f.name} ({f.battleTag || "no BattleTag"}): {f.reason}
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-muted-foreground">Sync ongoing</div>
              )}
            </div>
          ))}
        </div>
        <div className="flex justify-end p-4 pt-0">
          <Button onClick={() => onUpdateModelValue?.(false)}>OK</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export default W3CSyncResultDialog;
