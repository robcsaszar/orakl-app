import { describe, expect, it } from "vitest";
import { toSourceLink } from "../src/lib/source-link.js";

describe("toSourceLink", () => {
  it("falls back to hostname for empty label", () => {
    const link = toSourceLink({ url: "https://example.com/page", label: "" });
    expect(link).toEqual({
      url: "https://example.com/page",
      label: "example.com",
      fullLabel: "example.com",
    });
  });

  it("falls back to hostname for whitespace-only label", () => {
    const link = toSourceLink({
      url: "https://example.com/page",
      label: "   ",
    });
    expect(link?.label).toBe("example.com");
  });

  it("falls back to hostname for missing label", () => {
    const link = toSourceLink({ url: "https://example.com/page" });
    expect(link?.label).toBe("example.com");
  });

  it("returns null for a non-https URL", () => {
    expect(
      toSourceLink({ url: "http://example.com", label: "Example" }),
    ).toBeNull();
  });

  it("returns null for a missing source", () => {
    expect(toSourceLink(null)).toBeNull();
    expect(toSourceLink(undefined)).toBeNull();
  });

  it("clamps a very long label but keeps the full value", () => {
    const longLabel = "a".repeat(120);
    const link = toSourceLink({ url: "https://example.com", label: longLabel });
    expect(link?.label.length).toBe(81); // 80 chars + ellipsis
    expect(link?.label.endsWith("…")).toBe(true);
    expect(link?.fullLabel).toBe(longLabel);
  });
});
