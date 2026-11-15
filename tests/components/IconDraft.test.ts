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
import { ICON_USAGES, type IconUsage, usageKey } from "$lib/icon-usages";
import { ICON_SCALE, ROLES } from "$lib/icons";

/** A preview usage: draws any role, never has its own drawing. */
const USAGE = (Object.keys(ICON_USAGES) as IconUsage[]).find(
  (u) => ICON_USAGES[u].roles === "any",
) as IconUsage;
/** A usage that can split, with one role it shows. */
const SPLIT = (Object.keys(ICON_USAGES) as IconUsage[]).find(
  (u) => ICON_USAGES[u].roles !== "any",
) as IconUsage;
const SPLIT_ROLE = (ICON_USAGES[SPLIT].roles as readonly string[])[0];
const OWN = '<svg viewBox="0 0 24 24"><path id="own-mark" d="M0 0"/></svg>';

const DRAFT = '<svg viewBox="0 0 24 24"><path id="draft-mark" d="M0 0"/></svg>';

beforeEach(() => {
  data = {};
});

describe("Icon with an icon draft", () => {
  it("draws the draft for a role the page data drafts", () => {
    data = { iconDrafts: { reveal: DRAFT } };
    const { container } = render(Icon, {
      props: { name: "reveal", usage: USAGE },
    });
    expect(container.querySelector("#draft-mark")).not.toBeNull();
  });

  it("keeps the size and stroke handling on the draft", () => {
    data = { iconDrafts: { reveal: DRAFT } };
    const { container } = render(Icon, {
      props: { name: "reveal", usage: USAGE, size: "lg" },
    });
    const svg = container.querySelector("svg") as SVGElement;
    expect(svg.querySelector("#draft-mark")).not.toBeNull();
    const { px, stroke } = ICON_SCALE.control.lg;
    expect(svg.style.width).toBe(`${px}px`);
    expect(svg.style.getPropertyValue("--icon-stroke")).toBe(String(stroke));
  });

  it("draws the code icon for a role with no draft", () => {
    data = { iconDrafts: { reveal: DRAFT } };
    const { container } = render(Icon, {
      props: { name: "next", usage: USAGE },
    });
    expect(container.querySelector("#draft-mark")).toBeNull();
    expect(container.querySelector("svg")?.outerHTML).toContain(
      ROLES.next.svg.match(/<path[^>]*d="([^"]+)"/)?.[1] ?? "never",
    );
  });

  it("draws the code icon when page data carries no drafts", () => {
    const { container } = render(Icon, {
      props: { name: "reveal", usage: USAGE },
    });
    expect(container.querySelector("#draft-mark")).toBeNull();
    expect(container.querySelector("svg")).not.toBeNull();
  });
});

describe("Icon with a usage's own drawing", () => {
  it("draws the usage's draft over the role's draft there", () => {
    data = {
      iconDrafts: { [SPLIT_ROLE]: DRAFT, [usageKey(SPLIT_ROLE, SPLIT)]: OWN },
    };
    const { container } = render(Icon, {
      props: { name: SPLIT_ROLE, usage: SPLIT },
    });
    expect(container.querySelector("#own-mark")).not.toBeNull();
    expect(container.querySelector("#draft-mark")).toBeNull();
  });

  it("keeps the role's draft at every other usage", () => {
    data = {
      iconDrafts: { [SPLIT_ROLE]: DRAFT, [usageKey(SPLIT_ROLE, SPLIT)]: OWN },
    };
    const { container } = render(Icon, {
      props: { name: SPLIT_ROLE, usage: USAGE },
    });
    expect(container.querySelector("#draft-mark")).not.toBeNull();
    expect(container.querySelector("#own-mark")).toBeNull();
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
      props: { name: "reveal", usage: USAGE, size: "lg" },
    });
    const svg = container.querySelector("svg") as SVGElement;
    expect(svg.style.width).toBe(`${scaleDraft.control.lg.px}px`);
    expect(svg.style.height).toBe(`${scaleDraft.control.lg.px}px`);
    expect(svg.style.getPropertyValue("--icon-stroke")).toBe("0.75");
  });

  it("renders an emblem step's px from the draft", () => {
    data = { iconScaleDraft: scaleDraft };
    const { container } = render(Icon, {
      props: { name: "orakl", usage: USAGE, size: "md" },
    });
    const svg = container.querySelector("svg") as SVGElement;
    expect(svg.style.width).toBe(`${scaleDraft.emblem.md.px}px`);
  });

  it("keeps code values when page data carries no scale draft", () => {
    const { container } = render(Icon, {
      props: { name: "reveal", usage: USAGE, size: "lg" },
    });
    const svg = container.querySelector("svg") as SVGElement;
    expect(svg.style.width).toBe(`${ICON_SCALE.control.lg.px}px`);
  });
});
