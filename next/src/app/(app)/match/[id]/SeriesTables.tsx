"use client";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { DataTable } from "@/components/ui/DataTable";
import { Icon } from "@/components/ui/Icon";
import { CastChips, type CastSeries } from "@/components/CastChips";
import { HeadToHeadCell } from "@/components/HeadToHeadCell";
import { PlayerName } from "@/components/PlayerName";
import { RowActions, type RowAction } from "@/components/RowActions";
import { SeriesCard } from "@/components/SeriesCard";
import { VsRaces, VsRacesHead } from "@/components/VsRaces";
import { W3CMmr } from "@/components/W3CMmr";
import { toneClass } from "@/components/ui/tone";
import { formatDateTime } from "@/helpers/datetime";
import { mmrGap, pairIndex } from "@/helpers/draft-suggest.mjs";
import { SharedHours } from "./RoundDraftBoard";
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
  onDraftSeries?: () => void; // the draft board is where a captain fills an open place
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
      <PlayerName player={item[`player${n}`]} race={item[`player${n}_race`]} mmr={item[`player${n}_mmr`]} host={item.host_player_id === item[`player${n}`]?.id} />
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
              <Icon name="mdi-plus" />
              Add a series
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
          {openPlaces} place{openPlaces === 1 ? "" : "s"} open. Add a series drafts a pairing, and an admin publishes it.
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
function PairingNote({ item, fresh, replaces }: { item: Row; fresh: boolean; replaces?: string | null }) {
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

/** The draft series of the match: what a captain plans before an admin publishes it. */
export function DraftSeries({
  draftSeries,
  smAndDown,
  w3cSeason,
  seasonId,
  ladderById,
  isAdmin,
  canDraft,
  board,
  maxDifference,
  seenAt,
  viewerId,
  replacedLabel,
  publishCount,
  draftActions,
  onAddDraftSeries,
  onPublishAll,
  onDeleteAll,
  onMeetings,
}: {
  draftSeries: Row[];
  smAndDown: boolean;
  w3cSeason?: number;
  seasonId?: number;
  ladderById: Map<number, Row>;
  isAdmin: boolean;
  canDraft: boolean;
  board?: Row | null; // the draft board read: the difference, the shared hours and the head to head of a pairing
  maxDifference?: number | null; // the working largest difference of the match, which the page holds
  seenAt?: string | null; // when the viewer's own team last opened this draft; null when it never did
  viewerId?: number | null; // the reader, whose own pairings are never new
  replacedLabel?: (item: Row) => string | null; // the published pairing a replacement draft removes
  publishCount?: number; // the drafts "Publish all" takes, which never holds a replacement
  draftActions: (item: Row) => RowAction[];
  onAddDraftSeries: () => void;
  onPublishAll: () => void;
  onDeleteAll: () => void;
  onMeetings: (userA: number, userB: number) => Promise<Row[]>;
}) {
  const pairOf = pairIndex(board);
  const boardPlayer = new Map<number, Row>((board?.players || []).map((player: Row) => [player.user_id, player]));
  // A pairing the other captain moved since this team last opened the draft; seen_at null means it never did
  const isFresh = (item: Row) => {
    if (seenAt === undefined) return false;
    const by = item.updated_by_user_id ?? item.created_by_user_id ?? null;
    return !!item.updated_at && (seenAt === null || item.updated_at > seenAt) && (by == null || by !== viewerId);
  };
  // the board over this table is the way to start a draft, so its empty state stands alone
  if (!draftSeries.length) {
    if (board) return null;
    return (
      <div className="p-8 text-center">
        <Icon name="mdi-pencil-box-outline" size={64} className="text-warning" />
        <div className="mt-4 text-xl text-muted-foreground">No draft series yet</div>
        <div className="mt-2 text-muted-foreground">Drafts let you plan series without affecting the website or calculations</div>
        {canDraft ? (
          <Button variant="outline" className="mt-4 text-warning" onClick={onAddDraftSeries}>
            <Icon name="mdi-plus" />
            Create draft series
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
        <>
          <PlayerName player={row.original[`player${n}`]} race={row.original[`player${n}_race`]} host={row.original.host_player_id === row.original[`player${n}`]?.id} mmr={false} />
          {n === 1 ? <PairingNote item={row.original} fresh={isFresh(row.original)} replaces={replacedLabel?.(row.original)} /> : null}
        </>
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

  // The pairing's own figures, which the one board read already carries
  const differenceOf = (item: Row) => mmrGap(boardPlayer.get(item.player1_id), boardPlayer.get(item.player2_id));
  const pairingColumns = [
    {
      id: "pairing_difference",
      header: "MMR difference",
      enableSorting: false,
      cell: ({ row }: { row: { original: Row } }) => {
        const difference = differenceOf(row.original);
        const limit = maxDifference ?? null;
        const over = limit != null && Number.isFinite(difference) && difference > limit ? difference - limit : 0;
        return (
          <div className="text-right">
            <div className="tnum">{Number.isFinite(difference) ? difference : "—"}</div>
            {over ? <div className="tnum text-xs text-warning">{over} over the largest difference</div> : null}
          </div>
        );
      },
    },
    {
      id: "pairing_hours",
      header: "Shared hours",
      enableSorting: false,
      cell: ({ row }: { row: { original: Row } }) => <SharedHours hours={pairOf(row.original.player1_id, row.original.player2_id)?.hours} />,
    },
    {
      id: "pairing_head_to_head",
      header: "Head to head",
      enableSorting: false,
      cell: ({ row }: { row: { original: Row } }) => (
        <HeadToHeadCell pair={pairOf(row.original.player1_id, row.original.player2_id)} onMeetings={() => onMeetings(row.original.player1_id, row.original.player2_id)} />
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
            Add draft series
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
            ...(board ? pairingColumns : []),
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
            <div key={item.id}>
              <SeriesCard
                series={item}
                title={item.is_fantasy_match ? <Icon name="mdi-star" className="text-primary" title="Marked to count for fantasy when published" /> : null}
                actions={canDraft ? <RowActions actions={draftActions(item)} /> : null}
              />
              {board ? (
                <div className="flex flex-wrap items-center gap-2 px-4 pb-2 text-sm">
                  <span className="tnum text-muted-foreground">{Number.isFinite(differenceOf(item)) ? `${differenceOf(item)} MMR difference` : "no MMR difference"}</span>
                  <SharedHours hours={pairOf(item.player1_id, item.player2_id)?.hours} />
                  <PairingNote item={item} fresh={isFresh(item)} replaces={replacedLabel?.(item)} />
                </div>
              ) : null}
            </div>
          ))}
        </div>
      )}

      {isAdmin ? (
        <div className="flex justify-end gap-2 p-2">
          {/* a replacement draft publishes from its own row, with the confirm that names what is lost */}
          {publishCount ? (
            <Button variant="ghost" className="text-success" onClick={onPublishAll}>
              <Icon name="mdi-publish" />
              Publish all {publishCount}
            </Button>
          ) : null}
          <Button variant="ghost" className="text-error" onClick={onDeleteAll}>
            <Icon name="mdi-delete-sweep" />
            Delete all drafts
          </Button>
        </div>
      ) : null}
    </>
  );
}
