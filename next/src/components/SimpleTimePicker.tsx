"use client";
import { useId } from "react";
import { Field } from "@/components/ui/Field";
import { Input } from "@/components/ui/input";

/** A time of day, typed and shown in the viewer's own locale by the native time input.
 *  The model stays "HH:MM", as every caller reads it. */
export function SimpleTimePicker({
  modelValue = "",
  label = "Time",
  disabled = false,
  onUpdateModelValue,
  id,
}: {
  modelValue?: string | null;
  label?: string;
  disabled?: boolean;
  onUpdateModelValue?: (value: string) => void;
  id?: string;
}) {
  // The label reaches the input even when the caller passes no id
  const auto = useId();
  const inputId = id ?? auto;
  return (
    <Field label={label} htmlFor={inputId}>
      <Input id={inputId} type="time" value={modelValue ?? ""} disabled={disabled} onChange={(event) => onUpdateModelValue?.(event.target.value)} />
    </Field>
  );
}

export default SimpleTimePicker;
