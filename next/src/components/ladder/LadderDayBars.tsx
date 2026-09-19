"use client";
import { Fragment } from "react";
import { range } from "d3-array";
import { scaleBand, scaleLinear } from "d3-scale";
import { LOSS, WIN, dayTip } from "@/helpers/ladder-days.mjs";
import type { LadderDay } from "./LadderPlots";

const AXIS = { stroke: "rgba(var(--v-theme-on-surface), 0.12)" };

/** One stacked bar per day of the window: wins under losses, on the shared games scale */
export function LadderDayBars({
  days,
  ymax,
  width = 224,
  height = 28,
  gap = 1, // surface gap between the two segments
}: {
  days: LadderDay[];
  ymax: number;
  width?: number;
  height?: number;
  gap?: number;
}) {
  const x = scaleBand<number>().domain(range(days.length)).range([0, width]).paddingInner(0.3);
  const xAt = (i: number) => x(i) ?? 0;
  const y = scaleLinear().domain([0, ymax]).range([height - 1, 0]);

  return (
    <svg width={width} height={height} className="block">
      {days.map((d, i) => (
        <Fragment key={d.d}>
          {d.w ? <rect x={xAt(i)} y={y(d.w)} width={x.bandwidth()} height={y(0) - y(d.w)} style={{ fill: WIN }} /> : null}
          {d.l ? (
            <rect
              x={xAt(i)}
              y={y(d.w + d.l)}
              width={x.bandwidth()}
              height={Math.max(1, y(d.w) - y(d.w + d.l) - (d.w ? gap : 0))}
              style={{ fill: LOSS }}
            />
          ) : null}
        </Fragment>
      ))}
      <line x1="0" x2={width} y1={height - 0.5} y2={height - 0.5} style={AXIS} />
      {/* One hit target per day, wider than the bar, so every day names itself on hover */}
      {days.map((d, i) => (
        <rect key={`hit${d.d}`} x={xAt(i) - x.step() * 0.15} y="0" width={x.step()} height={height} fill="transparent">
          <title>{dayTip(d)}</title>
        </rect>
      ))}
    </svg>
  );
}

export default LadderDayBars;
