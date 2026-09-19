"use client";
import { useState } from "react";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Icon } from "@/components/ui/Icon";
import { Progress } from "@/components/ui/progress";
import { hideMissingImage } from "@/helpers/team-image";

export type ImportRow = {
  w3c_name: string;
  matched_name?: string | null;
  shortname?: string | null;
  image_url?: string | null;
  status: string;
};

const STATUS: Record<string, string> = {
  in_pool: "In pool",
  known: "Known",
  no_match: "No match",
  new: "New",
  off_ladder: "Not in pool",
};

// one array for every call with no rows, so the seenRows read below stays stable
const NO_ROWS: ImportRow[] = [];

/** The W3C 1v1 map pool, one row per map, before it is imported.
 *  A known map is imported too: that is what renames a drifted map to the ladder name and fills a
 *  picture it never had. Click a row to leave it out. */
export function LadderImportDialog({
  modelValue = false,
  rows = NO_ROWS,
  loading = false,
  onUpdateModelValue,
  onConfirm,
}: {
  modelValue?: boolean;
  rows?: ImportRow[];
  loading?: boolean;
  onUpdateModelValue?: (open: boolean) => void;
  onConfirm?: (names: string[]) => void;
}) {
  const [skipped, setSkipped] = useState<string[]>([]);
  // A fresh read of the pool starts with nothing skipped
  const [seenRows, setSeenRows] = useState(rows);
  if (seenRows !== rows) {
    setSeenRows(rows);
    setSkipped([]);
  }

  const offLadderRows = rows.filter((row) => row.status === "off_ladder");
  const poolRows = rows.filter((row) => row.status !== "off_ladder");
  const isSkipped = (row: ImportRow) => skipped.includes(row.w3c_name);
  const statusLabel = (row: ImportRow) => (isSkipped(row) ? "Skipped" : STATUS[row.status] || row.status);
  const names = rows.filter((row) => !isSkipped(row)).map((row) => row.w3c_name);
  const toggleSkip = (row: ImportRow) =>
    setSkipped((list) => (list.includes(row.w3c_name) ? list.filter((name) => name !== row.w3c_name) : [...list, row.w3c_name]));

  return (
    <Dialog open={modelValue} onOpenChange={(open) => onUpdateModelValue?.(open)}>
      <DialogContent showCloseButton={false} className="max-w-[760px] gap-0 p-0 sm:max-w-[760px]">
        <DialogTitle className="flex items-center gap-2 bg-primary px-4 py-3 text-on-primary">
          <Icon name="mdi-download" />
          <span>Import W3C map pool</span>
          <Badge variant="outline" className="ml-auto border-current text-on-primary">
            {poolRows.length} maps in the W3C 1v1 pool
          </Badge>
        </DialogTitle>
        {/* null is the indeterminate bar, which is what the read of the ladder pool shows */}
        {loading ? <Progress value={null} /> : null}
        <ul className="max-h-[500px] overflow-y-auto">
          {rows.map((row) => (
            <li key={row.w3c_name}>
              {row === offLadderRows[0] ? (
                <div className="px-4 pt-3 text-xs text-muted-foreground">Not in the W3C pool, picture found</div>
              ) : null}
              <button
                type="button"
                className={`flex w-full items-center gap-3 px-4 py-2 text-left hover:bg-muted ${isSkipped(row) ? "opacity-55" : ""}`}
                onClick={() => toggleSkip(row)}
              >
                <span className="w-[170px] shrink-0 text-sm font-medium">{row.w3c_name}</span>
                <span className="block h-[27px] w-10 shrink-0 overflow-hidden rounded-[3px] bg-band">
                  {row.image_url ? (
                    <img src={row.image_url} alt={row.matched_name || ""} onError={hideMissingImage} className="block h-full w-full object-cover" />
                  ) : null}
                </span>
                <span className="flex-1 text-sm">{row.matched_name || "—"}</span>
                {row.shortname ? (
                  <Badge variant="outline" className="rounded-[4px]">
                    {row.shortname}
                  </Badge>
                ) : null}
                <Badge variant={isSkipped(row) ? "secondary" : "default"}>{statusLabel(row)}</Badge>
              </button>
            </li>
          ))}
        </ul>
        <div className="flex justify-end gap-2 p-4">
          <Button variant="ghost" onClick={() => onUpdateModelValue?.(false)}>
            Cancel
          </Button>
          <Button disabled={!names.length} onClick={() => onConfirm?.(names)}>
            <Icon name="mdi-plus" />
            Import {names.length} maps
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export default LadderImportDialog;
