import { render, screen } from "@testing-library/svelte";
import { createRawSnippet } from "svelte";
import { describe, expect, it } from "vitest";
import Badge from "../../src/lib/components/ui/Badge.svelte";

function makeChildren(text: string) {
  return createRawSnippet(() => ({ render: () => text }));
}

function classesOf(props: Record<string, unknown>) {
  const { container } = render(Badge, {
    props: { children: makeChildren("x"), ...props },
  });
  return container.firstElementChild?.className ?? "";
}

describe("Badge", () => {
  it("renders label text", () => {
    render(Badge, { props: { children: makeChildren("Science") } });
    expect(screen.getByText("Science")).toBeInTheDocument();
  });

  it("renders as a span element", () => {
    const { container } = render(Badge, {
      props: { children: makeChildren("Span") },
    });
    expect(container.firstElementChild?.tagName).toBe("SPAN");
  });

  it("defaults to the neutral default variant", () => {
    expect(classesOf({})).toContain("bg-secondary/20");
  });

  it("difficulty variants use the semantic success/warning/danger recipes", () => {
    expect(classesOf({ variant: "easy" })).toContain("bg-success");
    expect(classesOf({ variant: "medium" })).toContain("bg-warning");
    expect(classesOf({ variant: "hard" })).toContain("bg-danger");
  });

  it("never emits a raw palette class", () => {
    for (const variant of [
      "default",
      "primary",
      "secondary",
      "easy",
      "medium",
      "hard",
      "category",
      "all",
      "pill",
      "host",
      "observer",
      "count",
      "count-active",
      "status",
    ]) {
      expect(classesOf({ variant }), variant).not.toMatch(
        /\b(bg|text|border)-(gray|violet|green|amber|red)-\d/,
      );
    }
  });

  it("status variant takes a tone", () => {
    expect(classesOf({ variant: "status", tone: "warning" })).toContain(
      "text-warning",
    );
    expect(classesOf({ variant: "status", tone: "success" })).toContain(
      "text-success",
    );
    expect(classesOf({ variant: "status", tone: "primary" })).toContain(
      "text-primary",
    );
  });

  it("tone is ignored on non-status variants", () => {
    const classes = classesOf({ variant: "hard", tone: "success" });
    expect(classes).toContain("bg-danger");
    expect(classes).not.toContain("text-success");
  });

  it("forwards extra attributes to the span", () => {
    render(Badge, {
      props: {
        children: makeChildren("Excluded"),
        title: "Excluded from leaderboards",
      },
    });
    expect(screen.getByTitle("Excluded from leaderboards")).toBeInTheDocument();
  });
});
