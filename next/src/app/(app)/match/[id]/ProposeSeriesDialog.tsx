"use client";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { DataTable } from "@/components/ui/DataTable";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { Icon } from "@/components/ui/Icon";
import { Input } from "@/components/ui/input";
import { toneClass } from "@/components/ui/tone";
import { PlayerName } from "@/components/PlayerName";
import { StatusAlert } from "@/components/StatusAlert";
import { VsRaces } from "@/components/VsRaces";
import { W3CMmr } from "@/components/W3CMmr";
import { showDefaultTeamImage, teamImageUrl } from "@/helpers/team-image";
import { FacedRaces, SyncedLine, getHighestW3CMMR, mmrOf, type Row } from "./match-cells";

const matchesQuery = (row: Row, search: string) => {
  if (!search) return true;
  const needle = search.toLowerCase();
  return (row.player1?.name || "").toLowerCase().includes(needle) || (row.player2?.name || "").toLowerCase().includes(needle);
};

function TeamChip({ team }: { team: Row }) {
  return (
    <Badge className="bg-primary px-3 py-1 text-base text-on-primary">
      <img className="size-5 rounded-full object-cover" alt="" src={teamImageUrl(team)} onError={showDefaultTeamImage} />
      {team.name}
    </Badge>
  );
}

/** The pairs inside the MMR window, for an admin to create as drafts or as published series. */
export function ProposeSeriesDialog({
  open,
  team1,
  team2,
  proposed,
  selected,
  onSelectedChange,
  search,
  onSearchChange,
  pairs,
  existing,
  ladderById,
  seasonId,
  w3cSeason,
  hasSeries,
  errorMessage,
  onErrorClose,
  onRemove,
  onCreate,
  onCancel,
}: {
  open: boolean;
  team1: Row;
  team2: Row;
  proposed: Row[];
  selected: string[];
  onSelectedChange: (keys: string[]) => void;
  search: string;
  onSearchChange: (value: string) => void;
  pairs: number;
  existing: number;
  ladderById: Map<number, Row>;
  seasonId?: number;
  w3cSeason?: number;
  hasSeries: (playerId: number) => boolean;
  errorMessage: string | null;
  onErrorClose: () => void;
  onRemove: (key: string) => void;
  onCreate: (isDraft: boolean) => void;
  onCancel: () => void;
}) {
  const shown = proposed.filter((row) => matchesQuery(row, search));
  const allShown = shown.length > 0 && shown.every((row) => selected.includes(row.key));

  // the same player on the same side of another ticked row: creating the selection writes both series
  const pickedElsewhere = (row: Row, n: 1 | 2) =>
    proposed.some((other) => other.key !== row.key && selected.includes(other.key) && other[`player${n}`]?.id === row[`player${n}`]?.id);

  const nameCell = (row: Row, n: 1 | 2) => (
    <PlayerName player={row[`player${n}`]} race={row[`player${n}_race`]} mmr={false}>
      {hasSeries(row[`player${n}`]?.id) ? <Badge variant="outline" className="text-secondary border-secondary">Has series</Badge> : null}
      {pickedElsewhere(row, n) ? <Badge variant="outline" className="text-warning border-warning">Already picked</Badge> : null}
    </PlayerName>
  );

  const sideColumns = (n: 1 | 2) => [
    {
      id: `player${n}.name`,
      accessorFn: (row: Row) => row[`player${n}`]?.name ?? "",
      header: `Player ${n}`,
      cell: ({ row }: { row: { original: Row } }) => nameCell(row.original, n),
    },
    {
      id: `p${n}_matchup_history`,
      header: "Faced Races",
      enableSorting: false,
      cell: ({ row }: { row: { original: Row } }) => <FacedRaces player={row.original[`player${n}`]} seasonId={seasonId} />,
    },
    {
      id: `p${n}_vs_race`,
      header: "vs race",
      enableSorting: false,
      cell: ({ row }: { row: { original: Row } }) => (
        <VsRaces player={ladderById.get(row.original[`player${n}`]?.id)} race={row.original[`player${n === 1 ? 2 : 1}_race`]} />
      ),
    },
    {
      id: `p${n}_w3c_mmr`,
      accessorFn: (row: Row) => mmrOf(row[`player${n}`], row[`player${n}_race`], w3cSeason) || 0,
      header: () => <W3CMmr />,
      cell: ({ row }: { row: { original: Row } }) => (
        <>
          <span className="tnum">{mmrOf(row.original[`player${n}`], row.original[`player${n}_race`], w3cSeason) ?? "N/A"}</span>
          <SyncedLine player={row.original[`player${n}`]} />
        </>
      ),
    },
    {
      id: `p${n}_w3c_high_mmr`,
      accessorFn: (row: Row) => getHighestW3CMMR(row[`player${n}`], w3cSeason) || 0,
      header: "Highest Race MMR",
      cell: ({ row }: { row: { original: Row } }) => <span className="tnum">{getHighestW3CMMR(row.original[`player${n}`], w3cSeason) ?? "N/A"}</span>,
    },
  ];

  return (
    <Dialog open={open} onOpenChange={(next) => (next ? undefined : onCancel())}>
      <DialogContent showCloseButton={false} className="flex max-h-[95vh] max-w-[1400px] flex-col gap-0 overflow-hidden p-0 sm:max-w-[1400px]">
        <DialogTitle className="flex items-center gap-2 bg-primary px-4 py-3 text-on-primary">
          <Icon name="mdi-lightbulb-on" />
          Proposed series
        </DialogTitle>

        <StatusAlert modelValue={errorMessage} onClose={onErrorClose} className="mx-4 mt-4" />

        <div className="flex items-center justify-center gap-4 p-3">
          <TeamChip team={team1} />
          <Icon name="mdi-sword-cross" size={28} />
          <TeamChip team={team2} />
        </div>

        <div className="flex-1 overflow-y-auto">
          {proposed.length > 0 ? (
            <>
              <div className="flex flex-wrap items-center gap-2 p-2">
                <span className="flex items-center gap-2 font-bold">
                  <Icon name="mdi-format-list-bulleted" />
                  Matched Players
                </span>
                <Badge className={toneClass(null)}>{selected.length} selected</Badge>
                {existing ? <span className="text-xs text-muted-foreground">{existing} skipped, already have a series</span> : null}
                <Input
                  className="ms-auto max-w-[280px]"
                  aria-label="Search by player name"
                  placeholder="Search by player name..."
                  value={search}
                  onChange={(event) => onSearchChange(event.target.value)}
                />
              </div>
              <DataTable
                data={shown}
                pageSize={10}
                rowId={(row: Row) => String(row.key)}
                empty="No pair matches the search."
                columns={[
                  {
                    id: "select",
                    header: () => (
                      <Checkbox
                        checked={allShown}
                        aria-label="Select every pair shown"
                        // the header acts on the rows shown, so a pick the search hides survives a tick or an untick
                        onCheckedChange={(checked) =>
                          onSelectedChange(
                            checked
                              ? [...new Set([...selected, ...shown.map((row) => row.key)])]
                              : selected.filter((key) => !shown.some((row) => row.key === key)),
                          )
                        }
                      />
                    ),
                    enableSorting: false,
                    cell: ({ row }) => (
                      <Checkbox
                        checked={selected.includes(row.original.key)}
                        aria-label={`${row.original.player1?.name} against ${row.original.player2?.name}`}
                        onCheckedChange={(checked) =>
                          onSelectedChange(checked ? [...selected, row.original.key] : selected.filter((key) => key !== row.original.key))
                        }
                      />
                    ),
                  },
                  ...sideColumns(1),
                  ...sideColumns(2),
                  {
                    id: "actions",
                    header: "",
                    enableSorting: false,
                    cell: ({ row }) => (
                      <Button variant="ghost" size="icon-sm" className="text-error" aria-label="Drop this pair" onClick={() => onRemove(row.original.key)}>
                        <Icon name="mdi-delete" />
                      </Button>
                    ),
                  },
                ]}
              />
            </>
          ) : (
            <div className={`alert m-4 flex items-center gap-2 rounded px-3 py-2 ${toneClass("info")}`}>
              <Icon name="mdi-information-outline" />
              {!pairs
                ? "Select players on both rosters first."
                : existing === pairs
                  ? "Every selected pair already has a series on this match."
                  : "No pairs within the MMR difference."}
            </div>
          )}
        </div>

        <div className="flex flex-wrap justify-end gap-2 border-t p-4">
          <Button variant="ghost" onClick={onCancel}>
            Cancel
          </Button>
          <Button className="bg-warning text-on-warning" disabled={!selected.length} onClick={() => onCreate(true)}>
            <Icon name="mdi-pencil" />
            Create {selected.length} Draft Series
          </Button>
          <Button disabled={!selected.length} onClick={() => onCreate(false)}>
            <Icon name="mdi-publish" />
            Create {selected.length} Published Series
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export default ProposeSeriesDialog;
