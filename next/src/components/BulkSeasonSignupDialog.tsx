"use client";
import { useImperativeHandle, useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { Icon } from "@/components/ui/Icon";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { PlayerName } from "@/components/PlayerName";
import type { Player } from "@/components/PlayerName";
import { RaceSelect } from "@/components/RaceSelect";
import { StatusAlert } from "@/components/StatusAlert";
import { W3CMmr } from "@/components/W3CMmr";
import { useSeason } from "@/stores";
import { resolveCurrentSeasonId } from "@/helpers/current-season.js";
import { getW3CMMR } from "@/helpers/w3c-stats.js";
import { defaultSignupRace, signupGroups } from "@/helpers/players.mjs";
import { raceWrapper } from "@/helpers/races.js";

type SignupPlayer = Player & { id: number; signup_seasons?: { id: number }[] };

export type BulkSeasonSignupDialogHandle = { open: (preset: { players: SignupPlayer[]; seasonId?: number | null }) => void };

// The player, the race picker and the MMR it gives, once the dialog is wide enough for one line a player
const COLUMNS = "@lg/dialog:grid-cols-[minmax(0,1fr)_10rem_6rem]";

/** Signs several players up for one season at once, each on their own race. A player already in
 *  the season is shown and left out. The signup call takes one race for all its players, so the
 *  save sends one call per race. */
export function BulkSeasonSignupDialog({ onAdded, ref }: { onAdded?: (complete: boolean) => void; ref?: React.Ref<BulkSeasonSignupDialogHandle> }) {
  const seasonStore = useSeason();

  const [show, setShow] = useState(false);
  const [isAdding, setIsAdding] = useState(false);
  const [addError, setAddError] = useState<string | null>(null);
  const [seasonId, setSeasonId] = useState<number | null>(null);
  const [players, setPlayers] = useState<SignupPlayer[]>([]);
  const [races, setRaces] = useState<Record<number, string | null>>({});

  useImperativeHandle(ref, () => ({
    open: async ({ players: chosen, seasonId: preset = null }) => {
      setPlayers(chosen);
      setRaces(Object.fromEntries(chosen.map((player) => [player.id, defaultSignupRace(player)])));
      setSeasonId(preset);
      setAddError(null);
      setShow(true);
      try {
        if (!seasonStore.seasons.length) await seasonStore.fetchSeasons();
        if (!preset) setSeasonId(await resolveCurrentSeasonId());
      } catch (err) {
        console.error("Failed to load the signup dialog lists:", err);
      }
    },
  }));

  const { groups, skipped, missingRace } = signupGroups(players, races, seasonId);
  const adding = groups.reduce((sum, group) => sum + group.ids.length, 0);
  const signedUp = new Set(skipped.map((player: SignupPlayer) => player.id));
  const raceName = (race: string) => raceWrapper.races.find((row: { id: string }) => row.id === race)?.name ?? race;

  const close = () => setShow(false);

  const addSignups = async () => {
    setAddError(null);
    setIsAdding(true);
    // each race group is its own call; a group that went through stays in, and a repeat skips it
    for (const group of groups) {
      try {
        await seasonStore.addUserSignup(seasonId as number, group.ids, group.race);
      } catch (error) {
        console.error("Error adding signups:", error);
        setAddError(`Could not add the ${raceName(group.race)} players: ${(error as Error).message}`);
        setIsAdding(false);
        onAdded?.(false);
        return;
      }
    }
    setIsAdding(false);
    onAdded?.(true);
    close();
  };

  const blocked = !seasonId ? "Choose a season"
    : missingRace.length ? `Choose a race for ${missingRace[0].name}`
    : !adding ? "Everyone is already signed up"
    : null;

  return (
    <Dialog open={show} onOpenChange={(open) => (open ? setShow(true) : close())}>
      <DialogContent showCloseButton={false} size="md" className="gap-0 p-0">
        <DialogTitle className="flex items-center gap-2 banner bg-banner px-4 py-3 text-primary">
          <Icon name="mdi-account-check" />
          Add {players.length} {players.length === 1 ? "player" : "players"} to a season
        </DialogTitle>

        <div className="px-4 pt-4">
          <StatusAlert modelValue={addError} onClose={() => setAddError(null)} />
        </div>

        <div className="flex flex-col gap-4 p-4">
          <Select
            items={seasonStore.seasons.map((season) => ({ value: season.id, label: season.name }))}
            value={seasonId}
            onValueChange={(value) => setSeasonId(value as number | null)}
          >
            <SelectTrigger aria-label="Season" className="w-full">
              <SelectValue placeholder="Season" />
            </SelectTrigger>
            <SelectContent>
              {seasonStore.seasons.map((season) => (
                <SelectItem key={season.id} value={season.id}>
                  {season.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {/* One row a player; a wide dialog lines the race and the MMR up in columns under one header */}
          <div>
            <div className={`hidden gap-x-4 border-b pb-2 text-xs font-medium text-muted-foreground @lg/dialog:grid ${COLUMNS}`} aria-hidden>
              <span>Player</span>
              <span>Race</span>
              <W3CMmr />
            </div>
            <ul className="flex max-h-[50vh] flex-col divide-y divide-border overflow-y-auto">
              {players.map((player) => {
                const race = races[player.id] ?? null;
                const mmr = race ? getW3CMMR(player, race) : null;
                return (
                  <li key={player.id} className={`flex flex-wrap items-center gap-x-4 gap-y-2 py-2 @lg/dialog:grid ${COLUMNS} ${signedUp.has(player.id) ? "opacity-60" : ""}`}>
                    <span className="min-w-32 flex-1"><PlayerName player={player} plain mmr={false} /></span>
                    {signedUp.has(player.id) ? (
                      <span className="text-sm text-muted-foreground @lg/dialog:col-span-2"><Icon name="mdi-check" className="mr-1" />Already signed up</span>
                    ) : (
                      <>
                        <span className="w-40"><RaceSelect value={race} onChange={(value) => setRaces((old) => ({ ...old, [player.id]: value }))} /></span>
                        <span className="flex items-center gap-2 text-sm"><span className="@lg/dialog:hidden"><W3CMmr /></span><span className="tnum">{mmr ?? "—"}</span></span>
                      </>
                    )}
                  </li>
                );
              })}
            </ul>
          </div>

          <p className="text-sm text-muted-foreground">
            {adding} {adding === 1 ? "player" : "players"} will be added.
          </p>
        </div>

        <div className="flex justify-end gap-2 p-4 pt-0">
          <Button variant="ghost" onClick={close}>
            Cancel
          </Button>
          <Button onClick={addSignups} disabled={isAdding || !!blocked}>
            <Icon name={isAdding ? "mdi-loading mdi-spin" : "mdi-plus"} />
            {blocked ?? `Add ${adding} ${adding === 1 ? "player" : "players"}`}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export default BulkSeasonSignupDialog;
