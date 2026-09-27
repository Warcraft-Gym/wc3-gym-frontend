/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";
import { Badge } from "@/components/ui/badge";
import { Combobox } from "@/components/ui/Combobox";
import { Icon } from "@/components/ui/Icon";

// a player row as the reads answer it: an id and a name
type Player = Record<string, any>;

/** Any number of players: the picker adds one, and each chip takes one back out. The picker
 *  lists the offered players not chosen yet; a chosen player the list does not hold keeps a chip. */
export function PlayerChipPicker({
  players,
  selected,
  onChange,
  label,
  placeholder = "Start typing to search...",
  empty,
  disabled = false,
}: {
  players: Player[];
  selected: number[];
  onChange: (ids: number[]) => void;
  label: string;
  placeholder?: string;
  empty?: string;
  disabled?: boolean;
}) {
  const nameOf = (id: number) => players.find((player) => player.id === id)?.name ?? `Player ${id}`;

  return (
    <div>
      <Combobox
        label={label}
        placeholder={placeholder}
        empty={empty}
        disabled={disabled}
        items={players.filter((player) => !selected.includes(player.id)).map((player) => ({ value: String(player.id), title: player.name ?? "" }))}
        value={null}
        onChange={(value) => (value == null ? undefined : onChange([...selected, Number(value)]))}
      />
      {selected.length ? (
        <div className="mt-2 flex flex-wrap gap-2">
          {selected.map((id) => (
            <Badge key={id} variant="secondary">
              {nameOf(id)}
              <button type="button" aria-label={`Remove ${nameOf(id)}`} onClick={() => onChange(selected.filter((other) => other !== id))}>
                <Icon name="mdi-close" />
              </button>
            </Badge>
          ))}
        </div>
      ) : null}
    </div>
  );
}

export default PlayerChipPicker;
