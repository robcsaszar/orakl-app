import { render } from "@testing-library/svelte";
import { beforeEach, describe, expect, it, vi } from "vitest";

let data: Record<string, unknown> = {};
vi.mock("$app/state", () => ({
  page: {
    get data() {
      return data;
    },
  },
}));

import Icon from "$lib/components/ui/Icon.svelte";
import { ICON_SCALE, ROLES } from "$lib/icons";

const DRAFT = '<svg viewBox="0 0 24 24"><path id="draft-mark" d="M0 0"/></svg>';

beforeEach(() => {
  data = {};
});

describe("Icon with an icon draft", () => {
  it("draws the draft for a role the page data drafts", () => {
    data = { iconDrafts: { reveal: DRAFT } };
    const { container } = render(Icon, { props: { name: "reveal" } });
    expect(container.querySelector("#draft-mark")).not.toBeNull();
  });

  it("keeps the size and stroke handling on the draft", () => {
    data = { iconDrafts: { reveal: DRAFT } };
    const { container } = render(Icon, {
      props: { name: "reveal", size: "lg" },
    });
    const svg = container.querySelector("svg") as SVGElement;
    expect(svg.querySelector("#draft-mark")).not.toBeNull();
    const { px, stroke } = ICON_SCALE.control.lg;
    expect(svg.style.width).toBe(`${px}px`);
    expect(svg.style.getPropertyValue("--icon-stroke")).toBe(String(stroke));
  });

  it("draws the code icon for a role with no draft", () => {
    data = { iconDrafts: { reveal: DRAFT } };
    const { container } = render(Icon, { props: { name: "next" } });
    expect(container.querySelector("#draft-mark")).toBeNull();
    expect(container.querySelector("svg")?.outerHTML).toContain(
      ROLES.next.svg.match(/<path[^>]*d="([^"]+)"/)?.[1] ?? "never",
    );
  });

  it("draws the code icon when page data carries no drafts", () => {
    const { container } = render(Icon, { props: { name: "reveal" } });
    expect(container.querySelector("#draft-mark")).toBeNull();
    expect(container.querySelector("svg")).not.toBeNull();
  });
});

describe("Icon with an icon scale draft", () => {
  const scaleDraft = {
    ...ICON_SCALE,
    control: {
      ...ICON_SCALE.control,
      lg: { px: ICON_SCALE.control.lg.px + 6, stroke: 0.75 },
    },
    emblem: {
      ...ICON_SCALE.emblem,
      md: { px: ICON_SCALE.emblem.md.px + 6 },
    },
  };

  it("renders a control step's px and stroke from the draft", () => {
    data = { iconScaleDraft: scaleDraft };
    const { container } = render(Icon, {
      props: { name: "reveal", size: "lg" },
    });
    const svg = container.querySelector("svg") as SVGElement;
    expect(svg.style.width).toBe(`${scaleDraft.control.lg.px}px`);
    expect(svg.style.height).toBe(`${scaleDraft.control.lg.px}px`);
    expect(svg.style.getPropertyValue("--icon-stroke")).toBe("0.75");
  });

  it("renders an emblem step's px from the draft", () => {
    data = { iconScaleDraft: scaleDraft };
    const { container } = render(Icon, {
      props: { name: "orakl", size: "md" },
    });
    const svg = container.querySelector("svg") as SVGElement;
    expect(svg.style.width).toBe(`${scaleDraft.emblem.md.px}px`);
  });

  it("keeps code values when page data carries no scale draft", () => {
    const { container } = render(Icon, {
      props: { name: "reveal", size: "lg" },
    });
    const svg = container.querySelector("svg") as SVGElement;
    expect(svg.style.width).toBe(`${ICON_SCALE.control.lg.px}px`);
  });
});
