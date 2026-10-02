/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";
import { W3CIcon } from "@/components/W3CIcon";
import { TapTooltip } from "@/components/ui/TapTooltip";
import { getW3CMMR, syncedAgo, syncedAt } from "@/helpers/w3c-stats";

export type Row = Record<string, any>;

/** The MMR of one race: the entry's MMR; list payloads carry live entries only. */
export const mmrOf = (player: Row | undefined | null, race?: string | null) => getW3CMMR(player as Row, race as string);

/** The W3C data line: the mark and the synced time, with the exact time on tap. */
export function SyncedLine({ player }: { player?: Row | null }) {
  // syncedAgo already words the never case, so only a real time takes the verb
  const ago = syncedAgo(player as Row);
  return (
    <TapTooltip className="inline-flex items-center gap-1 whitespace-nowrap text-xs text-muted-foreground" content={syncedAt(player as Row)}>
      <W3CIcon size={14} />
      {ago === "never synced" ? ago : `synced ${ago}`}
    </TapTooltip>
  );
}
