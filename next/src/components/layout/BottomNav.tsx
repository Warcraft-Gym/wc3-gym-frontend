"use client";
import { useState } from "react";
import Link from "next/link";
import { Sheet, SheetContent, SheetTitle } from "@/components/ui/sheet";
import { Icon } from "@/components/ui/Icon";
import { isActive } from "@/helpers/nav-model.mjs";
import { cn } from "@/lib/utils";

type Tab = { key: string; title: string; icon: string; to: string | null };
type Team = { title: string; to: string; captain: boolean };

const TAB = "flex min-h-14 flex-col items-center justify-center gap-0.5 px-1 text-xs text-muted-foreground no-underline";
const ON = "text-primary-text font-medium";

/** The phone's tab bar: Home, My Team, Season and More, in thumb reach at the bottom of the screen.
 *  My Team opens a picker when the person has more than one team; More opens the drawer. Above
 *  960 px the top bar carries the links instead, so this bar is hidden there by CSS. */
export function BottomNav({ tabs, teams, path, onMore }: { tabs: Tab[]; teams: Team[]; path: string; onMore: () => void }) {
  const [picker, setPicker] = useState(false);
  const teamActive = teams.some((team) => isActive(team.to, path));

  return (
    <>
      <nav aria-label="Main" className="fixed inset-x-0 bottom-0 z-40 border-t border-border bg-surface pb-[env(safe-area-inset-bottom)] min-[960px]:hidden">
        <ul className="grid" style={{ gridTemplateColumns: `repeat(${tabs.length}, minmax(0, 1fr))` }}>
          {tabs.map((tab) => {
            const active = tab.key === "team" ? teamActive : tab.to ? isActive(tab.to, path) : false;
            const body = (
              <>
                <Icon name={tab.icon} className="text-xl" />
                {tab.title}
              </>
            );
            return (
              <li key={tab.key}>
                {tab.to ? (
                  <Link href={tab.to} aria-current={active ? "page" : undefined} className={cn(TAB, active && ON)}>{body}</Link>
                ) : (
                  <button type="button" onClick={tab.key === "team" ? () => setPicker(true) : onMore} className={cn(TAB, "w-full", active && ON)}>{body}</button>
                )}
              </li>
            );
          })}
        </ul>
      </nav>

      <Sheet open={picker} onOpenChange={setPicker}>
        <SheetContent side="bottom" className="p-4 pb-[calc(1rem+env(safe-area-inset-bottom))]">
          <SheetTitle>My Teams</SheetTitle>
          <ul className="flex flex-col gap-1">
            {teams.map((team) => (
              <li key={team.to}>
                <Link href={team.to} onClick={() => setPicker(false)} className="flex min-h-12 items-center gap-3 rounded px-2 text-foreground no-underline hover:bg-accent">
                  <Icon name={team.captain ? "mdi-star-circle-outline" : "mdi-shield-outline"} />
                  <span className="flex-1">{team.title}</span>
                  {team.captain ? <span className="text-xs text-muted-foreground">Captain</span> : null}
                </Link>
              </li>
            ))}
          </ul>
        </SheetContent>
      </Sheet>
    </>
  );
}
