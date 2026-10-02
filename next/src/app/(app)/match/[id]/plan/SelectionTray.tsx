"use client";
import { Button } from "@/components/ui/button";
import { Icon } from "@/components/ui/Icon";
import { PlayerName } from "@/components/PlayerName";

/* eslint-disable @typescript-eslint/no-explicit-any */
type Row = Record<string, any>;

export type SelectionEntry = { key: string; a: Row; b: Row; difference: number; note: string | null };

/** The matchups the viewer selected in the planner and has not moved into the draft yet. Only the
 *  viewer sees them; "Move to draft" writes them all in one run. */
export function SelectionTray({
  entries,
  busy,
  onRemove,
  onClear,
  onMove,
  onPlayer,
}: {
  entries: SelectionEntry[];
  busy: boolean;
  onRemove: (key: string) => void;
  onClear: () => void;
  onMove: () => void;
  onPlayer: (id: number) => void;
}) {
  if (!entries.length) {
    return <p className="text-sm text-muted-foreground">Select the matchups that make sense. They wait in your selection until you move them into the draft.</p>;
  }
  return (
    <section aria-label="Your selection" className="flex flex-col gap-2 rounded-lg border border-primary/40 bg-primary/5 p-3">
      <div className="flex flex-wrap items-baseline gap-x-2">
        <h4 className="text-sm font-medium tnum">Your selection · {entries.length}</h4>
        <span className="text-xs text-muted-foreground">Only you see it until you move it into the draft.</span>
      </div>
      <ul className="divide-y">
        {entries.map((entry) => (
          <li key={entry.key} className="flex flex-wrap items-center gap-x-2 gap-y-1 py-1.5">
            <PlayerName player={entry.a} race={entry.a.race} mmr={entry.a.mmr ?? null} onClick={() => onPlayer(entry.a.user_id)} />
            <span className="text-muted-foreground">vs</span>
            <PlayerName player={entry.b} race={entry.b.race} mmr={entry.b.mmr ?? null} onClick={() => onPlayer(entry.b.user_id)} />
            <span className="tnum text-sm text-muted-foreground">{Number.isFinite(entry.difference) ? `${entry.difference} MMR difference` : "no MMR difference"}</span>
            {entry.note ? <span className="text-sm text-info">{entry.note}</span> : null}
            <span className="grow" />
            <Button variant="ghost" size="icon-sm" aria-label={`Remove ${entry.a.name} vs ${entry.b.name} from your selection`} onClick={() => onRemove(entry.key)}>
              <Icon name="mdi-close" />
            </Button>
          </li>
        ))}
      </ul>
      <div className="flex flex-wrap items-center justify-end gap-2">
        <Button variant="ghost" size="sm" onClick={onClear}>
          Clear
        </Button>
        <Button disabled={busy} onClick={onMove}>
          <Icon name="mdi-arrow-down-bold" />
          Move {entries.length} to draft
        </Button>
      </div>
    </section>
  );
}

export default SelectionTray;
