"use client";
import { Button } from "@/components/ui/button";
import { Icon } from "@/components/ui/Icon";
import { DEFAULT_ORDER, SORT_KEYS, SORT_LABELS } from "@/helpers/planner.mjs";
import { cn } from "@/lib/utils";

export type SortKey = "games" | "mmr" | "time";
export type SortOrder = { key: SortKey; dir: 1 | -1 }[];

const labelOf = (key: SortKey, dir: 1 | -1) => SORT_LABELS[key][dir === 1 ? 0 : 1];

/** The order of the matchup list on several criteria at once: a click on a criterion adds it to the
 *  sort, a second click turns it round, and × takes it out. The number is its priority. */
export function SortChips({ order, onChange }: { order: SortOrder; onChange: (next: SortOrder) => void }) {
  const unused = (SORT_KEYS as SortKey[]).filter((key) => !order.some((one) => one.key === key));
  const changed = JSON.stringify(order) !== JSON.stringify(DEFAULT_ORDER);
  return (
    <div className="flex flex-wrap items-center gap-2" role="group" aria-label="Sort the matchups">
      <span className="text-sm font-medium">Sort by</span>
      {order.map(({ key, dir }, index) => (
        <span key={key} className="inline-flex items-center overflow-hidden rounded-full bg-primary text-on-primary">
          <button
            type="button"
            className="inline-flex h-8 items-center gap-1.5 pr-2 pl-1.5 text-sm font-medium"
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
        <Button key={key} variant="outline" size="sm" className={cn("rounded-full")} onClick={() => onChange([...order, { key, dir: 1 }])}>
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
