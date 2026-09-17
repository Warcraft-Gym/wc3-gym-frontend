"use client";
import { useCallback, useEffect, useState } from "react";
import { DateTime } from "luxon";
import { AchievementIcon } from "@/components/AchievementIcon";
import { ColumnNote } from "@/components/ColumnNote";
import { RaceIcon } from "@/components/RaceIcon";
import { StatusAlert } from "@/components/StatusAlert";
import { W3CIcon } from "@/components/W3CIcon";
import { W3CMmr } from "@/components/W3CMmr";
import { Icon } from "@/components/ui/Icon";
import { TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { MD_AND_UP, useBreakpoint } from "@/hooks/breakpoint";
import { useLadderStore } from "@/stores";
import { LadderPlots } from "./LadderPlots";
import { SCORED_NOTE, achievementPoints } from "@/helpers/achievements.js";
import { dayWindow, fillDays } from "@/helpers/ladder-days.mjs";
import { raceWrapper } from "@/helpers/races.js";
import { w3cPlayerUrl } from "@/helpers/w3c-stats.js";

/* eslint-disable @typescript-eslint/no-explicit-any */
type Badge = { id: string; name: string; description?: string; points: number; achieved_at?: string };

// the one subtitle of a sub block: MMR, versus race, achievements
const SUB = "mb-1 text-xs font-medium tracking-[0.0333em] text-muted-foreground";

// Stored in UTC, shown in the viewer's own time
const badgeDate = (iso?: string) => (iso ? DateTime.fromISO(iso, { zone: "utc" }).toLocal().toFormat("LLL d") : "");

/** One player's ladder record in one season: points, record, MMR, versus race and
 *  achievements. The matches themselves stay on W3Champions, linked beside the tiles */
export function PlayerLadderTab({ player, seasonId }: { player: any; seasonId: number }) {
  const mdAndUp = useBreakpoint(MD_AND_UP);
  const ladderStore = useLadderStore();

  const [data, setData] = useState<any>(null);
  const [seasonLadder, setSeasonLadder] = useState<any>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [showLocked, setShowLocked] = useState(false);

  useEffect(() => {
    let live = true;
    (async () => {
      try {
        const row = await ladderStore.userLadder(player.id, { seasonId });
        const season = ladderStore.ladders[seasonId] ?? (await ladderStore.seasonLadder(seasonId));
        if (!live) return;
        // a read that answers clears the message the last one left
        setErrorMessage(null);
        setData(row);
        setSeasonLadder(season);
      } catch (error) {
        if (!live) return;
        setData(null);
        setErrorMessage((error as Error).message);
      }
    })();
    return () => { live = false; };
    // the store's members are rebuilt every render, so the player and the season drive the read
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [player, seasonId]);

  // The MMR line fills whatever width the block has, on the page and in the side panel alike
  const [plotWidth, setPlotWidth] = useState(0);
  const plotBox = useCallback((el: HTMLDivElement) => {
    const observer = new ResizeObserver(([entry]) => setPlotWidth(Math.floor(entry.contentRect.width)));
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  const w3cStatsUrl = `${w3cPlayerUrl(player?.battleTag ?? "")}/statistics`;

  const games = data?.games ?? 0;
  const winrate = games ? `${Math.round((data.wins / games) * 100)}%` : "0%";

  // Where his MMR opened, its range and where it stands; absent until he plays
  const mmr = data?.mmr ?? {};
  const mmrChange = mmr.current != null && mmr.start != null ? mmr.current - mmr.start : 0;

  // One slot per day between his first and last ladder game, so the line reads as a calendar
  const window = dayWindow(data?.per_day);
  const mmrDays = window ? fillDays(data.per_day, window.start, window.end) : [];

  // The earned rules come with the player, the whole catalogue with the season
  const earned: Badge[] = data?.achievements ?? [];
  const achievedPoints = achievementPoints(earned);
  const ladderPoints = (data?.wins ?? 0) * 3 + (data?.losses ?? 0);

  const won = new Set(earned.map((badge) => badge.id));
  const locked: Badge[] = (seasonLadder?.achievement_rules ?? []).filter((rule: Badge) => !won.has(rule.id));

  // Most games first, so the races he meets most sit on top
  const vs = data?.vs_race ?? {};
  const versusRaces = ["HU", "OC", "NE", "UD", "RANDOM"]
    .map((code) => {
      const [w, l] = vs[code] ?? [0, 0];
      const total = w + l;
      return { code, name: raceWrapper.getRaceObject(code)?.name, w, l, total, rate: total ? Math.round((w / total) * 100) : 0 };
    })
    .filter((row) => row.total > 0)
    .sort((a, b) => b.total - a.total);

  return (
    // the block's own width, not the window's: the side panel is narrow on a wide screen
    <div className="@container">
      <StatusAlert modelValue={errorMessage} onClose={() => setErrorMessage(null)} />

      <section className="pb-4">
        <h4 className="mb-2 text-base font-medium">
          Ladder grind <span className="text-xs text-muted-foreground">{data?.points ?? 0} points</span>
        </h4>
        <div className="mb-3 flex flex-wrap items-start gap-x-10 gap-y-3 @max-[700px]:gap-x-6">
          <div>
            <div className="text-xs text-muted-foreground">
              <ColumnNote title="Ladder points" note={SCORED_NOTE} />
            </div>
            <div className="text-xl">{ladderPoints}</div>
            <div className="text-xs text-muted-foreground">3 per win, 1 per loss</div>
          </div>
          <div>
            <div className="text-xs text-muted-foreground">Achievement points</div>
            <div className="text-xl">{achievedPoints}</div>
            <div className="text-xs text-muted-foreground">
              {earned.length} earned, {locked.length} locked
            </div>
          </div>
          <div>
            <div className="text-xs text-muted-foreground">Record</div>
            <div className="text-xl">
              <span className="text-win">{data?.wins ?? 0}</span>
              <span className="text-muted-foreground"> &ndash; </span>
              <span className="text-loss">{data?.losses ?? 0}</span>
            </div>
            <div className="text-xs text-muted-foreground">
              {winrate} of {games} games
            </div>
          </div>
          {player?.battleTag ? (
            <a href={w3cStatsUrl} target="_blank" rel="noopener" className="ml-auto inline-flex items-center self-start text-xs">
              <W3CIcon size={14} className="mr-1" />
              W3Champions
            </a>
          ) : null}
        </div>

        {mmr.current != null ? (
          <div className="mb-4">
            <div className={SUB}>
              <W3CMmr />
            </div>
            <div className="flex flex-wrap items-center gap-3">
              <span className="text-xl">{mmr.current}</span>
              {mmrChange > 0 ? <span className="text-win">&#9650; {mmrChange}</span> : null}
              {mmrChange < 0 ? <span className="text-loss">&#9660; {-mmrChange}</span> : null}
              {mmr.min != null && mmr.max != null ? (
                <span className="text-xs text-muted-foreground">
                  Low {mmr.min} &middot; High {mmr.max}
                </span>
              ) : null}
            </div>
            <div ref={plotBox}>
              {plotWidth && mmrDays.length > 1 ? <LadderPlots days={mmrDays} games={false} width={plotWidth} /> : null}
            </div>
          </div>
        ) : null}

        <div className="grid grid-cols-2 gap-6 @max-[700px]:grid-cols-1 @max-[700px]:gap-3">
          <div>
            <div className={SUB}>Versus race</div>
            <div className="table-scroll overflow-x-auto">
              <table className="w-full caption-bottom text-sm">
                {versusRaces.length ? (
                  <TableHeader>
                    <TableRow>
                      <TableHead>Race</TableHead>
                      <TableHead className="text-right">Record</TableHead>
                      <TableHead />
                      <TableHead className="text-right">Rate</TableHead>
                      <TableHead className="text-right">Games</TableHead>
                    </TableRow>
                  </TableHeader>
                ) : null}
                <TableBody>
                  {!versusRaces.length ? (
                    <TableRow>
                      <TableCell className="text-xs text-muted-foreground">No ladder games yet.</TableCell>
                    </TableRow>
                  ) : null}
                  {versusRaces.map((row) => (
                    <TableRow key={row.code}>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <RaceIcon raceIdentifier={row.code} />
                          {row.name}
                        </div>
                      </TableCell>
                      <TableCell className="text-right whitespace-nowrap">
                        <span className="text-win">{row.w}</span> &ndash; <span className="text-loss">{row.l}</span>
                      </TableCell>
                      <TableCell className="w-[120px] @max-[700px]:w-[72px]">
                        <div className="h-[6px] overflow-hidden rounded-[3px] bg-[rgba(var(--v-theme-on-surface),0.12)]">
                          <div className="h-full rounded-[3px] bg-win" style={{ width: `${row.rate}%` }} />
                        </div>
                      </TableCell>
                      <TableCell className="text-right text-muted-foreground">{row.rate}%</TableCell>
                      <TableCell className="text-right text-muted-foreground">{row.total}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </table>
            </div>
          </div>
          <div>
            <div className={SUB}>Achievements</div>
            {earned.map((badge) => (
              <div key={badge.id} className="flex items-center border-b py-1">
                <AchievementIcon id={badge.id} className="mr-3 text-primary" />
                <span className="mr-3 text-sm font-medium">{badge.name}</span>
                {mdAndUp ? <span className="text-xs text-muted-foreground">{badge.description}</span> : null}
                <span className="ml-auto" />
                <span className="ml-3 text-xs whitespace-nowrap text-muted-foreground">{badgeDate(badge.achieved_at)}</span>
                <span className="ml-3 text-sm text-primary-text">+{badge.points}</span>
              </div>
            ))}
            {!earned.length ? <div className="text-xs text-muted-foreground">None earned yet.</div> : null}
            <button
              type="button"
              className="mt-2 mb-1 flex w-fit cursor-pointer items-center text-xs text-muted-foreground"
              onClick={() => setShowLocked((open) => !open)}
            >
              <span>Locked &middot; {locked.length}</span>
              <Icon name={showLocked ? "mdi-chevron-up" : "mdi-chevron-down"} size="1rem" className="ml-1" />
            </button>
            {showLocked
              ? locked.map((badge) => (
                  <div key={badge.id} className="flex items-center border-b py-1 text-muted-foreground">
                    <AchievementIcon id={badge.id} className="mr-3" />
                    <span className="mr-3 text-sm">{badge.name}</span>
                    {mdAndUp ? <span className="text-xs">{badge.description}</span> : null}
                    <span className="ml-auto" />
                    <span className="ml-3 text-sm">+{badge.points}</span>
                  </div>
                ))
              : null}
          </div>
        </div>
      </section>
    </div>
  );
}

export default PlayerLadderTab;
