"use client";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { DataTable } from "@/components/ui/DataTable";
import { Icon } from "@/components/ui/Icon";
import { CastChips, type CastSeries } from "@/components/CastChips";
import { PlayerName } from "@/components/PlayerName";
import { RowActions, type RowAction } from "@/components/RowActions";
import { SeriesCard } from "@/components/SeriesCard";
import { VsRaces, VsRacesHead } from "@/components/VsRaces";
import { W3CMmr } from "@/components/W3CMmr";
import { toneClass } from "@/components/ui/tone";
import { FacedRaces, SyncedLine, getHighestW3CMMR, mmrOf, type Row } from "./match-cells";

const WON_FILL = "bg-win text-on-win";
const NEUTRAL_FILL = "bg-muted text-foreground";

// A score the winner took wears the win fill; an unplayed series shows a dash
const scoreBadge = (value: number | null | undefined, won: boolean) => <Badge className={`tnum ${won ? WON_FILL : NEUTRAL_FILL}`}>{value ?? "–"}</Badge>;

/** The published series of the match: who plays whom, when, and how it ended. */
export function PublishedSeries({
  series,
  smAndDown,
  isAdmin,
  formateDate,
  seriesActions,
  onAddSeries,
  onDeleteAll,
}: {
  series: Row[];
  smAndDown: boolean;
  isAdmin: boolean;
  formateDate: (value?: string | null) => string | null | undefined;
  seriesActions: (item: Row) => RowAction[];
  onAddSeries: () => void;
  onDeleteAll: () => void;
}) {
  if (!series.length) {
    return (
      <div className="p-8 text-center">
        <Icon name="mdi-trophy-broken" size={64} className="text-muted-foreground" />
        <div className="mt-4 text-xl text-muted-foreground">No published series yet</div>
        {isAdmin ? (
          <Button variant="outline" className="mt-4 text-primary-text" onClick={onAddSeries}>
            <Icon name="mdi-plus" />
            Create Series
          </Button>
        ) : null}
      </div>
    );
  }

  const nameCell = (item: Row, n: 1 | 2) => (
    <>
      <PlayerName player={item[`player${n}`]} race={item[`player${n}_race`]} mmr={item[`player${n}_mmr`]} host={item.host_player_id === item[`player${n}`]?.id} />
      <div>
        <SyncedLine player={item[`player${n}`]} />
      </div>
    </>
  );

  return (
    <>
      {isAdmin ? (
        <div className="flex justify-end p-2">
          <Button className="w-full min-[960px]:w-auto" onClick={onAddSeries}>
            <Icon name="mdi-plus" />
            Add Series
          </Button>
        </div>
      ) : null}

      {!smAndDown ? (
        <DataTable
          data={series}
          pageSize={10}
          rowId={(row: Row) => String(row.id)}
          columns={[
            {
              id: "date_time",
              header: "Date/Time",
              enableSorting: false,
              cell: ({ row }) => (
                <>
                  <div className="whitespace-nowrap">
                    {row.original.date_time ? formateDate(row.original.date_time) : <span className="text-muted-foreground">Not scheduled</span>}
                  </div>
                  <CastChips series={row.original as CastSeries} />
                </>
              ),
            },
            { id: "player1.name", accessorFn: (row: Row) => row.player1?.name ?? "", header: "Player 1", cell: ({ row }) => nameCell(row.original, 1) },
            {
              id: "p1_score",
              header: "P1 Score",
              enableSorting: false,
              cell: ({ row }) => scoreBadge(row.original.player1_score, row.original.player1_score > row.original.player2_score),
            },
            {
              id: "p2_score",
              header: "P2 Score",
              enableSorting: false,
              cell: ({ row }) => scoreBadge(row.original.player2_score, row.original.player2_score > row.original.player1_score),
            },
            { id: "player2.name", accessorFn: (row: Row) => row.player2?.name ?? "", header: "Player 2", cell: ({ row }) => nameCell(row.original, 2) },
            {
              id: "fantasy",
              header: () => <Icon name="mdi-star" className="text-primary" title="Fantasy match" aria-label="Fantasy match" />,
              enableSorting: false,
              cell: ({ row }) =>
                row.original.is_fantasy_match ? <Icon name="mdi-star" className="text-primary" title="Fantasy match" /> : <span className="text-muted-foreground">—</span>,
            },
            { id: "actions", header: "", enableSorting: false, cell: ({ row }) => <RowActions actions={seriesActions(row.original)} /> },
          ]}
        />
      ) : (
        <div>
          {series.map((item) => (
            <SeriesCard
              key={item.id}
              series={item}
              title={item.date_time ? formateDate(item.date_time) : "Not scheduled"}
              actions={
                <>
                  <CastChips series={item as CastSeries} />
                  <RowActions actions={seriesActions(item)} />
                </>
              }
              side={({ n, won }) => scoreBadge(n ? item.player2_score : item.player1_score, won)}
            />
          ))}
        </div>
      )}

      {isAdmin ? (
        <div className="flex justify-end p-2">
          <Button variant="ghost" className="text-error" onClick={onDeleteAll}>
            <Icon name="mdi-delete-sweep" />
            Delete All Published
          </Button>
        </div>
      ) : null}
    </>
  );
}

/** The draft series of the match: what a captain plans before an admin publishes it. */
export function DraftSeries({
  draftSeries,
  smAndDown,
  w3cSeason,
  seasonId,
  ladderById,
  isAdmin,
  canDraft,
  draftActions,
  onAddDraftSeries,
  onPublishAll,
  onDeleteAll,
}: {
  draftSeries: Row[];
  smAndDown: boolean;
  w3cSeason?: number;
  seasonId?: number;
  ladderById: Map<number, Row>;
  isAdmin: boolean;
  canDraft: boolean;
  draftActions: (item: Row) => RowAction[];
  onAddDraftSeries: () => void;
  onPublishAll: () => void;
  onDeleteAll: () => void;
}) {
  if (!draftSeries.length) {
    return (
      <div className="p-8 text-center">
        <Icon name="mdi-pencil-box-outline" size={64} className="text-warning" />
        <div className="mt-4 text-xl text-muted-foreground">No draft series yet</div>
        <div className="mt-2 text-muted-foreground">Drafts let you plan series without affecting the website or calculations</div>
        {canDraft ? (
          <Button variant="outline" className="mt-4 text-warning" onClick={onAddDraftSeries}>
            <Icon name="mdi-plus" />
            Create Draft Series
          </Button>
        ) : null}
      </div>
    );
  }

  const sideColumns = (n: 1 | 2) => [
    {
      id: `player${n}.name`,
      accessorFn: (row: Row) => row[`player${n}`]?.name ?? "",
      header: `Player ${n}`,
      cell: ({ row }: { row: { original: Row } }) => (
        <PlayerName player={row.original[`player${n}`]} race={row.original[`player${n}_race`]} host={row.original.host_player_id === row.original[`player${n}`]?.id} mmr={false} />
      ),
    },
    {
      id: `p${n}_matchup_history`,
      header: "Faced Races",
      enableSorting: false,
      cell: ({ row }: { row: { original: Row } }) => <FacedRaces player={row.original[`player${n}`]} seasonId={seasonId} />,
    },
    {
      id: `p${n}_vs_race`,
      header: () => <VsRacesHead />,
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
        <div className="text-right">
          <Badge className="bg-info text-on-info tnum">{mmrOf(row.original[`player${n}`], row.original[`player${n}_race`], w3cSeason) || "—"}</Badge>
          <SyncedLine player={row.original[`player${n}`]} />
        </div>
      ),
    },
    {
      id: `p${n}_w3c_high_mmr`,
      accessorFn: (row: Row) => getHighestW3CMMR(row[`player${n}`], w3cSeason) || 0,
      header: "Highest MMR",
      cell: ({ row }: { row: { original: Row } }) => (
        <div className="text-right">
          <Badge className="bg-secondary text-on-secondary tnum">{getHighestW3CMMR(row.original[`player${n}`], w3cSeason) || "—"}</Badge>
        </div>
      ),
    },
  ];

  return (
    <>
      <div className="flex flex-wrap items-center justify-between gap-2 p-2">
        <div className={`alert flex flex-1 items-center gap-2 rounded px-3 py-2 ${toneClass("info")}`}>
          <Icon name="mdi-information" />
          Draft series show on the site once published.
        </div>
        {canDraft ? (
          <Button className="bg-warning text-on-warning" onClick={onAddDraftSeries}>
            <Icon name="mdi-plus" />
            Add Draft Series
          </Button>
        ) : null}
      </div>

      {!smAndDown ? (
        <DataTable
          data={draftSeries}
          pageSize={10}
          rowId={(row: Row) => String(row.id)}
          columns={[
            ...sideColumns(1),
            ...sideColumns(2),
            ...(isAdmin
              ? [
                  {
                    id: "fantasy",
                    header: "Fantasy on publish",
                    enableSorting: false,
                    cell: ({ row }: { row: { original: Row } }) =>
                      row.original.is_fantasy_match ? (
                        <Icon name="mdi-star" className="text-primary" title="Marked to count for fantasy when published" />
                      ) : (
                        <span className="text-muted-foreground">—</span>
                      ),
                  },
                ]
              : []),
            ...(canDraft
              ? [{ id: "actions", header: "", enableSorting: false, cell: ({ row }: { row: { original: Row } }) => <RowActions actions={draftActions(row.original)} /> }]
              : []),
          ]}
        />
      ) : (
        <div>
          {draftSeries.map((item) => (
            <SeriesCard
              key={item.id}
              series={item}
              title={item.is_fantasy_match ? <Icon name="mdi-star" className="text-primary" title="Marked to count for fantasy when published" /> : null}
              actions={canDraft ? <RowActions actions={draftActions(item)} /> : null}
            />
          ))}
        </div>
      )}

      {isAdmin ? (
        <div className="flex justify-end gap-2 p-2">
          <Button variant="ghost" className="text-success" onClick={onPublishAll}>
            <Icon name="mdi-publish" />
            Publish All Drafts
          </Button>
          <Button variant="ghost" className="text-error" onClick={onDeleteAll}>
            <Icon name="mdi-delete-sweep" />
            Delete All Drafts
          </Button>
        </div>
      ) : null}
    </>
  );
}
