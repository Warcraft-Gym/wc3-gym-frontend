"use client";
import { useState } from "react";
import { ColumnNote } from "@/components/ColumnNote";
import { ConfirmDeleteDialog } from "@/components/ConfirmDeleteDialog";
import { FilterPanel } from "@/components/FilterPanel";
import { GroupedTable } from "@/components/GroupedTable";
import { RowActions } from "@/components/RowActions";
import { SyncProgress } from "@/components/SyncProgress";
import { TeamRoster } from "@/components/TeamRoster";
import { W3CSyncResultDialog } from "@/components/W3CSyncResultDialog";
import { Button } from "@/components/ui/button";

const COLUMNS = [
  { key: "player", title: "Player" },
  { key: "played", title: "Played", align: "right" as const },
  { key: "won", title: "Won", align: "right" as const, phone: false },
];

const GROUPS = [
  {
    key: "gold",
    title: "Gold",
    label: "Gold division",
    rows: [
      { id: 11, name: "Blackrock", played: 8, won: 6 },
      { id: 12, name: "Frostwolf", played: 8, won: 5 },
    ],
  },
  {
    key: "silver",
    title: "Silver",
    label: "Silver division",
    rows: [
      { id: 21, name: "Ironforge", played: 8, won: 3 },
      { id: 22, name: "Warsong", played: 8, won: 2 },
    ],
  },
];

const CAPTAINS = [{ id: 52, name: "Peterian", country: "DE", signup_race: "HU" }];
const MEMBERS = [
  { id: 61, name: "Blackrock", country: "SN", signup_race: "OC" },
  { id: 62, name: "Frostwolf", country: "DE", signup_race: "NE" },
];

const ACTIONS = [
  { icon: "mdi-pencil", label: "Edit team", public: true, onClick: () => {} },
  { icon: "mdi-account-plus", label: "Add player", public: true, onClick: () => {} },
  { icon: "mdi-delete", label: "Delete team", color: "error", public: true, onClick: () => {} },
];

const SYNC_ENTRIES = [
  { title: "Blackrock", result: { synced: [1, 2, 3], skipped: [4], failed: [], total: 4 } },
  { title: "Frostwolf", result: { synced: [], skipped: [], failed: [{ id: 62, name: "Frostwolf", battleTag: "", reason: "No W3C account" }], total: 1 } },
  { title: "Ironforge", error: { message: "The sync route answered 502" } },
];

/** Every U1 component with sample props, so the render gate can see each one draw. */
export function Kit() {
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [syncOpen, setSyncOpen] = useState(false);
  const [searchName, setSearchName] = useState("");
  const [searchRace, setSearchRace] = useState<string | null>(null);
  const [seasonFilter, setSeasonFilter] = useState<number | null>(null);
  const [range, setRange] = useState([0, 3000]);

  return (
    <div className="mt-8 flex flex-col gap-8">
      <section>
        <h2>Grouped table</h2>
        <GroupedTable
          columns={COLUMNS}
          groups={GROUPS}
          defaultOpen
          empty="No standings yet"
          head={{ won: <ColumnNote title="Won" note="Series this entrant won in the division." /> }}
          group={({ group }) => (
            <td colSpan={COLUMNS.length}>
              <strong>{group.title}</strong>
              <span className="ml-2 text-muted-foreground">{group.rows.length} entrants</span>
            </td>
          )}
          rows={({ group }) =>
            group.rows.map((row) => (
              <tr key={row.id} className="detail-row border-b">
                <td />
                <td className="p-2">{row.name}</td>
                <td className="p-2 text-right tnum">{row.played}</td>
                <td className="hidden p-2 text-right tnum min-[960px]:table-cell">{row.won}</td>
              </tr>
            ))
          }
        />
      </section>

      <section>
        <h2>Column note</h2>
        <ColumnNote title="Ladder score" note="The points a player earned on the season ladder." sortIcon="mdi-arrow-down" />
      </section>

      <section>
        <h2>Row actions</h2>
        <RowActions actions={ACTIONS} />
        <RowActions actions={ACTIONS} inline />
      </section>

      <section>
        <h2>Confirm delete dialog</h2>
        <Button variant="outline" onClick={() => setConfirmOpen(true)}>
          Open the delete ask
        </Button>
        <ConfirmDeleteDialog
          modelValue={confirmOpen}
          message="Delete team Blackrock? Its rosters go with it."
          deleteIcon="mdi-delete"
          onUpdateModelValue={setConfirmOpen}
          onConfirm={() => setConfirmOpen(false)}
          onCancel={() => setConfirmOpen(false)}
        />
      </section>

      <section>
        <h2>W3C sync result dialog</h2>
        <Button variant="outline" onClick={() => setSyncOpen(true)}>
          Open the sync results
        </Button>
        <W3CSyncResultDialog modelValue={syncOpen} entries={SYNC_ENTRIES} onUpdateModelValue={setSyncOpen} />
      </section>

      <section>
        <h2>Sync progress</h2>
        <SyncProgress caption="Ladder last synced 2 hours ago" stamp="2026-09-16 08:12 UTC" />
      </section>

      <section>
        <h2>Filter panel</h2>
        <FilterPanel
          seasons={[
            { id: 19, name: "GNL S19" },
            { id: 18, name: "GNL S18" },
          ]}
          searchName={searchName}
          onSearchNameChange={setSearchName}
          searchRace={searchRace}
          onSearchRaceChange={setSearchRace}
          selectedSeasonFilter={seasonFilter}
          onSelectedSeasonFilterChange={setSeasonFilter}
          rangeValues={range}
          onRangeValuesChange={setRange}
          onReset={() => {
            setSearchName("");
            setSearchRace(null);
            setSeasonFilter(null);
            setRange([0, 3000]);
          }}
          summary={<span className="text-sm text-muted-foreground">3 of 24 players</span>}
        />
      </section>

      <section>
        <h2>Team roster</h2>
        <TeamRoster captains={CAPTAINS} members={MEMBERS} />
      </section>
    </div>
  );
}

export default Kit;
