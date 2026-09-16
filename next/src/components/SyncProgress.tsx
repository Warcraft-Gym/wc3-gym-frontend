"use client";
import { useState } from "react";
import { Progress, ProgressLabel } from "@/components/ui/progress";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { useLadder } from "@/stores";

/** The bar a season sync fills, and the caption the page reads while no sync runs. */
export function SyncProgress({ caption = "", stamp = "" }: { caption?: string; stamp?: string }) {
  const { syncProgress } = useLadder();
  const [open, setOpen] = useState(false);

  if (syncProgress?.total)
    return (
      <Progress value={(syncProgress.done / syncProgress.total) * 100}>
        <ProgressLabel className="text-xs font-normal">
          syncing {syncProgress.done} of {syncProgress.total} players
        </ProgressLabel>
      </Progress>
    );
  if (!caption) return null;
  return (
    <Tooltip open={open} onOpenChange={setOpen}>
      {/* a tap opens it as well as a hover, so the stamp is reachable on a phone */}
      <TooltipTrigger render={<button type="button" className="text-xs text-muted-foreground" onClick={() => setOpen((o) => !o)} />}>{caption}</TooltipTrigger>
      <TooltipContent>{stamp}</TooltipContent>
    </Tooltip>
  );
}

export default SyncProgress;
