import { render, screen } from "@testing-library/svelte";
import { beforeEach, describe, expect, it, vi } from "vitest";

let data: Record<string, unknown> = {};
let pathname = "/";
vi.mock("$app/state", () => ({
  page: {
    get data() {
      return data;
    },
    get url() {
      return new URL(`http://localhost${pathname}`);
    },
  },
}));
vi.mock("$app/navigation", () => ({ invalidateAll: vi.fn() }));

import IconDraftBar from "$lib/components/admin/IconDraftBar.svelte";

beforeEach(() => {
  data = { iconDrafts: { reveal: "<svg></svg>" } };
  pathname = "/";
});

describe("IconDraftBar", () => {
  it("names Save all, Discard and Open admin", () => {
    render(IconDraftBar);
    expect(
      screen
        .getByRole("button", { name: "Save all" })
        .getAttribute("aria-label"),
    ).toBe("Save all");
    expect(
      screen
        .getByRole("button", { name: "Discard" })
        .getAttribute("aria-label"),
    ).toBe("Discard");
    expect(
      screen
        .getByRole("link", { name: "Open admin" })
        .getAttribute("aria-label"),
    ).toBe("Open admin");
  });

  it("keeps the count and the controls on one line", () => {
    const { container } = render(IconDraftBar);
    const region = container.querySelector('[role="region"]') as HTMLElement;
    expect(region.className).not.toContain("flex-wrap");
    expect(region.className).toContain("flex-nowrap");
  });

  it("hides Open admin on the icon admin page", () => {
    pathname = "/admin/icons";
    render(IconDraftBar);
    expect(screen.queryByRole("link", { name: "Open admin" })).toBeNull();
    expect(screen.getByRole("button", { name: "Save all" })).not.toBeNull();
  });

  it("is absent with no drafts", () => {
    data = { iconDrafts: {} };
    const { container } = render(IconDraftBar);
    expect(container.querySelector('[role="region"]')).toBeNull();
  });
});
