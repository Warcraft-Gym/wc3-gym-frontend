"use client";
import { Button } from "@/components/ui/button";
import { Icon } from "@/components/ui/Icon";
import { DEFAULT_ORDER, SORT_KEYS, moveEarlier, sortLabel } from "@/helpers/planner.mjs";
import { cn } from "@/lib/utils";

export type SortKey = "games" | "mmr" | "time" | "mmr1" | "mmr2";
export type SortOrder = { key: SortKey; dir: 1 | -1 }[];

/** The order of the matchup list on several criteria at once: a click on a criterion adds it to the
 *  sort, a second click turns it round, ◀ moves it one place earlier and × takes it out. The number is
 *  its priority. A team's MMR is named by that team. */
export function SortChips({ order, teams, onChange }: { order: SortOrder; teams: { team1: string; team2: string }; onChange: (next: SortOrder) => void }) {
  const labelOf = (key: SortKey, dir: 1 | -1) => sortLabel(key, dir, teams);
  const unused = (SORT_KEYS as SortKey[]).filter((key) => !order.some((one) => one.key === key));
  const changed = JSON.stringify(order) !== JSON.stringify(DEFAULT_ORDER);
  return (
    <div className="flex flex-wrap items-center gap-2" role="group" aria-label="Sort the matchups">
      <span className="text-sm font-medium">Sort by</span>
      {order.map(({ key, dir }, index) => (
        <span key={key} className="inline-flex items-center overflow-hidden rounded-full bg-primary text-on-primary">
          {index > 0 ? (
            <button
              type="button"
              className="inline-grid h-8 w-7 place-items-center border-r border-on-primary/25"
              aria-label={`Move ${labelOf(key, dir)} to place ${index}`}
              onClick={() => onChange(moveEarlier(order, key) as SortOrder)}
            >
              <Icon name="mdi-chevron-left" size={16} />
            </button>
          ) : null}
          <button
            type="button"
            className={cn("inline-flex h-8 items-center gap-1.5 pr-2 text-sm font-medium", index > 0 ? "pl-1" : "pl-1.5")}
            aria-label={`Sort ${index + 1}: ${labelOf(key, dir)}. Turn it round`}
            onClick={() => onChange(order.map((one) => (one.key === key ? { key, dir: dir === 1 ? -1 : 1 } : one)))}
          >
            <span className="inline-grid size-5 place-items-center rounded-full bg-on-primary text-[11px] text-primary tnum">{index + 1}</span>
            {labelOf(key, dir)}
          </button>
          <button
            type="button"
            className="inline-grid h-8 w-7 place-items-center border-l border-on-primary/25"
            aria-label={`Take ${labelOf(key, dir)} out of the sort`}
            onClick={() => onChange(order.filter((one) => one.key !== key))}
          >
            <Icon name="mdi-close" size={14} />
          </button>
        </span>
      ))}
      {unused.map((key) => (
        <Button key={key} variant="outline" size="sm" className="rounded-full" onClick={() => onChange([...order, { key, dir: 1 }])}>
          <Icon name="mdi-plus" size={14} />
          {labelOf(key, 1)}
        </Button>
      ))}
      {changed ? (
        <Button variant="link" size="sm" onClick={() => onChange(DEFAULT_ORDER as SortOrder)}>
          Reset
        </Button>
      ) : null}
    </div>
  );
}

export default SortChips;
