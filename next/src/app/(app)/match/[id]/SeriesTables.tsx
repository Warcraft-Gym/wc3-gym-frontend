"use client";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { DataTable } from "@/components/ui/DataTable";
import { Icon } from "@/components/ui/Icon";
import { CastChips, type CastSeries } from "@/components/CastChips";
import { PlayerName } from "@/components/PlayerName";
import { RowActions, type RowAction } from "@/components/RowActions";
import { SeriesCard } from "@/components/SeriesCard";
import { toneClass } from "@/components/ui/tone";
import { formatDateTime } from "@/helpers/datetime";
import { timeMissing } from "@/helpers/schedule.mjs";
import { SyncedLine, type Row } from "./match-cells";

const WON_FILL = "bg-win text-on-win";
const NEUTRAL_FILL = "bg-muted text-foreground";

// A score the winner took wears the win fill; an unplayed series shows a dash
const scoreBadge = (value: number | null | undefined, won: boolean) => <Badge className={`tnum ${won ? WON_FILL : NEUTRAL_FILL}`}>{value ?? "–"}</Badge>;

/** The published series of the match: who plays whom, when, and how it ended. */
export function PublishedSeries({
  series,
  smAndDown,
  isAdmin,
  canDraft,
  openPlaces = 0,
  formateDate,
  seriesActions,
  onAddSeries,
  onDraftSeries,
  onDeleteAll,
}: {
  series: Row[];
  smAndDown: boolean;
  isAdmin: boolean;
  canDraft?: boolean;
  openPlaces?: number; // the places of the round the published series and the drafts leave open
  formateDate: (value?: string | null) => string | null | undefined;
  seriesActions: (item: Row) => RowAction[];
  onAddSeries: () => void;
  onDraftSeries?: () => void; // the round planner is where a captain fills an open place
  onDeleteAll: () => void;
}) {
  // an admin fills an open place from the admin add, so the draft entry is the captain's
  const room = canDraft && !isAdmin && openPlaces > 0;
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
      <PlayerName player={item[`player${n}`]} race={item[`player${n}_race`]} mmr={item[`player${n}_mmr`]} host={item.host_player_id === item[`player${n}`]?.id} w3c />
      <div>
        <SyncedLine player={item[`player${n}`]} />
      </div>
    </>
  );

  return (
    <>
      {isAdmin || room ? (
        <div className="flex flex-wrap justify-end gap-2 p-2">
          {room ? (
            <Button variant="outline" className="w-full text-primary-text min-[960px]:w-auto" onClick={onDraftSeries}>
              <Icon name="mdi-account-multiple-plus" />
              Plan the round
            </Button>
          ) : null}
          {isAdmin ? (
            <Button className="w-full min-[960px]:w-auto" onClick={onAddSeries}>
              <Icon name="mdi-plus" />
              Add series
            </Button>
          ) : null}
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
                    {row.original.date_time ? formateDate(row.original.date_time) : <span className="text-muted-foreground">{timeMissing(row.original, "Not scheduled")}</span>}
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
              header: () => <Icon name="mdi-star" className="text-primary-text" title="Fantasy match" aria-label="Fantasy match" />,
              enableSorting: false,
              cell: ({ row }) =>
                row.original.is_fantasy_match ? <Icon name="mdi-star" className="text-primary-text" title="Fantasy match" /> : <span className="text-muted-foreground">—</span>,
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
              title={item.date_time ? formateDate(item.date_time) : timeMissing(item, "Not scheduled")}
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

      {room ? (
        <p className="tnum px-4 py-2 text-sm text-muted-foreground">
          {openPlaces} place{openPlaces === 1 ? "" : "s"} open. Plan the round to pair them.
        </p>
      ) : null}

      {isAdmin ? (
        <div className="flex justify-end p-2">
          <Button variant="ghost" className="text-error" onClick={onDeleteAll}>
            <Icon name="mdi-delete-sweep" />
            Delete all published
          </Button>
        </div>
      ) : null}
    </>
  );
}

/** Who put a pairing in the draft, the series it replaces, and whether it is new to this team. */
export function PairingNote({ item, fresh, replaces }: { item: Row; fresh: boolean; replaces?: string | null }) {
  // a create stamps updated_at with created_at, so only a later stamp reads as a change
  const changed = !!item.updated_by_name && item.updated_at !== item.created_at;
  const who = changed ? item.updated_by_name : item.created_by_name || item.updated_by_name;
  if (!who && !fresh && !replaces) return null;
  return (
    <div className="mt-0.5 flex flex-wrap items-center gap-1 text-xs text-muted-foreground">
      {replaces ? (
        <Badge variant="outline" className={toneClass("info")}>
          <Icon name="mdi-swap-horizontal" size={14} />
          Replaces {replaces}
        </Badge>
      ) : null}
      {who ? (
        <span>
          {changed ? "Changed" : "Added"} by {who}
          {item.updated_at ? `, ${formatDateTime(item.updated_at)}` : ""}
        </span>
      ) : null}
      {fresh ? (
        <Badge variant="outline" className={toneClass("info")}>
          New since your last visit
        </Badge>
      ) : null}
    </div>
  );
}
