'use client';

import {useSuspenseQuery} from '@tanstack/react-query';
import {
  type ColumnDef,
  type ColumnFiltersState,
  flexRender,
  getCoreRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  type PaginationState,
  type SortingState,
  useReactTable,
  type VisibilityState,
} from '@tanstack/react-table';
import {
  ArrowUpDown,
  ChevronDown,
  ChevronFirst,
  ChevronLast,
  ChevronLeft,
  ChevronRight,
  MoreHorizontal,
} from 'lucide-react';
import {useRouter} from 'next/navigation';
import * as React from 'react';

import {useProjectId} from '@/app/app/projects/[projectId]/utils';
import {Button} from '@/components/ui/button';
import {Checkbox} from '@/components/ui/checkbox';
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {Table, TableBody, TableCell, TableHead, TableHeader, TableRow} from '@/components/ui/table';
import {useTRPC} from '@/trpc/client';

function formatDateTime(value: unknown): {display: string; dateTimeAttr?: string; title?: string} {
  const d = value instanceof Date ? value : new Date(String(value ?? ''));
  if (Number.isNaN(d.getTime())) return {display: String(value ?? '')};
  const display = new Intl.DateTimeFormat('en-US', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(d);
  return {display, dateTimeAttr: d.toISOString(), title: d.toLocaleString('en-US')};
}

function humanizeId(id: string): string {
  return id
    .replace(/[_-]+/g, ' ')
    .replace(/([a-z0-9])([A-Z])/g, '$1 $2')
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase()
    .replace(/^\w/, c => c.toUpperCase());
}

export function ConfigVersionsTable({
  name,
  configId,
  currentVersion,
}: {
  name: string;
  configId: string;
  currentVersion: number;
}) {
  const router = useRouter();
  const projectId = useProjectId();
  const trpc = useTRPC();
  const {
    data: {versions},
  } = useSuspenseQuery(
    trpc.getConfigVersionList.queryOptions({
      configId,
      projectId,
    }),
  );
  const currentConfigVersion = currentVersion;
  // Note: Restore functionality removed since we now use config-level versioning instead of variant-level versioning
  const tableData = React.useMemo(
    () =>
      (versions ?? []).map(v => ({
        id: v.id,
        version: v.version,
        description: v.description ?? null,
        createdAt: v.createdAt,
        authorEmail: v.authorEmail ?? null,
      })),
    [versions],
  );

  const [sorting, setSorting] = React.useState<SortingState>([]);
  const [columnFilters, setColumnFilters] = React.useState<ColumnFiltersState>([]);
  const [columnVisibility, setColumnVisibility] = React.useState<VisibilityState>({});
  const [rowSelection, setRowSelection] = React.useState({});
  const [pagination, setPagination] = React.useState<PaginationState>({
    pageIndex: 0,
    pageSize: 10,
  });

  const columns = React.useMemo<
    ColumnDef<{
      id: string;
      version: number;
      description: string | null;
      createdAt: string | Date;
      authorEmail: string | null;
    }>[]
  >(
    () => [
      {
        id: 'select',
        header: ({table}) => (
          <Checkbox
            checked={
              table.getIsAllPageRowsSelected() ||
              (table.getIsSomePageRowsSelected() && 'indeterminate')
            }
            onCheckedChange={value => table.toggleAllPageRowsSelected(!!value)}
            onClick={e => e.stopPropagation()}
            onMouseDown={e => e.stopPropagation()}
            aria-label="Select all"
          />
        ),
        cell: ({row}) => (
          <Checkbox
            checked={row.getIsSelected()}
            onCheckedChange={value => row.toggleSelected(!!value)}
            onClick={e => e.stopPropagation()}
            onMouseDown={e => e.stopPropagation()}
            aria-label="Select row"
          />
        ),
        enableSorting: false,
        enableHiding: false,
      },
      {
        accessorKey: 'version',
        header: ({column}) => (
          <Button
            variant="ghost"
            onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
          >
            Version <ArrowUpDown />
          </Button>
        ),
        cell: ({row}) => <div>v{row.getValue('version')}</div>,
        sortingFn: 'alphanumeric',
      },
      {
        accessorKey: 'createdAt',
        header: ({column}) => (
          <Button
            variant="ghost"
            onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
          >
            Created At <ArrowUpDown />
          </Button>
        ),
        cell: ({row}) => {
          const {display, dateTimeAttr, title} = formatDateTime(row.getValue('createdAt'));
          return (
            <time dateTime={dateTimeAttr} title={title} className="whitespace-nowrap">
              {display}
            </time>
          );
        },
      },
      {
        accessorKey: 'description',
        header: 'Description',
        cell: ({row}) => (
          <div className="max-w-[200px] truncate" title={String(row.getValue('description') ?? '')}>
            {row.getValue('description') || '—'}
          </div>
        ),
      },
      {
        accessorKey: 'authorEmail',
        header: 'Author',
        cell: ({row}) => <div>{row.getValue('authorEmail') || '—'}</div>,
      },
      {
        id: 'actions',
        enableHiding: false,
        cell: ({row}) => {
          const version = row.original;
          return (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  className="h-8 w-8 p-0"
                  onClick={e => e.stopPropagation()}
                  onMouseDown={e => e.stopPropagation()}
                >
                  <span className="sr-only">Open menu</span>
                  <MoreHorizontal />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem
                  onClick={e => {
                    e.stopPropagation();
                    router.push(
                      `/app/projects/${projectId}/configs/${encodeURIComponent(name)}/versions/${version.version}`,
                    );
                  }}
                >
                  View
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          );
        },
      },
    ],
    [name, router, projectId],
  );

  // eslint-disable-next-line react-hooks/incompatible-library
  const table = useReactTable({
    data: tableData,
    columns,
    onSortingChange: setSorting,
    onColumnFiltersChange: setColumnFilters,
    getCoreRowModel: getCoreRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    onColumnVisibilityChange: setColumnVisibility,
    onRowSelectionChange: setRowSelection,
    onPaginationChange: setPagination,
    state: {sorting, columnFilters, columnVisibility, rowSelection, pagination},
  });

  const filteredRowCount = table.getFilteredRowModel().rows.length;
  const firstVisibleRow =
    filteredRowCount === 0 ? 0 : pagination.pageIndex * pagination.pageSize + 1;
  const lastVisibleRow = Math.min(
    (pagination.pageIndex + 1) * pagination.pageSize,
    filteredRowCount,
  );

  const isInteractive = (el: EventTarget | null) => {
    if (!(el instanceof Element)) return false;
    return !!el.closest(
      'button, a, [role="checkbox"], [role="menu"], input, select, textarea, [data-no-row-click]',
    );
  };

  const handleRowClick = React.useCallback(
    (e: React.MouseEvent, versionNumber: number) => {
      if (e.defaultPrevented) return;
      if (isInteractive(e.target)) return;
      const selection = window.getSelection();
      if (selection && selection.toString().length > 0) return;
      router.push(
        `/app/projects/${projectId}/configs/${encodeURIComponent(name)}/versions/${versionNumber}`,
      );
    },
    [router, name, projectId],
  );

  return (
    <div className="w-full">
      <div className="flex items-center py-4 gap-4">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" className="ml-auto">
              Columns <ChevronDown />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            {table
              .getAllColumns()
              .filter(column => column.getCanHide())
              .map(column => {
                const header = column.columnDef.header as unknown;
                const label = typeof header === 'string' ? header : humanizeId(column.id);
                return (
                  <DropdownMenuCheckboxItem
                    key={column.id}
                    checked={column.getIsVisible()}
                    onCheckedChange={value => column.toggleVisibility(!!value)}
                  >
                    {label}
                  </DropdownMenuCheckboxItem>
                );
              })}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
      <div className="overflow-hidden rounded-md border">
        <Table>
          <TableHeader>
            {table.getHeaderGroups().map(headerGroup => (
              <TableRow key={headerGroup.id}>
                {headerGroup.headers.map(header => (
                  <TableHead key={header.id}>
                    {header.isPlaceholder
                      ? null
                      : flexRender(header.column.columnDef.header, header.getContext())}
                  </TableHead>
                ))}
              </TableRow>
            ))}
          </TableHeader>
          <TableBody>
            {table.getRowModel().rows?.length ? (
              table.getRowModel().rows.map(row => (
                <TableRow
                  key={row.id}
                  data-state={row.getIsSelected() && 'selected'}
                  onClick={e => handleRowClick(e, row.original.version)}
                  className="cursor-pointer select-text"
                >
                  {row.getVisibleCells().map(cell => (
                    <TableCell key={cell.id}>
                      {flexRender(cell.column.columnDef.cell, cell.getContext())}
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={columns.length} className="h-24 text-center">
                  No config versions yet.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
      <div className="flex flex-col gap-3 py-4 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-sm text-muted-foreground" aria-live="polite">
          Showing {firstVisibleRow}-{lastVisibleRow} of {filteredRowCount} versions
        </p>
        <div className="flex flex-wrap items-center gap-4">
          <div className="flex items-center gap-2">
            <span className="whitespace-nowrap text-sm">Rows per page</span>
            <Select
              value={String(pagination.pageSize)}
              onValueChange={value => table.setPageSize(Number(value))}
            >
              <SelectTrigger className="h-8 w-[70px]" aria-label="Rows per page">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {[10, 20, 50].map(pageSize => (
                  <SelectItem key={pageSize} value={String(pageSize)}>
                    {pageSize}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <span className="whitespace-nowrap text-sm">
            Page {pagination.pageIndex + 1} of {Math.max(table.getPageCount(), 1)}
          </span>
          <div className="flex items-center gap-1">
            <Button
              variant="outline"
              size="icon"
              className="h-8 w-8"
              onClick={() => table.firstPage()}
              disabled={!table.getCanPreviousPage()}
              aria-label="Go to first page"
              title="First page"
            >
              <ChevronFirst />
            </Button>
            <Button
              variant="outline"
              size="icon"
              className="h-8 w-8"
              onClick={() => table.previousPage()}
              disabled={!table.getCanPreviousPage()}
              aria-label="Go to previous page"
              title="Previous page"
            >
              <ChevronLeft />
            </Button>
            <Button
              variant="outline"
              size="icon"
              className="h-8 w-8"
              onClick={() => table.nextPage()}
              disabled={!table.getCanNextPage()}
              aria-label="Go to next page"
              title="Next page"
            >
              <ChevronRight />
            </Button>
            <Button
              variant="outline"
              size="icon"
              className="h-8 w-8"
              onClick={() => table.lastPage()}
              disabled={!table.getCanNextPage()}
              aria-label="Go to last page"
              title="Last page"
            >
              <ChevronLast />
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
