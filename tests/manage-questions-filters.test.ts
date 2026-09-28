import { parseAuthoredFilters } from "@orakl/shared";
import { describe, expect, it } from "vitest";

describe("parseAuthoredFilters", () => {
  it("passes valid values through", () => {
    const sp = new URLSearchParams({
      author: "curator-a",
      category: "Science",
      published: "shared",
      q: "capital",
    });
    expect(parseAuthoredFilters(sp)).toEqual({
      authorId: "curator-a",
      category: "Science",
      published: "shared",
      q: "capital",
    });
  });

  it("drops empty strings to undefined", () => {
    const sp = new URLSearchParams({ author: "", category: "", q: "" });
    const filters = parseAuthoredFilters(sp);
    expect(filters.authorId).toBeUndefined();
    expect(filters.category).toBeUndefined();
    expect(filters.q).toBeUndefined();
  });

  it("defaults a missing published to all", () => {
    expect(parseAuthoredFilters(new URLSearchParams()).published).toBe("all");
  });

  it("coerces an unknown published value to all", () => {
    const sp = new URLSearchParams({ published: "bogus" });
    expect(parseAuthoredFilters(sp).published).toBe("all");
  });

  it("trims q and caps it at 100 chars", () => {
    const sp = new URLSearchParams({ q: `  ${"a".repeat(150)}  ` });
    const { q } = parseAuthoredFilters(sp);
    expect(q).toHaveLength(100);
    expect(q).toBe("a".repeat(100));
  });

  it("reads changed=1 as changed: true", () => {
    const sp = new URLSearchParams({ changed: "1" });
    expect(parseAuthoredFilters(sp).changed).toBe(true);
  });

  it("reads changed=true as changed: true", () => {
    const sp = new URLSearchParams({ changed: "true" });
    expect(parseAuthoredFilters(sp).changed).toBe(true);
  });

  it("leaves changed unset for any other value or when absent", () => {
    expect(parseAuthoredFilters(new URLSearchParams()).changed).toBeUndefined();
    expect(
      parseAuthoredFilters(new URLSearchParams({ changed: "0" })).changed,
    ).toBeUndefined();
    expect(
      parseAuthoredFilters(new URLSearchParams({ changed: "bogus" })).changed,
    ).toBeUndefined();
  });
});
