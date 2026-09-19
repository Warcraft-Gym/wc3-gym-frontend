"use client";
import { Fragment, useState } from "react";
import {
  columnVisibilityFeature,
  createPaginatedRowModel,
  createSortedRowModel,
  rowPaginationFeature,
  rowSortingFeature,
  sortFn_alphanumeric,
  sortFn_basic,
  sortFn_datetime,
  sortFn_text,
  tableFeatures,
  useTable,
} from "@tanstack/react-table";
import type { Column, ColumnDef, ColumnVisibilityState, RowData, SortingState } from "@tanstack/react-table";
import { TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Icon } from "@/components/ui/Icon";
import { cn } from "@/lib/utils";

/** What a column may carry beyond its definition: the short label a stacked row and the phone
 *  sort select read, for a column whose header is a component and not a string. */
type ColumnLabel = { label?: React.ReactNode };

// Only the three features this table needs: sort, page and column visibility.
const features = tableFeatures({
  rowSortingFeature,
  sortedRowModel: createSortedRowModel(),
  rowPaginationFeature,
  paginatedRowModel: createPaginatedRowModel(),
  columnVisibilityFeature,
  // The names `sortFn: 'auto'` picks from: a text column sorts case-insensitively, not by code unit.
  sortFns: { alphanumeric: sortFn_alphanumeric, basic: sortFn_basic, datetime: sortFn_datetime, text: sortFn_text },
  // A type-only slot: it declares the type of columnDef.meta and is stripped at runtime.
  columnMeta: {} as ColumnLabel,
});

const ALL_ROWS = Number.MAX_SAFE_INTEGER;

/** The column's label: its own meta.label, else a string header, else nothing. */
function labelOf<T extends RowData>(column: Column<typeof features, T, unknown>): React.ReactNode {
  const { meta, header } = column.columnDef;
  return meta?.label ?? (typeof header === "string" ? header : null);
}

/** Sort, page and column visibility over one column list.
 *  `rowCount` puts the table in server mode: the caller holds the page and reads it.
 *  `expand` draws a chevron column and one detail row under the row it opens. */
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
  mustSort,
  mobileStack,
  columnVisibility,
  page,
  onPageChange,
  rowId,
  expand,
  expandLabel = "Show detail",
  onExpand,
  className,
}: {
  columns: ColumnDef<typeof features, T>[];
  data: T[];
  empty?: React.ReactNode;
  pageSize?: number; // -1 shows every row the server answered
  pageSizeOptions?: { value: number; title: string }[];
  onPageSizeChange?: (pageSize: number) => void;
  rowCount?: number;
  sorting?: SortingState;
  onSortingChange?: (sorting: SortingState) => void;
  mustSort?: boolean; // a third click on the sorted column keeps the sort, so the read always names one
  mobileStack?: boolean; // below the sm breakpoint every row reads as a block of label and value lines
  columnVisibility?: ColumnVisibilityState;
  page?: number; // the page the caller holds, from 0; server mode reads it back through onPageChange
  onPageChange?: (page: number) => void;
  rowId?: (row: T) => string; // the row's own key, so an open row follows its data through a sort
  expand?: (row: T) => React.ReactNode;
  expandLabel?: string; // what the chevron opens, for the screen reader
  onExpand?: (row: T) => void; // the row just opened, so the caller can fetch its detail
  className?: string;
}) {
  const [ownSorting, setOwnSorting] = useState<SortingState>([]);
  const [ownPage, setOwnPage] = useState(0);
  const [opened, setOpened] = useState<Set<string>>(new Set());
  // A table with no page size shows every row and draws no pager.
  const size = pageSize == null || pageSize === -1 ? ALL_ROWS : pageSize;
  // The page lives in the table state, so a caller that changes pageSize resizes the page it shows.
  // The page never passes the last one, so a larger page size or a shorter list cannot leave an empty page.
  const lastPage = Math.max(0, Math.ceil((rowCount ?? data.length) / size) - 1);
  const pagination = { pageIndex: Math.min(page ?? ownPage, lastPage), pageSize: size };
  const table = useTable({
    features,
    data,
    columns,
    enableSortingRemoval: !mustSort,
    ...(rowId ? { getRowId: (row: T) => rowId(row) } : {}),
    state: {
      sorting: sorting ?? ownSorting,
      columnVisibility,
      pagination,
    },
    onSortingChange: (updater) => {
      const next = typeof updater === "function" ? updater(sorting ?? ownSorting) : updater;
      if (onSortingChange) onSortingChange(next);
      else setOwnSorting(next);
    },
    onPaginationChange: (updater) => {
      const next = typeof updater === "function" ? updater(pagination) : updater;
      onPageChange?.(next.pageIndex);
      if (page == null) setOwnPage(next.pageIndex);
    },
    // Every column sorts ascending on the first click.
    sortDescFirst: false,
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
  // A stacked table hides its head row, so the phone sorts through a select instead.
  const sortable = mobileStack ? table.getVisibleFlatColumns().filter((column) => column.getCanSort()) : [];
  const active = table.state.sorting?.[0];
  const activeColumn = sortable.find((column) => column.id === active?.id);

  return (
    <>
      {sortable.length > 0 ? (
        <div className="table-sort-select items-center gap-2 px-4 py-2 text-sm text-muted-foreground">
          Sort by
          <Select value={activeColumn?.id ?? ""} onValueChange={(value) => table.getColumn(value as string)?.toggleSorting(false)}>
            <SelectTrigger size="sm" aria-label="Sort by" className="w-[150px]">
              <SelectValue>{() => (activeColumn ? labelOf(activeColumn) : "None")}</SelectValue>
            </SelectTrigger>
            <SelectContent>
              {sortable.map((column) => (
                <SelectItem key={column.id} value={column.id}>
                  {labelOf(column)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {/* the second control flips the direction, the way a Vuetify sort chip does */}
          <Button
            variant="ghost"
            size="icon-sm"
            aria-label="Sort direction"
            disabled={!activeColumn}
            onClick={() => activeColumn?.toggleSorting(!active?.desc)}
          >
            <Icon name={active?.desc ? "mdi-arrow-down" : "mdi-arrow-up"} />
          </Button>
        </div>
      ) : null}
      <div className={cn("table-scroll overflow-x-auto", className)}>
        <table className={cn("w-full caption-bottom text-sm", mobileStack && "table-stack")}>
          <TableHeader>
            {table.getHeaderGroups().map((group) => (
              <TableRow key={group.id}>
                {expand ? <TableHead style={{ width: "48px" }} /> : null}
                {group.headers.map((header) => {
                  const sorted = header.column.getIsSorted();
                  const title = labelOf(header.column);
                  return (
                    <TableHead
                      key={header.id}
                      aria-sort={sorted === "asc" ? "ascending" : sorted === "desc" ? "descending" : undefined}
                      onClick={header.column.getToggleSortingHandler()}
                      // The column the table is sorted by reads in the primary colour.
                      className={cn(header.column.getCanSort() && "cursor-pointer select-none", sorted && "text-primary")}
                    >
                      {header.isPlaceholder ? null : <table.FlexRender header={header} />}
                      {/* An unsorted sortable column shows a faint sort icon. The arrow is the keyboard
                          route into the sort; the header click stays for the mouse. */}
                      {header.column.getCanSort() ? (
                        <button
                          type="button"
                          aria-label={typeof title === "string" ? `Sort by ${title}` : "Sort"}
                          className="rounded-sm outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
                          onClick={(event) => {
                            event.stopPropagation();
                            header.column.getToggleSortingHandler()?.(event);
                          }}
                        >
                          <Icon name={sorted === "desc" ? "mdi-arrow-down" : "mdi-arrow-up"} className={cn("ml-0.5 text-sm", !sorted && "opacity-25")} />
                        </button>
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
                      // The whole row opens the detail.
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
                            aria-label={expandLabel}
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
                          {/* a stacked row carries the column label as an element, where the head row is
                              hidden, so a screen reader reads the label with the value */}
                          {mobileStack ? <span className="stack-label">{labelOf(cell.column)}</span> : null}
                          {/* a stacked cell wraps its value, so a cell with two lines stays one flex item next to the label */}
                          {mobileStack ? (
                            <div>
                              <table.FlexRender cell={cell} />
                            </div>
                          ) : (
                            <table.FlexRender cell={cell} />
                          )}
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
        /* The footer: the page size, the row range and the two arrows. */
        <div className="flex items-center justify-end gap-4 px-4 py-2 text-sm text-muted-foreground">
          {pageSizeOptions ? (
            <span className="flex items-center gap-2">
              Items per page:
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
