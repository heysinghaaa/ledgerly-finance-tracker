"use client";

import {
  createColumnHelper,
  createPaginatedRowModel,
  createSortedRowModel,
  rowPaginationFeature,
  rowSortingFeature,
  sortFn_alphanumeric,
  sortFn_alphanumericCaseSensitive,
  sortFn_basic,
  sortFn_datetime,
  sortFn_text,
  sortFn_textCaseSensitive,
  tableFeatures,
  useTable,
  type CellData,
  type ColumnDef,
  type RowData,
  type SortingState,
  type Updater,
} from "@tanstack/react-table";
import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import InputBase from "@mui/material/InputBase";
import Table from "@mui/material/Table";
import TableBody from "@mui/material/TableBody";
import TableCell from "@mui/material/TableCell";
import TableHead from "@mui/material/TableHead";
import TableRow from "@mui/material/TableRow";
import Typography from "@mui/material/Typography";
import { ArrowDown, ArrowUp, ArrowUpDown, Search, X } from "lucide-react";
import { AppSelect } from "@/components/app-select";
import { AsyncState, type AsyncStatus } from "@/components/elsecase/async-state";

export interface DataExplorerPagination { pageIndex: number; pageSize: number }
export interface DataExplorerSearchConfig<TData> { getSearchText: (row: TData) => string; label?: string; placeholder?: string }
export interface DataExplorerFilterOption { label: string; value: string }
export interface DataExplorerFilterConfig<TData> { id: string; label: string; getValue: (row: TData) => string; options: DataExplorerFilterOption[] }
export interface DataExplorerUrlState { search: string; filters: Record<string, string>; pagination: DataExplorerPagination; sorting: SortingState }

const dataExplorerFeatures = tableFeatures({
  rowSortingFeature,
  sortedRowModel: createSortedRowModel(),
  sortFns: { alphanumeric: sortFn_alphanumeric, alphanumericCaseSensitive: sortFn_alphanumericCaseSensitive, basic: sortFn_basic, datetime: sortFn_datetime, text: sortFn_text, textCaseSensitive: sortFn_textCaseSensitive },
  rowPaginationFeature,
  paginatedRowModel: createPaginatedRowModel(),
});

export type DataExplorerColumnDef<TData extends RowData> = ColumnDef<typeof dataExplorerFeatures, TData, CellData>;
export function createDataExplorerColumnHelper<TData extends RowData>() { return createColumnHelper<typeof dataExplorerFeatures, TData>(); }

export interface DataExplorerProps<TData extends RowData> {
  data: TData[];
  columns: DataExplorerColumnDef<TData>[];
  getRowId: (row: TData) => string;
  status?: AsyncStatus;
  error?: unknown;
  search?: DataExplorerSearchConfig<TData>;
  filters?: DataExplorerFilterConfig<TData>[];
  pagination?: DataExplorerPagination;
  sorting?: SortingState;
  mobileCard: (row: TData) => ReactNode;
  emptyState?: ReactNode;
  noResultsState?: ReactNode;
  onRetry?: () => void | Promise<void>;
  onPaginationChange?: (pagination: DataExplorerPagination) => void;
  onSortingChange?: (sorting: SortingState) => void;
  syncStateToUrl?: boolean;
}

const defaultPagination = { pageIndex: 0, pageSize: 10 };
const emptyFilters: [] = [];

function resolveUpdater<T>(updater: Updater<T>, previous: T): T {
  return typeof updater === "function" ? (updater as (value: T) => T)(previous) : updater;
}

function parseSorting(value: string | null): SortingState {
  if (!value) return [];
  return value.split(",").map((entry) => {
    const separator = entry.lastIndexOf(".");
    if (separator < 1) return null;
    const direction = entry.slice(separator + 1);
    if (direction !== "asc" && direction !== "desc") return null;
    try { return { id: decodeURIComponent(entry.slice(0, separator)), desc: direction === "desc" }; } catch { return null; }
  }).filter((entry): entry is SortingState[number] => entry !== null);
}

export function parseDataExplorerUrlState(parameters: URLSearchParams, filterIds: string[], fallback = defaultPagination): DataExplorerUrlState {
  const positive = (value: string | null, fallbackValue: number) => {
    const parsed = Number(value);
    return Number.isInteger(parsed) && parsed > 0 ? parsed : fallbackValue;
  };
  return {
    search: parameters.get("q") ?? "",
    filters: Object.fromEntries(filterIds.map((id) => [id, parameters.get(`filter.${id}`) ?? ""])),
    sorting: parseSorting(parameters.get("sort")),
    pagination: { pageIndex: positive(parameters.get("page"), 1) - 1, pageSize: positive(parameters.get("size"), fallback.pageSize) },
  };
}

export function filterDataExplorerRows<TData>(data: TData[], search: string, config: DataExplorerSearchConfig<TData> | undefined, filters: DataExplorerFilterConfig<TData>[], values: Record<string, string>) {
  const query = search.trim().toLocaleLowerCase();
  return data.filter((row) => (!query || !config || config.getSearchText(row).toLocaleLowerCase().includes(query)) && filters.every((filter) => !values[filter.id] || filter.getValue(row) === values[filter.id]));
}

function serializeUrl(state: DataExplorerUrlState, filterIds: string[]) {
  const parameters = new URLSearchParams();
  if (state.search.trim()) parameters.set("q", state.search.trim());
  if (state.sorting.length) parameters.set("sort", state.sorting.map(({ id, desc }) => `${encodeURIComponent(id)}.${desc ? "desc" : "asc"}`).join(","));
  if (state.pagination.pageIndex) parameters.set("page", String(state.pagination.pageIndex + 1));
  if (state.pagination.pageSize !== defaultPagination.pageSize) parameters.set("size", String(state.pagination.pageSize));
  filterIds.forEach((id) => { if (state.filters[id]) parameters.set(`filter.${id}`, state.filters[id]); });
  return parameters;
}

export function ResponsiveDataExplorer<TData extends RowData>({
  data,
  columns,
  getRowId,
  status,
  error,
  search: searchConfig,
  filters,
  pagination,
  sorting,
  mobileCard,
  emptyState,
  noResultsState,
  onRetry,
  onPaginationChange,
  onSortingChange,
  syncStateToUrl = false,
}: DataExplorerProps<TData>) {
  const activeFilters = filters ?? emptyFilters;
  const initialPagination = pagination ?? defaultPagination;
  const [searchValue, setSearchValue] = useState("");
  const [filterValues, setFilterValues] = useState<Record<string, string>>({});
  const [internalPagination, setInternalPagination] = useState(initialPagination);
  const [internalSorting, setInternalSorting] = useState<SortingState>(sorting ?? []);
  const activePagination = pagination ?? internalPagination;
  const activeSorting = sorting ?? internalSorting;
  const filterIds = useMemo(() => activeFilters.map(({ id }) => id), [activeFilters]);
  const restored = useRef(false);

  const changePagination = useCallback((updater: Updater<DataExplorerPagination>) => {
    const next = resolveUpdater(updater, activePagination);
    if (pagination === undefined) setInternalPagination(next);
    onPaginationChange?.(next);
  }, [activePagination, onPaginationChange, pagination]);
  const changeSorting = useCallback((updater: Updater<SortingState>) => {
    const next = resolveUpdater(updater, activeSorting);
    if (sorting === undefined) setInternalSorting(next);
    onSortingChange?.(next);
  }, [activeSorting, onSortingChange, sorting]);

  useEffect(() => {
    if (!syncStateToUrl || restored.current) return;
    restored.current = true;
    const frame = window.requestAnimationFrame(() => {
      const next = parseDataExplorerUrlState(new URLSearchParams(window.location.search), filterIds, initialPagination);
      setSearchValue(next.search);
      setFilterValues(next.filters);
      if (pagination === undefined) setInternalPagination(next.pagination);
      if (sorting === undefined) setInternalSorting(next.sorting);
    });
    return () => window.cancelAnimationFrame(frame);
  }, [filterIds, initialPagination, pagination, sorting, syncStateToUrl]);

  useEffect(() => {
    if (!syncStateToUrl || !restored.current) return;
    const query = serializeUrl({ search: searchValue, filters: filterValues, pagination: activePagination, sorting: activeSorting }, filterIds).toString();
    window.history.replaceState(window.history.state, "", `${window.location.pathname}${query ? `?${query}` : ""}`);
  }, [activePagination, activeSorting, filterIds, filterValues, searchValue, syncStateToUrl]);

  const filteredData = useMemo(() => filterDataExplorerRows(data, searchValue, searchConfig, activeFilters, filterValues), [activeFilters, data, filterValues, searchConfig, searchValue]);
  const table = useTable({ features: dataExplorerFeatures, columns, data: filteredData, getRowId, state: { pagination: activePagination, sorting: activeSorting }, onPaginationChange: changePagination, onSortingChange: changeSorting });
  const rows = table.getRowModel().rows;
  const resolvedStatus = status === undefined || status === "success" ? data.length ? "success" : "empty" : status;
  const clearQuery = () => { setSearchValue(""); setFilterValues({}); changePagination({ ...activePagination, pageIndex: 0 }); };
  const first = filteredData.length ? activePagination.pageIndex * activePagination.pageSize + 1 : 0;
  const last = Math.min(filteredData.length, first + rows.length - 1);

  return (
    <Box component="section" className="elsecase-explorer" data-slot="responsive-data-explorer">
      {searchConfig || activeFilters.length ? (
        <Box className="elsecase-explorer-tools">
          {searchConfig ? <Box className="search-field"><Search size={17} /><InputBase aria-label={searchConfig.label ?? "Search records"} placeholder={searchConfig.placeholder ?? "Search records…"} value={searchValue} onChange={(event) => { setSearchValue(event.target.value); changePagination({ ...activePagination, pageIndex: 0 }); }} />{searchValue ? <Button aria-label="Clear search" onClick={() => setSearchValue("")}><X size={15} /></Button> : null}</Box> : null}
          {activeFilters.map((filter) => <AppSelect ariaLabel={filter.label} key={filter.id} value={filterValues[filter.id] ?? ""} onChange={(value) => { setFilterValues((current) => ({ ...current, [filter.id]: value })); changePagination({ ...activePagination, pageIndex: 0 }); }} options={[{ value: "", label: `All ${filter.label.toLowerCase()}` }, ...filter.options]} />)}
        </Box>
      ) : null}

      <AsyncState status={resolvedStatus} errorValue={error} empty={emptyState} onRetry={onRetry}>
        {filteredData.length === 0 && data.length > 0 ? (
          noResultsState ?? <Box className="empty-state no-action"><Typography component="h3">No matching records</Typography><Typography component="p">Change or clear the current search and filters.</Typography><Button onClick={clearQuery}>Clear filters</Button></Box>
        ) : (
          <>
            <Box className="table-scroll elsecase-desktop-table">
              <Table className="data-table">
                <TableHead>{table.getHeaderGroups().map((group) => <TableRow key={group.id}>{group.headers.map((header) => { const direction = header.column.getIsSorted(); return <TableCell aria-sort={direction === "asc" ? "ascending" : direction === "desc" ? "descending" : undefined} component="th" key={header.id}>{header.isPlaceholder ? null : header.column.getCanSort() ? <Button className="elsecase-sort" onClick={header.column.getToggleSortingHandler()}><table.FlexRender header={header} />{direction === "asc" ? <ArrowUp size={14} /> : direction === "desc" ? <ArrowDown size={14} /> : <ArrowUpDown size={14} />}</Button> : <table.FlexRender header={header} />}</TableCell>; })}</TableRow>)}</TableHead>
                <TableBody>{rows.map((row) => <TableRow key={row.id}>{row.getAllCells().map((cell) => <TableCell key={cell.id}><table.FlexRender cell={cell} /></TableCell>)}</TableRow>)}</TableBody>
              </Table>
            </Box>
            <Box component="ul" className="elsecase-mobile-cards">{rows.map((row) => <Box component="li" key={row.id}>{mobileCard(row.original)}</Box>)}</Box>
            <Box className="elsecase-pagination">
              <Typography component="span">Showing {first}–{last} of {filteredData.length}</Typography>
              <Box><Button disabled={!table.getCanPreviousPage()} onClick={() => table.previousPage()}>Previous</Button><Typography component="span">Page {activePagination.pageIndex + 1} of {Math.max(1, table.getPageCount())}</Typography><Button disabled={!table.getCanNextPage()} onClick={() => table.nextPage()}>Next</Button></Box>
            </Box>
          </>
        )}
      </AsyncState>
    </Box>
  );
}
