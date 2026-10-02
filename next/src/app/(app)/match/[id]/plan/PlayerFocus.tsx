"use client";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Combobox, type ComboboxItem } from "@/components/ui/Combobox";
import { Icon } from "@/components/ui/Icon";

/* eslint-disable @typescript-eslint/no-explicit-any */
type Row = Record<string, any>;
type Option = ComboboxItem & { team: string; mmr: number | null };

/** The players whose every opponent the list shows: typed into a search, one at a time, each kept as a
 *  chip with its own ×. No player shows every pair inside the range. */
export function PlayerFocus({
  teams,
  selected,
  disabled,
  onChange,
}: {
  teams: { name: string; players: Row[] }[];
  selected: number[];
  disabled: boolean;
  onChange: (ids: number[]) => void;
}) {
  const options: Option[] = teams.flatMap((team) =>
    team.players.map((player) => ({ value: String(player.user_id), title: player.name ?? "", team: team.name, mmr: player.mmr ?? null })),
  );
  const nameOf = (id: number) => options.find((one) => Number(one.value) === id)?.title ?? `Player ${id}`;
  return (
    <div className="flex flex-wrap items-center gap-2" role="group" aria-label="Show the opponents of chosen players">
      <span className="text-sm font-medium">Show</span>
      {selected.map((id) => (
        <Badge key={id} variant="secondary" className="gap-1 pr-1">
          {nameOf(id)}
          <button type="button" className="inline-grid rounded-full hover:bg-foreground/10" aria-label={`Stop showing ${nameOf(id)}`} disabled={disabled} onClick={() => onChange(selected.filter((other) => other !== id))}>
            <Icon name="mdi-close" size={14} />
          </button>
        </Badge>
      ))}
      <Combobox
        items={options.filter((one) => !selected.includes(Number(one.value)))}
        value={null}
        onChange={(value) => (value == null ? undefined : onChange([...selected, Number(value)]))}
        label={selected.length ? "Add a player" : "All players"}
        placeholder="Type a name"
        empty="No player matches"
        disabled={disabled}
        className="h-8 w-44"
        row={(one) => (
          <span className="flex w-full items-center gap-2">
            <span className="truncate">{one.title}</span>
            <span className="text-xs text-muted-foreground">{one.team}</span>
            {one.mmr != null ? <span className="ml-auto text-muted-foreground tnum">{one.mmr}</span> : null}
          </span>
        )}
      />
      {selected.length ? (
        <Button variant="link" size="sm" disabled={disabled} onClick={() => onChange([])}>
          Show all
        </Button>
      ) : null}
    </div>
  );
}

export default PlayerFocus;
