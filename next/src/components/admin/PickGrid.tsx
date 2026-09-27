"use client";
import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Icon } from "@/components/ui/Icon";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

type Item = { id: number; name: string };

/** A grid of picture cards to tick, for the teams or the maps of a season. The whole card ticks
 *  its box, and the box is a real checkbox, so Tab and Space reach it too. Two cards to a row on
 *  a phone, as many as fit on a desktop. */
export function PickGrid<T extends Item>({
  items,
  selected,
  onChange,
  imageOf,
  onImageError,
  tagOf,
  round = false,
  empty = "Nothing to pick",
}: {
  items: T[];
  selected: number[];
  onChange: (ids: number[]) => void;
  imageOf: (item: T) => string | null | undefined;
  onImageError?: React.ReactEventHandler<HTMLImageElement>;
  tagOf?: (item: T) => string | null | undefined;
  // a team icon is round, a map picture is a landscape
  round?: boolean;
  empty?: string;
}) {
  const [search, setSearch] = useState("");
  const shown = search.trim() ? items.filter((item) => item.name.toLowerCase().includes(search.trim().toLowerCase())) : items;
  const toggle = (id: number, on: boolean) => onChange(on ? [...selected.filter((was) => was !== id), id] : selected.filter((was) => was !== id));

  return (
    <div>
      <div className="mb-3 flex flex-wrap items-center gap-2">
        <div className="relative min-w-0 flex-1 basis-48">
          <Icon name="mdi-magnify" className="pointer-events-none absolute top-1/2 left-2 -translate-y-1/2 text-muted-foreground" />
          <Input aria-label="Search" placeholder="Search" className="pl-8" value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
        <Button variant="outline" size="sm" disabled={!shown.length} onClick={() => onChange([...new Set([...selected, ...shown.map((item) => item.id)])])}>
          Select all shown
        </Button>
        <Button variant="ghost" size="sm" disabled={!selected.length} onClick={() => onChange([])}>
          Clear
        </Button>
      </div>
      {shown.length ? (
        <ul className="grid grid-cols-2 gap-3 sm:grid-cols-[repeat(auto-fill,minmax(150px,1fr))]">
          {shown.map((item) => {
            const on = selected.includes(item.id);
            const image = imageOf(item);
            const tag = tagOf?.(item);
            return (
              <li key={item.id}>
                <label
                  className={cn(
                    "relative flex h-full cursor-pointer flex-col overflow-hidden rounded-lg border bg-card transition-colors hover:border-primary",
                    on && "border-primary ring-2 ring-primary",
                  )}
                >
                  <span className={cn("flex items-center justify-center bg-band", round ? "p-3" : "aspect-[16/10]")}>
                    {image ? (
                      <img
                        src={image}
                        alt=""
                        onError={onImageError}
                        className={cn("block object-cover", round ? "size-20 rounded-full" : "h-full w-full")}
                      />
                    ) : null}
                  </span>
                  <span className="flex flex-1 items-start gap-2 p-2">
                    <span className="min-w-0 flex-1 text-sm leading-snug font-medium break-words">{item.name}</span>
                    {tag ? (
                      <Badge variant="outline" className="shrink-0 rounded-[4px]">
                        {tag}
                      </Badge>
                    ) : null}
                  </span>
                  <Checkbox
                    aria-label={item.name}
                    checked={on}
                    onCheckedChange={(checked) => toggle(item.id, !!checked)}
                    className="absolute top-2 left-2 size-5 bg-background"
                  />
                </label>
              </li>
            );
          })}
        </ul>
      ) : (
        <p className="py-6 text-center text-muted-foreground">{search.trim() ? "Nothing matches the search" : empty}</p>
      )}
    </div>
  );
}

export default PickGrid;
