"use client";
import { Combobox } from "@/components/ui/Combobox";
import { FlagIcon } from "@/components/FlagIcon";
import { countries } from "@/helpers/countries.js";

const items = countries.map((country: { a2: string; name: string }) => ({ value: country.a2, title: country.name }));

/** The country picker. Each row carries its flag, and so does the chosen country. */
export function CountrySelect({ value, onChange, id }: { value: string | null; onChange: (value: string | null) => void; id?: string }) {
  return (
    <Combobox
      id={id}
      label="Player Country"
      items={items}
      value={value}
      onChange={onChange}
      row={(item) => (
        <span className="flex items-center gap-2">
          <FlagIcon countryIdentifier={item.value} />
          {item.title}
        </span>
      )}
    />
  );
}

export default CountrySelect;
