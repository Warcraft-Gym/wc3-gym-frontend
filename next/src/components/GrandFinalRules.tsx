"use client";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { GRAND_FINALS, leadChoices } from "@/helpers/cup-wizard.mjs";
import { cn } from "@/lib/utils";

const PICKED = "min-h-10 px-4 aria-pressed:bg-primary/15 aria-pressed:text-primary-text";

/** What a double elimination's grand final holds, one of three: one series, a reset the
 *  lower-bracket winner must force, or a head start of games for the upper-bracket winner. The
 *  head start offers what the grand final's best-of allows, and none in a Bo1. Create cup's
 *  Format step and the run page's format card draw it alike. */
export function GrandFinalRules({
  value,
  lead,
  bestOf,
  plan,
  onChange,
}: {
  value: string;
  lead: number | null;
  bestOf: number;
  plan: Record<string, number>;
  onChange: (value: string, lead: number) => void;
}) {
  const choices: number[] = leadChoices(bestOf, plan);
  const games = Number(lead) || 1;
  return (
    <section className="flex flex-col gap-2" aria-label="Grand final rules">
      <div className="font-medium">Grand final rules</div>
      <div role="radiogroup" aria-label="Grand final rules" className="grid gap-2 min-[700px]:grid-cols-3">
        {GRAND_FINALS.map((item: { value: string; title: string; hint: string }) => {
          const unavailable = item.value === "lead" && !choices.length;
          const picked = item.value === value;
          return (
            <button
              key={item.value}
              type="button"
              role="radio"
              aria-checked={picked}
              disabled={unavailable && !picked}
              // a head start picked anew opens on the largest one the grand final allows, at most what was set
              onClick={() => onChange(item.value, item.value === "lead" && choices.length ? Math.min(games, choices[choices.length - 1]) : games)}
              className={cn("flex flex-col gap-1 rounded-lg border-2 p-3 text-left disabled:opacity-50", picked ? "border-primary bg-primary/10" : "border-border")}
            >
              <span className="font-bold">{item.title}</span>
              <span className="text-sm text-muted-foreground">{unavailable ? "Needs a grand final of Bo3 or longer." : item.hint}</span>
            </button>
          );
        })}
      </div>
      {value === "lead" && choices.length ? (
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-sm text-muted-foreground">The upper-bracket winner starts</span>
          <ToggleGroup variant="outline" spacing={0} aria-label="Head start" value={[String(games)]} onValueChange={(next) => next[0] && onChange("lead", Number(next[0]))}>
            {choices.map((count) => (
              <ToggleGroupItem key={count} value={String(count)} className={PICKED}>
                {count}–0
              </ToggleGroupItem>
            ))}
          </ToggleGroup>
        </div>
      ) : null}
    </section>
  );
}

export default GrandFinalRules;
