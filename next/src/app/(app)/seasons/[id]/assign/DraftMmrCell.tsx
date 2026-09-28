"use client";
import { useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Icon } from "@/components/ui/Icon";
import { Input } from "@/components/ui/input";
import { TapTooltip } from "@/components/ui/TapTooltip";

/** The MMR the draft reads for one player: the live MMR, and an admin's draft MMR beside it when one
 *  is set. The pencil opens a number field (Enter keeps it, Escape leaves it); the reset takes it back.
 *  A draft MMR lives on the page only, so a reload drops it. */
export function DraftMmrCell({ live, draft, canEdit, onChange, player }: {
  live: number | null;
  draft: number | undefined;
  canEdit: boolean;
  onChange: (mmr: number | null) => void;
  player: string;
}) {
  const [editing, setEditing] = useState(false);
  const [text, setText] = useState("");
  // Escape unmounts the field, and a browser may blur it on the way out; the blur then keeps nothing
  const done = useRef(false);

  const open = () => {
    done.current = false;
    setText(String(draft ?? live ?? ""));
    setEditing(true);
  };
  const keep = () => {
    if (done.current) return;
    done.current = true;
    const value = Number(text);
    setEditing(false);
    if (text.trim() === "" || !Number.isFinite(value)) return;
    // the live MMR again is no draft MMR
    onChange(value === live ? null : Math.round(value));
  };

  if (editing) {
    return (
      <Input
        type="number"
        autoFocus
        aria-label={`Draft MMR for ${player}`}
        className="h-7 w-24 tnum"
        value={text}
        onChange={(event) => setText(event.target.value)}
        onBlur={keep}
        onKeyDown={(event) => {
          if (event.key === "Enter") keep();
          if (event.key === "Escape") {
            done.current = true;
            setEditing(false);
          }
        }}
      />
    );
  }

  return (
    <div className="flex items-center gap-1">
      <span className="tnum">
        {draft != null ? (
          <>
            <span className="text-muted-foreground line-through">{live ?? "N/A"}</span>
            <Icon name="mdi-arrow-right" size={12} className="mx-0.5" />
            <TapTooltip content="Draft MMR, kept on this page only">
              <span className="font-medium text-primary-text">{draft}</span>
            </TapTooltip>
          </>
        ) : (
          live ?? "N/A"
        )}
      </span>
      {canEdit ? (
        <>
          <TapTooltip content="Set a draft MMR to move this player to an earlier or later set. It is kept on this page only and is lost on reload.">

            <Button variant="ghost" size="icon-xs" aria-label={`Set a draft MMR for ${player}`} onClick={open}>
              <Icon name="mdi-pencil" />
            </Button>
          </TapTooltip>
          {draft != null ? (
            <TapTooltip content="Use the live MMR again">
              <Button variant="ghost" size="icon-xs" aria-label={`Use the live MMR for ${player}`} onClick={() => onChange(null)}>
                <Icon name="mdi-restore" />
              </Button>
            </TapTooltip>
          ) : null}
        </>
      ) : null}
    </div>
  );
}

export default DraftMmrCell;
