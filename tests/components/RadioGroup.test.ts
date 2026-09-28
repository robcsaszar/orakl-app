import { render, screen } from "@testing-library/svelte";
import userEvent from "@testing-library/user-event";
import { createRawSnippet } from "svelte";
import { describe, expect, it, vi } from "vitest";
import RadioGroup from "../../src/lib/components/ui/RadioGroup.svelte";

const options = ["alpha", "beta", "gamma"] as const;

function makeLabel() {
  return createRawSnippet<[string]>((opt) => ({
    render: () => `<span>${opt()}</span>`,
  }));
}

function setup(
  selected = "alpha",
  onchange?: () => void,
  extra: Record<string, unknown> = {},
) {
  return render(RadioGroup, {
    props: {
      options,
      selected,
      name: "test-group",
      legend: "Pick one",
      optionLabel: makeLabel(),
      onchange,
      ...extra,
    },
  });
}

describe("RadioGroup", () => {
  it("renders all options", () => {
    setup();
    expect(screen.getByRole("radio", { name: /alpha/i })).toBeInTheDocument();
    expect(screen.getByRole("radio", { name: /beta/i })).toBeInTheDocument();
    expect(screen.getByRole("radio", { name: /gamma/i })).toBeInTheDocument();
  });

  it("legend text is visible", () => {
    setup();
    expect(screen.getByText("Pick one")).toBeInTheDocument();
  });

  it("initially selected option is checked", () => {
    setup("beta");
    expect(screen.getByRole("radio", { name: /beta/i })).toBeChecked();
    expect(screen.getByRole("radio", { name: /alpha/i })).not.toBeChecked();
  });

  it("clicking an option checks it", async () => {
    const user = userEvent.setup();
    setup();
    await user.click(screen.getByRole("radio", { name: /gamma/i }));
    expect(screen.getByRole("radio", { name: /gamma/i })).toBeChecked();
  });

  it("only one option checked at a time (single-select)", async () => {
    const user = userEvent.setup();
    setup("alpha");
    await user.click(screen.getByRole("radio", { name: /beta/i }));
    expect(screen.getByRole("radio", { name: /alpha/i })).not.toBeChecked();
    expect(screen.getByRole("radio", { name: /beta/i })).toBeChecked();
  });

  it("fires onchange callback when selection changes", async () => {
    const user = userEvent.setup();
    const onchange = vi.fn();
    setup("alpha", onchange);
    await user.click(screen.getByRole("radio", { name: /beta/i }));
    expect(onchange).toHaveBeenCalledOnce();
  });

  it("uses radiogroup role with aria-labelledby", () => {
    setup();
    const group = screen.getByRole("radiogroup");
    expect(group).toBeInTheDocument();
    const labelledBy = group.getAttribute("aria-labelledby");
    expect(document.getElementById(labelledBy!)).toHaveTextContent("Pick one");
  });

  it("locked options are disabled and report a click through onLocked", async () => {
    const user = userEvent.setup();
    const onLocked = vi.fn();
    setup("alpha", undefined, { lockedOptions: ["gamma"], onLocked });
    const gamma = screen.getByRole("radio", { name: /gamma/i });
    expect(gamma).toBeDisabled();
    await user.click(gamma.closest("label")!);
    expect(onLocked).toHaveBeenCalledWith("gamma");
    expect(gamma).not.toBeChecked();
  });

  it("renders an option added to a dynamic list", async () => {
    const { rerender } = setup();
    expect(screen.queryByRole("radio", { name: /delta/i })).toBeNull();
    await rerender({
      options: [...options, "delta"],
      selected: "alpha",
      name: "test-group",
      legend: "Pick one",
      optionLabel: makeLabel(),
    });
    expect(screen.getByRole("radio", { name: /delta/i })).toBeInTheDocument();
  });
});
