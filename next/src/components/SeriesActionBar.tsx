"use client";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Icon } from "@/components/ui/Icon";
import { formatDateTime } from "@/helpers/datetime";
import { seriesSteps } from "@/helpers/series-actions.mjs";
import { cn } from "@/lib/utils";

/* eslint-disable @typescript-eslint/no-explicit-any */
type Row = Record<string, any>;

const ICON: Record<string, string> = { schedule: "mdi-calendar-edit", veto: "mdi-map-outline", report: "mdi-trophy" };

type Step = { step: string; label: string; state: string };

/** The steps of one series, in order, with the next one filled. The full bar carries all
 *  three steps where the series is the subject of the surface; the compact bar carries the
 *  two active steps where a series is one item among many, and reads the steps behind it as
 *  quiet facts. A viewer who may not act reads the facts alone. The bar draws nothing until
 *  the series has loaded, so a tap cannot act on a series the reader never saw. */
export function SeriesActionBar({
  series,
  viewer,
  variant = "full",
  loading = false,
  onSchedule,
  onReport,
  className,
}: {
  series: Row | null;
  viewer: { id?: number | null; isAdmin?: boolean };
  variant?: "full" | "compact";
  loading?: boolean;
  onSchedule?: () => void;
  onReport?: () => void;
  className?: string;
}) {
  const { steps, mayAct } = seriesSteps(series, viewer) as { steps: Step[]; mayAct: boolean };
  if (loading || !series) return null;

  const live = steps.filter((step) => step.state !== "not needed");
  const active = live.filter((step) => step.state === "next" || step.state === "later");
  // The full bar keeps a step it has taken as a button, because a booked time and a veto
  // are both changed from there; the compact bar has room for the two active steps alone,
  // and a reported series, which has no active step, keeps its result button.
  const compact = active.length ? active.slice(0, 2) : live.filter((step) => step.step === "report");
  const shown = !mayAct ? [] : variant === "full" ? live : compact;
  // The score is drawn beside the series on every surface, so the report step states no fact
  const facts = live.filter((step) => step.state === "done" && step.step !== "report" && !shown.includes(step));

  const word = (step: Step) => (step.step === "schedule" && step.state === "done" ? formatDateTime(series.date_time) : step.label);

  const button = (step: Step) => {
    const filled = step.state === "next";
    const look = { size: "sm" as const, variant: filled ? ("default" as const) : ("outline" as const), className: filled ? undefined : "text-primary-text" };
    if (step.step === "veto")
      return (
        <Button key={step.step} {...look} nativeButton={false} render={<Link href={`/player-series/${series.id}/veto`} />}>
          <Icon name={ICON.veto} />
          {word(step)}
        </Button>
      );
    return (
      <Button key={step.step} {...look} onClick={step.step === "schedule" ? onSchedule : onReport}>
        <Icon name={ICON[step.step]} />
        {word(step)}
      </Button>
    );
  };

  if (!facts.length && !shown.length) return null;
  return (
    <div className={cn("flex flex-wrap items-center gap-2", className)}>
      {facts.map((step) => (
        <span key={step.step} className="inline-flex items-center gap-1.5 text-xs text-muted-foreground">
          <Icon name={ICON[step.step]} size={16} />
          {word(step)}
        </span>
      ))}
      {shown.map(button)}
    </div>
  );
}

export default SeriesActionBar;
