import { beforeEach, describe, expect, it } from "vitest";
import {
  backTrail,
  recordNavigation,
  recordRoute,
  routeHistory,
} from "../src/lib/svelte/route-history.svelte.js";

describe("recordRoute", () => {
  beforeEach(() => {
    routeHistory.paths.length = 0;
  });

  it("appends visited pathnames in order", () => {
    recordRoute("/");
    recordRoute("/join");

    expect(routeHistory.paths).toEqual(["/", "/join"]);
  });

  it("skips consecutive duplicates (e.g. query-only navigation)", () => {
    recordRoute("/quiz/play");
    recordRoute("/quiz/play");

    expect(routeHistory.paths).toEqual(["/quiz/play"]);
  });

  it("caps history at 5 entries, dropping the oldest", () => {
    for (const path of ["/a", "/b", "/c", "/d", "/e", "/f"]) recordRoute(path);

    expect(routeHistory.paths).toEqual(["/b", "/c", "/d", "/e", "/f"]);
  });
});

describe("recordNavigation", () => {
  beforeEach(() => {
    backTrail.from = null;
  });

  it("keeps the page a link or goto came from", () => {
    recordNavigation({ type: "link", from: "/profile", to: "/admin/settings" });
    expect(backTrail.from).toBe("/profile");
    recordNavigation({ type: "goto", from: "/history", to: "/history/solo/1" });
    expect(backTrail.from).toBe("/history");
  });

  it("keeps the trail through a same-path query change (tab, filter)", () => {
    recordNavigation({ type: "link", from: "/profile", to: "/history" });
    recordNavigation({ type: "goto", from: "/history", to: "/history" });
    expect(backTrail.from).toBe("/profile");
  });

  it("clears on popstate and first load", () => {
    recordNavigation({ type: "link", from: "/profile", to: "/admin/users" });
    recordNavigation({
      type: "popstate",
      from: "/admin/users",
      to: "/profile",
    });
    expect(backTrail.from).toBeNull();
    recordNavigation({ type: "enter", from: null, to: "/admin/users" });
    expect(backTrail.from).toBeNull();
  });
});
