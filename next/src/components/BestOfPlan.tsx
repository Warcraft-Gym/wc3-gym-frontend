"use client";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Icon } from "@/components/ui/Icon";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { BEST_OFS, freeParts, listedParts, partsOf, stepFrom } from "@/helpers/best-of-plan.mjs";

const PICKED = "min-h-10 flex-1 aria-pressed:bg-primary/15 aria-pressed:text-primary-text";

type Part = { role: string; title: string; hint?: string };

/** The best-of of a cup's bracket: one for every series, then the rounds that play their own,
 *  each added from "+ Another round" and taken back with its x. A cup starts with none listed, so
 *  the editor is one row until a round asks for more. */
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
  const listed: Part[] = listedParts(plan, format);
  const free: Part[] = freeParts(plan, format);
  const setPart = (role: string, games: number | null) => {
    const next = { ...plan };
    if (games == null) delete next[role];
    else next[role] = games;
    onChange(bestOf, next);
  };

  return (
    <div className="flex flex-col gap-4">
      <div className="grid items-center gap-x-4 gap-y-1 min-[600px]:grid-cols-[220px_minmax(0,1fr)_auto]">
        <div>
          <div className="font-medium">Best of</div>
          <div className="text-xs text-muted-foreground">Every series, unless a round below plays its own</div>
        </div>
        <ToggleGroup variant="outline" spacing={0} className="w-full" aria-label="Best of, every series" value={[String(bestOf)]} onValueChange={(next) => next[0] && onChange(Number(next[0]), plan)}>
          {BEST_OFS.map((games) => (
            <ToggleGroupItem key={games} value={String(games)} className={PICKED}>
              Bo{games}
            </ToggleGroupItem>
          ))}
        </ToggleGroup>
        {/* the width of a round's x, so the cup's buttons line up with the rounds' below */}
        {partsOf(format).length ? <span className="hidden size-7 min-[600px]:block" aria-hidden /> : null}
      </div>

      {partsOf(format).length ? (
        <div className="flex flex-col gap-2">
          <div className="font-medium">Longer rounds</div>
          {listed.length ? (
            <ul className="flex flex-col">
              {listed.map((part) => (
                // the same buttons as the cup's own row, in the same columns, with the way back at the end
                <li key={part.role} className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-x-4 gap-y-1 border-t border-border py-2 first:border-t-0 min-[600px]:grid-cols-[220px_minmax(0,1fr)_auto]">
                  <div className="min-w-0">
                    <div>{part.title}</div>
                    {part.hint ? <div className="text-xs text-muted-foreground">{part.hint}</div> : null}
                  </div>
                  <ToggleGroup
                    variant="outline"
                    spacing={0}
                    className="order-last col-span-2 w-full min-[600px]:order-none min-[600px]:col-span-1"
                    aria-label={`Best of, ${part.title}`}
                    value={[String(plan[part.role])]}
                    onValueChange={(next) => next[0] && setPart(part.role, Number(next[0]))}
                  >
                    {BEST_OFS.map((games) => (
                      <ToggleGroupItem key={games} value={String(games)} className={PICKED}>
                        Bo{games}
                      </ToggleGroupItem>
                    ))}
                  </ToggleGroup>
                  <Button variant="ghost" size="icon-sm" aria-label={`${part.title} plays Bo${bestOf} again`} onClick={() => setPart(part.role, null)}>
                    <Icon name="mdi-close" />
                  </Button>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-muted-foreground">Every round plays Bo{bestOf}.</p>
          )}
          {free.length ? (
            <DropdownMenu>
              <DropdownMenuTrigger render={<Button variant="outline" size="sm" className="self-start" />}>
                <Icon name="mdi-plus" />
                Another round
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start" className="w-auto whitespace-nowrap">
                {free.map((part) => (
                  <DropdownMenuItem key={part.role} onClick={() => setPart(part.role, stepFrom(bestOf))}>
                    {part.title}
                    {part.hint ? <span className="text-xs text-muted-foreground">{part.hint}</span> : null}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}

export default BestOfPlan;
