import { render, screen } from "@testing-library/svelte";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import ManageAvatars from "../../src/routes/(app)/manage/avatars/ManageAvatars.svelte";

function makeAvatar(overrides: Record<string, unknown> = {}) {
  return {
    id: "adder",
    title: "Adder",
    description: "",
    category: "beasts",
    src: "/img/adder.png",
    ...overrides,
  };
}

function renderGrid(avatars = [makeAvatar()]) {
  return render(ManageAvatars, {
    props: {
      sortedGroups: [["beasts", avatars]],
      categories: ["beasts"],
    },
  });
}

describe("ManageAvatars", () => {
  beforeEach(() => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({ ok: true, json: async () => ({}) }),
    );
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("renders the placeholder for an avatar with empty description", () => {
    renderGrid();
    expect(
      screen.getByText("There's no description for this avatar yet."),
    ).toBeInTheDocument();
  });

  it("clicking a card opens the editor and focuses the title input", async () => {
    const user = userEvent.setup();
    renderGrid();
    await user.click(screen.getByRole("button", { name: "Edit Adder" }));
    expect(screen.getByLabelText("Title")).toBeInTheDocument();
    expect(screen.getByLabelText("Category (optional)")).toBeInTheDocument();
    expect(screen.getByLabelText("Description (optional)")).toBeInTheDocument();
    expect(screen.getByLabelText("Title")).toBe(document.activeElement);
  });

  it("shows visible labels for title, category, and description", async () => {
    const user = userEvent.setup();
    renderGrid();
    await user.click(screen.getByRole("button", { name: "Edit Adder" }));
    expect(screen.getByText("Title")).toBeInTheDocument();
    expect(screen.getByText("Category (optional)")).toBeInTheDocument();
    expect(screen.getByText("Description (optional)")).toBeInTheDocument();
  });

  it("save persists edits via PUT and returns to view mode with new values", async () => {
    const user = userEvent.setup();
    renderGrid();
    await user.click(screen.getByRole("button", { name: "Edit Adder" }));

    const titleInput = screen.getByLabelText("Title");
    await user.clear(titleInput);
    await user.type(titleInput, "Viper");
    const descInput = screen.getByLabelText("Description (optional)");
    await user.clear(descInput);
    await user.type(descInput, "A sneaky snake");
    const catInput = screen.getByLabelText("Category (optional)");
    await user.clear(catInput);
    await user.type(catInput, "reptiles");

    await user.click(screen.getByRole("button", { name: "Save" }));

    expect(fetch).toHaveBeenCalledWith(
      "/api/avatars",
      expect.objectContaining({
        method: "PUT",
        body: JSON.stringify({
          id: "adder",
          title: "Viper",
          description: "A sneaky snake",
          category: "reptiles",
        }),
      }),
    );

    expect(await screen.findByText("Viper")).toBeInTheDocument();
    expect(screen.getByText("A sneaky snake")).toBeInTheDocument();
    expect(await screen.findByRole("button", { name: "Edit Viper" })).toBe(
      document.activeElement,
    );
  });

  it("a failed save keeps the editor open and the saved snapshot intact", async () => {
    vi.mocked(fetch).mockResolvedValueOnce({
      ok: false,
      json: async () => ({}),
    } as Response);
    const user = userEvent.setup();
    renderGrid();
    await user.click(screen.getByRole("button", { name: "Edit Adder" }));
    const titleInput = screen.getByLabelText("Title");
    await user.clear(titleInput);
    await user.type(titleInput, "Viper");
    await user.click(screen.getByRole("button", { name: "Save" }));
    expect(screen.getByLabelText("Title")).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Cancel" }));
    expect(
      screen.getByRole("button", { name: "Edit Adder" }),
    ).toBeInTheDocument();
  });

  it("cancel returns to view mode with values unchanged and focuses the card button", async () => {
    const user = userEvent.setup();
    renderGrid();
    await user.click(screen.getByRole("button", { name: "Edit Adder" }));

    const titleInput = screen.getByLabelText("Title");
    await user.clear(titleInput);
    await user.type(titleInput, "Should not save");

    await user.click(screen.getByRole("button", { name: "Cancel" }));

    expect(screen.getByText("Adder")).toBeInTheDocument();
    expect(screen.queryByText("Should not save")).not.toBeInTheDocument();
    expect(fetch).not.toHaveBeenCalled();
    expect(screen.getByRole("button", { name: "Edit Adder" })).toBe(
      document.activeElement,
    );
  });

  it("Escape while a save is in flight does nothing", async () => {
    let resolveSave: (r: Response) => void = () => {};
    vi.mocked(fetch).mockReturnValueOnce(
      new Promise<Response>((r) => {
        resolveSave = r;
      }),
    );
    const user = userEvent.setup();
    renderGrid();
    await user.click(screen.getByRole("button", { name: "Edit Adder" }));
    const titleInput = screen.getByLabelText("Title");
    await user.clear(titleInput);
    await user.type(titleInput, "Viper");
    await user.click(screen.getByRole("button", { name: "Save" }));
    await user.click(screen.getByLabelText("Title"));
    await user.keyboard("{Escape}");
    expect(screen.getByLabelText("Title")).toHaveValue("Viper");
    resolveSave({ ok: true, json: async () => ({}) } as Response);
    expect(
      await screen.findByRole("button", { name: "Edit Viper" }),
    ).toBeInTheDocument();
  });

  it("Escape in the title input cancels and closes the editor", async () => {
    const user = userEvent.setup();
    renderGrid();
    await user.click(screen.getByRole("button", { name: "Edit Adder" }));

    const titleInput = screen.getByLabelText("Title");
    await user.type(titleInput, "{Escape}");

    expect(screen.queryByLabelText("Title")).not.toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Edit Adder" }),
    ).toBeInTheDocument();
  });
});
