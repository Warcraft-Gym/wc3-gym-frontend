"use client";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { DEFAULT_PICK_BAN, orderOf, vetoLimits } from "@/helpers/pick-ban.mjs";

const STEPS = [
  { value: "Ban_A", label: "+ Ban A", color: "text-error" },
  { value: "Ban_B", label: "+ Ban B", color: "text-error" },
  { value: "Pick_A", label: "+ Pick A", color: "text-primary-text" },
  { value: "Pick_B", label: "+ Pick B", color: "text-primary-text" },
];

/** The pick and ban order, built a step at a time: the order as the season stores it, a button per
 *  step, and the counts against the games' rules and the pool. A step at its limit is not offered. */
export function PickBanBuilder({
  order,
  onChange,
  mapRules,
  poolSize,
}: {
  order: string[];
  onChange: (order: string[]) => void;
  mapRules: string | null | undefined;
  poolSize: number;
}) {
  const { picksMax, bansMax, vetoPool } = vetoLimits(mapRules, poolSize);
  const leftOver = vetoPool - order.length;
  const bans = order.filter((step) => step.startsWith("Ban")).length;
  const picks = order.length - bans;
  const atLimit = (step: string) => (step.startsWith("Ban") ? bans >= bansMax : picks >= picksMax);
  const counts = [
    { label: "Steps", value: order.length },
    { label: "Bans", value: `${bans} / ${bansMax}`, negative: bans > bansMax },
    { label: "Picks", value: `${picks} / ${picksMax}`, negative: picks > picksMax },
    { label: "Maps in the veto", value: vetoPool },
    { label: "Left over", value: leftOver, negative: leftOver < 0 },
  ];

  return (
    <div>
      <div className="mb-3 rounded bg-muted px-3 py-2 text-xs leading-relaxed break-words">{order.join("|") || "No order set"}</div>
      <div className="mb-3 flex flex-wrap gap-2">
        {STEPS.map((step) => (
          <Button key={step.value} size="sm" variant="outline" className={step.color} disabled={atLimit(step.value)} onClick={() => onChange([...order, step.value])}>
            {step.label}
          </Button>
        ))}
        <Button size="sm" variant="outline" disabled={!order.length} onClick={() => onChange(order.slice(0, -1))}>
          Delete last
        </Button>
        <Button size="sm" variant="outline" disabled={order.join("|") === DEFAULT_PICK_BAN} onClick={() => onChange(orderOf(DEFAULT_PICK_BAN))}>
          Use default
        </Button>
      </div>
      <Separator className="mb-2" />
      {counts.map((count) => (
        <div key={count.label} className="flex justify-between py-1">
          <span className="text-xs text-muted-foreground">{count.label}</span>
          <span className={`font-bold tnum ${count.negative ? "text-error" : ""}`}>{count.value}</span>
        </div>
      ))}
    </div>
  );
}

export default PickBanBuilder;
