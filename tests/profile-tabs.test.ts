import { afterEach, describe, expect, it } from "vitest";
import { showsToolsTab } from "../src/routes/(app)/profile/tabs.js";

// The gate short-circuits outside production; force the production branch to
// exercise the role/power checks, and restore whatever the runner had set.
const initialNodeEnv = process.env.NODE_ENV;
afterEach(() => {
  process.env.NODE_ENV = initialNodeEnv;
});

describe("showsToolsTab", () => {
  it("member with no powers on a production build does not see Tools", () => {
    process.env.NODE_ENV = "production";
    expect(showsToolsTab({ role: "member", powers: [] })).toBe(false);
  });

  it("admin sees Tools", () => {
    process.env.NODE_ENV = "production";
    expect(showsToolsTab({ role: "admin", powers: [] })).toBe(true);
  });

  it("member with can-manage-avatars sees Tools", () => {
    process.env.NODE_ENV = "production";
    expect(
      showsToolsTab({ role: "member", powers: ["can-manage-avatars"] }),
    ).toBe(true);
  });
});

describe("showsToolsTab outside production", () => {
  it("bare member sees Tools", () => {
    process.env.NODE_ENV = "development";
    expect(showsToolsTab({ role: "member", powers: [] })).toBe(true);
  });
});
