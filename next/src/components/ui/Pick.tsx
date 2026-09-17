"use client";
import { useId } from "react";
import { Button } from "@/components/ui/button";
import { Field } from "@/components/ui/Field";
import { Icon } from "@/components/ui/Icon";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export type PickItem<V> = { value: V; title: string };

/** The port of a labelled `v-select` over `{ value, title }` items. `row` draws an item the
 *  way the Vue item slot did; `clearable` adds the button that empties the pick. With
 *  `labelAfter` the label reads above the field and follows it in the markup, as the floating
 *  label of an outlined `v-select` does. */
export function Pick<V extends string | number, T extends PickItem<V> = PickItem<V>>({
  label,
  hint,
  items,
  value,
  onChange,
  row,
  clearable,
  labelAfter,
  disabled,
  className,
}: {
  label: string;
  hint?: string;
  items: T[];
  value: V | null;
  onChange: (value: V | null) => void;
  row?: (item: T) => React.ReactNode;
  clearable?: boolean;
  labelAfter?: boolean;
  disabled?: boolean;
  className?: string;
}) {
  const id = useId();
  const control = (
    <div className="flex items-center gap-1">
      <Select value={value} onValueChange={(next) => onChange(next as V | null)} disabled={disabled}>
        <SelectTrigger id={id} className="w-full min-w-0">
          <SelectValue>{(chosen: V | null) => items.find((item) => item.value === chosen)?.title ?? ""}</SelectValue>
        </SelectTrigger>
        <SelectContent>
          {items.map((item) => (
            <SelectItem key={item.value} value={item.value}>
              {row ? row(item) : item.title}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      {clearable && value != null ? (
        <Button variant="ghost" size="icon-sm" aria-label={`Clear ${label}`} onClick={() => onChange(null)}>
          <Icon name="mdi-close" />
        </Button>
      ) : null}
    </div>
  );
  if (labelAfter)
    return (
      <div className={cn("flex flex-col-reverse gap-1.5", className)}>
        {control}
        <Label htmlFor={id}>{label}</Label>
      </div>
    );
  return (
    <Field label={label} hint={hint} htmlFor={id} className={className}>
      {control}
    </Field>
  );
}
