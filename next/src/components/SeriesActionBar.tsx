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

/** The steps of one series, in order, with the next one filled: all three where the series is the subject of the surface, the two active ones where a series is one item among many, and the steps already taken as quiet facts before them.
 *  A viewer who may not act reads the facts alone, and the bar draws nothing until the series has loaded. */
export function SeriesActionBar({
  series,
  viewer,
  variant = "full",
  facts = true,
  onSchedule,
  onReport,
  className,
}: {
  series: Row | null;
  viewer: { id?: number | null; isAdmin?: boolean; seats?: { team_id: number; season_id: number }[] };
  variant?: "full" | "compact";
  /** A surface that states the booked time in a line of its own passes false */
  facts?: boolean;
  onSchedule?: () => void;
  onReport?: () => void;
  className?: string;
}) {
  const { steps, mayAct } = seriesSteps(series, viewer) as { steps: Step[]; mayAct: boolean };
  if (!series) return null;

  const live = steps.filter((step) => step.state !== "not needed");
  const active = live.filter((step) => step.state === "next" || step.state === "later");
  // The compact bar has room for the two active steps alone, and a reported series, which has no active step, keeps its result button
  const compact = active.length ? active.slice(0, 2) : live.filter((step) => step.step === "report");
  // The full bar shows every step while one is left to take; a reported series keeps its result button alone in both bars
  const shown = !mayAct ? [] : variant === "full" && active.length ? live : compact;
  // A step already taken states what it left behind; the score is drawn beside the series on every surface, so the report step states no fact
  const factSteps = facts ? live.filter((step) => step.state === "done" && step.step !== "report") : [];

  const fact = (step: Step) => (step.step === "schedule" ? formatDateTime(series.date_time) : "Veto done");

  const button = (step: Step) => {
    const filled = step.state === "next";
    const look = { size: "sm" as const, variant: filled ? ("default" as const) : ("outline" as const), className: filled ? undefined : "text-primary-text" };
    if (step.step === "veto")
      return (
        <Button key={step.step} {...look} nativeButton={false} render={<Link href={`/player-series/${series.id}/veto`} />}>
          <Icon name={ICON.veto} />
          {step.label}
        </Button>
      );
    return (
      <Button key={step.step} {...look} onClick={step.step === "schedule" ? onSchedule : onReport}>
        <Icon name={ICON[step.step]} />
        {step.label}
      </Button>
    );
  };

  if (!factSteps.length && !shown.length) return null;
  return (
    <div className={cn("flex flex-wrap items-center gap-2", className)}>
      {factSteps.map((step) => (
        <span key={step.step} className="inline-flex items-center gap-1.5 text-xs text-muted-foreground">
          <Icon name={ICON[step.step]} size={16} />
          {fact(step)}
        </span>
      ))}
      {shown.map(button)}
    </div>
  );
}

export default SeriesActionBar;
