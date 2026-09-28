"use client";
import { Button } from "@/components/ui/button";
import { Icon } from "@/components/ui/Icon";
import { SM_AND_DOWN, useBreakpoint } from "@/hooks/breakpoint";

export type BulkAction = "signup" | "sync" | "delete";
export type BulkBusy = { action: BulkAction; step: number; total: number } | null;

const RUNNING: Record<BulkAction, string> = { signup: "Adding", sync: "Syncing", delete: "Deleting" };

/** What an admin can do with the ticked players: add them to a season, sync them from W3Champions,
 *  or delete them. It shows only while a player is ticked. On a computer it sits above the table; on
 *  a phone it is fixed above the tab bar, in thumb reach. */
export function PlayerBulkBar({ count, busy, onSignup, onSync, onDelete, onClear }: {
  count: number;
  busy: BulkBusy;
  onSignup: () => void;
  onSync: () => void;
  onDelete: () => void;
  onClear: () => void;
}) {
  const phone = useBreakpoint(SM_AND_DOWN);
  const label = (action: BulkAction, idle: string) => (busy?.action === action ? `${RUNNING[action]} ${busy.step + 1} of ${busy.total}…` : idle);
  const icon = (action: BulkAction, idle: string) => (busy?.action === action ? "mdi-loading mdi-spin" : idle);
  const size = phone ? "lg" : "default";
  const summary = `${count} ${count === 1 ? "player" : "players"} selected`;

  const actions = <>
    <Button size={size} disabled={!!busy} onClick={onSignup}><Icon name={icon("signup", "mdi-account-check")} />{label("signup", phone ? "Season" : "Add to season")}</Button>
    <Button variant="outline" size={size} disabled={!!busy} onClick={onSync}><Icon name={icon("sync", "mdi-sync")} />{label("sync", phone ? "Sync" : "Sync W3C")}</Button>
    <Button variant="destructive" size={size} disabled={!!busy} onClick={onDelete}><Icon name={icon("delete", "mdi-delete")} />{label("delete", "Delete")}</Button>
  </>;
  const clear = <Button variant="ghost" size={phone ? "icon" : "default"} aria-label="Clear selection" disabled={!!busy} onClick={onClear}><Icon name="mdi-close" />{phone ? null : "Clear"}</Button>;

  if (phone) {
    // the tab bar is 3.5rem tall plus the safe area, so the bar sits right on top of it
    return <div role="region" aria-label="Selected players" className="fixed inset-x-0 bottom-[calc(3.5rem+env(safe-area-inset-bottom))] z-30 border-t border-border bg-surface px-4 py-2 shadow-lg">
      <div className="flex items-center justify-between"><span className="text-sm font-medium"><Icon name="mdi-checkbox-marked" className="mr-1 text-primary-text" />{summary}</span>{clear}</div>
      <div className="grid grid-cols-3 gap-2 pt-1 [&>button]:w-full">{actions}</div>
    </div>;
  }
  return <div role="region" aria-label="Selected players" className="sticky top-0 z-10 flex flex-wrap items-center gap-2 border-b border-border bg-surface px-4 py-2">
    <span className="mr-2 text-sm font-medium"><Icon name="mdi-checkbox-marked" className="mr-1 text-primary-text" />{summary}</span>
    {actions}
    <span className="ml-auto">{clear}</span>
  </div>;
}

/** The room the phone bar takes, so the last row and the pager scroll clear of it. */
export const PHONE_BAR_SPACE = "h-28 min-[960px]:hidden";
