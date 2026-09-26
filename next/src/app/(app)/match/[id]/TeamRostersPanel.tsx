"use client";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { DataTable } from "@/components/ui/DataTable";
import { Field } from "@/components/ui/Field";
import { Icon } from "@/components/ui/Icon";
import { Input } from "@/components/ui/input";
import { PlayerName } from "@/components/PlayerName";
import { TeamName } from "@/components/TeamName";
import { W3CMmr } from "@/components/W3CMmr";
import { SyncedLine, mmrOf, type Row } from "./match-cells";

// The search matches the name
const matchesQuery = (player: Row, search: string) => {
  if (!search) return true;
  const needle = search.toLowerCase();
  return (player.name || "").toLowerCase().includes(needle);
};

function RosterCard({
  team,
  roster,
  selected,
  onSelectedChange,
  search,
  onSearchChange,
  isOut,
  hasSeries,
  onSelectAvailable,
}: {
  team: Row;
  roster: Row[];
  selected: number[];
  onSelectedChange: (ids: number[]) => void;
  search: string;
  onSearchChange: (value: string) => void;
  isOut: (player: Row) => boolean;
  hasSeries: (playerId: number) => boolean;
  onSelectAvailable: () => void;
}) {
  const shown = roster.filter((player) => matchesQuery(player, search));
  const allShown = shown.length > 0 && shown.every((player) => selected.includes(player.id));

  return (
    <Card className="card gap-0 py-0">
      <CardTitle className="flex flex-wrap items-center gap-2 bg-primary px-4 py-3 text-on-primary">
        <TeamName team={team} />
        <Badge variant="outline" className="border-on-primary text-on-primary">
          {selected.length} selected
        </Badge>
      </CardTitle>
      <CardContent className="p-0">
        <div className="flex flex-wrap items-center gap-2 p-2">
          <Input
            className="flex-1"
            aria-label={`Search ${team.name} players`}
            placeholder="Search players..."
            value={search}
            onChange={(event) => onSearchChange(event.target.value)}
          />
          <Button variant="ghost" size="sm" onClick={onSelectAvailable}>
            <Icon name="mdi-account-check" />
            Select available
          </Button>
        </div>
        <DataTable
          data={shown}
          pageSize={10}
          rowId={(row: Row) => String(row.id)}
          empty="No player of this roster matches the search."
          columns={[
            {
              id: "select",
              header: () => (
                <Checkbox
                  checked={allShown}
                  aria-label="Select every player shown"
                  // the header acts on the rows shown, so a pick the search hides survives a tick or an untick
                  onCheckedChange={(checked) =>
                    onSelectedChange(
                      checked
                        ? [...new Set([...selected, ...shown.map((player) => player.id)])]
                        : selected.filter((playerId) => !shown.some((player) => player.id === playerId)),
                    )
                  }
                />
              ),
              enableSorting: false,
              cell: ({ row }) => (
                <Checkbox
                  checked={selected.includes(row.original.id)}
                  aria-label={row.original.name}
                  onCheckedChange={(checked) =>
                    onSelectedChange(checked ? [...selected, row.original.id] : selected.filter((playerId) => playerId !== row.original.id))
                  }
                />
              ),
            },
            {
              id: "name",
              accessorKey: "name",
              header: "Name",
              cell: ({ row }) => (
                <PlayerName player={row.original} race={row.original.signup_race} mmr={false}>
                  {isOut(row.original) ? (
                    <Badge variant="outline" className="text-secondary border-secondary">Out</Badge>
                  ) : hasSeries(row.original.id) ? (
                    <Badge variant="outline" className="text-secondary border-secondary">Has series</Badge>
                  ) : null}
                </PlayerName>
              ),
            },
            {
              id: "w3c_mmr",
              accessorFn: (row: Row) => mmrOf(row, row.signup_race) || 0,
              header: () => <W3CMmr />,
              cell: ({ row }) => (
                <>
                  <Badge className="bg-info text-on-info tnum">{mmrOf(row.original, row.original.signup_race) ?? "N/A"}</Badge>
                  <SyncedLine player={row.original} />
                </>
              ),
            },
          ]}
        />
      </CardContent>
    </Card>
  );
}

/** The two rosters side by side, and the MMR window a proposal pairs them in.
 *  Proposing a series is an admin write, so only an admin opens this panel. */
export function TeamRostersPanel({
  team1,
  team2,
  roster1,
  roster2,
  selected1,
  onSelected1Change,
  selected2,
  onSelected2Change,
  search,
  onSearchChange,
  outTeam1,
  outTeam2,
  hasSeries,
  onSelectAvailableTeam1,
  onSelectAvailableTeam2,
  mmrDiff,
  onMmrDiffChange,
  canPropose,
  onPropose,
}: {
  team1: Row;
  team2: Row;
  roster1: Row[];
  roster2: Row[];
  selected1: number[];
  onSelected1Change: (ids: number[]) => void;
  selected2: number[];
  onSelected2Change: (ids: number[]) => void;
  search: string[];
  onSearchChange: (side: number, value: string) => void;
  outTeam1: (player: Row) => boolean;
  outTeam2: (player: Row) => boolean;
  hasSeries: (playerId: number) => boolean;
  onSelectAvailableTeam1: () => void;
  onSelectAvailableTeam2: () => void;
  mmrDiff: string;
  onMmrDiffChange: (value: string) => void;
  canPropose: boolean;
  onPropose: () => void;
}) {
  return (
    <Accordion className="card mt-4 rounded px-4">
      <AccordionItem value="rosters">
        <AccordionTrigger className="text-lg font-bold">
          <span className="flex items-center gap-2">
            <Icon name="mdi-account-group" />
            Team rosters and series proposal
          </span>
        </AccordionTrigger>
        <AccordionContent>
          <div className="mb-4 flex flex-col items-stretch gap-3 rounded bg-primary/12 p-4 min-[960px]:flex-row min-[960px]:items-end">
            <Field label="Max MMR Difference" htmlFor="propose-mmr-diff" className="min-[960px]:w-[240px]">
              <Input id="propose-mmr-diff" type="number" min={0} value={mmrDiff} onChange={(event) => onMmrDiffChange(event.target.value)} />
            </Field>
            <div className="flex-1 text-right">
              <Button size="lg" disabled={!canPropose} onClick={onPropose}>
                <Icon name="mdi-lightbulb-on" />
                Propose Series
              </Button>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 min-[960px]:grid-cols-2">
            <RosterCard
              team={team1}
              roster={roster1}
              selected={selected1}
              onSelectedChange={onSelected1Change}
              search={search[0] ?? ""}
              onSearchChange={(value) => onSearchChange(0, value)}
              isOut={outTeam1}
              hasSeries={hasSeries}
              onSelectAvailable={onSelectAvailableTeam1}
            />
            <RosterCard
              team={team2}
              roster={roster2}
              selected={selected2}
              onSelectedChange={onSelected2Change}
              search={search[1] ?? ""}
              onSearchChange={(value) => onSearchChange(1, value)}
              isOut={outTeam2}
              hasSeries={hasSeries}
              onSelectAvailable={onSelectAvailableTeam2}
            />
          </div>
        </AccordionContent>
      </AccordionItem>
    </Accordion>
  );
}

export default TeamRostersPanel;
