"use client";
/* eslint-disable @typescript-eslint/no-explicit-any */
import { useEffect, useMemo, useRef, useState } from "react";
import type { SortingState } from "@tanstack/react-table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Combobox } from "@/components/ui/Combobox";
import { DataTable } from "@/components/ui/DataTable";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { Field } from "@/components/ui/Field";
import { Icon } from "@/components/ui/Icon";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { BetIcon } from "@/components/fantasy/BetIcon";
import { PageHeader } from "@/components/PageHeader";
import { PlayerName } from "@/components/PlayerName";
import { RowActions } from "@/components/RowActions";
import { SeasonSelect } from "@/components/SeasonSelect";
import { StatusAlert } from "@/components/StatusAlert";
import { VsRaces } from "@/components/VsRaces";
import { W3CIcon } from "@/components/W3CIcon";
import { MD_AND_UP, SM_AND_DOWN, useBreakpoint } from "@/hooks/breakpoint";
import { useConfigStore, useFantasyStore, useSeason, useSeasonStore, useSeriesStore } from "@/stores";
import { isScored, sides, validateBetPoints as checkBetPoints } from "@/helpers/bets.mjs";
import { cn } from "@/lib/utils";

const PAGE_SIZES = [
  { value: 10, title: "10" },
  { value: 25, title: "25" },
  { value: 50, title: "50" },
  { value: 100, title: "100" },
  { value: -1, title: "All" },
];

const emptyBet = () => ({ captain_id: null as number | null, series_id: null as number | null, winner_id: null as number | null, bet_points: null as number | null });

// One instance each, so a read that has not landed yet does not redraw the table every render
const EMPTY_LADDER = new Map<number, any>();
const EMPTY_IDS: number[] = [];

// The picker filters on the title it shows, so both sides of the series belong in it
const seriesTitle = (series: any) => `${series.player1?.name || "Player 1"} vs ${series.player2?.name || "Player 2"}`;

/** Every bet of one season, one server page at a time, with the admin's add, edit and delete. */
export function FantasyBetsView() {
  const fantasyStore = useFantasyStore();
  const seriesStore = useSeriesStore();
  const configStore = useConfigStore();
  const seasonStore = useSeasonStore();
  const { selectedSeasonId } = useSeason();

  const [bets, setBets] = useState<any[]>([]);
  const [totalBets, setTotalBets] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [isBetSaving, setIsBetSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [betDialog, setBetDialog] = useState(false);
  const [addBetDialog, setAddBetDialog] = useState(false);
  const [deleteDialog, setDeleteDialog] = useState(false);
  const [editingBet, setEditingBet] = useState<any>(null);
  const [deletingBet, setDeletingBet] = useState<any>(null);
  const [selectedWinnerId, setSelectedWinnerId] = useState<number | null>(null);
  const [selectedBetPoints, setSelectedBetPoints] = useState<number | null>(null);
  const [allSeries, setAllSeries] = useState<any[]>([]);
  const [fantasyTeams, setFantasyTeams] = useState<any[]>([]);
  // The season ladder record of every signup, by user id, for the MMR and the record against each race.
  // It carries the season it was read for, so a season change shows no record until its own read lands.
  const [ladder, setLadder] = useState<{ season: number | null; by: Map<number, any> }>({ season: null, by: EMPTY_LADDER });
  const [page, setPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(25);
  const [sorting, setSorting] = useState<SortingState>([{ id: "id", desc: false }]); // a hidden sort key: the order the server pages by
  // The series this captain already bet on, carrying the captain it was read for
  const [captainBets, setCaptainBets] = useState<{ captain: number | null; ids: number[] }>({ captain: null, ids: EMPTY_IDS });
  const [useFixedBetPoints, setUseFixedBetPoints] = useState(false);
  const [fixedBetPointsValue, setFixedBetPointsValue] = useState(0);
  const [minBetPoints, setMinBetPoints] = useState<number | null>(null);
  const [maxBetPoints, setMaxBetPoints] = useState<number | null>(null);
  const [betPointsError, setBetPointsError] = useState<string | null>(null);
  const [editBetPointsError, setEditBetPointsError] = useState<string | null>(null);
  const [dialogError, setDialogError] = useState<string | null>(null); // the open dialog's own error, so a refused write is read where it happened
  const [newBet, setNewBet] = useState(emptyBet());
  const [selectedSeriesForNew, setSelectedSeriesForNew] = useState<any>(null);

  const mdAndUp = useBreakpoint(MD_AND_UP);
  const smAndDown = useBreakpoint(SM_AND_DOWN);

  const ladderById = ladder.season === selectedSeasonId ? ladder.by : EMPTY_LADDER;
  const captainBetSeriesIds = captainBets.captain === newBet.captain_id ? captainBets.ids : EMPTY_IDS;

  // A bet row carries the captain, not their fantasy team; the season's teams supply the name
  const teamNameByCaptain = useMemo(() => new Map(fantasyTeams.map((t) => [t.captain_id, t.name])), [fantasyTeams]);

  // Enrich bets with series data
  const enrichedBets = useMemo(
    () => bets.map((bet) => ({ ...bet, series: allSeries.find((s) => s.id === bet.series_id) || bet.series })),
    [bets, allSeries],
  );

  // The series a bet can be placed on: a fantasy match, not yet played, and one this captain has no bet on
  const availableSeries = useMemo(() => {
    if (!newBet.captain_id) return [];
    return allSeries.filter((s) => s.is_fantasy_match === true && !isScored(s) && !captainBetSeriesIds.includes(s.id));
  }, [newBet.captain_id, allSeries, captainBetSeriesIds]);

  const validateBetPoints = (points: number | null) => checkBetPoints(points, minBetPoints, maxBetPoints);
  const mmrOf = (player: any) => ladderById.get(player?.id)?.mmr?.current ?? null;

  const getWinner = (bet: any) => {
    if (!bet?.series) return null;
    if (bet.winner_id === bet.series.player1_id) return bet.series.player1;
    if (bet.winner_id === bet.series.player2_id) return bet.series.player2;
    return null;
  };

  // the race the winner played in that series, not the one he signed the season up on
  const winnerRace = (bet: any) => {
    if (!bet?.series) return null;
    if (bet.winner_id === bet.series.player1_id) return bet.series.player1_race;
    if (bet.winner_id === bet.series.player2_id) return bet.series.player2_race;
    return null;
  };

  const resultBadge = (result: string) =>
    result === "WIN" ? "bg-win text-on-win" : result === "LOSS" ? "bg-loss text-on-loss" : "bg-secondary text-on-secondary";

  const fetchData = async (readPage = page) => {
    if (!selectedSeasonId) return; // the picker resolves one
    setIsLoading(true);
    setErrorMessage(null);
    try {
      const sort = sorting[0];
      const { bets: rows, total } = await fantasyStore.searchBetsPage(`season_id == ${selectedSeasonId}`, {
        limit: itemsPerPage,
        offset: itemsPerPage === -1 ? 0 : (readPage - 1) * itemsPerPage,
        sort: sort ? sort.id : undefined,
        order: sort ? (sort.desc ? "desc" : "asc") : undefined,
      });

      // A delete can empty the last page; step back onto the table
      if (rows.length === 0 && readPage > 1 && total > 0 && itemsPerPage !== -1) {
        setPage(Math.max(1, Math.ceil(total / itemsPerPage)));
        return;
      }
      setBets(rows);
      setTotalBets(total);

      setAllSeries((await seriesStore.searchSeriesBySeason(selectedSeasonId, "is_fantasy_match==True")) || []);
      setFantasyTeams((await fantasyStore.searchTeams(`season_id == ${selectedSeasonId}`)) || []);
    } catch (error: any) {
      console.error("Failed to fetch data:", error);
      setErrorMessage("Failed to load data. Please try again later.");
    } finally {
      setIsLoading(false);
    }
  };

  // The one page read: the season, the sort and the page state are all it depends on.
  // A new season reads from its first page, so the page resets before the read goes out.
  const pagedSeason = useRef<number | null>(null);
  useEffect(() => {
    if (!selectedSeasonId) return;
    if (pagedSeason.current !== selectedSeasonId && page !== 1) {
      setPage(1);
      return;
    }
    pagedSeason.current = selectedSeasonId;
    fetchData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedSeasonId, page, itemsPerPage, sorting]);

  // One read per season for the whole page: the ladder record of every signup
  useEffect(() => {
    if (!selectedSeasonId) return;
    seasonStore
      .fetchSeasonLadderPlayers(selectedSeasonId)
      .then((rows: any[]) => setLadder({ season: selectedSeasonId, by: new Map((rows || []).map((p) => [p.id, p])) }))
      .catch((error: any) => console.error("Failed to load the season ladder:", error));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedSeasonId]);

  // The table holds one page, so the duplicate check asks the server
  useEffect(() => {
    const captain = newBet.captain_id;
    if (!captain || !selectedSeasonId) return;
    fantasyStore
      .queryBets(`user_id == ${captain} and season_id == ${selectedSeasonId}`)
      .then((rows: any[]) => setCaptainBets({ captain, ids: rows.map((bet) => bet.series_id) }))
      .catch((error: any) => {
        console.error("Failed to load the captain bets:", error);
        setCaptainBets({ captain, ids: EMPTY_IDS });
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [newBet.captain_id, selectedSeasonId]);

  useEffect(() => {
    configStore
      .fetchSettings()
      .then((settings: any[]) => {
        const value = (key: string) => settings.find((s) => s.key === key)?.value;
        const fixed = value("fantasy_fixed_bet_points");
        if (fixed !== undefined) setUseFixedBetPoints(fixed === "true");
        const points = value("fantasy_bet_points_value");
        if (points !== undefined) setFixedBetPointsValue(parseInt(points) || 0);
        const min = value("fantasy_min_bet_points");
        if (min) setMinBetPoints(parseInt(min));
        const max = value("fantasy_max_bet_points");
        if (max) setMaxBetPoints(parseInt(max));
      })
      .catch((error: any) => console.error("Error loading bet points settings:", error));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const openAddBetDialog = () => {
    setNewBet(emptyBet());
    setSelectedSeriesForNew(null);
    setBetPointsError(null);
    setDialogError(null);
    setAddBetDialog(true);
  };

  const closeAddBetDialog = () => {
    setAddBetDialog(false);
    setDialogError(null);
    setNewBet(emptyBet());
    setSelectedSeriesForNew(null);
    setBetPointsError(null);
  };

  const onSeriesSelected = (seriesId: number | null) => {
    setNewBet({ ...newBet, series_id: seriesId, winner_id: null });
    setSelectedSeriesForNew(seriesId ? allSeries.find((s) => s.id === seriesId) : null);
  };

  const createNewBet = async () => {
    if (!newBet.captain_id || !newBet.series_id || !newBet.winner_id) {
      setDialogError("Please fill in all fields.");
      return;
    }
    setIsBetSaving(true);
    setDialogError(null);
    try {
      await fantasyStore.createBet({
        user_id: newBet.captain_id,
        series_id: newBet.series_id,
        season_id: selectedSeasonId,
        winner_id: newBet.winner_id,
        bet_points: newBet.bet_points, // Send as-is, the backend applies fixed points if configured
      });
      await fetchData();
      closeAddBetDialog();
    } catch (error: any) {
      console.error("Failed to create bet:", error);
      setDialogError(error.message || "Failed to create bet. Please try again.");
    } finally {
      setIsBetSaving(false);
    }
  };

  const editBet = (bet: any) => {
    setEditingBet({ ...bet });
    setSelectedWinnerId(bet.winner_id);
    setSelectedBetPoints(bet.bet_points);
    setEditBetPointsError(validateBetPoints(bet.bet_points));
    setDialogError(null);
    setBetDialog(true);
  };

  const closeBetDialog = () => {
    setBetDialog(false);
    setDialogError(null);
    setEditingBet(null);
    setSelectedWinnerId(null);
    setSelectedBetPoints(null);
    setEditBetPointsError(null);
  };

  const saveBet = async () => {
    if (!editingBet || !selectedWinnerId) {
      setDialogError("Please select a winner.");
      return;
    }
    setIsBetSaving(true);
    setDialogError(null);
    try {
      await fantasyStore.updateBet(editingBet.id, { ...editingBet, winner_id: selectedWinnerId, bet_points: selectedBetPoints });
      await fetchData();
      closeBetDialog();
    } catch (error: any) {
      console.error("Failed to update bet:", error);
      setDialogError(error.message || "Failed to update bet. Please try again.");
    } finally {
      setIsBetSaving(false);
    }
  };

  const deleteBet = async () => {
    if (!deletingBet) return;
    setIsDeleting(true);
    setDialogError(null);
    try {
      await fantasyStore.deleteBet(deletingBet.id);
      // The module keeps no list, so the page drops the row itself
      setBets((was) => was.filter((bet) => bet.id !== deletingBet.id));
      await fetchData();
      setDeleteDialog(false);
      setDeletingBet(null);
    } catch (error: any) {
      console.error("Failed to delete bet:", error);
      setDialogError(error.message || "Failed to delete bet. Please try again.");
    } finally {
      setIsDeleting(false);
    }
  };

  // The server sorts the columns it stores; the columns joined in the browser stay unsorted
  const columns: any[] = [
    {
      id: "captain",
      // the accessor only makes the column sortable; the server orders on the key, not on this value
      accessorFn: (row: any) => row.user?.name ?? "",
      header: "Fantasy Captain",
      cell: ({ row }: any) => (
        <>
          {/* no race: the fantasy captain bets, they don't play */}
          {row.original.user ? <PlayerName player={row.original.user} /> : "N/A"}
          <div className="text-xs opacity-(--v-medium-emphasis-opacity)">{teamNameByCaptain.get(row.original.user_id) ?? "No team"}</div>
        </>
      ),
    },
    {
      id: "series",
      header: "Series",
      enableSorting: false,
      cell: ({ row }: any) =>
        row.original.series ? (
          // one row per player of the series, so the two MMRs and the two records line up
          <div className="inline-grid grid-cols-[max-content_max-content] items-center gap-x-3 gap-y-0.5 min-[960px]:grid-cols-[max-content_max-content_max-content]">
            {sides(row.original.series).map((side: any, i: number) => (
              <div key={i} className="col-span-full grid grid-cols-subgrid items-center">
                {side.player ? <PlayerName player={side.player} race={side.race} /> : <span>Player {i + 1}</span>}
                <span className="whitespace-nowrap">
                  <W3CIcon size={14} /> {mmrOf(side.player) ?? "—"}
                </span>
                {/* A phone has room for the name and the MMR, not the race record */}
                {!smAndDown ? <VsRaces player={ladderById.get(side.player?.id)} race={side.vsRace} /> : null}
              </div>
            ))}
          </div>
        ) : (
          <div>N/A</div>
        ),
    },
    {
      id: "bet_on",
      header: "Bet on",
      enableSorting: false,
      cell: ({ row }: any) =>
        getWinner(row.original) ? (
          <PlayerName player={getWinner(row.original)} race={winnerRace(row.original)} />
        ) : (
          <strong>{row.original.series ? "Unknown" : "N/A"}</strong>
        ),
    },
    {
      id: "score",
      header: "Score",
      enableSorting: false,
      cell: ({ row }: any) =>
        row.original.series ? (
          <div>
            {row.original.series.player1_score || 0} : {row.original.series.player2_score || 0}
          </div>
        ) : (
          <div>-</div>
        ),
    },
    {
      id: "bet_result",
      header: "Result",
      enableSorting: false,
      cell: ({ row }: any) => <Badge className={cn("font-medium", resultBadge(row.original.bet_result))}>{row.original.bet_result || "PENDING"}</Badge>,
    },
    { id: "bet_points", accessorKey: "bet_points", header: "Points", cell: ({ row }: any) => row.original.bet_points || 0 },
    {
      id: "is_locked",
      header: "Locked",
      enableSorting: false,
      cell: ({ row }: any) =>
        isScored(row.original.series) ? <Icon name="mdi-lock" className="text-error" /> : <Icon name="mdi-lock-open" className="text-success" />,
    },
    {
      id: "actions",
      header: "",
      enableSorting: false,
      // An admin edits and deletes any bet, scored or not; the dialog says what that costs
      cell: ({ row }: any) => (
        <RowActions
          actions={[
            { icon: "mdi-pencil", label: "Edit", onClick: () => editBet(row.original) },
            { icon: "mdi-delete", label: "Delete", color: "error", onClick: () => { setDeletingBet(row.original); setDialogError(null); setDeleteDialog(true); } },
          ]}
        />
      ),
    },
  ];

  const captainItems = fantasyTeams.map((team) => ({
    value: String(team.captain_id),
    title: `${team.captain?.name || "N/A"} · Team: ${team.drafted_team?.name || "N/A"}`,
  }));
  const seriesItems = availableSeries.map((series) => ({ value: String(series.id), title: seriesTitle(series) }));

  const pointsHint = minBetPoints && maxBetPoints
    ? `Enter between ${minBetPoints} and ${maxBetPoints} points`
    : minBetPoints
      ? `Minimum ${minBetPoints} points`
      : maxBetPoints
        ? `Maximum ${maxBetPoints} points`
        : "Enter the number of points for this bet";

  const winnerRadios = (series: any, value: number | null, onChange: (id: number) => void) => (
    <RadioGroup value={value} onValueChange={(next) => onChange(next as number)} aria-label="Select winner">
      <span className="text-sm">Select winner:</span>
      {[
        { id: series.player1_id, name: series.player1?.name || "Player 1" },
        { id: series.player2_id, name: series.player2?.name || "Player 2" },
      ].map((side) => (
        <Label key={side.id} className="flex items-center gap-2 font-normal">
          <RadioGroupItem value={side.id} />
          {side.name}
        </Label>
      ))}
    </RadioGroup>
  );

  return (
    <div className="p-4">
      {/* The page dims while the bets load. */}
      {isLoading ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/60">
          <span className="size-16 animate-spin rounded-full border-8 border-primary border-t-transparent" />
        </div>
      ) : null}

      <PageHeader title={<><BetIcon size={24} className="mr-2" />Fantasy Bets</>} />

      <StatusAlert modelValue={errorMessage} onClose={() => setErrorMessage(null)} />

      <Card className="card gap-0 py-0">
        <CardContent className="p-0">
          <div className="flex flex-wrap items-center gap-2 p-2">
            <div className="w-full sm:w-auto">
              <SeasonSelect />
            </div>
            <Button className="w-full sm:ml-auto sm:w-auto" onClick={openAddBetDialog}>
              <Icon name="mdi-plus" />
              Add bet
            </Button>
          </div>

          <div className="px-0 md:px-4">
            <DataTable
              data={enrichedBets}
              columns={columns}
              rowId={(bet: any) => String(bet.id)}
              rowCount={totalBets}
              page={page - 1}
              onPageChange={(next) => setPage(next + 1)}
              pageSize={itemsPerPage}
              pageSizeOptions={PAGE_SIZES}
              // A new page size reads the first page, so the offset stays inside the row count
              onPageSizeChange={(size) => {
                setItemsPerPage(size);
                setPage(1);
              }}
              sorting={sorting}
              // A header click reloads from the first page in the new order
              onSortingChange={(next) => {
                setSorting(next);
                setPage(1);
              }}
              columnVisibility={{ score: mdAndUp, is_locked: mdAndUp }}
              empty="No bets in this season yet. Bets appear here once Fantasy Captains place them."
            />
          </div>
        </CardContent>
      </Card>

      {/* Add Bet Dialog */}
      <Dialog open={addBetDialog} onOpenChange={(open) => (open ? setAddBetDialog(true) : closeAddBetDialog())} disablePointerDismissal>
        <DialogContent showCloseButton={false} className="gap-0 p-0 sm:max-w-[600px]">
          <DialogTitle className="flex items-center gap-2 bg-primary px-4 py-3 text-on-primary">
            <Icon name="mdi-plus" />
            Add new fantasy bet
          </DialogTitle>

          <div className="flex flex-col gap-4 p-4">
            <StatusAlert modelValue={dialogError} onClose={() => setDialogError(null)} />

            <Field label="Fantasy Captain" htmlFor="bet-captain">
              <Combobox
                id="bet-captain"
                items={captainItems}
                value={newBet.captain_id == null ? null : String(newBet.captain_id)}
                onChange={(value) => setNewBet({ ...newBet, captain_id: value == null ? null : Number(value), series_id: null, winner_id: null })}
                label="Fantasy Captain"
              />
            </Field>

            <Field label="Select series" hint={!newBet.captain_id ? "Pick a Fantasy Captain first" : undefined} htmlFor="bet-series">
              <Combobox
                id="bet-series"
                items={seriesItems}
                value={newBet.series_id == null ? null : String(newBet.series_id)}
                onChange={(value) => onSeriesSelected(value == null ? null : Number(value))}
                label="Select series"
                disabled={!newBet.captain_id}
              />
            </Field>

            {selectedSeriesForNew ? winnerRadios(selectedSeriesForNew, newBet.winner_id, (id) => setNewBet({ ...newBet, winner_id: id })) : null}

            {!useFixedBetPoints ? (
              <Field label="Bet points" hint={pointsHint} error={betPointsError} htmlFor="bet-points">
                <Input
                  id="bet-points"
                  type="number"
                  min={minBetPoints || 1}
                  max={maxBetPoints ?? undefined}
                  value={newBet.bet_points ?? ""}
                  onChange={(event) => {
                    const points = event.target.value === "" ? null : Number(event.target.value);
                    setNewBet({ ...newBet, bet_points: points });
                    setBetPointsError(validateBetPoints(points));
                  }}
                  onBlur={() => setBetPointsError(validateBetPoints(newBet.bet_points))}
                />
              </Field>
            ) : (
              <StatusAlert modelValue={`This bet will be worth ${fixedBetPointsValue} points`} type="info" />
            )}
          </div>

          <div className="flex justify-end gap-2 px-4 py-3">
            <Button variant="ghost" onClick={closeAddBetDialog} disabled={isBetSaving}>
              Cancel
            </Button>
            <Button
              onClick={createNewBet}
              disabled={isBetSaving || !newBet.captain_id || !newBet.series_id || !newBet.winner_id || (!useFixedBetPoints && (!!betPointsError || !newBet.bet_points))}
            >
              <Icon name={isBetSaving ? "mdi-loading mdi-spin" : "mdi-plus"} />
              Create bet
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Edit Bet Dialog */}
      <Dialog open={betDialog} onOpenChange={(open) => (open ? setBetDialog(true) : closeBetDialog())} disablePointerDismissal>
        <DialogContent showCloseButton={false} className="gap-0 p-0 sm:max-w-[500px]">
          <DialogTitle className="flex items-center gap-2 bg-primary px-4 py-3 text-on-primary">
            <Icon name="mdi-pencil" />
            Edit fantasy bet
          </DialogTitle>

          <div className="flex flex-col gap-4 p-4">
            <StatusAlert modelValue={dialogError} onClose={() => setDialogError(null)} />
            {isScored(editingBet?.series) ? <StatusAlert modelValue="This series is already scored; changing the bet changes the leaderboard." type="warning" /> : null}

            {editingBet?.series ? (
              <>
                <div>
                  <div className="mb-2">
                    <strong>Series:</strong> {editingBet.series.player1?.name || "Player 1"} vs {editingBet.series.player2?.name || "Player 2"}
                  </div>
                  <div className="mb-2 text-sm">
                    <strong>Captain:</strong> {editingBet.user?.name || "N/A"}
                  </div>
                  <div className="text-sm">
                    <strong>Current score:</strong> {editingBet.series.player1_score || 0} : {editingBet.series.player2_score || 0}
                  </div>
                </div>

                {winnerRadios(editingBet.series, selectedWinnerId, setSelectedWinnerId)}

                {!useFixedBetPoints ? (
                  <Field label="Bet points" hint={pointsHint} error={editBetPointsError} htmlFor="edit-bet-points">
                    <Input
                      id="edit-bet-points"
                      type="number"
                      min={minBetPoints || 1}
                      max={maxBetPoints ?? undefined}
                      value={selectedBetPoints ?? ""}
                      onChange={(event) => {
                        const points = event.target.value === "" ? null : Number(event.target.value);
                        setSelectedBetPoints(points);
                        setEditBetPointsError(validateBetPoints(points));
                      }}
                      onBlur={() => setEditBetPointsError(validateBetPoints(selectedBetPoints))}
                    />
                  </Field>
                ) : (
                  <StatusAlert modelValue={`This bet will be worth ${fixedBetPointsValue} points`} type="info" />
                )}
              </>
            ) : null}
          </div>

          <div className="flex justify-end gap-2 px-4 py-3">
            <Button variant="ghost" onClick={closeBetDialog} disabled={isBetSaving}>
              Cancel
            </Button>
            <Button onClick={saveBet} disabled={isBetSaving || !selectedWinnerId || (!useFixedBetPoints && (!!editBetPointsError || !selectedBetPoints))}>
              <Icon name={isBetSaving ? "mdi-loading mdi-spin" : "mdi-content-save"} />
              Save changes
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteDialog} onOpenChange={setDeleteDialog}>
        <DialogContent showCloseButton={false} className="gap-0 p-0 sm:max-w-[400px]">
          {/* DESIGN.md: a dialog that deletes something wears bg-error */}
          <DialogTitle className="flex items-center gap-2 bg-error px-4 py-3 text-on-error">
            <Icon name="mdi-alert" />
            Confirm delete
          </DialogTitle>
          <div className="p-4">
            <StatusAlert modelValue={dialogError} onClose={() => setDialogError(null)} />
            Are you sure you want to delete this bet?
            {deletingBet ? (
              <div className="mt-2">
                <strong>Captain:</strong> {deletingBet.user?.name}
                <br />
                <strong>Bet:</strong> {getWinner(deletingBet) ? <PlayerName player={getWinner(deletingBet)} race={winnerRace(deletingBet)} /> : "N/A"}
              </div>
            ) : null}
            {isScored(deletingBet?.series) ? (
              <StatusAlert modelValue="This series is already scored; deleting the bet changes the leaderboard." type="warning" className="mt-3 mb-0" />
            ) : null}
          </div>
          <div className="flex justify-end gap-2 px-4 py-3">
            <Button variant="ghost" onClick={() => setDeleteDialog(false)}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={deleteBet} disabled={isDeleting}>
              <Icon name={isDeleting ? "mdi-loading mdi-spin" : "mdi-delete"} />
              Delete
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default FantasyBetsView;
