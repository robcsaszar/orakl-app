declare module "@svgrid/grid" {
  import type { Component } from "svelte";

  // biome-ignore lint/suspicious/noExplicitAny: declaration file for untyped package
  export type RowData = any;
  export type TableFeatures = Record<string, unknown>;
  export type SortingState = Array<{ id: string; desc: boolean }>;
  export type PaginationState = { pageIndex: number; pageSize: number };

  export type CellContext<TData extends RowData = RowData> = {
    getValue: () => unknown;
    row: { original: TData };
    column: { columnDef: ColumnDef<TableFeatures, TData> };
    cell: unknown;
    table: unknown;
  };

  export type ColumnDef<
    TFeatures extends TableFeatures,
    TData extends RowData,
  > = {
    id?: string;
    field?: keyof TData & string;
    fieldFn?: (row: TData) => unknown;
    header?: string | ((ctx: unknown) => unknown);
    cell?: (ctx: CellContext<TData>) => unknown;
    width?: number;
    enableSorting?: boolean;
    enableColumnFilter?: boolean;
    /** Picks the sort comparator (`number`/`date` sort typed, everything else text). No editor UI is wired up here — `enableInlineEditing` gates that separately. */
    editorType?: "text" | "number" | "date" | "datetime";
    cellClass?: string | ((ctx: CellContext<TData>) => string);
    format?: {
      type: "number" | "currency" | "percent" | "date";
      currency?: string;
      options?: Record<string, unknown>;
      pattern?: string;
    };
  };

  export const rowSortingFeature: TableFeatures;
  export const rowPaginationFeature: TableFeatures;
  export const columnFilteringFeature: TableFeatures;
  export const rowSelectionFeature: TableFeatures;
  export const rowExpandingFeature: TableFeatures;

  export function tableFeatures<T extends Record<string, TableFeatures>>(
    features: T,
  ): T;
  export function renderSnippet<T>(
    // biome-ignore lint/suspicious/noExplicitAny: declaration file for untyped package
    snippet: any,
    props: T | ((ctx: CellContext) => T),
  ): unknown;
  export function renderComponent(component: unknown, props: unknown): unknown;

  export type SvGridProps = {
    data: RowData[];
    columns: ColumnDef<TableFeatures, RowData>[];
    features?: TableFeatures;
    getRowId?: (row: RowData) => string | number;
    filterMode?: "none" | "row" | "menu" | "global";
    showPagination?: boolean;
    showGroupingControls?: boolean;
    enableInlineEditing?: boolean;
    enableCellSelection?: boolean;
    enableRowSummaries?: boolean;
    showRowNumbers?: boolean;
    showRowSelection?: boolean;
    rowHeight?: number;
    pageSize?: number;
    initialColumnPinning?: { left?: string[]; right?: string[] };
    /** Pinned columns stick only with column virtualization off. */
    columnVirtualization?: boolean;
    state?: {
      sorting?: SortingState;
      pagination?: PaginationState;
      columnFilters?: Array<{ id: string; value: unknown }>;
    };
    onSortingChange?: (next: SortingState) => void;
    onPaginationChange?: (next: PaginationState) => void;
    containerHeight?: number | string;
    selectionMode?: "none" | "cell" | "row" | "both";
    fitColumns?: boolean;
    "aria-label"?: string;
    icons?: Record<string, import("svelte").Snippet>;
  };

  export const SvGrid: Component<SvGridProps>;

  /**
   * The subset of `SvGridProps` a wrapper may pass through as an options bag
   * (e.g. `DataGrid`'s `svgrid` prop) rather than as named props. Excludes
   * the props a wrapper hard-wires itself, so a misspelled key is a compile
   * error instead of a silently-ignored bag entry.
   */
  export type SvGridPassthroughProps = Omit<
    SvGridProps,
    | "data"
    | "columns"
    | "features"
    | "getRowId"
    | "icons"
    | "pageSize"
    | "showPagination"
    | "containerHeight"
    | "aria-label"
  >;

  export const FlexRender: Component<{ content: unknown; props: unknown }>;
}
