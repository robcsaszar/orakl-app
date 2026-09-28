import { fireEvent, render, screen } from "@testing-library/svelte";
import { describe, expect, it } from "vitest";
import Slider from "../../src/lib/components/ui/Slider.svelte";

describe("Slider", () => {
  it("renders a slider named by its label with min, max and value", () => {
    render(Slider, {
      props: {
        id: "n",
        label: "Players",
        name: "n",
        min: 1,
        max: 20,
        value: 8,
      },
    });
    const slider = screen.getByRole("slider", {
      name: "Players",
    }) as HTMLInputElement;
    expect(slider).toHaveAttribute("min", "1");
    expect(slider).toHaveAttribute("max", "20");
    expect(slider.value).toBe("8");
  });

  it("shows the current value beside the label and updates on input", async () => {
    render(Slider, {
      props: {
        id: "n",
        label: "Players",
        name: "n",
        min: 1,
        max: 20,
        value: 8,
      },
    });
    expect(screen.getByText("8")).toBeInTheDocument();
    await fireEvent.input(screen.getByRole("slider"), {
      target: { value: "12" },
    });
    expect(screen.getByText("12")).toBeInTheDocument();
  });

  it("formats the shown value when a formatter is given", () => {
    render(Slider, {
      props: {
        id: "t",
        label: "Timer",
        name: "t",
        value: 30,
        format: (v: number) => `${v}s`,
      },
    });
    expect(screen.getByText("30s")).toBeInTheDocument();
  });

  it("hideLabel keeps the label for assistive tech only", () => {
    render(Slider, {
      props: {
        id: "n",
        label: "Players",
        name: "n",
        value: 3,
        hideLabel: true,
      },
    });
    expect(screen.getByRole("slider", { name: "Players" })).toBeInTheDocument();
    expect(screen.getByText("Players").className).toContain("sr-only");
  });

  it("size=sm shrinks the track and label", () => {
    render(Slider, {
      props: { id: "n", label: "Players", name: "n", value: 3, size: "sm" },
    });
    expect(screen.getByRole("slider").className).toContain("h-1.5");
    expect(screen.getByText("Players").parentElement?.className).toContain(
      "text-xs",
    );
  });

  it("styles on semantic tokens only", () => {
    render(Slider, {
      props: { id: "n", label: "Players", name: "n", value: 3 },
    });
    expect(screen.getByRole("slider").className).not.toMatch(
      /\b(bg|text|border)-(gray|violet|amber)-\d/,
    );
  });
});
