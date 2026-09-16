"use client";
import { Combobox } from "@/components/ui/Combobox";
import { RaceIcon } from "@/components/RaceIcon";
import { raceWrapper } from "@/helpers/races.js";

/** The race picker. `exclude` names race ids the list leaves out. */
export function RaceSelect({
  value,
  onChange,
  label = "Race",
  exclude = [],
  id,
}: {
  value: string | null;
  onChange: (value: string | null) => void;
  label?: string;
  exclude?: string[];
  id?: string;
}) {
  const items = raceWrapper.races
    .filter((race: { id: string }) => !exclude.includes(race.id))
    .map((race: { id: string; name: string }) => ({ value: race.id, title: race.name }));
  return (
    <Combobox
      id={id}
      label={label}
      items={items}
      value={value}
      onChange={onChange}
      row={(item) => (
        <span className="flex items-center gap-2">
          <RaceIcon raceIdentifier={item.value} />
          {item.title}
        </span>
      )}
    />
  );
}

export default RaceSelect;
