import { fireEvent, render, screen, waitFor } from "@testing-library/svelte";
import { afterEach, describe, expect, it, vi } from "vitest";
import CreateQuiz from "../../src/routes/(game)/curator/create/CreateQuiz.svelte";

vi.mock("$app/navigation", () => ({ goto: vi.fn() }));
vi.mock("../../src/lib/toast.js", () => ({
  toast: { success: vi.fn(), error: vi.fn(), warning: vi.fn() },
}));
const power = vi.hoisted(() => ({ on: false }));
vi.mock("../../src/lib/svelte/powerUser.svelte.js", () => ({
  isPowerUser: () => power.on,
}));

const categories = [{ id: "general", name: "General", count: 40 }];

const preset = (n: number) => ({
  id: `p${n}`,
  name: `Preset ${n}`,
  description: null,
  category_ids: JSON.stringify(["general"]),
  timer_duration: 30,
  questions_per_round: 10,
  difficulty: "all",
  advance_mode: "auto_5",
  scoring_mode: null,
  access_mode: "open",
  max_players: null,
});

const renderWith = (count: number, limit = 10) =>
  render(CreateQuiz, {
    props: {
      categories,
      categoryColors: {},
      presets: Array.from({ length: count }, (_, i) => preset(i + 1)),
      presetLimit: limit,
      quizPresets: true,
    } as never,
  });

describe("saved-preset count on the create page", () => {
  afterEach(() => {
    power.on = false;
    vi.unstubAllGlobals();
  });

  it("is visible to a power user", () => {
    power.on = true;
    renderWith(2);
    const count = screen.getByText("2/10 saved");
    expect(count.closest(".sr-only")).toBeNull();
  });

  it("follows a delete and frees the save box at the limit", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => new Response(null, { status: 204 })),
    );
    renderWith(3, 3);
    const box = screen.getByLabelText(/^Save as preset/) as HTMLInputElement;
    expect(screen.getByText("3/3 saved")).toBeTruthy();
    expect(box.disabled).toBe(true);

    const del = screen.getByRole("button", { name: "Delete Preset 1" });
    await fireEvent.click(del);
    await fireEvent.click(del);

    await waitFor(() => expect(screen.getByText("2/3 saved")).toBeTruthy());
    expect(box.disabled).toBe(false);
  });

  it("asks before deleting: one click deletes nothing", async () => {
    const fetchMock = vi.fn(async () => new Response(null, { status: 204 }));
    vi.stubGlobal("fetch", fetchMock);
    renderWith(2);

    await fireEvent.click(
      screen.getByRole("button", { name: "Delete Preset 1" }),
    );

    expect(screen.getByText("Delete preset?")).toBeTruthy();
    expect(fetchMock).not.toHaveBeenCalled();
    expect(screen.getByText("2/10 saved")).toBeTruthy();
  });
});
