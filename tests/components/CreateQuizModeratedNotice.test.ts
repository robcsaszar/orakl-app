import { render, waitFor } from "@testing-library/svelte";
import { afterEach, describe, expect, it, vi } from "vitest";
import CreateQuiz from "../../src/routes/(game)/curator/create/CreateQuiz.svelte";

vi.mock("$app/navigation", () => ({ goto: vi.fn() }));
vi.mock("../../src/lib/toast.js", () => ({
  toast: { success: vi.fn(), error: vi.fn(), warning: vi.fn(), info: vi.fn() },
}));

import { toast } from "../../src/lib/toast.js";

const renderPage = () =>
  render(CreateQuiz, {
    props: {
      categories: [{ id: "general", name: "General", count: 40 }],
      categoryColors: {},
      presets: [],
      presetLimit: 10,
      quizPresets: true,
    } as never,
  });

const stubLobby = (body: unknown) => {
  const fetchMock = vi.fn(async () => Response.json(body));
  vi.stubGlobal("fetch", fetchMock);
  return fetchMock;
};

describe("create page — Admin close notice", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.clearAllMocks();
  });

  it("says Orakl closed the lobby when the probe carries reason moderated", async () => {
    const fetchMock = stubLobby({ active: false, reason: "moderated" });
    renderPage();
    await waitFor(() =>
      expect(toast.info).toHaveBeenCalledWith(
        "Orakl closed your lobby. Nothing from this session was saved.",
        expect.objectContaining({ id: "lobby-moderated" }),
      ),
    );
    expect(fetchMock).toHaveBeenCalledWith("/api/lobby");
  });

  it("says nothing without that reason", async () => {
    const fetchMock = stubLobby({ active: false });
    renderPage();
    await waitFor(() => expect(fetchMock).toHaveBeenCalled());
    await Promise.resolve();
    expect(toast.info).not.toHaveBeenCalled();
  });
});
