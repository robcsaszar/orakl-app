import { render, screen } from "@testing-library/svelte";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import DifficultySelector from "$lib/components/quiz-setup/DifficultySelector.svelte";

function setup(value = "all") {
  return render(DifficultySelector, { props: { value } });
}

describe("DifficultySelector", () => {
  it("renders all four difficulty options", () => {
    setup();
    expect(
      screen.getByRole("radio", { name: /all difficulties/i }),
    ).toBeInTheDocument();
    expect(screen.getByRole("radio", { name: /easy/i })).toBeInTheDocument();
    expect(screen.getByRole("radio", { name: /medium/i })).toBeInTheDocument();
    expect(screen.getByRole("radio", { name: /hard/i })).toBeInTheDocument();
  });

  it("defaults to 'all' selected", () => {
    setup();
    expect(
      screen.getByRole("radio", { name: /all difficulties/i }),
    ).toBeChecked();
  });

  it("respects an explicit starting value", () => {
    setup("medium");
    expect(screen.getByRole("radio", { name: /medium/i })).toBeChecked();
    expect(
      screen.getByRole("radio", { name: /all difficulties/i }),
    ).not.toBeChecked();
  });

  it("clicking another option selects it exclusively", async () => {
    const user = userEvent.setup();
    setup("all");
    await user.click(screen.getByRole("radio", { name: /hard/i }));
    expect(screen.getByRole("radio", { name: /hard/i })).toBeChecked();
    expect(
      screen.getByRole("radio", { name: /all difficulties/i }),
    ).not.toBeChecked();
  });

  it("renders inside a radiogroup", () => {
    setup();
    expect(screen.getByRole("radiogroup")).toBeInTheDocument();
  });
});
