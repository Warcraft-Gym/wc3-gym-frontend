"use client";
import { useState } from "react";
import { AchievementIcon } from "@/components/AchievementIcon";
import { Card, CardContent, CardTitle } from "@/components/ui/card";
import { Icon } from "@/components/ui/Icon";
import { TapTooltip } from "@/components/ui/TapTooltip";

/* eslint-disable @typescript-eslint/no-explicit-any */
type Rule = { id: string; name: string; description?: string; points: number };
type Row = Record<string, any>;

// A per-map badge (`map_win:<map>`) counts for its rule once per player
const earners = (rows: Row[], rule: Rule) => rows.filter((r) => r.achievements.some((a: { id: string }) => a.id.split(":")[0] === rule.id)).length;
const tile = (rule: Rule, rows: Row[], unit: string) => {
  const n = earners(rows, rule);
  const share = rows.length ? n / rows.length : 0;
  return { ...rule, share, caption: `${n} of ${rows.length} ${unit} · ${Math.round(100 * share)}%` };
};

/** Every badge the season pays, with its price and how many players earned it */
export function BadgeRarity({
  rules = [],
  teamRules = [],
  players = [],
  teams = [],
  first = 12,
}: {
  rules?: Rule[];
  teamRules?: Rule[];
  players?: Row[];
  teams?: Row[];
  first?: number;
}) {
  const [showAll, setShowAll] = useState(false);
  const active = players.filter((p) => (p.games ?? 0) > 0);
  const tiles = [
    ...rules.map((rule) => tile(rule, active, "players")),
    ...teamRules.map((rule) => tile(rule, teams, "teams")),
  ].sort((a, b) => b.points - a.points || a.share - b.share);
  const shown = showAll ? tiles : tiles.slice(0, first);

  return (
    <Card className="card mb-4 gap-0 py-0">
      <CardTitle className="flex items-center px-4 pt-3 pb-1 text-base font-normal">
        <Icon name="mdi-medal-outline" className="mr-2 text-sm" />
        <span>Badges</span>
        <span className="ml-2 text-xs text-muted-foreground">{tiles.length} rules &middot; rarest pay most</span>
      </CardTitle>
      <CardContent className="px-4 pt-0 pb-2">
        <div className="grid grid-cols-[repeat(auto-fill,minmax(230px,1fr))] gap-x-4 gap-y-2">
          {shown.map((tile) => (
            <TapTooltip key={tile.id} className="flex items-start border-b py-1.5" content={tile.description}>
              <AchievementIcon id={tile.id} size={22} className="mr-2 text-primary" />
              <span className="min-w-0 flex-1">
                <span className="flex items-baseline gap-1.5">
                  <span className="truncate text-sm font-medium">{tile.name}</span>
                  <span className="text-sm text-primary-text">+{tile.points}</span>
                </span>
                {/* One hue: the width is the share of players who earned it */}
                <span className="my-1 mb-0.5 block h-1 rounded-sm bg-on-surface/8">
                  <span className="block h-full min-w-0 rounded-r-sm bg-primary" style={{ width: `${100 * tile.share}%` }} />
                </span>
                <span className="block text-xs text-muted-foreground">{tile.caption}</span>
              </span>
            </TapTooltip>
          ))}
        </div>
        <button type="button" className="mt-2 w-fit cursor-pointer text-xs text-muted-foreground" onClick={() => setShowAll(!showAll)}>
          {showAll ? "Fewer" : `All ${tiles.length} badges`}
          <Icon name={showAll ? "mdi-chevron-up" : "mdi-chevron-down"} className="ml-1 text-sm" />
        </button>
      </CardContent>
    </Card>
  );
}

export default BadgeRarity;
