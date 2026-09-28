import { fireEvent, render, screen } from "@testing-library/svelte";
import { describe, expect, it } from "vitest";
import Switch from "../../src/lib/components/ui/Switch.svelte";

describe("Switch", () => {
  it("exposes itself as a switch carrying its label and state", () => {
    render(Switch, { props: { label: "Feedback widget", checked: true } });
    const control = screen.getByRole("switch", { name: "Feedback widget" });
    expect(control.getAttribute("aria-checked")).toBe("true");
  });

  it("reports the state it is being moved to, not the one it holds", async () => {
    const seen: boolean[] = [];
    render(Switch, {
      props: {
        label: "Feedback widget",
        checked: false,
        onchange: (next: boolean) => seen.push(next),
      },
    });
    await fireEvent.click(screen.getByRole("switch"));
    expect(seen).toEqual([true]);
  });

  it("stays put while disabled", async () => {
    const seen: boolean[] = [];
    render(Switch, {
      props: {
        label: "Feedback widget",
        checked: false,
        disabled: true,
        onchange: (next: boolean) => seen.push(next),
      },
    });
    const control = screen.getByRole("switch");
    await fireEvent.click(control);
    expect(seen).toEqual([]);
    expect((control as HTMLButtonElement).disabled).toBe(true);
  });

  it("is a real button, so the platform gives it keyboard operation", () => {
    render(Switch, { props: { label: "Feedback widget" } });
    expect(screen.getByRole("switch").tagName).toBe("BUTTON");
  });
});
