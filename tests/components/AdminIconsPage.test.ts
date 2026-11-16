import { render, screen, waitFor, within } from "@testing-library/svelte";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("$app/state", () => ({
  page: {
    data: {},
    url: new URL("http://localhost/admin/icons"),
  },
}));
vi.mock("$app/navigation", () => ({
  beforeNavigate: vi.fn(),
  invalidateAll: vi.fn(),
}));
vi.mock("$lib/toast", () => ({
  toast: { error: vi.fn(), warning: vi.fn(), success: vi.fn() },
}));

import { ICON_SCALE, ROLES } from "$lib/icons";
import Page from "../../src/routes/(app)/admin/icons/+page.svelte";

const data = { drafts: {}, styles: {}, scale: null, outOfStep: [] };
const controlRoles = Object.entries(ROLES)
  .filter(([, role]) => role.tier === "control")
  .map(([name]) => name);

const mdPx = () =>
  screen.getByLabelText("md px", {
    selector: "#scale-control-md-px",
  }) as HTMLInputElement;

beforeEach(() => {
  vi.stubGlobal("fetch", vi.fn());
  // The vm-context structuredClone returns objects Svelte does not proxy, so edits to the clone would not re-render.
  vi.stubGlobal("structuredClone", (value: unknown) =>
    JSON.parse(JSON.stringify(value)),
  );
});
afterEach(() => {
  vi.unstubAllGlobals();
});

describe("admin icons page", () => {
  it("keeps the last valid px when a field is cleared", async () => {
    const user = userEvent.setup();
    render(Page, { data } as never);
    const valid = ICON_SCALE.control.md.px + 1;
    await user.clear(mdPx());
    await user.type(mdPx(), String(valid));
    await user.clear(mdPx());
    const defaults = screen.getAllByText(`Default ${ICON_SCALE.control.md.px}`);
    expect(defaults).toHaveLength(1);
    expect(
      (screen.getByRole("button", { name: "Save draft" }) as HTMLButtonElement)
        .disabled,
    ).toBe(false);
  });

  it("ignores out-of-range px", async () => {
    const user = userEvent.setup();
    render(Page, { data } as never);
    for (const bad of ["7", "999"]) {
      await user.clear(mdPx());
      await user.click(mdPx());
      await user.paste(bad);
      expect(
        screen.queryByText(`Default ${ICON_SCALE.control.md.px}`),
      ).toBeNull();
    }
    expect(
      (screen.getByRole("button", { name: "Save draft" }) as HTMLButtonElement)
        .disabled,
    ).toBe(true);
  });

  it("enables Save draft only after a valid scale change", async () => {
    const user = userEvent.setup();
    render(Page, { data } as never);
    const save = screen.getByRole("button", {
      name: "Save draft",
    }) as HTMLButtonElement;
    expect(save.disabled).toBe(true);
    await user.clear(mdPx());
    await user.type(mdPx(), String(ICON_SCALE.control.md.px + 1));
    expect(save.disabled).toBe(false);
  });

  it("shows No roles match in every emptied group", async () => {
    const user = userEvent.setup();
    render(Page, { data } as never);
    await user.type(screen.getByLabelText("Search roles"), "zzzz-no-such-role");
    expect(screen.getAllByText("No roles match")).toHaveLength(4);
  });

  it("shows No icons match for an empty Solar result", async () => {
    const user = userEvent.setup();
    vi.mocked(fetch).mockResolvedValue({
      ok: true,
      json: async () => ({ icons: [] }),
    } as Response);
    render(Page, { data } as never);
    await user.click(screen.getAllByRole("button", { name: "Change" })[0]);
    await user.type(screen.getByLabelText("Search Solar icons"), "x");
    expect(await screen.findByText("No icons match")).toBeTruthy();
  });

  it("does not throw on a failed Solar search", async () => {
    const user = userEvent.setup();
    vi.mocked(fetch).mockResolvedValue({ ok: false, status: 500 } as Response);
    const { toast } = await import("$lib/toast");
    render(Page, { data } as never);
    await user.click(screen.getAllByRole("button", { name: "Change" })[0]);
    await user.type(screen.getByLabelText("Search Solar icons"), "x");
    await waitFor(() => expect(toast.error).toHaveBeenCalled());
    expect(screen.queryByText("No icons match")).toBeNull();
  });

  it("lists every control role once in Controls", () => {
    render(Page, { data } as never);
    const group = screen.getByRole("region", { name: "Controls" });
    const names = within(group)
      .getAllByRole("listitem")
      .map((li) => li.querySelector(".font-mono")?.textContent?.trim());
    expect(names.sort()).toEqual([...controlRoles].sort());
  });
});
