"use client";
import { Field } from "@/components/ui/Field";
import { Input } from "@/components/ui/input";
import { useTheme } from "@/hooks/theme";
import { MIN_YEAR, maxYear, checkDate, dayDate, dayIso } from "@/helpers/date-input.mjs";

/** A day, typed and shown in the viewer's own locale by the native date input.
 *  The model stays a Date at local midnight, as every caller reads it. */
export function SimpleDatePicker({
  modelValue = null,
  label = "Date",
  disabled = false,
  onUpdateModelValue,
  id,
}: {
  modelValue?: string | Date | null;
  label?: string;
  disabled?: boolean;
  onUpdateModelValue?: (value: Date | null) => void;
  id?: string;
}) {
  // the native calendar button is drawn by the browser: it follows the app's theme, not the OS
  const { activeTheme } = useTheme();
  // What the field holds, "yyyy-mm-dd"
  const day = modelValue ? dayIso(modelValue instanceof Date ? modelValue : new Date(modelValue)) : "";
  const checked = day ? checkDate(day) : true;
  return (
    <Field label={label} htmlFor={id} error={checked === true ? null : checked}>
      <Input
        id={id}
        type="date"
        value={day}
        disabled={disabled}
        // The calendar itself refuses a year the season can never be in
        min={`${MIN_YEAR}-01-01`}
        max={`${maxYear()}-12-31`}
        style={{ colorScheme: activeTheme }}
        // A day the field cannot read clears the model, so no caller keeps the last good one
        onChange={(event) => onUpdateModelValue?.(dayDate(event.target.value))}
      />
    </Field>
  );
}

export default SimpleDatePicker;
