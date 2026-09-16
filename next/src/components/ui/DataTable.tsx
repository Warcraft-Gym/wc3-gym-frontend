"use client";
import { useState } from "react";
import {
  columnVisibilityFeature,
  createPaginatedRowModel,
  createSortedRowModel,
  rowPaginationFeature,
  rowSortingFeature,
  tableFeatures,
  useTable,
} from "@tanstack/react-table";
import type { ColumnDef, ColumnVisibilityState, RowData, SortingState } from "@tanstack/react-table";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Icon } from "@/components/ui/Icon";
import { cn } from "@/lib/utils";

// Only the three features a v-data-table used: sort, page and column visibility.
const features = tableFeatures({
  rowSortingFeature,
  sortedRowModel: createSortedRowModel(),
  rowPaginationFeature,
  paginatedRowModel: createPaginatedRowModel(),
  columnVisibilityFeature,
});

/** The port of `v-data-table`: sort, page and column visibility over one column list.
 *  `rowCount` puts the table in server mode, as `v-data-table-server` was. */
export function DataTable<T extends RowData>({
  columns,
  data,
  empty = "Nothing to show",
  pageSize,
  rowCount,
  sorting,
  onSortingChange,
  columnVisibility,
  className,
}: {
  columns: ColumnDef<typeof features, T>[];
  data: T[];
  empty?: string;
  pageSize?: number;
  rowCount?: number;
  sorting?: SortingState;
  onSortingChange?: (sorting: SortingState) => void;
  columnVisibility?: ColumnVisibilityState;
  className?: string;
}) {
  const [ownSorting, setOwnSorting] = useState<SortingState>([]);
  const table = useTable({
    features,
    data,
    columns,
    state: { sorting: sorting ?? ownSorting, columnVisibility },
    onSortingChange: (updater) => {
      const next = typeof updater === "function" ? updater(sorting ?? ownSorting) : updater;
      if (onSortingChange) onSortingChange(next);
      else setOwnSorting(next);
    },
    ...(pageSize ? { initialState: { pagination: { pageSize, pageIndex: 0 } } } : {}),
    ...(rowCount == null ? {} : { manualPagination: true, manualSorting: true, rowCount }),
  });

  return (
    <div className={cn("table overflow-x-auto", className)}>
      <Table>
        <TableHeader>
          {table.getHeaderGroups().map((group) => (
            <TableRow key={group.id}>
              {group.headers.map((header) => {
                const sorted = header.column.getIsSorted();
                return (
                  <TableHead
                    key={header.id}
                    onClick={header.column.getToggleSortingHandler()}
                    // The column the table is sorted by reads in the primary colour.
                    className={cn(header.column.getCanSort() && "cursor-pointer select-none", sorted && "text-primary")}
                  >
                    {header.isPlaceholder ? null : <table.FlexRender header={header} />}
                    {/* An unsorted sortable column shows a faint sort icon. */}
                    {header.column.getCanSort() ? (
                      <Icon name={sorted === "desc" ? "mdi-arrow-down" : "mdi-arrow-up"} className={cn("ml-0.5 text-sm", !sorted && "opacity-25")} />
                    ) : null}
                  </TableHead>
                );
              })}
            </TableRow>
          ))}
        </TableHeader>
        <TableBody>
          {table.getRowModel().rows.length === 0 ? (
            <TableRow>
              <TableCell colSpan={columns.length} className="text-muted-foreground">
                {empty}
              </TableCell>
            </TableRow>
          ) : (
            table.getRowModel().rows.map((row) => (
              <TableRow key={row.id}>
                {row.getVisibleCells().map((cell) => (
                  <TableCell key={cell.id}>
                    <table.FlexRender cell={cell} />
                  </TableCell>
                ))}
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
    </div>
  );
}
