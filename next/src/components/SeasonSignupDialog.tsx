"use client";
import { useImperativeHandle, useState } from "react";
import { Button } from "@/components/ui/button";
import { Combobox } from "@/components/ui/Combobox";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { Icon } from "@/components/ui/Icon";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { PlayerName } from "@/components/PlayerName";
import type { Player } from "@/components/PlayerName";
import { RaceSelect } from "@/components/RaceSelect";
import { StatusAlert } from "@/components/StatusAlert";
import { W3CMmr } from "@/components/W3CMmr";
import { usePlayerStore, useSeason } from "@/stores";
import { resolveCurrentSeasonId } from "@/helpers/current-season.js";
import { getW3CMMR } from "@/helpers/w3c-stats.js";
import { defaultSignupRace } from "@/helpers/players.mjs";

type Season = { id: number; name: string };

export type SeasonSignupDialogHandle = { open: (preset?: { season?: Season | null; player?: Player | null }) => void };

/** Signs one player up for one season by hand. The caller opens it through its ref, and may
 *  preset the season or the player, which the form then shows but does not take. */
export function SeasonSignupDialog({ onAdded, ref }: { onAdded?: () => void; ref?: React.Ref<SeasonSignupDialogHandle> }) {
  const playerStore = usePlayerStore();
  const seasonStore = useSeason();

  const [show, setShow] = useState(false);
  const [isAdding, setIsAdding] = useState(false);
  const [addError, setAddError] = useState<string | null>(null);
  const [seasonId, setSeasonId] = useState<number | null>(null);
  const [playerId, setPlayerId] = useState<number | null>(null);
  const [race, setRace] = useState<string | null>(null);
  const [presetSeason, setPresetSeason] = useState<Season | null>(null);
  const [presetPlayer, setPresetPlayer] = useState<Player | null>(null);
  // The ported player store keeps no rows, so the list the picker offers lives here
  const [players, setPlayers] = useState<Player[]>([]);

  const selectedPlayer = players.find((player) => player.id === playerId) ?? null;
  const mmr = selectedPlayer && race ? getW3CMMR(selectedPlayer, race) : null;

  // The signup opens on the race the player last registered on, or his main
  // ladder race. Picking another player moves it.
  const [raceKey, setRaceKey] = useState<string | null>(null);
  const key = `${selectedPlayer?.id ?? ""}`;
  if (raceKey !== key) {
    setRaceKey(key);
    setRace(selectedPlayer ? defaultSignupRace(selectedPlayer) : null);
  }

  useImperativeHandle(ref, () => ({
    open: async ({ season = null, player = null } = {}) => {
      setPresetSeason(season);
      setPresetPlayer(player);
      setSeasonId(season?.id ?? null);
      setPlayerId((player?.id as number) ?? null);
      setRace(null);
      setRaceKey(null);
      setAddError(null);
      setShow(true);
      try {
        if (!seasonStore.seasons.length) await seasonStore.fetchSeasons();
        if (!players.length) setPlayers(await playerStore.fetchPlayers());
        if (!season?.id) setSeasonId(await resolveCurrentSeasonId());
      } catch (err) {
        console.error("Failed to load the signup dialog lists:", err);
      }
    },
  }));

  const close = () => setShow(false);

  const addSignup = async () => {
    setAddError(null);
    setIsAdding(true);
    try {
      await seasonStore.addUserSignup(seasonId as number, [playerId as number], race as string);
      onAdded?.();
      close();
    } catch (error) {
      console.error("Error adding signup:", error);
      setAddError("Error adding signup: " + (error as Error).message);
    } finally {
      setIsAdding(false);
    }
  };

  return (
    <Dialog open={show} onOpenChange={(open) => (open ? setShow(true) : close())}>
      <DialogContent showCloseButton={false} className="max-w-[600px] gap-0 p-0 sm:max-w-[600px]">
        <DialogTitle className="flex items-center gap-2 bg-primary px-4 py-3 text-on-primary">
          <Icon name="mdi-account-check" />
          Add signup
        </DialogTitle>

        <div className="px-4 pt-4">
          <StatusAlert modelValue={addError} onClose={() => setAddError(null)} />
        </div>

        <div className="flex flex-col gap-4 p-4">
          <Select
            items={seasonStore.seasons.map((season) => ({ value: season.id, label: season.name }))}
            value={seasonId}
            onValueChange={(value) => setSeasonId(value as number | null)}
            disabled={!!presetSeason}
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

          <Combobox
            label="Player"
            items={players.map((player) => ({ value: String(player.id), title: player.name ?? "" }))}
            value={playerId == null ? null : String(playerId)}
            onChange={(value) => setPlayerId(value == null ? null : Number(value))}
            disabled={!!presetPlayer}
            row={(item) => {
              const player = players.find((row) => String(row.id) === item.value);
              return player ? <PlayerName player={player} plain mmr={false} /> : item.title;
            }}
          />

          <RaceSelect value={race} onChange={setRace} />

          <div className="flex items-center gap-2">
            <W3CMmr />
            <span className="tnum">{mmr ?? "—"}</span>
          </div>
        </div>

        <div className="flex justify-end gap-2 p-4 pt-0">
          <Button variant="ghost" onClick={close}>
            Cancel
          </Button>
          <Button onClick={addSignup} disabled={isAdding || !seasonId || !playerId || !race}>
            <Icon name={isAdding ? "mdi-loading mdi-spin" : "mdi-plus"} />
            Add signup
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export default SeasonSignupDialog;
