"use client";
import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Icon } from "@/components/ui/Icon";
import { Progress } from "@/components/ui/progress";
import { StatusAlert } from "@/components/StatusAlert";
import { useEventStore } from "@/stores";

/* eslint-disable @typescript-eslint/no-explicit-any */
type Row = Record<string, any>;

/** Tonight's KOTH night lives on its event page, so this link lands there and keeps
 *  `?mode=clean`, which is what a stream's saved link carries. */
export function KothDashboard() {
  const router = useRouter();
  const store = useEventStore();
  const clean = useSearchParams().get("mode") === "clean";
  const [empty, setEmpty] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    store
      .fetchBoard(null)
      .then((board: Row) => router.replace(`/events/${board.night_id}${clean ? "?mode=clean" : ""}`))
      .catch((e: Row) => {
        // the read answers 400 or 404 while no night is open; that is the empty page, not an error
        if (e.status === 400 || e.status === 404) setEmpty(true);
        else setError(`The night did not load: ${e.message}`);
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <>
      <StatusAlert modelValue={error} onClose={() => setError(null)} />
      {empty ? (
        <div className="py-12 text-center text-muted-foreground">
          <Icon name="mdi-crown-outline" size={64} className="opacity-40" />
          <p className="mt-3 mb-0 text-xl font-medium">No KOTH night is open</p>
        </div>
      ) : error ? null : (
        <Progress value={null} />
      )}
    </>
  );
}

export default KothDashboard;
