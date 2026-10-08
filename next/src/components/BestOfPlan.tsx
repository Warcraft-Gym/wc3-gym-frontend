"use client";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { BEST_OFS, partsOf } from "@/helpers/best-of-plan.mjs";

const PICKED = "min-h-10 flex-1 aria-pressed:bg-primary/15 aria-pressed:text-primary-text";
const SAME = "same";

/** The best-of of a cup's bracket: the early rounds, then each part counted back from the end,
 *  which plays the early best-of unless it names its own. A part picks "Same" to follow. */
export function BestOfPlan({
  format,
  bestOf,
  plan,
  onChange,
}: {
  format: string;
  bestOf: number;
  plan: Record<string, number>;
  onChange: (bestOf: number, plan: Record<string, number>) => void;
}) {
  const row = (label: string, hint: string | undefined, value: string, items: string[], pick: (value: string) => void) => (
    <div key={label} className="grid items-center gap-x-4 gap-y-1 border-t border-border py-2 first:border-t-0 min-[600px]:grid-cols-[220px_minmax(0,1fr)]">
      <div>
        <div className="font-medium">{label}</div>
        {hint ? <div className="text-xs text-muted-foreground">{hint}</div> : null}
      </div>
      <ToggleGroup variant="outline" spacing={0} className="w-full" aria-label={`Best of, ${label}`} value={[value]} onValueChange={(next) => next[0] && pick(next[0] as string)}>
        {items.map((item) => (
          <ToggleGroupItem key={item} value={item} className={PICKED}>
            {item === SAME ? `Same (Bo${bestOf})` : `Bo${item}`}
          </ToggleGroupItem>
        ))}
      </ToggleGroup>
    </div>
  );
  const games = BEST_OFS.map(String);
  return (
    <div className="flex flex-col">
      {row("Early rounds", "Every round not named below", String(bestOf), games, (value) => onChange(Number(value), plan))}
      {partsOf(format).map((part: { role: string; title: string; hint?: string }) =>
        row(part.title, part.hint, plan[part.role] && plan[part.role] !== bestOf ? String(plan[part.role]) : SAME, [SAME, ...games], (value) => {
          const next = { ...plan };
          if (value === SAME) delete next[part.role];
          else next[part.role] = Number(value);
          onChange(bestOf, next);
        }),
      )}
    </div>
  );
}

export default BestOfPlan;
