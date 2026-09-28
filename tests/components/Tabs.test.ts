import { render, screen } from "@testing-library/svelte";
import userEvent from "@testing-library/user-event";
import { createRawSnippet, tick } from "svelte";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import Tabs from "../../src/lib/components/ui/Tabs.svelte";

const tabs = [
  { key: "a", label: "Alpha" },
  { key: "b", label: "Beta" },
  { key: "c", label: "Gamma" },
] as const;

const panel = createRawSnippet<[string]>((key) => ({
  render: () => `<p>Panel ${key()}</p>`,
}));

function renderTabs(extra: Record<string, unknown> = {}) {
  const onSelect = vi.fn();
  render(Tabs, {
    props: {
      tabs,
      selected: "a",
      onSelect,
      label: "Sections",
      panel,
      ...extra,
    },
  });
  return onSelect;
}

describe("Tabs", () => {
  it("is a labelled tablist with one tab per entry", () => {
    renderTabs();
    expect(
      screen.getByRole("tablist", { name: "Sections" }),
    ).toBeInTheDocument();
    expect(screen.getAllByRole("tab")).toHaveLength(3);
  });

  it("marks the selected tab aria-selected and tabbable, others not", () => {
    renderTabs({ selected: "b" });
    const selected = screen.getByRole("tab", { name: "Beta" });
    expect(selected).toHaveAttribute("aria-selected", "true");
    expect(selected).toHaveAttribute("tabindex", "0");
    const other = screen.getByRole("tab", { name: "Alpha" });
    expect(other).toHaveAttribute("aria-selected", "false");
    expect(other).toHaveAttribute("tabindex", "-1");
  });

  it("mounts exactly one tabpanel, labelled by the selected tab", () => {
    renderTabs({ selected: "b" });
    const panels = screen.getAllByRole("tabpanel");
    expect(panels).toHaveLength(1);
    const tab = screen.getByRole("tab", { name: "Beta" });
    expect(panels[0]).toHaveAttribute("aria-labelledby", tab.id);
  });

  it("clicking a tab reports its key", async () => {
    const onSelect = renderTabs();
    await userEvent.setup().click(screen.getByRole("tab", { name: "Gamma" }));
    expect(onSelect).toHaveBeenCalledWith("c");
  });

  it("arrow keys move selection and focus, wrapping at the ends", async () => {
    const onSelect = renderTabs();
    const user = userEvent.setup();
    screen.getByRole("tab", { name: "Alpha" }).focus();
    await user.keyboard("{ArrowRight}");
    expect(onSelect).toHaveBeenLastCalledWith("b");
    expect(screen.getByRole("tab", { name: "Beta" })).toHaveFocus();
    await user.keyboard("{ArrowLeft}");
    expect(onSelect).toHaveBeenLastCalledWith("a");
    await user.keyboard("{End}");
    expect(onSelect).toHaveBeenLastCalledWith("c");
    await user.keyboard("{Home}");
    expect(onSelect).toHaveBeenLastCalledWith("a");
  });

  it("passes the selected key to the panel snippet", () => {
    renderTabs({ selected: "c" });
    expect(screen.getByText("Panel c")).toBeInTheDocument();
  });

  it("tablist scrolls on one line", () => {
    renderTabs();
    const tablist = screen.getByRole("tablist", { name: "Sections" });
    expect(tablist.className).toContain("overflow-x-auto");
    expect(tablist.className).toContain("flex-nowrap");
  });
});

describe("Tabs overflow cue", () => {
  const originalResizeObserver = globalThis.ResizeObserver;

  class StubResizeObserver {
    observe() {}
    disconnect() {}
  }

  beforeEach(() => {
    globalThis.ResizeObserver =
      StubResizeObserver as unknown as typeof ResizeObserver;
  });

  afterEach(() => {
    globalThis.ResizeObserver = originalResizeObserver;
  });

  function setMetrics(
    el: HTMLElement,
    { scrollLeft = 0, scrollWidth = 0, clientWidth = 0 },
  ) {
    Object.defineProperty(el, "scrollLeft", {
      value: scrollLeft,
      configurable: true,
    });
    Object.defineProperty(el, "scrollWidth", {
      value: scrollWidth,
      configurable: true,
    });
    Object.defineProperty(el, "clientWidth", {
      value: clientWidth,
      configurable: true,
    });
  }

  it("renders no chevron overlay when the row does not overflow", async () => {
    renderTabs();
    const tablist = screen.getByRole("tablist", { name: "Sections" });
    setMetrics(tablist, { scrollLeft: 0, scrollWidth: 100, clientWidth: 100 });
    tablist.dispatchEvent(new Event("scroll"));
    await tick();
    expect(
      document.querySelector('[aria-hidden="true"] svg'),
    ).not.toBeInTheDocument();
  });

  it("shows the right cue only, at the start of an overflowing row", async () => {
    renderTabs();
    const tablist = screen.getByRole("tablist", { name: "Sections" });
    setMetrics(tablist, { scrollLeft: 0, scrollWidth: 300, clientWidth: 100 });
    tablist.dispatchEvent(new Event("scroll"));
    await tick();
    expect(
      document.querySelector(".right-0 [aria-hidden]"),
    ).toBeInTheDocument();
    expect(
      document.querySelector(".left-0 [aria-hidden]"),
    ).not.toBeInTheDocument();
  });

  it("swaps the cue to the left once scrolled to the end", async () => {
    renderTabs();
    const tablist = screen.getByRole("tablist", { name: "Sections" });
    setMetrics(tablist, { scrollLeft: 0, scrollWidth: 300, clientWidth: 100 });
    tablist.dispatchEvent(new Event("scroll"));
    await tick();

    setMetrics(tablist, {
      scrollLeft: 200,
      scrollWidth: 300,
      clientWidth: 100,
    });
    tablist.dispatchEvent(new Event("scroll"));
    await tick();

    expect(
      document.querySelector(".right-0 [aria-hidden]"),
    ).not.toBeInTheDocument();
    expect(document.querySelector(".left-0 [aria-hidden]")).toBeInTheDocument();
  });

  it("scrolls the focused tab into view on ArrowRight", async () => {
    const scrollIntoView = vi.fn();
    Element.prototype.scrollIntoView = scrollIntoView;
    const onSelect = renderTabs();
    const user = userEvent.setup();
    screen.getByRole("tab", { name: "Alpha" }).focus();
    await user.keyboard("{ArrowRight}");
    expect(onSelect).toHaveBeenLastCalledWith("b");
    expect(scrollIntoView).toHaveBeenCalledWith({
      block: "nearest",
      inline: "nearest",
      behavior: "instant",
    });
  });

  it("reveals the selected tab on mount", () => {
    const scrollIntoView = vi.fn();
    Element.prototype.scrollIntoView = scrollIntoView;
    renderTabs({ selected: "c" });
    expect(scrollIntoView).toHaveBeenCalled();
  });

  it("scrolls a clicked tab into view", async () => {
    const scrollIntoView = vi.fn();
    Element.prototype.scrollIntoView = scrollIntoView;
    renderTabs();
    const before = scrollIntoView.mock.calls.length;
    await userEvent.setup().click(screen.getByRole("tab", { name: "Gamma" }));
    expect(scrollIntoView.mock.calls.length).toBe(before + 1);
  });

  it("masks the overflowing edge of the scroller itself", async () => {
    renderTabs();
    const list = screen.getByRole("tablist");
    setMetrics(list, { scrollLeft: 0, scrollWidth: 600, clientWidth: 300 });
    list.dispatchEvent(new Event("scroll"));
    await tick();
    expect(list.className).toContain("mask-r-from-");
    expect(list.className).not.toContain("mask-l-from-");
  });

  it("leaves the tabpanel out of the tab order — its content carries the focus stops", () => {
    renderTabs();
    expect(screen.getByRole("tabpanel")).not.toHaveAttribute("tabindex");
  });
});
