"use client";
import { Fragment, useState } from "react";
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
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
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

const ALL_ROWS = Number.MAX_SAFE_INTEGER;

/** The port of `v-data-table`: sort, page and column visibility over one column list.
 *  `rowCount` puts the table in server mode, as `v-data-table-server` was. `expand` draws a
 *  chevron column and one detail row under the row it opens, as `show-expand` did. */
export function DataTable<T extends RowData>({
  columns,
  data,
  empty = "Nothing to show",
  pageSize,
  pageSizeOptions,
  onPageSizeChange,
  rowCount,
  sorting,
  onSortingChange,
  columnVisibility,
  page,
  onPageChange,
  rowId,
  expand,
  onExpand,
  className,
}: {
  columns: ColumnDef<typeof features, T>[];
  data: T[];
  empty?: React.ReactNode;
  pageSize?: number; // -1 shows every row the server answered, as the 'All' option did
  pageSizeOptions?: { value: number; title: string }[];
  onPageSizeChange?: (pageSize: number) => void;
  rowCount?: number;
  sorting?: SortingState;
  onSortingChange?: (sorting: SortingState) => void;
  columnVisibility?: ColumnVisibilityState;
  page?: number; // the page the caller holds, from 0; server mode reads it back through onPageChange
  onPageChange?: (page: number) => void;
  rowId?: (row: T) => string; // the row's own key, so an open row follows its data through a sort
  expand?: (row: T) => React.ReactNode;
  onExpand?: (row: T) => void; // the row just opened, so the caller can fetch its detail
  className?: string;
}) {
  const [ownSorting, setOwnSorting] = useState<SortingState>([]);
  const [opened, setOpened] = useState<Set<string>>(new Set());
  const size = pageSize == null || pageSize === -1 ? ALL_ROWS : pageSize;
  const table = useTable({
    features,
    data,
    columns,
    ...(rowId ? { getRowId: (row: T) => rowId(row) } : {}),
    state: {
      sorting: sorting ?? ownSorting,
      columnVisibility,
      ...(page == null ? {} : { pagination: { pageIndex: page, pageSize: size } }),
    },
    onSortingChange: (updater) => {
      const next = typeof updater === "function" ? updater(sorting ?? ownSorting) : updater;
      if (onSortingChange) onSortingChange(next);
      else setOwnSorting(next);
    },
    ...(onPageChange == null
      ? {}
      : {
          onPaginationChange: (updater) => {
            const was = { pageIndex: page ?? 0, pageSize: size };
            onPageChange((typeof updater === "function" ? updater(was) : updater).pageIndex);
          },
        }),
    // A table with no page size shows every row and draws no pager.
    initialState: { pagination: { pageSize: size, pageIndex: 0 } },
    ...(rowCount == null ? {} : { manualPagination: true, manualSorting: true, rowCount }),
  });

  const toggle = (id: string, row: T) => {
    const wasOpen = opened.has(id);
    setOpened((was) => {
      const next = new Set(was);
      if (wasOpen) next.delete(id);
      else next.add(id);
      return next;
    });
    if (!wasOpen) onExpand?.(row);
  };

  const { pageIndex } = table.state.pagination;
  const total = table.getRowCount();
  // 'All' and a table with no pager both read one page the length of the list.
  const rows = size === ALL_ROWS ? total : size;
  const first = total === 0 ? 0 : pageIndex * rows + 1;
  const last = Math.min(total, (pageIndex + 1) * rows);
  const span = columns.length + (expand ? 1 : 0);

  return (
    <>
      <div className={cn("table-scroll overflow-x-auto", className)}>
        <table className="w-full caption-bottom text-sm">
          <TableHeader>
            {table.getHeaderGroups().map((group) => (
              <TableRow key={group.id}>
                {expand ? <TableHead style={{ width: "48px" }} /> : null}
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
                <TableCell colSpan={span} className="text-muted-foreground">
                  {empty}
                </TableCell>
              </TableRow>
            ) : (
              table.getRowModel().rows.map((row) => {
                const open = opened.has(row.id);
                return (
                  <Fragment key={row.id}>
                    <TableRow
                      // The whole row opens the detail, as `expand-on-click` did.
                      className={cn(expand && "cursor-pointer")}
                      onClick={expand ? () => toggle(row.id, row.original) : undefined}
                    >
                      {expand ? (
                        <TableCell>
                          {/* the chevron is the keyboard route into the detail; the row click stays for the mouse */}
                          <Button
                            variant="ghost"
                            size="icon-sm"
                            aria-expanded={open}
                            aria-label="Score breakdown"
                            onClick={(event) => {
                              event.stopPropagation();
                              toggle(row.id, row.original);
                            }}
                          >
                            <Icon name={open ? "mdi-chevron-up" : "mdi-chevron-down"} />
                          </Button>
                        </TableCell>
                      ) : null}
                      {row.getVisibleCells().map((cell) => (
                        <TableCell key={cell.id}>
                          <table.FlexRender cell={cell} />
                        </TableCell>
                      ))}
                    </TableRow>
                    {expand && open ? (
                      <tr>
                        <td colSpan={span} className="p-0">
                          {expand(row.original)}
                        </td>
                      </tr>
                    ) : null}
                  </Fragment>
                );
              })
            )}
          </TableBody>
        </table>
      </div>
      {pageSize == null ? null : (
        /* The footer of `v-data-table`: the page size, the row range and the two arrows. */
        <div className="flex items-center justify-end gap-4 px-4 py-2 text-sm text-muted-foreground">
          {pageSizeOptions ? (
            <span className="flex items-center gap-2">
              Items per page
              <Select value={pageSize} onValueChange={(value) => onPageSizeChange?.(value as number)}>
                <SelectTrigger size="sm" aria-label="Items per page" className="w-[84px]">
                  <SelectValue>{(chosen: number) => pageSizeOptions.find((option) => option.value === chosen)?.title ?? String(chosen)}</SelectValue>
                </SelectTrigger>
                <SelectContent>
                  {pageSizeOptions.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.title}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </span>
          ) : (
            <span>Items per page: {pageSize}</span>
          )}
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
