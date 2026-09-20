/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";
import { useImperativeHandle, useState } from "react";
import { Button } from "@/components/ui/button";
import { Combobox } from "@/components/ui/Combobox";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { Field } from "@/components/ui/Field";
import { Icon } from "@/components/ui/Icon";
import { Input } from "@/components/ui/input";
import { ConfirmDeleteDialog } from "@/components/ConfirmDeleteDialog";
import { StatusAlert } from "@/components/StatusAlert";
import { usePlayerCareerStatsStore } from "@/stores";
import { record } from "@/helpers/figures.mjs";

const BASELINE = [
  ["rating", "Rating"], ["seasons_played", "Seasons"], ["series_won", "Series won"],
  ["series_lost", "Series lost"], ["games_won", "Games won"], ["games_lost", "Games lost"],
] as const;

export type CareerStatsDialogHandle = { open: (career: Record<string, any>) => void };

export function CareerStatsDialog({ players, onChanged, ref }: { players: Record<string, any>[]; onChanged?: () => void; ref?: React.Ref<CareerStatsDialogHandle> }) {
  const store = usePlayerCareerStatsStore();
  const [show, setShow] = useState(false);
  const [stat, setStat] = useState<Record<string, any> | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  useImperativeHandle(ref, () => ({
    open: (career) => {
      setStat({
        ...career,
        user_id: career.user?.id ?? career.user_id ?? null,
        ...Object.fromEntries(BASELINE.map(([key]) => [`historical_${key}`, career[`historical_${key}`] ?? 0])),
      });
      setError(null);
      setShow(true);
    },
  }));

  const edit = (key: string, value: unknown) => setStat((row) => row ? { ...row, [key]: value } : row);
  const save = async () => {
    if (!stat) return;
    setSaving(true); setError(null);
    try { await store.update(stat.id, stat); setShow(false); onChanged?.(); }
    catch (e) { setError((e as Error).message || "Failed to save the career stats"); }
    finally { setSaving(false); }
  };
  const remove = async () => {
    if (!stat) return;
    setConfirmDelete(false);
    try { await store.delete(stat.id); setShow(false); onChanged?.(); }
    catch (e) { setError((e as Error).message || "Failed to delete the career stats"); }
  };

  return (
    <>
      <Dialog open={show} onOpenChange={setShow}>
        <DialogContent showCloseButton={false} className="max-w-[800px] gap-0 p-0 sm:max-w-[800px]">
          {stat ? <>
            <DialogTitle className="px-4 py-3 text-xl">Career stats: {stat.player_name}</DialogTitle>
            <div className="px-4"><StatusAlert modelValue={error} onClose={() => setError(null)} /></div>
            <div className="grid gap-4 p-4 md:grid-cols-2">
              <Field label="Name in the history" htmlFor="career-name"><Input id="career-name" value={stat.player_name ?? ""} disabled /></Field>
              <Field label="Linked player" htmlFor="career-player" hint="The player this history belongs to">
                <Combobox
                  id="career-player"
                  label="Linked player"
                  items={players.map((player) => ({ value: String(player.id), title: player.name, battleTag: player.battleTag }))}
                  value={stat.user_id == null ? null : String(stat.user_id)}
                  onChange={(value) => edit("user_id", value == null ? null : Number(value))}
                  row={(item) => <span><span className="block">{item.title}</span><span className="block text-xs text-muted-foreground">{item.battleTag}</span></span>}
                />
              </Field>
              <h3 className="md:col-span-2">Historical baseline</h3>
              {BASELINE.map(([key, label]) => (
                <Field key={key} label={label} htmlFor={`career-${key}`} className="md:[&:nth-of-type(n)]:col-span-1">
                  <Input id={`career-${key}`} type="number" value={stat[`historical_${key}`] ?? 0} onChange={(event) => edit(`historical_${key}`, Number(event.target.value))} />
                </Field>
              ))}
              <div className="md:col-span-2">
                <h3 className="mb-1">Totals with the app&apos;s results</h3>
                <p className="text-sm text-muted-foreground">Rating {stat.rating}. Series {record(stat.series_won, stat.series_lost) ?? "—"}. Games {record(stat.games_won, stat.games_lost) ?? "—"}. {stat.seasons_played} seasons.</p>
              </div>
            </div>
            <div className="flex items-center gap-2 p-4 pt-0">
              <Button variant="ghost" className="text-error" onClick={() => setConfirmDelete(true)}><Icon name="mdi-delete" />Delete</Button>
              <span className="flex-1" />
              <Button variant="ghost" onClick={() => setShow(false)}>Cancel</Button>
              <Button disabled={saving} onClick={save}><Icon name={saving ? "mdi-loading mdi-spin" : "mdi-content-save"} />Save</Button>
            </div>
          </> : null}
        </DialogContent>
      </Dialog>
      <ConfirmDeleteDialog modelValue={confirmDelete} message={`Delete the career stats of ${stat?.player_name}? This cannot be undone.`} deleteIcon="mdi-delete" onConfirm={remove} onCancel={() => setConfirmDelete(false)} onUpdateModelValue={setConfirmDelete} />
    </>
  );
}

export default CareerStatsDialog;
