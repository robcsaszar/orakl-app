import { fireEvent, render, screen } from "@testing-library/svelte";
import { createRawSnippet, mount, unmount } from "svelte";
import { beforeEach, describe, expect, it, vi } from "vitest";
import DataGrid from "../../src/lib/components/ui/DataGrid.svelte";

type Row = { id: string; label: string };

const DATA: Row[] = [{ id: "1", label: "Alpha" }];
const COLUMNS = [{ field: "label", header: "Label" }];

// jsdom has no matchMedia by default; DataGrid reads the narrow breakpoint
// via MediaQuery, so tests stub it before render.
function stubMatchMedia(matches: boolean) {
  window.matchMedia = vi.fn().mockImplementation((query: string) => ({
    matches,
    media: query,
    addEventListener() {},
    removeEventListener() {},
  }));
}

const cardSnippet = createRawSnippet<[() => { row: Row }]>((getProps) => ({
  render: () => `<div data-testid="card-row">${getProps().row.label}</div>`,
}));

const cardHeaderSnippet = createRawSnippet(() => ({
  render: () => `<div data-testid="card-header">Select all</div>`,
}));

const cardDetailsSnippet = createRawSnippet<[() => { row: Row }]>(
  (getProps) => ({
    render: () =>
      `<div data-testid="card-details">Details for ${getProps().row.label}</div>`,
  }),
);

type SortRow = { id: string; name: string; score: number };

const SORT_DATA: SortRow[] = [
  { id: "1", name: "Charlie", score: 5 },
  { id: "2", name: "Alpha", score: 20 },
  { id: "3", name: "Bravo", score: 1 },
];

const SORT_COLUMNS = [
  { field: "name", header: "Name" },
  { field: "score", header: "Score" },
  {
    id: "actions",
    header: "Actions",
    fieldFn: () => null,
    enableSorting: false,
  },
];

const NO_SORTABLE_COLUMNS = [
  { field: "name", header: "Name", enableSorting: false },
  { field: "score", header: "Score", enableSorting: false },
];

const sortCardSnippet = createRawSnippet<[() => { row: SortRow }]>(
  (getProps) => ({
    render: () => `<div data-testid="card-row">${getProps().row.name}</div>`,
  }),
);

type PowerRow = { id: string; name: string; powerCount: number };

const POWER_DATA: PowerRow[] = [
  { id: "1", name: "Ten", powerCount: 10 },
  { id: "2", name: "One", powerCount: 1 },
  { id: "3", name: "Two", powerCount: 2 },
];

const POWER_COLUMNS = [
  { field: "name", header: "Name" },
  { field: "powerCount", header: "Powers" },
];

const powerCardSnippet = createRawSnippet<[() => { row: PowerRow }]>(
  (getProps) => ({
    render: () => `<div data-testid="card-row">${getProps().row.name}</div>`,
  }),
);

type NicknameRow = { id: string; nickname: string | null };

const NICKNAME_DATA: NicknameRow[] = [
  { id: "1", nickname: "Bravo" },
  { id: "2", nickname: null },
  { id: "3", nickname: "Alpha" },
];

const NICKNAME_COLUMNS = [
  {
    id: "nickname",
    header: "Nickname",
    fieldFn: (row: NicknameRow) => row.nickname,
  },
];

const nicknameCardSnippet = createRawSnippet<[() => { row: NicknameRow }]>(
  (getProps) => ({
    render: () =>
      `<div data-testid="card-row">${getProps().row.nickname ?? "blank"}</div>`,
  }),
);

function baseProps(overrides: Record<string, unknown> = {}) {
  return {
    data: DATA,
    columns: COLUMNS,
    features: {},
    getRowId: (r: Row) => r.id,
    label: "Items",
    page: 1,
    pageSize: 10,
    total: 1,
    onPageChange: () => {},
    ...overrides,
  };
}

describe("DataGrid", () => {
  beforeEach(() => {
    localStorage.clear();
    stubMatchMedia(false);
  });

  it("narrow viewport, no stored key: renders the card list, not the table", async () => {
    stubMatchMedia(true);
    render(DataGrid, { props: baseProps({ card: cardSnippet }) });
    await new Promise((r) => setTimeout(r, 0));
    expect(screen.getByRole("list", { name: "Items" })).toBeInTheDocument();
    expect(screen.getByTestId("card-row")).toHaveTextContent("Alpha");
    expect(screen.queryByRole("grid")).not.toBeInTheDocument();
  });

  it("wide viewport, no stored key: renders the table, not the card list", async () => {
    stubMatchMedia(false);
    render(DataGrid, { props: baseProps({ card: cardSnippet }) });
    await new Promise((r) => setTimeout(r, 0));
    expect(screen.getByRole("grid")).toBeInTheDocument();
    expect(
      screen.queryByRole("list", { name: "Items" }),
    ).not.toBeInTheDocument();
  });

  it("clicking the Show as cards Switch swaps the layout and writes localStorage", async () => {
    stubMatchMedia(false);
    render(DataGrid, { props: baseProps({ card: cardSnippet }) });
    await new Promise((r) => setTimeout(r, 0));
    expect(screen.getByRole("grid")).toBeInTheDocument();

    await fireEvent.click(
      screen.getByRole("switch", { name: "Show as cards" }),
    );
    expect(localStorage.getItem("orakl-table-layout")).toBe("cards");
    expect(screen.getByRole("list", { name: "Items" })).toBeInTheDocument();
    expect(screen.queryByRole("grid")).not.toBeInTheDocument();

    await fireEvent.click(
      screen.getByRole("switch", { name: "Show as cards" }),
    );
    expect(localStorage.getItem("orakl-table-layout")).toBe("table");
    expect(screen.getByRole("grid")).toBeInTheDocument();
  });

  it("a stored cards value wins over a wide device default", async () => {
    stubMatchMedia(false);
    localStorage.setItem("orakl-table-layout", "cards");
    render(DataGrid, { props: baseProps({ card: cardSnippet }) });
    await new Promise((r) => setTimeout(r, 0));
    expect(screen.getByRole("list", { name: "Items" })).toBeInTheDocument();
    expect(screen.queryByRole("grid")).not.toBeInTheDocument();
  });

  it("a stored table value wins over a narrow device default", async () => {
    stubMatchMedia(true);
    localStorage.setItem("orakl-table-layout", "table");
    render(DataGrid, { props: baseProps({ card: cardSnippet }) });
    await new Promise((r) => setTimeout(r, 0));
    expect(screen.getByRole("grid")).toBeInTheDocument();
    expect(
      screen.queryByRole("list", { name: "Items" }),
    ).not.toBeInTheDocument();
  });

  it("Previous / Next call onPageChange, disable at the ends, and show the range", async () => {
    const onPageChange = vi.fn();
    const tenRows: Row[] = Array.from({ length: 10 }, (_, i) => ({
      id: String(i),
      label: `Row ${i}`,
    }));
    render(DataGrid, {
      props: baseProps({
        data: tenRows,
        page: 1,
        pageSize: 10,
        total: 25,
        onPageChange,
      }),
    });
    await new Promise((r) => setTimeout(r, 0));
    expect(screen.getByText("Showing 1–10 of 25")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Previous" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "Next" })).not.toBeDisabled();

    await fireEvent.click(screen.getByRole("button", { name: "Next" }));
    expect(onPageChange).toHaveBeenCalledWith(2);
  });

  it("disables Next on the last page", async () => {
    const onPageChange = vi.fn();
    render(DataGrid, {
      props: baseProps({ page: 3, pageSize: 10, total: 25, onPageChange }),
    });
    await new Promise((r) => setTimeout(r, 0));
    expect(screen.getByRole("button", { name: "Next" })).toBeDisabled();

    await fireEvent.click(screen.getByRole("button", { name: "Previous" }));
    expect(onPageChange).toHaveBeenCalledWith(2);
  });

  it("renders the empty message with role=status in the table layout", async () => {
    stubMatchMedia(false);
    render(DataGrid, {
      props: baseProps({ data: [], card: cardSnippet, empty: "Nothing here." }),
    });
    await new Promise((r) => setTimeout(r, 0));
    expect(screen.getByRole("status")).toHaveTextContent("Nothing here.");
    expect(screen.queryByRole("grid")).not.toBeInTheDocument();
  });

  it("renders the empty message with role=status in the card layout", async () => {
    stubMatchMedia(true);
    render(DataGrid, {
      props: baseProps({ data: [], card: cardSnippet, empty: "Nothing here." }),
    });
    await new Promise((r) => setTimeout(r, 0));
    expect(screen.getByRole("status")).toHaveTextContent("Nothing here.");
    expect(
      screen.queryByRole("list", { name: "Items" }),
    ).not.toBeInTheDocument();
  });

  it("empty first page: no Switch and no pager", async () => {
    stubMatchMedia(false);
    render(DataGrid, {
      props: baseProps({
        data: [],
        page: 1,
        card: cardSnippet,
        empty: "Nothing here.",
      }),
    });
    await new Promise((r) => setTimeout(r, 0));
    expect(screen.getByRole("status")).toHaveTextContent("Nothing here.");
    expect(screen.queryByRole("switch")).not.toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: "Previous" }),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: "Next" }),
    ).not.toBeInTheDocument();
  });

  it("empty page beyond the first: the pager stays so the viewer can get back", async () => {
    stubMatchMedia(false);
    render(DataGrid, {
      props: baseProps({
        data: [],
        page: 2,
        card: cardSnippet,
        empty: "Nothing here.",
      }),
    });
    await new Promise((r) => setTimeout(r, 0));
    expect(screen.getByRole("status")).toHaveTextContent("Nothing here.");
    expect(
      screen.getByRole("button", { name: "Previous" }),
    ).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Next" })).toBeInTheDocument();
  });

  it("empty first page, table mode: the message sits inside the sg-theme panel shell", async () => {
    stubMatchMedia(false);
    const { container } = render(DataGrid, {
      props: baseProps({ data: [], page: 1, empty: "Nothing here." }),
    });
    await new Promise((r) => setTimeout(r, 0));
    const status = screen.getByRole("status");
    const panel = container.querySelector(".sg-theme");
    expect(panel).not.toBeNull();
    expect(panel?.contains(status)).toBe(true);
  });

  it("populated grid: the toggle row and pager still render as before", async () => {
    stubMatchMedia(false);
    render(DataGrid, {
      props: baseProps({ card: cardSnippet }),
    });
    await new Promise((r) => setTimeout(r, 0));
    expect(
      screen.getByRole("switch", { name: "Show as cards" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Previous" }),
    ).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Next" })).toBeInTheDocument();
  });

  it("no card snippet: renders the table at a narrow viewport and shows no Switch", async () => {
    stubMatchMedia(true);
    render(DataGrid, { props: baseProps() });
    await new Promise((r) => setTimeout(r, 0));
    expect(screen.getByRole("grid")).toBeInTheDocument();
    expect(
      screen.queryByRole("list", { name: "Items" }),
    ).not.toBeInTheDocument();
    expect(screen.queryByRole("switch")).not.toBeInTheDocument();
  });

  it("card mode with cardDetails: a More control on each card reveals and hides the details", async () => {
    stubMatchMedia(true);
    const { container } = render(DataGrid, {
      props: baseProps({ card: cardSnippet, cardDetails: cardDetailsSnippet }),
    });
    await new Promise((r) => setTimeout(r, 0));

    const more = screen.getByText("More");
    expect(more).toBeInTheDocument();
    const disclosure = container.querySelector("details");
    expect(disclosure?.open).toBe(false);

    await fireEvent.click(more);
    expect(disclosure?.open).toBe(true);
    expect(screen.getByTestId("card-details")).toHaveTextContent(
      "Details for Alpha",
    );

    await fireEvent.click(more);
    expect(disclosure?.open).toBe(false);
  });

  it("cardDetails supplied: the disclosure renders inside the same card element as the card body, not as a sibling", async () => {
    stubMatchMedia(true);
    const { container } = render(DataGrid, {
      props: baseProps({ card: cardSnippet, cardDetails: cardDetailsSnippet }),
    });
    await new Promise((r) => setTimeout(r, 0));

    const cardRow = screen.getByTestId("card-row");
    const details = container.querySelector("details");
    expect(details).not.toBeNull();
    expect(cardRow.parentElement?.contains(details as Node)).toBe(true);
    const li = cardRow.closest("li");
    expect(li?.children.length).toBe(1);
  });

  it("cardDisclosureClass supplied: the disclosure's class list carries it, matching a gutter the card snippet reserves", async () => {
    stubMatchMedia(true);
    const { container } = render(DataGrid, {
      props: baseProps({
        card: cardSnippet,
        cardDetails: cardDetailsSnippet,
        cardDisclosureClass: "pl-10",
      }),
    });
    await new Promise((r) => setTimeout(r, 0));
    const details = container.querySelector("details");
    expect(details?.classList.contains("pl-10")).toBe(true);
  });

  it("no cardDisclosureClass (the other pages' shape): the disclosure gains no indentation class", async () => {
    stubMatchMedia(true);
    const { container } = render(DataGrid, {
      props: baseProps({ card: cardSnippet, cardDetails: cardDetailsSnippet }),
    });
    await new Promise((r) => setTimeout(r, 0));
    const details = container.querySelector("details");
    expect(details?.className).toBe("group mt-2 border-t border-border pt-2");
  });

  // @testing-library/svelte's render() flushSyncs right after mount, which
  // runs the `mounted = true` effect before assertions ever see the
  // pre-mount frame. These two cases mount via raw `svelte.mount` instead,
  // which renders synchronously but leaves effects unflushed, to inspect
  // the skeleton svelte itself renders before that effect fires.
  it("data.length === 1: the pre-mount skeleton renders 1 row, not 12", () => {
    stubMatchMedia(false);
    const target = document.createElement("div");
    document.body.appendChild(target);
    const component = mount(DataGrid, {
      target,
      props: baseProps({ data: DATA }),
    });
    const status = target.querySelector(
      '[role="status"][aria-label="Loading table"]',
    );
    expect(status).not.toBeNull();
    const rows = status?.querySelectorAll(":scope > div:not(:first-child)");
    expect(rows?.length).toBe(1);
    unmount(component);
  });

  it("the skeleton's column count follows columns.length", () => {
    stubMatchMedia(false);
    const target = document.createElement("div");
    document.body.appendChild(target);
    const component = mount(DataGrid, {
      target,
      props: baseProps({ columns: SORT_COLUMNS, data: SORT_DATA }),
    });
    const status = target.querySelector(
      '[role="status"][aria-label="Loading table"]',
    );
    const header = status?.firstElementChild;
    expect(header?.children.length).toBe(SORT_COLUMNS.length);
    unmount(component);
  });

  it("the card list carries role=list", async () => {
    stubMatchMedia(true);
    render(DataGrid, { props: baseProps({ card: cardSnippet }) });
    await new Promise((r) => setTimeout(r, 0));
    expect(screen.getByRole("list", { name: "Items" })).toHaveAttribute(
      "role",
      "list",
    );
  });

  it("card mode with a card snippet but no cardDetails: no More control is present", async () => {
    stubMatchMedia(true);
    render(DataGrid, { props: baseProps({ card: cardSnippet }) });
    await new Promise((r) => setTimeout(r, 0));
    expect(screen.queryByText("More")).not.toBeInTheDocument();
  });

  it("table mode: no More control is present", async () => {
    stubMatchMedia(false);
    render(DataGrid, {
      props: baseProps({ card: cardSnippet, cardDetails: cardDetailsSnippet }),
    });
    await new Promise((r) => setTimeout(r, 0));
    expect(screen.getByRole("grid")).toBeInTheDocument();
    expect(screen.queryByText("More")).not.toBeInTheDocument();
  });

  it("card mode, columns with sortable entries: a Sort by control lists the sortable headers", async () => {
    stubMatchMedia(true);
    render(DataGrid, {
      props: baseProps({
        data: SORT_DATA,
        columns: SORT_COLUMNS,
        card: sortCardSnippet,
        getRowId: (r: SortRow) => r.id,
      }),
    });
    await new Promise((r) => setTimeout(r, 0));
    const select = screen.getByRole("combobox", { name: "Sort by" });
    const options = Array.from(select.querySelectorAll("option")).map(
      (o) => o.textContent,
    );
    expect(options).toEqual(["Sort by…", "Name", "Score"]);
  });

  it("choosing a Sort by option reorders the rendered cards", async () => {
    stubMatchMedia(true);
    render(DataGrid, {
      props: baseProps({
        data: SORT_DATA,
        columns: SORT_COLUMNS,
        card: sortCardSnippet,
        getRowId: (r: SortRow) => r.id,
      }),
    });
    await new Promise((r) => setTimeout(r, 0));
    const select = screen.getByRole("combobox", { name: "Sort by" });

    let cards = screen.getAllByTestId("card-row");
    expect(cards.map((c) => c.textContent)).toEqual([
      "Charlie",
      "Alpha",
      "Bravo",
    ]);

    await fireEvent.change(select, { target: { value: "name" } });
    cards = screen.getAllByTestId("card-row");
    expect(cards.map((c) => c.textContent)).toEqual([
      "Alpha",
      "Bravo",
      "Charlie",
    ]);
  });

  it("sorting the cards leaves the data prop array untouched", async () => {
    stubMatchMedia(true);
    const source = [...SORT_DATA];
    render(DataGrid, {
      props: baseProps({
        data: source,
        columns: SORT_COLUMNS,
        card: sortCardSnippet,
        getRowId: (r: SortRow) => r.id,
        total: 3,
      }),
    });
    await new Promise((r) => setTimeout(r, 0));
    await fireEvent.change(screen.getByRole("combobox", { name: "Sort by" }), {
      target: { value: "name" },
    });
    expect(source.map((r) => r.name)).toEqual(["Charlie", "Alpha", "Bravo"]);
  });

  it("card mode, no column sortable: no Sort by control", async () => {
    stubMatchMedia(true);
    render(DataGrid, {
      props: baseProps({
        data: SORT_DATA,
        columns: NO_SORTABLE_COLUMNS,
        card: sortCardSnippet,
        getRowId: (r: SortRow) => r.id,
      }),
    });
    await new Promise((r) => setTimeout(r, 0));
    expect(
      screen.queryByRole("combobox", { name: "Sort by" }),
    ).not.toBeInTheDocument();
  });

  it("table mode: no Sort by control even when columns are sortable", async () => {
    stubMatchMedia(false);
    render(DataGrid, {
      props: baseProps({
        data: SORT_DATA,
        columns: SORT_COLUMNS,
        card: sortCardSnippet,
        getRowId: (r: SortRow) => r.id,
      }),
    });
    await new Promise((r) => setTimeout(r, 0));
    expect(screen.getByRole("grid")).toBeInTheDocument();
    expect(
      screen.queryByRole("combobox", { name: "Sort by" }),
    ).not.toBeInTheDocument();
  });

  it("card mode: a numeric column sorts 1, 2, 10 — not 1, 10, 2", async () => {
    stubMatchMedia(true);
    render(DataGrid, {
      props: baseProps({
        data: POWER_DATA,
        columns: POWER_COLUMNS,
        card: powerCardSnippet,
        getRowId: (r: PowerRow) => r.id,
      }),
    });
    await new Promise((r) => setTimeout(r, 0));
    await fireEvent.change(screen.getByRole("combobox", { name: "Sort by" }), {
      target: { value: "powerCount" },
    });
    const cards = screen.getAllByTestId("card-row");
    expect(cards.map((c) => c.textContent)).toEqual(["One", "Two", "Ten"]);
  });

  it("card mode: a blank (null) field sorts last, per docs/components.md", async () => {
    stubMatchMedia(true);
    render(DataGrid, {
      props: baseProps({
        data: NICKNAME_DATA,
        columns: NICKNAME_COLUMNS,
        card: nicknameCardSnippet,
        getRowId: (r: NicknameRow) => r.id,
      }),
    });
    await new Promise((r) => setTimeout(r, 0));
    await fireEvent.change(screen.getByRole("combobox", { name: "Sort by" }), {
      target: { value: "nickname" },
    });
    const cards = screen.getAllByTestId("card-row");
    expect(cards.map((c) => c.textContent)).toEqual([
      "Alpha",
      "Bravo",
      "blank",
    ]);
  });

  it("no total, hasMore true: the pager reads Page N and Next is enabled", async () => {
    render(DataGrid, {
      props: baseProps({ total: undefined, page: 2, hasMore: true }),
    });
    await new Promise((r) => setTimeout(r, 0));
    expect(screen.getByText("Page 2")).toBeInTheDocument();
    expect(screen.queryByText(/Showing/)).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Next" })).not.toBeDisabled();
  });

  it("no total, hasMore false: Next is disabled", async () => {
    render(DataGrid, {
      props: baseProps({ total: undefined, page: 2, hasMore: false }),
    });
    await new Promise((r) => setTimeout(r, 0));
    expect(screen.getByRole("button", { name: "Next" })).toBeDisabled();
  });

  it("no total, no hasMore: Next is disabled", async () => {
    render(DataGrid, {
      props: baseProps({ total: undefined, page: 2 }),
    });
    await new Promise((r) => setTimeout(r, 0));
    expect(screen.getByRole("button", { name: "Next" })).toBeDisabled();
  });

  it("total given: the range text still renders unchanged", async () => {
    render(DataGrid, {
      props: baseProps({ page: 1, pageSize: 10, total: 25 }),
    });
    await new Promise((r) => setTimeout(r, 0));
    expect(screen.getByText(/Showing 1–1 of 25/)).toBeInTheDocument();
  });

  it("busy: true disables both Previous and Next mid-range", async () => {
    render(DataGrid, {
      props: baseProps({ page: 2, pageSize: 10, total: 50, busy: true }),
    });
    await new Promise((r) => setTimeout(r, 0));
    expect(screen.getByRole("button", { name: "Previous" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "Next" })).toBeDisabled();
  });

  it("cardHeader supplied, card mode: it renders", async () => {
    stubMatchMedia(true);
    render(DataGrid, {
      props: baseProps({ card: cardSnippet, cardHeader: cardHeaderSnippet }),
    });
    await new Promise((r) => setTimeout(r, 0));
    expect(screen.getByTestId("card-header")).toBeInTheDocument();
  });

  it("cardHeader supplied, table mode: it does not render (the table has its own header cell)", async () => {
    stubMatchMedia(false);
    render(DataGrid, {
      props: baseProps({ card: cardSnippet, cardHeader: cardHeaderSnippet }),
    });
    await new Promise((r) => setTimeout(r, 0));
    expect(screen.getByRole("grid")).toBeInTheDocument();
    expect(screen.queryByTestId("card-header")).not.toBeInTheDocument();
  });

  it("no cardHeader: the toggle row renders exactly as before", async () => {
    stubMatchMedia(true);
    render(DataGrid, { props: baseProps({ card: cardSnippet }) });
    await new Promise((r) => setTimeout(r, 0));
    expect(
      screen.getByRole("switch", { name: "Show as cards" }),
    ).toBeInTheDocument();
    expect(screen.queryByTestId("card-header")).not.toBeInTheDocument();
  });

  it("cardHeader supplied but data: [] on page 1: nothing renders (the toggle row is already suppressed)", async () => {
    stubMatchMedia(true);
    render(DataGrid, {
      props: baseProps({
        data: [],
        page: 1,
        card: cardSnippet,
        cardHeader: cardHeaderSnippet,
        empty: "Nothing here.",
      }),
    });
    await new Promise((r) => setTimeout(r, 0));
    expect(screen.getByRole("status")).toHaveTextContent("Nothing here.");
    expect(screen.queryByTestId("card-header")).not.toBeInTheDocument();
  });
});
