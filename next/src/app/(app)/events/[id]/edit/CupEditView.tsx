"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { StatusAlert } from "@/components/StatusAlert";
import { CupCreateView } from "../../new/cup/CupCreateView";
import { useEventRunner } from "@/hooks/event-runner";
import { useEventStore } from "@/stores";

/* eslint-disable @typescript-eslint/no-explicit-any */
type Row = Record<string, any>;

/** Edit cup: the Create cup wizard over a cup, for its runners until the draw. `?step=` opens it
 *  on a step, as the run page's links do. */
export function CupEditView({ id }: { id: string }) {
  const store = useEventStore();
  const runner = useEventRunner(id);
  const startStep = useSearchParams().get("step");
  const [event, setEvent] = useState<Row | null>(null);
  const [entrants, setEntrants] = useState<Row[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const load = async () => {
      try {
        // the form opens on what the cup holds now, so both reads ask fresh
        const [row, rows] = await Promise.all([store.fetchEvent(Number(id), true), store.fetchEntrants(Number(id), true)]);
        setEntrants(rows || []);
        setEvent(row);
      } catch (e) {
        setError(`The cup did not load: ${(e as Error).message}`);
      }
    };
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  const back = (title: string, text: string) => (
    <div className="mx-auto max-w-[560px] p-4">
      <h1 className="mb-3">{title}</h1>
      <p className="mb-6">{text}</p>
      <Button nativeButton={false} render={<Link href={runner.runs ? `/events/${id}/admin` : `/events/${id}`} />}>
        {runner.runs ? "Back to the run page" : "Back to the event"}
      </Button>
    </div>
  );

  if (error) return <StatusAlert modelValue={error} />;
  if (runner.loaded && !runner.runs && runner.error) {
    return <StatusAlert modelValue={`The organizers of this event did not load: ${runner.error}`} retry={runner.reload} />;
  }
  if (!event || !runner.loaded) return <Progress value={null} />;
  if (!runner.runs) return back("You Don't Run This Cup", "Only the admins and the organizers of this cup change its settings.");
  if (event.kind !== "cup") return back("Not a Cup", "Edit cup changes a cup's settings; this event has its own run page.");
  if (event.closed_at || event.cancelled_at) return back("The Cup Is Over", "A finished or cancelled cup keeps its settings.");
  if (event.drawn) return back("The Cup Is Drawn", "Its settings are set by the draw. Undo the draw on the run page to change them.");
  return <CupCreateView event={event} entrants={entrants} startStep={startStep} />;
}

export default CupEditView;
