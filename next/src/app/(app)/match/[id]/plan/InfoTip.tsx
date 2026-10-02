"use client";
import { Button } from "@/components/ui/button";
import { Icon } from "@/components/ui/Icon";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { toneClass } from "@/components/ui/tone";
import { cn } from "@/lib/utils";

/** What a step does, one click away for whoever wants it. */
export function InfoTip({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <Popover>
      <PopoverTrigger render={<Button variant="ghost" size="icon-sm" aria-label={`About ${label}`} className="text-muted-foreground" />}>
        <Icon name="mdi-information-outline" />
      </PopoverTrigger>
      <PopoverContent align="start" className="w-80 text-sm">
        {children}
      </PopoverContent>
    </Popover>
  );
}

/** A note on the state of the plan, in the `info` tone with its icon. */
export function Notice({ children }: { children: React.ReactNode }) {
  return (
    <div className={cn("flex flex-wrap items-center gap-2 rounded px-3 py-2", toneClass("info"))}>
      <Icon name="mdi-information" />
      {children}
    </div>
  );
}

export default InfoTip;
