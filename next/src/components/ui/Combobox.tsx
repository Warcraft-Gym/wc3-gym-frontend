"use client";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Command, CommandEmpty, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Icon } from "@/components/ui/Icon";
import { cn } from "@/lib/utils";

export type ComboboxItem = { value: string; title: string };

/** The port of `v-autocomplete`: a Command inside a Popover. `row` draws an item the way
 *  the Vue item slot did, so a row can carry a race icon, a flag or a PlayerName. */
export function Combobox<T extends ComboboxItem>({
  items,
  value,
  onChange,
  label,
  placeholder = "Search",
  empty = "No match",
  row,
  className,
  id,
  disabled,
}: {
  items: T[];
  value: string | null;
  onChange: (value: string | null) => void;
  label?: string;
  placeholder?: string;
  empty?: string;
  row?: (item: T) => React.ReactNode;
  className?: string;
  id?: string;
  disabled?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const chosen = items.find((i) => i.value === value) ?? null;
  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger
        render={
          <Button id={id} variant="outline" role="combobox" aria-label={label} disabled={disabled} className={cn("w-full justify-between font-normal", className)}>
            <span className="flex items-center gap-2 truncate">{chosen ? (row ? row(chosen) : chosen.title) : (label ?? placeholder)}</span>
            <Icon name="mdi-chevron-down" className="opacity-60" />
          </Button>
        }
      />
      <PopoverContent className="w-(--anchor-width) p-0" align="start">
        <Command>
          <CommandInput placeholder={placeholder} />
          <CommandList>
            <CommandEmpty>{empty}</CommandEmpty>
            {items.map((item) => (
              <CommandItem
                key={item.value}
                value={item.title}
                onSelect={() => {
                  onChange(item.value);
                  setOpen(false);
                }}
              >
                {row ? row(item) : item.title}
              </CommandItem>
            ))}
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
