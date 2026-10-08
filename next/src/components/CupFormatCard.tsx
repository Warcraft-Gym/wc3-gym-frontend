"use client";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { Icon } from "@/components/ui/Icon";
import { BestOfPlan } from "@/components/BestOfPlan";
import { MapPoolPicker, type PoolMap } from "@/components/MapPoolPicker";
import { StatusAlert } from "@/components/StatusAlert";
import { bestOfLine, largestBestOf, parsePlan, planText, poolProblem } from "@/helpers/best-of-plan.mjs";
import { readStagesPayload } from "@/helpers/event-wizard.mjs";
import { useEventStore } from "@/stores";

/* eslint-disable @typescript-eslint/no-explicit-any */
type Row = Record<string, any>;

/** What a cup plays, over its draw on the run page: the best-of of each bracket part and the map
 *  pool the players veto from. Both change until the bracket is drawn; after it the rounds keep
 *  the best-of the draw wrote, so the card only reads. */
export function CupFormatCard({ event, stage, drawn, onEvent }: { event: Row; stage: Row; drawn: boolean; onEvent: (event: Row) => void }) {
  const store = useEventStore();
  const [open, setOpen] = useState(false);
  const [bestOf, setBestOf] = useState<number>(stage.best_of);
  const [plan, setPlan] = useState<Record<string, number>>({});
  const [pool, setPool] = useState<PoolMap[]>([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const stored = parsePlan(stage.best_of_by_round);
  const maps: Row[] = event.maps || [];
  const editable = !drawn && !event.closed_at;
  const problem = poolProblem(pool.length, bestOf, plan);

  const edit = () => {
    setBestOf(stage.best_of);
    setPlan(stored);
    setPool(maps.map((row) => ({ id: row.id, name: row.name, shortname: row.shortname })));
    setError(null);
    setOpen(true);
  };

  // The pool must hold the longest series at every write, so the side that grows goes first
  const save = async () => {
    setSaving(true);
    setError(null);
    try {
      const stages = readStagesPayload(event.stages, {}).map((row: Row, index: number) =>
        event.stages[index]?.id === stage.id ? { ...row, best_of: bestOf, best_of_by_round: planText(plan, stage.format, bestOf) } : row,
      );
      const writeStages = () => store.setStages(event.id, stages);
      const writePool = () => store.setEventPool(event.id, pool.map((row) => row.id));
      const growing = largestBestOf(bestOf, plan) >= largestBestOf(stage.best_of, stored);
      if (growing) {
        await writePool();
        await writeStages();
      } else {
        await writeStages();
        await writePool();
      }
      // a cup made before the veto by best-of takes it on with its first pool
      onEvent(event.veto_by_best_of ? await store.fetchEvent(event.id) : await store.updateEvent(event.id, { veto_by_best_of: true }));
      setOpen(false);
    } catch (e) {
      setError((e as Error).message || "The write failed");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Card className="card mb-4">
      <CardHeader className="flex flex-row flex-wrap items-center gap-2">
        <CardTitle className="flex-1">Format and maps</CardTitle>
        {editable ? (
          <Button variant="outline" size="sm" onClick={edit}>
            <Icon name="mdi-pencil" />
            Edit
          </Button>
        ) : null}
      </CardHeader>
      <CardContent className="flex flex-col gap-1 text-sm">
        <div>
          <span className="text-muted-foreground">Best of: </span>
          {bestOfLine(stage.best_of, stored, stage.format)}
        </div>
        <div>
          <span className="text-muted-foreground">Maps: </span>
          {maps.length ? maps.map((row) => row.name).join(", ") : "No maps yet. Add them before the draw, so the players can veto."}
        </div>
        {drawn ? <div className="text-xs text-muted-foreground">The bracket is drawn, so its best-of and its maps stay as they are.</div> : null}
      </CardContent>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent size="lg" className="gap-0 p-0">
          <DialogTitle className="banner bg-banner px-4 py-3 text-primary">Format and maps</DialogTitle>
          <div className="flex max-h-[70vh] flex-col gap-5 overflow-y-auto p-4">
            <StatusAlert modelValue={error} onClose={() => setError(null)} />
            <BestOfPlan
              format={stage.format}
              bestOf={bestOf}
              plan={plan}
              onChange={(next, nextPlan) => {
                setBestOf(next);
                setPlan(nextPlan);
              }}
            />
            <MapPoolPicker pool={pool} onChange={setPool} problem={problem} excludeEventId={event.id} />
          </div>
          <div className="flex justify-end gap-2 p-4">
            <Button variant="ghost" disabled={saving} onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button disabled={saving || !!problem} onClick={save}>
              {saving ? <Icon name="mdi-loading mdi-spin" /> : <Icon name="mdi-content-save" />}
              Save
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </Card>
  );
}

export default CupFormatCard;
