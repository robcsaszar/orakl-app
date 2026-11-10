import { fireEvent, render, screen, waitFor } from "@testing-library/svelte";
import { afterEach, describe, expect, it, vi } from "vitest";
import { GAME } from "../../data/game.settings.js";
import { storage } from "../../src/lib/storage.js";
import CreateQuiz from "../../src/routes/(game)/curator/create/CreateQuiz.svelte";

vi.mock("../../src/lib/toast.js", () => ({
  toast: { success: vi.fn(), error: vi.fn(), warning: vi.fn() },
}));

const categories = [{ id: "general", name: "General", count: 40 }];

const renderForm = (flags: Record<string, boolean>) =>
  render(CreateQuiz, {
    props: {
      categories,
      categoryColors: {},
      presets: [],
      presetLimit: 10,
      scoringModes: false,
      accessModes: false,
      maxPlayers: false,
      quizPresets: false,
      ...flags,
    } as never,
  });

describe("create form offers only the options that are released", () => {
  it("drops every gated control while its flag is off", () => {
    renderForm({});
    expect(screen.queryByText("Scoring")).toBeNull();
    expect(screen.queryByText("Access")).toBeNull();
    expect(screen.queryByLabelText(/max players/i)).toBeNull();
    expect(screen.queryByText("Saved quizzes")).toBeNull();
    expect(screen.queryByLabelText(/^Save as preset/)).toBeNull();
  });

  it("offers the scoring picker once its flag is on", () => {
    renderForm({ scoringModes: true });
    expect(screen.getByText("Scoring")).toBeTruthy();
    expect(screen.queryByText("Access")).toBeNull();
  });

  it("offers the access picker once its flag is on", () => {
    renderForm({ accessModes: true });
    expect(screen.getByText("Access")).toBeTruthy();
  });

  it("offers the max-players field once its flag is on", () => {
    renderForm({ maxPlayers: true });
    expect(screen.getByLabelText(/max players/i)).toBeTruthy();
  });

  it("offers saving once the presets flag is on", () => {
    renderForm({ quizPresets: true });
    expect(screen.getByLabelText(/^Save as preset/)).toBeTruthy();
  });
});

describe("create form — players may change an answer", () => {
  afterEach(() => storage.removeQuizConfig());

  it("offers the option, off by default, described from the undo budget", () => {
    renderForm({});
    const box = screen.getByLabelText(
      "Players may change an answer",
    ) as HTMLInputElement;
    expect(box.checked).toBe(false);
    expect(
      screen.getByText(
        new RegExp(`up to ${GAME.undo.budgetFraction * 100}% of the questions`),
      ),
    ).toBeInTheDocument();
  });

  it("restores the choice from the stored quiz config", async () => {
    storage.setQuizConfig(
      JSON.stringify({
        name: "Pub night",
        categoryIds: ["general"],
        undoEnabled: true,
      }),
    );
    renderForm({});
    const box = screen.getByLabelText(
      "Players may change an answer",
    ) as HTMLInputElement;
    await waitFor(() => expect(box.checked).toBe(true));
  });

  it("applies the choice from a saved quiz with undo_enabled 1", async () => {
    renderForm({
      quizPresets: true,
      presets: [
        {
          id: "p1",
          curator_id: "c1",
          name: "Undo night",
          description: null,
          category_ids: '["general"]',
          season_ids: "[]",
          timer_duration: 30,
          questions_per_round: 10,
          difficulty: "all",
          advance_mode: "auto_5",
          scoring_mode: "classic",
          access_mode: "open",
          max_players: null,
          undo_enabled: 1,
          created_at: "2026-01-01",
        },
      ] as never,
    });
    const box = screen.getByLabelText(
      "Players may change an answer",
    ) as HTMLInputElement;
    expect(box.checked).toBe(false);
    await fireEvent.click(
      screen.getByRole("button", { name: "Apply Undo night" }),
    );
    expect(box.checked).toBe(true);
  });
});
