"use client";
import { Icon } from "@/components/ui/Icon";
import { cn } from "@/lib/utils";

/* eslint-disable @typescript-eslint/no-explicit-any */

/** A cup team as its name beside one placeholder icon every cup team shares. A cup team lives
 *  for its one cup in a table of its own, so it carries no logo and links to no team page: the
 *  GNL team pages are for league teams alone. */
export function CupTeamName({ team, className }: { team: { name?: string | null } & Record<string, any>; className?: string }) {
  const label = team?.name;
  if (!label) return null;
  return (
    <span className={cn("team-name inline-flex min-w-0 items-center gap-1.5", className)}>
      <span className="inline-flex size-6 shrink-0 items-center justify-center rounded-full bg-primary/15 text-primary-text" aria-hidden="true">
        <Icon name="mdi-account-group" size={14} />
      </span>
      {/* a long name truncates, so it cannot widen a bracket box or a phone column */}
      <span className="name min-w-0 truncate" title={label}>
        {label}
      </span>
    </span>
  );
}

export default CupTeamName;
