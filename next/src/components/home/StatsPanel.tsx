"use client";
import Link from "next/link";
import { AchievementIcon } from "@/components/AchievementIcon";
import { Skeleton } from "@/components/ui/skeleton";
import { HomePanel, Quiet } from "@/components/home/HomePanel";

/* eslint-disable @typescript-eslint/no-explicit-any */
type Row = Record<string, any>;

type Summary = { seasons: number | null; thisSeason: number | null; overall: number | null; top3: Row[]; complete: boolean; score: number | null };

/** One figure: the number large, its words small under it. A figure still on its way is a skeleton. */
function Figure({ value, label }: { value: number | null | undefined; label: string }) {
  return (
    <div className="flex flex-col">
      {value === undefined ? <Skeleton className="skeleton h-7 w-10" /> : <span className="tnum text-2xl font-bold">{value ?? "–"}</span>}
      <span className="text-xs text-muted-foreground">{label}</span>
    </div>
  );
}

/** The member's own facts at a glance: how many GNL seasons he played, his achievements this season
 *  and overall, the best three of this season, and his GNL points this season. Its title bar leads
 *  to his profile.
 *  A figure is undefined while its read is out, and null when there is none. */
export function StatsPanel({ summary, seasonName, to, order }: { summary: Partial<Summary>; seasonName: string | null; to: string; order: number }) {
  const top3 = summary.top3 ?? [];
  return (
    <HomePanel icon="mdi-account-star-outline" title="My Stats" order={order} action={<Link href={to} className="text-on-banner underline">Go to Profile</Link>}>
      <div className="grid grid-cols-2 gap-4">
        <Figure value={summary.seasons} label="Seasons played" />
        <Figure value={summary.score} label={seasonName ? `Points in ${seasonName}` : "Points this season"} />
        <Figure value={summary.thisSeason} label="Achievements this season" />
        <Figure value={summary.overall} label="Achievements overall" />
      </div>

      {top3.length ? (
        <div className="mt-4">
          <span className="block text-xs font-medium tracking-wide text-muted-foreground">Best achievements this season</span>
          <ul className="mt-1 flex flex-col gap-1.5">
            {top3.map((badge) => (
              <li key={badge.id} className="flex items-center gap-2">
                <AchievementIcon id={badge.id} size={20} className="text-primary-text" />
                <span className="flex-1">{badge.name}</span>
                <span className="tnum text-sm text-muted-foreground">+{badge.points}</span>
              </li>
            ))}
          </ul>
        </div>
      ) : summary.thisSeason === 0 ? (
        <Quiet>No achievement earned this season yet. Play ladder games to earn them.</Quiet>
      ) : null}
      {summary.complete === false ? <Quiet>Some seasons could not be loaded, so a count may be short.</Quiet> : null}

    </HomePanel>
  );
}
