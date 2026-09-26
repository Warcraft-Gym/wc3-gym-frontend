"use client";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { DataTable } from "@/components/ui/DataTable";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { Icon } from "@/components/ui/Icon";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { TapTooltip } from "@/components/ui/TapTooltip";
import { PlayerName } from "@/components/PlayerName";
import { StatusAlert } from "@/components/StatusAlert";
import { TeamName } from "@/components/TeamName";
import { W3CIcon } from "@/components/W3CIcon";
import { W3CMmr } from "@/components/W3CMmr";
import { SyncedLine, mmrOf, type Row } from "./match-cells";

export type SideTeam = { team: Row; roster: Row[]; isOut: (player: Row) => boolean };

// The search matches the name
const matchesQuery = (player: Row, search: string) => {
  if (!search) return true;
  const needle = search.toLowerCase();
  return (player.name || "").toLowerCase().includes(needle);
};

/** Add one series: one player from each roster, published or as a draft. */
export function CreateSeriesDialog({
  open,
  sideTeams,
  selected,
  onSelectedChange,
  search,
  onSearchChange,
  isDraft,
  onIsDraftChange,
  isAdmin,
  isLoading,
  error,
  onErrorClose,
  onSyncW3C,
  onCreate,
  onCancel,
}: {
  open: boolean;
  sideTeams: SideTeam[];
  selected: number[][]; // the chosen player id of each side, at most one
  onSelectedChange: (side: number, ids: number[]) => void;
  search: string[];
  onSearchChange: (side: number, value: string) => void;
  isDraft: boolean;
  onIsDraftChange: (value: boolean) => void;
  isAdmin: boolean;
  isLoading: boolean;
  error: string | null;
  onErrorClose: () => void;
  onSyncW3C: () => void;
  onCreate: () => void;
  onCancel: () => void;
}) {
  const chosen = (side: number) => sideTeams[side]?.roster.find((player) => selected[side]?.includes(player.id));

  return (
    <Dialog open={open} onOpenChange={(next) => (next ? undefined : onCancel())} disablePointerDismissal>
      <DialogContent showCloseButton={false} className="flex max-h-[95vh] w-[95vw] max-w-[95vw] flex-col gap-0 overflow-hidden p-0 sm:max-w-[95vw]">
        <DialogTitle className="flex items-center gap-2 bg-primary px-4 py-3 text-on-primary">
          <Icon name="mdi-plus-circle" />
          Add new series
        </DialogTitle>

        <StatusAlert modelValue={error} onClose={onErrorClose} className="mx-4 mt-4" />

        <div className="flex flex-1 flex-col gap-4 overflow-y-auto p-4 min-[960px]:flex-row">
          {sideTeams.map((side, i) => (
            <div key={i} className="flex flex-1 flex-col gap-4 min-[960px]:flex-row">
              <div className="card flex flex-1 flex-col overflow-hidden rounded">
                <div className="flex flex-wrap items-center gap-2 bg-primary px-3 py-2 text-on-primary">
                  {/* the dialog holds unsaved picks, so the team reads as plain text */}
                  <TeamName team={side.team} plain className="font-bold" />
                  <Input
                    className="ms-auto max-w-[300px] bg-surface text-foreground"
                    aria-label={`Search Team ${i + 1}`}
                    placeholder={`Search Team ${i + 1}`}
                    value={search[i] ?? ""}
                    onChange={(event) => onSearchChange(i, event.target.value)}
                  />
                </div>
                <DataTable
                  data={side.roster.filter((player) => matchesQuery(player, search[i] ?? ""))}
                  pageSize={10}
                  rowId={(row: Row) => String(row.id)}
                  empty="No player of this roster matches the search."
                  columns={[
                    {
                      id: "select",
                      header: "",
                      enableSorting: false,
                      cell: ({ row }) => (
                        // one player a side: a tick takes the place of the one already ticked
                        <Checkbox
                          checked={!!selected[i]?.includes(row.original.id)}
                          onCheckedChange={(checked) => onSelectedChange(i, checked ? [row.original.id] : [])}
                          aria-label={row.original.name}
                        />
                      ),
                    },
                    {
                      id: "name",
                      accessorKey: "name",
                      header: "Name",
                      cell: ({ row }) => (
                        <PlayerName player={row.original} race={row.original.signup_race} mmr={false}>
                          {side.isOut(row.original) ? <Badge variant="outline" className="text-secondary border-secondary">Out</Badge> : null}
                        </PlayerName>
                      ),
                    },
                    {
                      id: "w3c_mmr",
                      accessorFn: (row: Row) => mmrOf(row, row.signup_race) || 0,
                      header: () => <W3CMmr />,
                      cell: ({ row }) => (
                        <>
                          <span className="tnum">{mmrOf(row.original, row.original.signup_race) || "N/A"}</span>
                          <SyncedLine player={row.original} />
                        </>
                      ),
                    },
                  ]}
                />
              </div>

              {i === 0 ? (
                <div className="hidden flex-col items-center justify-center gap-4 min-[960px]:flex">
                  <Icon name="mdi-sword-cross" size={80} className="text-primary" />
                  {isAdmin ? (
                    <TapTooltip content="MMR and ladder matches">
                      <Button onClick={onSyncW3C} disabled={isLoading}>
                        <W3CIcon size={18} />
                        Sync W3C
                      </Button>
                    </TapTooltip>
                  ) : null}
                </div>
              ) : null}
            </div>
          ))}
        </div>

        <div className="flex flex-wrap items-center gap-2 border-t p-4">
          <Label className="flex items-center gap-2">
            <Checkbox checked={isDraft} disabled={!isAdmin} onCheckedChange={(checked) => onIsDraftChange(!!checked)} />
            Create as Draft
          </Label>
          <span className="flex-1" />
          <Button variant="ghost" onClick={onCancel}>
            Cancel
          </Button>
          <Button onClick={onCreate} disabled={!chosen(0) || !chosen(1)}>
            <Icon name="mdi-plus" />
            Create Series
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export default CreateSeriesDialog;
