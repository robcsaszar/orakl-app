import { render, screen } from "@testing-library/svelte";
import userEvent from "@testing-library/user-event";
import { createRawSnippet } from "svelte";
import { describe, expect, it, vi } from "vitest";

import SegmentedPicker from "../../src/lib/components/ui/SegmentedPicker.svelte";

const options = ["alpha", "beta", "gamma"] as const;
const option = createRawSnippet<[string, boolean]>((o) => ({
  render: () => `<span>${o()}</span>`,
}));

function picker(extra: Record<string, unknown> = {}) {
  const onSelect = vi.fn();
  render(SegmentedPicker, {
    props: {
      options,
      selectedKey: "beta",
      label: "Pick one",
      onSelect,
      option,
      ...extra,
    },
  });
  return onSelect;
}

describe("SegmentedPicker", () => {
  it("is a labelled radiogroup with one checked radio per option", () => {
    picker();
    expect(
      screen.getByRole("radiogroup", { name: "Pick one" }),
    ).toBeInTheDocument();
    expect(screen.getAllByRole("radio")).toHaveLength(3);
    expect(screen.getByRole("radio", { name: "beta" })).toHaveAttribute(
      "aria-checked",
      "true",
    );
    expect(screen.getByRole("radio", { name: "alpha" })).toHaveAttribute(
      "aria-checked",
      "false",
    );
  });

  it("clicking an option reports it", async () => {
    const onSelect = picker();
    await userEvent.setup().click(screen.getByRole("radio", { name: "gamma" }));
    expect(onSelect).toHaveBeenCalledWith("gamma");
  });

  it("arrow keys move the selection and focus, wrapping at the ends", async () => {
    const onSelect = picker();
    const user = userEvent.setup();
    screen.getByRole("radio", { name: "beta" }).focus();
    await user.keyboard("{ArrowRight}");
    expect(onSelect).toHaveBeenLastCalledWith("gamma");
    expect(screen.getByRole("radio", { name: "gamma" })).toHaveFocus();
    await user.keyboard("{ArrowRight}");
    expect(onSelect).toHaveBeenLastCalledWith("alpha");
    await user.keyboard("{End}");
    expect(onSelect).toHaveBeenLastCalledWith("gamma");
  });

  it("only the selected option is in the tab order", () => {
    picker();
    expect(screen.getByRole("radio", { name: "beta" })).toHaveAttribute(
      "tabindex",
      "0",
    );
    expect(screen.getByRole("radio", { name: "alpha" })).toHaveAttribute(
      "tabindex",
      "-1",
    );
  });

  it("keeps the first option tabbable when nothing in the group matches selectedKey", () => {
    picker({ selectedKey: "not-in-this-group" });
    expect(screen.getByRole("radio", { name: "alpha" })).toHaveAttribute(
      "tabindex",
      "0",
    );
    expect(screen.getByRole("radio", { name: "beta" })).toHaveAttribute(
      "tabindex",
      "-1",
    );
    expect(screen.queryByRole("radio", { checked: true })).toBeNull();
  });

  it("renders as a nav of links with aria-current when hrefFor is given", () => {
    picker({ hrefFor: (o: string) => `/board/${o}`, variant: "pill" });
    expect(
      screen.getByRole("navigation", { name: "Pick one" }),
    ).toBeInTheDocument();
    const current = screen.getByRole("link", { name: "beta" });
    expect(current).toHaveAttribute("aria-current", "page");
    expect(current).toHaveAttribute("href", "/board/beta");
    expect(screen.getByRole("link", { name: "alpha" })).not.toHaveAttribute(
      "aria-current",
    );
  });

  it("tiles are squircles on semantic tokens", () => {
    picker();
    const cls = screen.getByRole("radio", { name: "beta" }).className;
    expect(cls).toContain("corner-shape-squircle");
    expect(cls).not.toMatch(/\b(bg|text|border)-(gray|violet)-\d/);
  });
});
