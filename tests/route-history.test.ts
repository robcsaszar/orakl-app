import { beforeEach, describe, expect, it } from "vitest";
import {
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
