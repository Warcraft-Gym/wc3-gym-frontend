"use client";
import { useState } from "react";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";

/** A tooltip a tap opens as well as a hover, so the text is reachable on a phone. */
export function TapTooltip({ children, content, className }: { children: React.ReactNode; content: React.ReactNode; className?: string }) {
  const [open, setOpen] = useState(false);
  return (
    <Tooltip open={open} onOpenChange={setOpen}>
      <TooltipTrigger render={<span className={className} onClick={() => setOpen((o) => !o)}>{children}</span>} />
      <TooltipContent>{content}</TooltipContent>
    </Tooltip>
  );
}

export default TapTooltip;
