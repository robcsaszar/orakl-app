import { describe, expect, it } from "vitest";
import { createHistory } from "../src/lib/sky-history.svelte";
import { skyFolds } from "../src/routes/sky-panel.svelte";

describe("sky panel folds", () => {
  it("a section starts shut, opens, and the open ones are kept in the browser", () => {
    const stars = skyFolds("test-stars");
    expect(stars.Comet).toBe(true);

    stars.Comet = false;
    expect(stars.Comet).toBe(false);
    expect(stars.Aurora).toBe(true);
    // Another part's section of the same name is its own.
    expect(skyFolds("test-birds").Comet).toBe(true);
    expect(
      JSON.parse(localStorage.getItem("orakl-sky-open") ?? "{}"),
    ).toMatchObject({ "test-stars/Comet": true });

    stars.Comet = true;
    expect(stars.Comet).toBe(true);
    expect(
      JSON.parse(localStorage.getItem("orakl-sky-open") ?? "{}"),
    ).not.toHaveProperty("test-stars/Comet");
  });
});

describe("history ids", () => {
  it("lists the things that have changes, and drops one that is forgotten", () => {
    const things: Record<number, string> = { 1: "a", 2: "a" };
    const history = createHistory(
      "test-history-ids",
      (id) => things[id] ?? "",
      (id, state) => {
        things[id] = state;
      },
    );
    expect(history.ids()).toEqual([]);
    things[2] = "b";
    history.log(2, "Changed two", "a");
    expect(history.ids()).toEqual([2]);
    history.clear(2);
    expect(history.ids()).toEqual([]);
  });
});
