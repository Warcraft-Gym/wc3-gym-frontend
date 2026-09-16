"use client";
import { useState } from "react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Icon } from "@/components/ui/Icon";
import { cn } from "@/lib/utils";

export type GroupedColumn = {
  key: string;
  title?: string;
  align?: "right";
  width?: string;
  phone?: boolean; // phone: false hides the column under md
};

export type GroupedRow = { key: string | number; label?: string; title?: string };

/** The shared grouped table: one tinted, clickable header row per group opens its detail rows.
 *  Detail rows share the column grid, so their numbers line up under the header's and visibly sum
 *  to it. `group` fills the header cells, `rows` yields whole `<tr className="detail-row">` rows;
 *  `head[key]` replaces a title. A column with `phone: false` hides under md; the slot cell needs
 *  the same class. */
export function GroupedTable<G extends GroupedRow>({
  columns,
  groups,
  empty = "No data",
  defaultOpen,
  head,
  group,
  rows,
  className,
}: {
  columns: GroupedColumn[];
  groups: G[];
  empty?: string;
  defaultOpen?: boolean; // every group starts open, later groups too
  head?: Record<string, React.ReactNode>;
  group: (args: { group: G; open: boolean }) => React.ReactNode;
  rows: (args: { group: G }) => React.ReactNode;
  className?: string;
}) {
  // The set holds the groups the reader turned away from their default, so a group that arrives
  // later opens with `defaultOpen` and needs no effect to catch it up.
  const [toggled, setToggled] = useState<Set<string | number>>(new Set());
  const isOpen = (key: string | number) => !!defaultOpen !== toggled.has(key);
  const toggle = (key: string | number) =>
    setToggled((was) => {
      const next = new Set(was);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });

  return (
    <div className={cn("table-scroll grouped-table overflow-x-auto", className)}>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead style={{ width: "40px" }} />
            {columns.map((col) => (
              <TableHead
                key={col.key}
                className={cn(col.align === "right" && "text-right", col.phone === false && "hidden min-[960px]:table-cell")}
                style={col.width ? { width: col.width } : undefined}
              >
                {head?.[col.key] ?? col.title}
              </TableHead>
            ))}
          </TableRow>
        </TableHeader>
        <TableBody>
          {groups.map((g) => (
            <GroupRows key={g.key} group={g} open={isOpen(g.key)} toggle={toggle} renderGroup={group} renderRows={rows} />
          ))}
          {groups.length === 0 ? (
            <TableRow>
              <TableCell colSpan={columns.length + 1} className="text-muted-foreground">
                {empty}
              </TableCell>
            </TableRow>
          ) : null}
        </TableBody>
      </Table>
    </div>
  );
}

function GroupRows<G extends GroupedRow>({
  group,
  open,
  toggle,
  renderGroup,
  renderRows,
}: {
  group: G;
  open: boolean;
  toggle: (key: string | number) => void;
  renderGroup: (args: { group: G; open: boolean }) => React.ReactNode;
  renderRows: (args: { group: G }) => React.ReactNode;
}) {
  return (
    <>
      <tr className="group-row cursor-pointer border-b" onClick={() => toggle(group.key)}>
        {/* the chevron is the keyboard route into the group; the row click stays for the mouse */}
        <TableCell>
          <Button
            variant="ghost"
            size="icon-sm"
            aria-expanded={open}
            aria-label={group.label || group.title || String(group.key)}
            onClick={(event) => {
              event.stopPropagation();
              toggle(group.key);
            }}
          >
            <Icon name={open ? "mdi-chevron-up" : "mdi-chevron-down"} />
          </Button>
        </TableCell>
        {renderGroup({ group, open })}
      </tr>
      {open ? renderRows({ group }) : null}
    </>
  );
}

export default GroupedTable;
