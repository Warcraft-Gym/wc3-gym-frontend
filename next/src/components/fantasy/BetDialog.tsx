"use client";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { Field } from "@/components/ui/Field";
import { Icon } from "@/components/ui/Icon";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { PlayerName } from "@/components/PlayerName";
import { StatusAlert } from "@/components/StatusAlert";
import { useConfigStore, useFantasyStore } from "@/stores";
import { validateBetPoints } from "@/helpers/bets.mjs";

/* eslint-disable @typescript-eslint/no-explicit-any */
type Row = Record<string, any>;

type BetRules = { fixed: boolean; fixedValue: number; min: number | null; max: number | null };

const NO_RULES: BetRules = { fixed: false, fixedValue: 0, min: null, max: null };

const pointsHint = ({ min, max }: BetRules) =>
  min && max ? `Enter between ${min} and ${max} points` : min ? `Minimum ${min} points` : max ? `Maximum ${max} points` : "Enter the number of points you want to bet";

/** Place, change or delete the member's bet on one fantasy series. The series carries the member's
 *  bet as `myBet`. The caller mounts the dialog for one series, keyed by it, and unmounts it on
 *  close. The point rules come from the fantasy settings; a failed read lets any points through, and
 *  the backend applies the rules again. `onSaved` names what happened. */
export function BetDialog({ series, seasonId, onClose, onSaved }: { series: Row; seasonId: number | null; onClose: () => void; onSaved: (message: string) => void }) {
  const configStore = useConfigStore();
  const fantasyStore = useFantasyStore();
  const [rules, setRules] = useState<BetRules>(NO_RULES);
  // the dialog starts from the member's own bet, or from nothing
  const [winnerId, setWinnerId] = useState<number | null>(series.myBet?.winner_id || null);
  const [points, setPoints] = useState<number | null>(series.myBet?.bet_points || null);
  const [pointsError, setPointsError] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  // the settings are open and edge cached, so every dialog reads them afresh
  useEffect(() => {
    (async () => {
      try {
        const [fixed, value, min, max] = await Promise.all(
          ["fantasy_fixed_bet_points", "fantasy_bet_points_value", "fantasy_min_bet_points", "fantasy_max_bet_points"].map((key) => configStore.fetchSetting(key)),
        );
        setRules({
          fixed: !!fixed?.value && fixed.value.toLowerCase() === "true",
          fixedValue: value?.value ? parseInt(value.value) : 0,
          min: min?.value ? parseInt(min.value) : null,
          max: max?.value ? parseInt(max.value) : null,
        });
      } catch {
        setRules(NO_RULES);
      }
    })();
    // the settings are read once per mount
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const check = (value: number | null) => validateBetPoints(value, rules.min, rules.max);

  const save = async () => {
    setSaving(true);
    try {
      // the points go as typed; the backend applies fixed points when the setting asks for them
      const bet = { series_id: series.id, season_id: seasonId, winner_id: winnerId, bet_points: points };
      if (series.myBet) await fantasyStore.public_updateBet(series.myBet.id, bet);
      else await fantasyStore.public_createBet(bet);
      onSaved(series.myBet ? "Bet updated successfully!" : "Bet placed successfully!");
    } catch (failure: any) {
      console.error("Error saving bet:", failure);
      setError(failure.message || "Error saving bet. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  const remove = async () => {
    if (!series.myBet) return;
    setSaving(true);
    try {
      await fantasyStore.public_deleteBet(series.myBet.id);
      onSaved("Bet deleted successfully!");
    } catch (failure: any) {
      console.error("Error deleting bet:", failure);
      setError(failure.message || "Error deleting bet. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open onOpenChange={(open) => (open ? null : onClose())} disablePointerDismissal>
      <DialogContent showCloseButton={false} className="gap-0 p-0 sm:max-w-[500px]">
        <DialogTitle className="flex items-center gap-2 bg-primary px-4 py-3 text-on-primary">Place fantasy bet</DialogTitle>

        <div className="flex flex-col gap-4 p-4">
          <StatusAlert modelValue={error} onClose={() => setError(null)} />
          <div className="flex flex-wrap items-center gap-2">
            {series.player1 ? <PlayerName player={series.player1} race={series.player1_race} plain /> : null}
            vs
            {series.player2 ? <PlayerName player={series.player2} race={series.player2_race} plain /> : null}
          </div>

          <RadioGroup value={winnerId} onValueChange={(next) => setWinnerId(next as number)} aria-label="Select winner">
            {[
              { id: series.player1_id, name: series.player1?.name },
              { id: series.player2_id, name: series.player2?.name },
            ].map((side) => (
              <Label key={side.id} className="flex items-center gap-2 font-normal">
                <RadioGroupItem value={side.id} />
                {side.name}
              </Label>
            ))}
          </RadioGroup>

          {!rules.fixed ? (
            <Field label="Bet points" hint={pointsHint(rules)} error={pointsError} htmlFor="bet-points">
              <Input
                id="bet-points"
                type="number"
                min={rules.min || 1}
                max={rules.max ?? undefined}
                value={points ?? ""}
                onChange={(event) => {
                  const value = event.target.value === "" ? null : Number(event.target.value);
                  setPoints(value);
                  setPointsError(check(value));
                }}
                onBlur={() => setPointsError(check(points))}
              />
            </Field>
          ) : (
            <StatusAlert modelValue={`This bet will be worth ${rules.fixedValue} points`} type="info" closable={false} />
          )}
        </div>

        <div className="flex flex-wrap justify-end gap-2 px-4 py-3">
          {series.myBet ? (
            <Button variant="ghost" className="mr-auto text-error" disabled={saving} onClick={remove}>
              Delete bet
            </Button>
          ) : null}
          <Button variant="ghost" disabled={saving} onClick={onClose}>
            Cancel
          </Button>
          <Button disabled={!winnerId || saving || (!rules.fixed && (!!pointsError || !points))} onClick={save}>
            <Icon name={saving ? "mdi-loading mdi-spin" : "mdi-content-save"} />
            Save bet
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
