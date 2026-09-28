import { render, screen } from "@testing-library/svelte";
import { describe, expect, it, vi } from "vitest";
import CreateQuiz from "../../src/routes/(game)/curator/create/CreateQuiz.svelte";

vi.mock("../../src/lib/toast.js", () => ({
  toast: { success: vi.fn(), error: vi.fn() },
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
