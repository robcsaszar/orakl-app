import { cleanup, render, screen } from "@testing-library/svelte";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import AdminEmotesPage from "../../src/routes/(app)/admin/emotes/+page.svelte";

vi.mock("$app/navigation", () => ({ invalidate: vi.fn() }));
vi.mock("$lib/toast", () => ({
  toast: { success: vi.fn(), error: vi.fn(), info: vi.fn() },
}));

const emote = (id: string, title: string, sortOrder: number) => ({
  id,
  title,
  description: "",
  src: `/emotes/${id}.webp`,
  stillSrc: `/emotes/${id}.webp`,
  sortOrder,
  retired: false,
});

function data(titles: { heart: string; laugh: string }) {
  return {
    packs: [
      {
        id: "classic",
        title: "Classic",
        description: "",
        sortOrder: 0,
        isDefault: true,
        emotes: [
          emote("heart", titles.heart, 0),
          emote("laugh", titles.laugh, 1),
        ],
      },
    ],
  } as never;
}

let fetchMock: ReturnType<typeof vi.fn>;
beforeEach(() => {
  fetchMock = vi.fn(async () => ({ ok: true, json: async () => ({}) }));
  global.fetch = fetchMock as never;
});
afterEach(cleanup);

describe("/admin/emotes page", () => {
  it("Move down sends only the order, not the row's form", async () => {
    render(AdminEmotesPage, { data: data({ heart: "Heart", laugh: "Laugh" }) });
    await userEvent.click(
      screen.getByRole("button", { name: "Move down: Heart" }),
    );
    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [path, init] = fetchMock.mock.calls[0];
    expect(path).toBe("/api/admin/emotes/packs/classic/order");
    expect(init.method).toBe("PUT");
  });

  it("an upload refused by the schema toasts the named reason", async () => {
    const { toast } = await import("$lib/toast");
    fetchMock.mockResolvedValueOnce({
      ok: false,
      json: async () => ({
        error: "Validation failed",
        reason: "file: File must be 2 MB or smaller",
      }),
    });
    render(AdminEmotesPage, { data: data({ heart: "Heart", laugh: "Laugh" }) });
    await userEvent.upload(
      screen.getByLabelText(/^Choose an image/),
      new File(["x"], "big.png", { type: "image/png" }),
    );
    await userEvent.type(
      document.getElementById("upload-emote-title") as HTMLElement,
      "Wave",
    );
    await userEvent.click(screen.getByRole("button", { name: /^Upload/ }));
    expect(toast.error).toHaveBeenCalledWith(
      "file: File must be 2 MB or smaller",
    );
  });

  it("the upload hint names the accepted formats", () => {
    render(AdminEmotesPage, { data: data({ heart: "Heart", laugh: "Laugh" }) });
    expect(
      screen.getByText(
        "PNG or WebP still; animated WebP or GIF. Up to 2 MB, 60 frames.",
      ),
    ).toBeInTheDocument();
  });

  it("the upload button reads Uploading… while the request is pending", async () => {
    let finish: (v: unknown) => void = () => {};
    fetchMock.mockReturnValueOnce(new Promise((r) => (finish = r)));
    render(AdminEmotesPage, { data: data({ heart: "Heart", laugh: "Laugh" }) });
    await userEvent.upload(
      screen.getByLabelText(/^Choose an image/),
      new File(["x"], "a.png", { type: "image/png" }),
    );
    await userEvent.click(screen.getByRole("button", { name: "Upload emote" }));
    expect(
      await screen.findByRole("button", { name: "Uploading…" }),
    ).toBeDisabled();
    finish({ ok: true, json: async () => ({}) });
  });

  it("the default pack says it cannot be deleted", () => {
    render(AdminEmotesPage, { data: data({ heart: "Heart", laugh: "Laugh" }) });
    expect(
      screen.getByText("The default pack cannot be deleted."),
    ).toBeInTheDocument();
  });

  it("new data after one row's save keeps another row's unsaved edit", async () => {
    const { rerender } = render(AdminEmotesPage, {
      data: data({ heart: "Heart", laugh: "Laugh" }),
    });
    const laugh = screen.getByLabelText("Title of Laugh");
    await userEvent.clear(laugh);
    await userEvent.type(laugh, "Giggle");

    // Heart was saved elsewhere; the reload brings its new title.
    await rerender({ data: data({ heart: "Hearty", laugh: "Laugh" }) });

    expect(screen.getByLabelText("Title of Laugh")).toHaveValue("Giggle");
    expect(screen.getByLabelText("Title of Hearty")).toHaveValue("Hearty");
  });
});
