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
import { TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
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
  empty?: React.ReactNode;
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
    // A table with no page size shows every row and draws no pager.
    initialState: { pagination: { pageSize: pageSize ?? Number.MAX_SAFE_INTEGER, pageIndex: 0 } },
    ...(rowCount == null ? {} : { manualPagination: true, manualSorting: true, rowCount }),
  });

  const { pageIndex } = table.state.pagination;
  const total = table.getRowCount();
  const first = total === 0 ? 0 : pageIndex * (pageSize ?? total) + 1;
  const last = Math.min(total, (pageIndex + 1) * (pageSize ?? total));

  return (
    <>
      <div className={cn("table-scroll overflow-x-auto", className)}>
        <table className="w-full caption-bottom text-sm">
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
        </table>
      </div>
      {pageSize == null ? null : (
        /* The footer of `v-data-table`: the page size, the row range and the two arrows. The page size is fixed. */
        <div className="flex items-center justify-end gap-4 px-4 py-2 text-sm text-muted-foreground">
          <span>Items per page: {pageSize}</span>
          <span>
            {first}-{last} of {total}
          </span>
          <button type="button" aria-label="Previous page" disabled={!table.getCanPreviousPage()} onClick={() => table.previousPage()} className="disabled:opacity-50">
            <Icon name="mdi-chevron-left" />
          </button>
          <button type="button" aria-label="Next page" disabled={!table.getCanNextPage()} onClick={() => table.nextPage()} className="disabled:opacity-50">
            <Icon name="mdi-chevron-right" />
          </button>
        </div>
      )}
    </>
  );
}
