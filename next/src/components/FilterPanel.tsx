"use client";
import { useState, useSyncExternalStore } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { Icon } from "@/components/ui/Icon";
import { MD_AND_UP, useBreakpoint } from "@/hooks/breakpoint";
import { raceWrapper } from "@/helpers/races.js";
import { cn } from "@/lib/utils";

type EventRow = { id: number; name: string };

/** The filter bar over a player table: name, event, race and an MMR range. A phone keeps the
 *  search in view and folds the rest behind the Filters button. */
export function FilterPanel({
  seasons = [],
  extraActive = 0, // filters the after render prop holds, counted on the phone button
  showName = true,
  showRace = true,
  showSeason = true,
  showMMR = true,
  showReset = true,
  min = 0,
  max = 3000,
  step = 10,
  searchName = "",
  onSearchNameChange,
  searchRace = null,
  onSearchRaceChange,
  selectedSeasonFilter = null,
  onSelectedSeasonFilterChange,
  rangeValues = [0, 3000],
  onRangeValuesChange,
  onReset,
  after,
  summary,
}: {
  seasons?: EventRow[];
  extraActive?: number;
  showName?: boolean;
  showRace?: boolean;
  showSeason?: boolean;
  showMMR?: boolean;
  showReset?: boolean;
  min?: number;
  max?: number;
  step?: number;
  searchName?: string;
  onSearchNameChange?: (value: string) => void;
  searchRace?: string | null;
  onSearchRaceChange?: (value: string | null) => void;
  selectedSeasonFilter?: number | null;
  onSelectedSeasonFilterChange?: (value: number | null) => void;
  rangeValues?: number[];
  onRangeValuesChange?: (value: number[]) => void;
  onReset?: () => void;
  after?: React.ReactNode;
  summary?: React.ReactNode;
}) {
  const events = [...seasons].sort((a, b) => b.id - a.id);
  // Server and first paint agree on the phone layout; the desktop tree only mounts once
  // hydrated, so the layout never flips right after hydration.
  const hydrated = useSyncExternalStore(() => () => {}, () => true, () => false);
  const isDesktop = useBreakpoint(MD_AND_UP);
  const mdAndUp = hydrated && isDesktop;
  const [open, setOpen] = useState(false);
  const expanded = mdAndUp || open;
  const activeCount =
    [searchRace, selectedSeasonFilter, rangeValues[0] !== min || rangeValues[1] !== max].filter(Boolean).length + extraActive;

  const setRange = (i: number, value: string) => {
    const next = [...rangeValues];
    next[i] = Number(value) || 0;
    onRangeValuesChange?.(next);
  };

  return (
    <div className="card mb-4 rounded-lg p-3">
      <div className="flex flex-wrap items-center gap-2">
        {showName ? (
          <div className="relative min-w-[200px] flex-1">
            <Icon name="mdi-magnify" className="pointer-events-none absolute top-1/2 left-2 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={searchName}
              onChange={(event) => onSearchNameChange?.(event.target.value)}
              type="search"
              placeholder="Search name, battle tag or Discord"
              aria-label="Search players"
              className="pl-8"
            />
          </div>
        ) : null}

        {/* A phone keeps the search in view and folds the rest behind this button */}
        {!mdAndUp ? (
          <Button variant="secondary" aria-expanded={open} onClick={() => setOpen(!open)}>
            <Icon name="mdi-tune-variant" />
            Filters
            {activeCount ? <Badge className="ml-1">{activeCount}</Badge> : null}
          </Button>
        ) : null}

        {expanded && showSeason ? (
          <Select
            items={events.map((event) => ({ value: event.id, label: event.name }))}
            value={selectedSeasonFilter}
            onValueChange={(value) => onSelectedSeasonFilterChange?.(value as number | null)}
          >
            <SelectTrigger aria-label="Filter by events" className="w-full md:w-[220px]">
              <Icon name="mdi-calendar" className="text-muted-foreground" />
              <SelectValue placeholder="Filter by events" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={null}>All events</SelectItem>
              {events.map((event) => (
                <SelectItem key={event.id} value={event.id}>
                  {event.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        ) : null}

        {expanded ? after : null}
      </div>

      {showRace || showMMR || showReset ? (
        <div className="mt-1 flex flex-wrap items-center gap-3">
          {showRace && expanded ? (
            <ToggleGroup
              variant="outline"
              spacing={0}
              value={searchRace ? [searchRace] : []}
              onValueChange={(value) => onSearchRaceChange?.(value[0] ?? null)}
              aria-label="Race"
            >
              {raceWrapper.races.map((race) => {
                const src = typeof race.icon === "string" ? race.icon : race.icon.src;
                return (
                  <ToggleGroupItem key={race.id} value={race.id} title={race.name} aria-label={race.name} className="min-w-12">
                    {/* A race off the filter reads grey, so the chosen one stands out in its own colours */}
                    <img
                      src={src}
                      alt={race.name}
                      className={cn("size-[22px]", searchRace === race.id ? "" : "opacity-60 grayscale")}
                    />
                    {searchRace === race.id ? <span className="ml-2">{race.name}</span> : null}
                  </ToggleGroupItem>
                );
              })}
            </ToggleGroup>
          ) : null}

          {showMMR && expanded ? (
            <div className="flex min-w-[220px] flex-1 items-center gap-3">
              <span className="text-sm text-muted-foreground">MMR</span>
              <Input
                value={rangeValues[0]}
                onChange={(event) => setRange(0, event.target.value)}
                aria-label="Lowest MMR"
                type="number"
                className="max-w-[88px] min-w-16"
              />
              <Slider
                value={rangeValues}
                onValueChange={(value) => onRangeValuesChange?.(value as number[])}
                min={min}
                max={max}
                step={step}
                className="min-w-[100px] flex-1"
              />
              <Input
                value={rangeValues[1]}
                onChange={(event) => setRange(1, event.target.value)}
                aria-label="Highest MMR"
                type="number"
                className="max-w-[88px] min-w-16"
              />
            </div>
          ) : null}

          {showReset ? (
            <div className="ms-auto flex items-center gap-3">
              {summary}
              <Button variant="ghost" onClick={() => onReset?.()}>
                <Icon name="mdi-filter-remove-outline" />
                Clear filters
              </Button>
            </div>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}

export default FilterPanel;
