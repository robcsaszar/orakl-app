import { render, screen } from "@testing-library/svelte";
import { describe, expect, it } from "vitest";
import Progress from "../../src/lib/components/ui/Progress.svelte";

function fillOf(container: HTMLElement) {
  return container.querySelector("[aria-hidden='true']") as HTMLElement;
}

describe("Progress", () => {
  it("exposes a labelled progressbar with the value", () => {
    render(Progress, { props: { value: 75, label: "Import progress" } });
    const bar = screen.getByRole("progressbar", { name: "Import progress" });
    expect(bar).toHaveAttribute("aria-valuemin", "0");
    expect(bar).toHaveAttribute("aria-valuemax", "100");
    expect(bar).toHaveAttribute("aria-valuenow", "75");
  });

  it("fills by scaling on the x axis, never by width", () => {
    const { container } = render(Progress, {
      props: { value: 75, label: "p" },
    });
    const fill = fillOf(container);
    expect(fill.style.transform).toBe("scaleX(0.75)");
    expect(fill.style.width).toBe("");
    expect(fill.className).toContain("origin-left");
  });

  it("clamps to the 0–100 range", () => {
    const { container: over } = render(Progress, {
      props: { value: 140, label: "p" },
    });
    expect(fillOf(over).style.transform).toBe("scaleX(1)");
    expect(screen.getAllByRole("progressbar")[0]).toHaveAttribute(
      "aria-valuenow",
      "100",
    );
    const { container: under } = render(Progress, {
      props: { value: -5, label: "q" },
    });
    expect(fillOf(under).style.transform).toBe("scaleX(0)");
  });

  it("accepts a bar class for a different fill colour", () => {
    const { container } = render(Progress, {
      props: { value: 50, label: "p", barClass: "bg-primary" },
    });
    expect(fillOf(container).className).toContain("bg-primary");
    expect(fillOf(container).className).not.toContain("bg-secondary ");
  });
});
