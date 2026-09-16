"use client";
import { useState } from "react";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { Icon } from "@/components/ui/Icon";

/** A column heading that carries a help note.
 *
 *  The sort click belongs to the header cell the table already binds it on, so this only draws
 *  the arrow it is handed; handling the click here as well would toggle the sort twice. */
export function ColumnNote({
  title = "",
  note,
  sortIcon = null,
  children,
}: {
  title?: string;
  note: string;
  sortIcon?: string | null;
  children?: React.ReactNode;
}) {
  const [open, setOpen] = useState(false);
  return (
    <span className="inline-flex items-center">
      <span>
        {children ?? title}
        {sortIcon ? <Icon name={sortIcon} className="ml-1 text-xs" /> : null}
      </span>
      <Tooltip open={open} onOpenChange={setOpen}>
        <TooltipTrigger
          render={
            // a tap opens it as well as a hover, so the note is reachable on a phone
            <button
              type="button"
              className="note-icon ml-1 cursor-help opacity-60 hover:opacity-100"
              onClick={(event) => {
                event.stopPropagation();
                setOpen((o) => !o);
              }}
            />
          }
        >
          <Icon name="mdi-help-circle-outline" className="text-xs" />
        </TooltipTrigger>
        <TooltipContent className="max-w-[320px]">{note}</TooltipContent>
      </Tooltip>
    </span>
  );
}

export default ColumnNote;
