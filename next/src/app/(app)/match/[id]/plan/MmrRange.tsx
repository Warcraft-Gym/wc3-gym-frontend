"use client";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Icon } from "@/components/ui/Icon";
import { Input } from "@/components/ui/input";

/* eslint-disable @typescript-eslint/no-explicit-any */
type Row = Record<string, any>;

const PRESETS = [100, 150, 200, 300];

/** The largest MMR difference of this match: one field over the working value. */
function DifferenceControl({ value, busy, onChange }: { value: number; busy: boolean; onChange: (next: number | null) => void }) {
  const [text, setText] = useState(String(value));
  const [shown, setShown] = useState(value);
  if (shown !== value) {
    setShown(value);
    setText(String(value));
  }
  const commit = (raw: number) => {
    const next = Math.round(raw); // the backend field is an int, so a fraction is never sent
    if (!Number.isFinite(next) || next < 1 || next === value) return setText(String(value));
    onChange(next);
  };
  return (
    <span className="flex items-center gap-2">
      <label htmlFor="max-mmr-difference" className="text-sm font-medium">
        Largest MMR difference
      </label>
      <Input
        id="max-mmr-difference"
        type="number"
        min={1}
        step={25}
        className="tnum w-24"
        value={text}
        disabled={busy}
        aria-busy={busy}
        onChange={(event) => setText(event.target.value)}
        onBlur={() => commit(Number(text))}
        onKeyDown={(event) => (event.key === "Enter" ? commit(Number(text)) : undefined)}
      />
    </span>
  );
}

/** Step 2: the largest MMR difference both captains pair inside, the matchups it allows, and the
 *  players it leaves without an opponent. */
export function MmrRange({
  value,
  stageValue,
  count,
  sidesLeft,
  hints,
  busy,
  onChange,
}: {
  value: number;
  stageValue?: number | null;
  count: number;
  sidesLeft: boolean; // both teams still hold a free player
  hints: { player: Row; nearest: Row; difference: number }[];
  busy: boolean;
  onChange: (next: number | null) => Promise<unknown>;
}) {
  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center gap-2">
        <DifferenceControl value={value} busy={busy} onChange={onChange} />
        {PRESETS.map((preset) => (
          <Button
            key={preset}
            size="sm"
            variant={value === preset ? "default" : "outline"}
            aria-pressed={value === preset}
            disabled={busy}
            className="tnum"
            onClick={() => (value === preset ? undefined : onChange(preset))}
          >
            {preset}
          </Button>
        ))}
        {stageValue != null && stageValue !== value ? (
          <Button variant="ghost" size="sm" className="text-primary-text" disabled={busy} onClick={() => onChange(null)}>
            Reset to {stageValue}
          </Button>
        ) : null}
      </div>
      <p className="tnum font-medium">
        {!sidesLeft
          ? "Nobody is left to pair on one side."
          : `${count} possible matchup${count === 1 ? "" : "s"}${hints.length ? "" : " · everyone who plays has at least one"}`}
      </p>
      {hints.map((hint) => (
        <div key={hint.player.user_id} className="flex flex-wrap items-center gap-2 text-sm text-warning">
          <Icon name="mdi-alert" size={16} />
          <span className="tnum">
            {hint.player.name} has no opponent within {value}. The nearest is {hint.nearest.name}, {hint.difference} away.
          </span>
          <Button variant="outline" size="sm" className="text-primary-text" disabled={busy} onClick={() => onChange(hint.difference)}>
            Use {hint.difference}
          </Button>
        </div>
      ))}
      <p className="text-sm text-muted-foreground">Both captains share this value.</p>
    </div>
  );
}

export default MmrRange;
