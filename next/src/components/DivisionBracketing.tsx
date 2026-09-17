"use client";
import { useEffect, useRef, useState } from "react";
import { axisBottom } from "d3-axis";
import { drag } from "d3-drag";
import { scaleLinear } from "d3-scale";
import { select } from "d3-selection";
import { Button } from "@/components/ui/button";
import { Icon } from "@/components/ui/Icon";
import { XS, useBreakpoint } from "@/hooks/breakpoint";
import { dodge, moveCut } from "@/helpers/divisions.mjs";
import "./division-bracketing.css";

/* eslint-disable @typescript-eslint/no-explicit-any */
export type StripPlayer = { id: number | string; who?: number | string; label: string; mmr: number; band: number | null; pinned?: boolean };

const fill = (name: string) => ({ fill: `rgb(var(--v-theme-${name}))` }); // svg fill takes no theme class

const PAD = 28; // keeps the first and last axis label inside the svg
const R = 4.4;
const BOX = 64; // the width of a cut's input box
const GRAB = 16; // how near the pointer must be to a cut to drag it

/** One cut as a number box. The box shows the cut, takes a typed MMR on Enter or on leaving
 *  it, and shows the clamped value even when the cut did not move. */
function CutInput({ value, onCommit, ...rest }: { value: number; onCommit: (typed: number) => number } & Omit<React.InputHTMLAttributes<HTMLInputElement>, "value">) {
  const input = useRef<HTMLInputElement>(null);
  useEffect(() => {
    if (input.current) input.current.value = String(value);
  }, [value]);
  const commit = () => {
    const el = input.current;
    if (el && Number(el.value) !== value) el.value = String(onCommit(Number(el.value)));
  };
  return <input ref={input} type="number" defaultValue={value} onBlur={commit} onKeyDown={(event) => event.key === "Enter" && commit()} {...rest} />;
}

/** The MMR beeswarm: one dot per player, stacked into a column where players share an MMR,
 *  one cut per band boundary that drags or takes a typed MMR.
 *  Bands ascend (index 0 = lowest MMR); `cuts` holds the ascending boundaries.
 *  A cut sitting off its stored value shows the ground it took, tinted with the band that grew.
 *  On a phone the chart is read-only and the row under it edits the cuts, because five cuts
 *  land closer together than a fingertip and a sideways swipe there already means other things.
 *  d3-scale maps MMR to pixels, d3-axis draws the ticks and d3-drag runs the cut gesture. */
export function DivisionBracketing({
  players, // `who` is the player a dot belongs to
  cuts, // ascending, one per boundary
  names, // one per band, ascending
  colors, // theme colour names, one per band, ascending
  domain, // [low, high] MMR
  stored = [], // the cuts the last save wrote, to show what moved
  disabled = false, // the cuts are shown but cannot move
  onUpdateCuts,
}: {
  players: StripPlayer[];
  cuts: number[];
  names: string[];
  colors: string[];
  domain: number[];
  stored?: number[];
  disabled?: boolean;
  onUpdateCuts: (cuts: number[]) => void;
}) {
  const svg = useRef<SVGSVGElement>(null);
  const axisEl = useRef<SVGGElement>(null);
  const compact = useBreakpoint(XS);

  // The chart is drawn at its real pixel size, so nothing is stretched on a wider monitor:
  // a wider card spreads the MMR axis and the columns get shorter.
  const [width, setWidth] = useState(1000);

  const scale = scaleLinear().domain(domain).range([PAD, width - PAD]);
  const x = (mmr: number) => scale(mmr);
  const edges = [domain[0], ...cuts, domain[1]];
  // Neighbouring labels closer than a label width take turns on a second row, so each stays readable
  const slot = compact ? 40 : BOX;
  const boxRows = cuts.reduce<number[]>((rows, c, i) => [...rows, i > 0 && x(c) - x(cuts[i - 1]) < slot + 4 ? 1 - rows[i - 1] : 0], []);
  const boxY = (i: number) => 26 + boxRows[i] * 26;
  // A cut off its stored value: the ground it took, and the band that took it. Bands ascend,
  // so a cut moving down the scale feeds the band above it.
  const ghosts =
    stored.length !== cuts.length
      ? [] // a different band count moved every cut
      : cuts.flatMap((c, i) => {
          if (c === stored[i]) return [];
          const grew = c < stored[i] ? i + 1 : i;
          return [{ was: stored[i], at: x(stored[i]), left: Math.min(x(c), x(stored[i])), width: Math.abs(x(c) - x(stored[i])), color: colors[grew] }];
        });
  // Room above the swarm for the band names, the cut boxes and a row for the ghost labels
  const top = 60 + (boxRows.includes(1) ? 26 : 0) + (ghosts.length ? 17 : 0);
  // A player on two races is two dots and one entrant
  const counts = names.map((_, i) => new Set(players.filter((p) => p.band === i).map((p) => p.who ?? p.id)).size);

  // Dots stack up from the axis, so a tall column is a crowded MMR and the swarm sets the height.
  const withMmr = players.filter((p) => p.mmr > 0);
  const rows: number[] = dodge(withMmr.map((p) => x(p.mmr)), 2 * R);
  const tall = rows.length ? Math.max(...rows) + 1 : 1;
  const axisY = top + tall * 2 * R;
  const height = axisY + 36;
  const dots = withMmr.map((p, i) => ({ ...p, cy: axisY - 4 - R - rows[i] * 2 * R }));

  const moved = (i: number, value: number): number[] => moveCut(cuts, i, value, domain as [number, number]);
  const set = (i: number, value: number) => onUpdateCuts(moved(i, value));
  // A typed value lands clamped, and the box shows the clamped one
  const commit = (i: number, value: number) => {
    const next = moved(i, value);
    onUpdateCuts(next);
    return next[i];
  };

  // The gestures live outside React, so they read the newest render through this ref
  const latest = useRef({ cuts, disabled, compact, scale, set });
  useEffect(() => {
    latest.current = { cuts, disabled, compact, scale, set };
  });

  // One tick per ~90px, so the labels never collide however wide the card is.
  // MMR is written without a thousands separator here, as it is on the cut labels
  useEffect(() => {
    if (axisEl.current) select(axisEl.current).call(axisBottom(scale).ticks(Math.max(2, Math.round(width / 90))).tickFormat(String) as any);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [width, domain[0], domain[1]]);

  useEffect(() => {
    const el = svg.current;
    if (!el) return;
    const observer = new ResizeObserver(([entry]) => setWidth(Math.max(280, Math.round(entry.contentRect.width))));
    observer.observe(el.parentNode as Element);

    // One gesture for the whole strip: the subject is the cut nearest the pointer, so this keeps
    // working when the number of cuts changes and there is no per-line hit target to maintain.
    const cutDrag = drag()
      .container(() => el) // event.x is then an svg coordinate for mouse and touch alike
      // A press inside a cut's box scrubs or edits it, so it never starts this drag
      .filter((event: any) => !latest.current.disabled && !latest.current.compact && !event.ctrlKey && !event.button && event.target.tagName !== "INPUT")
      .subject((event: any) => {
        const now = latest.current;
        let nearest: number | null = null;
        let best = event.sourceEvent.type.startsWith("touch") ? 2 * GRAB : GRAB;
        now.cuts.forEach((c, i) => {
          const distance = Math.abs(now.scale(c) - event.x);
          if (distance < best) {
            best = distance;
            nearest = i;
          }
        });
        return nearest === null ? null : { i: nearest, x: now.scale(now.cuts[nearest]) };
      })
      .on("drag", (event: any) => latest.current.set(event.subject.i, latest.current.scale.invert(event.x)));
    select(el).call(cutDrag);

    // Press a cut's box and move, and the box drags the cut. Press and let go without moving,
    // and the caret lands so it can be typed into.
    let scrubbing: number | null = null;
    let scrubFrom = 0;
    let scrubStart = 0;
    let scrubMoved = false;
    const startScrub = (event: PointerEvent) => {
      const input = (event.target as Element).closest?.("input.cut-handle") as HTMLInputElement | null;
      if (!input || latest.current.disabled) return;
      scrubbing = Number(input.dataset.cut);
      scrubFrom = event.clientX;
      scrubStart = latest.current.cuts[scrubbing];
      scrubMoved = false;
    };
    const moveScrub = (event: PointerEvent) => {
      if (scrubbing === null) return;
      const dx = event.clientX - scrubFrom;
      if (!scrubMoved && Math.abs(dx) < 4) return;
      if (!scrubMoved) {
        scrubMoved = true;
        (document.activeElement as HTMLElement | null)?.blur?.();
      }
      const now = latest.current;
      now.set(scrubbing, now.scale.invert(now.scale(scrubStart) + dx));
    };
    const endScrub = () => {
      scrubbing = null;
    };
    el.addEventListener("pointerdown", startScrub);
    window.addEventListener("pointermove", moveScrub);
    window.addEventListener("pointerup", endScrub);
    window.addEventListener("pointercancel", endScrub);
    return () => {
      observer.disconnect();
      select(el).on(".drag", null);
      el.removeEventListener("pointerdown", startScrub);
      window.removeEventListener("pointermove", moveScrub);
      window.removeEventListener("pointerup", endScrub);
      window.removeEventListener("pointercancel", endScrub);
    };
  }, []);

  return (
    <div>
      <svg ref={svg} width={width} height={height} className={compact ? "division-strip read-only" : "division-strip"}>
        {(cuts.length ? names : []).map((name, i) => (
          <text key={name} x={(x(edges[i]) + x(edges[i + 1])) / 2} y="16" textAnchor="middle" className="band-name" style={x(edges[i + 1]) - x(edges[i]) > 90 ? undefined : { display: "none" }}>
            <tspan style={fill(colors[i])}>●</tspan> {name} · {counts[i]}
          </text>
        ))}
        {ghosts.map((g, i) => (
          <g key={`ghost-${i}`}>
            <rect x={g.left} y={top - 2} width={g.width} height={axisY - top + 2} style={fill(g.color)} fillOpacity="0.3" />
            <line x1={g.at} x2={g.at} y1={top - 2} y2={axisY} className="ghost-line" />
          </g>
        ))}
        <g ref={axisEl} className="axis" transform={`translate(0,${axisY})`} />
        {dots.map((p) => (
          <circle key={p.id} cx={x(p.mmr)} cy={p.cy} r={R} style={fill(colors[p.band as number])} className={p.pinned ? "pinned" : undefined}>
            <title>
              {p.label} · {p.mmr}
            </title>
          </circle>
        ))}
        {/* The tinted span names the band that grew and shows by how much, so the label is the old MMR alone */}
        {ghosts.map((g, i) => (
          <text key={`was-${i}`} x={g.at} y={top - 7} textAnchor="middle" className="ghost-text">
            was {g.was}
          </text>
        ))}
        {cuts.map((c, i) => (
          <g key={i} className="cut">
            {!compact ? <rect x={x(c) - GRAB} y={boxY(i) + 24} width={2 * GRAB} height={axisY + 12 - boxY(i) - 24} className="grab" /> : null}
            <line x1={x(c)} x2={x(c)} y1={boxY(i) + 25} y2={axisY + 12} className="cut-line" />
            {compact ? (
              <text x={x(c)} y={boxY(i) + 19} textAnchor="middle" className="cut-value">
                {c}
              </text>
            ) : (
              <foreignObject x={x(c) - BOX / 2} y={boxY(i)} width={BOX} height="28">
                <CutInput value={c} data-cut={i} aria-label={`${names[i]} to ${names[i + 1]} cut`} className="cut-handle" disabled={disabled} onCommit={(typed) => commit(i, typed)} />
              </foreignObject>
            )}
            {/* The handle says there is a target here: taller than wide, marks across the travel, like a slider thumb */}
            {!compact ? (
              <g className="grip" transform={`translate(${x(c)},${boxY(i) + 36})`}>
                <rect x="-5.5" y="-10" width="11" height="20" rx="5.5" />
                {[-2, 2].map((dx) => (
                  <line key={dx} x1={dx} x2={dx} y1="-4" y2="4" className="grip-mark" />
                ))}
              </g>
            ) : null}
          </g>
        ))}
      </svg>
      {compact ? (
        <div className="division-cut-rows">
          {cuts.map((c, i) => (
            <div key={i} className="cut-row">
              <span className="text-muted-foreground">
                {names[i]} to {names[i + 1]}
              </span>
              <Button variant="outline" size="icon" disabled={disabled} aria-label={`Lower the ${names[i]} cut by 10`} onClick={() => set(i, c - 10)}>
                <Icon name="mdi-minus" />
              </Button>
              <CutInput value={c} aria-label={`${names[i]} to ${names[i + 1]} cut`} className="cut-field" disabled={disabled} onCommit={(typed) => commit(i, typed)} />
              <Button variant="outline" size="icon" disabled={disabled} aria-label={`Raise the ${names[i]} cut by 10`} onClick={() => set(i, c + 10)}>
                <Icon name="mdi-plus" />
              </Button>
            </div>
          ))}
        </div>
      ) : null}
    </div>
  );
}

export default DivisionBracketing;
