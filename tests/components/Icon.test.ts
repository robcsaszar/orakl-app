import { BADGES } from "@orakl/shared";
import { render } from "@testing-library/svelte";
import { describe, expect, it } from "vitest";
import Button from "$lib/components/ui/Button.svelte";
import Icon from "$lib/components/ui/Icon.svelte";
import { ICON_SCALE, ROLES, type RoleName } from "$lib/icons";

describe("Icon", () => {
  it("renders an svg element for a known icon name", () => {
    const { container } = render(Icon, { props: { name: "wreath" } });
    expect(container.querySelector("svg")).not.toBeNull();
  });

  it("has a role for every badge", () => {
    const missing = Object.values(BADGES)
      .filter((badge) => !(badge.icon in ROLES))
      .map((badge) => `${badge.id}: ${badge.icon}`);
    expect(missing).toEqual([]);
  });
});

const STEPS = ["xs", "sm", "md", "lg", "xl"] as const;

describe("Icon size scale", () => {
  it.each(STEPS)("control role at %s sets px size and stroke", (step) => {
    const { container } = render(Icon, {
      props: { name: "dismiss", size: step },
    });
    const svg = container.querySelector("svg") as SVGElement;
    const { px, stroke } = ICON_SCALE.control[step];
    expect(svg.style.width).toBe(`${px}px`);
    expect(svg.style.height).toBe(`${px}px`);
    expect(svg.style.getPropertyValue("--icon-stroke")).toBe(String(stroke));
  });

  it.each(STEPS)("emblem role at %s sets px size and no stroke", (step) => {
    const { container } = render(Icon, {
      props: { name: "correct", size: step },
    });
    const svg = container.querySelector("svg") as SVGElement;
    expect(svg.style.width).toBe(`${ICON_SCALE.emblem[step].px}px`);
    expect(svg.style.getPropertyValue("--icon-stroke")).toBe("");
  });

  it("no size renders the md step of the tier", () => {
    const { container } = render(Icon, { props: { name: "dismiss" } });
    const svg = container.querySelector("svg") as SVGElement;
    expect(svg.style.width).toBe(`${ICON_SCALE.control.md.px}px`);
  });

  it('size="fill" fills the parent with no inline width', () => {
    const { container } = render(Icon, {
      props: { name: "correct", size: "fill" },
    });
    const svg = container.querySelector("svg") as SVGElement;
    expect(svg.getAttribute("class")).toContain("size-full");
    expect(svg.style.width).toBe("");
    expect(svg.style.height).toBe("");
  });

  it("every art pair names an art-tier role", () => {
    const pairs = Object.entries(ROLES).flatMap(([name, role]) =>
      "art" in role ? [{ name, art: role.art as string }] : [],
    );
    expect(pairs.length).toBeGreaterThan(0);
    for (const { art } of pairs) {
      expect(art in ROLES).toBe(true);
      expect(ROLES[art as RoleName].tier).toBe("art");
    }
  });
});

describe("Button icon slots", () => {
  it("renders iconBefore at the control md step", () => {
    const { container } = render(Button, { props: { iconBefore: "dismiss" } });
    const svg = container.querySelector("svg") as SVGElement;
    expect(svg.style.width).toBe(`${ICON_SCALE.control.md.px}px`);
  });

  it("renders iconBefore at the control sm step when compact", () => {
    const { container } = render(Button, {
      props: { iconBefore: "dismiss", intent: "compact" },
    });
    const svg = container.querySelector("svg") as SVGElement;
    expect(svg.style.width).toBe(`${ICON_SCALE.control.sm.px}px`);
  });
});

describe("control roles for borrowed meanings", () => {
  it.each([
    ["stop", "dismiss"],
    ["leads-to", "next"],
    ["failed", "dismiss"],
    ["met", "confirm"],
  ] as const)("%s is a control role drawn as %s", (name, drawnAs) => {
    expect(ROLES[name].tier).toBe("control");
    expect(ROLES[name].svg).toBe(ROLES[drawnAs].svg);
  });
});
