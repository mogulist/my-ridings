"use client";

import {
  ColumnDef,
  flexRender,
  getCoreRowModel,
  useReactTable,
  getPaginationRowModel,
  getSortedRowModel,
  SortingState,
  getFilteredRowModel,
  ColumnFiltersState,
} from "@tanstack/react-table";

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useState } from "react";
import { useSearchParams, useRouter, usePathname } from "next/navigation";

interface DataTableProps<TData, TValue> {
  columns: ColumnDef<TData, TValue>[];
  data: TData[];
  searchKey?: string;
  /** URL query key for persisting search (e.g. "q" => ?q=...). When set, search is synced to URL and restored on mount. */
  searchParamKey?: string;
  /** Initial sort (e.g. [{ id: "latest_edition_date", desc: true }]). */
  initialSorting?: SortingState;
}

function getInitialColumnFilters(
  searchKey: string | undefined,
  searchParamKey: string | undefined,
  searchParams: URLSearchParams | null
): ColumnFiltersState {
  if (!searchKey || !searchParamKey || !searchParams) return [];
  const value = searchParams.get(searchParamKey) ?? "";
  if (!value) return [];
  return [{ id: searchKey, value }];
}

export function DataTable<TData, TValue>({
  columns,
  data,
  searchKey,
  searchParamKey,
  initialSorting = [],
}: DataTableProps<TData, TValue>) {
  const searchParams = useSearchParams();
  const initialFilters = getInitialColumnFilters(
    searchKey,
    searchParamKey,
    searchParams
  );
  const [sorting, setSorting] = useState<SortingState>(initialSorting);
  const [columnFilters, setColumnFilters] =
    useState<ColumnFiltersState>(initialFilters);
  const router = useRouter();
  const pathname = usePathname();

  const updateSearchParam = (value: string) => {
    if (!searchParamKey) return;
    const params = new URLSearchParams(searchParams.toString());
    if (value) params.set(searchParamKey, value);
    else params.delete(searchParamKey);
    const query = params.toString();
    router.replace(query ? `${pathname}?${query}` : pathname, {
      scroll: false,
    });
  };

  const table = useReactTable({
    data,
    columns,
    getCoreRowModel: getCoreRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    onSortingChange: setSorting,
    getSortedRowModel: getSortedRowModel(),
    onColumnFiltersChange: setColumnFilters,
    getFilteredRowModel: getFilteredRowModel(),
    state: {
      sorting,
      columnFilters,
    },
  });

  return (
    <div>
      {searchKey && (
        <div className="flex items-center py-4">
          <Input
            placeholder="Search..."
            value={
              (table.getColumn(searchKey)?.getFilterValue() as string) ?? ""
            }
            onChange={(event) => {
              const value = event.target.value;
              table.getColumn(searchKey)?.setFilterValue(value);
              updateSearchParam(value);
            }}
            className="max-w-sm"
          />
        </div>
      )}
      <div className="rounded-md border bg-white dark:bg-slate-950">
        <Table>
          <TableHeader>
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow key={headerGroup.id}>
                {headerGroup.headers.map((header) => {
                  const meta = header.column.columnDef.meta as
                    | { className?: string }
                    | undefined;
                  return (
                    <TableHead key={header.id} className={meta?.className}>
                      {header.isPlaceholder
                        ? null
                        : flexRender(
                            header.column.columnDef.header,
                            header.getContext()
                          )}
                    </TableHead>
                  );
                })}
              </TableRow>
            ))}
          </TableHeader>
          <TableBody>
            {table.getRowModel().rows?.length ? (
              table.getRowModel().rows.map((row) => (
                <TableRow
                  key={row.id}
                  data-state={row.getIsSelected() && "selected"}
                >
                  {row.getVisibleCells().map((cell) => {
                    const meta = cell.column.columnDef.meta as
                      | { className?: string }
                      | undefined;
                    return (
                      <TableCell key={cell.id} className={meta?.className}>
                        {flexRender(
                          cell.column.columnDef.cell,
                          cell.getContext()
                        )}
                      </TableCell>
                    );
                  })}
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell
                  colSpan={columns.length}
                  className="h-24 text-center"
                >
                  No results.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
      <div className="flex items-center justify-end space-x-2 py-4">
        <Button
          variant="outline"
          size="sm"
          onClick={() => table.previousPage()}
          disabled={!table.getCanPreviousPage()}
        >
          Previous
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={() => table.nextPage()}
          disabled={!table.getCanNextPage()}
        >
          Next
        </Button>
      </div>
    </div>
  );
}
