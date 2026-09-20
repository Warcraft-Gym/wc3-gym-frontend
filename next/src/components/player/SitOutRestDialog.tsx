"use client";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { Icon } from "@/components/ui/Icon";

/* eslint-disable @typescript-eslint/no-explicit-any */
type Row = Record<string, any>;

/** One answer for every round of an event that is still to come. The event offers it
 *  only with early check-in on, because the write covers rounds whose window is shut.
 *  The ask names the rounds that change and the rounds that keep the series they have. */
export function SitOutRestDialog({ label, cards, onConfirm }: {
  label: string; // the event label
  cards: Row[]; // the round cards of that event
  onConfirm: () => Promise<void>;
}) {
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);

  const left = cards.filter((card) => !card.over);
  const changing = left.filter((card) => !card.series && card.answer !== false);
  const keeping = left.filter((card) => card.series);
  // Nothing left to answer, so the event offers nothing
  if (!changing.length) return null;

  const confirm = async () => {
    setSaving(true);
    try {
      await onConfirm();
      setOpen(false);
    } finally {
      setSaving(false);
    }
  };

  const list = (rounds: Row[], muted: boolean) => (
    <ul className="flex flex-col gap-1 text-sm">
      {rounds.map((card) => (
        <li key={card.playday} className={muted ? "text-muted-foreground" : undefined}>
          <span className="font-medium">Round {card.playday}</span> <span className="text-muted-foreground">{card.label}</span>
        </li>
      ))}
    </ul>
  );

  return (
    <>
      <Button variant="outline" size="sm" className="mb-3" onClick={() => setOpen(true)}>
        <Icon name="mdi-calendar-remove" />
        Sit out all remaining rounds
      </Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent showCloseButton={false} className="max-w-[520px] gap-0 p-0 sm:max-w-[520px]">
          <DialogTitle className="flex flex-col gap-0.5 bg-primary px-4 py-3 text-on-primary">
            Sit out all remaining rounds
            <span className="text-sm font-normal">{label}</span>
          </DialogTitle>
          <div className="flex flex-col gap-4 p-4">
            <div>
              <div className="mb-1 text-sm text-muted-foreground">These rounds change to out</div>
              {list(changing, false)}
            </div>
            {keeping.length ? (
              <div>
                <div className="mb-1 text-sm text-muted-foreground">These rounds keep their series</div>
                {list(keeping, true)}
              </div>
            ) : null}
          </div>
          <div className="flex justify-end gap-2 p-4 pt-0">
            <Button variant="ghost" disabled={saving} onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button disabled={saving} onClick={confirm}>
              {saving ? <Icon name="mdi-loading mdi-spin" /> : null}
              Sit out {changing.length} {changing.length === 1 ? "round" : "rounds"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}

export default SitOutRestDialog;
