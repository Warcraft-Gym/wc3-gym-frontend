"use client";
import { Fragment } from "react";
import { extent, range } from "d3-array";
import { scaleBand, scaleLinear } from "d3-scale";
import { area, curveMonotoneX, line } from "d3-shape";
import { timeFormat } from "d3-time-format";
import { LOSS, WIN, dayTip } from "@/helpers/ladder-days.mjs";

/** One day of a player's ladder window, as `fillDays` builds it. */
export type LadderDay = { d: string; w: number; l: number; mmr: number | null };
type Point = LadderDay & { i: number; mmr: number };

const M = { top: 18, right: 44, bottom: 22, left: 44 };
const gH = 56; // games plot height
const between = 26;
const mH = 72; // MMR plot height

// An SVG attribute takes no Tailwind class, so every mark names its theme token here.
const CAP = { fontSize: 11, fontWeight: 500, fill: "rgba(var(--v-theme-on-surface), 0.6)" };
const TICK = { fontSize: 11, fill: "rgba(var(--v-theme-on-surface), 0.6)" };
const END = { fontSize: 11, fontWeight: 500, fill: "rgba(var(--v-theme-on-surface), 0.87)" };
const GRID = { stroke: "rgba(var(--v-theme-on-surface), 0.08)" };
const AXIS = { stroke: "rgba(var(--v-theme-on-surface), 0.2)" };
const AREA = { fill: "rgb(var(--v-theme-on-surface))", fillOpacity: 0.1 };
const LINE = { fill: "none", stroke: "rgb(var(--v-theme-on-surface))", strokeWidth: 2, strokeLinejoin: "round", strokeLinecap: "round" } as const;
const DOT = { fill: "rgb(var(--v-theme-on-surface))", stroke: "rgb(var(--v-theme-surface))", strokeWidth: 2 };

const fmt = timeFormat("%-d %b");
const dateOf = (d: LadderDay) => new Date(`${d.d}T00:00:00`);

/** Two plots on one date scale: games per day (wins under losses), then the MMR the
 *  player ended each day on. Without `games` the MMR plot stands alone. */
export function LadderPlots({
  days,
  ymax = 1,
  games = true, // the games per day plot above the MMR one
  width = 760,
}: {
  days: LadderDay[];
  ymax?: number;
  games?: boolean;
  width?: number;
}) {
  // with no games plot the MMR one sits alone under the top margin
  const mTop = games ? M.top + gH + between : M.top;
  const plotsH = (games ? gH + between : 0) + mH;
  const height = M.top + plotsH + M.bottom;
  const innerW = width - M.left - M.right;

  const x = scaleBand<number>().domain(range(days.length)).range([0, innerW]).paddingInner(0.4);
  const xAt = (i: number) => x(i) ?? 0;
  const cx = (i: number) => xAt(i) + x.bandwidth() / 2;
  const yG = scaleLinear().domain([0, ymax]).range([gH, 0]);
  const points: Point[] = days.map((d, i) => ({ ...d, i })).filter((d): d is Point => d.mmr != null);
  const yM = scaleLinear()
    .domain(points.length ? (extent(points, (d) => d.mmr) as [number, number]) : [0, 1])
    .nice(3)
    .range([mH, 0]);
  const last = points[points.length - 1] || null;

  const linePath = line<Point>().x((d) => cx(d.i)).y((d) => yM(d.mmr)).curve(curveMonotoneX)(points) || "";
  const areaPath = area<Point>().x((d) => cx(d.i)).y0(mH).y1((d) => yM(d.mmr)).curve(curveMonotoneX)(points) || "";
  const gTicks = yG.ticks(2).map((v) => ({ v, y: yG(v) }));
  const mTicks = yM.ticks(3).map((v) => ({ v, y: yM(v) }));
  const xTicks = range(0, days.length, 7).map((i) => ({ i, x: cx(i), label: fmt(dateOf(days[i])) }));

  return (
    <svg width={width} height={height} className="block font-[inherit]">
      {games ? (
        <g transform={`translate(${M.left},${M.top})`}>
          <text x="0" y="-6" style={CAP}>
            Games per day
          </text>
          {gTicks.map((t) => (
            <g key={`g${t.v}`}>
              <line x2={innerW} y1={t.y} y2={t.y} style={GRID} />
              <text x="-8" y={t.y} dy="0.32em" textAnchor="end" style={TICK}>
                {t.v}
              </text>
            </g>
          ))}
          {days.map((d, i) => (
            <Fragment key={d.d}>
              {d.w ? <rect x={xAt(i)} y={yG(d.w)} width={x.bandwidth()} height={yG(0) - yG(d.w)} style={{ fill: WIN }} /> : null}
              {d.l ? (
                <rect
                  x={xAt(i)}
                  y={yG(d.w + d.l)}
                  width={x.bandwidth()}
                  height={Math.max(1, yG(d.w) - yG(d.w + d.l) - (d.w ? 2 : 0))}
                  style={{ fill: LOSS }}
                />
              ) : null}
            </Fragment>
          ))}
          <line x2={innerW} y1={gH} y2={gH} style={AXIS} />
        </g>
      ) : null}
      <g transform={`translate(${M.left},${mTop})`}>
        {games ? (
          <text x="0" y="-6" style={CAP}>
            MMR
          </text>
        ) : null}
        {mTicks.map((t) => (
          <g key={`m${t.v}`}>
            <line x2={innerW} y1={t.y} y2={t.y} style={GRID} />
            <text x="-8" y={t.y} dy="0.32em" textAnchor="end" style={TICK}>
              {t.v}
            </text>
          </g>
        ))}
        <path d={areaPath} style={AREA} />
        <path d={linePath} style={LINE} />
        {points.map((p) => (
          <circle key={p.d} cx={cx(p.i)} cy={yM(p.mmr)} r="4" style={DOT} />
        ))}
        {last ? (
          <text x={cx(last.i) + 10} y={yM(last.mmr)} dy="0.32em" style={END}>
            {last.mmr}
          </text>
        ) : null}
        <line x2={innerW} y1={mH} y2={mH} style={AXIS} />
        {xTicks.map((t) => (
          <g key={t.i}>
            <line x1={t.x} x2={t.x} y1={mH} y2={mH + 4} style={AXIS} />
            <text x={t.x} y={mH + 16} textAnchor="middle" style={TICK}>
              {t.label}
            </text>
          </g>
        ))}
      </g>
      <g transform={`translate(${M.left},${M.top})`}>
        {days.map((d, i) => (
          <rect key={`hit${d.d}`} x={xAt(i) - x.step() * 0.2} y="0" width={x.step()} height={plotsH} fill="transparent">
            <title>{dayTip(d)}</title>
          </rect>
        ))}
      </g>
    </svg>
  );
}

export default LadderPlots;
